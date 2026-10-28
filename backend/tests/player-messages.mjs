// Test du fil d'échanges joueur–entraineurs : droits de lecture et d'écriture,
// suppression, responsable de cellule et notifications. Les envois FCM sont remplacés par
// un enregistreur. Autonome : crée ses données, puis nettoie.
// Lancer : npm run test:messages
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

const clubA = await createClub("Echanges A", `msg-admin-a-${run}@test.local`);
const clubB = await createClub("Echanges B", `msg-admin-b-${run}@test.local`);

try {
  const A = await login(`msg-admin-a-${run}@test.local`);
  const B = await login(`msg-admin-b-${run}@test.local`);
  const post = async (tok, path, body) => (await call(tok, "POST", path, body)).json;
  const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

  const season = (await post(A, "/seasons", { name: "Saison", startDate: day(-30), endDate: day(300), isActive: true })).season;
  const alice = (await post(A, "/players", { firstName: "Alice", lastName: "Joueuse", birthDate: "2010-01-01" })).player;
  const zoe = (await post(A, "/players", { firstName: "Zoé", lastName: "Autre", birthDate: "2010-01-01" })).player;
  const carla = (await post(A, "/coaches", { firstName: "Carla", lastName: "Coach" })).coach;
  const dan = (await post(A, "/coaches", { firstName: "Dan", lastName: "Coach" })).coach;
  const mia = (await post(A, "/coaches", { firstName: "Mia", lastName: "Responsable" })).coach;
  const g1 = (await post(A, "/groups", { seasonId: season.id, name: "Groupe 1" })).group;
  const g2 = (await post(A, "/groups", { seasonId: season.id, name: "Groupe 2" })).group;
  await post(A, `/groups/${g1.id}/players`, { playerId: alice.id });
  await post(A, `/groups/${g2.id}/players`, { playerId: zoe.id });
  const t1 = (await post(A, "/trainings", { seasonId: season.id, groupId: g1.id, name: "Lundi", weekday: 0, startTime: "18:00", endTime: "19:30" })).training;
  const t2 = (await post(A, "/trainings", { seasonId: season.id, groupId: g2.id, name: "Mardi", weekday: 1, startTime: "18:00", endTime: "19:30" })).training;
  await post(A, `/trainings/${t1.id}/coaches`, { coachId: carla.id });
  await post(A, `/trainings/${t2.id}/coaches`, { coachId: dan.id });

  const account = async (name, data) => {
    await post(A, "/auth/users", { email: `msg-${name}-${run}@test.local`, password: PASSWORD, ...data });
    return login(`msg-${name}-${run}@test.local`);
  };
  const aliceTok = await account("alice", { roles: ["PLAYER"], playerIds: [alice.id] });
  const parentTok = await account("parent", { roles: ["PLAYER"], playerIds: [alice.id] });
  const zoeTok = await account("zoe", { roles: ["PLAYER"], playerIds: [zoe.id] });
  const carlaTok = await account("carla", { roles: ["COACH"], coachId: carla.id });
  const danTok = await account("dan", { roles: ["COACH"], coachId: dan.id });
  const miaTok = await account("mia", { roles: ["COACH"], coachId: mia.id });
  const coachB = (await post(B, "/coaches", { firstName: "Bea", lastName: "Autre" })).coach;
  await call(B, "PUT", `/coaches/${coachB.id}`, { isTrainingManager: true });
  await post(B, "/auth/users", { email: `msg-coachb-${run}@test.local`, password: PASSWORD, roles: ["COACH"], coachId: coachB.id });
  const coachBTok = await login(`msg-coachb-${run}@test.local`);

  const users = await prisma.user.findMany({ where: { email: { contains: run } } });
  const tokenOf = {};
  for (const u of users) {
    const [, name, extra] = u.email.split("-");
    const key = name === "admin" ? `admin-${extra}` : name;
    tokenOf[key] = `tok-${key}-${run}`;
    await prisma.pushToken.create({ data: { userId: u.id, token: tokenOf[key], platform: "web" } });
  }
  const thread = (tok, player = alice) => call(tok, "GET", `/players/${player.id}/messages`);
  const write = (tok, body, player = alice) => sends(() => call(tok, "POST", `/players/${player.id}/messages`, { body }));

  // ---------- Qui lit le fil d'Alice ----------
  expect("joueuse : son fil", (await thread(aliceTok)).status === 200);
  expect("parent : le fil de son enfant", (await thread(parentTok)).status === 200);
  expect("autre joueuse : refusé", (await thread(zoeTok)).status === 403);
  expect("entraineur du groupe : accès", (await thread(carlaTok)).json?.access === "coach");
  expect("entraineur d'un autre groupe : refusé", (await thread(danTok)).status === 403);
  expect("entraineur non responsable : refusé", (await thread(miaTok)).status === 403);
  expect("admin non entraineur : refusé", (await thread(A)).status === 403);

  const designate = await call(A, "PUT", `/coaches/${mia.id}`, { isTrainingManager: true });
  expect("désigner la responsable", designate.status === 200 && designate.json.coach.isTrainingManager === true);
  expect("un entraineur ne peut pas se désigner", (await call(carlaTok, "PUT", `/coaches/${carla.id}`, { isTrainingManager: true })).status === 403);
  expect("responsable : accès à tous les fils", (await thread(miaTok)).json?.access === "manager" && (await thread(miaTok, zoe)).status === 200);
  expect("responsable d'un autre club : pas d'accès", (await thread(coachBTok)).status !== 200);

  // ---------- Messages et notifications ----------
  const q = await write(aliceTok, "  Comment mieux remettre les services courts ?  ");
  expect("question : créée", q.result.status === 201 && q.result.json.message.body === "Comment mieux remettre les services courts ?" && q.result.json.message.author.side === "player", JSON.stringify(q.result.json));
  expect("question : entraineur du groupe + responsable prévenus", JSON.stringify(q.tokens) === JSON.stringify([tokenOf.carla, tokenOf.mia].sort()), JSON.stringify(q.tokens));
  expect("question : titre", q.sent[0]?.message.title === "Message de Alice Joueuse" && q.sent[0].message.body.startsWith("Comment mieux"), JSON.stringify(q.sent[0]?.message));

  const r1 = await write(carlaTok, "Garde la raquette ouverte et avance le pied droit.");
  expect("réponse : joueuse + parent prévenus", JSON.stringify(r1.tokens) === JSON.stringify([tokenOf.alice, tokenOf.parent].sort()), JSON.stringify(r1.tokens));
  expect("réponse : titre", r1.sent[0]?.message.title === "Réponse de Carla Coach" && r1.result.json.message.author.side === "staff");

  const r2 = await write(miaTok, "On le travaille lundi.");
  expect("réponse responsable : famille + entraineur qui a déjà répondu", JSON.stringify(r2.tokens) === JSON.stringify([tokenOf.alice, tokenOf.carla, tokenOf.parent].sort()), JSON.stringify(r2.tokens));

  const p1 = await write(parentTok, "Merci !");
  expect("message du parent : au nom de la joueuse", p1.result.json.message.author.name === "Alice Joueuse" && p1.result.json.message.author.side === "player");
  expect("message du parent : entraineurs prévenus", JSON.stringify(p1.tokens) === JSON.stringify([tokenOf.carla, tokenOf.mia].sort()), JSON.stringify(p1.tokens));

  expect("message vide refusé", (await call(aliceTok, "POST", `/players/${alice.id}/messages`, { body: "   " })).status === 400);
  expect("message trop long refusé", (await call(aliceTok, "POST", `/players/${alice.id}/messages`, { body: "x".repeat(2001) })).status === 400);
  expect("écrire dans le fil d'un autre groupe : refusé", (await call(danTok, "POST", `/players/${alice.id}/messages`, { body: "Salut" })).status === 403);

  const list = (await thread(aliceTok)).json.messages;
  expect("fil : 4 messages dans l'ordre", list.length === 4 && list[0].author.isMe && list[1].author.name === "Carla Coach" && list.at(-1).body === "Merci !", JSON.stringify(list.map((m) => m.author.name)));
  expect("joueuse : ne peut supprimer que les siens", list[0].canDelete && !list[1].canDelete);

  // ---------- Suppression ----------
  const carlaMsg = list[1];
  expect("joueuse : supprimer le message d'un entraineur refusé", (await call(aliceTok, "DELETE", `/players/${alice.id}/messages/${carlaMsg.id}`)).status === 403);
  expect("parent : supprime son message", (await call(parentTok, "DELETE", `/players/${alice.id}/messages/${list[3].id}`)).status === 204);
  expect("responsable : supprime le message d'un autre", (await call(miaTok, "DELETE", `/players/${alice.id}/messages/${carlaMsg.id}`)).status === 204);
  expect("suppression : message d'un autre joueur introuvable", (await call(miaTok, "DELETE", `/players/${zoe.id}/messages/${list[0].id}`)).status === 404);
  expect("fil après suppressions", (await thread(aliceTok)).json.messages.length === 2);

  // ---------- Liste des fils pour les entraineurs ----------
  await write(zoeTok, "Quelle raquette me conseilles-tu ?", zoe);
  const threadsOf = async (tok) => (await call(tok, "GET", "/player-messages")).json;
  const carlaThreads = await threadsOf(carlaTok);
  const danThreads = await threadsOf(danTok);
  const miaThreads = await threadsOf(miaTok);
  expect("fils : l'entraineur ne voit que ses joueurs", carlaThreads.threads.length === 1 && carlaThreads.threads[0].player.id === alice.id && !carlaThreads.isManager, JSON.stringify(carlaThreads));
  expect("fils : dernier message en tête", danThreads.threads.length === 1 && danThreads.threads[0].last.author.side === "player");
  expect("fils : la responsable voit tout, le plus récent d'abord", miaThreads.isManager && miaThreads.threads.map((t) => t.player.id).join() === [zoe.id, alice.id].join(), JSON.stringify(miaThreads.threads.map((t) => t.player.firstName)));
  expect("fils : un joueur n'a pas de liste", (await threadsOf(aliceTok)).threads.length === 0);
  expect("fils : rien d'un autre club", (await threadsOf(coachBTok)).threads.length === 0);

  // ---------- Un seul responsable ----------
  await call(A, "PUT", `/coaches/${dan.id}`, { isTrainingManager: true });
  const coaches = (await call(A, "GET", "/coaches")).json.coaches;
  expect("un seul responsable à la fois", coaches.filter((c) => c.isTrainingManager).map((c) => c.id).join() === dan.id);
  expect("ancienne responsable : plus d'accès", (await thread(miaTok)).status === 403 && (await thread(danTok)).status === 200);
  expect("responsable du club B inchangé", (await prisma.coach.findUnique({ where: { id: coachB.id } })).isTrainingManager === true);

  // ---------- Réglage ----------
  const settings = (await call(aliceTok, "GET", "/notifications/settings")).json;
  expect("réglage proposé au joueur", JSON.stringify(settings).includes("messages"), JSON.stringify(settings));
} finally {
  setPushSender(null);
  await prisma.club.deleteMany({ where: { id: { in: [clubA.id, clubB.id] } } });
  await prisma.$disconnect();
  server.close();
}

console.log(`\n${checks - failures}/${checks} vérifications OK${failures ? `  —  ${failures} ÉCHEC(S)` : ""}`);
process.exit(failures ? 1 : 0);
