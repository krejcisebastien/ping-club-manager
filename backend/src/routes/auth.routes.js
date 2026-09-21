import { Router } from "express";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { createSession } from "../utils/session.js";
import { sendEmail } from "../utils/email.js";
import { requireAuth, requireAuthAnyLicense, requireRole } from "../middleware/auth.js";

const router = Router();

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
const FRONTEND_URL = process.env.CORS_ORIGIN || "http://localhost:5173";

function hashResetToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { players: { select: { playerId: true } }, club: { select: { name: true } } },
  });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: "Identifiants invalides." });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Identifiants invalides." });
  }

  res.json(createSession(user));
});

router.get("/me", requireAuthAnyLicense, (req, res) => {
  res.json({ user: req.user });
});

// Toujours une réponse générique : on ne révèle pas si l'email existe.
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body ?? {};
  if (!email) {
    return res.status(400).json({ error: "Email requis." });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.isActive) {
    const token = randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash: hashResetToken(token), resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });
    const link = `${FRONTEND_URL}/reset-password?token=${token}`;
    try {
      await sendEmail({
        to: user.email,
        subject: "Réinitialisation de votre mot de passe",
        html: `<p>Vous avez demandé la réinitialisation de votre mot de passe.</p><p><a href="${link}">Choisir un nouveau mot de passe</a></p><p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
      });
    } catch (err) {
      console.error("Échec de l'envoi de l'email de réinitialisation :", err);
    }
  }

  res.json({ message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." });
});

router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body ?? {};
  if (!token || !password) {
    return res.status(400).json({ error: "Jeton et nouveau mot de passe requis." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
  }

  const user = await prisma.user.findFirst({
    where: { resetTokenHash: hashResetToken(token), resetTokenExpiresAt: { gt: new Date() } },
  });
  if (!user) {
    return res.status(400).json({ error: "Ce lien de réinitialisation est invalide ou a expiré." });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), resetTokenHash: null, resetTokenExpiresAt: null },
  });
  res.json({ message: "Mot de passe mis à jour." });
});

router.put("/change-password", requireAuthAnyLicense, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Mot de passe actuel et nouveau mot de passe requis." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
  }

  const user = await req.db.user.findUnique({ where: { id: req.user.sub } });
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: "Mot de passe actuel incorrect." });
  }

  await req.db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  res.json({ message: "Mot de passe mis à jour." });
});

// ---------- Gestion des comptes utilisateurs (admin uniquement) ----------

router.get("/users", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const users = await req.db.user.findMany({
    select: {
      id: true,
      email: true,
      roles: true,
      isActive: true,
      createdAt: true,
      players: { select: { player: { select: { id: true, firstName: true, lastName: true } } } },
      coach: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({
    users: users.map((u) => ({ ...u, players: u.players.map((p) => p.player) })),
  });
});

// Création d'un compte utilisateur (admin uniquement) — lié à un ou plusieurs joueurs
// (ex. compte familial) ou à un entraineur existant.
router.post("/users", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { email, password, roles, playerIds, coachId } = req.body ?? {};
  if (!email || !password || !Array.isArray(roles) || !roles.length) {
    return res.status(400).json({ error: "Email, mot de passe et au moins un rôle sont requis." });
  }
  if (roles.some((r) => !["ADMIN", "COACH", "PLAYER"].includes(r))) {
    return res.status(400).json({ error: "Rôle invalide." });
  }
  if (roles.includes("PLAYER") && !(Array.isArray(playerIds) && playerIds.length)) {
    return res.status(400).json({ error: "Au moins un joueur requis pour un compte joueur." });
  }
  if (roles.includes("COACH") && !coachId) {
    return res.status(400).json({ error: "coachId requis pour un compte entraineur." });
  }

  const passwordHash = await hashPassword(password);
  try {
    const user = await req.db.user.create({
      data: {
        email,
        passwordHash,
        roles,
        coachId: roles.includes("COACH") ? coachId : null,
        players:
          roles.includes("PLAYER")
            ? { create: playerIds.map((playerId) => ({ playerId })) }
            : undefined,
      },
      select: {
        id: true,
        email: true,
        roles: true,
        coachId: true,
        isActive: true,
        players: { select: { playerId: true } },
      },
    });
    res.status(201).json({ user: { ...user, playerIds: user.players.map((p) => p.playerId) } });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email, ou un joueur est déjà rattaché à ce compte." });
    }
    throw err;
  }
});

router.put("/users/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { isActive, password, roles, playerIds, coachId } = req.body ?? {};
  if (roles !== undefined) {
    if (!Array.isArray(roles) || !roles.length || roles.some((r) => !["ADMIN", "COACH", "PLAYER"].includes(r))) {
      return res.status(400).json({ error: "Au moins un rôle valide est requis." });
    }
    if (roles.includes("COACH") && !coachId) {
      return res.status(400).json({ error: "coachId requis pour un compte entraineur." });
    }
    if (roles.includes("PLAYER") && !(Array.isArray(playerIds) && playerIds.length)) {
      return res.status(400).json({ error: "Au moins un joueur requis pour un compte joueur." });
    }
  }

  try {
    const data = {};
    if (isActive !== undefined) data.isActive = isActive;
    if (password) data.passwordHash = await hashPassword(password);
    if (roles !== undefined) {
      data.roles = roles;
      data.coachId = roles.includes("COACH") ? coachId : null;
    }

    if (Array.isArray(playerIds)) {
      await req.db.userPlayer.deleteMany({ where: { userId: req.params.id } });
      data.players = { create: playerIds.map((playerId) => ({ playerId })) };
    }

    const user = await req.db.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, roles: true, coachId: true, isActive: true, players: { select: { playerId: true } } },
    });
    res.json({ user: { ...user, playerIds: user.players.map((p) => p.playerId) } });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Cet entraineur est déjà rattaché à un autre compte." });
    }
    res.status(404).json({ error: "Compte introuvable." });
  }
});

router.delete("/users/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    await req.db.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Compte introuvable." });
  }
});

export default router;
