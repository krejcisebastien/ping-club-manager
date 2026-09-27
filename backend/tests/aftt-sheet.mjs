// Lecture de la fiche joueur data.aftt.be (enrichissement des résultats) sur un
// extrait figé de la page. Si le site change sa mise en page, adapter ce test
// et parsePlayerSheet ensemble. Lancer : npm run test:aftt-sheet
import { parsePlayerSheet } from "../src/lib/afttData.js";

let checks = 0;
let failures = 0;
const expect = (label, cond, extra = "") => {
  checks++;
  if (!cond) {
    failures++;
    console.log(`  ECHEC  ${label} ${extra}`);
  }
};

const card = (licence, oppPoints, delta, cls) => `
  <div class="match-card-modern d-flex align-items-center justify-content-between mb-2">
    <div class="opponent-info"><h6 class="m-0"><form action="fiche.php" method="POST" class="d-inline">
      <input type="hidden" name="licence" value="${licence}"><button type="submit" class="opponent-link">X Y</button></form></h6>
      <small class="text-muted"><i class="fas fa-trophy me-1"></i> C4</small></div>
    <div class="match-score text-center"><h5>3-1</h5><small class="text-muted">${oppPoints} pts</small></div>
    <div class="text-end"><span class="match-delta ${cls}">
      ${delta} pts
    </span></div>
  </div>`;

const html = `
<style>.match-card-modern{gap:9px}.match-delta.positive{color:green}</style>
<div class="profile-metric"><span class="profile-metric-label">Points de base</span><span class="profile-metric-value">1 410,30</span></div>
<div class="card day-result-card w-100"><div class="day-result-header"><h6 class="m-0"><i></i> 24/09/2026 - HAI_VET03/002 - Luttre</h6>
  <span class="day-points-badge negative">Total : -0.52 pts</span></div>
  ${card(154781, "1224.45", "+2.6", "positive")}
  ${card(100227, "1796.85", "-0.52", "negative")}
</div>
<div class="card day-result-card w-100"><div class="day-result-header"><h6 class="m-0"> 19/09/2026 - HAI_MESS01/043 - CP Montois</h6></div>
  ${card(101472, "834.091", "+0", "positive")}
</div>`;

const sheet = parsePlayerSheet(html);
expect("points de base (format « 1 410,30 »)", sheet.basePoints === 1410.3, String(sheet.basePoints));
expect("3 matchs lus (le CSS n'est pas pris pour un match)", sheet.matches.length === 3, String(sheet.matches.length));
const [a, b, c] = sheet.matches;
expect("date du match", a.date.toISOString() === "2026-09-24T00:00:00.000Z" && c.date.toISOString() === "2026-09-19T00:00:00.000Z");
expect("licence de l'adversaire", a.opponentLicence === 154781 && b.opponentLicence === 100227);
expect("points de l'adversaire", a.opponentPoints === 1224.45 && c.opponentPoints === 834.091);
expect("gain et perte de points", a.pointsDelta === 2.6 && b.pointsDelta === -0.52 && c.pointsDelta === 0);
expect("page vide ou modifiée : aucun plantage", parsePlayerSheet("<html>autre chose</html>").matches.length === 0);

console.log(`${checks - failures}/${checks} vérifications OK`);
process.exit(failures ? 1 : 0);
