import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { COACH_LEVELS, SERIES } from "../lib/rankings.js";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

const CODES = { COACH_LEVEL: COACH_LEVELS, SPARRING_SERIES: SERIES };

// Tous les tarifs du club, y compris ceux pas encore renseignés (hourlyRate: null).
router.get("/", async (req, res) => {
  const stored = await req.db.hourlyRate.findMany();
  const byKey = new Map(stored.map((r) => [`${r.category}:${r.code}`, Number(r.hourlyRate)]));
  const rates = Object.entries(CODES).flatMap(([category, codes]) =>
    codes.map((code) => ({ category, code, hourlyRate: byKey.get(`${category}:${code}`) ?? null }))
  );
  res.json({ rates });
});

// Enregistre : { rates: [{ category, code, hourlyRate }] } — un tarif vide le supprime.
router.put("/", async (req, res) => {
  const { rates } = req.body ?? {};
  if (!Array.isArray(rates)) return res.status(400).json({ error: "rates doit être un tableau." });

  for (const r of rates) {
    if (!CODES[r.category]?.includes(r.code)) return res.status(400).json({ error: `Tarif inconnu : ${r.category} / ${r.code}.` });
    const value = r.hourlyRate;
    if (value !== null && value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 9999)) {
      return res.status(400).json({ error: `Montant invalide pour ${r.code}.` });
    }
  }

  for (const { category, code, hourlyRate } of rates) {
    if (hourlyRate === null || hourlyRate === undefined) {
      await req.db.hourlyRate.deleteMany({ where: { category, code } });
    } else {
      await req.db.hourlyRate.upsert({
        where: { clubId_category_code: { clubId: req.user.clubId, category, code } },
        create: { category, code, hourlyRate },
        update: { hourlyRate },
      });
    }
  }
  res.status(204).end();
});

export default router;
