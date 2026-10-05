import "dotenv/config";
import readline from "node:readline/promises";
import { PrismaClient } from "@prisma/client";

// Efface, pour UN club, toutes les évaluations des joueurs ET tous les points
// de la grille d'évaluation. Les critères eux-mêmes (service, remise...) sont
// fixes et ne sont pas touchés. IRRÉVERSIBLE : sans sauvegarde de la base, les
// évaluations supprimées sont perdues.
//
// Usage : npm run evaluations:reset -- <slug-du-club>
//         npm run evaluations:reset -- <slug-du-club> --confirm=<slug-du-club>   (sans invite)

const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2];
  const confirmArg = process.argv.find((a) => a.startsWith("--confirm="))?.slice("--confirm=".length);
  if (!slug || slug.startsWith("--")) {
    console.error("Usage : npm run evaluations:reset -- <slug-du-club>");
    process.exit(1);
  }

  const club = await prisma.club.findUnique({ where: { slug } });
  if (!club) throw new Error(`Club introuvable : ${slug}`);

  const [evaluations, scores, items] = await Promise.all([
    prisma.evaluation.count({ where: { player: { clubId: club.id } } }),
    prisma.evaluationItemScore.count({ where: { evaluation: { player: { clubId: club.id } } } }),
    prisma.evaluationItem.count({ where: { clubId: club.id } }),
  ]);

  console.log(`Club : ${club.name} (${club.slug})`);
  console.log(`  ${evaluations} évaluation(s) de joueurs (dont ${scores} note(s) de points)`);
  console.log(`  ${items} point(s) de la grille d'évaluation`);

  if (!evaluations && !items) {
    console.log("Rien à effacer.");
    return;
  }

  let typed = confirmArg;
  if (typed === undefined) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    typed = await rl.question(`\nCette suppression est irréversible. Retape « ${club.slug} » pour confirmer : `);
    rl.close();
  }
  if (typed !== club.slug) {
    console.log("Confirmation incorrecte : rien n'a été supprimé.");
    process.exit(1);
  }

  // Les notes de points partent en cascade avec leur évaluation.
  const [deletedEvaluations, deletedItems] = await prisma.$transaction([
    prisma.evaluation.deleteMany({ where: { player: { clubId: club.id } } }),
    prisma.evaluationItem.deleteMany({ where: { clubId: club.id } }),
  ]);
  console.log(`\nSupprimé : ${deletedEvaluations.count} évaluation(s), ${deletedItems.count} point(s) de grille.`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
