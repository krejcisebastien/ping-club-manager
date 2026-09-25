import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth.js";

const ADMIN_LINKS = [
  { to: "/admin", label: "Vue d'ensemble", icon: "pi pi-home" },
  { to: "/admin/players", label: "Joueurs", icon: "pi pi-users" },
  { to: "/admin/coaches", label: "Entraineurs", icon: "pi pi-user" },
  { to: "/admin/sparrings", label: "Sparrings", icon: "pi pi-bolt" },
  { to: "/admin/users", label: "Utilisateurs", icon: "pi pi-key" },
  { to: "/admin/groups", label: "Groupes", icon: "pi pi-sitemap" },
  { to: "/admin/trainings", label: "Entrainements", icon: "pi pi-clock" },
  { to: "/admin/camps", label: "Stages", icon: "pi pi-calendar" },
  { to: "/coach/exercises", label: "Exercices", icon: "pi pi-book" },
  { to: "/coach/training-plans", label: "Plans d'entrainement", icon: "pi pi-clipboard" },
  { to: "/admin/rates", label: "Tarifs", icon: "pi pi-euro" },
  { to: "/admin/volunteering", label: "Fiches bénévolat", icon: "pi pi-file-excel" },
  { to: "/license", label: "Licence", icon: "pi pi-credit-card" },
];

const COACH_LINKS = [
  { to: "/coach", label: "Tableau de bord", icon: "pi pi-home" },
  { to: "/admin/players", label: "Joueurs", icon: "pi pi-users" },
  { to: "/admin/sparrings", label: "Sparrings", icon: "pi pi-bolt" },
  { to: "/admin/groups", label: "Groupes", icon: "pi pi-sitemap" },
  { to: "/coach/attendance", label: "Présences entrainements", icon: "pi pi-check-square" },
  { to: "/coach/camps", label: "Présences stages", icon: "pi pi-check-circle" },
  { to: "/coach/exercises", label: "Exercices", icon: "pi pi-book" },
  { to: "/coach/training-plans", label: "Plans d'entrainement", icon: "pi pi-clipboard" },
];

// Menu de l'espace joueur : les liens dépendent du joueur affiché (un compte
// familial peut en avoir plusieurs). Pour ajouter une page (compétitions,
// analyses de jeu...), ajouter une entrée ici et une route enfant de /player/:id.
function playerLinks(playerId, hasSeveralPlayers) {
  const links = playerId
    ? [
        { to: `/player/${playerId}`, label: "Tableau de bord", icon: "pi pi-home", exact: true },
        { to: `/player/${playerId}/evaluation`, label: "Mon évaluation", icon: "pi pi-chart-bar" },
        { to: `/player/${playerId}/follow-up`, label: "Mon suivi", icon: "pi pi-flag" },
        { to: `/player/${playerId}/attendance`, label: "Mes présences", icon: "pi pi-check-square" },
        { to: `/player/${playerId}/profile`, label: "Ma fiche", icon: "pi pi-id-card" },
      ]
    : [];
  if (hasSeveralPlayers) links.push({ to: "/player", label: "Changer de joueur", icon: "pi pi-users" });
  return links;
}

const PLATFORM_LINK = { to: "/platform", label: "Plateforme", icon: "pi pi-globe" };
// Manuel utilisateur, en fin de menu pour tous les rôles.
const HELP_LINK = { to: "/help", label: "Aide", icon: "pi pi-question-circle" };

const LINKS_BY_ROLE = { ADMIN: ADMIN_LINKS, COACH: COACH_LINKS };

// Un compte peut cumuler plusieurs rôles (ADMIN + COACH + PLAYER), mais la
// navigation n'affiche que le menu du rôle actif à un instant donné
// (auth.activeRole), pour rester lisible — un bouton dans la zone de compte
// permet de basculer d'un rôle à l'autre.
export function useNavLinks() {
  const auth = useAuthStore();
  const route = useRoute();
  return computed(() => {
    if (auth.activeRole === "PLAYER") {
      const ids = auth.user?.playerIds ?? [];
      const playerId = ids.includes(route.params.id) ? route.params.id : ids.length === 1 ? ids[0] : null;
      return [...playerLinks(playerId, ids.length > 1), HELP_LINK];
    }
    const links = LINKS_BY_ROLE[auth.activeRole] ?? [];
    // Gestion de la plateforme : réservée au propriétaire (PLATFORM_ADMIN_EMAILS).
    const withPlatform = auth.activeRole === "ADMIN" && auth.user?.isPlatformAdmin ? [...links, PLATFORM_LINK] : links;
    return [...withPlatform, HELP_LINK];
  });
}
