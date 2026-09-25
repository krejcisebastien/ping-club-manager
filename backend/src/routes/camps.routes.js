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
      players: { include: { player: true }, orderBy: { player: { lastName: "asc" } } },
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

// ---------- Joueurs inscrits au stage ----------

// La liste d'inscrits sert de base aux présences ; chaque période, les
// entraineurs répartissent ces joueurs dans les groupes (voir /days/:dayId/assignment).
router.post("/:campId/players", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { playerId, playerIds } = req.body ?? {};
  const ids = Array.isArray(playerIds) ? playerIds : playerId ? [playerId] : [];
  if (!ids.length) return res.status(400).json({ error: "playerId ou playerIds est requis." });

  const camp = await req.db.camp.findUnique({ where: { id: req.params.campId }, select: { id: true } });
  if (!camp) return res.status(404).json({ error: "Stage introuvable." });

  await req.db.campPlayer.createMany({ data: ids.map((id) => ({ campId: camp.id, playerId: id })), skipDuplicates: true });
  const players = await req.db.campPlayer.findMany({
    where: { campId: camp.id },
    include: { player: true },
    orderBy: { player: { lastName: "asc" } },
  });
  res.status(201).json({ players });
});

// Désinscrit un joueur : ses affectations aux groupes et ses présences du stage sont supprimées.
router.delete("/:campId/players/:playerId", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { campId, playerId } = req.params;
  const registration = await req.db.campPlayer.findFirst({ where: { campId, playerId }, select: { id: true } });
  if (!registration) return res.status(404).json({ error: "Inscription introuvable." });

  await req.db.campPeriodGroupPlayer.deleteMany({ where: { playerId, campPeriodGroup: { period: { campDay: { campId } } } } });
  await req.db.campAttendance.deleteMany({ where: { playerId, campPeriod: { campDay: { campId } } } });
  await req.db.campPlayer.delete({ where: { id: registration.id } });
  res.status(204).end();
});

// ---------- Jours du stage ----------

// Copie les encadrants par défaut du groupe sur la période-groupe donnée.
async function copyGroupDefaults(db, campGroupId, campPeriodGroupId) {
  const defaultCoaches = await db.campGroupCoach.findMany({ where: { campGroupId } });
  if (!defaultCoaches.length) return;
  await db.campPeriodGroupCoach.createMany({
    data: defaultCoaches.map((d) => ({ campPeriodGroupId, coachId: d.coachId, sparringId: d.sparringId })),
  });
}

// Affecte d'office tous les groupes du stage aux périodes données (avec leurs
// encadrants par défaut). Appelé à la création de journées/périodes :
// on retire ensuite à la main les groupes absents d'une période.
async function assignAllGroups(db, campId, periods) {
  if (!periods.length) return;
  const groups = await db.campGroup.findMany({ where: { campId }, include: { coaches: true } });
  if (!groups.length) return;

  const periodIds = periods.map((p) => p.id);
  await db.campPeriodGroup.createMany({
    data: periodIds.flatMap((campPeriodId) => groups.map((g) => ({ campPeriodId, campGroupId: g.id }))),
    skipDuplicates: true,
  });

  const groupById = new Map(groups.map((g) => [g.id, g]));
  const periodGroups = await db.campPeriodGroup.findMany({ where: { campPeriodId: { in: periodIds } } });
  const coachRows = [];
  for (const pg of periodGroups) {
    const group = groupById.get(pg.campGroupId);
    if (!group) continue;
    for (const c of group.coaches) coachRows.push({ campPeriodGroupId: pg.id, coachId: c.coachId, sparringId: c.sparringId });
  }
  if (coachRows.length) await db.campPeriodGroupCoach.createMany({ data: coachRows });
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

// ---------- Répartition des inscrits dans les groupes, par période ----------

async function loadDay(db, dayId) {
  return db.campDay.findUnique({
    where: { id: dayId },
    include: {
      camp: { include: { groups: { orderBy: { name: "asc" } } } },
      periods: {
        orderBy: { startTime: "asc" },
        include: { groups: { include: { players: true } }, attendances: true },
      },
    },
  });
}

const sortPlayers = (list) => list.sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));

// Une ligne par joueur inscrit au stage ; pour chaque période, le groupe qui
// l'accueille (ou null s'il n'est pas encore réparti).
router.get("/days/:dayId/assignment", requireRole("ADMIN", "COACH"), async (req, res) => {
  const day = await loadDay(req.db, req.params.dayId);
  if (!day) return res.status(404).json({ error: "Journée introuvable." });
  const registered = await req.db.campPlayer.findMany({ where: { campId: day.campId }, include: { player: true } });

  const players = registered.map(({ player }) => ({
    playerId: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    cells: Object.fromEntries(
      day.periods.map((period) => {
        const pg = period.groups.find((g) => g.players.some((p) => p.playerId === player.id));
        return [period.id, pg?.campGroupId ?? null];
      })
    ),
  }));

  res.json({
    day: { id: day.id, date: day.date, campId: day.campId },
    periods: day.periods.map((p) => ({ id: p.id, label: p.label, startTime: p.startTime, endTime: p.endTime })),
    groups: day.camp.groups.map((g) => ({ id: g.id, name: g.name })),
    players: sortPlayers(players),
  });
});

