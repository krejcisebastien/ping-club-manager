import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

const DAY_MS = 24 * 60 * 60 * 1000;
const startOfToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};
const personName = (p) => (p ? `${p.lastName} ${p.firstName}` : null);

// Vue d'ensemble pour un entraineur : séances et stages des 7 prochains
// jours, séances des 14 derniers jours sans aucune présence enregistrée
// (probable oubli), et quelques compteurs.
router.get("/coach", requireRole("ADMIN", "COACH"), async (req, res) => {
  const today = startOfToday();
  const in7Days = new Date(today.getTime() + 7 * DAY_MS);
  const past14Days = new Date(today.getTime() - 14 * DAY_MS);

  const [upcomingOccurrences, pastOccurrences, campDays, playerCount] = await Promise.all([
    req.db.trainingOccurrence.findMany({
      where: { date: { gte: today, lt: in7Days }, status: "PLANNED" },
      include: { training: { include: { group: true } }, coaches: { include: { coach: true, sparring: true } } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    req.db.trainingOccurrence.findMany({
      where: { date: { gte: past14Days, lt: today }, status: "PLANNED" },
      include: { training: { include: { group: true } }, _count: { select: { attendances: true } } },
      orderBy: { date: "desc" },
    }),
    req.db.campDay.findMany({
      where: { date: { gte: today, lt: in7Days } },
      include: {
        camp: true,
        periods: { orderBy: { startTime: "asc" }, include: { groups: { include: { group: true } } } },
      },
      orderBy: { date: "asc" },
    }),
    req.db.player.count(),
  ]);

  const upcomingTrainings = upcomingOccurrences.map((o) => ({
    id: o.id,
    date: o.date,
    startTime: o.startTime,
    endTime: o.endTime,
    trainingName: o.training.name,
    groupName: o.training.group.name,
    location: o.training.location,
    coaches: o.coaches.map((c) => personName(c.coach) ?? personName(c.sparring)).filter(Boolean),
  }));

  const upcomingCampPeriods = campDays.flatMap((day) =>
    day.periods.flatMap((period) =>
      period.groups.map((pg) => ({
        periodGroupId: pg.id,
        date: day.date,
        label: period.label,
        startTime: period.startTime,
        endTime: period.endTime,
        campName: day.camp.name,
        groupName: pg.group.name,
      }))
    )
  );

  const pendingAttendance = pastOccurrences
    .filter((o) => o._count.attendances === 0)
    .map((o) => ({ id: o.id, date: o.date, trainingName: o.training.name, groupName: o.training.group.name }));

  res.json({
    upcomingTrainings,
    upcomingCampPeriods,
    pendingAttendance,
    stats: {
      players: playerCount,
      upcomingTrainings: upcomingTrainings.length,
      upcomingCampPeriods: upcomingCampPeriods.length,
      pendingAttendance: pendingAttendance.length,
    },
  });
});

export default router;
