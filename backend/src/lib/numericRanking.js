// Tableau d'équivalence AFTT 2026-2027 : classement atteint selon la place au
// classement numérique. Chaque colonne correspond à un nombre de joueurs
// actifs (« Total ») ; chaque valeur est la dernière place qui donne ce
// classement. Ex. avec 13 279 actifs (colonne 13 500, tranche 13 250 à 13 749),
// les places 1 à 20 sont A, 21 à 75 B0, 76 à 225 B2…
// Hypothèses (non écrites dans le règlement) : la colonne messieurs se choisit
// avec le nombre d'actifs hors NC du classement mixte et s'applique à la place
// au classement mixte ; la colonne dames avec le nombre de joueuses actives
// hors NC et la place parmi les dames. Au-delà du dernier rang : NC.

const MEN_TOTALS = Array.from({ length: 17 }, (_, i) => 12000 + i * 500);
const LADIES_TOTALS = Array.from({ length: 17 }, (_, i) => 700 + i * 100);
const repeat = (v) => Array(17).fill(v);

const MEN = [
  ["A", repeat(20)],
  ["B0", repeat(75)],
  ["B2", [205, 210, 220, 225, 230, 235, 240, 245, 250, 255, 260, 270, 275, 280, 285, 290, 295]],
  ["B4", [405, 420, 435, 450, 460, 475, 490, 505, 520, 530, 545, 560, 575, 585, 600, 615, 630]],
  ["B6", [820, 855, 885, 915, 945, 980, 1010, 1040, 1075, 1105, 1135, 1165, 1200, 1230, 1260, 1290, 1325]],
  ["C0", [1275, 1325, 1375, 1425, 1475, 1525, 1575, 1625, 1675, 1725, 1775, 1825, 1875, 1925, 1975, 2025, 2080]],
  ["C2", [1855, 1930, 2005, 2080, 2155, 2230, 2305, 2380, 2455, 2530, 2605, 2680, 2755, 2830, 2905, 2975, 3050]],
  ["C4", [2575, 2680, 2785, 2890, 2995, 3100, 3205, 3310, 3415, 3520, 3625, 3730, 3835, 3940, 4045, 4150, 4255]],
  ["C6", [3335, 3470, 3610, 3745, 3880, 4020, 4155, 4290, 4430, 4565, 4700, 4840, 4975, 5110, 5250, 5385, 5520]],
  ["D0", [4120, 4285, 4455, 4625, 4795, 4965, 5135, 5305, 5475, 5645, 5815, 5985, 6150, 6320, 6490, 6660, 6830]],
  ["D2", [4925, 5130, 5330, 5535, 5740, 5940, 6145, 6350, 6550, 6755, 6960, 7160, 7365, 7570, 7770, 7975, 8180]],
  ["D4", [5810, 6050, 6295, 6535, 6775, 7015, 7255, 7495, 7735, 7975, 8215, 8460, 8700, 8940, 9180, 9420, 9660]],
  ["D6", [6745, 7025, 7305, 7585, 7865, 8145, 8425, 8705, 8985, 9265, 9545, 9825, 10105, 10385, 10665, 10945, 11220]],
  ["E0", [7720, 8040, 8365, 8685, 9005, 9325, 9645, 9965, 10285, 10605, 10925, 11250, 11570, 11890, 12210, 12530, 12850]],
  ["E2", [8745, 9110, 9470, 9835, 10200, 10560, 10925, 11290, 11650, 12015, 12380, 12740, 13105, 13470, 13835, 14195, 14560]],
  ["E4", [10080, 10500, 10915, 11335, 11755, 12175, 12595, 13015, 13435, 13855, 14275, 14690, 15110, 15530, 15950, 16370, 16790]],
  ["E6", MEN_TOTALS],
];

const LADIES = [
  ["A", repeat(15)],
  ["B0", repeat(35)],
  ["B2", [60, 65, 70, 75, 75, 80, 85, 90, 95, 95, 100, 105, 110, 115, 115, 120, 125]],
  ["B4", [85, 90, 100, 105, 115, 120, 130, 140, 145, 155, 160, 170, 175, 185, 190, 200, 205]],
  ["B6", [110, 125, 135, 145, 155, 170, 180, 190, 205, 215, 225, 235, 250, 260, 270, 285, 295]],
  ["C0", [145, 160, 175, 190, 210, 225, 240, 255, 270, 290, 305, 320, 335, 355, 370, 385, 400]],
  ["C2", [180, 200, 225, 245, 265, 290, 310, 330, 355, 375, 395, 420, 440, 460, 485, 505, 525]],
  ["C4", [230, 260, 290, 320, 350, 380, 410, 440, 470, 500, 530, 560, 590, 620, 645, 675, 705]],
  ["C6", [300, 335, 375, 415, 455, 495, 535, 575, 615, 655, 695, 735, 770, 810, 850, 890, 930]],
  ["D0", [370, 420, 475, 525, 575, 625, 675, 725, 775, 825, 875, 930, 980, 1030, 1080, 1130, 1180]],
  ["D2", [450, 510, 570, 635, 695, 760, 820, 880, 945, 1005, 1070, 1130, 1190, 1255, 1315, 1380, 1440]],
  ["D4", [555, 635, 710, 790, 870, 945, 1025, 1105, 1180, 1260, 1340, 1415, 1495, 1575, 1650, 1730, 1810]],
  ["D6", LADIES_TOTALS],
];

const TABLES = {
  men: { totals: MEN_TOTALS, half: 250, rows: MEN },
  ladies: { totals: LADIES_TOTALS, half: 50, rows: LADIES },
};

// Colonne du tableau pour un nombre d'actifs : celle dont la tranche
// (Total − 250 à Total + 249, ou ± 50 pour les dames) le contient. En dehors du
// tableau, la colonne la plus proche.
export function columnIndex(kind, activeCount) {
  const { totals, half } = TABLES[kind];
  const i = totals.findIndex((t) => activeCount >= t - half && activeCount < t + half);
  if (i >= 0) return i;
  return activeCount < totals[0] ? 0 : totals.length - 1;
}

// Classement estimé pour une place, avec la marge vers les classements voisins :
// - placesToLower : places à perdre pour descendre (1 = la moindre place perdue)
// - placesToUpper : places à gagner pour monter (null pour le premier classement)
// Au-delà du dernier rang : NC, à placesToUpper places du dernier classement.
export function estimateRanking(kind, position, activeCount) {
  if (!Number.isInteger(position) || position < 1 || !Number.isFinite(activeCount)) return null;
  const { totals, rows } = TABLES[kind];
  const col = columnIndex(kind, activeCount);
  const limits = rows.map(([label, values]) => ({ label, limit: values[col] }));
  const i = limits.findIndex((r) => position <= r.limit);
  const column = { total: totals[col], tranche: [totals[col] - TABLES[kind].half, totals[col] + TABLES[kind].half - 1] };
  if (i < 0) {
    const last = limits.at(-1);
    return { ranking: "NC", column, lower: null, upper: last.label, placesToLower: null, placesToUpper: position - last.limit };
  }
  const previous = limits[i - 1];
  return {
    ranking: limits[i].label,
    column,
    lower: limits[i + 1]?.label ?? "NC",
    upper: previous?.label ?? null,
    placesToLower: limits[i].limit - position + 1,
    placesToUpper: previous ? position - previous.limit : null,
  };
}