async function findOrCreatePeriodGroup(db, campPeriodId, campGroupId) {
  const existing = await db.campPeriodGroup.findFirst({ where: { campPeriodId, campGroupId } });
  if (existing) return existing;
  const created = await db.campPeriodGroup.create({ data: { campPeriodId, campGroupId } });
  await copyGroupDefaults(db, campGroupId, created.id);
  return created;
}

// Répartit des joueurs dans les groupes : { assignments: [{ periodId, playerId, campGroupId|null }] }.
// Un joueur n'est que dans un seul groupe par période.
router.put("/days/:dayId/assignment", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { assignments } = req.body ?? {};
  if (!Array.isArray(assignments)) return res.status(400).json({ error: "assignments doit être un tableau." });

  const day = await loadDay(req.db, req.params.dayId);
  if (!day) return res.status(404).json({ error: "Journée introuvable." });
  const periodIds = new Set(day.periods.map((p) => p.id));
  const groupIds = new Set(day.camp.groups.map((g) => g.id));
  const registered = new Set((await req.db.campPlayer.findMany({ where: { campId: day.campId } })).map((r) => r.playerId));

  for (const a of assignments) {
    if (!periodIds.has(a.periodId)) return res.status(400).json({ error: "Une période n'appartient pas à cette journée." });
    if (!registered.has(a.playerId)) return res.status(400).json({ error: "Un joueur n'est pas inscrit à ce stage." });
    if (a.campGroupId && !groupIds.has(a.campGroupId)) return res.status(400).json({ error: "Un groupe n'appartient pas à ce stage." });
  }

  for (const { periodId, playerId, campGroupId } of assignments) {
    await req.db.campPeriodGroupPlayer.deleteMany({ where: { playerId, campPeriodGroup: { campPeriodId: periodId } } });
    if (campGroupId) {
      const pg = await findOrCreatePeriodGroup(req.db, periodId, campGroupId);
      await req.db.campPeriodGroupPlayer.create({ data: { campPeriodGroupId: pg.id, playerId } });
    }
  }
  res.status(204).end();
});

// ---------- Présences par journée (base : la liste des inscrits, pas les groupes) ----------

const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "EXCUSED", "LATE"];

router.get("/days/:dayId/attendance", requireRole("ADMIN", "COACH"), async (req, res) => {
  const day = await loadDay(req.db, req.params.dayId);
  if (!day) return res.status(404).json({ error: "Journée introuvable." });
  const registered = await req.db.campPlayer.findMany({ where: { campId: day.campId }, include: { player: true } });
  const groupName = new Map(day.camp.groups.map((g) => [g.id, g.name]));

  const players = registered.map(({ player }) => ({
    playerId: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    cells: Object.fromEntries(
      day.periods.map((period) => {
        const pg = period.groups.find((g) => g.players.some((p) => p.playerId === player.id));
        const record = period.attendances.find((a) => a.playerId === player.id);
        return [period.id, { status: record?.status ?? null, groupName: pg ? groupName.get(pg.campGroupId) ?? null : null }];
      })
    ),
  }));

  res.json({
    encoded: day.periods.some((p) => p.attendances.length > 0),
    day: { id: day.id, date: day.date, campId: day.campId },
    periods: day.periods.map((p) => ({ id: p.id, label: p.label, startTime: p.startTime, endTime: p.endTime })),
    players: sortPlayers(players),
  });
});

// Enregistre : { records: [{ campPeriodId, playerId, status }] }
router.put("/days/:dayId/attendance", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { records } = req.body ?? {};
  if (!Array.isArray(records)) return res.status(400).json({ error: "records doit être un tableau." });
  if (records.some((r) => !r.campPeriodId || !r.playerId || !ATTENDANCE_STATUSES.includes(r.status))) {
    return res.status(400).json({ error: `Chaque ligne exige campPeriodId, playerId et un status parmi : ${ATTENDANCE_STATUSES.join(", ")}.` });
  }

  const day = await loadDay(req.db, req.params.dayId);
  if (!day) return res.status(404).json({ error: "Journée introuvable." });
  const periodIds = new Set(day.periods.map((p) => p.id));
  const registered = new Set((await req.db.campPlayer.findMany({ where: { campId: day.campId } })).map((r) => r.playerId));
  if (records.some((r) => !periodIds.has(r.campPeriodId))) {
    return res.status(400).json({ error: "Une période n'appartient pas à cette journée." });
  }
  if (records.some((r) => !registered.has(r.playerId))) {
    return res.status(400).json({ error: "Un joueur n'est pas inscrit à ce stage." });
  }

  await req.db.$transaction(
    records.map(({ campPeriodId, playerId, status }) =>
      req.db.campAttendance.upsert({
        where: { campPeriodId_playerId: { campPeriodId, playerId } },
        create: { campPeriodId, playerId, status },
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
  await req.db.campAttendance.deleteMany({ where: { campPeriod: { campDayId: day.id } } });
  res.status(204).end();
});

export default router;
