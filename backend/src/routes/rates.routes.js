import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { COACH_LEVELS, SERIES } from "../lib/rankings.js";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

const CODES = { COACH_LEVEL: COACH_LEVELS, SPARRING_SERIES: SERIES };
const BASES = ["HOUR", "SESSION"];

// Tous les tarifs du club, y compris ceux pas encore renseignés (montants null).
router.get("/", async (req, res) => {
  const stored = await req.db.hourlyRate.findMany();
  const byKey = new Map(stored.map((r) => [`${r.category}:${r.code}`, r]));
  const rates = Object.entries(CODES).flatMap(([category, codes]) =>
    codes.map((code) => {
      const r = byKey.get(`${category}:${code}`);
      return {
        category,
        code,
        hourlyRate: r?.hourlyRate == null ? null : Number(r.hourlyRate),
        sessionRate: r?.sessionRate == null ? null : Number(r.sessionRate),
        basis: r?.basis ?? "HOUR",
      };
    })
  );
  res.json({ rates });
});

const validAmount = (value) => value === null || value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 9999);

// Enregistre : { rates: [{ category, code, hourlyRate, sessionRate, basis }] }.
// Une ligne sans aucun montant est supprimée.
router.put("/", async (req, res) => {
  const { rates } = req.body ?? {};
  if (!Array.isArray(rates)) return res.status(400).json({ error: "rates doit être un tableau." });

  for (const r of rates) {
    if (!CODES[r.category]?.includes(r.code)) return res.status(400).json({ error: `Tarif inconnu : ${r.category} / ${r.code}.` });
    if (!validAmount(r.hourlyRate) || !validAmount(r.sessionRate)) return res.status(400).json({ error: `Montant invalide pour ${r.code}.` });
    if (r.basis !== undefined && !BASES.includes(r.basis)) return res.status(400).json({ error: `basis doit être l'un de : ${BASES.join(", ")}.` });
  }

  for (const { category, code, hourlyRate, sessionRate, basis } of rates) {
    const hourly = hourlyRate ?? null;
    const session = sessionRate ?? null;
    if (hourly === null && session === null) {
      await req.db.hourlyRate.deleteMany({ where: { category, code } });
      continue;
    }
    await req.db.hourlyRate.upsert({
      where: { clubId_category_code: { clubId: req.user.clubId, category, code } },
      create: { category, code, hourlyRate: hourly, sessionRate: session, basis: basis ?? "HOUR" },
      update: { hourlyRate: hourly, sessionRate: session, ...(basis !== undefined && { basis }) },
    });
  }
  res.status(204).end();
});

export default router;
