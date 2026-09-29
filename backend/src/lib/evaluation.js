// Critères de l'évaluation sportive : clé de colonne de Evaluation <-> valeur
// de l'enum EvaluationCriterion (grille de points d'évaluation).
export const CRITERIA = {
  service: "SERVICE",
  remise: "REMISE",
  coupDroit: "COUP_DROIT",
  revers: "REVERS",
  deplacements: "DEPLACEMENTS",
  tactique: "TACTIQUE",
  mental: "MENTAL",
  physique: "PHYSIQUE",
};
export const CRITERION_KEYS = Object.keys(CRITERIA);
export const CRITERION_VALUES = Object.values(CRITERIA);

// Note d'un critère sur 10 à partir de points notés de 1 à 5 : moyenne x 2,
// arrondie au dixième (ex. 4, 4 et 3 -> 7,3).
export const criterionScore = (scores) => Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 20) / 10;
