<script setup>
import { ref, onMounted, watch, computed } from "vue";
import { useRouter } from "vue-router";
import Dropdown from "primevue/dropdown";
import Button from "primevue/button";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const router = useRouter();
const seasons = ref([]);
const selectedSeasonId = ref("");
const camps = ref([]);
const selectedCampId = ref(null);
const camp = ref(null);

const days = computed(() => {
  if (!camp.value) return [];
  return camp.value.days.map((day) => ({
    id: day.id,
    date: new Date(day.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
    periodGroups: day.periods.flatMap((period) =>
      period.groups.map((pg) => ({ id: pg.id, label: `${period.label} · ${pg.group.name}` }))
    ),
  }));
});

async function loadSeasons() {
  const { data } = await api.get("/seasons");
  seasons.value = data.seasons;
  if (!selectedSeasonId.value && seasons.value.length) {
    selectedSeasonId.value = seasons.value[0].id;
  }
}

async function loadCamps() {
  camps.value = [];
  selectedCampId.value = null;
  camp.value = null;
  if (!selectedSeasonId.value) return;
  const { data } = await api.get("/camps", { params: { seasonId: selectedSeasonId.value } });
  camps.value = data.camps;
}

async function loadCamp() {
  camp.value = null;
  if (!selectedCampId.value) return;
  const { data } = await api.get(`/camps/${selectedCampId.value}`);
  camp.value = data.camp;
}

onMounted(async () => {
  await loadSeasons();
  await loadCamps();
});

watch(selectedSeasonId, loadCamps);
watch(selectedCampId, loadCamp);
</script>

<template>
  <AppLayout title="Présences — stages" :nav-links="navLinks">
    <div class="grid gap-3 sm:grid-cols-2 mb-4">
      <div>
        <label class="text-xs text-slate-500 block mb-1">Saison</label>
        <Dropdown v-model="selectedSeasonId" :options="seasons" option-label="name" option-value="id" class="w-full" />
      </div>
      <div>
        <label class="text-xs text-slate-500 block mb-1">Stage</label>
        <Dropdown v-model="selectedCampId" :options="camps" option-label="name" option-value="id" placeholder="Choisir…" class="w-full" />
      </div>
    </div>

    <div class="grid gap-3">
      <div v-for="day in days" :key="day.id" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <p class="font-medium text-slate-700 capitalize">{{ day.date }}</p>
          <Button label="Présences de la journée" icon="pi pi-check-square" size="small" @click="router.push(`/coach/camp-attendance/day/${day.id}`)" />
        </div>
        <div v-if="day.periodGroups.length" class="flex flex-wrap gap-1 mt-3">
          <Button
            v-for="pg in day.periodGroups"
            :key="pg.id"
            :label="pg.label"
            size="small"
            text
            severity="secondary"
            @click="router.push(`/coach/camp-attendance/${pg.id}`)"
          />
        </div>
        <p v-else class="text-sm text-slate-400 mt-2">Aucun groupe affecté à cette journée.</p>
      </div>
      <p v-if="!days.length" class="text-slate-400 text-sm">Sélectionne un stage.</p>
    </div>
  </AppLayout>
</template>
