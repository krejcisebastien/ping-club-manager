// Classements officiels de tennis de table (du plus bas au plus haut) et séries
// utilisées pour les tarifs des sparrings. NC (non classé) compte dans la série E.
export const RANKINGS = ["NC", "E6", "E4", "E2", "E0", "D6", "D4", "D2", "D0", "C6", "C4", "C2", "C0", "B6", "B4", "B2", "B0"];

export const SERIES = ["E", "D", "C", "B"];

export const isRanking = (value) => RANKINGS.includes(value);

export function seriesOf(ranking) {
  if (!isRanking(ranking)) return null;
  return ranking === "NC" ? "E" : ranking[0];
}

export const COACH_LEVELS = ["ANIMATEUR", "MSIN", "MSED", "MSEN"];
