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
  <div class="min-h-screen bg-white lg:grid lg:grid-cols-[1.1fr_1fr]">
    <!-- Panneau d'accueil : bandeau en mobile, moitié gauche en desktop -->
    <section class="login-hero relative overflow-hidden bg-ink text-white px-6 pt-10 pb-16 lg:p-14 lg:flex lg:flex-col lg:justify-between">
      <div class="relative z-10 flex items-center gap-3">
        <img src="/pwa-192x192.png" alt="" class="h-12 w-12 rounded-2xl shadow-xl shadow-black/40" />
        <span class="font-bold text-lg">{{ CLUB_NAME }}</span>
      </div>
      <div class="relative z-10 mt-8 lg:mt-0 max-w-md">
        <h1 class="text-3xl lg:text-5xl font-extrabold leading-tight tracking-tight">
          Toute la vie du club,<br /><span class="text-brand-300">à portée de raquette.</span>
        </h1>
        <p class="hidden lg:block mt-5 text-slate-300 text-lg">
          Entrainements, présences, stages et progression des joueurs, au même endroit.
        </p>
      </div>
      <ul class="hidden lg:flex relative z-10 gap-6 text-sm text-slate-300">
        <li class="flex items-center gap-2"><i class="pi pi-calendar text-brand-300"></i>Séances</li>
        <li class="flex items-center gap-2"><i class="pi pi-check-circle text-brand-300"></i>Présences</li>
        <li class="flex items-center gap-2"><i class="pi pi-chart-line text-brand-300"></i>Progression</li>
      </ul>
      <!-- Décor : table vue de dessus et balle -->
      <svg class="absolute inset-0 h-full w-full" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="glow" cx="80%" cy="10%" r="70%">
            <stop offset="0" stop-color="#2554eb" stop-opacity="0.55" />
            <stop offset="1" stop-color="#0b1b34" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="600" height="800" fill="url(#glow)" />
        <g stroke="#fff" stroke-opacity="0.08" stroke-width="3" fill="none" transform="rotate(-18 300 400)">
          <rect x="120" y="120" width="420" height="640" rx="6" />
          <line x1="330" y1="120" x2="330" y2="760" />
          <line x1="100" y1="440" x2="560" y2="440" stroke-width="6" stroke-opacity="0.14" />
        </g>
        <circle cx="500" cy="660" r="26" fill="#fff" fill-opacity="0.9" />
        <circle cx="492" cy="652" r="8" fill="#fff" />
        <path d="M380 720 Q440 600 500 660" stroke="#fff" stroke-opacity="0.18" stroke-width="2" stroke-dasharray="4 8" fill="none" />
      </svg>
    </section>

    <!-- Formulaire -->
    <section class="relative -mt-8 lg:mt-0 rounded-t-3xl lg:rounded-none bg-white px-6 pt-8 pb-10 lg:flex lg:items-center lg:justify-center">
      <form class="w-full max-w-sm mx-auto space-y-5" @submit.prevent="onSubmit">
        <div>
          <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Bienvenue</h2>
          <p class="text-sm text-slate-500 mt-1">Connecte-toi pour retrouver ton espace.</p>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-semibold text-slate-700" for="email">Email</label>
          <div class="relative">
            <i class="pi pi-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="prenom.nom@exemple.be"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-3 focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-100 transition"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="text-sm font-semibold text-slate-700" for="password">Mot de passe</label>
            <RouterLink to="/forgot-password" class="text-xs font-medium text-brand-600 hover:text-brand-700">
              Mot de passe oublié ?
            </RouterLink>
          </div>
          <div class="relative">
            <i class="pi pi-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-3 focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-100 transition"
            />
          </div>
        </div>

        <p v-if="error" class="flex items-center gap-2 rounded-lg bg-racket-50 px-3 py-2 text-sm text-racket-700">
          <i class="pi pi-exclamation-circle"></i>{{ error }}
        </p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-xl bg-brand-600 text-white py-3 font-semibold shadow-lg shadow-brand-600/25 hover:bg-brand-700 active:scale-[0.99] transition disabled:opacity-60"
        >
          {{ loading ? "Connexion..." : "Se connecter" }}
          <i v-if="!loading" class="pi pi-arrow-right ml-2 text-sm"></i>
        </button>

        <div v-if="signupEnabled" class="border-t border-slate-200 pt-4 text-center text-sm text-slate-600">
          Nouveau club ?
          <RouterLink to="/signup" class="text-brand-600 hover:text-brand-700 font-semibold">Créer mon club</RouterLink>
        </div>
      </form>
    </section>
  </div>
</template>
