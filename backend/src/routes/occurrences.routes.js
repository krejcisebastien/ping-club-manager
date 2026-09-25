import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/:id", async (req, res) => {
  const occurrence = await req.db.trainingOccurrence.findUnique({
    where: { id: req.params.id },
    include: {
      training: { include: { group: true } },
      coaches: { include: { coach: true, sparring: true } },
    },
  });
  if (!occurrence) return res.status(404).json({ error: "Séance introuvable." });
  res.json({ occurrence });
});

const OCCURRENCE_STATUSES = ["PLANNED", "CANCELLED"];

router.put("/:id", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { date, startTime, endTime, status } = req.body ?? {};

  // Annuler / rétablir une séance est réservé aux administrateurs.
  if (status !== undefined) {
    if (!req.user.roles?.includes("ADMIN")) {
      return res.status(403).json({ error: "Seul un administrateur peut annuler ou rétablir une séance." });
    }
    if (!OCCURRENCE_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status doit être l'un de : ${OCCURRENCE_STATUSES.join(", ")}.` });
    }
    if (status === "CANCELLED") {
      const encoded = await req.db.attendance.count({ where: { occurrenceId: req.params.id } });
      if (encoded > 0) {
        return res.status(409).json({ error: "Des présences sont déjà encodées : annule d'abord l'encodage avant d'annuler la séance." });
      }
    }
  }

  try {
    const occurrence = await req.db.trainingOccurrence.update({
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
    await req.db.trainingOccurrence.delete({ where: { id: req.params.id } });
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
  const assignment = await req.db.trainingOccurrenceCoach.create({
    data: { occurrenceId: req.params.id, coachId: coachId ?? null, sparringId: sparringId ?? null },
    include: { coach: true, sparring: true },
  });
  res.status(201).json({ assignment });
});

router.delete("/:id/coaches/:assignmentId", requireRole("ADMIN"), async (req, res) => {
  try {
    await req.db.trainingOccurrenceCoach.delete({ where: { id: req.params.assignmentId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Affectation introuvable." });
  }
});

// ---------- Présences ----------

// Renvoie la liste des joueurs du groupe de l'entrainement (feuille de présence),
// avec le statut de présence déjà enregistré le cas échéant.
router.get("/:id/attendance", requireRole("ADMIN", "COACH"), async (req, res) => {
  const occurrence = await req.db.trainingOccurrence.findUnique({
    where: { id: req.params.id },
    include: { training: true },
  });
  if (!occurrence) return res.status(404).json({ error: "Séance introuvable." });

  const [roster, records] = await Promise.all([
    req.db.playerGroupAssignment.findMany({
      where: { groupId: occurrence.training.groupId, endDate: null },
      include: { player: true },
      orderBy: { player: { lastName: "asc" } },
    }),
    req.db.attendance.findMany({ where: { occurrenceId: req.params.id } }),
  ]);

  const byPlayerId = new Map(records.map((r) => [r.playerId, r]));
  const attendance = roster.map(({ player }) => ({
    playerId: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    status: byPlayerId.get(player.id)?.status ?? null,
    note: byPlayerId.get(player.id)?.note ?? null,
  }));

  res.json({ attendance, encoded: records.length > 0 });
});

const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "EXCUSED", "LATE"];

// Enregistre les présences en une fois : { records: [{ playerId, status, note }] }
router.put("/:id/attendance", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { records } = req.body ?? {};
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: "records doit être un tableau." });
  }
  if (records.some(({ status }) => status !== undefined && !ATTENDANCE_STATUSES.includes(status))) {
    return res.status(400).json({ error: `status doit être l'un de : ${ATTENDANCE_STATUSES.join(", ")}.` });
  }

  const occurrence = await req.db.trainingOccurrence.findUnique({ where: { id: req.params.id }, select: { status: true } });
  if (!occurrence) return res.status(404).json({ error: "Séance introuvable." });
  if (occurrence.status === "CANCELLED") {
    return res.status(409).json({ error: "Cette séance est annulée : impossible d'encoder des présences." });
  }

  await req.db.$transaction(
    records.map(({ playerId, status, note }) =>
      req.db.attendance.upsert({
        where: { occurrenceId_playerId: { occurrenceId: req.params.id, playerId } },
        create: { occurrenceId: req.params.id, playerId, status: status ?? "ABSENT", note },
        update: { status: status ?? "ABSENT", note },
      })
    )
  );

  res.status(204).end();
});

// Annule l'encodage (ex. erreur de jour) : supprime tous les enregistrements de
// présence de la séance, qui ne compte plus ni dans les taux ni dans les heures.
router.delete("/:id/attendance", requireRole("ADMIN", "COACH"), async (req, res) => {
  const occurrence = await req.db.trainingOccurrence.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!occurrence) return res.status(404).json({ error: "Séance introuvable." });
  await req.db.attendance.deleteMany({ where: { occurrenceId: occurrence.id } });
  res.status(204).end();
});

export default router;
