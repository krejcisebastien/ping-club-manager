import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { computeVolunteerSheet } from "../lib/volunteer.js";
import { buildVolunteerWorkbook } from "../lib/volunteerSheet.js";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

const DAY = /^\d{4}-\d{2}-\d{2}$/;

async function loadSheet(req, res) {
  const { type, id, from, to } = req.query;
  if (!["coach", "sparring"].includes(type) || !id) {
    res.status(400).json({ error: "type (coach ou sparring) et id sont requis." });
    return null;
  }
  if (!DAY.test(from ?? "") || !DAY.test(to ?? "") || from > to) {
    res.status(400).json({ error: "from et to doivent être des dates AAAA-MM-JJ (from <= to)." });
    return null;
  }
  const sheet = await computeVolunteerSheet(req.db, { type, id, from, to });
  if (!sheet) {
    res.status(404).json({ error: "Personne introuvable." });
    return null;
  }
  return sheet;
}

// Aperçu de la note de défraiement : lignes, totaux et avertissements (tarif, plafonds).
router.get("/", async (req, res) => {
  const sheet = await loadSheet(req, res);
  if (sheet) res.json({ sheet });
});

// Fichier Excel rempli à partir du modèle « Note de défraiement - Bénévolat ».
router.get("/export", async (req, res) => {
  const sheet = await loadSheet(req, res);
  if (!sheet) return;
  const buffer = await buildVolunteerWorkbook(sheet);
  const name = `Note de defraiement - ${sheet.person.lastName} ${sheet.person.firstName} - ${sheet.from} au ${sheet.to}.xlsx`
    .replace(/[^\w .-]/g, "");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  res.send(Buffer.from(buffer));
});

export default router;
