// Fil d'échanges d'un joueur : qui peut le lire et y écrire, et qui prévenir.
// Le joueur (ou ses parents), les entraineurs de ses groupes actuels et le
// responsable de la cellule entrainement. Jamais d'échange privé : tous voient
// tout le fil.

// Entraineurs des groupes auxquels le joueur est affecté aujourd'hui.
export async function playerCoachIds(db, playerId) {
  const now = new Date();
  const assignments = await db.playerGroupAssignment.findMany({
    where: { playerId, startDate: { lte: now }, OR: [{ endDate: null }, { endDate: { gte: now } }] },
    select: { groupId: true },
  });
  if (!assignments.length) return [];
  const links = await db.trainingCoach.findMany({
    where: { training: { groupId: { in: assignments.map((a) => a.groupId) } }, coachId: { not: null } },
    select: { coachId: true },
  });
  return [...new Set(links.map((l) => l.coachId))];
}

// Rôle du compte connecté dans le fil de ce joueur : "player" (le joueur ou
// un parent), "manager" (responsable de cellule), "coach" (entraineur du
// joueur), ou null (pas d'accès). `side` ("PLAYER" ou "STAFF") : l'écran
// d'où vient la requête, pour un compte à la fois parent et entraineur.
export async function messageAccess(req, playerId, side) {
  const { user } = req;
  const isFamily = user.roles?.includes("PLAYER") && user.playerIds?.includes(playerId);
  if (side !== "STAFF" && isFamily) return "player";
  if (side === "PLAYER" || !user.coachId || !user.roles?.includes("COACH")) return null;
  const coach = await req.db.coach.findUnique({ where: { id: user.coachId }, select: { isTrainingManager: true } });
  if (!coach) return null;
  if (coach.isTrainingManager) return "manager";
  return (await playerCoachIds(req.db, playerId)).includes(user.coachId) ? "coach" : null;
}

// Comptes des entraineurs du joueur et du responsable de cellule.
export async function staffUserIdsForPlayer(db, playerId) {
  const coachIds = await playerCoachIds(db, playerId);
  const users = await db.user.findMany({
    where: { roles: { has: "COACH" }, OR: [{ coachId: { in: coachIds } }, { coach: { isTrainingManager: true } }] },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

// Nom affiché pour l'auteur d'un message : côté joueur, toujours le joueur
// (même écrit par un parent : le message lui appartient et le suit quand il a
// son propre compte) ; côté entraineur, l'entraineur.
export function authorName(message, player) {
  if (message.authorSide === "PLAYER") return `${player.firstName} ${player.lastName}`;
  const coach = message.author.coach;
  return coach ? `${coach.firstName} ${coach.lastName}` : "Entraineur";
}
