// Aperçu, sans rien enregistrer, des inscriptions TabT aux tournois de la saison
// pour un ou plusieurs n° de licence (vérifie l'import avant la nuit).
// Usage : npm run tabt:tournaments -- <licence> [<licence>...]
import "dotenv/config";
import { fetchSeasonTournaments, registrationRows, isTabtConfigured } from "../src/lib/tabt.js";

const licences = process.argv.slice(2).map(Number).filter(Number.isInteger);
if (!isTabtConfigured() || !licences.length) {
  console.error("Usage : npm run tabt:tournaments -- <licence> (TABT_ACCOUNT et TABT_PASSWORD requis)");
  process.exit(1);
}

const tournaments = await fetchSeasonTournaments({ delayMs: 100 });
const rows = registrationRows(tournaments, new Map(licences.map((l) => [l, [String(l)]])));
console.log(`${tournaments.length} tournoi(s) de la saison lus, ${rows.length} inscription(s) trouvée(s) :`);
for (const r of rows) {
  console.log(`  ${r.playerId}  ${r.date.toISOString().slice(0, 10)}  ${r.name} — ${r.serieName ?? ""}  ${[r.venue, r.town].filter(Boolean).join(", ")}`);
}
process.exit(0);
