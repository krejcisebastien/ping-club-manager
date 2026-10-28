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

// Place du compte connecté dans le fil de ce joueur : "player" (le joueur ou
// un parent), "manager" (responsable de cellule), "coach" (entraineur du
// joueur), ou null (pas d'accès).
export async function messageAccess(req, playerId) {
  const { user } = req;
  if (user.roles?.includes("PLAYER") && user.playerIds?.includes(playerId)) return "player";
  if (!user.coachId || !user.roles?.includes("COACH")) return null;
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

// Nom affiché pour l'auteur d'un message : l'entraineur, sinon le joueur
// (ou un parent, qui écrit au nom du joueur).
export function authorName(author, player) {
  if (author.coach) return `${author.coach.firstName} ${author.coach.lastName}`;
  return `${player.firstName} ${player.lastName}`;
}
