import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const sparrings = await prisma.sparring.findMany({ orderBy: { lastName: "asc" } });
  res.json({ sparrings });
});

router.get("/:id", async (req, res) => {
  const sparring = await prisma.sparring.findUnique({ where: { id: req.params.id } });
  if (!sparring) return res.status(404).json({ error: "Sparring introuvable." });
  res.json({ sparring });
});

router.post("/", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { firstName, lastName, ranking, isClubMember, playerId, externalClub } = req.body ?? {};
  if (!firstName || !lastName) {
    return res.status(400).json({ error: "firstName et lastName sont requis." });
  }
  const sparring = await prisma.sparring.create({
    data: {
      firstName,
      lastName,
      ranking,
      isClubMember: !!isClubMember,
      playerId: isClubMember ? playerId ?? null : null,
      externalClub: isClubMember ? null : externalClub ?? null,
    },
  });
  res.status(201).json({ sparring });
});

router.put("/:id", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { firstName, lastName, ranking, isClubMember, playerId, externalClub } = req.body ?? {};
  try {
    const sparring = await prisma.sparring.update({
      where: { id: req.params.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(ranking !== undefined && { ranking }),
        ...(isClubMember !== undefined && { isClubMember }),
        ...(playerId !== undefined && { playerId }),
        ...(externalClub !== undefined && { externalClub }),
      },
    });
    res.json({ sparring });
  } catch {
    res.status(404).json({ error: "Sparring introuvable." });
  }
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.sparring.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Sparring introuvable." });
  }
});

export default router;
