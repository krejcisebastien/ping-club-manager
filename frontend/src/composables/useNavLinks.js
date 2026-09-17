import { computed } from "vue";
import { useAuthStore } from "../stores/auth.js";

const ADMIN_LINKS = [
  { to: "/admin", label: "Vue d'ensemble" },
  { to: "/admin/players", label: "Joueurs" },
  { to: "/admin/coaches", label: "Entraineurs" },
  { to: "/admin/users", label: "Utilisateurs" },
  { to: "/admin/groups", label: "Groupes" },
  { to: "/admin/trainings", label: "Entrainements" },
  { to: "/admin/camps", label: "Stages" },
  { to: "/coach/exercises", label: "Exercices" },
  { to: "/coach/training-plans", label: "Plans d'entrainement" },
];

const COACH_LINKS = [
  { to: "/coach", label: "Tableau de bord" },
  { to: "/admin/players", label: "Joueurs" },
  { to: "/coach/attendance", label: "Présences entrainements" },
  { to: "/coach/camps", label: "Présences stages" },
  { to: "/coach/exercises", label: "Exercices" },
  { to: "/coach/training-plans", label: "Plans d'entrainement" },
];

// Renvoie les liens de navigation adaptés au rôle réel de l'utilisateur connecté,
// même sur les pages accessibles à la fois par l'admin et l'entraineur (ex. fiche joueur) —
// pour ne jamais afficher de lien vers une page que l'utilisateur ne peut pas ouvrir.
export function useNavLinks() {
  const auth = useAuthStore();
  return computed(() => (auth.role === "ADMIN" ? ADMIN_LINKS : COACH_LINKS));
}
