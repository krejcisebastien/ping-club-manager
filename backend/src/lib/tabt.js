import soap from "soap";
import { prisma } from "./prisma.js";
import { fetchNumericRanking } from "./afttData.js";

// Import des résultats de compétition depuis TabT, l'API de l'AFTT
// (https://api.aftt.be). Identifiants : TABT_ACCOUNT / TABT_PASSWORD.
//
// Quota TabT : chaque appel coûte son temps d'exécution serveur (en ms) ; le
// compteur se vide de 200 par seconde et l'API refuse au-delà de 30 000
// (erreur SOAP 34). Un GetMembers avec résultats coûte ~500 : on espace donc
// les appels (voir DELAY_MS) et on s'arrête net en cas de dépassement.

const WSDL_URL = process.env.TABT_WSDL_URL || "https://api.aftt.be/?wsdl";
// Saisons antérieures importées à la première synchronisation d'un joueur.
export const HISTORY_SEASONS = 3;

export class TabtError extends Error {
  constructor(message, { quota = false } = {}) {
    super(message);
    this.quota = quota;
  }
}

export const isTabtConfigured = () => Boolean(process.env.TABT_ACCOUNT && process.env.TABT_PASSWORD);

let clientPromise = null;
function client() {
  if (!isTabtConfigured()) throw new TabtError("TabT n'est pas configuré (TABT_ACCOUNT / TABT_PASSWORD).");
  clientPromise ??= soap.createClientAsync(WSDL_URL).catch((err) => {
    clientPromise = null;
    throw err;
  });
  return clientPromise;
}

const credentials = () => ({ Account: process.env.TABT_ACCOUNT, Password: process.env.TABT_PASSWORD });

async function call(method, args) {
  const c = await client();
  try {
    const [result] = await c[`${method}Async`]({ Credentials: credentials(), ...args });
    return result;
  } catch (err) {
    const fault = err?.root?.Envelope?.Body?.Fault;
    const message = fault?.faultstring || err.message;
    throw new TabtError(`TabT : ${message}`, { quota: String(fault?.faultcode) === "34" || /quota/i.test(message) });
  }
}

let seasonsCache = null;
export async function getSeasons() {
  if (seasonsCache && seasonsCache.at > Date.now() - 6 * 3600 * 1000) return seasonsCache.value;
  const r = await call("GetSeasons", {});
  const names = new Map((r.SeasonEntries ?? []).map((s) => [s.Season, s.Name]));
  seasonsCache = { at: Date.now(), value: { current: r.CurrentSeason, names } };
  return seasonsCache.value;
}

// N° de licence saisi dans la fiche joueur -> index unique TabT (entier).
export function parseLicence(licenseNumber) {
  const value = String(licenseNumber ?? "").trim();
  return /^\d{3,7}$/.test(value) ? Number(value) : null;
}

function toResult(playerId, season, e) {
  const tournament = e.CompetitionType === "T";
  const eventName = tournament
    ? [e.TournamentName, e.TournamentSerieName].filter(Boolean).join(" — ") || null
    : e.MatchId ?? null;
  const result = String(e.Result ?? "");
  return {
    playerId,
    season,
    date: new Date(e.Date),
    competition: tournament ? "TOURNAMENT" : "CHAMPIONSHIP",
    opponentLicence: Number.isInteger(e.UniqueIndex) ? e.UniqueIndex : null,
    opponentFirstName: e.FirstName ?? "",
    opponentLastName: e.LastName ?? "",
    opponentRanking: e.Ranking ?? "NC",
    opponentClub: e.Club ?? null,
    won: result.startsWith("V"),
    walkover: /wo/i.test(result),
    setsFor: Number(e.SetFor) || 0,
    setsAgainst: Number(e.SetAgainst) || 0,
    eventName,
  };
}

// Importe une saison TabT d'un joueur : remplace ses matchs de la saison et
// met à jour sa situation (classement, club). Renvoie le nombre de matchs.
// L'« ELO » que TabT peut renvoyer n'est pas le classement numérique AFTT
// (points affichés sur data.aftt.be) : il n'est volontairement pas importé.
async function syncSeason(playerId, licence, season, seasonName) {
  const r = await call("GetMembers", { UniqueIndex: licence, Season: season, WithResults: true });
  const member = r.MemberEntries?.[0];
  if (!member) return null;
  const results = (member.ResultEntries ?? []).map((e) => toResult(playerId, season, e));
  const situation = { seasonName, ranking: member.Ranking ?? null, club: member.Club ?? null, syncedAt: new Date() };

  await prisma.$transaction([
    prisma.competitionResult.deleteMany({ where: { playerId, season } }),
    prisma.competitionResult.createMany({ data: results }),
    prisma.competitionSeason.upsert({
      where: { playerId_season: { playerId, season } },
      create: { playerId, season, ...situation },
      update: situation,
    }),
  ]);
  return results.length;
}

// Relevé du jour des points du classement numérique (un par joueur et par jour,
// remplacé si l'import est relancé le même jour).
async function recordPoints(playerId, licence, seasonName) {
  const ranking = await fetchNumericRanking(licence);
  if (!ranking) return;
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const data = { seasonName, points: ranking.points, rankingPosition: ranking.rankingPosition };
  await prisma.competitionPoints.upsert({
    where: { playerId_date: { playerId, date } },
    create: { playerId, date, ...data },
    update: data,
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Synchronise un joueur : la saison en cours à chaque fois, plus les saisons
// récentes jamais importées (première synchronisation) et, en juillet-août,
// la saison qui vient de se terminer (derniers résultats encodés tardivement).
export async function syncPlayer(player, { delayMs = 0 } = {}) {
  const licence = parseLicence(player.licenseNumber);
  if (!licence) {
    const error = player.licenseNumber ? "N° de licence invalide pour TabT." : "Aucun n° de licence.";
    await prisma.player.update({ where: { id: player.id }, data: { competitionSyncError: error } });
    throw new TabtError(error);
  }

  try {
    const { current, names } = await getSeasons();
    const known = new Set(
      (await prisma.competitionSeason.findMany({ where: { playerId: player.id }, select: { season: true } })).map((s) => s.season)
    );
    const month = new Date().getMonth() + 1;
    const seasons = [current];
    for (let s = current - 1; s >= current - HISTORY_SEASONS; s--) {
      if (!known.has(s) || (s === current - 1 && (month === 7 || month === 8))) seasons.push(s);
    }

    let matches = 0;
    for (const [i, season] of seasons.entries()) {
      if (i > 0 && delayMs) await sleep(delayMs);
      matches += (await syncSeason(player.id, licence, season, names.get(season) ?? String(season))) ?? 0;
    }

    // Points du classement numérique (data.aftt.be) : un échec n'annule pas
    // l'import des matchs, il est seulement signalé.
    let pointsError = null;
    try {
      await recordPoints(player.id, licence, names.get(current) ?? String(current));
    } catch (err) {
      pointsError = `Points AFTT non mis à jour : ${err.message}`;
    }
    await prisma.player.update({ where: { id: player.id }, data: { competitionSyncedAt: new Date(), competitionSyncError: pointsError } });
    return { seasons: seasons.length, matches };
  } catch (err) {
    await prisma.player.update({ where: { id: player.id }, data: { competitionSyncError: err.message.slice(0, 500) } });
    throw err;
  }
}
