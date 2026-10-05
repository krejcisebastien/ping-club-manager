import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedEvaluationGrid } from "../src/lib/evaluationGrid.js";

// Ajoute (ou complète) la grille d'évaluation de base (80 points, 10 par critère)
// pour un club existant. Idempotent, sans autre effet de bord.
// Usage : npm run seed:evaluation -- <slug-du-club>
//         npm run seed:evaluation -- --all   (tous les clubs)

const prisma = new PrismaClient();

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage : npm run seed:evaluation -- <slug-du-club>\n   ou : npm run seed:evaluation -- --all");
    process.exit(1);
  }

  const clubs = arg === "--all"
    ? await prisma.club.findMany()
    : [await prisma.club.findUnique({ where: { slug: arg } })].filter(Boolean);

  if (!clubs.length) throw new Error(`Club introuvable : ${arg}`);

  for (const club of clubs) {
    const { created, described } = await seedEvaluationGrid(prisma, club.id);
    console.log(`${club.name} (${club.slug}) : ${created} point(s) ajouté(s), ${described} description(s) complétée(s).`);
  }
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
