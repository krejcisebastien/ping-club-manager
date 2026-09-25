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

// Affecte d'office tous les groupes du stage aux périodes données (avec leurs
// encadrants et joueurs par défaut). Appelé à la création de journées/périodes :
// on retire ensuite à la main les groupes absents d'une période.
async function assignAllGroups(db, campId, periods) {
  if (!periods.length) return;
  const groups = await db.campGroup.findMany({ where: { campId }, include: { coaches: true, players: true } });
  if (!groups.length) return;

  const periodIds = periods.map((p) => p.id);
  await db.campPeriodGroup.createMany({
    data: periodIds.flatMap((campPeriodId) => groups.map((g) => ({ campPeriodId, campGroupId: g.id }))),
    skipDuplicates: true,
  });

  const groupById = new Map(groups.map((g) => [g.id, g]));
  const periodGroups = await db.campPeriodGroup.findMany({ where: { campPeriodId: { in: periodIds } } });
  const coachRows = [];
  const playerRows = [];
  for (const pg of periodGroups) {
    const group = groupById.get(pg.campGroupId);
    if (!group) continue;
    for (const c of group.coaches) coachRows.push({ campPeriodGroupId: pg.id, coachId: c.coachId, sparringId: c.sparringId });
    for (const pl of group.players) playerRows.push({ campPeriodGroupId: pg.id, playerId: pl.playerId });
  }
  if (coachRows.length) await db.campPeriodGroupCoach.createMany({ data: coachRows });
  if (playerRows.length) await db.campPeriodGroupPlayer.createMany({ data: playerRows });
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
    const createdDays = await req.db.$transaction(
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
          include: { periods: true },
        })
      )
    );
    await assignAllGroups(req.db, req.params.campId, createdDays.flatMap((d) => d.periods));
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
    include: { campDay: { select: { campId: true } } },
  });
  await assignAllGroups(req.db, period.campDay.campId, [period]);
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
  const newPeriods = [];
  for (const date of dates) {
    let day = dayByTime.get(date.getTime());
    if (!day) {
      day = await req.db.campDay.create({ data: { campId: req.params.campId, date }, include: { periods: true } });
    }
    if (day.periods.some((p) => p.label === label)) {
      skipped += 1;
      continue;
    }
    newPeriods.push(await req.db.campPeriod.create({ data: { campDayId: day.id, label, startTime, endTime } }));
    created += 1;
  }
  await assignAllGroups(req.db, req.params.campId, newPeriods);

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

// ---------- Présences par journée (toutes périodes d'un coup) ----------

const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "EXCUSED", "LATE"];

// Une ligne par joueur inscrit sur au moins une période de la journée, avec sa
// présence pour chaque période où il est inscrit.
router.get("/days/:dayId/attendance", requireRole("ADMIN", "COACH"), async (req, res) => {
  const day = await req.db.campDay.findUnique({
    where: { id: req.params.dayId },
    include: {
      periods: {
        orderBy: { startTime: "asc" },
        include: {
          groups: {
            include: {
              group: true,
              players: { include: { player: true } },
              attendances: true,
            },
          },
        },
      },
    },
  });
  if (!day) return res.status(404).json({ error: "Journée introuvable." });

  const players = new Map();
  for (const period of day.periods) {
    for (const pg of period.groups) {
      const statusByPlayer = new Map(pg.attendances.map((a) => [a.playerId, a.status]));
      for (const { player } of pg.players) {
        if (!players.has(player.id)) {
          players.set(player.id, { playerId: player.id, firstName: player.firstName, lastName: player.lastName, cells: {} });
        }
        players.get(player.id).cells[period.id] = {
          campPeriodGroupId: pg.id,
          groupName: pg.group.name,
          status: statusByPlayer.get(player.id) ?? "ABSENT",
        };
      }
    }
  }

  const encoded = day.periods.some((p) => p.groups.some((pg) => pg.attendances.length > 0));

  res.json({
    encoded,
    day: { id: day.id, date: day.date, campId: day.campId },
    periods: day.periods.map((p) => ({ id: p.id, label: p.label, startTime: p.startTime, endTime: p.endTime })),
    players: [...players.values()].sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)),
  });
});

router.put("/days/:dayId/attendance", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { records } = req.body ?? {};
  if (!Array.isArray(records)) return res.status(400).json({ error: "records doit être un tableau." });
  if (records.some((r) => !r.campPeriodGroupId || !r.playerId || !ATTENDANCE_STATUSES.includes(r.status))) {
    return res.status(400).json({ error: `Chaque ligne exige campPeriodGroupId, playerId et un status parmi : ${ATTENDANCE_STATUSES.join(", ")}.` });
  }

  const periodGroups = await req.db.campPeriodGroup.findMany({
    where: { period: { campDayId: req.params.dayId } },
    select: { id: true },
  });
  const allowed = new Set(periodGroups.map((pg) => pg.id));
  if (records.some((r) => !allowed.has(r.campPeriodGroupId))) {
    return res.status(400).json({ error: "Une des affectations n'appartient pas à cette journée." });
  }

  await req.db.$transaction(
    records.map(({ campPeriodGroupId, playerId, status }) =>
      req.db.campAttendance.upsert({
        where: { campPeriodGroupId_playerId: { campPeriodGroupId, playerId } },
        create: { campPeriodGroupId, playerId, status },
        update: { status },
      })
    )
  );
  res.status(204).end();
});

// Annule l'encodage de toute la journée (ex. erreur de jour).
router.delete("/days/:dayId/attendance", requireRole("ADMIN", "COACH"), async (req, res) => {
  const day = await req.db.campDay.findUnique({ where: { id: req.params.dayId }, select: { id: true } });
  if (!day) return res.status(404).json({ error: "Journée introuvable." });
  await req.db.campAttendance.deleteMany({ where: { campPeriodGroup: { period: { campDayId: day.id } } } });
  res.status(204).end();
});

export default router;
