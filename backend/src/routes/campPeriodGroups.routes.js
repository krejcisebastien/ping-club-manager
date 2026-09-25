import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/:id", async (req, res) => {
  const periodGroup = await req.db.campPeriodGroup.findUnique({
    where: { id: req.params.id },
    include: {
      group: { include: { trainingPlan: true } },
      period: { include: { campDay: true } },
      coaches: { include: { coach: true, sparring: true } },
      players: { include: { player: true } },
    },
  });
  if (!periodGroup) return res.status(404).json({ error: "Affectation introuvable." });
  const registered = await req.db.campPlayer.findMany({
    where: { campId: periodGroup.group.campId },
    include: { player: true },
    orderBy: { player: { lastName: "asc" } },
  });
  res.json({ periodGroup, registered: registered.map((r) => r.player) });
});

// ---------- Encadrants (entraineurs / sparrings) affectés ----------

router.post("/:id/coaches", requireRole("ADMIN"), async (req, res) => {
  const { coachId, sparringId } = req.body ?? {};
  if ((!coachId && !sparringId) || (coachId && sparringId)) {
    return res.status(400).json({ error: "Fournir soit coachId, soit sparringId." });
  }
  const assignment = await req.db.campPeriodGroupCoach.create({
    data: { campPeriodGroupId: req.params.id, coachId: coachId ?? null, sparringId: sparringId ?? null },
    include: { coach: true, sparring: true },
  });
  res.status(201).json({ assignment });
});

router.delete("/:id/coaches/:assignmentId", requireRole("ADMIN"), async (req, res) => {
  try {
    await req.db.campPeriodGroupCoach.delete({ where: { id: req.params.assignmentId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Affectation introuvable." });
  }
});

// ---------- Joueurs inscrits ----------

router.post("/:id/players", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { playerId } = req.body ?? {};
  if (!playerId) return res.status(400).json({ error: "playerId est requis." });

  const periodGroup = await req.db.campPeriodGroup.findUnique({ where: { id: req.params.id }, include: { group: true } });
  if (!periodGroup) return res.status(404).json({ error: "Affectation introuvable." });
  const registered = await req.db.campPlayer.findFirst({ where: { campId: periodGroup.group.campId, playerId } });
  if (!registered) return res.status(400).json({ error: "Ce joueur n'est pas inscrit au stage." });

  // Un joueur n'est que dans un seul groupe par période : on le retire des autres.
  await req.db.campPeriodGroupPlayer.deleteMany({
    where: { playerId, campPeriodGroup: { campPeriodId: periodGroup.campPeriodId } },
  });
  const enrollment = await req.db.campPeriodGroupPlayer.create({
    data: { campPeriodGroupId: req.params.id, playerId },
    include: { player: true },
  });
  res.status(201).json({ enrollment });
});

router.delete("/:id/players/:playerId", requireRole("ADMIN", "COACH"), async (req, res) => {
  try {
    await req.db.campPeriodGroupPlayer.delete({
      where: { campPeriodGroupId_playerId: { campPeriodGroupId: req.params.id, playerId: req.params.playerId } },
    });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Inscription introuvable." });
  }
});

export default router;
