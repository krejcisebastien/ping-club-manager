// Lecture de la fiche joueur data.aftt.be (enrichissement des résultats) sur un
// extrait figé de la page. Si le site change sa mise en page, adapter ce test
// et parsePlayerSheet ensemble. Lancer : npm run test:aftt-sheet
import { parseActiveCounts, parsePlayerSheet } from "../src/lib/afttData.js";
import { columnIndex, estimateRanking } from "../src/lib/numericRanking.js";

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

// Nombre d'actifs lu sur la page d'accueil.
const home = `<div class="stat"><div class="stat-value">13 279</div><div class="stat-label">joueurs actifs hors NC</div>
  <small>Classement mixte général</small></div><p>Dernier calcul mixte terminé : 20/11/2026 à 09:57</p>
  <div class="stat"><div class="stat-value">1&nbsp;484</div><div class="stat-label">joueuses actives hors NC</div></div>`;
const counts = parseActiveCounts(home);
expect("nombre d'actifs messieurs et dames", counts?.activePlayers === 13279 && counts?.activeLadies === 1484, JSON.stringify(counts));
expect("accueil modifié : null, pas de nombre inventé", parseActiveCounts("<p>Classement 2026-2027</p>") === null);

// Tableau d'équivalence : colonne selon la tranche, puis classement selon la place.
expect("colonne 13 500 pour 13 279 actifs (tranche 13 250 à 13 749)", columnIndex("men", 13279) === 3);
expect("bornes de tranche", columnIndex("men", 13249) === 2 && columnIndex("men", 13750) === 4);
expect("hors tableau : colonne la plus proche", columnIndex("men", 9000) === 0 && columnIndex("men", 30000) === 16);
const top = estimateRanking("men", 20, 13279);
expect("place 20 : A, 1 place avant de descendre en B0", top.ranking === "A" && top.lower === "B0" && top.placesToLower === 1 && top.upper === null);
const c4 = estimateRanking("men", 2500, 13279);
expect("place 2 500 (colonne 13 500) : C4 entre 2 081 et 2 890", c4.ranking === "C4" && c4.placesToLower === 391 && c4.placesToUpper === 420 && c4.upper === "C2" && c4.lower === "C6");
const e6 = estimateRanking("men", 13500, 13279);
expect("dernière place de E6 : NC au-delà", e6.ranking === "E6" && e6.lower === "NC" && e6.placesToLower === 1);
const nc = estimateRanking("men", 13600, 13279);
expect("au-delà du dernier rang : NC", nc.ranking === "NC" && nc.upper === "E6" && nc.placesToUpper === 100);
const lady = estimateRanking("ladies", 58, 1484);
expect("dames : place 58 avec 1 484 joueuses (colonne 1 500) : B2", lady.ranking === "B2" && lady.upper === "B0" && lady.placesToUpper === 23 && lady.placesToLower === 38, JSON.stringify(lady));
expect("place inconnue : pas d'estimation", estimateRanking("men", null, 13279) === null);

console.log(`${checks - failures}/${checks} vérifications OK`);
process.exit(failures ? 1 : 0);
