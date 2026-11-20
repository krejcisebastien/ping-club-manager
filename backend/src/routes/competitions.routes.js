import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { bilan, splitEventName } from "../lib/tournamentResults.js";
import { clubSyncs, isTabtConfigured, startClubSync } from "../lib/tabt.js";
import { estimateRanking } from "../lib/numericRanking.js";
import { prisma } from "../lib/prisma.js";

// Vue club des compétitions importées de TabT : les tournois d'une saison et,
// pour chacun, les joueurs du club qui y ont joué, avec leurs séries et leur bilan.
const router = Router();

router.use(requireAuth, requireRole("ADMIN", "COACH"));

router.get("/tournaments", async (req, res) => {
  const seasonRows = await req.db.competitionResult.findMany({
    where: { competition: "TOURNAMENT" },
    distinct: ["season"],
    select: { season: true },
    orderBy: { season: "desc" },
  });
  const seasons = seasonRows.map((s) => s.season);
  const season = seasons.includes(Number(req.query.season)) ? Number(req.query.season) : seasons[0];
  if (season === undefined) return res.json({ seasons: [], season: null, tournaments: [] });
  const names = await req.db.competitionSeason.findMany({ where: { season: { in: seasons } }, distinct: ["season"], select: { season: true, seasonName: true } });
  const nameOf = new Map(names.map((n) => [n.season, n.seasonName]));

  const results = await req.db.competitionResult.findMany({
    where: { competition: "TOURNAMENT", season },
    orderBy: { date: "asc" },
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
  });

  const tournaments = new Map();
  for (const r of results) {
    const { tournament, serie } = splitEventName(r.eventName);
    if (!tournaments.has(tournament)) tournaments.set(tournament, { name: tournament, from: r.date, to: r.date, matches: [], players: new Map() });
    const t = tournaments.get(tournament);
    if (r.date > t.to) t.to = r.date;
    t.matches.push(r);
    if (!t.players.has(r.playerId)) t.players.set(r.playerId, { player: r.player, series: new Map() });
    const series = t.players.get(r.playerId).series;
    const key = serie ?? "";
    if (!series.has(key)) series.set(key, []);
    series.get(key).push(r);
  }

  res.json({
    seasons: seasons.map((s) => ({ season: s, name: nameOf.get(s) ?? String(s) })),
    season,
    tournaments: [...tournaments.values()]
      .sort((a, b) => b.from - a.from)
      .map((t) => ({
        name: t.name,
        from: t.from,
        to: t.to,
        ...bilan(t.matches),
        players: [...t.players.values()]
          .map(({ player, series }) => ({
            player,
            ...bilan([...series.values()].flat()),
            series: [...series.entries()].map(([name, matches]) => ({
              name: name || null,
              ...bilan(matches),
              matches: matches.map((m) => ({
                id: m.id,
                date: m.date,
                opponentFirstName: m.opponentFirstName,
                opponentLastName: m.opponentLastName,
                opponentRanking: m.opponentRanking,
                opponentClub: m.opponentClub,
                won: m.won,
                walkover: m.walkover,
                setsFor: m.setsFor,
                setsAgainst: m.setsAgainst,
              })),
            })),
          }))
          .sort((a, b) => a.player.lastName.localeCompare(b.player.lastName, "fr") || a.player.firstName.localeCompare(b.player.firstName, "fr")),
      })),
  });
});

// Inscriptions des joueurs du club aux tournois à venir, la plus proche d'abord.
router.get("/upcoming-tournaments", async (req, res) => {
  const registrations = await req.db.tournamentRegistration.findMany({
    where: { date: { gte: new Date(new Date().toISOString().slice(0, 10)) } },
    orderBy: [{ date: "asc" }, { tournamentId: "asc" }],
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
  });
  res.json({ registrations });
});

// Resynchronisation TabT de tous les joueurs du club (admin), sans attendre
// la tâche de la nuit. Elle tourne en arrière-plan : l'écran suit son état.
const syncStatus = (clubId) => {
  const s = clubSyncs.get(clubId);
  return s ? { running: s.running, startedAt: s.startedAt, finishedAt: s.finishedAt, total: s.total, done: s.done, failed: s.failed, error: s.error } : null;
};

router.get("/sync", (req, res) => res.json({ sync: syncStatus(req.user.clubId) }));

