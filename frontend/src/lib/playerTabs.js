// Onglets communs aux fiches joueur (staff et espace joueur), gardés dans
// l'adresse (?onglet=) pour y revenir après un retour arrière ou un lien.
import { computed } from "vue";

export const PLAYER_TABS = [
  { key: "fiche", label: "Fiche informative", short: "Fiche" },
  { key: "evaluations", label: "Évaluations", short: "Évaluations" },
  { key: "resultats", label: "Résultats et compétitions", short: "Résultats" },
];

// Fiche vue par le staff : les statistiques de présence ont leur propre onglet.
export const STAFF_PLAYER_TABS = [
  PLAYER_TABS[0],
  { key: "statistiques", label: "Statistiques", short: "Stats" },
  ...PLAYER_TABS.slice(1),
];

export function useTabQuery(route, router, tabs = PLAYER_TABS) {
  return computed({
    get: () => (tabs.some((t) => t.key === route.query.onglet) ? route.query.onglet : "fiche"),
    set: (key) => router.replace({ query: { ...route.query, onglet: key } }),
  });
}
