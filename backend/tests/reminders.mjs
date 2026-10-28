// Test des rappels quotidiens (src/lib/reminders.js) : séance de demain aux
// encadrants, présences non encodées d'hier, stage dans 2 jours, licence
// bientôt échue ; une seule fois par jour ; rien pour un club sans licence.
// Autonome : crée ses données, puis nettoie. Lancer : npm run test:reminders
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/utils/password.js";
import { setPushSender } from "../src/lib/notify.js";
import { runReminders } from "../src/lib/reminders.js";

const prisma = new PrismaClient();
const server = createApp().listen(0);
const API = `http://localhost:${server.address().port}/api`;

let checks = 0;
let failures = 0;
const expect = (label, cond, extra = "") => {
  checks++;
  if (!cond) {
    failures++;
    console.log(`  ECHEC  ${label} ${extra}`);
  }
};

let pushed = 0;
setPushSender(async (tokens) => {
  pushed += tokens.length;
  return { invalidTokens: [] };
});

async function call(token, method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // réponse sans corps
  }
  return { status: res.status, json };
}

const run = Date.now().toString(36);
const PASSWORD = "MotDePasse123!";
const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());
const today = new Date(`${ymd}T00:00:00Z`);
const day = (n) => new Date(today.getTime() + n * 86400000);
const iso = (n) => day(n).toISOString().slice(0, 10);

async function createClub(name, email, licenseEndsAt) {
  return prisma.club.create({
    data: {
      name,
      slug: `${name.toLowerCase().replace(/\W+/g, "-")}-${run}`,
      licenseEndsAt,
      users: { create: { email, passwordHash: await hashPassword(PASSWORD), roles: ["ADMIN"] } },
    },
  });
}

async function login(email) {
  const r = await call(null, "POST", "/auth/login", { email, password: PASSWORD });
  if (r.status !== 200) throw new Error(`Connexion impossible pour ${email} : ${r.status}`);
  return r.json.token;
}

// Licence qui se termine dans 30 jours (fin de journée).
const clubA = await createClub("Rappels A", `rem-admin-a-${run}@test.local`, new Date(day(30).getTime() + 20 * 3600000));
// Club sans licence valide : aucun rappel.
const clubB = await createClub("Rappels B", `rem-admin-b-${run}@test.local`, new Date("2000-01-01"));

const inbox = async (email) =>
  prisma.notification.findMany({ where: { user: { email } }, orderBy: { createdAt: "asc" } });

