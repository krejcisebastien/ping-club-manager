import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedExerciseLibrary } from "../src/lib/exerciseLibrary.js";

// Ajoute (ou complète) la bibliothèque d'exercices de base pour un club
// existant, sans aucun autre effet de bord (contrairement à `npm run seed`,
// qui peut aussi créer un compte admin par défaut). Idempotent.
// Usage : npm run seed:exercises -- <slug-du-club>
//         npm run seed:exercises -- --all   (tous les clubs)

const prisma = new PrismaClient();

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage : npm run seed:exercises -- <slug-du-club>\n   ou : npm run seed:exercises -- --all");
    process.exit(1);
  }

  const clubs = arg === "--all"
    ? await prisma.club.findMany()
    : [await prisma.club.findUnique({ where: { slug: arg } })].filter(Boolean);

  if (!clubs.length) throw new Error(`Club introuvable : ${arg}`);

  for (const club of clubs) {
    const imported = await seedExerciseLibrary(prisma, club.id);
    console.log(`${club.name} (${club.slug}) : ${imported} exercice(s) ajouté(s).`);
  }
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
