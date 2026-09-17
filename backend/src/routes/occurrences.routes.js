import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/:id", async (req, res) => {
  const occurrence = await prisma.trainingOccurrence.findUnique({
    where: { id: req.params.id },
    include: {
      training: { include: { group: true } },
      coaches: { include: { coach: true, sparring: true } },
    },
  });
  if (!occurrence) return res.status(404).json({ error: "Séance introuvable." });
  res.json({ occurrence });
});

router.put("/:id", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { date, startTime, endTime, status } = req.body ?? {};
  try {
    const occurrence = await prisma.trainingOccurrence.update({
      where: { id: req.params.id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(status !== undefined && { status }),
      },
    });
    res.json({ occurrence });
  } catch {
    res.status(404).json({ error: "Séance introuvable." });
  }
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.trainingOccurrence.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Séance introuvable." });
  }
});

// ---------- Encadrants (entraineurs / sparrings) affectés à la séance ----------

router.post("/:id/coaches", requireRole("ADMIN"), async (req, res) => {
  const { coachId, sparringId } = req.body ?? {};
  if ((!coachId && !sparringId) || (coachId && sparringId)) {
    return res.status(400).json({ error: "Fournir soit coachId, soit sparringId." });
  }
  const assignment = await prisma.trainingOccurrenceCoach.create({
    data: { occurrenceId: req.params.id, coachId: coachId ?? null, sparringId: sparringId ?? null },
    include: { coach: true, sparring: true },
  });
  res.status(201).json({ assignment });
});

router.delete("/:id/coaches/:assignmentId", requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.trainingOccurrenceCoach.delete({ where: { id: req.params.assignmentId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Affectation introuvable." });
  }
});

// ---------- Présences ----------

// Renvoie la liste des joueurs du groupe de l'entrainement (feuille de présence),
// avec le statut de présence déjà enregistré le cas échéant.
router.get("/:id/attendance", requireRole("ADMIN", "COACH"), async (req, res) => {
  const occurrence = await prisma.trainingOccurrence.findUnique({
    where: { id: req.params.id },
    include: { training: true },
  });
  if (!occurrence) return res.status(404).json({ error: "Séance introuvable." });

  const [roster, records] = await Promise.all([
    prisma.playerGroupAssignment.findMany({
      where: { groupId: occurrence.training.groupId, endDate: null },
      include: { player: true },
      orderBy: { player: { lastName: "asc" } },
    }),
    prisma.attendance.findMany({ where: { occurrenceId: req.params.id } }),
  ]);

  const byPlayerId = new Map(records.map((r) => [r.playerId, r]));
  const attendance = roster.map(({ player }) => ({
    playerId: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    present: byPlayerId.get(player.id)?.present ?? false,
    note: byPlayerId.get(player.id)?.note ?? null,
  }));

  res.json({ attendance });
});

// Enregistre les présences en une fois : { records: [{ playerId, present, note }] }
router.put("/:id/attendance", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { records } = req.body ?? {};
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: "records doit être un tableau." });
  }

  await prisma.$transaction(
    records.map(({ playerId, present, note }) =>
      prisma.attendance.upsert({
        where: { occurrenceId_playerId: { occurrenceId: req.params.id, playerId } },
        create: { occurrenceId: req.params.id, playerId, present: !!present, note },
        update: { present: !!present, note },
      })
    )
  );

  res.status(204).end();
});

export default router;
