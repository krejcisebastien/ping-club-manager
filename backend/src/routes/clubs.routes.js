import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../utils/password.js";
import { createSession } from "../utils/session.js";
import { uniqueSlug } from "../utils/slug.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { isPlatformAdmin } from "../lib/platform.js";

const router = Router();

// Désactivé par défaut : à activer explicitement (ALLOW_CLUB_SIGNUP=true).
const signupEnabled = () => process.env.ALLOW_CLUB_SIGNUP === "true";

router.get("/signup", (req, res) => {
  res.json({ enabled: signupEnabled() });
});

// Création d'un club en libre-service : crée le club et son premier
// administrateur, et ouvre directement sa session.
router.post(
  "/signup",
  (req, res, next) => (signupEnabled() ? next() : res.status(404).json({ error: "Route introuvable." })),
  rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }),
  async (req, res) => {
    const clubName = req.body?.clubName?.trim();
    const email = req.body?.email?.trim();
    const { password } = req.body ?? {};
    if (!clubName || !email || !password) {
      return res.status(400).json({ error: "Nom du club, email et mot de passe requis." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
    }
    if (isPlatformAdmin(email) || (await prisma.user.findUnique({ where: { email } }))) {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
    }

    const club = await prisma.club.create({
      data: {
        name: clubName,
        slug: await uniqueSlug(clubName),
        users: { create: { email, passwordHash: await hashPassword(password), roles: ["ADMIN"] } },
      },
      include: { users: { include: { players: { select: { playerId: true } }, club: { select: { name: true } } } } },
    });
    res.status(201).json(createSession(club.users[0]));
  }
);

export default router;
