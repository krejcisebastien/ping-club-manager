import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { datesForWeekday } from "../utils/occurrences.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const { seasonId, groupId } = req.query;
  const trainings = await req.db.training.findMany({
    where: {
      ...(seasonId && { seasonId }),
      ...(groupId && { groupId }),
    },
    include: { group: true },
    orderBy: { name: "asc" },
  });
  res.json({ trainings });
});

router.get("/:id", async (req, res) => {
  const training = await req.db.training.findUnique({
    where: { id: req.params.id },
    include: { group: true, coaches: { include: { coach: true, sparring: true } } },
  });
  if (!training) return res.status(404).json({ error: "Entrainement introuvable." });
  res.json({ training });
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const { seasonId, groupId, name, location, weekday, startTime, endTime } = req.body ?? {};
  if (!seasonId || !groupId || !name) {
    return res.status(400).json({ error: "seasonId, groupId et name sont requis." });
  }
  const training = await req.db.training.create({
    data: { seasonId, groupId, name, location, weekday, startTime, endTime },
  });
  res.status(201).json({ training });
});

router.put("/:id", requireRole("ADMIN"), async (req, res) => {
  const { name, location, weekday, startTime, endTime, groupId } = req.body ?? {};
  try {
    const training = await req.db.training.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(location !== undefined && { location }),
        ...(weekday !== undefined && { weekday }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(groupId !== undefined && { groupId }),
      },
    });
    res.json({ training });
  } catch {
    res.status(404).json({ error: "Entrainement introuvable." });
  }
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await req.db.training.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Entrainement introuvable." });
  }
});

// ---------- Encadrants par défaut (copiés sur chaque séance générée) ----------

router.post("/:id/coaches", requireRole("ADMIN"), async (req, res) => {
  const { coachId, sparringId } = req.body ?? {};
  if ((!coachId && !sparringId) || (coachId && sparringId)) {
    return res.status(400).json({ error: "Fournir soit coachId, soit sparringId." });
  }
  const assignment = await req.db.trainingCoach.create({
    data: { trainingId: req.params.id, coachId: coachId ?? null, sparringId: sparringId ?? null },
    include: { coach: true, sparring: true },
  });
  res.status(201).json({ assignment });
});

router.delete("/:id/coaches/:assignmentId", requireRole("ADMIN"), async (req, res) => {
  try {
    await req.db.trainingCoach.delete({ where: { id: req.params.assignmentId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Affectation introuvable." });
  }
});

// ---------- Occurrences (séances datées) ----------

// Copie les encadrants par défaut de l'entrainement sur les séances données.
async function copyDefaultCoaches(db, trainingId, occurrenceIds) {
  if (!occurrenceIds.length) return;
  const defaults = await db.trainingCoach.findMany({ where: { trainingId } });
  if (!defaults.length) return;
  await db.trainingOccurrenceCoach.createMany({
    data: occurrenceIds.flatMap((occurrenceId) =>
      defaults.map((d) => ({ occurrenceId, coachId: d.coachId, sparringId: d.sparringId }))
    ),
  });
}

router.get("/:id/occurrences", async (req, res) => {
  const occurrences = await req.db.trainingOccurrence.findMany({
    where: { trainingId: req.params.id },
    orderBy: { date: "asc" },
    include: { _count: { select: { attendances: true } } },
  });
  res.json({ occurrences });
});

// Ajoute une séance ponctuelle.
router.post("/:id/occurrences", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { date, startTime, endTime } = req.body ?? {};
  if (!date || !startTime || !endTime) {
    return res.status(400).json({ error: "date, startTime et endTime sont requis." });
  }
  const occurrence = await req.db.trainingOccurrence.create({
    data: { trainingId: req.params.id, date: new Date(date), startTime, endTime },
  });
  await copyDefaultCoaches(req.db, req.params.id, [occurrence.id]);
  res.status(201).json({ occurrence });
});

// Génère automatiquement les séances récurrentes entre deux dates, à partir du
// jour de semaine et des horaires définis sur l'entrainement. Idempotent : ne
// recrée pas une séance déjà existante à la même date.
router.post("/:id/generate-occurrences", requireRole("ADMIN"), async (req, res) => {
  const { startDate, endDate } = req.body ?? {};
  if (!startDate || !endDate) {
    return res.status(400).json({ error: "startDate et endDate sont requis." });
  }

  const training = await req.db.training.findUnique({ where: { id: req.params.id } });
  if (!training) return res.status(404).json({ error: "Entrainement introuvable." });
  if (training.weekday == null || !training.startTime || !training.endTime) {
    return res.status(400).json({
      error: "L'entrainement doit avoir un jour de semaine et des horaires définis pour générer des séances.",
    });
  }

  const dates = datesForWeekday(new Date(startDate), new Date(endDate), training.weekday);
  const existing = await req.db.trainingOccurrence.findMany({
    where: { trainingId: training.id, date: { in: dates } },
    select: { date: true },
  });
  const existingTimes = new Set(existing.map((o) => o.date.getTime()));
  const toCreate = dates.filter((d) => !existingTimes.has(d.getTime()));

  if (toCreate.length > 0) {
    await req.db.trainingOccurrence.createMany({
      data: toCreate.map((date) => ({
        trainingId: training.id,
        date,
        startTime: training.startTime,
        endTime: training.endTime,
      })),
    });
    const created = await req.db.trainingOccurrence.findMany({
      where: { trainingId: training.id, date: { in: toCreate } },
      select: { id: true },
    });
    await copyDefaultCoaches(
      req.db,
      training.id,
      created.map((o) => o.id)
    );
  }

  res.status(201).json({ created: toCreate.length, skipped: dates.length - toCreate.length });
});

export default router;
