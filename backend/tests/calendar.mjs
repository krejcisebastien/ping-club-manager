// Test de l'abonnement calendrier (flux iCal personnel) : bons événements pour
// un entraineur, un joueur, un sparring du club ; jeton secret réinitialisable ;
// rien d'un autre club. Autonome : crée ses données, puis nettoie.
// Lancer : npm run test:calendar
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/utils/password.js";
import { invalidateLicense } from "../src/lib/license.js";

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

async function feed(token) {
  const res = await fetch(`${API}/calendar/${token}.ics`);
  return { status: res.status, type: res.headers.get("content-type"), text: await res.text() };
}
const countEvents = (ics) => (ics.match(/BEGIN:VEVENT/g) ?? []).length;

const run = Date.now().toString(36);
const PASSWORD = "MotDePasse123!";

async function createClub(name, email) {
  return prisma.club.create({
    data: {
      name,
      slug: `${name.toLowerCase().replace(/\W+/g, "-")}-${run}`,
      licenseEndsAt: new Date("2099-12-31"),
      users: { create: { email, passwordHash: await hashPassword(PASSWORD), roles: ["ADMIN"] } },
    },
  });
}

async function login(email) {
  const r = await call(null, "POST", "/auth/login", { email, password: PASSWORD });
  if (r.status !== 200) throw new Error(`Connexion impossible pour ${email} : ${r.status}`);
  return r.json.token;
}

const clubA = await createClub("Calendrier A", `cal-admin-a-${run}@test.local`);
const clubB = await createClub("Calendrier B", `cal-admin-b-${run}@test.local`);

