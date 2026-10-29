// Test de la vue club des tournois : regroupement par tournoi, joueur et
// série, bilans (forfaits à part), choix de la saison, droits et isolation
// entre clubs, saison courante TabT et inscriptions aux tournois à venir. Autonome : crée ses données, puis nettoie.
// Lancer : npm run test:competitions
import "dotenv/config";
import soap from "soap";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/utils/password.js";
import { registrationResult, splitEventName } from "../src/lib/tournamentResults.js";
import { currentSeason, isMealSerie, registrationRows, startTournamentSync, syncPlayer, syncTournamentRegistrations, tournamentSync } from "../src/lib/tabt.js";

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

  // ---------- Saison courante TabT ----------
  const names = new Map([[25, "2024-2025"], [26, "2025-2026"], [27, "2026-2027"]]);
  expect("saison commencée retenue même si TabT annonce la précédente", currentSeason(26, names, new Date("2026-10-29")) === 27);
  expect("saison suivante pas encore commencée ignorée", currentSeason(26, names, new Date("2026-06-15")) === 26);
  expect("saison annoncée par TabT conservée", currentSeason(27, names, new Date("2026-06-15")) === 27);

  // ---------- Inscriptions aux tournois à venir ----------
  const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
  const lic = (n) => 900000 + n;
  await call(A, "PUT", `/players/${alice.id}`, { firstName: "Alice", lastName: "Zeta", birthDate: "2010-01-01", licenseNumber: String(lic(1)) });
  await call(B, "PUT", `/players/${other.id}`, { firstName: "Olga", lastName: "Autre", birthDate: "2010-01-01", licenseNumber: String(lic(2)) });
  const reg = (n) => ({ Member: { UniqueIndex: lic(n), FirstName: "X", LastName: "Y" } });
  const fake = [
    { season: 27, UniqueIndex: 7001, Name: "Open de Ciney", DateFrom: new Date(`${day(10)}T00:00:00Z`), Venue: { Name: "Hall", Town: "5590 Ciney" },
      SerieEntries: [{ UniqueIndex: 1, Name: "Série E", RegistrationEntries: [reg(1), reg(2), reg(99)] }, { UniqueIndex: 2, Name: "Série D", RegistrationEntries: reg(1) }] },
    { season: 27, UniqueIndex: 7002, Name: "Critérium", DateFrom: new Date(`${day(3)}T00:00:00Z`), SerieEntries: { UniqueIndex: 3, Name: "Serie unique" } },
  ];
  const rows = registrationRows(fake, new Map([[lic(1), ["p1", "p1bis"]], [lic(2), ["p2"]]]));
  expect("une ligne par joueur et par série, licences inconnues ignorées", rows.length === 5, String(rows.length));
  expect("même licence dans deux clubs : les deux joueurs", rows.filter((r) => r.serieId === 1).map((r) => r.playerId).sort().join() === "p1,p1bis,p2");
  expect("série unique sans tableau et sans inscrits", !rows.some((r) => r.serieId === 3));
  expect("lieu repris", rows[0].venue === "Hall" && rows[0].town === "5590 Ciney");
  const meals = ["Repas : Boulettes, sauce tomate maison, frites et dessert:15€", "Petit-déjeuner offert pour les participants au tournoi, les autres=4€", "MENU", "BBQ, Salad Bar", "Ptt Déj (viennoiserie + café)", "Pti Dej", "Blt sce tomate, frites", "Americain, frites", "Reoas 1: Pâtes Bolognaise fromage:10€", "VOL AU VENT PUREE", "Repas 1 accompagnant : Steak/frites: 18,00€", "Boulettes Frites (SUR COMMANDE)"];
  const games = ["C0 C6", "D6 E2", "E4 NC", "DOUBLE EXCELSIOR ERQUELINNES", "Série E", "Dames NG", "Messieurs B0-C6", "Jeunes -12 ans", "Simple Vétérans 50+", "Serie unique"];
  expect("séries repas écartées", meals.every(isMealSerie), meals.filter((m) => !isMealSerie(m)).join(" | "));
  expect("vraies séries gardées", !games.some(isMealSerie), games.filter(isMealSerie).join(" | "));
  const withMeal = registrationRows([{ ...fake[0], SerieEntries: [{ UniqueIndex: 9, Name: "Repas : Boulettes frites:15€", RegistrationEntries: reg(1) }] }], new Map([[lic(1), ["p1"]]]));
  expect("inscription à un repas ignorée", withMeal.length === 0);

  await prisma.tournamentRegistration.create({ data: { playerId: bob.id, season: 27, tournamentId: 1, serieId: 1, name: "Ancien", date: new Date(day(5)) } });
  const sync = await syncTournamentRegistrations({ fetchTournaments: async () => fake });
  expect("synchronisation : inscriptions des joueurs de l'app", sync.tournaments === 2 && sync.registrations >= 3, JSON.stringify(sync));
  expect("anciennes inscriptions remplacées", (await prisma.tournamentRegistration.count({ where: { playerId: bob.id } })) === 0);
  const failing = await syncTournamentRegistrations({ fetchTournaments: async () => { throw new Error("quota"); } }).catch((e) => e);
  expect("échec de TabT : erreur remontée", failing instanceof Error);
  expect("échec de TabT : inscriptions conservées", (await prisma.tournamentRegistration.count({ where: { playerId: alice.id } })) === 2);

  const mine = await call(aliceTok, "GET", `/players/${alice.id}/tournament-registrations`);
  expect("la joueuse voit ses inscriptions", mine.status === 200 && mine.json.registrations.map((r) => r.serieName).sort().join() === "Série D,Série E", JSON.stringify(mine.json));
  expect("un joueur ne voit pas celles d'un autre", (await call(aliceTok, "GET", `/players/${bob.id}/tournament-registrations`)).status === 403);
  const foreign = await call(B, "GET", `/players/${alice.id}/tournament-registrations`);
  expect("l'autre club ne voit rien", foreign.status === 200 && foreign.json.registrations.length === 0);
  await prisma.tournamentRegistration.create({ data: { playerId: alice.id, season: 26, tournamentId: 2, serieId: 99, name: "Saison passée", date: new Date(day(-400)) } });
  expect("tournois des saisons précédentes masqués", (await call(aliceTok, "GET", `/players/${alice.id}/tournament-registrations`)).json.registrations.length === 2);
  const played = new Date(day(-3));
  await prisma.tournamentRegistration.create({ data: { playerId: alice.id, season: 27, tournamentId: 3, serieId: 31, name: "Open de Namur", serieName: "Série E", date: played } });
  await prisma.tournamentRegistration.create({ data: { playerId: alice.id, season: 27, tournamentId: 4, serieId: 41, name: "Critérium de Mons", serieName: null, date: played } });
  const res = (eventName, won, offset = -3, walkover = false) => ({ playerId: alice.id, season: 27, date: new Date(day(offset)), competition: "TOURNAMENT", opponentFirstName: "A", opponentLastName: "B", opponentRanking: "E0", won, walkover, setsFor: won ? 3 : 1, setsAgainst: won ? 1 : 3, eventName });
  await prisma.competitionResult.createMany({ data: [res("Open de Namur — Série E", true), res("Open de Namur — Série E", false), res("Open de Namur — Série D", true), res("Open de Namur — Série E", true, -3, true), res("Open de Namur — Série E", true, -60)] });
  const season = (await call(aliceTok, "GET", `/players/${alice.id}/tournament-registrations`)).json.registrations;
  const namurReg = season.find((r) => r.tournamentId === 3);
  expect("tournoi passé de la saison affiché", season.length === 4 && season[0].tournamentId === 3, JSON.stringify(season.map((r) => r.name)));
  expect("bilan de la série jouée", namurReg.result?.wins === 1 && namurReg.result.losses === 1 && namurReg.result.walkovers === 1, JSON.stringify(namurReg.result));
  expect("pas encore de résultat : null", season.find((r) => r.tournamentId === 4).result === null);
  expect("tournoi à venir sans bilan", !("result" in season.find((r) => r.tournamentId === 7001)));
  const sansSerie = registrationResult({ name: "open de namur ", serieName: null, date: played }, [{ date: played, eventName: "Open de Namur — Série E", won: true, walkover: false }]);
  expect("série inconnue : bilan du tournoi, nom comparé sans la casse", sansSerie?.wins === 1);
  await prisma.competitionResult.deleteMany({ where: { playerId: alice.id } });
  await prisma.tournamentRegistration.deleteMany({ where: { tournamentId: { in: [3, 4] } } });
  const clubUp = (await call(A, "GET", "/competitions/upcoming-tournaments")).json.registrations;
  expect("vue club : inscriptions du club seulement", clubUp.length === 2 && clubUp.every((r) => r.player.id === alice.id));
  const clubUpB = (await call(B, "GET", "/competitions/upcoming-tournaments")).json.registrations;
  expect("vue club de l'autre club : ses joueurs", clubUpB.length === 1 && clubUpB[0].player.id === other.id);
  expect("vue club refusée à un joueur", (await call(aliceTok, "GET", "/competitions/upcoming-tournaments")).status === 403);

  // ---------- Relecture à la demande ----------
  let release;
  const slow = () => new Promise((resolve) => (release = resolve));
  expect("relecture lancée", startTournamentSync(slow) === "started" && tournamentSync.running);
  expect("pas de seconde relecture en parallèle", startTournamentSync(slow) === "running");
  const during = (await call(aliceTok, "GET", `/players/${alice.id}/tournament-registrations`)).json;
  expect("l'écran voit la relecture en cours", during.sync.running === true);
  release();
  await new Promise((r) => setTimeout(r, 50));
  expect("relecture terminée", !tournamentSync.running && tournamentSync.finishedAt instanceof Date && tournamentSync.error === null);
  expect("pas plus d'une relecture toutes les 10 minutes", startTournamentSync(slow) === "recent");
  tournamentSync.finishedAt = new Date(Date.now() - 11 * 60 * 1000);
  expect("échec de relecture signalé", startTournamentSync(async () => { throw new Error("quota TabT"); }) === "started");
  await new Promise((r) => setTimeout(r, 50));
  expect("erreur gardée pour l'écran", tournamentSync.error === "quota TabT" && !tournamentSync.running);

  // ---------- Classement et résultats dames ----------
  // Client TabT simulé : une joueuse (Gender F) a un classement général et un
  // classement dames, avec des résultats distincts ; un joueur n'a que le général.
  const tabtCalls = [];
  const entry = (date, matchId, won) => ({ Date: date, UniqueIndex: 1234, FirstName: "Eva", LastName: "Adv", Ranking: "B4", Result: won ? "V" : "D", SetFor: won ? 3 : 0, SetAgainst: won ? 0 : 3, CompetitionType: "C", Club: "Minerois", MatchId: matchId });
  soap.createClientAsync = async () => ({
    GetSeasonsAsync: async () => [{ CurrentSeason: 27, SeasonEntries: [{ Season: 27, Name: "2026-2027" }] }],
    GetMembersAsync: async (args) => {
      tabtCalls.push(args);
      const lady = args.UniqueIndex === lic(1);
      if (args.PlayerCategory === 44) return [lady ? { MemberEntries: [{ UniqueIndex: lic(1), Ranking: "B2", ResultEntries: [entry("2026-10-03", "SD03/086", false), entry("2026-10-10", "SD03/090", true)] }] } : { MemberCount: 0 }];
      return [{ MemberEntries: [{ UniqueIndex: args.UniqueIndex, Ranking: lady ? "C2" : "D0", Club: "N076", Gender: lady ? "F" : "M", MedicalAttestation: true, ResultEntries: [entry("2026-10-04", "HAI/01", true)] }] }];
    },
  });
  process.env.TABT_ACCOUNT ??= "test";
  process.env.TABT_PASSWORD ??= "test";
  await syncPlayer({ id: alice.id, licenseNumber: String(lic(1)) }).catch(() => {});
  const aliceSeason = await prisma.competitionSeason.findUnique({ where: { playerId_season: { playerId: alice.id, season: 27 } } });
  expect("joueuse : classement général et dames", aliceSeason?.ranking === "C2" && aliceSeason.ladiesRanking === "B2", JSON.stringify(aliceSeason));
  const aliceResults = await prisma.competitionResult.findMany({ where: { playerId: alice.id, season: 27 } });
  expect("joueuse : résultats dames importés à part", aliceResults.length === 3 && aliceResults.filter((r) => r.ladies).length === 2, String(aliceResults.length));
  expect("sexe demandé à TabT", tabtCalls.some((a) => a.ExtendedInformation === true && a.UniqueIndex === lic(1)));
  const ownerCalls = tabtCalls.length;
  await syncPlayer({ id: other.id, licenseNumber: String(lic(2)) }).catch(() => {});
  expect("joueur : pas d'appel dames", !tabtCalls.slice(ownerCalls).some((a) => a.PlayerCategory === 44));
  const otherSeason = await prisma.competitionSeason.findUnique({ where: { playerId_season: { playerId: other.id, season: 27 } } });
  expect("joueur : pas de classement dames", otherSeason?.ranking === "D0" && otherSeason.ladiesRanking === null);
  const comp = (await call(aliceTok, "GET", `/players/${alice.id}/competition`)).json;
  expect("fiche : classement dames et matchs marqués", comp?.seasons?.find((x) => x.season === 27)?.ladiesRanking === "B2" && comp.results.filter((r) => r.season === 27 && r.ladies).length === 2);
} finally {
  await prisma.club.deleteMany({ where: { id: { in: [clubA.id, clubB.id] } } });
  await prisma.$disconnect();
  server.close();
}

console.log(`\n${checks - failures}/${checks} vérifications OK${failures ? `  —  ${failures} ÉCHEC(S)` : ""}`);
process.exit(failures ? 1 : 0);
