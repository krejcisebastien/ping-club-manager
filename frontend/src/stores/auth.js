import { defineStore } from "pinia";
import { api } from "../lib/api.js";
import { defaultRole } from "../lib/roles.js";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    loading: true,
    activeRole: localStorage.getItem("activeRole") || null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
    roles: (state) => state.user?.roles ?? [],
    isAdmin: (state) => !!state.user?.roles?.includes("ADMIN"),
    isCoach: (state) => !!state.user?.roles?.includes("COACH"),
    isPlayer: (state) => !!state.user?.roles?.includes("PLAYER"),
  },
  actions: {
    setActiveRole(role) {
      if (!this.user?.roles?.includes(role)) return;
      this.activeRole = role;
      localStorage.setItem("activeRole", role);
    },
    syncActiveRole() {
      if (!this.user?.roles?.includes(this.activeRole)) {
        this.setActiveRole(defaultRole(this.user?.roles));
      }
    },
    async login(email, password) {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      this.user = data.user;
      this.syncActiveRole();
      return data.user;
    },
    logout() {
      localStorage.removeItem("token");
      localStorage.removeItem("activeRole");
      this.user = null;
      this.activeRole = null;
    },
    async fetchMe() {
      this.loading = true;
      if (!localStorage.getItem("token")) {
        this.user = null;
        this.loading = false;
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        if (!Array.isArray(data.user?.roles)) {
          // Jeton émis avant le passage aux rôles multiples (ancien format
          // { role: "..." }) : session invalide, on force une reconnexion.
          this.logout();
          return;
        }
        this.user = data.user;
        this.syncActiveRole();
      } catch {
        localStorage.removeItem("token");
        this.user = null;
      } finally {
        this.loading = false;
      }
    },
  },
});
