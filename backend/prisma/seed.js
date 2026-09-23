import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password.js";
import { seedExerciseLibrary } from "../src/lib/exerciseLibrary.js";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@ping-club-manager.local";
  const password = process.env.SEED_ADMIN_PASSWORD || "changeme123";

  // La migration multi-tenant crée le club "default" ; on le recrée au besoin.
  const club = await prisma.club.upsert({
    where: { slug: "default" },
    update: {},
    create: { name: "Club Tennis de Table", slug: "default" },
  });

  const imported = await seedExerciseLibrary(prisma, club.id);
  if (imported) console.log(`${imported} exercice(s) de la bibliothèque de base ajouté(s) au club "${club.name}".`);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Le compte admin ${email} existe déjà.`);
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: { email, passwordHash, roles: ["ADMIN"], clubId: club.id },
  });
  console.log(`Compte admin créé pour le club "${club.name}" : ${email} / ${password}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
