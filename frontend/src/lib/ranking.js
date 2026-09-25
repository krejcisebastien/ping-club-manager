// Classements de tennis de table (du plus bas au plus haut), séries des tarifs
// sparrings et niveaux Adeps des entraineurs. Doit rester aligné sur
// backend/src/lib/rankings.js.
export const RANKINGS = ["NC", "E6", "E4", "E2", "E0", "D6", "D4", "D2", "D0", "C6", "C4", "C2", "C0", "B6", "B4", "B2", "B0"];
export const RANKING_OPTIONS = RANKINGS.map((value) => ({ label: value === "NC" ? "NC (non classé)" : value, value }));

export const SERIES_LABELS = { E: "Série E", D: "Série D", C: "Série C", B: "Série B" };
export const seriesOf = (ranking) => (RANKINGS.includes(ranking) ? (ranking === "NC" ? "E" : ranking[0]) : null);

export const COACH_LEVEL_OPTIONS = [
  { value: "ANIMATEUR", label: "Animateur" },
  { value: "MSIN", label: "MSIN" },
  { value: "MSED", label: "MSED" },
  { value: "MSEN", label: "MSEN" },
];
export const COACH_LEVEL_LABELS = Object.fromEntries(COACH_LEVEL_OPTIONS.map((l) => [l.value, l.label]));
