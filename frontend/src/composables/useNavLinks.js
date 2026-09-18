import { computed } from "vue";
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
];

const COACH_LINKS = [
  { to: "/coach", label: "Tableau de bord", icon: "pi pi-home" },
  { to: "/admin/players", label: "Joueurs", icon: "pi pi-users" },
  { to: "/admin/sparrings", label: "Sparrings", icon: "pi pi-bolt" },
  { to: "/coach/attendance", label: "Présences entrainements", icon: "pi pi-check-square" },
  { to: "/coach/camps", label: "Présences stages", icon: "pi pi-check-circle" },
  { to: "/coach/exercises", label: "Exercices", icon: "pi pi-book" },
  { to: "/coach/training-plans", label: "Plans d'entrainement", icon: "pi pi-clipboard" },
];

const PLAYER_LINKS = [{ to: "/player", label: "Mon espace joueur", icon: "pi pi-user" }];

const LINKS_BY_ROLE = { ADMIN: ADMIN_LINKS, COACH: COACH_LINKS, PLAYER: PLAYER_LINKS };

// Un compte peut cumuler plusieurs rôles (ADMIN + COACH + PLAYER), mais la
// navigation n'affiche que le menu du rôle actif à un instant donné
// (auth.activeRole), pour rester lisible — un bouton dans la zone de compte
// permet de basculer d'un rôle à l'autre.
export function useNavLinks() {
  const auth = useAuthStore();
  return computed(() => LINKS_BY_ROLE[auth.activeRole] ?? []);
}
