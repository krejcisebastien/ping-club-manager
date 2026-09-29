// Critères de l'évaluation sportive (notes sur 10). `criterion` est la valeur
// de l'enum backend EvaluationCriterion (grille de points d'évaluation) ;
// doit rester aligné sur backend/src/lib/evaluation.js.
export const EVALUATION_CRITERIA = [
  { key: "service", criterion: "SERVICE", label: "Service", color: "#0ea5e9" },
  { key: "remise", criterion: "REMISE", label: "Remise", color: "#8b5cf6" },
  { key: "coupDroit", criterion: "COUP_DROIT", label: "Coup droit", color: "#f97316" },
  { key: "revers", criterion: "REVERS", label: "Revers", color: "#22c55e" },
  { key: "deplacements", criterion: "DEPLACEMENTS", label: "Déplacements", color: "#ef4444" },
  { key: "tactique", criterion: "TACTIQUE", label: "Tactique", color: "#eab308" },
  { key: "mental", criterion: "MENTAL", label: "Mental", color: "#14b8a6" },
  { key: "physique", criterion: "PHYSIQUE", label: "Physique", color: "#6366f1" },
];

// Note sur 10 d'un critère à partir de points notés de 1 à 5 : moyenne x 2,
// arrondie au dixième (même calcul que le backend).
export const criterionScore = (scores) =>
  scores.length ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 20) / 10 : null;

// 7 -> "7", 7.3 -> "7,3"
export const formatScore = (v) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 1 }));
