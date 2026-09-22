import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/utils/slug.js";
import { licenseState } from "../src/lib/license.js";
import { extendLicense, createClubWithAdmin } from "../src/lib/clubs.js";

const prisma = new PrismaClient();

const USAGE = `Usage :
  npm run club -- list
  npm run club -- create --name "Nom du club" --admin-email a@b.c --admin-password "mot de passe" [--slug nom-du-club] [--until AAAA-MM-JJ | --years N]
  npm run club -- rename --slug nom-du-club --name "Nouveau nom"
  npm run club -- license --slug nom-du-club (--until AAAA-MM-JJ | --years N)

Licence (club payé sur facture) :
  --until AAAA-MM-JJ   fixe la fin de licence à cette date
  --years N            prolonge de N an(s) à partir de la fin actuelle (ou d'aujourd'hui si échue/absente)
  Sans option à la création, le club n'a pas de licence : son administrateur
  peut la régler en ligne (Stripe) depuis l'application.`;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith("--") || argv[i + 1] === undefined) throw new Error(USAGE);
    out[argv[i].slice(2)] = argv[i + 1];
  }
  return out;
}

const fmt = (d) => (d ? d.toISOString().slice(0, 10) : "—");

// Calcule la nouvelle fin de licence à partir de --until / --years.
function licenseEnd(args, current) {
  if (args.until && args.years) throw new Error("Utiliser --until ou --years, pas les deux.");
  if (args.until) {
    const date = new Date(`${args.until}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) throw new Error("Date invalide : utiliser le format AAAA-MM-JJ.");
    return date;
  }
  if (args.years) {
    const years = Number(args.years);
    if (!Number.isInteger(years) || years < 1) throw new Error("--years doit être un entier positif.");
    return extendLicense(current, years);
  }
  return undefined;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (command === "list") {
    const clubs = await prisma.club.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { users: true, players: true } } },
    });
    for (const c of clubs) {
      const license = licenseState(c);
      console.log(
        `${c.slug.padEnd(24)} ${c.name}  (${c._count.users} comptes, ${c._count.players} joueurs)  licence : ${license.status} ${fmt(c.licenseEndsAt)}${c.stripeCustomerId ? "  [Stripe]" : ""}`
      );
    }
  } else if (command === "create") {
    const { name, "admin-email": email, "admin-password": password } = args;
    if (!name || !email || !password) throw new Error(USAGE);
    if (password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
    const licenseEndsAt = licenseEnd(args, null);
    const club = await createClubWithAdmin(prisma, { name, slug: args.slug || slugify(name), email, password, licenseEndsAt });
    console.log(`Club "${club.name}" créé (slug : ${club.slug}). Admin : ${email}. Licence : ${licenseEndsAt ? `jusqu'au ${fmt(licenseEndsAt)}` : "aucune"}`);
  } else if (command === "rename") {
    if (!args.slug || !args.name) throw new Error(USAGE);
    const club = await prisma.club.update({ where: { slug: args.slug }, data: { name: args.name } });
    console.log(`Club renommé : "${club.name}" (slug : ${club.slug})`);
  } else if (command === "license") {
    if (!args.slug || (!args.until && !args.years)) throw new Error(USAGE);
    const current = await prisma.club.findUnique({ where: { slug: args.slug } });
    if (!current) throw new Error(`Club introuvable : ${args.slug}`);
    const licenseEndsAt = licenseEnd(args, current.licenseEndsAt);
    await prisma.club.update({ where: { id: current.id }, data: { licenseEndsAt } });
    console.log(`Licence de "${current.name}" : ${fmt(current.licenseEndsAt)} → ${fmt(licenseEndsAt)} (effectif sous 30 s sur un serveur en marche)`);
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
