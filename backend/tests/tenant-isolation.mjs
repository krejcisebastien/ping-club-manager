// Test d'isolation multi-tenant : le club B tente d'accéder, modifier, supprimer
// ou se rattacher des données du club A. Autonome : crée ses propres clubs et
// données, démarre l'API en mémoire, puis nettoie. Lancer : npm run test:isolation
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/utils/password.js";
import { seedExerciseLibrary } from "../src/lib/exerciseLibrary.js";
import exerciseLibrary from "../src/data/exercise-library.json" with { type: "json" };

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
    // réponse sans corps (204)
  }
  return { status: res.status, json };
}

const run = Date.now().toString(36);
const PASSWORD = "MotDePasse123!";
const emailA = `admin-a-${run}@test.local`;
const emailB = `admin-b-${run}@test.local`;

async function createClub(name, email) {
  const club = await prisma.club.create({
    data: {
      name,
      slug: `${name.toLowerCase().replace(/\W+/g, "-")}-${run}`,
      licenseEndsAt: new Date("2099-12-31"),
      users: { create: { email, passwordHash: await hashPassword(PASSWORD), roles: ["ADMIN"] } },
    },
  });
  await seedExerciseLibrary(prisma, club.id);
  return club;
}

async function login(email) {
  const r = await call(null, "POST", "/auth/login", { email, password: PASSWORD });
  if (r.status !== 200) throw new Error(`Connexion impossible pour ${email} : ${r.status}`);
  return r.json;
}

const clubA = await createClub("Club A", emailA);
const clubB = await createClub("Club B", emailB);

