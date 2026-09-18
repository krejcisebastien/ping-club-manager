<script setup>
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const router = useRouter();
const seasons = ref([]);
const selectedSeasonId = ref("");
const groups = ref([]);
const trainings = ref([]);
const error = ref("");

const newTraining = ref({ name: "", groupId: "", location: "", weekday: "", startTime: "", endTime: "" });

async function loadSeasons() {
  const { data } = await api.get("/seasons");
  seasons.value = data.seasons;
  if (!selectedSeasonId.value && seasons.value.length) {
    selectedSeasonId.value = seasons.value[0].id;
  }
}

async function loadGroupsAndTrainings() {
  if (!selectedSeasonId.value) {
    groups.value = [];
    trainings.value = [];
    return;
  }
  const [g, t] = await Promise.all([
    api.get("/groups", { params: { seasonId: selectedSeasonId.value } }),
    api.get("/trainings", { params: { seasonId: selectedSeasonId.value } }),
  ]);
  groups.value = g.data.groups;
  trainings.value = t.data.trainings;
}

onMounted(async () => {
  await loadSeasons();
  await loadGroupsAndTrainings();
});

watch(selectedSeasonId, loadGroupsAndTrainings);

async function onCreateTraining() {
  error.value = "";
  try {
    await api.post("/trainings", {
      seasonId: selectedSeasonId.value,
      ...newTraining.value,
      weekday: newTraining.value.weekday === "" ? null : Number(newTraining.value.weekday),
    });
    newTraining.value = { name: "", groupId: "", location: "", weekday: "", startTime: "", endTime: "" };
    await loadGroupsAndTrainings();
  } catch (err) {
    error.value = err.response?.data?.error ?? "Erreur lors de la création.";
  }
}
</script>

<template>
  <AppLayout title="Entrainements" :nav-links="navLinks">
    <div class="mb-4">
      <label class="text-xs text-slate-500">Saison</label>
      <select v-model="selectedSeasonId" class="block rounded-lg border border-slate-300 px-2 py-1.5">
        <option v-for="s in seasons" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Liste</p>
      <ul class="divide-y divide-slate-100">
        <li
          v-for="t in trainings"
          :key="t.id"
          class="py-2 flex items-center justify-between cursor-pointer hover:text-sky-600"
          @click="router.push(`/admin/trainings/${t.id}`)"
        >
          <span>{{ t.name }} <span class="text-xs text-slate-400">— {{ t.group?.name }}</span></span>
          <span class="text-xs text-slate-400">
            {{ t.weekday != null ? WEEKDAYS[t.weekday] : "" }} {{ t.startTime }}–{{ t.endTime }}
          </span>
        </li>
        <li v-if="!trainings.length" class="py-2 text-slate-400 text-sm">Aucun entrainement pour cette saison.</li>
      </ul>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Nouvel entrainement</p>
      <form class="grid gap-2 sm:grid-cols-2" @submit.prevent="onCreateTraining">
        <input v-model="newTraining.name" placeholder="Nom" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <select v-model="newTraining.groupId" required class="rounded-lg border border-slate-300 px-2 py-1.5">
          <option value="" disabled>Groupe…</option>
          <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
        <input v-model="newTraining.location" placeholder="Lieu (optionnel)" class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <select v-model="newTraining.weekday" class="rounded-lg border border-slate-300 px-2 py-1.5">
          <option value="">Jour de semaine…</option>
          <option v-for="(d, i) in WEEKDAYS" :key="i" :value="i">{{ d }}</option>
        </select>
        <input v-model="newTraining.startTime" type="time" placeholder="Début" class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <input v-model="newTraining.endTime" type="time" placeholder="Fin" class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <button type="submit" class="sm:col-span-2 rounded-lg bg-sky-600 text-white py-1.5 font-medium hover:bg-sky-700">
          Créer
        </button>
      </form>
      <p v-if="error" class="text-sm text-red-600 mt-2">{{ error }}</p>
    </div>
  </AppLayout>
</template>
