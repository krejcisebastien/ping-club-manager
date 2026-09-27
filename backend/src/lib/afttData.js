// Points du classement numérique AFTT. TabT ne les fournit pas : ils viennent
// de data.aftt.be (site de Mathieu Jasinski), via l'adresse de recherche que
// le site utilise lui-même. Ce n'est PAS une API officielle ni documentée :
// elle peut changer sans préavis. Un seul appel léger par joueur et par jour.
const SEARCH_URL = process.env.AFTT_DATA_SEARCH_URL || "https://data.aftt.be/ranking/recherche_ajax.php";
const SHEET_URL = process.env.AFTT_DATA_SHEET_URL || "https://data.aftt.be/tools/fiche.php";
const TIMEOUT_MS = 10_000;
const USER_AGENT = "PingClubManager (suivi d'entrainement de clubs AFTT)";

export class AfttDataError extends Error {}

// Renvoie { points, rankingPosition } pour une licence, ou null si le joueur
// n'apparaît pas dans le classement numérique (ex. pas encore de match).
export async function fetchNumericRanking(licence) {
  let res;
  try {
    res = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(licence)}`, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new AfttDataError(`data.aftt.be injoignable (${err.name === "TimeoutError" ? "délai dépassé" : err.message}).`);
  }
  if (!res.ok) throw new AfttDataError(`data.aftt.be a répondu ${res.status}.`);
  let list;
  try {
    list = await res.json();
  } catch {
    throw new AfttDataError("Réponse de data.aftt.be illisible (format modifié ?).");
  }
  if (!Array.isArray(list)) throw new AfttDataError("Réponse de data.aftt.be inattendue (format modifié ?).");
  const entry = list.find((e) => Number(e?.Licence) === Number(licence));
  if (!entry) return null;
  const points = Number(entry.Points);
  if (!Number.isFinite(points)) throw new AfttDataError("Points absents de la réponse de data.aftt.be.");
  const position = Number.parseInt(entry.Ranking_Pos, 10);
  return { points, rankingPosition: Number.isNaN(position) ? null : position };
}

// ---------- Fiche joueur (page HTML) ----------
// Seule source des points de base et du +/- de chaque match. Lecture d'une page
// HTML : le moindre changement de mise en page du site peut la casser, d'où un
// usage strictement en « enrichissement » (voir enrichFromSheet dans tabt.js).

// "1 410,30" ou "1410.3035" -> 1410.3
function parseNumber(text) {
  const clean = String(text).replace(/[\s\u00a0\u202f]/g, "");
  const value = Number(clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean);
  return Number.isFinite(value) ? value : null;
}

// Extrait de la fiche : points de base et, par match, date, licence de
// l'adversaire, ses points et le +/- du joueur. Exporté pour les tests.
export function parsePlayerSheet(html) {
  const base =
    html.match(/Points de base<\/span>\s*<span class="profile-metric-value">([^<]+)</) ??
    html.match(/<h5[^>]*>\s*Points de base\s*<\/h5>\s*<h3[^>]*>\s*([\d.,\s]+)\s*pts/);
  const matches = [];
  for (const day of html.split(/class="card day-result-card/).slice(1)) {
    const d = day.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!d) continue;
    const date = new Date(Date.UTC(Number(d[3]), Number(d[2]) - 1, Number(d[1])));
    for (const card of day.split(/class="match-card-modern/).slice(1)) {
      const licence = card.match(/name="licence"\s+value="(\d+)"/);
      const opponentPoints = card.match(/class="match-score[\s\S]*?<small[^>]*>\s*([\d.,]+)\s*pts/);
      const delta = card.match(/class="match-delta[^"]*">\s*([+-−]?\s*[\d.,]+)\s*pts/);
      if (!licence) continue;
      matches.push({
        date,
        opponentLicence: Number(licence[1]),
        opponentPoints: opponentPoints ? parseNumber(opponentPoints[1]) : null,
        pointsDelta: delta ? parseNumber(delta[1].replace("−", "-")) : null,
      });
    }
  }
  return { basePoints: base ? parseNumber(base[1]) : null, matches };
}

export async function fetchPlayerSheet(licence) {
  let res;
  try {
    res = await fetch(`${SHEET_URL}?licenceID=${encodeURIComponent(licence)}`, {
      headers: { Accept: "text/html", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new AfttDataError(`fiche data.aftt.be injoignable (${err.name === "TimeoutError" ? "délai dépassé" : err.message}).`);
  }
  if (!res.ok) throw new AfttDataError(`fiche data.aftt.be : réponse ${res.status}.`);
  return parsePlayerSheet(await res.text());
}
