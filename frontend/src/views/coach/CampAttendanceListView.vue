<script setup>
import { ref, onMounted, watch, computed } from "vue";
import { useRouter } from "vue-router";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const router = useRouter();
const seasons = ref([]);
const selectedSeasonId = ref("");
const camps = ref([]);
const selectedCampId = ref("");
const camp = ref(null);

const periodGroups = computed(() => {
  if (!camp.value) return [];
  return camp.value.days.flatMap((day) =>
    day.periods.flatMap((period) =>
      period.groups.map((pg) => ({
        id: pg.id,
        label: `${new Date(day.date).toLocaleDateString("fr-FR")} · ${period.label} · ${pg.group.name}`,
      }))
    )
  );
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
  selectedCampId.value = "";
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
        <label class="text-xs text-slate-500">Saison</label>
        <select v-model="selectedSeasonId" class="block w-full rounded-lg border border-slate-300 px-2 py-1.5">
          <option v-for="s in seasons" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
      <div>
        <label class="text-xs text-slate-500">Stage</label>
        <select v-model="selectedCampId" class="block w-full rounded-lg border border-slate-300 px-2 py-1.5">
          <option value="" disabled>Choisir…</option>
          <option v-for="c in camps" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Périodes / groupes</p>
      <ul class="divide-y divide-slate-100">
        <li
          v-for="pg in periodGroups"
          :key="pg.id"
          class="py-2 cursor-pointer hover:text-sky-600"
          @click="router.push(`/coach/camp-attendance/${pg.id}`)"
        >
          {{ pg.label }}
        </li>
        <li v-if="!periodGroups.length" class="py-2 text-slate-400 text-sm">Sélectionne un stage.</li>
      </ul>
    </div>
  </AppLayout>
</template>
