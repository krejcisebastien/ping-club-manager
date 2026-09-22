// Test de l'administration de la plateforme : accès réservé au propriétaire,
// gestion des clubs et de leur licence, adresses réservées.
// Autonome : crée des clubs temporaires puis les supprime. Lancer : npm run test:platform
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/utils/password.js";

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
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // réponse sans corps
  }
  return { status: res.status, json };
}

const DAY = 24 * 60 * 60 * 1000;
const run = Date.now().toString(36);
const PASSWORD = "MotDePasse123!";
const ownerEmail = `Proprietaire-${run}@test.local`; // casse mixte volontaire
const created = [];

async function createClub(label, email, licenseEndsAt) {
  const club = await prisma.club.create({
    data: {
      name: `Club ${label} ${run}`,
      slug: `club-${label}-${run}`,
      licenseEndsAt,
      users: { create: { email, passwordHash: await hashPassword(PASSWORD), roles: ["ADMIN"] } },
    },
  });
  created.push(club.id);
  return club;
}
const login = async (email) => (await call(null, "POST", "/auth/login", { email, password: PASSWORD })).json;

try {
  // Le propriétaire a son propre club, même sans licence : la plateforme doit rester accessible.
  const ownerClub = await createClub("owner", ownerEmail, null);
  const other = await createClub("other", `admin-other-${run}@test.local`, new Date("2099-12-31"));

  // ---------- Sans configuration : personne n'a accès ----------
  delete process.env.PLATFORM_ADMIN_EMAILS;
  const O0 = await login(ownerEmail);
  expect("sans PLATFORM_ADMIN_EMAILS, personne n'est admin de la plateforme", O0.user.isPlatformAdmin === false);
  expect("... et l'API est fermée (403)", (await call(O0.token, "GET", "/platform/clubs")).status === 403);

  process.env.PLATFORM_ADMIN_EMAILS = `${ownerEmail.toLowerCase()}, autre@exemple.be`;
  const O = await login(ownerEmail);
  const A = await login(`admin-other-${run}@test.local`);

  // ---------- Contrôle d'accès ----------
  expect("la session du propriétaire l'indique (casse ignorée)", O.user.isPlatformAdmin === true);
  expect("un admin de club ordinaire n'est pas admin de la plateforme", A.user.isPlatformAdmin === false);
  expect("/auth/me reflète le statut", (await call(O.token, "GET", "/auth/me")).json.user.isPlatformAdmin === true && (await call(A.token, "GET", "/auth/me")).json.user.isPlatformAdmin === false);
  expect("sans session : 401", (await call(null, "GET", "/platform/clubs")).status === 401);
  for (const [method, path, body] of [
    ["GET", "/platform/clubs"],
    ["POST", "/platform/clubs", { name: "x", adminEmail: "x@x.x", adminPassword: PASSWORD }],
    ["PUT", `/platform/clubs/${other.id}`, { name: "PIRATE" }],
  ]) {
    expect(`un admin de club ne peut pas ${method} ${path}`, (await call(A.token, method, path, body)).status === 403);
  }
  expect("le club n'a pas été modifié par la tentative", (await prisma.club.findUnique({ where: { id: other.id } })).name === `Club other ${run}`);

  // ---------- Liste : uniquement des métadonnées ----------
  const list = await call(O.token, "GET", "/platform/clubs");
  expect("le propriétaire accède à la plateforme malgré sa propre licence absente", list.status === 200);
  const mine = list.json.clubs.find((c) => c.id === ownerClub.id);
  const theirs = list.json.clubs.find((c) => c.id === other.id);
  expect("la liste contient tous les clubs", !!mine && !!theirs && list.json.clubs.some((c) => c.slug === "default"));
  expect("statut de licence et effectifs exposés", mine.license === "PENDING" && theirs.license === "ACTIVE" && theirs.users === 1 && theirs.players === 0);
  const allowedKeys = new Set(["id", "name", "slug", "createdAt", "licenseEndsAt", "license", "daysLeft", "stripe", "users", "players"]);
  expect("aucune donnée personnelle exposée (que des métadonnées)", list.json.clubs.every((c) => Object.keys(c).every((k) => allowedKeys.has(k))));
  expect("aucun email dans la réponse", !JSON.stringify(list.json).includes("@test.local"));

  // ---------- Gestion des licences ----------
  const put = (id, body) => call(O.token, "PUT", `/platform/clubs/${id}`, body);
  const dbClub = (id) => prisma.club.findUnique({ where: { id } });

  let r = await put(ownerClub.id, { addYears: 1 });
  let days = (new Date(r.json.club.licenseEndsAt).getTime() - Date.now()) / DAY;
  expect("addYears sur un club sans licence : 1 an à partir d'aujourd'hui", r.status === 200 && days > 364 && days < 366 && r.json.club.license === "ACTIVE", `jours : ${days}`);

  await put(ownerClub.id, { licenseEndsAt: "2030-01-15" });
  r = await put(ownerClub.id, { addYears: 1 });
  expect("addYears prolonge depuis la fin actuelle", (await dbClub(ownerClub.id)).licenseEndsAt.toISOString().startsWith("2031-01-15"));

  r = await put(ownerClub.id, { licenseEndsAt: "2026-01-01" });
  expect("une date passée met la licence en EXPIRED", r.status === 200 && r.json.club.license === "EXPIRED");
  expect("... et bloque réellement le club (402)", (await call((await login(ownerEmail)).token, "GET", "/players")).status === 402);
  expect("... mais pas la plateforme du propriétaire", (await call(O.token, "GET", "/platform/clubs")).status === 200);

  r = await put(ownerClub.id, { licenseEndsAt: "2099-12-31" });
  expect("réactiver rouvre l'accès aussitôt (cache invalidé)", (await call(O.token, "GET", "/players")).status === 200);
  r = await put(ownerClub.id, { licenseEndsAt: null });
  expect("null retire la licence", r.status === 200 && r.json.club.license === "PENDING" && (await dbClub(ownerClub.id)).licenseEndsAt === null);
  r = await put(other.id, { name: `  Club renommé ${run}  ` });
  expect("renommer un club (espaces retirés)", r.status === 200 && (await dbClub(other.id)).name === `Club renommé ${run}`);

  expect("nom vide refusé", (await put(other.id, { name: "  " })).status === 400);
  expect("date invalide refusée", (await put(other.id, { licenseEndsAt: "31/12/2030" })).status === 400);
  expect("date impossible refusée", (await put(other.id, { licenseEndsAt: "2030-13-45" })).status === 400);
  expect("licenseEndsAt et addYears ensemble refusés", (await put(other.id, { licenseEndsAt: "2030-01-01", addYears: 1 })).status === 400);
  expect("addYears invalide refusé", (await put(other.id, { addYears: 0 })).status === 400 && (await put(other.id, { addYears: 1.5 })).status === 400 && (await put(other.id, { addYears: 99 })).status === 400);
  expect("club inconnu : 404", (await put("inexistant", { addYears: 1 })).status === 404);

  // ---------- Création d'un club ----------
  const newEmail = `nouveau-${run}@test.local`;
  r = await call(O.token, "POST", "/platform/clubs", { name: `Club créé ${run}`, adminEmail: newEmail, adminPassword: PASSWORD, licenseEndsAt: "2027-06-30" });
  if (r.json?.club) created.push(r.json.club.id);
  expect("création d'un club avec licence", r.status === 201 && r.json.club.license === "ACTIVE" && r.json.club.users === 1, JSON.stringify(r.json));
  const N = await login(newEmail);
  expect("l'administrateur du nouveau club peut se connecter et travailler", !!N?.token && (await call(N.token, "GET", "/players")).status === 200);
  r = await call(O.token, "POST", "/platform/clubs", { name: `Sans licence ${run}`, adminEmail: `sl-${run}@test.local`, adminPassword: PASSWORD });
  if (r.json?.club) created.push(r.json.club.id);
  expect("création sans date : club en attente de licence", r.status === 201 && r.json.club.license === "PENDING");
  expect("email déjà utilisé refusé (409)", (await call(O.token, "POST", "/platform/clubs", { name: "x", adminEmail: newEmail, adminPassword: PASSWORD })).status === 409);
  expect("mot de passe trop court refusé", (await call(O.token, "POST", "/platform/clubs", { name: "x", adminEmail: "z@z.z", adminPassword: "court" })).status === 400);
  expect("champs manquants refusés", (await call(O.token, "POST", "/platform/clubs", { name: "x" })).status === 400);
  expect("date de licence invalide refusée", (await call(O.token, "POST", "/platform/clubs", { name: "x", adminEmail: "z@z.z", adminPassword: PASSWORD, licenseEndsAt: "bientôt" })).status === 400);

  // ---------- Adresses réservées ----------
  process.env.ALLOW_CLUB_SIGNUP = "true";
  const reserved = await call(null, "POST", "/clubs/signup", { clubName: `Squat ${run}`, email: "autre@exemple.be", password: PASSWORD });
  expect("inscription publique avec une adresse réservée refusée", reserved.status === 409, `status ${reserved.status}`);
  expect("... casse ignorée", (await call(null, "POST", "/clubs/signup", { clubName: `Squat2 ${run}`, email: "AUTRE@Exemple.be", password: PASSWORD })).status === 409);
  expect("aucun club créé par ces tentatives", (await prisma.club.count({ where: { name: { startsWith: "Squat" } } })) === 0);
  const viaAdmin = await call(A.token, "POST", "/auth/users", { email: "autre@exemple.be", password: PASSWORD, roles: ["ADMIN"] });
  expect("un admin de club ne peut pas créer un compte avec une adresse réservée", viaAdmin.status === 409, `status ${viaAdmin.status}`);
  expect("... aucun compte créé", (await prisma.user.count({ where: { email: "autre@exemple.be" } })) === 0);
  const normal = await call(A.token, "POST", "/auth/users", { email: `normal-${run}@test.local`, password: PASSWORD, roles: ["ADMIN"] });
  expect("une adresse ordinaire reste utilisable", normal.status === 201, `status ${normal.status}`);
  delete process.env.ALLOW_CLUB_SIGNUP;

  // ---------- Révocation immédiate ----------
  process.env.PLATFORM_ADMIN_EMAILS = "quelquun.d.autre@exemple.be";
  expect("retirer l'adresse de la liste révoque l'accès aussitôt", (await call(O.token, "GET", "/platform/clubs")).status === 403);
} finally {
  delete process.env.PLATFORM_ADMIN_EMAILS;
  await prisma.club.deleteMany({ where: { id: { in: created } } });
  expect("nettoyage : clubs de test supprimés", (await prisma.club.count({ where: { id: { in: created } } })) === 0);
  await prisma.$disconnect();
  server.close();
}

console.log(`\n${checks - failures}/${checks} vérifications OK${failures ? `  —  ${failures} ÉCHEC(S)` : ""}`);
process.exit(failures ? 1 : 0);
