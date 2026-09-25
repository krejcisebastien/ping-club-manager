import { hoursBetween } from "../utils/occurrences.js";
import { seriesOf } from "./rankings.js";

// Plafonds des indemnités de volontariat utilisés tant que le club n'a rien paramétré (page Tarifs).
export const DEFAULT_CAPS = { perDay: 44.02, perYear: 3233.91 };

// Plafonds d'une année : ceux de l'année, sinon de la plus récente année antérieure,
// sinon de la plus proche année suivante, sinon les valeurs par défaut.
export async function capsFor(db, year) {
  const cap =
    (await db.volunteerCap.findFirst({ where: { year: { lte: year } }, orderBy: { year: "desc" } })) ??
    (await db.volunteerCap.findFirst({ where: { year: { gt: year } }, orderBy: { year: "asc" } }));
  return cap ? { perDay: Number(cap.perDay), perYear: Number(cap.perYear) } : DEFAULT_CAPS;
}

const round2 = (n) => Math.round(n * 100) / 100;
const dayKey = (date) => date.toISOString().slice(0, 10);
// « Stage Toussaint » reste tel quel, « Toussaint » devient « Stage Toussaint ».
const withPrefix = (prefix, name) => (name.toLowerCase().startsWith(prefix.toLowerCase()) ? name : `${prefix} ${name}`);
const parseDay = (value) => new Date(`${value}T00:00:00.000Z`);

// Personne concernée (entraineur ou sparring), avec la catégorie qui détermine son tarif.
async function loadPerson(db, type, id) {
  if (type === "coach") {
    const coach = await db.coach.findUnique({ where: { id } });
    if (!coach) return null;
    return { type, ...coach, category: "COACH_LEVEL", code: coach.level ?? null };
  }
  const sparring = await db.sparring.findUnique({ where: { id } });
  if (!sparring) return null;
  let ranking = sparring.ranking;
  if (sparring.playerId) {
    const latest = await db.rankingHistory.findFirst({
      where: { playerId: sparring.playerId },
      orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
    });
    ranking = latest?.rankingValue ?? null;
  }
  return { type, ...sparring, ranking, category: "SPARRING_SERIES", code: seriesOf(ranking) };
}

// Heure murale du club ("AAAA-MM-JJ HH:MM") : les dates/horaires des séances sont
// saisis en heure belge, alors que le serveur tourne en UTC.
const CLUB_TIME_ZONE = "Europe/Brussels";
function clubNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: CLUB_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

// "9:5" -> "09:05", pour comparer les horaires comme des chaînes.
const padTime = (time) => time.split(":").map((n) => n.padStart(2, "0")).join(":");

