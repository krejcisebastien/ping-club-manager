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
const trainings = ref([]);
const selectedTrainingId = ref("");
const occurrences = ref([]);

async function loadSeasons() {
  const { data } = await api.get("/seasons");
  seasons.value = data.seasons;
  if (!selectedSeasonId.value && seasons.value.length) {
    selectedSeasonId.value = seasons.value[0].id;
  }
}

async function loadTrainings() {
  trainings.value = [];
  occurrences.value = [];
  selectedTrainingId.value = "";
  if (!selectedSeasonId.value) return;
  const { data } = await api.get("/trainings", { params: { seasonId: selectedSeasonId.value } });
  trainings.value = data.trainings;
}

async function loadOccurrences() {
  occurrences.value = [];
  if (!selectedTrainingId.value) return;
  const { data } = await api.get(`/trainings/${selectedTrainingId.value}/occurrences`);
  occurrences.value = data.occurrences;
}

onMounted(async () => {
  await loadSeasons();
  await loadTrainings();
});

watch(selectedSeasonId, loadTrainings);
watch(selectedTrainingId, loadOccurrences);
</script>

<template>
  <AppLayout title="Prise de présence" :nav-links="navLinks">
    <div class="grid gap-3 sm:grid-cols-2 mb-4">
      <div>
        <label class="text-xs text-slate-500">Saison</label>
        <select v-model="selectedSeasonId" class="block w-full rounded-lg border border-slate-300 px-2 py-1.5">
          <option v-for="s in seasons" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
      <div>
        <label class="text-xs text-slate-500">Entrainement</label>
        <select v-model="selectedTrainingId" class="block w-full rounded-lg border border-slate-300 px-2 py-1.5">
          <option value="" disabled>Choisir…</option>
          <option v-for="t in trainings" :key="t.id" :value="t.id">{{ t.name }} — {{ t.group?.name }}</option>
        </select>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Séances</p>
      <ul class="divide-y divide-slate-100">
        <li
          v-for="o in occurrences"
          :key="o.id"
          class="py-2 flex items-center justify-between cursor-pointer hover:text-sky-600"
          @click="router.push(`/coach/attendance/${o.id}`)"
        >
          <span>{{ new Date(o.date).toLocaleDateString("fr-FR") }} · {{ o.startTime }}–{{ o.endTime }}</span>
          <span class="text-xs text-slate-400">{{ o.status }}</span>
        </li>
        <li v-if="!occurrences.length" class="py-2 text-slate-400 text-sm">Sélectionne un entrainement.</li>
      </ul>
    </div>
  </AppLayout>
</template>
