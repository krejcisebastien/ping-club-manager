<script setup>
import { ref, onMounted } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth.js";
import { CLUB_NAME } from "../lib/config.js";
import { roleHome } from "../lib/roles.js";
import { api } from "../lib/api.js";

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const signupEnabled = ref(false);

const auth = useAuthStore();
const router = useRouter();

onMounted(async () => {
  try {
    signupEnabled.value = (await api.get("/clubs/signup")).data.enabled;
  } catch {
    // lien masqué si le serveur ne répond pas
  }
});

async function onSubmit() {
  error.value = "";
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    router.push(roleHome(auth.activeRole));
  } catch (err) {
    error.value = err.response?.data?.error ?? "Erreur de connexion.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-100 px-4">
    <form
      class="w-full max-w-sm bg-white rounded-xl shadow-md p-6 space-y-4"
      @submit.prevent="onSubmit"
    >
      <h1 class="text-xl font-semibold text-slate-800 text-center">{{ CLUB_NAME }}</h1>

      <div class="space-y-1">
        <label class="text-sm font-medium text-slate-600" for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium text-slate-600" for="password">Mot de passe</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-sky-600 text-white py-2 font-medium hover:bg-sky-700 disabled:opacity-60"
      >
        {{ loading ? "Connexion..." : "Se connecter" }}
      </button>

      <RouterLink to="/forgot-password" class="block text-center text-sm text-sky-600 hover:text-sky-700">
        Mot de passe oublié ?
      </RouterLink>

      <div v-if="signupEnabled" class="border-t border-slate-200 pt-4 text-center text-sm text-slate-600">
        Nouveau club ?
        <RouterLink to="/signup" class="text-sky-600 hover:text-sky-700 font-medium">Créer mon club</RouterLink>
      </div>
    </form>
  </div>
</template>
