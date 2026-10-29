import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

// Vue club des compétitions importées de TabT : les tournois d'une saison et,
// pour chacun, les joueurs du club qui y ont joué, avec leurs séries et leur bilan.
const router = Router();

router.use(requireAuth, requireRole("ADMIN", "COACH"));

// L'import enregistre « Tournoi — Série » (voir toResult dans lib/tabt.js).
export function splitEventName(eventName) {
  const name = eventName ?? "";
  const at = name.lastIndexOf(" — ");
  if (at < 0) return { tournament: name || "Tournoi", serie: null };
  return { tournament: name.slice(0, at), serie: name.slice(at + 3) };
}

const bilan = (matches) => {
  const played = matches.filter((m) => !m.walkover);
  const wins = played.filter((m) => m.won).length;
  return { played: played.length, wins, losses: played.length - wins, walkovers: matches.length - played.length };
};

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

export default router;
