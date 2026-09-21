import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

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
  const { title, description, category, difficulty, illustrationUrl, diagram } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "title est requis." });
  const exercise = await req.db.exercise.create({
    data: { title, description, category, difficulty, illustrationUrl, diagram, createdById: req.user.coachId ?? null },
  });
  res.status(201).json({ exercise });
});

router.put("/:id", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { title, description, category, difficulty, illustrationUrl, diagram } = req.body ?? {};
  try {
    const exercise = await req.db.exercise.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(difficulty !== undefined && { difficulty }),
        ...(illustrationUrl !== undefined && { illustrationUrl }),
        ...(diagram !== undefined && { diagram }),
      },
    });
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
