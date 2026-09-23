import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import exerciseLibrary from "../data/exercise-library.json" with { type: "json" };

const router = Router();

router.use(requireAuth);

const EXERCISE_FIELDS = [
  "title", "description", "category", "difficulty", "illustrationUrl", "diagram",
  "intensity", "levelMin", "levelMax", "skills", "objective", "instructions",
  "successCriteria", "easierVariant", "harderVariant", "competitionVariant",
];

router.get("/", async (req, res) => {
  const { category } = req.query;
  const exercises = await req.db.exercise.findMany({
    where: category ? { category } : undefined,
    orderBy: { title: "asc" },
  });
  res.json({ exercises });
});

router.get("/:id", async (req, res) => {
  const exercise = await req.db.exercise.findUnique({ where: { id: req.params.id } });
  if (!exercise) return res.status(404).json({ error: "Exercice introuvable." });
  res.json({ exercise });
});

router.post("/", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { title } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "title est requis." });
  const data = {};
  for (const field of EXERCISE_FIELDS) if (req.body[field] !== undefined) data[field] = req.body[field];
  const exercise = await req.db.exercise.create({
    data: { ...data, title, createdById: req.user.coachId ?? null },
  });
  res.status(201).json({ exercise });
});

router.put("/:id", requireRole("ADMIN", "COACH"), async (req, res) => {
  const data = {};
  for (const field of EXERCISE_FIELDS) if (req.body[field] !== undefined) data[field] = req.body[field];
  try {
    const exercise = await req.db.exercise.update({ where: { id: req.params.id }, data });
    res.json({ exercise });
  } catch {
    res.status(404).json({ error: "Exercice introuvable." });
  }
});

// Importe la bibliothèque standard d'exercices dans le club. Idempotent :
// les exercices déjà importés (même sourceCode) sont ignorés.
router.post("/import-library", requireRole("ADMIN", "COACH"), async (req, res) => {
  const existing = await req.db.exercise.findMany({
    where: { sourceCode: { in: exerciseLibrary.map((e) => e.id) } },
    select: { sourceCode: true },
  });
  const alreadyImported = new Set(existing.map((e) => e.sourceCode));
  const toImport = exerciseLibrary.filter((e) => !alreadyImported.has(e.id));

  for (const item of toImport) {
    await req.db.exercise.create({
      data: {
        title: item.nom,
        category: item.categorie,
        difficulty: item.difficulte ?? null,
        intensity: item.intensite ?? null,
        levelMin: item.niveauMin ?? null,
        levelMax: item.niveauMax ?? null,
        skills: item.fonctionnalites ?? null,
        objective: item.objectif ?? null,
        instructions: item.consignes ?? null,
        successCriteria: item.criteresReussite ?? null,
        easierVariant: item.varianteFacile ?? null,
        harderVariant: item.varianteDifficile ?? null,
        competitionVariant: item.varianteCompetition ?? null,
        sourceCode: item.id,
        createdById: req.user.coachId ?? null,
      },
    });
  }

  res.status(201).json({ imported: toImport.length, skipped: exerciseLibrary.length - toImport.length });
});

router.delete("/:id", requireRole("ADMIN", "COACH"), async (req, res) => {
  try {
    await req.db.exercise.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Exercice introuvable." });
  }
});

export default router;
