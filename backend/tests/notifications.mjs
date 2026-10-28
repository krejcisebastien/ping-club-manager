// Test des notifications automatiques des séances : annulation / rétablissement,
// déplacement, ajout / retrait d'un encadrant. Les envois FCM sont remplacés par
// un enregistreur. Autonome : crée ses données, puis nettoie.
// Lancer : npm run test:notifications
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/utils/password.js";
import { setPushSender } from "../src/lib/notify.js";

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

// Envois enregistrés : { tokens, message }.
let sent = [];
setPushSender(async (tokens, message) => {
  sent.push({ tokens, message });
  return { invalidTokens: tokens.filter((t) => t.startsWith("invalide")) };
});
const settle = () => new Promise((r) => setTimeout(r, 400));
// Lance une action et renvoie les envois qu'elle a provoqués.
async function sends(action) {
  sent = [];
  const result = await action();
  await settle();
  return { result, sent: [...sent], tokens: sent.flatMap((s) => s.tokens).sort() };
}

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

const clubA = await createClub("Notifs A", `notif-admin-a-${run}@test.local`);
const clubB = await createClub("Notifs B", `notif-admin-b-${run}@test.local`);

try {
  const A = await login(`notif-admin-a-${run}@test.local`);
  const post = async (tok, path, body) => (await call(tok, "POST", path, body)).json;
  const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

  const season = (await post(A, "/seasons", { name: "Saison", startDate: day(-30), endDate: day(300), isActive: true })).season;
  const alice = (await post(A, "/players", { firstName: "Alice", lastName: "Joueuse", birthDate: "2010-01-01" })).player;
  const bob = (await post(A, "/players", { firstName: "Bob", lastName: "Sparring", birthDate: "2005-01-01" })).player;
  const zoe = (await post(A, "/players", { firstName: "Zoé", lastName: "Autre", birthDate: "2010-01-01" })).player;
  const coach = (await post(A, "/coaches", { firstName: "Carla", lastName: "Coach" })).coach;
  const sparring = (await post(A, "/sparrings", { isClubMember: true, playerId: bob.id })).sparring;
  const group = (await post(A, "/groups", { seasonId: season.id, name: "Groupe 1" })).group;
  const other = (await post(A, "/groups", { seasonId: season.id, name: "Groupe 2" })).group;
  await post(A, `/groups/${group.id}/players`, { playerId: alice.id });
  await post(A, `/groups/${other.id}/players`, { playerId: zoe.id });
  const training = (await post(A, "/trainings", { seasonId: season.id, groupId: group.id, name: "Entrainement du lundi", location: "Salle", weekday: 0, startTime: "18:00", endTime: "19:30" })).training;
  await post(A, `/trainings/${training.id}/coaches`, { coachId: coach.id });
  await post(A, `/trainings/${training.id}/generate-occurrences`, { startDate: day(1), endDate: day(28) });
  const occurrences = (await call(A, "GET", `/trainings/${training.id}/occurrences`)).json.occurrences;
  const occ = occurrences[0];

  await post(A, "/auth/users", { email: `notif-coach-${run}@test.local`, password: PASSWORD, roles: ["COACH"], coachId: coach.id });
  await post(A, "/auth/users", { email: `notif-alice-${run}@test.local`, password: PASSWORD, roles: ["PLAYER"], playerIds: [alice.id] });
  await post(A, "/auth/users", { email: `notif-bob-${run}@test.local`, password: PASSWORD, roles: ["PLAYER"], playerIds: [bob.id] });
  await post(A, "/auth/users", { email: `notif-zoe-${run}@test.local`, password: PASSWORD, roles: ["PLAYER"], playerIds: [zoe.id] });
  const coachTok = await login(`notif-coach-${run}@test.local`);

  // Un appareil enregistré par compte (+ l'admin, + un compte du club B).
  const users = await prisma.user.findMany({ where: { email: { contains: run } } });
  const tokenOf = {};
  for (const u of users) {
    const name = u.email.split("-")[1];
    const key = name === "admin" ? `admin-${u.email.split("-")[2]}` : name;
    tokenOf[key] = `tok-${key}-${run}`;
    await prisma.pushToken.create({ data: { userId: u.id, token: tokenOf[key], platform: "web" } });
  }
  expect("données de test construites", occurrences.length >= 2 && sparring?.playerId === bob.id && Object.keys(tokenOf).length === 6, JSON.stringify(Object.keys(tokenOf)));

  // ---------- Annulation par l'admin : joueuse du groupe + entraineur ----------
  const cancel = await sends(() => call(A, "PUT", `/occurrences/${occ.id}`, { status: "CANCELLED" }));
  expect("annulation : réponse OK", cancel.result.status === 200);
  expect("annulation : un seul envoi", cancel.sent.length === 1, `${cancel.sent.length}`);
  expect("annulation : joueuse + entraineur uniquement", JSON.stringify(cancel.tokens) === JSON.stringify([tokenOf.alice, tokenOf.coach].sort()), JSON.stringify(cancel.tokens));
  expect("annulation : titre et texte", cancel.sent[0]?.message.title === "Séance annulée" && /Entrainement du lundi du \S+ \d+ \S+, 18:00–19:30 est annulé\./.test(cancel.sent[0]?.message.body), cancel.sent[0]?.message.body);

  const restore = await sends(() => call(A, "PUT", `/occurrences/${occ.id}`, { status: "PLANNED" }));
  expect("rétablissement : joueuse + entraineur", restore.result.status === 200 && JSON.stringify(restore.tokens) === JSON.stringify([tokenOf.alice, tokenOf.coach].sort()), JSON.stringify(restore.tokens));
  expect("rétablissement : titre", restore.sent[0]?.message.title === "Séance rétablie");

  // ---------- Déplacement par l'entraineur : pas de notification à lui-même ----------
  const move = await sends(() => call(coachTok, "PUT", `/occurrences/${occ.id}`, { startTime: "19:00", endTime: "20:30" }));
  expect("déplacement : joueuse seulement (pas l'auteur)", move.result.status === 200 && JSON.stringify(move.tokens) === JSON.stringify([tokenOf.alice]), `${move.result.status} ${JSON.stringify(move.tokens)}`);
  expect("déplacement : ancien et nouvel horaire", move.sent[0]?.message.title === "Séance déplacée" && move.sent[0].message.body.includes("19:00–20:30") && move.sent[0].message.body.includes("au lieu du") && move.sent[0].message.body.includes("18:00–19:30"), move.sent[0]?.message.body);
  const same = await sends(() => call(A, "PUT", `/occurrences/${occ.id}`, { startTime: "19:00" }));
  expect("rien de changé : aucun envoi", same.result.status === 200 && same.sent.length === 0);

  // ---------- Séance passée : aucun envoi ----------
  await prisma.trainingOccurrence.update({ where: { id: occurrences[1].id }, data: { date: new Date(`${day(-3)}T00:00:00Z`) } });
  const past = await sends(() => call(A, "PUT", `/occurrences/${occurrences[1].id}`, { status: "CANCELLED" }));
  expect("séance passée annulée : aucun envoi", past.result.status === 200 && past.sent.length === 0);

  // ---------- Encadrant ajouté / retiré : seulement lui ----------
  const add = await sends(() => call(A, "POST", `/occurrences/${occ.id}/coaches`, { sparringId: sparring.id }));
  expect("ajout du sparring : réponse sans la séance", add.result.status === 201 && add.result.json.assignment?.sparringId === sparring.id && !add.result.json.assignment.occurrence);
  expect("ajout du sparring : prévient Bob seulement", JSON.stringify(add.tokens) === JSON.stringify([tokenOf.bob]) && add.sent[0]?.message.title === "Tu encadres une séance", JSON.stringify(add.tokens));
  const remove = await sends(() => call(A, "DELETE", `/occurrences/${occ.id}/coaches/${add.result.json.assignment.id}`));
  expect("retrait du sparring : prévient Bob", remove.result.status === 204 && JSON.stringify(remove.tokens) === JSON.stringify([tokenOf.bob]) && remove.sent[0]?.message.title === "Tu n'encadres plus une séance", JSON.stringify(remove.tokens));
  expect("retrait inconnu : 404", (await call(A, "DELETE", `/occurrences/${occ.id}/coaches/inconnu`)).status === 404);
  expect("séance inconnue : 404", (await call(A, "PUT", `/occurrences/inconnue`, { status: "CANCELLED" })).status === 404);

  // ---------- Appareil invalide : supprimé ----------
  const aliceUser = users.find((u) => u.email.startsWith("notif-alice"));
  await prisma.pushToken.create({ data: { userId: aliceUser.id, token: `invalide-${run}`, platform: "web" } });
  await sends(() => call(A, "PUT", `/occurrences/${occ.id}`, { status: "CANCELLED" }));
  expect("jeton invalide supprimé", !(await prisma.pushToken.findUnique({ where: { token: `invalide-${run}` } })));

  // ---------- Isolation : le club B ne peut ni modifier ni être prévenu ----------
  const B = await login(`notif-admin-b-${run}@test.local`);
  const cross = await sends(() => call(B, "PUT", `/occurrences/${occ.id}`, { status: "PLANNED" }));
  expect("club B : séance de A introuvable, aucun envoi", cross.result.status === 404 && cross.sent.length === 0, `${cross.result.status}`);
  expect("club B : jamais destinataire", !sent.some((s) => s.tokens.includes(tokenOf["admin-b"])));
} finally {
  setPushSender(null);
  await prisma.club.deleteMany({ where: { id: { in: [clubA.id, clubB.id] } } });
  await prisma.$disconnect();
  server.close();
}

console.log(`\n${checks - failures}/${checks} vérifications OK${failures ? `  —  ${failures} ÉCHEC(S)` : ""}`);
process.exit(failures ? 1 : 0);
