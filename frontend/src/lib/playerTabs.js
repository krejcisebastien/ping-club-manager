// Onglets communs aux fiches joueur (staff et espace joueur), gardés dans
// l'adresse (?onglet=) pour y revenir après un retour arrière ou un lien.
import { computed } from "vue";

export const PLAYER_TABS = [
  { key: "fiche", label: "Fiche informative", short: "Fiche" },
  { key: "evaluations", label: "Évaluations", short: "Évaluations" },
  { key: "resultats", label: "Résultats et compétitions", short: "Résultats" },
];

export function useTabQuery(route, router) {
  return computed({
    get: () => (PLAYER_TABS.some((t) => t.key === route.query.onglet) ? route.query.onglet : "fiche"),
    set: (key) => router.replace({ query: { ...route.query, onglet: key } }),
  });
}
