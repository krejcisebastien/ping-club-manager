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
      localStorage.setItem("token", data.token);
      this.user = data.user;
      return data.user;
    },
    logout() {
      localStorage.removeItem("token");
      this.user = null;
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
        this.user = data.user;
      } catch {
        localStorage.removeItem("token");
        this.user = null;
      } finally {
        this.loading = false;
      }
    },
  },
});
