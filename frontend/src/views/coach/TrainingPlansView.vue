<script setup>
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const router = useRouter();
const seasons = ref([]);
const selectedSeasonId = ref("");
const plans = ref([]);
const newPlan = ref({ title: "", description: "", periodStart: "", periodEnd: "" });
const error = ref("");

async function loadSeasons() {
  const { data } = await api.get("/seasons");
  seasons.value = data.seasons;
  if (!selectedSeasonId.value && seasons.value.length) {
    selectedSeasonId.value = seasons.value[0].id;
  }
}

async function loadPlans() {
  if (!selectedSeasonId.value) {
    plans.value = [];
    return;
  }
  const { data } = await api.get("/training-plans", { params: { seasonId: selectedSeasonId.value } });
  plans.value = data.plans;
}

onMounted(async () => {
  await loadSeasons();
  await loadPlans();
});

watch(selectedSeasonId, loadPlans);

async function onCreate() {
  error.value = "";
  try {
    await api.post("/training-plans", { seasonId: selectedSeasonId.value, ...newPlan.value });
    newPlan.value = { title: "", description: "", periodStart: "", periodEnd: "" };
    await loadPlans();
  } catch (err) {
    error.value = err.response?.data?.error ?? "Erreur lors de la création.";
  }
}
</script>

<template>
  <AppLayout title="Plans d'entrainement" :nav-links="navLinks">
    <div class="mb-4">
      <label class="text-xs text-slate-500">Saison</label>
      <select v-model="selectedSeasonId" class="block rounded-lg border border-slate-300 px-2 py-1.5">
        <option v-for="s in seasons" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-4 mb-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Liste</p>
      <ul class="divide-y divide-slate-100">
        <li
          v-for="p in plans"
          :key="p.id"
          class="py-2 flex items-center justify-between cursor-pointer hover:text-sky-600"
          @click="router.push(`/coach/training-plans/${p.id}`)"
        >
          <span>{{ p.title }}</span>
          <span class="text-xs text-slate-400">{{ p.coach ? `${p.coach.firstName} ${p.coach.lastName}` : "" }}</span>
        </li>
        <li v-if="!plans.length" class="py-2 text-slate-400 text-sm">Aucun plan pour cette saison.</li>
      </ul>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Nouveau plan</p>
      <form class="grid gap-2 sm:grid-cols-2" @submit.prevent="onCreate">
        <input v-model="newPlan.title" placeholder="Titre" required class="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-1.5" />
        <div>
          <label class="text-xs text-slate-500">Début (optionnel)</label>
          <input v-model="newPlan.periodStart" type="date" class="w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </div>
        <div>
          <label class="text-xs text-slate-500">Fin (optionnel)</label>
          <input v-model="newPlan.periodEnd" type="date" class="w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </div>
        <textarea v-model="newPlan.description" placeholder="Description (optionnel)" class="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-1.5" rows="3"></textarea>
        <button type="submit" class="sm:col-span-2 rounded-lg bg-sky-600 text-white py-1.5 font-medium hover:bg-sky-700">
          Créer
        </button>
      </form>
      <p v-if="error" class="text-sm text-red-600 mt-2">{{ error }}</p>
    </div>
  </AppLayout>
</template>
