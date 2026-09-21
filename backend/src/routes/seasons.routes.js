import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const seasons = await req.db.season.findMany({ orderBy: { startDate: "desc" } });
  res.json({ seasons });
});

router.get("/:id", async (req, res) => {
  const season = await req.db.season.findUnique({ where: { id: req.params.id } });
  if (!season) return res.status(404).json({ error: "Saison introuvable." });
  res.json({ season });
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const { name, startDate, endDate, isActive, settings } = req.body ?? {};
  if (!name || !startDate || !endDate) {
    return res.status(400).json({ error: "name, startDate et endDate sont requis." });
  }
  const season = await req.db.season.create({
    data: { name, startDate: new Date(startDate), endDate: new Date(endDate), isActive: !!isActive, settings },
  });
  res.status(201).json({ season });
});

router.put("/:id", requireRole("ADMIN"), async (req, res) => {
  const { name, startDate, endDate, isActive, settings } = req.body ?? {};
  try {
    const season = await req.db.season.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(isActive !== undefined && { isActive }),
        ...(settings !== undefined && { settings }),
      },
    });
    res.json({ season });
  } catch {
    res.status(404).json({ error: "Saison introuvable." });
  }
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await req.db.season.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Saison introuvable." });
  }
});

export default router;
