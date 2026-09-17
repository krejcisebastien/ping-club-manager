import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signToken } from "../utils/jwt.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 8 * 60 * 60 * 1000,
};

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: "Identifiants invalides." });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Identifiants invalides." });
  }

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    playerId: user.playerId,
    coachId: user.coachId,
  };
  const token = signToken(payload);
  res.cookie("token", token, COOKIE_OPTIONS);
  res.json({ user: payload });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.status(204).end();
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ---------- Gestion des comptes utilisateurs (admin uniquement) ----------

router.get("/users", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      player: { select: { id: true, firstName: true, lastName: true } },
      coach: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ users });
});

// Création d'un compte utilisateur (admin uniquement) — lié à un joueur ou un entraineur existant.
router.post("/users", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { email, password, role, playerId, coachId } = req.body ?? {};
  if (!email || !password || !role) {
    return res.status(400).json({ error: "Email, mot de passe et rôle requis." });
  }
  if (!["ADMIN", "COACH", "PLAYER"].includes(role)) {
    return res.status(400).json({ error: "Rôle invalide." });
  }
  if (role === "PLAYER" && !playerId) {
    return res.status(400).json({ error: "playerId requis pour un compte joueur." });
  }
  if (role === "COACH" && !coachId) {
    return res.status(400).json({ error: "coachId requis pour un compte entraineur." });
  }

  const passwordHash = await hashPassword(password);
  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        playerId: role === "PLAYER" ? playerId : null,
        coachId: role === "COACH" ? coachId : null,
      },
      select: { id: true, email: true, role: true, playerId: true, coachId: true, isActive: true },
    });
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email ou pour ce joueur/entraineur." });
    }
    throw err;
  }
});

router.put("/users/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { isActive, password } = req.body ?? {};
  try {
    const data = {};
    if (isActive !== undefined) data.isActive = isActive;
    if (password) data.passwordHash = await hashPassword(password);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, role: true, isActive: true },
    });
    res.json({ user });
  } catch {
    res.status(404).json({ error: "Compte introuvable." });
  }
});

router.delete("/users/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Compte introuvable." });
  }
});

export default router;
