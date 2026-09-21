import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { datesInRange } from "../utils/occurrences.js";

const router = Router();

router.use(requireAuth);

// ---------- Stages ----------

router.get("/", async (req, res) => {
  const { seasonId } = req.query;
  const camps = await req.db.camp.findMany({
    where: seasonId ? { seasonId } : undefined,
    orderBy: { startDate: "desc" },
  });
  res.json({ camps });
});

router.get("/:campId", async (req, res) => {
  const camp = await req.db.camp.findUnique({
    where: { id: req.params.campId },
    include: {
      groups: { include: { trainingPlan: true } },
      days: {
        orderBy: { date: "asc" },
        include: {
          periods: {
            orderBy: { startTime: "asc" },
            include: { groups: { include: { group: true } } },
          },
        },
      },
    },
  });
  if (!camp) return res.status(404).json({ error: "Stage introuvable." });
  res.json({ camp });
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const { seasonId, name, location, startDate, endDate } = req.body ?? {};
  if (!seasonId || !name || !startDate || !endDate) {
    return res.status(400).json({ error: "seasonId, name, startDate et endDate sont requis." });
  }
  const camp = await req.db.camp.create({
    data: { seasonId, name, location, startDate: new Date(startDate), endDate: new Date(endDate) },
  });
  res.status(201).json({ camp });
});

