import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { licenseState, invalidateLicense } from "../lib/license.js";
import { extendLicense, parseDay, createClubWithAdmin } from "../lib/clubs.js";
import { uniqueSlug } from "../utils/slug.js";
import { requireAuthAnyLicense, requirePlatformAdmin } from "../middleware/auth.js";

const router = Router();

// Réservé au propriétaire de la plateforme. N'expose que des métadonnées de
// gestion (nom, licence, effectifs) : jamais de données personnelles de club.
router.use(requireAuthAnyLicense, requirePlatformAdmin);

const include = { _count: { select: { users: true, players: true } } };

const summary = (club) => {
  const license = licenseState(club);
  return {
    id: club.id,
    name: club.name,
    slug: club.slug,
    createdAt: club.createdAt,
    licenseEndsAt: club.licenseEndsAt,
    license: license.status,
    daysLeft: license.daysLeft,
    stripe: !!club.stripeCustomerId,
    users: club._count.users,
    players: club._count.players,
  };
};

router.get("/clubs", async (req, res) => {
  const clubs = await prisma.club.findMany({ orderBy: { createdAt: "asc" }, include });
  res.json({ clubs: clubs.map(summary) });
});

router.post("/clubs", async (req, res) => {
  const name = req.body?.name?.trim();
  const email = req.body?.adminEmail?.trim();
  const password = req.body?.adminPassword;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nom du club, email et mot de passe de l'administrateur requis." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
  }
  let licenseEndsAt = null;
  if (req.body?.licenseEndsAt) {
    licenseEndsAt = parseDay(req.body.licenseEndsAt);
    if (!licenseEndsAt) return res.status(400).json({ error: "Date de licence invalide (AAAA-MM-JJ)." });
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
  }
  const club = await createClubWithAdmin(prisma, { name, slug: await uniqueSlug(name), email, password, licenseEndsAt });
  res.status(201).json({ club: summary(await prisma.club.findUnique({ where: { id: club.id }, include })) });
});

// { name?, licenseEndsAt? ("AAAA-MM-JJ", ou null pour retirer la licence), addYears? }
router.put("/clubs/:id", async (req, res) => {
  const { name, licenseEndsAt, addYears } = req.body ?? {};
  const club = await prisma.club.findUnique({ where: { id: req.params.id } });
  if (!club) return res.status(404).json({ error: "Club introuvable." });

  const data = {};
  if (name !== undefined) {
    if (!name?.trim()) return res.status(400).json({ error: "Le nom du club ne peut pas être vide." });
    data.name = name.trim();
  }
  if (licenseEndsAt !== undefined && addYears !== undefined) {
    return res.status(400).json({ error: "Fournir licenseEndsAt ou addYears, pas les deux." });
  }
  if (licenseEndsAt !== undefined) {
    data.licenseEndsAt = licenseEndsAt === null ? null : parseDay(licenseEndsAt);
    if (licenseEndsAt !== null && !data.licenseEndsAt) {
      return res.status(400).json({ error: "Date de licence invalide (AAAA-MM-JJ)." });
    }
  }
  if (addYears !== undefined) {
    if (!Number.isInteger(addYears) || addYears < 1 || addYears > 10) {
      return res.status(400).json({ error: "addYears doit être un entier entre 1 et 10." });
    }
    data.licenseEndsAt = extendLicense(club.licenseEndsAt, addYears);
  }

  const updated = await prisma.club.update({ where: { id: club.id }, data, include });
  invalidateLicense(club.id);
  res.json({ club: summary(updated) });
});

export default router;
