import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { sendPushToTokens } from "../lib/push.js";

const router = Router();

// Phase 1 : l'envoi de notifications est limité à ce compte, en dur (pas une
// permission générale). À retirer/étendre quand la fonctionnalité est validée.
const ALLOWED_SENDERS = ["seb.krejci@live.com"];

router.use(requireAuth);

const PLATFORMS = ["ios", "android"];

// Enregistre le jeton de l'appareil courant pour ce compte (idempotent : un même
// jeton réenregistré, y compris par un autre compte après réinstallation, est
// simplement réattribué).
router.post("/register", async (req, res) => {
  const { token, platform } = req.body ?? {};
  if (!token || !PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `token et platform (${PLATFORMS.join("|")}) sont requis.` });
  }
  await req.db.pushToken.upsert({
    where: { token },
    create: { token, platform, userId: req.user.sub },
    update: { platform, userId: req.user.sub },
  });
  res.status(204).end();
});

// Désenregistre un appareil (déconnexion).
router.delete("/register", async (req, res) => {
  const { token } = req.body ?? {};
  if (!token) return res.status(400).json({ error: "token est requis." });
  await req.db.pushToken.deleteMany({ where: { token, userId: req.user.sub } });
  res.status(204).end();
});

// Envoie un rappel à tous les appareils du compte courant. Réservé à
// ALLOWED_SENDERS : un compte hors liste reçoit 403, quels que soient ses rôles.
router.post("/reminder", async (req, res) => {
  if (!ALLOWED_SENDERS.includes(req.user.email)) {
    return res.status(403).json({ error: "Cette fonctionnalité est en phase de test, réservée à un compte précis." });
  }

  const tokens = await req.db.pushToken.findMany({ where: { userId: req.user.sub } });
  if (!tokens.length) {
    return res.status(400).json({ error: "Aucun appareil enregistré pour recevoir des notifications sur ce compte." });
  }

  try {
    const { successCount, invalidTokens } = await sendPushToTokens(
      tokens.map((t) => t.token),
      { title: "Ping Club Manager", body: req.body?.message || "Rappel" }
    );
    if (invalidTokens.length) {
      await req.db.pushToken.deleteMany({ where: { token: { in: invalidTokens } } });
    }
    res.json({ sent: successCount, removed: invalidTokens.length });
  } catch (err) {
    if (err.code === "PUSH_NOT_CONFIGURED") return res.status(503).json({ error: err.message });
    throw err;
  }
});

export default router;
