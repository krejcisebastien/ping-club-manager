import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const { seasonId } = req.query;
  const groups = await prisma.trainingGroup.findMany({
    where: seasonId ? { seasonId } : undefined,
    orderBy: { name: "asc" },
  });
  res.json({ groups });
});

router.get("/:id", async (req, res) => {
  const group = await prisma.trainingGroup.findUnique({ where: { id: req.params.id } });
  if (!group) return res.status(404).json({ error: "Groupe introuvable." });
  res.json({ group });
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const { seasonId, name, rankingCriteria } = req.body ?? {};
  if (!seasonId || !name) {
    return res.status(400).json({ error: "seasonId et name sont requis." });
  }
  const group = await prisma.trainingGroup.create({ data: { seasonId, name, rankingCriteria } });
  res.status(201).json({ group });
});

router.put("/:id", requireRole("ADMIN"), async (req, res) => {
  const { name, rankingCriteria } = req.body ?? {};
  try {
    const group = await prisma.trainingGroup.update({
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
    await prisma.trainingGroup.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Groupe introuvable." });
  }
});

// ---------- Composition du groupe (joueurs actuellement affectés) ----------

router.get("/:id/players", async (req, res) => {
  const assignments = await prisma.playerGroupAssignment.findMany({
    where: { groupId: req.params.id, endDate: null },
    include: { player: true },
    orderBy: { player: { lastName: "asc" } },
  });
  res.json({ assignments });
});

// Affecte un joueur à ce groupe. Si le joueur a déjà une affectation ouverte
// sur un groupe de la même saison, elle est automatiquement close (changement de groupe).
router.post("/:id/players", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { playerId } = req.body ?? {};
  if (!playerId) return res.status(400).json({ error: "playerId est requis." });

  const group = await prisma.trainingGroup.findUnique({ where: { id: req.params.id } });
  if (!group) return res.status(404).json({ error: "Groupe introuvable." });

  const now = new Date();
  await prisma.playerGroupAssignment.updateMany({
    where: { playerId, endDate: null, group: { seasonId: group.seasonId } },
    data: { endDate: now },
  });
  const assignment = await prisma.playerGroupAssignment.create({
    data: { playerId, groupId: group.id, startDate: now },
    include: { player: true },
  });
  res.status(201).json({ assignment });
});

// Retire un joueur de ce groupe (clôt l'affectation, sans la supprimer, pour garder l'historique).
router.delete("/:id/players/:playerId", requireRole("ADMIN", "COACH"), async (req, res) => {
  const updated = await prisma.playerGroupAssignment.updateMany({
    where: { groupId: req.params.id, playerId: req.params.playerId, endDate: null },
    data: { endDate: new Date() },
  });
  if (updated.count === 0) {
    return res.status(404).json({ error: "Affectation active introuvable." });
  }
  res.status(204).end();
});

export default router;
