import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth.js";
import { roleHome } from "../lib/roles.js";

const routes = [
  { path: "/", redirect: "/login" },
  { path: "/login", name: "login", component: () => import("../views/LoginView.vue") },
  { path: "/license", name: "license", component: () => import("../views/LicenseView.vue") },
  {
    path: "/platform",
    name: "platform",
    component: () => import("../views/admin/PlatformView.vue"),
    meta: { roles: ["ADMIN"], platform: true },
  },
  { path: "/signup", name: "signup", component: () => import("../views/SignupView.vue") },
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
    path: "/admin/rates",
    name: "admin-rates",
    component: () => import("../views/admin/RatesView.vue"),
    meta: { roles: ["ADMIN"] },
  },
  {
    path: "/admin/groups",
    name: "admin-groups",
    component: () => import("../views/admin/GroupsView.vue"),
    meta: { roles: ["ADMIN", "COACH"] },
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
    path: "/coach/camp-attendance/day/:dayId",
    name: "coach-camp-day-attendance",
    component: () => import("../views/coach/CampDayAttendanceView.vue"),
    meta: { roles: ["ADMIN", "COACH"] },
  },
  {
    path: "/coach/camp-assignment/day/:dayId",
    name: "coach-camp-day-assignment",
    component: () => import("../views/coach/CampAssignmentView.vue"),
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
    component: () => import("../views/player/PlayerSpaceView.vue"),
    meta: { roles: ["PLAYER"] },
    children: [
      { path: "", name: "player-dashboard", component: () => import("../views/player/PlayerDashboardView.vue"), meta: { title: "Tableau de bord" } },
      { path: "evaluation", name: "player-evaluation", component: () => import("../views/player/PlayerEvaluationView.vue"), meta: { title: "Mon évaluation" } },
      { path: "follow-up", name: "player-follow-up", component: () => import("../views/player/PlayerFollowUpView.vue"), meta: { title: "Mon suivi" } },
      { path: "attendance", name: "player-attendance", component: () => import("../views/player/PlayerAttendanceView.vue"), meta: { title: "Mes présences" } },
      { path: "profile", name: "player-profile", component: () => import("../views/player/PlayerProfileView.vue"), meta: { title: "Ma fiche" } },
    ],
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

  if (to.name === "login" || to.name === "signup") {
    if (auth.isAuthenticated) return roleHome(auth.activeRole);
    return true;
  }

  if (to.name === "forgot-password" || to.name === "reset-password") return true;

  if (!auth.isAuthenticated) return "/login";

  // Sans licence valide, seule la page Licence est accessible.
  if (!auth.licenseActive) return to.name === "license" ? true : "/license";

  if (to.meta.platform && !auth.user?.isPlatformAdmin) return roleHome(auth.activeRole);

  const allowedRoles = to.meta.roles;
  if (allowedRoles && !allowedRoles.some((r) => auth.roles.includes(r))) {
    return roleHome(auth.activeRole);
  }

  return true;
});

export default router;
