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

// Renvoie les liens de navigation adaptés au rôle réel de l'utilisateur connecté,
// même sur les pages accessibles à la fois par l'admin et l'entraineur (ex. fiche joueur) —
// pour ne jamais afficher de lien vers une page que l'utilisateur ne peut pas ouvrir.
export function useNavLinks() {
  const auth = useAuthStore();
  return computed(() => (auth.role === "ADMIN" ? ADMIN_LINKS : COACH_LINKS));
}
