// Synchronisation quotidienne des résultats de compétition depuis TabT (AFTT),
// pour tous les joueurs de tous les clubs ayant un n° de licence.
// Usage : npm run tabt:sync            (tous les joueurs)
//         npm run tabt:sync -- <id>    (un seul joueur, id interne)
// Sur Render : service "cron" déclaré dans render.yaml.
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { syncPlayer, isTabtConfigured, TabtError } from "../src/lib/tabt.js";

// ~500 unités de quota par appel, résorbées à 200/s : 3 s entre deux appels
// garde le compteur bien sous la limite de 30 000.
const DELAY_MS = 3000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!isTabtConfigured()) {
  console.error("TABT_ACCOUNT et TABT_PASSWORD doivent être renseignés.");
  process.exit(1);
}

const onlyId = process.argv[2];
const players = await prisma.player.findMany({
  where: { licenseNumber: { not: null }, ...(onlyId && { id: onlyId }) },
  // Les joueurs jamais synchronisés d'abord, puis les plus anciennement à jour.
  orderBy: [{ competitionSyncedAt: { sort: "asc", nulls: "first" } }],
  select: { id: true, firstName: true, lastName: true, licenseNumber: true },
});
const withLicence = players.filter((p) => p.licenseNumber.trim());

let ok = 0;
let failed = 0;
let matches = 0;
for (const [i, player] of withLicence.entries()) {
  if (i > 0) await sleep(DELAY_MS);
  const who = `${player.lastName} ${player.firstName} (${player.licenseNumber})`;
  try {
    const summary = await syncPlayer(player, { delayMs: DELAY_MS });
    ok++;
    matches += summary.matches;
    console.log(`OK     ${who} : ${summary.matches} match(s) sur ${summary.seasons} saison(s)`);
  } catch (err) {
    failed++;
    console.log(`ECHEC  ${who} : ${err.message}`);
    if (err instanceof TabtError && err.quota) {
      console.log("Quota TabT dépassé : arrêt, les joueurs restants passeront à la prochaine exécution.");
      break;
    }
  }
}

console.log(`\n${ok} joueur(s) synchronisé(s), ${failed} échec(s), ${matches} match(s) importé(s).`);
await prisma.$disconnect();
// Un n° de licence erroné ne doit pas faire échouer tout le job : seul un
// problème global (aucun succès alors qu'il y avait des joueurs) est signalé.
process.exit(withLicence.length && !ok ? 1 : 0);