router.put("/:campId", requireRole("ADMIN"), async (req, res) => {
  const { name, location, startDate, endDate } = req.body ?? {};
  try {
    const camp = await req.db.camp.update({
      where: { id: req.params.campId },
      data: {
        ...(name !== undefined && { name }),
        ...(location !== undefined && { location }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
      },
    });
    res.json({ camp });
  } catch {
    res.status(404).json({ error: "Stage introuvable." });
  }
});

router.delete("/:campId", requireRole("ADMIN"), async (req, res) => {
  try {
    await req.db.camp.delete({ where: { id: req.params.campId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Stage introuvable." });
  }
});

// ---------- Groupes du stage (initiation, perfectionnement, psychomotricité...) ----------

router.post("/:campId/groups", requireRole("ADMIN"), async (req, res) => {
  const { name } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "name est requis." });
  const group = await req.db.campGroup.create({ data: { campId: req.params.campId, name } });
  res.status(201).json({ group });
});

router.put("/groups/:groupId", requireRole("ADMIN"), async (req, res) => {
  const { name, trainingPlanId } = req.body ?? {};
  try {
    const group = await req.db.campGroup.update({
      where: { id: req.params.groupId },
      data: {
        ...(name !== undefined && { name }),
        ...(trainingPlanId !== undefined && { trainingPlanId: trainingPlanId || null }),
      },
      include: { trainingPlan: true },
    });
    res.json({ group });
  } catch {
    res.status(404).json({ error: "Groupe de stage introuvable." });
  }
});

router.delete("/groups/:groupId", requireRole("ADMIN"), async (req, res) => {
  try {
    await req.db.campGroup.delete({ where: { id: req.params.groupId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Groupe de stage introuvable." });
  }
});

router.get("/groups/:groupId", async (req, res) => {
  const group = await req.db.campGroup.findUnique({
    where: { id: req.params.groupId },
    include: {
      camp: true,
      trainingPlan: true,
      coaches: { include: { coach: true, sparring: true } },
      players: { include: { player: true } },
    },
  });
  if (!group) return res.status(404).json({ error: "Groupe de stage introuvable." });
  res.json({ group });
});

// ---------- Encadrants par défaut du groupe (copiés sur chaque période affectée) ----------

router.post("/groups/:groupId/coaches", requireRole("ADMIN"), async (req, res) => {
  const { coachId, sparringId } = req.body ?? {};
  if ((!coachId && !sparringId) || (coachId && sparringId)) {
    return res.status(400).json({ error: "Fournir soit coachId, soit sparringId." });
  }
  const assignment = await req.db.campGroupCoach.create({
    data: { campGroupId: req.params.groupId, coachId: coachId ?? null, sparringId: sparringId ?? null },
    include: { coach: true, sparring: true },
  });
  res.status(201).json({ assignment });
});

router.delete("/groups/:groupId/coaches/:assignmentId", requireRole("ADMIN"), async (req, res) => {
  try {
    await req.db.campGroupCoach.delete({ where: { id: req.params.assignmentId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Affectation introuvable." });
  }
});

// ---------- Joueurs par défaut du groupe (copiés sur chaque période affectée) ----------

router.post("/groups/:groupId/players", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { playerId } = req.body ?? {};
  if (!playerId) return res.status(400).json({ error: "playerId est requis." });
  try {
    const enrollment = await req.db.campGroupPlayer.create({
      data: { campGroupId: req.params.groupId, playerId },
      include: { player: true },
    });
    res.status(201).json({ enrollment });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Ce joueur est déjà dans ce groupe." });
    }
    throw err;
  }
});

router.delete("/groups/:groupId/players/:playerId", requireRole("ADMIN", "COACH"), async (req, res) => {
  try {
    await req.db.campGroupPlayer.delete({
      where: { campGroupId_playerId: { campGroupId: req.params.groupId, playerId: req.params.playerId } },
    });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Inscription introuvable." });
  }
});

// ---------- Jours du stage ----------

// Copie les encadrants et joueurs par défaut du groupe sur la période-groupe donnée.
async function copyGroupDefaults(db, campGroupId, campPeriodGroupId) {
  const [defaultCoaches, defaultPlayers] = await Promise.all([
    db.campGroupCoach.findMany({ where: { campGroupId } }),
    db.campGroupPlayer.findMany({ where: { campGroupId } }),
  ]);
  await Promise.all([
    defaultCoaches.length &&
      db.campPeriodGroupCoach.createMany({
        data: defaultCoaches.map((d) => ({ campPeriodGroupId, coachId: d.coachId, sparringId: d.sparringId })),
      }),
    defaultPlayers.length &&
      db.campPeriodGroupPlayer.createMany({
        data: defaultPlayers.map((d) => ({ campPeriodGroupId, playerId: d.playerId })),
      }),
  ]);
}

// Ajoute une ou plusieurs journées d'un coup, entre startDate et endDate
// (inclus). Idempotent : ne recrée pas une journée déjà existante à la même
// date. endDate peut être égal à startDate pour n'ajouter qu'un seul jour.
router.post("/:campId/days", requireRole("ADMIN"), async (req, res) => {
  const { startDate, endDate, withDefaultPeriods } = req.body ?? {};
  if (!startDate || !endDate) {
    return res.status(400).json({ error: "startDate et endDate sont requis." });
  }

  const dates = datesInRange(new Date(startDate), new Date(endDate));
  const existing = await req.db.campDay.findMany({
    where: { campId: req.params.campId, date: { in: dates } },
    select: { date: true },
  });
  const existingTimes = new Set(existing.map((d) => d.date.getTime()));
  const toCreate = dates.filter((d) => !existingTimes.has(d.getTime()));

  if (toCreate.length > 0) {
    await req.db.$transaction(
      toCreate.map((date) =>
        req.db.campDay.create({
          data: {
            campId: req.params.campId,
            date,
            ...(withDefaultPeriods && {
              periods: {
                create: [
                  { label: "Matinée", startTime: "09:00", endTime: "12:00" },
                  { label: "Après-midi", startTime: "13:00", endTime: "16:00" },
                ],
              },
            }),
          },
        })
      )
    );
  }

  res.status(201).json({ created: toCreate.length, skipped: dates.length - toCreate.length });
});

router.delete("/days/:dayId", requireRole("ADMIN"), async (req, res) => {
  try {
    await req.db.campDay.delete({ where: { id: req.params.dayId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Journée introuvable." });
  }
});

// ---------- Périodes d'une journée (matinée, après-midi...) ----------

router.post("/days/:dayId/periods", requireRole("ADMIN"), async (req, res) => {
  const { label, startTime, endTime } = req.body ?? {};
  if (!label || !startTime || !endTime) {
    return res.status(400).json({ error: "label, startTime et endTime sont requis." });
  }
  const period = await req.db.campPeriod.create({
    data: { campDayId: req.params.dayId, label, startTime, endTime },
  });
  res.status(201).json({ period });
});

// Ajoute la même période (label + horaires) sur chaque journée du stage comprise
// entre startDate et endDate (inclus). Crée la journée si elle n'existe pas
// encore à cette date. Idempotent : ne recrée pas une période du même label
// déjà présente sur une journée donnée.
router.post("/:campId/periods/generate", requireRole("ADMIN"), async (req, res) => {
  const { startDate, endDate, label, startTime, endTime } = req.body ?? {};
  if (!startDate || !endDate || !label || !startTime || !endTime) {
    return res.status(400).json({ error: "startDate, endDate, label, startTime et endTime sont requis." });
  }

  const dates = datesInRange(new Date(startDate), new Date(endDate));
  const existingDays = await req.db.campDay.findMany({
    where: { campId: req.params.campId, date: { in: dates } },
    include: { periods: true },
  });
  const dayByTime = new Map(existingDays.map((d) => [d.date.getTime(), d]));

  let created = 0;
  let skipped = 0;
  for (const date of dates) {
    let day = dayByTime.get(date.getTime());
    if (!day) {
      day = await req.db.campDay.create({ data: { campId: req.params.campId, date }, include: { periods: true } });
    }
    if (day.periods.some((p) => p.label === label)) {
      skipped += 1;
      continue;
    }
    await req.db.campPeriod.create({ data: { campDayId: day.id, label, startTime, endTime } });
    created += 1;
  }

  res.status(201).json({ created, skipped });
});

router.put("/periods/:periodId", requireRole("ADMIN"), async (req, res) => {
  const { label, startTime, endTime } = req.body ?? {};
  try {
    const period = await req.db.campPeriod.update({
      where: { id: req.params.periodId },
      data: {
        ...(label !== undefined && { label }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
      },
    });
    res.json({ period });
  } catch {
    res.status(404).json({ error: "Période introuvable." });
  }
});

router.delete("/periods/:periodId", requireRole("ADMIN"), async (req, res) => {
  try {
    await req.db.campPeriod.delete({ where: { id: req.params.periodId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Période introuvable." });
  }
});

// ---------- Affectation d'un groupe à une période ----------

router.post("/periods/:periodId/groups", requireRole("ADMIN"), async (req, res) => {
  const { campGroupId } = req.body ?? {};
  if (!campGroupId) return res.status(400).json({ error: "campGroupId est requis." });
  try {
    const periodGroup = await req.db.campPeriodGroup.create({
      data: { campPeriodId: req.params.periodId, campGroupId },
      include: { group: true },
    });
    await copyGroupDefaults(req.db, campGroupId, periodGroup.id);
    res.status(201).json({ periodGroup });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Ce groupe est déjà affecté à cette période." });
    }
    throw err;
  }
});

router.delete("/period-groups/:periodGroupId", requireRole("ADMIN"), async (req, res) => {
  try {
    await req.db.campPeriodGroup.delete({ where: { id: req.params.periodGroupId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Affectation introuvable." });
  }
});

export default router;
