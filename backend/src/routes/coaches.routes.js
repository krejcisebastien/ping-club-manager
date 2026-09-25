import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { COACH_LEVELS } from "../lib/rankings.js";
import { isValidIban, normalizeIban } from "../lib/iban.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const coaches = await req.db.coach.findMany({ orderBy: { lastName: "asc" } });
  res.json({ coaches });
});

router.get("/:id", async (req, res) => {
  const coach = await req.db.coach.findUnique({ where: { id: req.params.id } });
  if (!coach) return res.status(404).json({ error: "Entraineur introuvable." });
  res.json({ coach });
});

const invalidIban = (iban) => !!iban && !isValidIban(iban);
const invalidLevel = (level) => level !== undefined && level !== null && !COACH_LEVELS.includes(level);

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const { firstName, lastName, email, phone, level, address, iban } = req.body ?? {};
  if (!firstName || !lastName) {
    return res.status(400).json({ error: "firstName et lastName sont requis." });
  }
  if (invalidLevel(level)) return res.status(400).json({ error: `level doit être l'un de : ${COACH_LEVELS.join(", ")}.` });
  if (invalidIban(iban)) return res.status(400).json({ error: "IBAN invalide." });
  try {
    // Chaîne vide -> null : Postgres n'applique la contrainte unique qu'entre valeurs
    // non nulles, donc plusieurs entraineurs sans email ne doivent pas être bloqués.
    const coach = await req.db.coach.create({ data: { firstName, lastName, email: email || null, phone, level: level ?? null, address: address || null, iban: iban ? normalizeIban(iban) : null } });
    res.status(201).json({ coach });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Un entraineur existe déjà avec cet email." });
    }
    throw err;
  }
});

router.put("/:id", requireRole("ADMIN"), async (req, res) => {
  const { firstName, lastName, email, phone, level, address, iban } = req.body ?? {};
  if (invalidLevel(level)) return res.status(400).json({ error: `level doit être l'un de : ${COACH_LEVELS.join(", ")}.` });
  if (invalidIban(iban)) return res.status(400).json({ error: "IBAN invalide." });
  try {
    const coach = await req.db.coach.update({
      where: { id: req.params.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone }),
        ...(level !== undefined && { level }),
        ...(address !== undefined && { address: address || null }),
        ...(iban !== undefined && { iban: iban ? normalizeIban(iban) : null }),
      },
    });
    res.json({ coach });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Un entraineur existe déjà avec cet email." });
    }
    res.status(404).json({ error: "Entraineur introuvable." });
  }
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await req.db.coach.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Entraineur introuvable." });
  }
});

export default router;
