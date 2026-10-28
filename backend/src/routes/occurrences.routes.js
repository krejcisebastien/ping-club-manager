import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { notifyInBackground, occurrenceUserIds, staffUserIds, formatDay, isPast } from "../lib/notify.js";

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

  const before = await req.db.trainingOccurrence.findUnique({ where: { id: req.params.id }, include: { training: true } });
  if (!before) return res.status(404).json({ error: "Séance introuvable." });

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

  const message = changeMessage(before, occurrence);
  if (message) notifyInBackground(req.db, occurrenceUserIds(req.db, occurrence.id, req.user.sub), message);
});

const when = (occ) => `${formatDay(occ.date)}, ${occ.startTime}–${occ.endTime}`;

// Notification à envoyer aux joueurs et encadrants pour ce changement (rien
// pour une séance passée, ou si rien de visible n'a changé).
function changeMessage(before, after) {
  const name = before.training.name;
  if (before.status !== after.status) {
    if (isPast(after.date)) return null;
    return after.status === "CANCELLED"
      ? { title: "Séance annulée", body: `${name} du ${when(after)} est annulé.` }
      : { title: "Séance rétablie", body: `${name} du ${when(after)} a bien lieu.` };
  }
  const moved = before.date.getTime() !== after.date.getTime() || before.startTime !== after.startTime || before.endTime !== after.endTime;
  if (!moved || after.status === "CANCELLED" || (isPast(before.date) && isPast(after.date))) return null;
  return { title: "Séance déplacée", body: `${name} : désormais le ${when(after)} (au lieu du ${when(before)}).` };
}

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
    include: { coach: true, sparring: true, occurrence: { include: { training: true } } },
  });
  const { occurrence, ...rest } = assignment;
  res.status(201).json({ assignment: rest });
  notifyStaffChange(req, assignment, occurrence, "added");
});

router.delete("/:id/coaches/:assignmentId", requireRole("ADMIN"), async (req, res) => {
  const assignment = await req.db.trainingOccurrenceCoach.findUnique({
    where: { id: req.params.assignmentId },
    include: { occurrence: { include: { training: true } } },
  });
  if (!assignment) return res.status(404).json({ error: "Affectation introuvable." });
  await req.db.trainingOccurrenceCoach.delete({ where: { id: assignment.id } });
  res.status(204).end();
  notifyStaffChange(req, assignment, assignment.occurrence, "removed");
});

// Prévient l'entraineur ou le sparring ajouté à / retiré d'une séance à venir.
function notifyStaffChange(req, assignment, occurrence, change) {
  if (occurrence.status === "CANCELLED" || isPast(occurrence.date)) return;
  const target = { coachIds: [assignment.coachId].filter(Boolean), sparringIds: [assignment.sparringId].filter(Boolean) };
  const userIds = staffUserIds(req.db, target).then((ids) => ids.filter((id) => id !== req.user.sub));
  const label = `${occurrence.training.name} du ${when(occurrence)}`;
  notifyInBackground(
    req.db,
    userIds,
    change === "added"
      ? { title: "Tu encadres une séance", body: `${label}.` }
      : { title: "Tu n'encadres plus une séance", body: `${label} : tu as été retiré de l'encadrement.` },
  );
}

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
