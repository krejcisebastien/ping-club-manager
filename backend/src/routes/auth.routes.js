import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signToken } from "../utils/jwt.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { players: { select: { playerId: true } } },
  });
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
    roles: user.roles,
    playerIds: user.players.map((p) => p.playerId),
    coachId: user.coachId,
  };
  const token = signToken(payload);
  res.json({ user: payload, token });
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
    const user = await prisma.user.create({
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
      await prisma.userPlayer.deleteMany({ where: { userId: req.params.id } });
      data.players = { create: playerIds.map((playerId) => ({ playerId })) };
    }

    const user = await prisma.user.update({
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
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Compte introuvable." });
  }
});

export default router;
