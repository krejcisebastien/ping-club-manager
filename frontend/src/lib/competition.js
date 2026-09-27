// Calculs sur les résultats de compétition importés de TabT (voir
// backend/src/lib/tabt.js). Les forfaits (WO) sont affichés dans l'historique
// mais exclus de toutes les statistiques : ils ne disent rien du niveau de jeu.
import { RANKINGS } from "./ranking.js";

const rankIndex = (ranking) => RANKINGS.indexOf(ranking);

// TabT renvoie les noms en majuscules : "GIUSEPPE" -> "Giuseppe", "VAN DEN BOSSCHE" -> "Van Den Bossche".
export const titleCase = (s) => (s ?? "").toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase());

export const opponentName = (r) => `${titleCase(r.opponentLastName)} ${titleCase(r.opponentFirstName)}`.trim();

export const played = (results) => results.filter((r) => !r.walkover);

export function summarize(results) {
  const matches = played(results);
  const wins = matches.filter((r) => r.won).length;
  return { played: matches.length, wins, losses: matches.length - wins, rate: matches.length ? wins / matches.length : null };
}

// Bilan par classement adverse, dans l'ordre des classements (NC -> B0).
export function byOpponentRanking(results) {
  const groups = new Map();
  for (const r of played(results)) {
    if (!groups.has(r.opponentRanking)) groups.set(r.opponentRanking, []);
    groups.get(r.opponentRanking).push(r);
  }
  return [...groups.entries()]
    .map(([ranking, list]) => ({ ranking, ...summarize(list) }))
    .sort((a, b) => rankIndex(a.ranking) - rankIndex(b.ranking));
}

// Face à des adversaires mieux classés / de même classement / moins bien
// classés, par rapport au classement du joueur la saison du match.
export function byStrength(results, rankingBySeason) {
  const buckets = { stronger: [], equal: [], weaker: [] };
  for (const r of played(results)) {
    const own = rankIndex(rankingBySeason.get(r.season));
    const opp = rankIndex(r.opponentRanking);
    if (own < 0 || opp < 0) continue;
    buckets[opp > own ? "stronger" : opp === own ? "equal" : "weaker"].push(r);
  }
  return Object.fromEntries(Object.entries(buckets).map(([k, list]) => [k, summarize(list)]));
}

// Périodes d'une saison (septembre -> août) pour suivre l'évolution en cours de saison.
const PHASES = [
  { label: "Sept.–oct.", months: [8, 9] },
  { label: "Nov.–déc.", months: [10, 11] },
  { label: "Janv.–févr.", months: [0, 1] },
  { label: "Mars–avr.", months: [2, 3] },
  { label: "Mai–août", months: [4, 5, 6, 7] },
];
const phaseOf = (date) => PHASES.findIndex((p) => p.months.includes(new Date(date).getMonth()));

// Grille classement adverse x période : une colonne par saison (vue toutes
// saisons) ou par période de deux mois (vue d'une saison). Seules les colonnes
// et lignes contenant des matchs sont gardées.
export function evolutionGrid(results, { seasonNames, singleSeason }) {
  const matches = played(results);
  const columnKey = (r) => (singleSeason ? phaseOf(r.date) : r.season);
  const keys = [...new Set(matches.map(columnKey))].sort((a, b) => a - b);
  const columns = keys.map((k) => ({ key: k, label: singleSeason ? PHASES[k].label : seasonNames.get(k) ?? String(k) }));
  const rankings = [...new Set(matches.map((r) => r.opponentRanking))].sort((a, b) => rankIndex(a) - rankIndex(b));
  const rows = rankings.map((ranking) => ({
    ranking,
    cells: keys.map((k) => {
      const list = matches.filter((r) => r.opponentRanking === ranking && columnKey(r) === k);
      return list.length ? summarize(list) : null;
    }),
  }));
  const totals = keys.map((k) => summarize(matches.filter((r) => columnKey(r) === k)));
  return { columns, rows, totals };
}

// Taux de victoire sur les N derniers matchs, match après match (chronologique).
export function rollingRate(results, window = 10) {
  const matches = played(results).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  return matches.map((r, i) => {
    const slice = matches.slice(Math.max(0, i - window + 1), i + 1);
    return { date: r.date, rate: slice.filter((m) => m.won).length / slice.length };
  });
}

// Historique regroupé par journée : une rencontre de championnat, ou une série de tournoi.
export function groupByDay(results) {
  const days = new Map();
  for (const r of results) {
    const key = `${r.date}|${r.eventName ?? ""}`;
    if (!days.has(key)) days.set(key, { key, date: r.date, eventName: r.eventName, competition: r.competition, matches: [] });
    days.get(key).matches.push(r);
  }
  return [...days.values()]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((d) => ({ ...d, summary: summarize(d.matches), clubs: [...new Set(d.matches.map((m) => m.opponentClub).filter(Boolean))] }));
}

// Couleur d'une cellule selon le taux de victoire (rouge -> ambre -> vert).
export function rateColor(rate) {
  if (rate == null) return {};
  if (rate >= 0.67) return { backgroundColor: "#dcfce7", color: "#166534" };
  if (rate > 0.33) return { backgroundColor: "#fef3c7", color: "#92400e" };
  return { backgroundColor: "#fee2e2", color: "#991b1b" };
}