try {
  const A = await login(emailA);
  const B = await login(emailB);
  expect("les deux clubs sont distincts", A.user.clubId !== B.user.clubId);
  expect("le nom du club est dans la session", A.user.clubName === "Club A" && B.user.clubName === "Club B");

  // ---------- Données complètes du club A ----------
  const post = async (tok, path, body) => (await call(tok, "POST", path, body)).json;
  const season = (await post(A.token, "/seasons", { name: "Saison A", startDate: "2026-07-01", endDate: "2027-06-30", isActive: true })).season;
  const player = (await post(A.token, "/players", { firstName: "Alice", lastName: "A", birthDate: "2010-01-01" })).player;
  const coach = (await post(A.token, "/coaches", { firstName: "Coach", lastName: "A" })).coach;
  const sparring = (await post(A.token, "/sparrings", { firstName: "Spar", lastName: "A" })).sparring;
  const group = (await post(A.token, "/groups", { seasonId: season.id, name: "Groupe A" })).group;
  await post(A.token, `/groups/${group.id}/players`, { playerId: player.id });
  const training = (await post(A.token, "/trainings", { seasonId: season.id, groupId: group.id, name: "Entrainement A", weekday: 1, startTime: "18:00", endTime: "19:30" })).training;
  await post(A.token, `/trainings/${training.id}/generate-occurrences`, { startDate: "2026-10-01", endDate: "2026-10-31" });
  const trainingOccurrences = (await call(A.token, "GET", `/trainings/${training.id}/occurrences`)).json.occurrences;
  const occurrence = trainingOccurrences[0];
  const exercise = (await post(A.token, "/exercises", { title: "Exercice A" })).exercise;
  const plan = (await post(A.token, "/training-plans", { seasonId: season.id, title: "Plan A" })).plan;
  await post(A.token, `/training-plans/${plan.id}/exercises`, { exerciseId: exercise.id });
  const camp = (await post(A.token, "/camps", { seasonId: season.id, name: "Stage A", startDate: "2026-08-01", endDate: "2026-08-02" })).camp;
  const campGroup = (await post(A.token, `/camps/${camp.id}/groups`, { name: "Groupe stage A" })).group;
  await post(A.token, `/camps/${camp.id}/days`, { startDate: "2026-08-01", endDate: "2026-08-01", withDefaultPeriods: true });
  const campFull = (await call(A.token, "GET", `/camps/${camp.id}`)).json.camp;
  const period = campFull.days[0].periods[0];
  const campDay = campFull.days[0];
  // Créer une journée y affecte d'office les groupes du stage.
  const periodGroup = period.groups[0];
  await post(A.token, `/camps/${camp.id}/players`, { playerId: player.id });
  const account = (await post(A.token, "/auth/users", { email: `joueur-a-${run}@test.local`, password: PASSWORD, roles: ["PLAYER"], playerIds: [player.id] })).user;
  expect("le club A est correctement construit", season && player && coach && sparring && group && training && occurrence && exercise && plan && camp && campGroup && periodGroup && account);

  // ---------- 1. B ne voit rien de A dans les listes ----------
  for (const [path, key] of [
    ["/seasons", "seasons"], ["/players", "players"], ["/coaches", "coaches"], ["/sparrings", "sparrings"],
    ["/groups", "groups"], ["/trainings", "trainings"], ["/camps", "camps"],
    ["/training-plans", "plans"],
  ]) {
    const r = await call(B.token, "GET", path);
    expect(`B liste vide : ${path}`, r.status === 200 && r.json[key].length === 0, JSON.stringify(r.json).slice(0, 80));
  }

  // Chaque club est initialisé avec sa propre bibliothèque d'exercices de base
  // (seedExerciseLibrary, appelé à la création du club) : B a la sienne, sans
  // voir l'exercice "Exercice A" créé manuellement dans le club A.
  const exercisesB = (await call(B.token, "GET", "/exercises")).json.exercises;
  expect(
    "B a sa propre bibliothèque de base sans les exercices de A",
    exercisesB.length === exerciseLibrary.length && !exercisesB.some((e) => e.title === "Exercice A"),
    `B a ${exercisesB.length} exercice(s), attendu ${exerciseLibrary.length}`
  );
  const usersB = (await call(B.token, "GET", "/auth/users")).json.users;
  expect("B ne voit que ses propres comptes", usersB.length === 1 && usersB[0].email === emailB);

  // ---------- 2. B lit par identifiant des ressources de A : 404 partout ----------
  const reads = [
    `/seasons/${season.id}`, `/players/${player.id}`, `/players/${player.id}/rankings`, `/players/${player.id}/equipment`,
    `/players/${player.id}/traits`, `/players/${player.id}/points-to-work`, `/players/${player.id}/evolution-notes`,
    `/players/${player.id}/evaluations`,
    `/players/${player.id}/attendance`, `/players/${player.id}/camp-attendance`, `/coaches/${coach.id}`,
    `/sparrings/${sparring.id}`, `/groups/${group.id}`, `/groups/${group.id}/players`, `/trainings/${training.id}`,
    `/trainings/${training.id}/occurrences`, `/occurrences/${occurrence.id}`, `/occurrences/${occurrence.id}/attendance`,
    `/camps/${camp.id}`, `/camps/groups/${campGroup.id}`, `/camp-period-groups/${periodGroup.id}`,
    `/camps/days/${campDay.id}/attendance`, `/camps/days/${campDay.id}/assignment`, `/training-plans/${plan.id}`, `/exercises/${exercise.id}`,
  ];
  for (const path of reads) {
    const r = await call(B.token, "GET", path);
    const empty = r.status === 200 && Object.values(r.json).every((v) => Array.isArray(v) && v.length === 0);
    expect(`B lit ${path} : refusé ou vide`, r.status === 404 || r.status === 403 || empty, `status ${r.status} ${JSON.stringify(r.json).slice(0, 80)}`);
  }

  // ---------- 3. B tente de modifier / supprimer : 404 ----------
  const writes = [
    ["PUT", `/seasons/${season.id}`, { name: "PIRATE" }], ["DELETE", `/seasons/${season.id}`],
    ["PUT", `/players/${player.id}`, { firstName: "PIRATE" }], ["DELETE", `/players/${player.id}`],
    ["PUT", `/coaches/${coach.id}`, { firstName: "PIRATE" }], ["DELETE", `/coaches/${coach.id}`],
    ["PUT", `/sparrings/${sparring.id}`, { firstName: "PIRATE" }], ["DELETE", `/sparrings/${sparring.id}`],
    ["PUT", `/groups/${group.id}`, { name: "PIRATE" }], ["DELETE", `/groups/${group.id}`],
    ["DELETE", `/groups/${group.id}/players/${player.id}`],
    ["PUT", `/trainings/${training.id}`, { name: "PIRATE" }], ["DELETE", `/trainings/${training.id}`],
    ["PUT", `/occurrences/${occurrence.id}`, { status: "CANCELLED" }], ["DELETE", `/occurrences/${occurrence.id}`],
    ["PUT", `/camps/${camp.id}`, { name: "PIRATE" }], ["DELETE", `/camps/${camp.id}`],
    ["PUT", `/camps/groups/${campGroup.id}`, { name: "PIRATE" }], ["DELETE", `/camps/groups/${campGroup.id}`],
    ["DELETE", `/camps/periods/${period.id}`], ["DELETE", `/camps/period-groups/${periodGroup.id}`],
    ["PUT", `/training-plans/${plan.id}`, { title: "PIRATE" }], ["DELETE", `/training-plans/${plan.id}`],
    ["DELETE", `/training-plans/${plan.id}/exercises/${exercise.id}`],
    ["PUT", `/exercises/${exercise.id}`, { title: "PIRATE" }], ["DELETE", `/exercises/${exercise.id}`],
    ["PUT", `/auth/users/${account.id}`, { isActive: false }], ["DELETE", `/auth/users/${account.id}`],
    ["PUT", `/auth/users/${A.user.sub}`, { isActive: false }],
  ];
  for (const [method, path, body] of writes) {
    const r = await call(B.token, method, path, body);
    expect(`B ${method} ${path} refusé`, r.status === 404 || r.status === 403, `status ${r.status}`);
  }

  // ---------- 4. B tente de rattacher des ressources de A à ses propres données ----------
  const bSeason = (await post(B.token, "/seasons", { name: "Saison B", startDate: "2026-07-01", endDate: "2027-06-30", isActive: true })).season;
  const bPlayer = (await post(B.token, "/players", { firstName: "Bob", lastName: "B", birthDate: "2010-01-01" })).player;
  const bCoach = (await post(B.token, "/coaches", { firstName: "Coach", lastName: "B" })).coach;
  const bGroup = (await post(B.token, "/groups", { seasonId: bSeason.id, name: "Groupe B" })).group;
  const bTraining = (await post(B.token, "/trainings", { seasonId: bSeason.id, groupId: bGroup.id, name: "Entrainement B", weekday: 2, startTime: "18:00", endTime: "19:00" })).training;
  const bCamp = (await post(B.token, "/camps", { seasonId: bSeason.id, name: "Stage B", startDate: "2026-08-01", endDate: "2026-08-02" })).camp;
  const bPlan = (await post(B.token, "/training-plans", { seasonId: bSeason.id, title: "Plan B" })).plan;
  expect("B peut créer ses propres données", bSeason && bPlayer && bCoach && bGroup && bTraining && bCamp && bPlan);

  const attacks = [
    ["POST", "/groups", { seasonId: season.id, name: "x" }],
    ["POST", "/trainings", { seasonId: season.id, groupId: bGroup.id, name: "x" }],
    ["POST", "/trainings", { seasonId: bSeason.id, groupId: group.id, name: "x" }],
    ["PUT", `/trainings/${bTraining.id}`, { groupId: group.id }],
    ["POST", "/camps", { seasonId: season.id, name: "x", startDate: "2026-08-01", endDate: "2026-08-02" }],
    ["POST", "/training-plans", { seasonId: season.id, title: "x" }],
    ["POST", `/players/${player.id}/rankings`, { seasonId: bSeason.id, rankingValue: "D0" }],
    ["POST", `/players/${bPlayer.id}/rankings`, { seasonId: season.id, rankingValue: "D0" }],
    ["POST", `/players/${player.id}/traits`, { category: "STRENGTH", description: "x" }],
    ["POST", `/players/${player.id}/equipment`, { type: "x" }],
    ["POST", `/players/${player.id}/points-to-work`, { description: "x" }],
    ["POST", `/players/${player.id}/evolution-notes`, { note: "x" }],
    [
      "POST",
      `/players/${player.id}/evaluations`,
      { service: 5, remise: 5, coupDroit: 5, revers: 5, deplacements: 5, tactique: 5, mental: 5, physique: 5 },
    ],
    ["POST", `/groups/${bGroup.id}/players`, { playerId: player.id }],
    ["POST", `/groups/${group.id}/players`, { playerId: bPlayer.id }],
    ["POST", `/trainings/${bTraining.id}/coaches`, { coachId: coach.id }],
    ["POST", `/trainings/${bTraining.id}/coaches`, { sparringId: sparring.id }],
    ["POST", `/trainings/${training.id}/coaches`, { coachId: bCoach.id }],
    ["POST", `/trainings/${training.id}/occurrences`, { date: "2026-11-01", startTime: "18:00", endTime: "19:00" }],
    ["POST", `/trainings/${training.id}/generate-occurrences`, { startDate: "2026-11-01", endDate: "2026-11-30" }],
    ["POST", `/occurrences/${occurrence.id}/coaches`, { coachId: bCoach.id }],
    ["POST", `/camps/${camp.id}/days`, { startDate: "2026-08-01", endDate: "2026-08-02" }],
    ["POST", `/camps/${camp.id}/groups`, { name: "x" }],
    ["POST", `/camps/${camp.id}/periods/generate`, { startDate: "2026-08-01", endDate: "2026-08-01", label: "x", startTime: "09:00", endTime: "10:00" }],
    ["POST", `/camps/groups/${campGroup.id}/coaches`, { coachId: bCoach.id }],
    ["POST", `/camps/${camp.id}/players`, { playerId: bPlayer.id }],
    ["DELETE", `/camps/${camp.id}/players/${player.id}`, {}],
    ["PUT", `/camps/days/${campDay.id}/assignment`, { assignments: [] }],
    ["DELETE", `/camps/days/${campDay.id}/attendance`, {}],
    ["PUT", `/camps/groups/${campGroup.id}`, { trainingPlanId: bPlan.id }],
    ["POST", `/camps/periods/${period.id}/groups`, { campGroupId: campGroup.id }],
    ["POST", `/camp-period-groups/${periodGroup.id}/coaches`, { coachId: bCoach.id }],
    ["POST", `/camp-period-groups/${periodGroup.id}/players`, { playerId: bPlayer.id }],
    ["POST", `/training-plans/${plan.id}/exercises`, { exerciseId: exercise.id }],
    ["POST", `/training-plans/${bPlan.id}/exercises`, { exerciseId: exercise.id }],
    ["POST", "/auth/users", { email: `hijack-${run}@test.local`, password: PASSWORD, roles: ["PLAYER"], playerIds: [player.id] }],
    ["POST", "/auth/users", { email: `hijack2-${run}@test.local`, password: PASSWORD, roles: ["COACH"], coachId: coach.id }],
    ["PUT", `/auth/users/${B.user.sub}`, { roles: ["PLAYER"], playerIds: [player.id] }],
    ["POST", "/sparrings", { firstName: "S", lastName: "S", isClubMember: true, playerId: player.id }],
  ];
  for (const [method, path, body] of attacks) {
    const r = await call(B.token, method, path, body);
    expect(`B ${method} ${path} ${JSON.stringify(body).slice(0, 55)} refusé`, r.status >= 400 && r.status < 500, `status ${r.status} ${JSON.stringify(r.json).slice(0, 80)}`);
  }
  // présences : B ne peut pas écrire sur la séance / la période de A, ni y mettre un de ses joueurs
  const bAtt = await call(B.token, "PUT", `/occurrences/${occurrence.id}/attendance`, { records: [{ playerId: bPlayer.id, status: "PRESENT" }] });
  expect("B écrit une présence sur une séance de A : refusé", bAtt.status >= 400 && bAtt.status < 500, `status ${bAtt.status}`);
  const bCampAtt = await call(B.token, "PUT", `/camps/days/${campDay.id}/attendance`, { records: [{ campPeriodId: period.id, playerId: bPlayer.id, status: "PRESENT" }] });
  expect("B écrit une présence de stage chez A : refusé", bCampAtt.status >= 400 && bCampAtt.status < 500, `status ${bCampAtt.status}`);
  const aAttWithB = await call(A.token, "PUT", `/occurrences/${occurrence.id}/attendance`, { records: [{ playerId: bPlayer.id, status: "PRESENT" }] });
  expect("A ne peut pas pointer un joueur de B", aAttWithB.status >= 400 && aAttWithB.status < 500, `status ${aAttWithB.status}`);
  const badStatus = await call(A.token, "PUT", `/occurrences/${occurrence.id}/attendance`, { records: [{ playerId: player.id, status: "SICK" }] });
  expect("un statut de présence invalide est refusé", badStatus.status === 400, `status ${badStatus.status}`);

  // ---------- 4bis. Statistiques : taux de présence et heures (les excusés ne comptent pas) ----------
  expect("assez de séances générées pour le scénario", trainingOccurrences.length >= 4, `${trainingOccurrences.length} séance(s)`);
  await call(A.token, "PUT", `/occurrences/${trainingOccurrences[0].id}/attendance`, { records: [{ playerId: player.id, status: "PRESENT" }] });
  await call(A.token, "PUT", `/occurrences/${trainingOccurrences[1].id}/attendance`, { records: [{ playerId: player.id, status: "ABSENT" }] });
  await call(A.token, "PUT", `/occurrences/${trainingOccurrences[2].id}/attendance`, { records: [{ playerId: player.id, status: "EXCUSED" }] });
  await call(A.token, "PUT", `/occurrences/${trainingOccurrences[3].id}/attendance`, { records: [{ playerId: player.id, status: "LATE" }] });
  await call(A.token, "PUT", `/camps/days/${campDay.id}/attendance`, { records: [{ campPeriodId: period.id, playerId: player.id, status: "PRESENT" }] });

  expect("stats : seasonId requis", (await call(A.token, "GET", `/players/${player.id}/stats`)).status === 400);
  const stats = (await call(A.token, "GET", `/players/${player.id}/stats?seasonId=${season.id}`)).json.stats;
  expect(
    "taux de présence entrainements : excusé exclu du dénominateur (2/3)",
    Math.abs(stats.training.attendanceRate - 2 / 3) < 0.001,
    JSON.stringify(stats.training)
  );
  expect("heures d'entrainement : présent + retard comptés (2 x 1h30)", stats.training.hours === 3, JSON.stringify(stats.training));
  expect(
    "compteurs par statut corrects",
    stats.training.counts.PRESENT === 1 && stats.training.counts.ABSENT === 1 && stats.training.counts.EXCUSED === 1 && stats.training.counts.LATE === 1,
    JSON.stringify(stats.training.counts)
  );
  expect("taux de présence stage : 100%", stats.camp.attendanceRate === 1, JSON.stringify(stats.camp));
  expect("heures de stage comptées (Matinée = 3h)", stats.camp.hours === 3, JSON.stringify(stats.camp));
  // Comme les autres sous-ressources du joueur (rankings, traits...), pas de 404 explicite :
  // le scope tenant vide simplement la collection sous-jacente, donc des stats à zéro.
  const statsB = (await call(B.token, "GET", `/players/${player.id}/stats?seasonId=${season.id}`)).json.stats;
  expect(
    "B ne voit aucune statistique réelle du joueur de A",
    statsB.training.attendanceRate === null && statsB.training.hours === 0 && statsB.camp.attendanceRate === null,
    JSON.stringify(statsB)
  );

  // ---------- 5. A n'a rien perdu ni gagné ----------
  const count = async (tok, path, key) => (await call(tok, "GET", path)).json[key].length;
  expect("A : 1 saison", (await count(A.token, "/seasons", "seasons")) === 1);
  expect("A : 1 joueur", (await count(A.token, "/players", "players")) === 1);
  expect("A : 1 entraineur", (await count(A.token, "/coaches", "coaches")) === 1);
  expect("A : 1 groupe", (await count(A.token, "/groups", "groups")) === 1);
  expect("A : 1 entrainement", (await count(A.token, "/trainings", "trainings")) === 1);
  expect("A : 1 stage", (await count(A.token, "/camps", "camps")) === 1);
  expect("A : 1 plan", (await count(A.token, "/training-plans", "plans")) === 1);
  const usersA = (await call(A.token, "GET", "/auth/users")).json.users;
  expect("A : aucun compte piraté", usersA.length === 2 && !usersA.some((u) => u.email.startsWith("hijack")));
  expect("saison A non renommée", (await call(A.token, "GET", `/seasons/${season.id}`)).json.season.name === "Saison A");
  expect("joueur A intact", (await call(A.token, "GET", `/players/${player.id}`)).json.player.firstName === "Alice");
  const roster = (await call(A.token, "GET", `/occurrences/${occurrence.id}/attendance`)).json.attendance;
  expect("feuille de présence A intacte (1 joueur)", roster.length === 1 && roster[0].playerId === player.id);

  // ---------- 6. Contrôles positifs : un club fonctionne normalement ----------
  const put = await call(A.token, "PUT", `/occurrences/${occurrence.id}/attendance`, { records: [{ playerId: player.id, status: "PRESENT" }] });
  expect("A enregistre une présence (upsert)", put.status === 204, `status ${put.status}`);
  const campPut = await call(A.token, "PUT", `/camps/days/${campDay.id}/attendance`, { records: [] });
  expect("A enregistre une présence de stage", campPut.status === 204, `status ${campPut.status}`);
  const move = await call(B.token, "POST", `/groups/${bGroup.id}/players`, { playerId: bPlayer.id });
  expect("B affecte son joueur à son groupe", move.status === 201, `status ${move.status}`);
  const bDefaults = await call(B.token, "POST", `/trainings/${bTraining.id}/coaches`, { coachId: bCoach.id });
  expect("B ajoute son entraineur par défaut", bDefaults.status === 201, `status ${bDefaults.status}`);
  const bGen = await call(B.token, "POST", `/trainings/${bTraining.id}/generate-occurrences`, { startDate: "2026-10-01", endDate: "2026-10-31" });
  expect("B génère des séances (copie des encadrants par défaut)", bGen.status === 201 && bGen.json.created > 0, `status ${bGen.status}`);
  const bAccount = await call(B.token, "POST", "/auth/users", { email: `joueur-b-${run}@test.local`, password: PASSWORD, roles: ["PLAYER"], playerIds: [bPlayer.id] });
  expect("B crée un compte joueur rattaché à son joueur", bAccount.status === 201, `status ${bAccount.status}`);
  const evalA = await call(A.token, "POST", `/players/${player.id}/evaluations`, {
    service: 8,
    remise: 6,
    coupDroit: 8,
    revers: 5,
    deplacements: 4,
    tactique: 7,
    mental: 7,
    physique: 6,
  });
  expect("A note une évaluation sportive", evalA.status === 201, `status ${evalA.status}`);

  // ---------- Tableau de bord entraineur : isolation ----------
  const todayISO = new Date().toISOString().slice(0, 10);
  await post(A.token, `/trainings/${training.id}/occurrences`, { date: todayISO, startTime: "18:00", endTime: "19:30" });
  await post(B.token, `/trainings/${bTraining.id}/occurrences`, { date: todayISO, startTime: "20:00", endTime: "21:00" });
  const dashA = (await call(A.token, "GET", "/dashboard/coach")).json;
  const dashB = (await call(B.token, "GET", "/dashboard/coach")).json;
  expect("A voit sa séance du jour au tableau de bord", dashA.upcomingTrainings.some((o) => o.trainingName === "Entrainement A"));
  expect("A ne voit pas la séance de B", !dashA.upcomingTrainings.some((o) => o.trainingName === "Entrainement B"));
  expect("B voit sa séance du jour au tableau de bord", dashB.upcomingTrainings.some((o) => o.trainingName === "Entrainement B"));
  expect("B ne voit pas la séance de A", !dashB.upcomingTrainings.some((o) => o.trainingName === "Entrainement A"));
  expect("le compteur de joueurs de A est scopé", dashA.stats.players === 1, JSON.stringify(dashA.stats));
  const evalBadScore = await call(A.token, "POST", `/players/${player.id}/evaluations`, {
    service: 11,
    remise: 6,
    coupDroit: 8,
    revers: 5,
    deplacements: 4,
    tactique: 7,
    mental: 7,
    physique: 6,
  });
  expect("un score hors 0-10 est refusé", evalBadScore.status === 400, `status ${evalBadScore.status}`);

  // ---------- Plafonds du volontariat : isolation ----------
  const putCapsA = await call(A.token, "PUT", "/rates/caps", { caps: [{ year: 2026, perDay: 40, perYear: 3000 }] });
  expect("A enregistre ses plafonds", putCapsA.status === 204, `status ${putCapsA.status}`);
  const capsA = (await call(A.token, "GET", "/rates/caps")).json;
  const capsB = (await call(B.token, "GET", "/rates/caps")).json;
  expect("A relit ses plafonds", capsA.caps.length === 1 && capsA.caps[0].perYear === 3000, JSON.stringify(capsA));
  expect("B ne voit pas les plafonds de A", capsB.caps.length === 0, JSON.stringify(capsB));
  await call(B.token, "PUT", "/rates/caps", { caps: [] });
  expect("vider les plafonds de B ne touche pas A", (await call(A.token, "GET", "/rates/caps")).json.caps.length === 1);
  const badCaps = await call(A.token, "PUT", "/rates/caps", { caps: [{ year: 2026, perDay: 40, perYear: 3000 }, { year: 2026, perDay: 1, perYear: 1 }] });
  expect("une année en double est refusée", badCaps.status === 400, `status ${badCaps.status}`);

  // ---------- 7. Sessions et comptes ----------
  const legacy = jwt.sign({ sub: "x", roles: ["ADMIN"] }, process.env.JWT_SECRET);
  expect("jeton sans club refusé", (await call(legacy, "GET", "/seasons")).status === 401);
  const dup = await call(B.token, "POST", "/auth/users", { email: emailA, password: PASSWORD, roles: ["ADMIN"] });
  expect("email déjà utilisé dans un autre club refusé", dup.status === 409, `status ${dup.status}`);
} finally {
  // Supprimer un club supprime en cascade toutes ses données.
  await prisma.club.deleteMany({ where: { id: { in: [clubA.id, clubB.id] } } });
  const left = await prisma.season.count({ where: { clubId: { in: [clubA.id, clubB.id] } } });
  expect("la suppression d'un club supprime ses données", left === 0);
  await prisma.$disconnect();
  server.close();
}

console.log(`\n${checks - failures}/${checks} vérifications OK${failures ? `  —  ${failures} ÉCHEC(S)` : ""}`);
process.exit(failures ? 1 : 0);
