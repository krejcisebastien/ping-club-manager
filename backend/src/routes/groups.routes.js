import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// Aperçu de joueurs affiché sur chaque carte, sans devoir ouvrir le groupe.
const PREVIEW_SIZE = 6;

router.get("/", async (req, res) => {
  const { seasonId } = req.query;
  const groups = await req.db.trainingGroup.findMany({
    where: seasonId ? { seasonId } : undefined,
    include: {
      _count: { select: { playerAssignments: { where: { endDate: null } } } },
      playerAssignments: {
        where: { endDate: null },
        orderBy: { player: { lastName: "asc" } },
        take: PREVIEW_SIZE,
        select: { player: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
    orderBy: { name: "asc" },
  });
  res.json({
    groups: groups.map((g) => ({
      ...g,
      playerCount: g._count.playerAssignments,
      players: g.playerAssignments.map((a) => a.player),
      _count: undefined,
      playerAssignments: undefined,
    })),
  });
});

router.get("/:id", async (req, res) => {
  const group = await req.db.trainingGroup.findUnique({ where: { id: req.params.id } });
  if (!group) return res.status(404).json({ error: "Groupe introuvable." });
  res.json({ group });
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const { seasonId, name, rankingCriteria } = req.body ?? {};
  if (!seasonId || !name) {
    return res.status(400).json({ error: "seasonId et name sont requis." });
  }
  const group = await req.db.trainingGroup.create({ data: { seasonId, name, rankingCriteria } });
  res.status(201).json({ group });
});

router.put("/:id", requireRole("ADMIN"), async (req, res) => {
  const { name, rankingCriteria } = req.body ?? {};
  try {
    const group = await req.db.trainingGroup.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(rankingCriteria !== undefined && { rankingCriteria }),
      },
    });
    res.json({ group });
  } catch {
    res.status(404).json({ error: "Groupe introuvable." });
  }
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await req.db.trainingGroup.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Groupe introuvable." });
  }
});

// ---------- Composition du groupe (joueurs actuellement affectés) ----------

router.get("/:id/players", async (req, res) => {
  const assignments = await req.db.playerGroupAssignment.findMany({
    where: { groupId: req.params.id, endDate: null },
    include: { player: true },
    orderBy: { player: { lastName: "asc" } },
  });
  res.json({ assignments });
});

// Affecte un joueur à ce groupe. Un joueur peut être affecté à plusieurs
// groupes en même temps (ex. groupe d'âge + groupe de niveau).
router.post("/:id/players", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { playerId } = req.body ?? {};
  if (!playerId) return res.status(400).json({ error: "playerId est requis." });

  const group = await req.db.trainingGroup.findUnique({ where: { id: req.params.id } });
  if (!group) return res.status(404).json({ error: "Groupe introuvable." });

  const existing = await req.db.playerGroupAssignment.findFirst({
    where: { playerId, groupId: group.id, endDate: null },
  });
  if (existing) return res.status(409).json({ error: "Ce joueur est déjà dans ce groupe." });

  const assignment = await req.db.playerGroupAssignment.create({
    data: { playerId, groupId: group.id, startDate: new Date() },
    include: { player: true },
  });
  res.status(201).json({ assignment });
});

// Retire un joueur de ce groupe (clôt l'affectation, sans la supprimer, pour garder l'historique).
router.delete("/:id/players/:playerId", requireRole("ADMIN", "COACH"), async (req, res) => {
  const updated = await req.db.playerGroupAssignment.updateMany({
    where: { groupId: req.params.id, playerId: req.params.playerId, endDate: null },
    data: { endDate: new Date() },
  });
  if (updated.count === 0) {
    return res.status(404).json({ error: "Affectation active introuvable." });
  }
  res.status(204).end();
});

export default router;
