import { defineStore } from "pinia";
import { api } from "../lib/api.js";
import { defaultRole } from "../lib/roles.js";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    loading: true,
    license: null,
    activeRole: localStorage.getItem("activeRole") || null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
    licenseActive: (state) => state.license?.active !== false,
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
    async startSession(data) {
      localStorage.setItem("token", data.token);
      this.user = data.user;
      this.syncActiveRole();
      await this.fetchLicense();
      return data.user;
    },
    async login(email, password) {
      const { data } = await api.post("/auth/login", { email, password });
      return this.startSession(data);
    },
    async signup(clubName, email, password) {
      const { data } = await api.post("/clubs/signup", { clubName, email, password });
      return this.startSession(data);
    },
    // Si le statut est illisible on laisse passer : l'API reste la référence et
    // refuse elle-même (402) toute requête d'un club sans licence valide.
    async fetchLicense() {
      try {
        this.license = (await api.get("/billing/status")).data;
      } catch {
        this.license = null;
      }
    },
    logout() {
      localStorage.removeItem("token");
      localStorage.removeItem("activeRole");
      this.user = null;
      this.activeRole = null;
      this.license = null;
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
        await this.fetchLicense();
      } catch {
        localStorage.removeItem("token");
        this.user = null;
      } finally {
        this.loading = false;
      }
    },
  },
});
