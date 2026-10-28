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

export const evaluationAverage = (e) => EVALUATION_CRITERIA.reduce((sum, c) => sum + e[c.key], 0) / EVALUATION_CRITERIA.length;

// Points forts et points à améliorer d'une évaluation : les points de la grille
// notés 4-5 (forts) et 1-2 (à améliorer) ; sans point de grille noté, les
// critères à 7/10 ou plus et à 4/10 ou moins.
export function strengthsAndWeaknesses(evaluation) {
  const criterionOf = new Map(EVALUATION_CRITERIA.map((c) => [c.criterion, c]));
  const items = evaluation?.itemScores ?? [];
  if (items.length) {
    const toEntry = (i) => ({ id: i.id, label: i.label, criterion: criterionOf.get(i.criterion), score: i.score, max: 5 });
    return {
      strengths: items.filter((i) => i.score >= 4).sort((a, b) => b.score - a.score).map(toEntry),
      weaknesses: items.filter((i) => i.score <= 2).sort((a, b) => a.score - b.score).map(toEntry),
    };
  }
  const toEntry = (c) => ({ id: c.key, label: c.label, criterion: c, score: evaluation[c.key], max: 10 });
  return {
    strengths: EVALUATION_CRITERIA.filter((c) => evaluation[c.key] >= 7).sort((a, b) => evaluation[b.key] - evaluation[a.key]).map(toEntry),
    weaknesses: EVALUATION_CRITERIA.filter((c) => evaluation[c.key] <= 4).sort((a, b) => evaluation[a.key] - evaluation[b.key]).map(toEntry),
  };
}
