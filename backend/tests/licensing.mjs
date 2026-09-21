// Test des licences : accès selon l'état de la licence, page de paiement,
// webhook Stripe (avec de vraies signatures) et commande d'activation manuelle.
// Autonome : crée des clubs temporaires puis les supprime. Lancer : npm run test:licensing
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/utils/password.js";
import { invalidateLicense, licenseState, GRACE_DAYS } from "../src/lib/license.js";

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

async function call(token, method, path, body, headers = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...headers, ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
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
const WEBHOOK_SECRET = "whsec_test_secret";
const created = [];

// Les tests ne doivent jamais appeler le vrai Stripe, même si .env contient des clés.
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_PRICE_ID;
delete process.env.STRIPE_WEBHOOK_SECRET;

async function createClub(label, licenseEndsAt, roles = ["ADMIN"]) {
  const email = `${label}-${run}@test.local`;
  const club = await prisma.club.create({
    data: {
      name: `Club ${label} ${run}`,
      slug: `club-${label}-${run}`,
      licenseEndsAt,
      users: { create: { email, passwordHash: await hashPassword(PASSWORD), roles } },
    },
  });
  created.push(club.id);
  return { club, email };
}
const login = async (email) => (await call(null, "POST", "/auth/login", { email, password: PASSWORD })).json;
const setLicense = async (clubId, licenseEndsAt) => {
  await prisma.club.update({ where: { id: clubId }, data: { licenseEndsAt } });
  invalidateLicense(clubId);
};
const dataRoutes = ["/players", "/seasons", "/coaches", "/exercises", "/auth/users"];
const allBlocked = async (token) => {
  for (const path of dataRoutes) {
    const r = await call(token, "GET", path);
    if (r.status !== 402 || r.json?.code !== "LICENSE_REQUIRED") return `${path} -> ${r.status}`;
  }
  return true;
};
const allOpen = async (token) => {
  for (const path of dataRoutes) {
    const r = await call(token, "GET", path);
    if (r.status !== 200) return `${path} -> ${r.status}`;
  }
  return true;
};

function stripeEvent(type, object) {
  const payload = JSON.stringify({ id: `evt_${Math.random().toString(36).slice(2)}`, object: "event", type, data: { object } });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  return { payload, signature };
}
const webhook = (type, object, opts = {}) => {
  const { payload, signature } = stripeEvent(type, object);
  return call(null, "POST", "/billing/webhook", payload, { "Stripe-Signature": opts.badSignature ? "t=1,v1=deadbeef" : signature });
};

try {
  // ---------- États de licence (fonction pure) ----------
  const now = Date.now();
  const at = (days) => ({ licenseEndsAt: new Date(now + days * DAY) });
  expect("sans date : PENDING, accès refusé", licenseState({ licenseEndsAt: null }).status === "PENDING" && !licenseState({ licenseEndsAt: null }).active);
  expect("date future : ACTIVE", licenseState(at(30), now).status === "ACTIVE" && licenseState(at(30), now).active);
  expect(`échue depuis moins de ${GRACE_DAYS} jours : GRACE (accès maintenu)`, licenseState(at(-(GRACE_DAYS - 1)), now).status === "GRACE" && licenseState(at(-(GRACE_DAYS - 1)), now).active);
  expect(`échue depuis plus de ${GRACE_DAYS} jours : EXPIRED (accès refusé)`, licenseState(at(-(GRACE_DAYS + 1)), now).status === "EXPIRED" && !licenseState(at(-(GRACE_DAYS + 1)), now).active);

  // ---------- Club sans licence : tout est bloqué sauf de quoi en obtenir une ----------
  const pending = await createClub("pending", null);
  const P = await login(pending.email);
  expect("un club sans licence peut se connecter", !!P?.token);
  expect("toutes les routes de données sont refusées (402)", (await allBlocked(P.token)) === true, String(await allBlocked(P.token)));
  expect("une écriture est aussi refusée", (await call(P.token, "POST", "/players", { firstName: "A", lastName: "B", birthDate: "2010-01-01" })).status === 402);
  expect("/auth/me reste accessible", (await call(P.token, "GET", "/auth/me")).status === 200);
  const status = await call(P.token, "GET", "/billing/status");
  expect("/billing/status renvoie PENDING", status.status === 200 && status.json.status === "PENDING" && status.json.active === false);
  expect("paiement en ligne non configuré : signalé", status.json.onlinePaymentEnabled === false);
  expect("checkout sans Stripe configuré : 503", (await call(P.token, "POST", "/billing/checkout")).status === 503);
  expect("portail sans abonnement : 400", (await call(P.token, "POST", "/billing/portal")).status === 400);

  // ---------- Activation manuelle : les routes s'ouvrent ----------
  await setLicense(pending.club.id, new Date(now + 30 * DAY));
  expect("licence active : toutes les routes s'ouvrent", (await allOpen(P.token)) === true, String(await allOpen(P.token)));
  const active = (await call(P.token, "GET", "/billing/status")).json;
  expect("statut ACTIVE avec jours restants", active.status === "ACTIVE" && active.daysLeft >= 29 && active.daysLeft <= 31, JSON.stringify(active));

  // ---------- Grâce puis expiration ----------
  await setLicense(pending.club.id, new Date(now - 3 * DAY));
  expect("échue de 3 jours : accès maintenu (grâce)", (await allOpen(P.token)) === true);
  expect("statut GRACE", (await call(P.token, "GET", "/billing/status")).json.status === "GRACE");
  await setLicense(pending.club.id, new Date(now - (GRACE_DAYS + 3) * DAY));
  expect("échue depuis trop longtemps : bloqué", (await allBlocked(P.token)) === true);
  expect("statut EXPIRED", (await call(P.token, "GET", "/billing/status")).json.status === "EXPIRED");

  // ---------- Seul un administrateur peut payer ----------
  const player = await createClub("nonadmin", new Date(now + 30 * DAY), ["PLAYER"]);
  const N = await login(player.email);
  expect("un non-admin ne peut pas lancer un paiement", (await call(N.token, "POST", "/billing/checkout")).status === 403);
  expect("un non-admin ne peut pas ouvrir le portail", (await call(N.token, "POST", "/billing/portal")).status === 403);
  expect("un non-admin peut voir le statut", (await call(N.token, "GET", "/billing/status")).status === 200);

  // ---------- Webhook Stripe ----------
  const wh = await createClub("stripe", null);
  const W = await login(wh.email);
  const paidSession = { client_reference_id: wh.club.id, customer: `cus_${run}`, subscription: `sub_${run}`, payment_status: "paid" };

  expect("webhook sans secret configuré : 503", (await webhook("checkout.session.completed", paidSession)).status === 503);
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  expect("signature invalide refusée (400)", (await webhook("checkout.session.completed", paidSession, { badSignature: true })).status === 400);
  expect("requête sans signature refusée (400)", (await call(null, "POST", "/billing/webhook", "{}")).status === 400);
  expect("une signature invalide n'active rien", (await allBlocked(W.token)) === true);

  await webhook("checkout.session.completed", { ...paidSession, payment_status: "unpaid" });
  expect("une session non payée n'active rien", (await allBlocked(W.token)) === true);

  const ok = await webhook("checkout.session.completed", paidSession);
  expect("checkout.session.completed payé : 200", ok.status === 200);
  let club = await prisma.club.findUnique({ where: { id: wh.club.id } });
  expect("le club est lié au client et à l'abonnement Stripe", club.stripeCustomerId === `cus_${run}` && club.stripeSubscriptionId === `sub_${run}`);
  const days = (club.licenseEndsAt.getTime() - Date.now()) / DAY;
  expect("licence activée pour environ 1 an", days > 364 && days < 366, `jours : ${days}`);
  expect("les routes s'ouvrent aussitôt après le paiement", (await allOpen(W.token)) === true, String(await allOpen(W.token)));
  expect("le portail est disponible (abonnement connu)", (await call(W.token, "GET", "/billing/status")).json.hasSubscription === true);

  // Renouvellement : la fin de période facturée prolonge la licence.
  const renewedEnd = Math.floor((Date.now() + 2 * 365 * DAY) / 1000);
  await webhook("invoice.paid", { customer: `cus_${run}`, lines: { data: [{ period: { start: 1, end: renewedEnd } }] } });
  club = await prisma.club.findUnique({ where: { id: wh.club.id } });
  expect("invoice.paid prolonge la licence à la fin de période", Math.abs(club.licenseEndsAt.getTime() - renewedEnd * 1000) < 1000);
  const before = club.licenseEndsAt.getTime();
  await webhook("invoice.paid", { customer: `cus_${run}`, lines: { data: [{ period: { start: 1, end: Math.floor(Date.now() / 1000) + 60 } }] } });
  club = await prisma.club.findUnique({ where: { id: wh.club.id } });
  expect("un événement plus ancien ne raccourcit jamais la licence", club.licenseEndsAt.getTime() === before);
  expect("invoice.paid d'un client inconnu : ignoré (200)", (await webhook("invoice.paid", { customer: "cus_inconnu", lines: { data: [{ period: { end: 9999999999 } }] } })).status === 200);
  expect("un événement non géré est accepté (200)", (await webhook("customer.created", {})).status === 200);

  // ---------- Commande d'activation manuelle (club payé sur facture) ----------
  const cli = (...args) => spawnSync("node", ["scripts/clubs.js", ...args], { encoding: "utf8" });
  const slug = `club-cli-${run}`;
  const made = cli("create", "--name", `Club CLI ${run}`, "--slug", slug, "--admin-email", `cli-${run}@test.local`, "--admin-password", PASSWORD, "--until", "2027-06-30");
  const cliClub = await prisma.club.findUnique({ where: { slug } });
  if (cliClub) created.push(cliClub.id);
  expect("create --until fixe la fin de licence", made.status === 0 && cliClub?.licenseEndsAt?.toISOString().startsWith("2027-06-30"), made.stderr);
  const noLicense = cli("create", "--name", `Club CLI2 ${run}`, "--slug", `${slug}-2`, "--admin-email", `cli2-${run}@test.local`, "--admin-password", PASSWORD);
  const cliClub2 = await prisma.club.findUnique({ where: { slug: `${slug}-2` } });
  if (cliClub2) created.push(cliClub2.id);
  expect("create sans option : aucune licence", noLicense.status === 0 && cliClub2?.licenseEndsAt === null);
  expect("license --until change la date", cli("license", "--slug", slug, "--until", "2030-01-15").status === 0 && (await prisma.club.findUnique({ where: { slug } })).licenseEndsAt.toISOString().startsWith("2030-01-15"));
  expect("license --years prolonge d'un an depuis la fin actuelle", cli("license", "--slug", slug, "--years", "1").status === 0 && (await prisma.club.findUnique({ where: { slug } })).licenseEndsAt.toISOString().startsWith("2031-01-15"));
  cli("license", "--slug", `${slug}-2`, "--years", "1");
  const fromNow = ((await prisma.club.findUnique({ where: { slug: `${slug}-2` } })).licenseEndsAt.getTime() - Date.now()) / DAY;
  expect("license --years sur un club sans licence : 1 an à partir d'aujourd'hui", fromNow > 364 && fromNow < 366, `jours : ${fromNow}`);
  expect("date invalide refusée", cli("license", "--slug", slug, "--until", "pas-une-date").status !== 0);
  expect("--until et --years ensemble refusés", cli("license", "--slug", slug, "--until", "2030-01-01", "--years", "1").status !== 0);
  expect("club inconnu refusé", cli("license", "--slug", "inexistant", "--years", "1").status !== 0);

  // ---------- Le club existant n'est pas verrouillé ----------
  const legacy = await prisma.club.findUnique({ where: { slug: "default" } });
  expect("le club par défaut reste actif (licence longue durée)", !legacy || licenseState(legacy).active, JSON.stringify(legacy?.licenseEndsAt));
} finally {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  await prisma.club.deleteMany({ where: { id: { in: created } } });
  expect("nettoyage : clubs de test supprimés", (await prisma.club.count({ where: { id: { in: created } } })) === 0);
  await prisma.$disconnect();
  server.close();
}

console.log(`\n${checks - failures}/${checks} vérifications OK${failures ? `  —  ${failures} ÉCHEC(S)` : ""}`);
process.exit(failures ? 1 : 0);
