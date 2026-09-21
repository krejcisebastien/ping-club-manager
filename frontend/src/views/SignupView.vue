<script setup>
import { ref, onMounted } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth.js";
import { CLUB_NAME } from "../lib/config.js";
import { roleHome } from "../lib/roles.js";
import { api } from "../lib/api.js";

const auth = useAuthStore();
const router = useRouter();

const enabled = ref(null);
const clubName = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const error = ref("");

onMounted(async () => {
  try {
    enabled.value = (await api.get("/clubs/signup")).data.enabled;
  } catch {
    enabled.value = false;
  }
});

async function onSubmit() {
  error.value = "";
  if (password.value !== confirmPassword.value) {
    error.value = "Les deux mots de passe ne correspondent pas.";
    return;
  }
  loading.value = true;
  try {
    await auth.signup(clubName.value, email.value, password.value);
    router.push(roleHome(auth.activeRole));
  } catch (err) {
    error.value = err.response?.data?.error ?? "Une erreur est survenue.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8">
    <div class="w-full max-w-sm bg-white rounded-xl shadow-md p-6 space-y-4">
      <h1 class="text-xl font-semibold text-slate-800 text-center">{{ CLUB_NAME }}</h1>

      <p v-if="enabled === false" class="text-sm text-slate-600">
        La création de club n'est pas ouverte pour le moment.
        <RouterLink to="/login" class="text-sky-600 hover:text-sky-700">Retour à la connexion</RouterLink>
      </p>

      <form v-else-if="enabled" class="space-y-4" @submit.prevent="onSubmit">
        <p class="text-sm text-slate-600">
          Crée ton club : tu en deviens l'administrateur et tu pourras ensuite ajouter tes joueurs, entraineurs et
          comptes.
        </p>

        <div class="space-y-1">
          <label class="text-sm font-medium text-slate-600" for="clubName">Nom du club</label>
          <input
            id="clubName"
            v-model="clubName"
            type="text"
            required
            class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium text-slate-600" for="email">Ton email</label>
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
          {{ loading ? "Création..." : "Créer mon club" }}
        </button>

        <RouterLink to="/login" class="block text-center text-sm text-sky-600 hover:text-sky-700">
          J'ai déjà un compte
        </RouterLink>
      </form>
    </div>
  </div>
</template>
