import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password.js";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@pingpong-club.local";
  const password = process.env.SEED_ADMIN_PASSWORD || "changeme123";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Le compte admin ${email} existe déjà.`);
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: { email, passwordHash, role: "ADMIN" },
  });
  console.log(`Compte admin créé : ${email} / ${password}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
