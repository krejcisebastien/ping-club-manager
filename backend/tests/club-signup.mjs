// Test de la création de club en libre-service. Autonome : démarre l'API en
// mémoire, crée des clubs temporaires puis les supprime. Lancer : npm run test:signup
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../src/app.js";
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

const run = Date.now().toString(36);
const name = `Club Inscription ${run}`;
const emails = [`signup-1-${run}@test.local`, `signup-2-${run}@test.local`];
const created = [];

try {
  // ---------- Désactivée par défaut ----------
  delete process.env.ALLOW_CLUB_SIGNUP;
  expect("l'inscription est désactivée par défaut", (await call(null, "GET", "/clubs/signup")).json.enabled === false);
  const off = await call(null, "POST", "/clubs/signup", { clubName: name, email: emails[0], password: "MotDePasse123!" });
  expect("inscription refusée (404) tant qu'elle est désactivée", off.status === 404, `status ${off.status}`);
  expect("aucun club créé quand elle est désactivée", (await prisma.club.count({ where: { name } })) === 0);

  process.env.ALLOW_CLUB_SIGNUP = "true";
  expect("l'inscription peut être activée", (await call(null, "GET", "/clubs/signup")).json.enabled === true);

  // ---------- Création ----------
  const ok = await call(null, "POST", "/clubs/signup", { clubName: `  ${name}  `, email: emails[0], password: "MotDePasse123!" });
  expect("inscription réussie (201)", ok.status === 201, `status ${ok.status} ${JSON.stringify(ok.json)}`);
  expect("la session contient le nom du club (espaces retirés)", ok.json?.user?.clubName === name);
  expect("le créateur est administrateur", JSON.stringify(ok.json?.user?.roles) === '["ADMIN"]');
  const club = await prisma.club.findUnique({ where: { id: ok.json.user.clubId } });
  created.push(club.id);
  expect("le slug est dérivé du nom", club.slug === `club-inscription-${run}`, club.slug);

  const me = await call(ok.json.token, "GET", "/auth/me");
  expect("la session renvoyée est utilisable", me.status === 200 && me.json.user.clubId === club.id);
  const blocked = await call(ok.json.token, "GET", "/players");
  expect("le nouveau club n'a pas de licence : accès aux données refusé (402)", blocked.status === 402 && blocked.json.code === "LICENSE_REQUIRED", `status ${blocked.status}`);
  expect("club sans licence : licenseEndsAt vide", club.licenseEndsAt === null);
  const activate = async (id) => {
    await prisma.club.update({ where: { id }, data: { licenseEndsAt: new Date("2099-12-31") } });
    invalidateLicense(id);
  };
  await activate(club.id);
  const empty = await call(ok.json.token, "GET", "/players");
  expect("une fois la licence activée, le club démarre vide", empty.status === 200 && empty.json.players.length === 0);
  const login = await call(null, "POST", "/auth/login", { email: emails[0], password: "MotDePasse123!" });
  expect("le créateur peut se reconnecter", login.status === 200 && login.json.user.clubId === club.id);

  // ---------- Même nom de club : slug distinct ----------
  const same = await call(null, "POST", "/clubs/signup", { clubName: name, email: emails[1], password: "MotDePasse123!" });
  expect("deux clubs peuvent avoir le même nom", same.status === 201, `status ${same.status}`);
  const club2 = await prisma.club.findUnique({ where: { id: same.json.user.clubId } });
  created.push(club2.id);
  await activate(club2.id);
  expect("le second club reçoit un slug distinct", club2.slug === `${club.slug}-2`, club2.slug);
  const isolated = await call(same.json.token, "GET", "/auth/users");
  expect("les deux clubs sont isolés", isolated.json.users.length === 1 && isolated.json.users[0].email === emails[1]);

  // ---------- L'admin donne un nouveau mot de passe ----------
  const member = `signup-membre-${run}@test.local`;
  const A1 = ok.json.token;
  const shortCreate = await call(A1, "POST", "/auth/users", { email: member, password: "court", roles: ["ADMIN"] });
  expect("création d'un compte avec un mot de passe trop court refusée (400)", shortCreate.status === 400, `status ${shortCreate.status}`);
  const memberRes = await call(A1, "POST", "/auth/users", { email: member, password: "AncienMotDePasse1", roles: ["ADMIN"] });
  expect("l'admin crée un compte", memberRes.status === 201, `status ${memberRes.status}`);
  const memberId = memberRes.json.user.id;
  const shortReset = await call(A1, "PUT", `/auth/users/${memberId}`, { password: "court" });
  expect("nouveau mot de passe trop court refusé (400)", shortReset.status === 400, `status ${shortReset.status}`);
  const foreign = await call(same.json.token, "PUT", `/auth/users/${memberId}`, { password: "PirateMotDePasse1" });
  expect("l'admin d'un autre club ne peut pas changer le mot de passe (404)", foreign.status === 404, `status ${foreign.status}`);
  const reset = await call(A1, "PUT", `/auth/users/${memberId}`, { password: "NouveauMotDePasse1" });
  expect("l'admin donne un nouveau mot de passe", reset.status === 200, `status ${reset.status}`);
  const loginNew = await call(null, "POST", "/auth/login", { email: member, password: "NouveauMotDePasse1" });
  expect("connexion avec le nouveau mot de passe", loginNew.status === 200);
  const loginOld = await call(null, "POST", "/auth/login", { email: member, password: "AncienMotDePasse1" });
  expect("l'ancien mot de passe ne marche plus", loginOld.status === 401, `status ${loginOld.status}`);
  const loginPirate = await call(null, "POST", "/auth/login", { email: member, password: "PirateMotDePasse1" });
  expect("le mot de passe de l'autre club n'a pas été appliqué", loginPirate.status === 401, `status ${loginPirate.status}`);
  const rolesOnly = await call(A1, "PUT", `/auth/users/${memberId}`, { roles: ["ADMIN"], password: "" });
  expect("mot de passe vide : modification acceptée", rolesOnly.status === 200, `status ${rolesOnly.status}`);
  const stillNew = await call(null, "POST", "/auth/login", { email: member, password: "NouveauMotDePasse1" });
  expect("mot de passe vide : mot de passe inchangé", stillNew.status === 200);

  // ---------- Validation ----------
  const dup = await call(null, "POST", "/clubs/signup", { clubName: "Autre", email: emails[0], password: "MotDePasse123!" });
  expect("email déjà utilisé refusé (409)", dup.status === 409, `status ${dup.status}`);
  const weak = await call(null, "POST", "/clubs/signup", { clubName: "Autre", email: "x@test.local", password: "court" });
  expect("mot de passe trop court refusé (400)", weak.status === 400, `status ${weak.status}`);
  const missing = await call(null, "POST", "/clubs/signup", { email: "x@test.local", password: "MotDePasse123!" });
  expect("nom de club manquant refusé (400)", missing.status === 400, `status ${missing.status}`);
  expect("aucun club créé par les tentatives invalides", (await prisma.club.count({ where: { slug: { startsWith: "autre" } } })) === 0);

  // ---------- Limite de débit : 5 tentatives par heure et par IP ----------
  const limited = await call(null, "POST", "/clubs/signup", { clubName: "Autre", email: "y@test.local", password: "MotDePasse123!" });
  expect("la 6e tentative est bloquée (429)", limited.status === 429, `status ${limited.status}`);
} finally {
  await prisma.club.deleteMany({ where: { id: { in: created } } });
  expect("nettoyage : clubs de test supprimés", (await prisma.club.count({ where: { id: { in: created } } })) === 0);
  await prisma.$disconnect();
  server.close();
}

console.log(`\n${checks - failures}/${checks} vérifications OK${failures ? `  —  ${failures} ÉCHEC(S)` : ""}`);
process.exit(failures ? 1 : 0);