try {
  const A = await login(`cal-admin-a-${run}@test.local`);
  const B = await login(`cal-admin-b-${run}@test.local`);
  const post = async (tok, path, body) => (await call(tok, "POST", path, body)).json;

  // Dans la fenêtre publiée (à venir), quelle que soit la date du test.
  const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

  const season = (await post(A, "/seasons", { name: "Saison", startDate: day(-30), endDate: day(300), isActive: true })).season;
  const alice = (await post(A, "/players", { firstName: "Alice", lastName: "Joueuse", birthDate: "2010-01-01" })).player;
  const bob = (await post(A, "/players", { firstName: "Bob", lastName: "Sparring", birthDate: "2005-01-01" })).player;
  const coach = (await post(A, "/coaches", { firstName: "Carla", lastName: "Coach" })).coach;
  const sparring = (await post(A, "/sparrings", { isClubMember: true, playerId: bob.id })).sparring;
  const group = (await post(A, "/groups", { seasonId: season.id, name: "Groupe 1" })).group;
  await post(A, `/groups/${group.id}/players`, { playerId: alice.id });
  const training = (await post(A, "/trainings", { seasonId: season.id, groupId: group.id, name: "Entrainement du lundi", location: "Salle, rue du Ping 1", weekday: 0, startTime: "18:00", endTime: "19:30" })).training;
  await post(A, `/trainings/${training.id}/coaches`, { coachId: coach.id });
  await post(A, `/trainings/${training.id}/generate-occurrences`, { startDate: day(1), endDate: day(28) });
  const occurrences = (await call(A, "GET", `/trainings/${training.id}/occurrences`)).json.occurrences;
  const cancelled = await call(A, "PUT", `/occurrences/${occurrences[0].id}`, { status: "CANCELLED" });

  const camp = (await post(A, "/camps", { seasonId: season.id, name: "Stage de Noël", location: "Grande salle", startDate: day(40), endDate: day(40) })).camp;
  const campGroup = (await post(A, `/camps/${camp.id}/groups`, { name: "Perfectionnement" })).group;
  await post(A, `/camps/groups/${campGroup.id}/coaches`, { sparringId: sparring.id });
  await post(A, `/camps/${camp.id}/days`, { startDate: day(40), endDate: day(40), withDefaultPeriods: true });
  await post(A, `/camps/${camp.id}/players`, { playerId: alice.id });

  await post(A, "/auth/users", { email: `cal-coach-${run}@test.local`, password: PASSWORD, roles: ["COACH"], coachId: coach.id });
  await post(A, "/auth/users", { email: `cal-alice-${run}@test.local`, password: PASSWORD, roles: ["PLAYER"], playerIds: [alice.id] });
  await post(A, "/auth/users", { email: `cal-bob-${run}@test.local`, password: PASSWORD, roles: ["PLAYER"], playerIds: [bob.id] });
  const coachTok = await login(`cal-coach-${run}@test.local`);
  const aliceTok = await login(`cal-alice-${run}@test.local`);
  const bobTok = await login(`cal-bob-${run}@test.local`);
  expect("données de test construites", occurrences.length >= 4 && cancelled.status === 200 && sparring?.playerId === bob.id, `séances : ${occurrences.length}`);

  // ---------- Lien d'abonnement ----------
  expect("lien refusé sans connexion", (await call(null, "GET", "/calendar/link")).status === 401);
  const coachLink = (await call(coachTok, "GET", "/calendar/link")).json.token;
  expect("le lien est stable", coachLink && (await call(coachTok, "GET", "/calendar/link")).json.token === coachLink);

  // ---------- Entraineur : ses séances, dont l'annulée ----------
  const coachFeed = await feed(coachLink);
  expect("flux servi en text/calendar", coachFeed.status === 200 && coachFeed.type.startsWith("text/calendar"), coachFeed.type);
  expect("entraineur : une séance par occurrence", countEvents(coachFeed.text) === occurrences.length, `${countEvents(coachFeed.text)} / ${occurrences.length}`);
  expect("séance annulée marquée", coachFeed.text.includes("STATUS:CANCELLED") && coachFeed.text.includes("SUMMARY:ANNULÉ – Entrainement du lundi"));
  expect("heure locale de Bruxelles", /DTSTART;TZID=Europe\/Brussels:\d{8}T180000/.test(coachFeed.text) && coachFeed.text.includes("BEGIN:VTIMEZONE"));
  expect("lieu échappé (virgule)", coachFeed.text.includes("LOCATION:Salle\\, rue du Ping 1"));
  expect("lignes de 75 octets maximum", coachFeed.text.split("\r\n").every((l) => Buffer.byteLength(l) <= 75));

  // ---------- Joueuse : séances de son groupe + périodes du stage ----------
  const aliceFeed = await feed((await call(aliceTok, "GET", "/calendar/link")).json.token);
  expect("joueuse : séances du groupe + 2 périodes de stage", countEvents(aliceFeed.text) === occurrences.length + 2, `${countEvents(aliceFeed.text)}`);
  expect("joueuse : stage présent", aliceFeed.text.includes("SUMMARY:Stage de Noël (Matinée)") && aliceFeed.text.includes("LOCATION:Grande salle"));

  // ---------- Sparring du club : périodes de stage encadrées uniquement ----------
  const bobFeed = await feed((await call(bobTok, "GET", "/calendar/link")).json.token);
  expect("sparring : 2 périodes encadrées, aucune séance", countEvents(bobFeed.text) === 2 && bobFeed.text.includes("Perfectionnement"), `${countEvents(bobFeed.text)}`);

  // ---------- Joueuse sortie du groupe : plus les séances suivantes ----------
  await prisma.playerGroupAssignment.updateMany({ where: { playerId: alice.id }, data: { endDate: new Date(Date.now() - 86400000) } });
  expect("sortie du groupe : séances retirées", countEvents((await feed((await call(aliceTok, "GET", "/calendar/link")).json.token)).text) === 2);

  // ---------- Réinitialisation du jeton ----------
  const reset = (await call(coachTok, "POST", "/calendar/link/reset")).json.token;
  expect("nouveau jeton différent", reset && reset !== coachLink);
  expect("ancien lien désactivé", (await feed(coachLink)).status === 404);
  expect("nouveau lien actif", (await feed(reset)).status === 200);
  expect("jeton inconnu : 404", (await feed("inconnu")).status === 404);

  // ---------- Isolation : un compte du club B ne voit rien de A ----------
  const bFeed = await feed((await call(B, "GET", "/calendar/link")).json.token);
  expect("club B : calendrier vide", bFeed.status === 200 && countEvents(bFeed.text) === 0);

  // ---------- Licence échue : calendrier vide plutôt qu'en erreur ----------
  await prisma.club.update({ where: { id: clubA.id }, data: { licenseEndsAt: new Date("2000-01-01") } });
  invalidateLicense(clubA.id);
  const expired = await feed(reset);
  expect("licence échue : flux vide", expired.status === 200 && countEvents(expired.text) === 0);
} finally {
  await prisma.club.deleteMany({ where: { id: { in: [clubA.id, clubB.id] } } });
  await prisma.$disconnect();
  server.close();
}

console.log(`\n${checks - failures}/${checks} vérifications OK${failures ? `  —  ${failures} ÉCHEC(S)` : ""}`);
process.exit(failures ? 1 : 0);
