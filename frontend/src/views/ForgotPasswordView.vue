<script setup>
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { CLUB_NAME } from "../lib/config.js";
import { api } from "../lib/api.js";

const email = ref("");
const loading = ref(false);
const sent = ref(false);
const error = ref("");

async function onSubmit() {
  error.value = "";
  loading.value = true;
  try {
    await api.post("/auth/forgot-password", { email: email.value });
    sent.value = true;
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

      <div v-if="sent" class="space-y-4">
        <p class="text-sm text-slate-600">
          Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé. Pense à vérifier tes
          spams.
        </p>
        <RouterLink to="/login" class="block text-center text-sm text-sky-600 hover:text-sky-700">
          Retour à la connexion
        </RouterLink>
      </div>

      <form v-else class="space-y-4" @submit.prevent="onSubmit">
        <p class="text-sm text-slate-600">Indique ton email, on t'envoie un lien pour choisir un nouveau mot de passe.</p>

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

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-lg bg-sky-600 text-white py-2 font-medium hover:bg-sky-700 disabled:opacity-60"
        >
          {{ loading ? "Envoi..." : "Envoyer le lien" }}
        </button>

        <RouterLink to="/login" class="block text-center text-sm text-sky-600 hover:text-sky-700">
          Retour à la connexion
        </RouterLink>
      </form>
    </div>
  </div>
</template>
