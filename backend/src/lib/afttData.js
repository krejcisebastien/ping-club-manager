// Points du classement numérique AFTT. TabT ne les fournit pas : ils viennent
// de data.aftt.be (site de Mathieu Jasinski), via l'adresse de recherche que
// le site utilise lui-même. Ce n'est PAS une API officielle ni documentée :
// elle peut changer sans préavis. Un seul appel léger par joueur et par jour.
const SEARCH_URL = process.env.AFTT_DATA_SEARCH_URL || "https://data.aftt.be/ranking/recherche_ajax.php";
const TIMEOUT_MS = 10_000;

export class AfttDataError extends Error {}

// Renvoie { points, rankingPosition } pour une licence, ou null si le joueur
// n'apparaît pas dans le classement numérique (ex. pas encore de match).
export async function fetchNumericRanking(licence) {
  let res;
  try {
    res = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(licence)}`, {
      headers: { Accept: "application/json", "User-Agent": "PingClubManager (suivi d'entrainement de clubs AFTT)" },
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
