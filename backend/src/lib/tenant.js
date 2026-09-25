import { prisma } from "./prisma.js";

// Isolation multi-tenant : chaque requête authentifiée reçoit un client Prisma
// "scopé" sur le club de l'utilisateur. Toute lecture/modification est
// automatiquement restreinte à ce club, et tout identifiant référencé en
// écriture doit appartenir au même club — les routes n'ont donc pas à y penser.

// Chemin de relations menant de chaque modèle à une entité racine portant clubId.
const PATHS = {
  Season: [],
  User: [],
  Player: [],
  Coach: [],
  Sparring: [],
  HourlyRate: [],
  Exercise: [],
  PlayerSeason: ["player"],
  RankingHistory: ["player"],
  Evaluation: ["player"],
  Equipment: ["player"],
  PlayerTrait: ["player"],
  PointToWork: ["player"],
  EvolutionNote: ["player"],
  PlayerMedia: ["player"],
  PlayerGroupAssignment: ["player"],
  Attendance: ["player"],
  CampAttendance: ["player"],
  CampPeriodGroupPlayer: ["player"],
  CampPlayer: ["player"],
  UserPlayer: ["user"],
  TrainingGroup: ["season"],
  Training: ["season"],
  TrainingPlan: ["season"],
  Camp: ["season"],
  TrainingCoach: ["training", "season"],
  TrainingOccurrence: ["training", "season"],
  TrainingOccurrenceCoach: ["occurrence", "training", "season"],
  TrainingPlanExercise: ["trainingPlan", "season"],
  CampDay: ["camp", "season"],
  CampPeriod: ["campDay", "camp", "season"],
  CampGroup: ["camp", "season"],
  CampGroupCoach: ["campGroup", "camp", "season"],
  CampPeriodGroup: ["group", "camp", "season"],
  CampPeriodGroupCoach: ["campPeriodGroup", "group", "camp", "season"],
};

// Champ de clé étrangère -> modèle référencé.
const FK_MODEL = {
  playerId: "Player",
  coachId: "Coach",
  sparringId: "Sparring",
  seasonId: "Season",
  groupId: "TrainingGroup",
  campGroupId: "CampGroup",
  trainingId: "Training",
  trainingPlanId: "TrainingPlan",
  exerciseId: "Exercise",
  occurrenceId: "TrainingOccurrence",
  campId: "Camp",
  campDayId: "CampDay",
  campPeriodId: "CampPeriod",
  campPeriodGroupId: "CampPeriodGroup",
  userId: "User",
  createdById: "Coach",
};

// Champs Json libres : on n'y cherche pas de clés étrangères.
const JSON_FIELDS = new Set(["settings", "diagram"]);

export class TenantError extends Error {
  constructor() {
    super("Ressource introuvable.");
    this.code = "TENANT_FORBIDDEN";
  }
}

function scopeWhere(model, clubId) {
  const path = PATHS[model];
  if (!path) throw new Error(`Modèle non géré par l'isolation multi-tenant : ${model}`);
  let where = { clubId };
  for (const relation of [...path].reverse()) where = { [relation]: where };
  return where;
}

const isRoot = (model) => PATHS[model].length === 0;
const delegate = (model) => prisma[model[0].toLowerCase() + model.slice(1)];
const asArray = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

function collectForeignKeys(value, found) {
  if (Array.isArray(value)) {
    for (const item of value) collectForeignKeys(item, found);
  } else if (value && typeof value === "object" && !(value instanceof Date)) {
    for (const [key, v] of Object.entries(value)) {
      if (JSON_FIELDS.has(key)) continue;
      if (FK_MODEL[key] && typeof v === "string") {
        (found[FK_MODEL[key]] ??= new Set()).add(v);
      } else {
        collectForeignKeys(v, found);
      }
    }
  }
}

async function assertForeignKeysOwned(clubId, ...payloads) {
  const found = {};
  for (const payload of payloads) collectForeignKeys(payload, found);
  await Promise.all(
    Object.entries(found).map(async ([model, ids]) => {
      const count = await delegate(model).count({ where: { id: { in: [...ids] }, ...scopeWhere(model, clubId) } });
      if (count !== ids.size) throw new TenantError();
    })
  );
}

const withClub = (model, clubId, data) => (isRoot(model) ? { ...data, clubId } : data);

function scopeNonUnique(args, scope) {
  return { ...args, where: args.where ? { AND: [args.where, scope] } : scope };
}

function scopeUnique(args, scope) {
  return { ...args, where: { ...args.where, AND: [...asArray(args.where?.AND), scope] } };
}

const cache = new Map();

export function tenantClient(clubId) {
  if (!clubId) throw new Error("clubId requis pour le client multi-tenant.");
  if (cache.has(clubId)) return cache.get(clubId);

  const client = prisma.$extends({
    name: "tenant",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const scope = scopeWhere(model, clubId);

          switch (operation) {
            case "findFirst":
            case "findFirstOrThrow":
            case "findMany":
            case "count":
            case "aggregate":
            case "groupBy":
            case "deleteMany":
              return query(scopeNonUnique(args, scope));

            case "updateMany":
              await assertForeignKeysOwned(clubId, args.data);
              return query(scopeNonUnique(args, scope));

            case "findUnique":
            case "findUniqueOrThrow":
            case "delete":
              return query(scopeUnique(args, scope));

            case "update":
              await assertForeignKeysOwned(clubId, args.data);
              return query(scopeUnique(args, scope));

            case "upsert":
              await assertForeignKeysOwned(clubId, args.create, args.update);
              return query({ ...scopeUnique(args, scope), create: withClub(model, clubId, args.create) });

            case "create":
              await assertForeignKeysOwned(clubId, args.data);
              return query({ ...args, data: withClub(model, clubId, args.data) });

            case "createMany":
            case "createManyAndReturn": {
              const rows = asArray(args.data);
              await assertForeignKeysOwned(clubId, rows);
              return query({ ...args, data: rows.map((row) => withClub(model, clubId, row)) });
            }

            default:
              throw new Error(`Opération non gérée par l'isolation multi-tenant : ${operation}`);
          }
        },
      },
    },
  });

  cache.set(clubId, client);
  return client;
}