// Prestations une par une : séances d'entrainement et périodes de stage où la
// personne est affectée et qui ont EU LIEU (non annulées et déjà terminées : une
// séance à venir n'est pas défrayée). Une période est comptée une fois même si
// la personne encadre plusieurs groupes. Triées par date puis heure de début.
async function loadSessions(db, person, from, to) {
  const owner = person.type === "coach" ? { coachId: person.id } : { sparringId: person.id };

  const [occurrences, campAssignments] = await Promise.all([
    db.trainingOccurrenceCoach.findMany({
      where: { ...owner, occurrence: { status: "PLANNED", date: { gte: from, lte: to } } },
      include: { occurrence: { include: { training: true } } },
    }),
    db.campPeriodGroupCoach.findMany({
      where: { ...owner, campPeriodGroup: { period: { campDay: { date: { gte: from, lte: to } } } } },
      include: { campPeriodGroup: { include: { group: { include: { camp: true } }, period: { include: { campDay: true } } } } },
    }),
  ]);

  const sessions = [];
  const seenOccurrences = new Set();
  for (const { occurrence } of occurrences) {
    if (seenOccurrences.has(occurrence.id)) continue;
    seenOccurrences.add(occurrence.id);
    sessions.push({
      id: occurrence.id,
      date: dayKey(occurrence.date),
      startTime: occurrence.startTime,
      endTime: occurrence.endTime,
      hours: round2(hoursBetween(occurrence.startTime, occurrence.endTime)),
      nature: withPrefix("Entrainement", occurrence.training.name),
    });
  }

  const seenPeriods = new Set();
  for (const { campPeriodGroup } of campAssignments) {
    const { period, group } = campPeriodGroup;
    if (seenPeriods.has(period.id)) continue;
    seenPeriods.add(period.id);
    sessions.push({
      id: period.id,
      date: dayKey(period.campDay.date),
      startTime: period.startTime,
      endTime: period.endTime,
      hours: round2(hoursBetween(period.startTime, period.endTime)),
      nature: withPrefix("Stage", group.camp.name),
    });
  }

  const now = clubNow();
  return sessions
    .filter((s) => `${s.date} ${padTime(s.endTime)}` <= now)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

// Tarif de la catégorie de la personne : montants à l'heure et à la séance, et base retenue.
async function findRate(db, person) {
  if (!person.code) return null;
  const rate = await db.hourlyRate.findFirst({ where: { category: person.category, code: person.code } });
  if (!rate) return null;
  return {
    basis: rate.basis,
    hourlyRate: rate.hourlyRate == null ? null : Number(rate.hourlyRate),
    sessionRate: rate.sessionRate == null ? null : Number(rate.sessionRate),
  };
}

// Montant d'une séance : heures x tarif horaire, ou forfait à la séance.
function sessionAmount(rate, session) {
  if (!rate) return null;
  if (rate.basis === "SESSION") return rate.sessionRate;
  return rate.hourlyRate == null ? null : round2(session.hours * rate.hourlyRate);
}

// Prépare la note de défraiement d'une personne sur une période (dates "AAAA-MM-JJ").
export async function computeVolunteerSheet(db, { type, id, from, to }) {
  const person = await loadPerson(db, type, id);
  if (!person) return null;

  const rate = await findRate(db, person);
  const fromDate = parseDay(from);
  const toDate = parseDay(to);

  const sessions = await loadSessions(db, person, fromDate, toDate);
  const lines = sessions.map((s) => ({ ...s, amount: sessionAmount(rate, s), dayOverCap: false }));

  // Le plafond journalier porte sur la somme des séances d'un même jour.
  const dayTotals = new Map();
  for (const line of lines) dayTotals.set(line.date, round2((dayTotals.get(line.date) ?? 0) + (line.amount ?? 0)));

  const total = round2(lines.reduce((sum, l) => sum + (l.amount ?? 0), 0));
  const totalHours = round2(lines.reduce((sum, l) => sum + l.hours, 0));

  // Cumul de l'année civile jusqu'à la fin de la période, comparé au plafond annuel.
  const year = toDate.getUTCFullYear();
  const caps = await capsFor(db, year);
  const yearSessions = await loadSessions(db, person, parseDay(`${year}-01-01`), toDate);
  const yearTotal = round2(yearSessions.reduce((sum, s) => sum + (sessionAmount(rate, s) ?? 0), 0));

  const warnings = [];
  if (!person.code) {
    warnings.push(person.type === "coach" ? "Aucun niveau Adeps attribué à cet entraineur : pas de tarif." : "Aucun classement pour ce sparring : pas de série, donc pas de tarif.");
  } else if (!rate || (rate.basis === "SESSION" ? rate.sessionRate : rate.hourlyRate) == null) {
    warnings.push(`Aucun tarif ${rate?.basis === "SESSION" ? "à la séance" : "horaire"} défini pour cette catégorie (page Tarifs).`);
  }
  for (const [date, amount] of dayTotals) {
    if (amount > caps.perDay) {
      warnings.push(`Le ${date.split("-").reverse().join("/")} : ${amount.toFixed(2)} € dépasse le plafond journalier de ${caps.perDay.toFixed(2)} €.`);
      for (const line of lines) if (line.date === date) line.dayOverCap = true;
    }
  }
  if (yearTotal > caps.perYear) {
    warnings.push(`Cumul ${year} : ${yearTotal.toFixed(2)} € dépasse le plafond annuel de ${caps.perYear.toFixed(2)} €.`);
  }

  return {
    person: {
      type: person.type,
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      address: person.address ?? null,
      iban: person.iban ?? null,
      category: person.category,
      code: person.code,
    },
    from,
    to,
    rate,
    lines,
    total,
    totalHours,
    year: { year, total: yearTotal, cap: caps.perYear, dayCap: caps.perDay },
    warnings,
  };
}
