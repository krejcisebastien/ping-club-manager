import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/:id", async (req, res) => {
  const periodGroup = await prisma.campPeriodGroup.findUnique({
    where: { id: req.params.id },
    include: {
      group: { include: { trainingPlan: true } },
      period: { include: { campDay: true } },
      coaches: { include: { coach: true, sparring: true } },
      players: { include: { player: true } },
    },
  });
  if (!periodGroup) return res.status(404).json({ error: "Affectation introuvable." });
  res.json({ periodGroup });
});

// ---------- Encadrants (entraineurs / sparrings) affectés ----------

router.post("/:id/coaches", requireRole("ADMIN"), async (req, res) => {
  const { coachId, sparringId } = req.body ?? {};
  if ((!coachId && !sparringId) || (coachId && sparringId)) {
    return res.status(400).json({ error: "Fournir soit coachId, soit sparringId." });
  }
  const assignment = await prisma.campPeriodGroupCoach.create({
    data: { campPeriodGroupId: req.params.id, coachId: coachId ?? null, sparringId: sparringId ?? null },
    include: { coach: true, sparring: true },
  });
  res.status(201).json({ assignment });
});

router.delete("/:id/coaches/:assignmentId", requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.campPeriodGroupCoach.delete({ where: { id: req.params.assignmentId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Affectation introuvable." });
  }
});

// ---------- Joueurs inscrits ----------

router.post("/:id/players", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { playerId } = req.body ?? {};
  if (!playerId) return res.status(400).json({ error: "playerId est requis." });
  try {
    const enrollment = await prisma.campPeriodGroupPlayer.create({
      data: { campPeriodGroupId: req.params.id, playerId },
      include: { player: true },
    });
    res.status(201).json({ enrollment });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Ce joueur est déjà inscrit sur cette période." });
    }
    throw err;
  }
});

router.delete("/:id/players/:playerId", requireRole("ADMIN", "COACH"), async (req, res) => {
  try {
    await prisma.campPeriodGroupPlayer.delete({
      where: { campPeriodGroupId_playerId: { campPeriodGroupId: req.params.id, playerId: req.params.playerId } },
    });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Inscription introuvable." });
  }
});

// ---------- Présences ----------

router.get("/:id/attendance", requireRole("ADMIN", "COACH"), async (req, res) => {
  const [roster, records] = await Promise.all([
    prisma.campPeriodGroupPlayer.findMany({
      where: { campPeriodGroupId: req.params.id },
      include: { player: true },
      orderBy: { player: { lastName: "asc" } },
    }),
    prisma.campAttendance.findMany({ where: { campPeriodGroupId: req.params.id } }),
  ]);

  const byPlayerId = new Map(records.map((r) => [r.playerId, r]));
  const attendance = roster.map(({ player }) => ({
    playerId: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    present: byPlayerId.get(player.id)?.present ?? false,
  }));

  res.json({ attendance });
});

router.put("/:id/attendance", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { records } = req.body ?? {};
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: "records doit être un tableau." });
  }

  await prisma.$transaction(
    records.map(({ playerId, present }) =>
      prisma.campAttendance.upsert({
        where: { campPeriodGroupId_playerId: { campPeriodGroupId: req.params.id, playerId } },
        create: { campPeriodGroupId: req.params.id, playerId, present: !!present },
        update: { present: !!present },
      })
    )
  );

  res.status(204).end();
});

export default router;
