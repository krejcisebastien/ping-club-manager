import { Router } from "express";
import { requireAuth, requireRole, requireSelfPlayerOrRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// ---------- Joueurs ----------

router.get("/", requireRole("ADMIN", "COACH"), async (req, res) => {
  const players = await req.db.player.findMany({ orderBy: { lastName: "asc" } });
  res.json({ players });
});

router.get("/:id", requireSelfPlayerOrRole("id", "ADMIN", "COACH"), async (req, res) => {
  const player = await req.db.player.findUnique({ where: { id: req.params.id } });
  if (!player) return res.status(404).json({ error: "Joueur introuvable." });
  res.json({ player });
});

router.post("/", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { firstName, lastName, birthDate, licenseNumber } = req.body ?? {};
  if (!firstName || !lastName || !birthDate) {
    return res.status(400).json({ error: "firstName, lastName et birthDate sont requis." });
  }
  const player = await req.db.player.create({
    data: { firstName, lastName, birthDate: new Date(birthDate), licenseNumber },
  });
  res.status(201).json({ player });
});

router.put("/:id", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { firstName, lastName, birthDate, licenseNumber } = req.body ?? {};
  try {
    const player = await req.db.player.update({
      where: { id: req.params.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(birthDate !== undefined && { birthDate: new Date(birthDate) }),
        ...(licenseNumber !== undefined && { licenseNumber }),
      },
    });
    res.json({ player });
  } catch {
    res.status(404).json({ error: "Joueur introuvable." });
  }
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await req.db.player.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Joueur introuvable." });
  }
});

// ---------- Classement (historique) ----------

router.get("/:id/rankings", requireSelfPlayerOrRole("id", "ADMIN", "COACH"), async (req, res) => {
  const rankings = await req.db.rankingHistory.findMany({
    where: { playerId: req.params.id },
    orderBy: { effectiveDate: "desc" },
  });
  res.json({ rankings });
});

router.post("/:id/rankings", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { seasonId, rankingValue, effectiveDate } = req.body ?? {};
  if (!seasonId || !rankingValue) {
    return res.status(400).json({ error: "seasonId et rankingValue sont requis." });
  }
  const ranking = await req.db.rankingHistory.create({
    data: {
      playerId: req.params.id,
      seasonId,
      rankingValue,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
    },
  });
  res.status(201).json({ ranking });
});

// ---------- Matériel ----------

router.get("/:id/equipment", requireSelfPlayerOrRole("id", "ADMIN", "COACH"), async (req, res) => {
  const equipment = await req.db.equipment.findMany({
    where: { playerId: req.params.id },
    orderBy: { effectiveFrom: "desc" },
  });
  res.json({ equipment });
});

router.post("/:id/equipment", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { type, brand, model } = req.body ?? {};
  if (!type) return res.status(400).json({ error: "type est requis." });
  const item = await req.db.equipment.create({
    data: { playerId: req.params.id, type, brand, model },
  });
  res.status(201).json({ equipment: item });
});

router.put("/:id/equipment/:equipmentId/close", requireRole("ADMIN", "COACH"), async (req, res) => {
  try {
    const item = await req.db.equipment.update({
      where: { id: req.params.equipmentId },
      data: { effectiveTo: new Date() },
    });
    res.json({ equipment: item });
  } catch {
    res.status(404).json({ error: "Matériel introuvable." });
  }
});

// ---------- Points forts / défauts ----------

router.get("/:id/traits", requireSelfPlayerOrRole("id", "ADMIN", "COACH"), async (req, res) => {
  const traits = await req.db.playerTrait.findMany({
    where: { playerId: req.params.id },
    orderBy: { effectiveFrom: "desc" },
  });
  res.json({ traits });
});

router.post("/:id/traits", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { category, description } = req.body ?? {};
  if (!category || !description) {
    return res.status(400).json({ error: "category et description sont requis." });
  }
  if (!["STRENGTH", "WEAKNESS"].includes(category)) {
    return res.status(400).json({ error: "category doit être STRENGTH ou WEAKNESS." });
  }
  const trait = await req.db.playerTrait.create({
    data: { playerId: req.params.id, category, description },
  });
  res.status(201).json({ trait });
});

// ---------- Points à travailler ----------

router.get("/:id/points-to-work", requireSelfPlayerOrRole("id", "ADMIN", "COACH"), async (req, res) => {
  const points = await req.db.pointToWork.findMany({
    where: { playerId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ pointsToWork: points });
});

router.post("/:id/points-to-work", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { description } = req.body ?? {};
  if (!description) return res.status(400).json({ error: "description est requise." });
  const point = await req.db.pointToWork.create({
    data: { playerId: req.params.id, description, createdById: req.user.coachId ?? null },
  });
  res.status(201).json({ pointToWork: point });
});

router.put("/:id/points-to-work/:pointId", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { description, status } = req.body ?? {};
  try {
    const point = await req.db.pointToWork.update({
      where: { id: req.params.pointId },
      data: {
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
      },
    });
    res.json({ pointToWork: point });
  } catch {
    res.status(404).json({ error: "Point à travailler introuvable." });
  }
});

// ---------- Notes d'évolution ----------

router.get("/:id/evolution-notes", requireSelfPlayerOrRole("id", "ADMIN", "COACH"), async (req, res) => {
  const notes = await req.db.evolutionNote.findMany({
    where: { playerId: req.params.id },
    orderBy: { date: "desc" },
  });
  res.json({ evolutionNotes: notes });
});

router.post("/:id/evolution-notes", requireRole("ADMIN", "COACH"), async (req, res) => {
  const { note, date } = req.body ?? {};
  if (!note) return res.status(400).json({ error: "note est requise." });
  const created = await req.db.evolutionNote.create({
    data: {
      playerId: req.params.id,
      coachId: req.user.coachId ?? null,
      note,
      date: date ? new Date(date) : new Date(),
    },
  });
  res.status(201).json({ evolutionNote: created });
});

// ---------- Participation aux entrainements ----------

router.get("/:id/attendance", requireSelfPlayerOrRole("id", "ADMIN", "COACH"), async (req, res) => {
  const attendances = await req.db.attendance.findMany({
    where: { playerId: req.params.id },
    include: { occurrence: { include: { training: true } } },
    orderBy: { occurrence: { date: "desc" } },
  });
  res.json({ attendances });
});

// ---------- Participation aux stages ----------

router.get("/:id/camp-attendance", requireSelfPlayerOrRole("id", "ADMIN", "COACH"), async (req, res) => {
  const attendances = await req.db.campAttendance.findMany({
    where: { playerId: req.params.id },
    include: {
      campPeriodGroup: { include: { group: true, period: { include: { campDay: { include: { camp: true } } } } } },
    },
    orderBy: { campPeriodGroup: { period: { campDay: { date: "desc" } } } },
  });
  res.json({ attendances });
});

export default router;
