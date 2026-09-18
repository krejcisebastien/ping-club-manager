import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// ---------- Stages ----------

router.get("/", async (req, res) => {
  const { seasonId } = req.query;
  const camps = await prisma.camp.findMany({
    where: seasonId ? { seasonId } : undefined,
    orderBy: { startDate: "desc" },
  });
  res.json({ camps });
});

router.get("/:campId", async (req, res) => {
  const camp = await prisma.camp.findUnique({
    where: { id: req.params.campId },
    include: {
      groups: { include: { trainingPlan: true } },
      days: {
        orderBy: { date: "asc" },
        include: {
          periods: {
            orderBy: { startTime: "asc" },
            include: { groups: { include: { group: true } } },
          },
        },
      },
    },
  });
  if (!camp) return res.status(404).json({ error: "Stage introuvable." });
  res.json({ camp });
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const { seasonId, name, location, startDate, endDate } = req.body ?? {};
  if (!seasonId || !name || !startDate || !endDate) {
    return res.status(400).json({ error: "seasonId, name, startDate et endDate sont requis." });
  }
  const camp = await prisma.camp.create({
    data: { seasonId, name, location, startDate: new Date(startDate), endDate: new Date(endDate) },
  });
  res.status(201).json({ camp });
});

router.put("/:campId", requireRole("ADMIN"), async (req, res) => {
  const { name, location, startDate, endDate } = req.body ?? {};
  try {
    const camp = await prisma.camp.update({
      where: { id: req.params.campId },
      data: {
        ...(name !== undefined && { name }),
        ...(location !== undefined && { location }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
      },
    });
    res.json({ camp });
  } catch {
    res.status(404).json({ error: "Stage introuvable." });
  }
});

router.delete("/:campId", requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.camp.delete({ where: { id: req.params.campId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Stage introuvable." });
  }
});

// ---------- Groupes du stage (initiation, perfectionnement, psychomotricité...) ----------

router.post("/:campId/groups", requireRole("ADMIN"), async (req, res) => {
  const { name } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "name est requis." });
  const group = await prisma.campGroup.create({ data: { campId: req.params.campId, name } });
  res.status(201).json({ group });
});

router.put("/groups/:groupId", requireRole("ADMIN"), async (req, res) => {
  const { name, trainingPlanId } = req.body ?? {};
  try {
    const group = await prisma.campGroup.update({
      where: { id: req.params.groupId },
      data: {
        ...(name !== undefined && { name }),
        ...(trainingPlanId !== undefined && { trainingPlanId: trainingPlanId || null }),
      },
      include: { trainingPlan: true },
    });
    res.json({ group });
  } catch {
    res.status(404).json({ error: "Groupe de stage introuvable." });
  }
});

router.delete("/groups/:groupId", requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.campGroup.delete({ where: { id: req.params.groupId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Groupe de stage introuvable." });
  }
});

// ---------- Jours du stage ----------

router.post("/:campId/days", requireRole("ADMIN"), async (req, res) => {
  const { date } = req.body ?? {};
  if (!date) return res.status(400).json({ error: "date est requise." });
  const day = await prisma.campDay.create({ data: { campId: req.params.campId, date: new Date(date) } });
  res.status(201).json({ day });
});

router.delete("/days/:dayId", requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.campDay.delete({ where: { id: req.params.dayId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Journée introuvable." });
  }
});

// ---------- Périodes d'une journée (matinée, après-midi...) ----------

router.post("/days/:dayId/periods", requireRole("ADMIN"), async (req, res) => {
  const { label, startTime, endTime } = req.body ?? {};
  if (!label || !startTime || !endTime) {
    return res.status(400).json({ error: "label, startTime et endTime sont requis." });
  }
  const period = await prisma.campPeriod.create({
    data: { campDayId: req.params.dayId, label, startTime, endTime },
  });
  res.status(201).json({ period });
});

router.put("/periods/:periodId", requireRole("ADMIN"), async (req, res) => {
  const { label, startTime, endTime } = req.body ?? {};
  try {
    const period = await prisma.campPeriod.update({
      where: { id: req.params.periodId },
      data: {
        ...(label !== undefined && { label }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
      },
    });
    res.json({ period });
  } catch {
    res.status(404).json({ error: "Période introuvable." });
  }
});

router.delete("/periods/:periodId", requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.campPeriod.delete({ where: { id: req.params.periodId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Période introuvable." });
  }
});

// ---------- Affectation d'un groupe à une période ----------

router.post("/periods/:periodId/groups", requireRole("ADMIN"), async (req, res) => {
  const { campGroupId } = req.body ?? {};
  if (!campGroupId) return res.status(400).json({ error: "campGroupId est requis." });
  try {
    const periodGroup = await prisma.campPeriodGroup.create({
      data: { campPeriodId: req.params.periodId, campGroupId },
      include: { group: true },
    });
    res.status(201).json({ periodGroup });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Ce groupe est déjà affecté à cette période." });
    }
    throw err;
  }
});

router.delete("/period-groups/:periodGroupId", requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.campPeriodGroup.delete({ where: { id: req.params.periodGroupId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Affectation introuvable." });
  }
});

export default router;
