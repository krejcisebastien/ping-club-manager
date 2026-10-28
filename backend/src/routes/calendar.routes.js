import { Router } from "express";
import { randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { tenantClient } from "../lib/tenant.js";
import { getLicense } from "../lib/license.js";
import { requireAuth } from "../middleware/auth.js";
import { calendarEvents, buildCalendar } from "../lib/calendar.js";

const router = Router();

// Flux iCal lu par Google/Apple/Outlook, sans session : le jeton secret de
// l'URL identifie le compte (réinitialisable depuis « Mon compte »).
router.get("/:token.ics", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { calendarToken: req.params.token },
    include: { club: { select: { name: true } }, players: { select: { playerId: true } } },
  });
  if (!user || !user.isActive) return res.status(404).send("Calendrier introuvable.");

  // Licence échue : le calendrier reste valide mais vide, plutôt qu'en erreur
  // dans l'agenda de l'utilisateur.
  const license = await getLicense(user.clubId);
  const events = license.active
    ? await calendarEvents(tenantClient(user.clubId), { coachId: user.coachId, playerIds: user.players.map((p) => p.playerId) })
    : [];

  res.set("Content-Type", "text/calendar; charset=utf-8");
  res.set("Content-Disposition", 'inline; filename="pingdesk.ics"');
  res.set("Cache-Control", "no-cache");
  res.send(buildCalendar(events, { name: `PingDesk – ${user.club.name}` }));
});

router.use(requireAuth);

const newToken = () => randomBytes(24).toString("hex");

// Jeton du compte connecté, créé au premier appel.
router.get("/link", async (req, res) => {
  const user = await req.db.user.findUnique({ where: { id: req.user.sub }, select: { calendarToken: true } });
  if (!user) return res.status(404).json({ error: "Compte introuvable." });
  if (user.calendarToken) return res.json({ token: user.calendarToken });
  const updated = await req.db.user.update({ where: { id: req.user.sub }, data: { calendarToken: newToken() } });
  res.json({ token: updated.calendarToken });
});

// Nouveau jeton : l'ancienne URL cesse de fonctionner (lien partagé par erreur).
router.post("/link/reset", async (req, res) => {
  const updated = await req.db.user.update({ where: { id: req.user.sub }, data: { calendarToken: newToken() } });
  res.json({ token: updated.calendarToken });
});

export default router;
