import { sendPushToTokens } from "./push.js";

// Notifications automatiques liées aux séances d'entrainement : envoyées en
// arrière-plan après la réponse (jamais bloquantes ni en erreur pour l'auteur
// de la modification), uniquement aux comptes ayant activé les notifications.

let sender = sendPushToTokens;
// Tests : remplace l'envoi FCM par un enregistreur.
export function setPushSender(fn) {
  sender = fn ?? sendPushToTokens;
}

export async function notifyUsers(db, userIds, message) {
  const ids = [...new Set(userIds)];
  if (!ids.length) return;
  const tokens = await db.pushToken.findMany({ where: { userId: { in: ids }, user: { isActive: true } } });
  if (!tokens.length) return;
  try {
    const { invalidTokens } = await sender(
      tokens.map((t) => t.token),
      message,
    );
    if (invalidTokens?.length) await db.pushToken.deleteMany({ where: { token: { in: invalidTokens } } });
  } catch (err) {
    if (err.code !== "PUSH_NOT_CONFIGURED") console.error("Échec de l'envoi des notifications :", err);
  }
}

// Lance l'envoi sans attendre ni propager d'erreur.
export function notifyInBackground(db, userIdsPromise, message) {
  Promise.resolve(userIdsPromise)
    .then((ids) => notifyUsers(db, ids, message))
    .catch((err) => console.error("Échec de l'envoi des notifications :", err));
}

const DAY_FORMAT = new Intl.DateTimeFormat("fr-BE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
export const formatDay = (date) => DAY_FORMAT.format(date);
const day = (date) => date.toISOString().slice(0, 10);

// Séance passée : inutile de prévenir qui que ce soit.
export const isPast = (date) => day(date) < day(new Date());

// Comptes à prévenir pour un encadrant : le compte de l'entraineur, ou ceux
// rattachés au joueur du club qui sert de sparring.
export async function staffUserIds(db, { coachIds = [], sparringIds = [] }) {
  const sparrings = sparringIds.length
    ? await db.sparring.findMany({ where: { id: { in: sparringIds }, playerId: { not: null } }, select: { playerId: true } })
    : [];
  const playerIds = sparrings.map((s) => s.playerId);
  if (!coachIds.length && !playerIds.length) return [];
  const users = await db.user.findMany({
    where: {
      OR: [
        ...(coachIds.length ? [{ coachId: { in: coachIds } }] : []),
        ...(playerIds.length ? [{ players: { some: { playerId: { in: playerIds } } } }] : []),
      ],
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

// Tous les comptes concernés par une séance : encadrants, et joueurs (ou
// parents) du groupe à la date de la séance. `exceptUserId` : l'auteur.
export async function occurrenceUserIds(db, occurrenceId, exceptUserId) {
  const occ = await db.trainingOccurrence.findUnique({
    where: { id: occurrenceId },
    include: { training: true, coaches: true },
  });
  if (!occ) return [];
  const assignments = await db.playerGroupAssignment.findMany({ where: { groupId: occ.training.groupId } });
  const occDay = day(occ.date);
  const playerIds = assignments
    .filter((a) => day(a.startDate) <= occDay && (!a.endDate || day(a.endDate) >= occDay))
    .map((a) => a.playerId);
  const [staff, players] = await Promise.all([
    staffUserIds(db, {
      coachIds: occ.coaches.map((c) => c.coachId).filter(Boolean),
      sparringIds: occ.coaches.map((c) => c.sparringId).filter(Boolean),
    }),
    playerIds.length
      ? db.user.findMany({ where: { players: { some: { playerId: { in: playerIds } } } }, select: { id: true } })
      : [],
  ]);
  return [...staff, ...players.map((u) => u.id)].filter((id) => id !== exceptUserId);
}
