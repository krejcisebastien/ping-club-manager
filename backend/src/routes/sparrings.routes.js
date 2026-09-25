import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { isRanking, seriesOf } from "../lib/rankings.js";

const router = Router();

router.use(requireAuth);

// Un sparring rattaché à un joueur du club n'a pas de classement propre : on
// prend le dernier classement du joueur (source unique). Le nom, lui, est
// recopié du joueur à l'enregistrement et à chaque modification du joueur.
async function withRanking(db, sparrings) {
  const playerIds = sparrings.map((s) => s.playerId).filter(Boolean);
  const latest = new Map();
  if (playerIds.length) {
    const histories = await db.rankingHistory.findMany({
      where: { playerId: { in: playerIds } },
      orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
    });
    for (const h of histories) if (!latest.has(h.playerId)) latest.set(h.playerId, h.rankingValue);
  }
  return sparrings.map((s) => {
    const ranking = s.playerId ? latest.get(s.playerId) ?? null : s.ranking;
    return { ...s, ranking, series: seriesOf(ranking) };
  });
}

// Valide et prépare les champs communs à la création et à la modification.
async function buildData(db, body, current) {
  const isClubMember = body.isClubMember !== undefined ? !!body.isClubMember : current?.isClubMember ?? false;
  const playerId = body.playerId !== undefined ? body.playerId : current?.playerId ?? null;

  if (isClubMember) {
    if (!playerId) return { error: "Choisis le joueur du club." };
    const player = await db.player.findUnique({ where: { id: playerId } });
    if (!player) return { error: "Joueur introuvable." };
    return {
      data: { isClubMember: true, playerId, firstName: player.firstName, lastName: player.lastName, ranking: null, externalClub: null },
    };
  }

  const firstName = body.firstName ?? current?.firstName;
  const lastName = body.lastName ?? current?.lastName;
  if (!firstName || !lastName) return { error: "firstName et lastName sont requis." };
  const ranking = body.ranking !== undefined ? body.ranking || null : current?.ranking ?? null;
  if (ranking && !isRanking(ranking)) return { error: "Classement invalide." };
  return {
    data: {
      isClubMember: false,
      playerId: null,
      firstName,
      lastName,
      ranking,
      externalClub: body.externalClub !== undefined ? body.externalClub || null : current?.externalClub ?? null,
    },
  };
}

router.get("/", async (req, res) => {
  const sparrings = await req.db.sparring.findMany({ orderBy: { lastName: "asc" } });
  res.json({ sparrings: await withRanking(req.db, sparrings) });
});

router.get("/:id", async (req, res) => {
  const sparring = await req.db.sparring.findUnique({ where: { id: req.params.id } });
  if (!sparring) return res.status(404).json({ error: "Sparring introuvable." });
  res.json({ sparring: (await withRanking(req.db, [sparring]))[0] });
});

router.post("/", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { data, error } = await buildData(req.db, req.body ?? {}, null);
  if (error) return res.status(400).json({ error });
  try {
    const sparring = await req.db.sparring.create({ data });
    res.status(201).json({ sparring: (await withRanking(req.db, [sparring]))[0] });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Ce joueur du club est déjà enregistré comme sparring." });
    }
    throw err;
  }
});

router.put("/:id", requireRole("ADMIN", "COACH"), async (req, res) => {
  const current = await req.db.sparring.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ error: "Sparring introuvable." });
  const { data, error } = await buildData(req.db, req.body ?? {}, current);
  if (error) return res.status(400).json({ error });
  try {
    const sparring = await req.db.sparring.update({ where: { id: req.params.id }, data });
    res.json({ sparring: (await withRanking(req.db, [sparring]))[0] });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Ce joueur du club est déjà enregistré comme sparring." });
    }
    throw err;
  }
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await req.db.sparring.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Sparring introuvable." });
  }
});

export default router;
