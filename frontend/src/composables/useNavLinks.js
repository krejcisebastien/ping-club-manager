import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth.js";

// Menus rangés par domaine : `section` donne l'en-tête affiché au-dessus du
// groupe de liens (AppLayout regroupe les liens consécutifs de même section).
const ADMIN_LINKS = [
  { to: "/admin", label: "Vue d'ensemble", icon: "pi pi-home" },
  { section: "Membres", to: "/admin/players", label: "Joueurs", icon: "pi pi-users" },
  { section: "Membres", to: "/admin/coaches", label: "Entraineurs", icon: "pi pi-user" },
  { section: "Membres", to: "/admin/sparrings", label: "Sparrings", icon: "pi pi-bolt" },
  { section: "Membres", to: "/admin/groups", label: "Groupes", icon: "pi pi-sitemap" },
  { section: "Activités", to: "/admin/trainings", label: "Entrainements", icon: "pi pi-clock" },
  { section: "Activités", to: "/admin/camps", label: "Stages", icon: "pi pi-calendar" },
  { section: "Activités", to: "/coach/tournaments", label: "Tournois", icon: "pi pi-trophy" },
  { section: "Pédagogie", to: "/coach/exercises", label: "Exercices", icon: "pi pi-book" },
  { section: "Pédagogie", to: "/coach/training-plans", label: "Plans d'entrainement", icon: "pi pi-clipboard" },
  { section: "Pédagogie", to: "/admin/evaluation-grid", label: "Grille d'évaluation", icon: "pi pi-list-check" },
  { section: "Gestion du club", to: "/admin/rates", label: "Tarifs", icon: "pi pi-euro" },
  { section: "Gestion du club", to: "/admin/volunteering", label: "Fiches bénévolat", icon: "pi pi-file-excel" },
  { section: "Gestion du club", to: "/admin/users", label: "Utilisateurs", icon: "pi pi-key" },
  { section: "Gestion du club", to: "/license", label: "Licence", icon: "pi pi-credit-card" },
];

const COACH_LINKS = [
  { to: "/coach", label: "Tableau de bord", icon: "pi pi-home" },
  { to: "/coach/messages", label: "Échanges joueurs", icon: "pi pi-comments" },
  { section: "Présences", to: "/coach/attendance", label: "Entrainements", icon: "pi pi-check-square" },
  { section: "Présences", to: "/coach/camps", label: "Stages", icon: "pi pi-check-circle" },
  { section: "Membres", to: "/admin/players", label: "Joueurs", icon: "pi pi-users" },
  { section: "Membres", to: "/admin/groups", label: "Groupes", icon: "pi pi-sitemap" },
  { section: "Membres", to: "/admin/sparrings", label: "Sparrings", icon: "pi pi-bolt" },
  { section: "Membres", to: "/coach/tournaments", label: "Tournois", icon: "pi pi-trophy" },
  { section: "Pédagogie", to: "/coach/exercises", label: "Exercices", icon: "pi pi-book" },
  { section: "Pédagogie", to: "/coach/training-plans", label: "Plans d'entrainement", icon: "pi pi-clipboard" },
  { section: "Pédagogie", to: "/admin/evaluation-grid", label: "Grille d'évaluation", icon: "pi pi-list-check" },
];

// Menu de l'espace joueur : les liens dépendent du joueur affiché (un compte
// familial peut en avoir plusieurs). Pour ajouter une page (compétitions,
// analyses de jeu...), ajouter une entrée ici et une route enfant de /player/:id.
function playerLinks(playerId, hasSeveralPlayers) {
  const links = playerId
    ? [
        { to: `/player/${playerId}`, label: "Tableau de bord", icon: "pi pi-home", exact: true },
        { to: `/player/${playerId}/messages`, label: "Mes échanges", icon: "pi pi-comments" },
        { to: `/player/${playerId}/attendance`, label: "Mes présences", icon: "pi pi-check-square" },
        { to: `/player/${playerId}/profile`, label: "Ma fiche", icon: "pi pi-id-card" },
      ]
    : [];
  if (hasSeveralPlayers) links.push({ to: "/player", label: "Changer de joueur", icon: "pi pi-users" });
  return links;
}

const PLATFORM_LINK = { section: "Gestion du club", to: "/platform", label: "Plateforme", icon: "pi pi-globe" };
// Manuel utilisateur, en fin de menu pour tous les rôles.
const HELP_LINK = { section: "", separate: true, to: "/help", label: "Aide", icon: "pi pi-question-circle" };

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
