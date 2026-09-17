import { defineStore } from "pinia";
import { api } from "../lib/api.js";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    loading: true,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
    role: (state) => state.user?.role ?? null,
  },
  actions: {
    async login(email, password) {
      const { data } = await api.post("/auth/login", { email, password });
      this.user = data.user;
      return data.user;
    },
    async logout() {
      await api.post("/auth/logout");
      this.user = null;
    },
    async fetchMe() {
      this.loading = true;
      try {
        const { data } = await api.get("/auth/me");
        this.user = data.user;
      } catch {
        this.user = null;
      } finally {
        this.loading = false;
      }
    },
  },
});