router.post("/sync", requireRole("ADMIN"), async (req, res) => {
  if (!isTabtConfigured()) return res.status(400).json({ error: "TabT n'est pas configuré." });
  const players = await req.db.player.findMany({
    where: { licenseNumber: { not: null } },
    orderBy: [{ competitionSyncedAt: { sort: "asc", nulls: "first" } }],
    select: { id: true, licenseNumber: true },
  });
  const status = startClubSync(req.user.clubId, players.filter((p) => p.licenseNumber.trim()));
  const messages = {
    running: "Une resynchronisation est déjà en cours.",
    busy: "Un autre club resynchronise ses joueurs : réessaie dans quelques minutes.",
    recent: "Le club a déjà été resynchronisé il y a moins d'une heure.",
  };
  if (status !== "started") return res.status(409).json({ error: messages[status], sync: syncStatus(req.user.clubId) });
  res.json({ sync: syncStatus(req.user.clubId) });
});

// ---------- Points et classements estimés ----------
// Pour chaque joueur ayant un n° de licence : classement et points de début de
// la saison TabT la plus récente, +/- des matchs (fiche data.aftt.be), points
// actuels et classement estimé d'après sa place au dernier relevé du
// classement numérique et le tableau d'équivalence (src/lib/numericRanking.js).
router.get("/rankings", async (req, res) => {
  const latestSeason = await req.db.competitionSeason.findFirst({ orderBy: { season: "desc" }, select: { season: true, seasonName: true } });
  // Nombre d'actifs : donnée nationale (hors isolation), dernier relevé connu.
  const stats = await prisma.numericRankingStats.findFirst({ orderBy: { date: "desc" } });
  const players = await req.db.player.findMany({
    where: { licenseNumber: { not: null } },
    select: { id: true, firstName: true, lastName: true, licenseNumber: true },
  });
  const season = latestSeason?.season ?? null;
  const [seasons, results, points] = season == null
    ? [[], [], []]
    : await Promise.all([
        req.db.competitionSeason.findMany({ where: { season } }),
        req.db.competitionResult.findMany({ where: { season }, select: { playerId: true, pointsDelta: true } }),
        req.db.competitionPoints.findMany({ where: { seasonName: latestSeason.seasonName }, orderBy: { date: "asc" } }),
      ]);
  const seasonOf = new Map(seasons.map((s) => [s.playerId, s]));
  const lastPoints = new Map(points.map((p) => [p.playerId, p])); // trié par date : le dernier l'emporte
  const deltas = new Map();
  for (const r of results) {
    const d = deltas.get(r.playerId) ?? { sum: 0, known: 0, matches: 0 };
    d.matches++;
    if (r.pointsDelta != null) {
      d.sum += Number(r.pointsDelta);
      d.known++;
    }
    deltas.set(r.playerId, d);
  }

  const rows = players
    .filter((p) => p.licenseNumber.trim())
    .map((p) => {
      const s = seasonOf.get(p.id);
      const last = lastPoints.get(p.id);
      const d = deltas.get(p.id);
      const basePoints = s?.basePoints == null ? null : Number(s.basePoints);
      const delta = d?.known ? Math.round(d.sum * 100) / 100 : basePoints != null && d ? 0 : null;
      // Points actuels : base + somme des +/- ; à défaut, ceux du dernier relevé.
      const currentPoints = basePoints != null && delta != null ? Math.round((basePoints + delta) * 100) / 100 : last ? Number(last.points) : null;
      return {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        startRanking: s?.ranking ?? null,
        startLadiesRanking: s?.ladiesRanking ?? null,
        basePoints,
        delta,
        matches: d?.matches ?? 0,
        matchesWithoutDelta: d ? d.matches - d.known : 0,
        currentPoints,
        positionDate: last?.date ?? null,
        rankingPosition: last?.rankingPosition ?? null,
        ladiesRankingPosition: last?.ladiesRankingPosition ?? null,
        estimate: stats && last?.rankingPosition ? estimateRanking("men", last.rankingPosition, stats.activePlayers) : null,
        ladiesEstimate:
          stats?.activeLadies && last?.ladiesRankingPosition ? estimateRanking("ladies", last.ladiesRankingPosition, stats.activeLadies) : null,
      };
    })
    .sort((a, b) => (b.currentPoints ?? -Infinity) - (a.currentPoints ?? -Infinity) || a.lastName.localeCompare(b.lastName, "fr"));

  res.json({
    season: latestSeason,
    stats: stats && { date: stats.date, activePlayers: stats.activePlayers, activeLadies: stats.activeLadies },
    players: rows,
  });
});

export default router;