try {
  const A = await login(`rem-admin-a-${run}@test.local`);
  const post = async (tok, path, body) => (await call(tok, "POST", path, body)).json;

  const season = (await post(A, "/seasons", { name: "Saison", startDate: iso(-30), endDate: iso(300), isActive: true })).season;
  const alice = (await post(A, "/players", { firstName: "Alice", lastName: "Joueuse", birthDate: "2010-01-01" })).player;
  const bob = (await post(A, "/players", { firstName: "Bob", lastName: "Sparring", birthDate: "2005-01-01" })).player;
  const coach = (await post(A, "/coaches", { firstName: "Carla", lastName: "Coach" })).coach;
  const sparring = (await post(A, "/sparrings", { isClubMember: true, playerId: bob.id })).sparring;
  const group = (await post(A, "/groups", { seasonId: season.id, name: "Groupe 1" })).group;
  await post(A, `/groups/${group.id}/players`, { playerId: alice.id });
  const training = (await post(A, "/trainings", { seasonId: season.id, groupId: group.id, name: "Entrainement U12", location: "Salle A", weekday: 0, startTime: "18:00", endTime: "19:30" })).training;

  const occ = (date, extra = {}) =>
    prisma.trainingOccurrence.create({
      data: { trainingId: training.id, date, startTime: "18:00", endTime: "19:30", ...extra, coaches: { create: [{ coachId: coach.id }, { sparringId: sparring.id }] } },
    });
  await occ(day(1));
  await occ(day(1), { status: "CANCELLED", startTime: "10:00" });
  await occ(day(-1));
  const encoded = await occ(day(-1), { startTime: "09:00", endTime: "10:00" });
  await prisma.attendance.create({ data: { occurrenceId: encoded.id, playerId: alice.id, status: "PRESENT" } });

  const camp = (await post(A, "/camps", { seasonId: season.id, name: "Stage de Toussaint", location: "Grande salle", startDate: iso(2), endDate: iso(4) })).camp;
  const campGroup = (await post(A, `/camps/${camp.id}/groups`, { name: "Perfectionnement" })).group;
  await post(A, `/camps/groups/${campGroup.id}/coaches`, { coachId: coach.id });
  await post(A, `/camps/${camp.id}/players`, { playerId: alice.id });

  await post(A, "/auth/users", { email: `rem-coach-${run}@test.local`, password: PASSWORD, roles: ["COACH"], coachId: coach.id });
  await post(A, "/auth/users", { email: `rem-alice-${run}@test.local`, password: PASSWORD, roles: ["PLAYER"], playerIds: [alice.id] });
  await post(A, "/auth/users", { email: `rem-bob-${run}@test.local`, password: PASSWORD, roles: ["PLAYER"], playerIds: [bob.id] });
  const coachUser = await prisma.user.findUnique({ where: { email: `rem-coach-${run}@test.local` } });
  await prisma.pushToken.create({ data: { userId: coachUser.id, token: `rem-tok-${run}`, platform: "web" } });

  // Club B : séance demain avec un entraineur ayant un compte.
  const B = await login(`rem-admin-b-${run}@test.local`);
  void B;
  const seasonB = await prisma.season.create({ data: { clubId: clubB.id, name: "Saison B", startDate: day(-30), endDate: day(300), isActive: true } });
  const coachB = await prisma.coach.create({ data: { clubId: clubB.id, firstName: "Bernard", lastName: "B" } });
  const groupB = await prisma.trainingGroup.create({ data: { seasonId: seasonB.id, name: "Groupe B" } });
  const trainingB = await prisma.training.create({ data: { seasonId: seasonB.id, groupId: groupB.id, name: "Entrainement B", weekday: 0, startTime: "18:00", endTime: "19:00" } });
  await prisma.trainingOccurrence.create({ data: { trainingId: trainingB.id, date: day(1), startTime: "18:00", endTime: "19:00", coaches: { create: [{ coachId: coachB.id }] } } });
  await prisma.user.create({ data: { clubId: clubB.id, email: `rem-coach-b-${run}@test.local`, passwordHash: "x", roles: ["COACH"], coachId: coachB.id } });

  await runReminders();

  const coachN = await inbox(`rem-coach-${run}@test.local`);
  const titles = (list) => list.map((n) => n.title).sort();
  expect("entraineur : séance demain, présences, stage", JSON.stringify(titles(coachN)) === JSON.stringify(["Présences à encoder", "Séance demain", "Stage dans 2 jours"].sort()), JSON.stringify(titles(coachN)));
  const tomorrowMsg = coachN.find((n) => n.title === "Séance demain");
  expect("séance demain : nom, heure et lieu", tomorrowMsg?.body.startsWith("Entrainement U12, ") && tomorrowMsg.body.endsWith("18:00–19:30 – Salle A."), tomorrowMsg?.body);
  expect("présences : seulement la séance non encodée", coachN.filter((n) => n.title === "Présences à encoder").length === 1);
  expect("stage : nom, date et lieu", coachN.find((n) => n.title === "Stage dans 2 jours")?.body.startsWith("Stage de Toussaint commence ") && coachN.find((n) => n.title === "Stage dans 2 jours").body.endsWith(" – Grande salle."));
  expect("push envoyé à l'appareil de l'entraineur", pushed === 3, `${pushed}`);

  const bobN = await inbox(`rem-bob-${run}@test.local`);
  expect("sparring : séance demain seulement (pas les présences)", JSON.stringify(titles(bobN)) === JSON.stringify(["Séance demain"]), JSON.stringify(titles(bobN)));
  const aliceN = await inbox(`rem-alice-${run}@test.local`);
  expect("joueuse inscrite : stage seulement", JSON.stringify(titles(aliceN)) === JSON.stringify(["Stage dans 2 jours"]), JSON.stringify(titles(aliceN)));
  const adminN = await inbox(`rem-admin-a-${run}@test.local`);
  expect("admin : licence dans 30 jours", adminN.length === 1 && adminN[0].title === "Licence bientôt échue" && adminN[0].body.includes("dans 30 jours"), JSON.stringify(adminN.map((n) => n.body)));

  expect("club sans licence : aucun rappel", (await inbox(`rem-coach-b-${run}@test.local`)).length === 0 && (await inbox(`rem-admin-b-${run}@test.local`)).length === 0);

  await runReminders();
  expect("relancé le même jour : pas de doublon", (await inbox(`rem-coach-${run}@test.local`)).length === 3 && (await inbox(`rem-admin-a-${run}@test.local`)).length === 1 && pushed === 3, `${pushed}`);

  // Licence à 29 jours : pas de rappel ce jour-là.
  await prisma.notification.deleteMany({ where: { user: { clubId: clubA.id } } });
  await prisma.club.update({ where: { id: clubA.id }, data: { licenseEndsAt: new Date(day(29).getTime() + 20 * 3600000) } });
  await runReminders();
  expect("licence à 29 jours : pas de rappel", (await inbox(`rem-admin-a-${run}@test.local`)).length === 0);
} finally {
  setPushSender(null);
  await prisma.club.deleteMany({ where: { id: { in: [clubA.id, clubB.id] } } });
  await prisma.$disconnect();
  server.close();
}

console.log(`\n${checks - failures}/${checks} vérifications OK${failures ? `  —  ${failures} ÉCHEC(S)` : ""}`);
process.exit(failures ? 1 : 0);
