import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const coaches = await prisma.coach.findMany({ orderBy: { lastName: "asc" } });
  res.json({ coaches });
});

router.get("/:id", async (req, res) => {
  const coach = await prisma.coach.findUnique({ where: { id: req.params.id } });
  if (!coach) return res.status(404).json({ error: "Entraineur introuvable." });
  res.json({ coach });
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const { firstName, lastName, email, phone } = req.body ?? {};
  if (!firstName || !lastName) {
    return res.status(400).json({ error: "firstName et lastName sont requis." });
  }
  try {
    const coach = await prisma.coach.create({ data: { firstName, lastName, email, phone } });
    res.status(201).json({ coach });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Un entraineur existe déjà avec cet email." });
    }
    throw err;
  }
});

router.put("/:id", requireRole("ADMIN"), async (req, res) => {
  const { firstName, lastName, email, phone } = req.body ?? {};
  try {
    const coach = await prisma.coach.update({
      where: { id: req.params.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
      },
    });
    res.json({ coach });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Un entraineur existe déjà avec cet email." });
    }
    res.status(404).json({ error: "Entraineur introuvable." });
  }
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.coach.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Entraineur introuvable." });
  }
});

export default router;
