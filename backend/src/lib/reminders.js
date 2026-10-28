// Rappels planifiés (tâche quotidienne, voir scripts/reminders.js) : séance du
// lendemain aux encadrants, présences non encodées de la veille, stage dans
// deux jours, licence du club bientôt échue. Chaque rappel n'est envoyé qu'une
// fois par jour, même si la tâche est relancée.
import { prisma } from "./prisma.js";
import { tenantClient } from "./tenant.js";
import { licenseState } from "./license.js";
import { notifyUsers, staffUserIds, formatDay } from "./notify.js";

const DAY_MS = 86400000;
const ONCE = { onceWithinHours: 20 };
const LICENSE_REMINDER_DAYS = [30, 7];

// Jour courant en Belgique, à minuit UTC (format de stockage des dates).
function brusselsToday(now) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(now);
  return new Date(`${ymd}T00:00:00Z`);
}
const addDays = (date, n) => new Date(date.getTime() + n * DAY_MS);
const at = (location) => (location ? ` – ${location}` : "");
const staffOf = (rows) => ({
  coachIds: rows.map((r) => r.coachId).filter(Boolean),
  sparringIds: rows.map((r) => r.sparringId).filter(Boolean),
});

export async function runReminders({ now = new Date() } = {}) {
  const today = brusselsToday(now);
  const clubs = await prisma.club.findMany({ select: { id: true, name: true, licenseEndsAt: true } });
  const counts = { sessions: 0, attendance: 0, camps: 0, license: 0 };

  for (const club of clubs) {
    const license = licenseState(club, now.getTime());
    if (!license.active) continue;
    const db = tenantClient(club.id);

    // Séances de demain : rappel aux encadrants.
    const tomorrow = await db.trainingOccurrence.findMany({
      where: { date: addDays(today, 1), status: "PLANNED" },
      include: { training: true, coaches: true },
    });
    for (const occ of tomorrow) {
      const userIds = await staffUserIds(db, staffOf(occ.coaches));
      if (!userIds.length) continue;
      await notifyUsers(
        db,
        userIds,
        { title: "Séance demain", body: `${occ.training.name}, ${formatDay(occ.date)}, ${occ.startTime}–${occ.endTime}${at(occ.training.location)}.` },
        ONCE,
      );
      counts.sessions++;
    }

    // Séances d'hier sans aucune présence encodée : rappel aux entraineurs.
    const yesterday = await db.trainingOccurrence.findMany({
      where: { date: addDays(today, -1), status: "PLANNED", attendances: { none: {} } },
      include: { training: true, coaches: true },
    });
    for (const occ of yesterday) {
      const userIds = await staffUserIds(db, { coachIds: staffOf(occ.coaches).coachIds });
      if (!userIds.length) continue;
      await notifyUsers(
        db,
        userIds,
        { title: "Présences à encoder", body: `${occ.training.name} du ${formatDay(occ.date)} : les présences ne sont pas encore encodées.` },
        ONCE,
      );
      counts.attendance++;
    }

    // Stages qui commencent dans deux jours : inscrits (et parents) et encadrants.
    const camps = await db.camp.findMany({
      where: { startDate: addDays(today, 2) },
      include: {
        players: true,
        groups: { include: { coaches: true, periods: { include: { coaches: true } } } },
      },
    });
    for (const camp of camps) {
      const staffRows = camp.groups.flatMap((g) => [...g.coaches, ...g.periods.flatMap((p) => p.coaches)]);
      const playerIds = camp.players.map((p) => p.playerId);
      const [staff, players] = await Promise.all([
        staffUserIds(db, staffOf(staffRows)),
        playerIds.length ? db.user.findMany({ where: { players: { some: { playerId: { in: playerIds } } } }, select: { id: true } }) : [],
      ]);
      const userIds = [...staff, ...players.map((u) => u.id)];
      if (!userIds.length) continue;
      await notifyUsers(db, userIds, { title: "Stage dans 2 jours", body: `${camp.name} commence ${formatDay(camp.startDate)}${at(camp.location)}.` }, ONCE);
      counts.camps++;
    }

    // Licence bientôt échue : administrateurs du club.
    if (license.status === "ACTIVE") {
      const endDay = brusselsToday(club.licenseEndsAt);
      const daysLeft = Math.round((endDay - today) / DAY_MS);
      if (LICENSE_REMINDER_DAYS.includes(daysLeft)) {
        const admins = await db.user.findMany({ where: { roles: { has: "ADMIN" } }, select: { id: true } });
        await notifyUsers(
          db,
          admins.map((u) => u.id),
          {
            title: "Licence bientôt échue",
            body: `La licence de ${club.name} se termine dans ${daysLeft} jours (${formatDay(endDay)}). Renouvelle-la depuis la page Licence.`,
          },
          ONCE,
        );
        counts.license++;
      }
    }
  }
  return counts;
}
