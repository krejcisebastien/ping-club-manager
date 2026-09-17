import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const { category } = req.query;
  const exercises = await prisma.exercise.findMany({
    where: category ? { category } : undefined,
    orderBy: { title: "asc" },
  });
  res.json({ exercises });
});

router.get("/:id", async (req, res) => {
  const exercise = await prisma.exercise.findUnique({ where: { id: req.params.id } });
  if (!exercise) return res.status(404).json({ error: "Exercice introuvable." });
  res.json({ exercise });
});

router.post("/", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { title, description, category, difficulty } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "title est requis." });
  const exercise = await prisma.exercise.create({
    data: { title, description, category, difficulty, createdById: req.user.coachId ?? null },
  });
  res.status(201).json({ exercise });
});

router.put("/:id", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { title, description, category, difficulty } = req.body ?? {};
  try {
    const exercise = await prisma.exercise.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(difficulty !== undefined && { difficulty }),
      },
    });
    res.json({ exercise });
  } catch {
    res.status(404).json({ error: "Exercice introuvable." });
  }
});

router.delete("/:id", requireRole("ADMIN", "COACH"), async (req, res) => {
  try {
    await prisma.exercise.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Exercice introuvable." });
  }
});

export default router;
