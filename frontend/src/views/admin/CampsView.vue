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
const camps = ref([]);
const newCamp = ref({ name: "", location: "", startDate: "", endDate: "" });
const error = ref("");

async function loadSeasons() {
  const { data } = await api.get("/seasons");
  seasons.value = data.seasons;
  if (!selectedSeasonId.value && seasons.value.length) {
    selectedSeasonId.value = seasons.value[0].id;
  }
}

async function loadCamps() {
  if (!selectedSeasonId.value) {
    camps.value = [];
    return;
  }
  const { data } = await api.get("/camps", { params: { seasonId: selectedSeasonId.value } });
  camps.value = data.camps;
}

onMounted(async () => {
  await loadSeasons();
  await loadCamps();
});

watch(selectedSeasonId, loadCamps);

async function onCreateCamp() {
  error.value = "";
  try {
    await api.post("/camps", { seasonId: selectedSeasonId.value, ...newCamp.value });
    newCamp.value = { name: "", location: "", startDate: "", endDate: "" };
    await loadCamps();
  } catch (err) {
    error.value = err.response?.data?.error ?? "Erreur lors de la création.";
  }
}
</script>

<template>
  <AppLayout title="Stages" :nav-links="navLinks">
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
          v-for="c in camps"
          :key="c.id"
          class="py-2 flex items-center justify-between cursor-pointer hover:text-sky-600"
          @click="router.push(`/admin/camps/${c.id}`)"
        >
          <span>{{ c.name }} <span class="text-xs text-slate-400">{{ c.location }}</span></span>
          <span class="text-xs text-slate-400">
            {{ new Date(c.startDate).toLocaleDateString("fr-FR") }} →
            {{ new Date(c.endDate).toLocaleDateString("fr-FR") }}
          </span>
        </li>
        <li v-if="!camps.length" class="py-2 text-slate-400 text-sm">Aucun stage pour cette saison.</li>
      </ul>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Nouveau stage</p>
      <form class="grid gap-2 sm:grid-cols-2" @submit.prevent="onCreateCamp">
        <input v-model="newCamp.name" placeholder="Nom" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <input v-model="newCamp.location" placeholder="Lieu (optionnel)" class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <div>
          <label class="text-xs text-slate-500">Début</label>
          <input v-model="newCamp.startDate" type="date" required class="w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </div>
        <div>
          <label class="text-xs text-slate-500">Fin</label>
          <input v-model="newCamp.endDate" type="date" required class="w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </div>
        <button type="submit" class="sm:col-span-2 rounded-lg bg-sky-600 text-white py-1.5 font-medium hover:bg-sky-700">
          Créer
        </button>
      </form>
      <p v-if="error" class="text-sm text-red-600 mt-2">{{ error }}</p>
    </div>
  </AppLayout>
</template>
