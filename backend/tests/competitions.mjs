// Test de la vue club des tournois : regroupement par tournoi, joueur et
// série, bilans (forfaits à part), choix de la saison, droits et isolation
// entre clubs. Autonome : crée ses données, puis nettoie.
// Lancer : npm run test:competitions
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/utils/password.js";
import { splitEventName } from "../src/routes/competitions.routes.js";

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

const clubA = await createClub("Tournois A", `cmp-admin-a-${run}@test.local`);
const clubB = await createClub("Tournois B", `cmp-admin-b-${run}@test.local`);

try {
  // ---------- Nom d'événement ----------
  expect("tournoi et série séparés", JSON.stringify(splitEventName("Open de Namur — Série E")) === '{"tournament":"Open de Namur","serie":"Série E"}');
  expect("tiret dans le nom du tournoi conservé", splitEventName("Open — Namur — Série E").tournament === "Open — Namur");
  expect("sans série", JSON.stringify(splitEventName("Critérium")) === '{"tournament":"Critérium","serie":null}');
  expect("sans nom", splitEventName(null).tournament === "Tournoi");

  const A = await login(`cmp-admin-a-${run}@test.local`);
  const B = await login(`cmp-admin-b-${run}@test.local`);
  const post = async (tok, path, body) => (await call(tok, "POST", path, body)).json;

  const empty = await call(A, "GET", "/competitions/tournaments");
  expect("aucun tournoi : liste vide", empty.status === 200 && empty.json.tournaments.length === 0 && empty.json.season === null);

  const alice = (await post(A, "/players", { firstName: "Alice", lastName: "Zeta", birthDate: "2010-01-01" })).player;
  const bob = (await post(A, "/players", { firstName: "Bob", lastName: "Alpha", birthDate: "2010-01-01" })).player;
  const other = (await post(B, "/players", { firstName: "Olga", lastName: "Autre", birthDate: "2010-01-01" })).player;

  const match = (playerId, season, date, eventName, extra = {}) => ({
    playerId, season, date: new Date(date), competition: "TOURNAMENT", eventName,
    opponentFirstName: "JEAN", opponentLastName: "DUPONT", opponentRanking: "D4", won: true, setsFor: 3, setsAgainst: 1, ...extra,
  });
  await prisma.competitionResult.createMany({
    data: [
      match(alice.id, 26, "2025-11-08T10:00:00Z", "Open de Namur — Série E"),
      match(alice.id, 26, "2025-11-08T11:00:00Z", "Open de Namur — Série E", { won: false, setsFor: 1, setsAgainst: 3 }),
      match(alice.id, 26, "2025-11-09T10:00:00Z", "Open de Namur — Série D"),
      match(bob.id, 26, "2025-11-08T10:30:00Z", "Open de Namur — Série E", { walkover: true }),
      match(bob.id, 26, "2026-02-01T10:00:00Z", "Critérium"),
      match(alice.id, 26, "2025-12-06T10:00:00Z", "HAI_VET01/022", { competition: "CHAMPIONSHIP" }),
      match(alice.id, 25, "2024-11-08T10:00:00Z", "Open de Namur — Série F"),
      match(other.id, 26, "2025-11-08T10:00:00Z", "Open de Namur — Série E"),
    ],
  });
  await prisma.competitionSeason.createMany({
    data: [
      { playerId: alice.id, season: 26, seasonName: "2025-2026" },
      { playerId: alice.id, season: 25, seasonName: "2024-2025" },
    ],
  });

  const r = (await call(A, "GET", "/competitions/tournaments")).json;
  expect("saisons proposées, la plus récente d'abord", JSON.stringify(r.seasons) === '[{"season":26,"name":"2025-2026"},{"season":25,"name":"2024-2025"}]', JSON.stringify(r.seasons));
  expect("saison la plus récente par défaut", r.season === 26);
  expect("deux tournois, le plus récent d'abord, sans le championnat", r.tournaments.map((t) => t.name).join("|") === "Critérium|Open de Namur", r.tournaments.map((t) => t.name).join("|"));
  const namur = r.tournaments.find((t) => t.name === "Open de Namur");
  expect("dates du tournoi sur deux jours", namur.from.startsWith("2025-11-08") && namur.to.startsWith("2025-11-09"), `${namur.from} ${namur.to}`);
  expect("bilan du tournoi, forfait à part", namur.played === 3 && namur.wins === 2 && namur.losses === 1 && namur.walkovers === 1, JSON.stringify(namur));
  expect("joueurs du club seulement, triés par nom", namur.players.map((p) => p.player.firstName).join(",") === "Bob,Alice");
  const aliceNamur = namur.players.find((p) => p.player.id === alice.id);
  expect("séries de la joueuse", aliceNamur.series.map((s) => s.name).join(",") === "Série E,Série D");
  expect("bilan par série", aliceNamur.series[0].wins === 1 && aliceNamur.series[0].losses === 1 && aliceNamur.series[0].matches.length === 2);
  expect("bilan de la joueuse", aliceNamur.wins === 2 && aliceNamur.losses === 1);
  const crit = r.tournaments.find((t) => t.name === "Critérium");
  expect("tournoi sans série", crit.players[0].series[0].name === null);

  const old = (await call(A, "GET", "/competitions/tournaments?season=25")).json;
  expect("saison précédente", old.season === 25 && old.tournaments.length === 1 && old.tournaments[0].players[0].series[0].name === "Série F");
  expect("saison inconnue : la plus récente", (await call(A, "GET", "/competitions/tournaments?season=12")).json.season === 26);

  // ---------- Droits et isolation ----------
  const rb = (await call(B, "GET", "/competitions/tournaments")).json;
  expect("l'autre club ne voit que ses joueurs", rb.tournaments.length === 1 && rb.tournaments[0].players.length === 1 && rb.tournaments[0].players[0].player.id === other.id);
  await post(A, "/auth/users", { email: `cmp-alice-${run}@test.local`, password: PASSWORD, roles: ["PLAYER"], playerIds: [alice.id] });
  const aliceTok = await login(`cmp-alice-${run}@test.local`);
  expect("un joueur n'a pas accès à la vue club", (await call(aliceTok, "GET", "/competitions/tournaments")).status === 403);
  expect("sans connexion : 401", (await call(null, "GET", "/competitions/tournaments")).status === 401);
} finally {
  await prisma.club.deleteMany({ where: { id: { in: [clubA.id, clubB.id] } } });
  await prisma.$disconnect();
  server.close();
}

console.log(`\n${checks - failures}/${checks} vérifications OK${failures ? `  —  ${failures} ÉCHEC(S)` : ""}`);
process.exit(failures ? 1 : 0);
