import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { notifyInBackground, playerUserIds } from "../lib/notify.js";
import { authorName, messageAccess, playerCoachIds, staffUserIdsForPlayer } from "../lib/playerMessages.js";

// Monté à la racine de l'API : l'authentification est donc posée route par
// route (un router.use la poserait aussi sur /auth/login).
const router = Router();

const MAX_LENGTH = 2000;

const shorten = (text, max = 140) => {
  const line = String(text).replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

const AUTHOR_INCLUDE = { coach: { select: { firstName: true, lastName: true } } };
const SIDES = ["PLAYER", "STAFF"];
// Écran d'où vient la requête (espace joueur ou entraineur).
const sideOf = (req) => {
  const side = req.query.side ?? req.body?.side;
  return SIDES.includes(side) ? side : undefined;
};
const sideOfAccess = (access) => (access === "player" ? "PLAYER" : "STAFF");

// "Moi" seulement pour les messages écrits dans le rôle de l'écran ouvert. Un
// message côté joueur se supprime depuis tout compte rattaché au joueur ; côté
// entraineur, par son auteur ou le responsable de cellule.
function isMine(message, req, access) {
  const mySide = sideOfAccess(access);
  return message.authorSide === "PLAYER" ? mySide === "PLAYER" : message.authorId === req.user.sub && mySide === "STAFF";
}

function present(message, player, req, access) {
  const mine = isMine(message, req, access);
  return {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt,
    author: { name: authorName(message, player), side: message.authorSide === "PLAYER" ? "player" : "staff", isMe: mine },
    canDelete: mine || access === "manager",
  };
}

// Fils accessibles à l'entraineur connecté : tous pour le responsable de
// cellule, sinon ceux des joueurs de ses groupes. Le plus récent d'abord.
router.get("/player-messages", requireAuth, async (req, res) => {
  if (!req.user.coachId || !req.user.roles?.includes("COACH")) return res.json({ threads: [], isManager: false });
  const coach = await req.db.coach.findUnique({ where: { id: req.user.coachId }, select: { isTrainingManager: true } });
  const isManager = !!coach?.isTrainingManager;
  const latest = await req.db.playerMessage.findMany({
    orderBy: { createdAt: "desc" },
    distinct: ["playerId"],
    include: { player: { select: { id: true, firstName: true, lastName: true } }, author: { include: AUTHOR_INCLUDE } },
  });
  const threads = [];
  for (const m of latest) {
    if (!isManager && !(await playerCoachIds(req.db, m.playerId)).includes(req.user.coachId)) continue;
    const last = present(m, m.player, req, isManager ? "manager" : "coach");
    threads.push({ player: m.player, last: { body: shorten(last.body), createdAt: last.createdAt, author: last.author } });
  }
  res.json({ threads, isManager });
});

router.get("/players/:id/messages", requireAuth, async (req, res) => {
  const access = await messageAccess(req, req.params.id, sideOf(req));
  if (!access) return res.status(403).json({ error: "Accès refusé." });
  const player = await req.db.player.findUnique({ where: { id: req.params.id }, select: { id: true, firstName: true, lastName: true } });
  if (!player) return res.status(404).json({ error: "Joueur introuvable." });
  const messages = await req.db.playerMessage.findMany({
    where: { playerId: player.id },
    orderBy: { createdAt: "asc" },
    include: { author: { include: AUTHOR_INCLUDE } },
  });
  res.json({ player, access, messages: messages.map((m) => present(m, player, req, access)) });
});

router.post("/players/:id/messages", requireAuth, async (req, res) => {
  const access = await messageAccess(req, req.params.id, sideOf(req));
  if (!access) return res.status(403).json({ error: "Accès refusé." });
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (!body) return res.status(400).json({ error: "Le message est vide." });
  if (body.length > MAX_LENGTH) return res.status(400).json({ error: `Le message dépasse ${MAX_LENGTH} caractères.` });
  const player = await req.db.player.findUnique({ where: { id: req.params.id }, select: { id: true, firstName: true, lastName: true } });
  if (!player) return res.status(404).json({ error: "Joueur introuvable." });

  const message = await req.db.playerMessage.create({
    data: { playerId: player.id, authorId: req.user.sub, authorSide: sideOfAccess(access), body },
    include: { author: { include: AUTHOR_INCLUDE } },
  });
  const shown = present(message, player, req, access);
  res.status(201).json({ message: shown });

  // Le joueur écrit : ses entraineurs et le responsable sont prévenus. Un
  // entraineur répond : le joueur et ses parents, plus les autres encadrants
  // qui ont déjà écrit dans le fil.
  const recipients = (async () => {
    if (access === "player") return staffUserIdsForPlayer(req.db, player.id);
    const [family, previous] = await Promise.all([
      playerUserIds(req.db, [player.id]),
      req.db.playerMessage.findMany({ where: { playerId: player.id, authorSide: "STAFF" }, distinct: ["authorId"], select: { authorId: true } }),
    ]);
    const staff = new Set(await staffUserIdsForPlayer(req.db, player.id));
    return [...family, ...previous.map((p) => p.authorId).filter((id) => staff.has(id))];
  })().then((ids) => ids.filter((id) => id !== req.user.sub));
  const title = access === "player" ? `Message de ${player.firstName} ${player.lastName}` : `Réponse de ${shown.author.name}`;
  notifyInBackground(req.db, recipients, { type: "messages", title, body: shorten(body) });
});

router.delete("/players/:id/messages/:messageId", requireAuth, async (req, res) => {
  const access = await messageAccess(req, req.params.id, sideOf(req));
  if (!access) return res.status(403).json({ error: "Accès refusé." });
  const message = await req.db.playerMessage.findFirst({ where: { id: req.params.messageId, playerId: req.params.id } });
  if (!message) return res.status(404).json({ error: "Message introuvable." });
  if (!isMine(message, req, access) && access !== "manager") {
    return res.status(403).json({ error: "Seul l'auteur ou le responsable de la cellule entrainement peut supprimer ce message." });
  }
  await req.db.playerMessage.delete({ where: { id: message.id } });
  res.status(204).end();
});

export default router;
