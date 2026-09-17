import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const { seasonId } = req.query;
  const plans = await prisma.trainingPlan.findMany({
    where: seasonId ? { seasonId } : undefined,
    include: { coach: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ plans });
});

router.get("/:id", async (req, res) => {
  const plan = await prisma.trainingPlan.findUnique({
    where: { id: req.params.id },
    include: { coach: true, exercises: { include: { exercise: true } } },
  });
  if (!plan) return res.status(404).json({ error: "Plan d'entrainement introuvable." });
  res.json({ plan });
});

router.post("/", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { seasonId, title, description, periodStart, periodEnd } = req.body ?? {};
  if (!seasonId || !title) {
    return res.status(400).json({ error: "seasonId et title sont requis." });
  }
  const plan = await prisma.trainingPlan.create({
    data: {
      seasonId,
      title,
      description,
      coachId: req.user.coachId ?? null,
      periodStart: periodStart ? new Date(periodStart) : null,
      periodEnd: periodEnd ? new Date(periodEnd) : null,
    },
  });
  res.status(201).json({ plan });
});

router.put("/:id", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { title, description, periodStart, periodEnd } = req.body ?? {};
  try {
    const plan = await prisma.trainingPlan.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(periodStart !== undefined && { periodStart: periodStart ? new Date(periodStart) : null }),
        ...(periodEnd !== undefined && { periodEnd: periodEnd ? new Date(periodEnd) : null }),
      },
    });
    res.json({ plan });
  } catch {
    res.status(404).json({ error: "Plan d'entrainement introuvable." });
  }
});

router.delete("/:id", requireRole("ADMIN", "COACH"), async (req, res) => {
  try {
    await prisma.trainingPlan.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Plan d'entrainement introuvable." });
  }
});

// ---------- Exercices rattachés au plan ----------

router.post("/:id/exercises", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { exerciseId } = req.body ?? {};
  if (!exerciseId) return res.status(400).json({ error: "exerciseId est requis." });
  try {
    const link = await prisma.trainingPlanExercise.create({
      data: { trainingPlanId: req.params.id, exerciseId },
      include: { exercise: true },
    });
    res.status(201).json({ link });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Cet exercice est déjà dans le plan." });
    }
    throw err;
  }
});

router.delete("/:id/exercises/:exerciseId", requireRole("ADMIN", "COACH"), async (req, res) => {
  try {
    await prisma.trainingPlanExercise.delete({
      where: { trainingPlanId_exerciseId: { trainingPlanId: req.params.id, exerciseId: req.params.exerciseId } },
    });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Exercice non rattaché à ce plan." });
  }
});

export default router;
