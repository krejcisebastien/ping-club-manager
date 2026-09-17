<script setup>
import { ref, onMounted } from "vue";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const seasons = ref([]);
const players = ref([]);
const coaches = ref([]);

const newSeason = ref({ name: "", startDate: "", endDate: "" });
const creating = ref(false);
const editingSeasonId = ref("");
const editSeasonForm = ref({ name: "", startDate: "", endDate: "", isActive: false });
const error = ref("");

async function loadSeasons() {
  const { data } = await api.get("/seasons");
  seasons.value = data.seasons;
}

onMounted(async () => {
  const [p, c] = await Promise.all([api.get("/players"), api.get("/coaches")]);
  players.value = p.data.players;
  coaches.value = c.data.coaches;
  await loadSeasons();
});

async function onCreateSeason() {
  error.value = "";
  creating.value = true;
  try {
    await api.post("/seasons", newSeason.value);
    newSeason.value = { name: "", startDate: "", endDate: "" };
    await loadSeasons();
  } catch (err) {
    error.value = err.response?.data?.error ?? "Erreur lors de la création.";
  } finally {
    creating.value = false;
  }
}

function onStartEditSeason(season) {
  editingSeasonId.value = season.id;
  editSeasonForm.value = {
    name: season.name,
    startDate: season.startDate.slice(0, 10),
    endDate: season.endDate.slice(0, 10),
    isActive: season.isActive,
  };
}

async function onSaveSeason(id) {
  await api.put(`/seasons/${id}`, editSeasonForm.value);
  editingSeasonId.value = "";
  await loadSeasons();
}
</script>

<template>
  <AppLayout title="Espace administrateur" :nav-links="navLinks">
    <div class="grid gap-4 sm:grid-cols-3 mb-6">
      <div class="bg-white rounded-xl shadow-sm p-4">
        <p class="text-sm text-slate-500">Saisons</p>
        <p class="text-2xl font-semibold">{{ seasons.length }}</p>
      </div>
      <RouterLink to="/admin/players" class="bg-white rounded-xl shadow-sm p-4 hover:ring-1 hover:ring-sky-300">
        <p class="text-sm text-slate-500">Joueurs</p>
        <p class="text-2xl font-semibold">{{ players.length }}</p>
      </RouterLink>
      <RouterLink to="/admin/coaches" class="bg-white rounded-xl shadow-sm p-4 hover:ring-1 hover:ring-sky-300">
        <p class="text-sm text-slate-500">Entraineurs</p>
        <p class="text-2xl font-semibold">{{ coaches.length }}</p>
      </RouterLink>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Saisons</p>
      <ul class="divide-y divide-slate-100 mb-4">
        <li v-for="s in seasons" :key="s.id" class="py-2">
          <form v-if="editingSeasonId === s.id" class="grid gap-2 sm:grid-cols-4 sm:items-end" @submit.prevent="onSaveSeason(s.id)">
            <input v-model="editSeasonForm.name" required class="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
            <input v-model="editSeasonForm.startDate" type="date" required class="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
            <input v-model="editSeasonForm.endDate" type="date" required class="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
            <div class="flex items-center gap-2">
              <label class="flex items-center gap-1 text-xs text-slate-500">
                <input v-model="editSeasonForm.isActive" type="checkbox" /> active
              </label>
              <button type="submit" class="rounded-lg bg-sky-600 text-white px-3 py-1 text-sm font-medium hover:bg-sky-700">OK</button>
              <button type="button" class="text-sm text-slate-500" @click="editingSeasonId = ''">annuler</button>
            </div>
          </form>
          <div v-else class="flex items-center justify-between">
            <span>
              {{ s.name }}
              <span v-if="s.isActive" class="text-xs text-emerald-600 font-medium">· active</span>
            </span>
            <div class="flex items-center gap-3">
              <span class="text-xs text-slate-400">
                {{ new Date(s.startDate).toLocaleDateString("fr-FR") }} →
                {{ new Date(s.endDate).toLocaleDateString("fr-FR") }}
              </span>
              <button class="text-xs text-sky-600 hover:underline" @click="onStartEditSeason(s)">modifier</button>
            </div>
          </div>
        </li>
        <li v-if="!seasons.length" class="py-2 text-slate-400 text-sm">Aucune saison créée.</li>
      </ul>

      <form class="grid gap-2 sm:grid-cols-4 sm:items-end" @submit.prevent="onCreateSeason">
        <div class="sm:col-span-2">
          <label class="text-xs text-slate-500">Nom</label>
          <input v-model="newSeason.name" required class="w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </div>
        <div>
          <label class="text-xs text-slate-500">Début</label>
          <input v-model="newSeason.startDate" type="date" required class="w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </div>
        <div>
          <label class="text-xs text-slate-500">Fin</label>
          <input v-model="newSeason.endDate" type="date" required class="w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </div>
        <button
          type="submit"
          :disabled="creating"
          class="sm:col-span-4 rounded-lg bg-sky-600 text-white py-1.5 font-medium hover:bg-sky-700 disabled:opacity-60"
        >
          Créer la saison
        </button>
      </form>
      <p v-if="error" class="text-sm text-red-600 mt-2">{{ error }}</p>
    </div>
  </AppLayout>
</template>
