import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

const EXERCISE_FIELDS = [
  "title", "description", "category", "difficulty", "diagram",
  "intensity", "skills", "objective", "instructions",
  "successCriteria", "easierVariant", "harderVariant", "competitionVariant",
];

router.get("/", async (req, res) => {
  const { category, difficulty } = req.query;
  const exercises = await req.db.exercise.findMany({
    where: { ...(category && { category }), ...(difficulty && { difficulty }) },
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

router.delete("/:id", requireRole("ADMIN", "COACH"), async (req, res) => {
  try {
    await req.db.exercise.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Exercice introuvable." });
  }
});

export default router;
