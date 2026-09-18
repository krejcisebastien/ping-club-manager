<script setup>
import { ref } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import { CLUB_NAME } from "../lib/config.js";
import { api } from "../lib/api.js";

const route = useRoute();
const router = useRouter();
const token = route.query.token ?? "";

const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const done = ref(false);
const error = ref("");

async function onSubmit() {
  error.value = "";
  if (password.value !== confirmPassword.value) {
    error.value = "Les deux mots de passe ne correspondent pas.";
    return;
  }
  loading.value = true;
  try {
    await api.post("/auth/reset-password", { token, password: password.value });
    done.value = true;
    setTimeout(() => router.push("/login"), 2000);
  } catch (err) {
    error.value = err.response?.data?.error ?? "Une erreur est survenue.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-100 px-4">
    <div class="w-full max-w-sm bg-white rounded-xl shadow-md p-6 space-y-4">
      <h1 class="text-xl font-semibold text-slate-800 text-center">{{ CLUB_NAME }}</h1>

      <p v-if="!token" class="text-sm text-red-600">
        Ce lien de réinitialisation est invalide.
        <RouterLink to="/forgot-password" class="text-sky-600 hover:text-sky-700">Redemander un lien</RouterLink>
      </p>

      <div v-else-if="done" class="space-y-1">
        <p class="text-sm text-slate-600">Mot de passe mis à jour. Redirection vers la connexion...</p>
      </div>

      <form v-else class="space-y-4" @submit.prevent="onSubmit">
        <p class="text-sm text-slate-600">Choisis ton nouveau mot de passe.</p>

        <div class="space-y-1">
          <label class="text-sm font-medium text-slate-600" for="password">Nouveau mot de passe</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            minlength="8"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium text-slate-600" for="confirmPassword">Confirmer le mot de passe</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            required
            minlength="8"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-lg bg-sky-600 text-white py-2 font-medium hover:bg-sky-700 disabled:opacity-60"
        >
          {{ loading ? "Enregistrement..." : "Choisir ce mot de passe" }}
        </button>
      </form>
    </div>
  </div>
</template>
