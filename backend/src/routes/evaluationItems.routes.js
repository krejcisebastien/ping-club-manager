import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { CRITERION_VALUES } from "../lib/evaluation.js";

// Grille d'évaluation du club : points d'évaluation par critère, gérés par les
// entraineurs et les admins. Supprimer ou renommer un point ne change pas les
// évaluations passées (libellé et note y sont recopiés).
const router = Router();

router.use(requireAuth, requireRole("ADMIN", "COACH"));

const MAX_LABEL = 200;
const MAX_DESCRIPTION = 500;
const cleanLabel = (label) => (typeof label === "string" ? label.trim() : "");
// Description facultative : texte nettoyé, vide -> null, undefined = non fournie.
const cleanDescription = (d) => (d === undefined ? undefined : typeof d === "string" && d.trim() ? d.trim() : null);

router.get("/", async (req, res) => {
  const items = await req.db.evaluationItem.findMany({ orderBy: [{ criterion: "asc" }, { position: "asc" }, { createdAt: "asc" }] });
  res.json({ items });
});

router.post("/", async (req, res) => {
  const { criterion } = req.body ?? {};
  const label = cleanLabel(req.body?.label);
  const description = cleanDescription(req.body?.description);
  if (!CRITERION_VALUES.includes(criterion)) return res.status(400).json({ error: "Critère inconnu." });
  if (!label || label.length > MAX_LABEL) return res.status(400).json({ error: `Le libellé est requis (${MAX_LABEL} caractères max).` });
  if (description && description.length > MAX_DESCRIPTION) return res.status(400).json({ error: `La description est limitée à ${MAX_DESCRIPTION} caractères.` });
  const last = await req.db.evaluationItem.findFirst({ where: { criterion }, orderBy: { position: "desc" } });
  const item = await req.db.evaluationItem.create({ data: { criterion, label, description: description ?? null, position: (last?.position ?? -1) + 1 } });
  res.status(201).json({ item });
});

router.put("/:id", async (req, res) => {
  const label = cleanLabel(req.body?.label);
  const description = cleanDescription(req.body?.description);
  if (!label || label.length > MAX_LABEL) return res.status(400).json({ error: `Le libellé est requis (${MAX_LABEL} caractères max).` });
  if (description && description.length > MAX_DESCRIPTION) return res.status(400).json({ error: `La description est limitée à ${MAX_DESCRIPTION} caractères.` });
  try {
    const item = await req.db.evaluationItem.update({
      where: { id: req.params.id },
      data: { label, ...(description !== undefined && { description }) },
    });
    res.json({ item });
  } catch {
    res.status(404).json({ error: "Point d'évaluation introuvable." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await req.db.evaluationItem.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Point d'évaluation introuvable." });
  }
});

export default router;
