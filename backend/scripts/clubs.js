import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password.js";

const prisma = new PrismaClient();

const USAGE = `Usage :
  npm run club -- list
  npm run club -- create --name "Nom du club" --admin-email a@b.c --admin-password "mot de passe" [--slug nom-du-club]
  npm run club -- rename --slug nom-du-club --name "Nouveau nom"`;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith("--") || argv[i + 1] === undefined) throw new Error(USAGE);
    out[argv[i].slice(2)] = argv[i + 1];
  }
  return out;
}

const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (command === "list") {
    const clubs = await prisma.club.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { users: true, players: true } } },
    });
    for (const c of clubs) {
      console.log(`${c.slug.padEnd(24)} ${c.name}  (${c._count.users} comptes, ${c._count.players} joueurs)`);
    }
  } else if (command === "create") {
    const { name, "admin-email": email, "admin-password": password } = args;
    if (!name || !email || !password) throw new Error(USAGE);
    if (password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
    const slug = args.slug || slugify(name);
    const club = await prisma.club.create({
      data: {
        name,
        slug,
        users: { create: { email, passwordHash: await hashPassword(password), roles: ["ADMIN"] } },
      },
    });
    console.log(`Club "${club.name}" créé (slug : ${club.slug}). Admin : ${email}`);
  } else if (command === "rename") {
    if (!args.slug || !args.name) throw new Error(USAGE);
    const club = await prisma.club.update({ where: { slug: args.slug }, data: { name: args.name } });
    console.log(`Club renommé : "${club.name}" (slug : ${club.slug})`);
  } else {
    throw new Error(USAGE);
  }
}

main()
  .catch((err) => {
    console.error(err.code === "P2002" ? "Ce slug ou cet email existe déjà." : err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
