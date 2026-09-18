import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth.js";
import { roleHome } from "../lib/roles.js";

const routes = [
  { path: "/", redirect: "/login" },
  { path: "/login", name: "login", component: () => import("../views/LoginView.vue") },
  { path: "/forgot-password", name: "forgot-password", component: () => import("../views/ForgotPasswordView.vue") },
  { path: "/reset-password", name: "reset-password", component: () => import("../views/ResetPasswordView.vue") },
  {
    path: "/admin",
    name: "admin-dashboard",
    component: () => import("../views/admin/DashboardView.vue"),
    meta: { roles: ["ADMIN"] },
  },
  {
    path: "/admin/players",
    name: "admin-players",
    component: () => import("../views/admin/PlayersView.vue"),
    meta: { roles: ["ADMIN", "COACH"] },
  },
  {
    path: "/admin/players/:id",
    name: "admin-player-detail",
    component: () => import("../views/admin/PlayerDetailView.vue"),
    meta: { roles: ["ADMIN", "COACH"] },
  },
  {
    path: "/admin/coaches",
    name: "admin-coaches",
    component: () => import("../views/admin/CoachesView.vue"),
    meta: { roles: ["ADMIN"] },
  },
  {
    path: "/admin/sparrings",
    name: "admin-sparrings",
    component: () => import("../views/admin/SparringsView.vue"),
    meta: { roles: ["ADMIN", "COACH"] },
  },
  {
    path: "/admin/users",
    name: "admin-users",
    component: () => import("../views/admin/UsersView.vue"),
    meta: { roles: ["ADMIN"] },
  },
  {
    path: "/admin/groups",
    name: "admin-groups",
    component: () => import("../views/admin/GroupsView.vue"),
    meta: { roles: ["ADMIN"] },
  },
  {
    path: "/admin/trainings",
    name: "admin-trainings",
    component: () => import("../views/admin/TrainingsView.vue"),
    meta: { roles: ["ADMIN"] },
  },
  {
    path: "/admin/trainings/:id",
    name: "admin-training-detail",
    component: () => import("../views/admin/TrainingDetailView.vue"),
    meta: { roles: ["ADMIN"] },
  },
  {
    path: "/admin/camps",
    name: "admin-camps",
    component: () => import("../views/admin/CampsView.vue"),
    meta: { roles: ["ADMIN"] },
  },
  {
    path: "/admin/camps/:id",
    name: "admin-camp-detail",
    component: () => import("../views/admin/CampDetailView.vue"),
    meta: { roles: ["ADMIN"] },
  },
  {
    path: "/admin/camp-groups/:id",
    name: "admin-camp-group-detail",
    component: () => import("../views/admin/CampGroupDetailView.vue"),
    meta: { roles: ["ADMIN"] },
  },
  {
    path: "/admin/camp-period-groups/:id",
    name: "admin-camp-period-group",
    component: () => import("../views/admin/CampPeriodGroupView.vue"),
    meta: { roles: ["ADMIN"] },
  },
  {
    path: "/coach",
    name: "coach-dashboard",
    component: () => import("../views/coach/DashboardView.vue"),
    meta: { roles: ["ADMIN", "COACH"] },
  },
  {
    path: "/coach/attendance",
    name: "coach-attendance-list",
    component: () => import("../views/coach/AttendanceListView.vue"),
    meta: { roles: ["ADMIN", "COACH"] },
  },
  {
    path: "/coach/attendance/:occurrenceId",
    name: "coach-attendance-detail",
    component: () => import("../views/coach/AttendanceDetailView.vue"),
    meta: { roles: ["ADMIN", "COACH"] },
  },
  {
    path: "/coach/camps",
    name: "coach-camp-attendance-list",
    component: () => import("../views/coach/CampAttendanceListView.vue"),
    meta: { roles: ["ADMIN", "COACH"] },
  },
  {
    path: "/coach/camp-attendance/:periodGroupId",
    name: "coach-camp-attendance-detail",
    component: () => import("../views/coach/CampAttendanceDetailView.vue"),
    meta: { roles: ["ADMIN", "COACH"] },
  },
  {
    path: "/coach/exercises",
    name: "coach-exercises",
    component: () => import("../views/coach/ExercisesView.vue"),
    meta: { roles: ["ADMIN", "COACH"] },
  },
  {
    path: "/coach/exercises/:id",
    name: "coach-exercise-detail",
    component: () => import("../views/coach/ExerciseDetailView.vue"),
    meta: { roles: ["ADMIN", "COACH"] },
  },
  {
    path: "/coach/training-plans",
    name: "coach-training-plans",
    component: () => import("../views/coach/TrainingPlansView.vue"),
    meta: { roles: ["ADMIN", "COACH"] },
  },
  {
    path: "/coach/training-plans/:id",
    name: "coach-training-plan-detail",
    component: () => import("../views/coach/TrainingPlanDetailView.vue"),
    meta: { roles: ["ADMIN", "COACH"] },
  },
  {
    path: "/player",
    name: "player-selector",
    component: () => import("../views/player/SelectorView.vue"),
    meta: { roles: ["PLAYER"] },
  },
  {
    path: "/player/:id",
    name: "player-detail",
    component: () => import("../views/player/PlayerDetailView.vue"),
    meta: { roles: ["PLAYER"] },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (auth.loading) {
    await auth.fetchMe();
  }

  if (to.name === "login") {
    if (auth.isAuthenticated) return roleHome(auth.activeRole);
    return true;
  }

  if (to.name === "forgot-password" || to.name === "reset-password") return true;

  if (!auth.isAuthenticated) return "/login";

  const allowedRoles = to.meta.roles;
  if (allowedRoles && !allowedRoles.some((r) => auth.roles.includes(r))) {
    return roleHome(auth.activeRole);
  }

  return true;
});

export default router;
