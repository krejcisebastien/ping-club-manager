// Flux iCal personnel d'un compte : séances d'entrainement et périodes de stage
// qui le concernent, comme entraineur, comme sparring (joueur du club lié à une
// fiche sparring) ou comme joueur (via son groupe, ou son inscription au stage).
// Les dates sont stockées à minuit UTC et les heures en "HH:MM" locales (Belgique).

// Fenêtre publiée : un peu d'historique, et toute la saison à venir.
const PAST_DAYS = 60;
const FUTURE_DAYS = 400;
const TZID = "Europe/Brussels";

const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZID}`,
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

const pad = (n) => String(n).padStart(2, "0");

// Date (minuit UTC) + "18:30" -> "20261028T183000", heure locale du fuseau TZID.
function localDateTime(date, time) {
  const [h, m] = (time || "00:00").split(":");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(h)}${pad(m)}00`;
}

function utcStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// RFC 5545 : lignes de 75 octets maximum, suite préfixée d'un espace.
function fold(line) {
  const out = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    if (bytes + size > (out.length ? 74 : 75)) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

const day = (date) => date.toISOString().slice(0, 10);
const fullName = (p) => `${p.firstName} ${p.lastName}`;

function staffNames(rows) {
  return rows
    .map((r) => (r.coach ? fullName(r.coach) : r.sparring ? `${fullName(r.sparring)} (sparring)` : null))
    .filter(Boolean);
}

// Sélectionne les événements du compte. `user` : { coachId, playerIds }.
export async function calendarEvents(db, user) {
  const now = Date.now();
  const from = new Date(now - PAST_DAYS * 86400000);
  const to = new Date(now + FUTURE_DAYS * 86400000);
  const playerIds = user.playerIds ?? [];

  const [players, sparrings, assignments] = await Promise.all([
    db.player.findMany({ where: { id: { in: playerIds } }, select: { id: true, firstName: true, lastName: true } }),
    db.sparring.findMany({ where: { playerId: { in: playerIds } }, select: { id: true } }),
    db.playerGroupAssignment.findMany({ where: { playerId: { in: playerIds } } }),
  ]);
  const sparringIds = sparrings.map((s) => s.id);
  const playerById = new Map(players.map((p) => [p.id, p]));
  const staffWhere = [
    ...(user.coachId ? [{ coachId: user.coachId }] : []),
    ...(sparringIds.length ? [{ sparringId: { in: sparringIds } }] : []),
  ];
  const isMe = (row) => (user.coachId && row.coachId === user.coachId) || sparringIds.includes(row.sparringId);

  // uid -> événement ; un même créneau vu à plusieurs titres (encadrant et
  // parent d'un joueur, plusieurs enfants) ne donne qu'un seul événement.
  const events = new Map();
  const add = (uid, build) => {
    const existing = events.get(uid);
    if (existing) return existing;
    const event = { uid, ...build(), players: [] };
    events.set(uid, event);
    return event;
  };

  // ---- Séances d'entrainement ----
  const groupIds = [...new Set(assignments.map((a) => a.groupId))];
  const occurrenceOr = [
    ...(staffWhere.length ? [{ coaches: { some: { OR: staffWhere } } }] : []),
    ...(groupIds.length ? [{ training: { groupId: { in: groupIds } } }] : []),
  ];
  const occurrences = occurrenceOr.length
    ? await db.trainingOccurrence.findMany({
        where: { date: { gte: from, lte: to }, OR: occurrenceOr },
        include: { training: { include: { group: true } }, coaches: { include: { coach: true, sparring: true } } },
        orderBy: { date: "asc" },
      })
    : [];

  for (const occ of occurrences) {
    const staff = staffNames(occ.coaches);
    const build = () => ({
      start: localDateTime(occ.date, occ.startTime),
      end: localDateTime(occ.date, occ.endTime),
      summary: occ.training.name,
      location: occ.training.location,
      cancelled: occ.status === "CANCELLED",
      lines: [`Groupe : ${occ.training.group.name}`, ...(staff.length ? [`Encadrement : ${staff.join(", ")}`] : [])],
    });
    if (occ.coaches.some(isMe)) add(`occ-${occ.id}`, build).staff = true;
    // Joueur membre du groupe à la date de la séance (comparaison au jour : une
    // affectation faite l'après-midi compte pour la séance du jour même).
    const occDay = day(occ.date);
    for (const a of assignments) {
      if (a.groupId !== occ.training.groupId) continue;
      if (day(a.startDate) > occDay || (a.endDate && day(a.endDate) < occDay)) continue;
      const event = add(`occ-${occ.id}`, build);
      const player = playerById.get(a.playerId);
      if (player && !event.players.includes(player)) event.players.push(player);
    }
  }

  // ---- Stages : périodes encadrées ----
  if (staffWhere.length) {
    const periodGroups = await db.campPeriodGroup.findMany({
      where: { coaches: { some: { OR: staffWhere } }, period: { campDay: { date: { gte: from, lte: to } } } },
      include: {
        group: true,
        period: { include: { campDay: { include: { camp: true } } } },
        coaches: { include: { coach: true, sparring: true } },
      },
    });
    for (const pg of periodGroups) {
      const { period } = pg;
      const camp = period.campDay.camp;
      const staff = staffNames(pg.coaches);
      add(`camp-${period.id}-${pg.id}`, () => ({
        start: localDateTime(period.campDay.date, period.startTime),
        end: localDateTime(period.campDay.date, period.endTime),
        summary: `${camp.name} – ${pg.group.name} (${period.label})`,
        location: camp.location,
        cancelled: false,
        lines: [`Stage : ${camp.name}`, `Groupe : ${pg.group.name}`, ...(staff.length ? [`Encadrement : ${staff.join(", ")}`] : [])],
      })).staff = true;
    }
  }

  // ---- Stages : inscriptions des joueurs (toutes les périodes du stage) ----
  if (playerIds.length) {
    const registrations = await db.campPlayer.findMany({
      where: { playerId: { in: playerIds }, camp: { endDate: { gte: from }, startDate: { lte: to } } },
      include: { camp: { include: { days: { include: { periods: true } } } } },
    });
    const placements = await db.campPeriodGroupPlayer.findMany({
      where: { playerId: { in: playerIds } },
      include: { campPeriodGroup: { include: { group: true } } },
    });
    for (const reg of registrations) {
      const { camp } = reg;
      for (const day of camp.days) {
        for (const period of day.periods) {
          const event = add(`camp-${period.id}`, () => ({
            start: localDateTime(day.date, period.startTime),
            end: localDateTime(day.date, period.endTime),
            summary: `${camp.name} (${period.label})`,
            location: camp.location,
            cancelled: false,
            lines: [`Stage : ${camp.name}`],
          }));
          const player = playerById.get(reg.playerId);
          if (player && !event.players.includes(player)) event.players.push(player);
          const placement = placements.find((p) => p.playerId === reg.playerId && p.campPeriodGroup.campPeriodId === period.id);
          if (placement) event.lines.push(`Groupe de ${player.firstName} : ${placement.campPeriodGroup.group.name}`);
        }
      }
    }
  }

  return [...events.values()].sort((a, b) => a.start.localeCompare(b.start));
}

export function buildCalendar(events, { name }) {
  const stamp = utcStamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PingDesk//Calendrier//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    `X-WR-TIMEZONE:${TZID}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...VTIMEZONE,
  ];
  for (const e of events) {
    // Plusieurs joueurs du compte (famille) : on précise qui est concerné.
    const who = e.players.length && (e.players.length > 1 || e.staff) ? ` – ${e.players.map((p) => p.firstName).join(", ")}` : "";
    const description = [...(e.players.length ? [`Joueur(s) : ${e.players.map(fullName).join(", ")}`] : []), ...e.lines];
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@pingdesk.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${TZID}:${e.start}`,
      `DTEND;TZID=${TZID}:${e.end}`,
      `SUMMARY:${escapeText(`${e.cancelled ? "ANNULÉ – " : ""}${e.summary}${who}`)}`,
      ...(e.location ? [`LOCATION:${escapeText(e.location)}`] : []),
      `DESCRIPTION:${escapeText(description.join("\n"))}`,
      `STATUS:${e.cancelled ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
