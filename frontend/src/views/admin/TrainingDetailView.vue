<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const route = useRoute();
const router = useRouter();
const trainingId = route.params.id;

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const training = ref(null);
const occurrences = ref([]);
const coaches = ref([]);
const sparrings = ref([]);
const groups = ref([]);
const editForm = ref({ name: "", location: "", weekday: "", startTime: "", endTime: "", groupId: "" });
const savingInfo = ref(false);
const generateForm = ref({ startDate: "", endDate: "" });
const generateResult = ref("");
const error = ref("");

const expandedOccurrenceId = ref("");
const occurrenceCoaches = ref([]);
const assignForm = ref({ type: "coach", id: "" });

async function loadTraining() {
  const { data } = await api.get(`/trainings/${trainingId}`);
  training.value = data.training;
  editForm.value = {
    name: data.training.name,
    location: data.training.location ?? "",
    weekday: data.training.weekday ?? "",
    startTime: data.training.startTime ?? "",
    endTime: data.training.endTime ?? "",
    groupId: data.training.groupId,
  };
}

async function onSaveInfo() {
  savingInfo.value = true;
  try {
    await api.put(`/trainings/${trainingId}`, {
      ...editForm.value,
      weekday: editForm.value.weekday === "" ? null : Number(editForm.value.weekday),
    });
    await loadTraining();
  } finally {
    savingInfo.value = false;
  }
}

async function loadOccurrences() {
  const { data } = await api.get(`/trainings/${trainingId}/occurrences`);
  occurrences.value = data.occurrences;
}

onMounted(async () => {
  await loadTraining();
  const [, c, s, g] = await Promise.all([
    loadOccurrences(),
    api.get("/coaches"),
    api.get("/sparrings"),
    api.get("/groups", { params: { seasonId: training.value.seasonId } }),
  ]);
  coaches.value = c.data.coaches;
  sparrings.value = s.data.sparrings;
  groups.value = g.data.groups;
});

async function onGenerate() {
  error.value = "";
  generateResult.value = "";
  try {
    const { data } = await api.post(`/trainings/${trainingId}/generate-occurrences`, generateForm.value);
    generateResult.value = `${data.created} séance(s) créée(s), ${data.skipped} déjà existante(s).`;
    await loadOccurrences();
  } catch (err) {
    error.value = err.response?.data?.error ?? "Erreur lors de la génération.";
  }
}

async function onToggleOccurrence(occurrenceId) {
  if (expandedOccurrenceId.value === occurrenceId) {
    expandedOccurrenceId.value = "";
    return;
  }
  expandedOccurrenceId.value = occurrenceId;
  const { data } = await api.get(`/occurrences/${occurrenceId}`);
  occurrenceCoaches.value = data.occurrence.coaches;
}

async function onAssign() {
  if (!assignForm.value.id) return;
  const payload = assignForm.value.type === "coach"
    ? { coachId: assignForm.value.id }
    : { sparringId: assignForm.value.id };
  const { data } = await api.post(`/occurrences/${expandedOccurrenceId.value}/coaches`, payload);
  occurrenceCoaches.value.push(data.assignment);
  assignForm.value.id = "";
}

async function onUnassign(assignmentId) {
  await api.delete(`/occurrences/${expandedOccurrenceId.value}/coaches/${assignmentId}`);
  occurrenceCoaches.value = occurrenceCoaches.value.filter((a) => a.id !== assignmentId);
}
</script>

<template>
  <AppLayout :title="training ? `Entrainement — ${training.name}` : 'Entrainement'" :nav-links="navLinks">
    <div v-if="training" class="space-y-4">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Informations</p>
        <form class="grid gap-2 sm:grid-cols-2" @submit.prevent="onSaveInfo">
          <input v-model="editForm.name" placeholder="Nom" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
          <select v-model="editForm.groupId" required class="rounded-lg border border-slate-300 px-2 py-1.5">
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
          <input v-model="editForm.location" placeholder="Lieu" class="rounded-lg border border-slate-300 px-2 py-1.5" />
          <select v-model="editForm.weekday" class="rounded-lg border border-slate-300 px-2 py-1.5">
            <option value="">Jour de semaine…</option>
            <option v-for="(d, i) in WEEKDAYS" :key="i" :value="i">{{ d }}</option>
          </select>
          <input v-model="editForm.startTime" type="time" class="rounded-lg border border-slate-300 px-2 py-1.5" />
          <input v-model="editForm.endTime" type="time" class="rounded-lg border border-slate-300 px-2 py-1.5" />
          <button type="submit" :disabled="savingInfo" class="sm:col-span-2 rounded-lg bg-sky-600 text-white py-1.5 font-medium hover:bg-sky-700 disabled:opacity-60">
            Enregistrer
          </button>
        </form>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Générer les séances de la période</p>
        <form class="grid gap-2 sm:grid-cols-3 sm:items-end" @submit.prevent="onGenerate">
          <div>
            <label class="text-xs text-slate-500">Du</label>
            <input v-model="generateForm.startDate" type="date" required class="w-full rounded-lg border border-slate-300 px-2 py-1.5" />
          </div>
          <div>
            <label class="text-xs text-slate-500">Au</label>
            <input v-model="generateForm.endDate" type="date" required class="w-full rounded-lg border border-slate-300 px-2 py-1.5" />
          </div>
          <button type="submit" class="rounded-lg bg-sky-600 text-white py-1.5 font-medium hover:bg-sky-700">
            Générer
          </button>
        </form>
        <p v-if="generateResult" class="text-sm text-emerald-600 mt-2">{{ generateResult }}</p>
        <p v-if="error" class="text-sm text-red-600 mt-2">{{ error }}</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Séances</p>
        <ul class="divide-y divide-slate-100">
          <li v-for="o in occurrences" :key="o.id" class="py-2">
            <div class="flex items-center justify-between cursor-pointer" @click="onToggleOccurrence(o.id)">
              <span>{{ new Date(o.date).toLocaleDateString("fr-FR") }} · {{ o.startTime }}–{{ o.endTime }}</span>
              <div class="flex items-center gap-3">
                <span class="text-xs" :class="o.status === 'CANCELLED' ? 'text-red-500' : 'text-slate-400'">
                  {{ o.status }}
                </span>
                <button class="text-xs text-sky-600 hover:underline" @click.stop="router.push(`/coach/attendance/${o.id}`)">
                  présences
                </button>
              </div>
            </div>

            <div v-if="expandedOccurrenceId === o.id" class="mt-2 pl-2 border-l-2 border-slate-100 space-y-2">
              <ul class="text-sm">
                <li v-for="a in occurrenceCoaches" :key="a.id" class="flex items-center justify-between py-1">
                  <span>{{ a.coach ? `${a.coach.firstName} ${a.coach.lastName}` : `${a.sparring.firstName} ${a.sparring.lastName} (sparring)` }}</span>
                  <button class="text-xs text-red-500 hover:underline" @click="onUnassign(a.id)">retirer</button>
                </li>
                <li v-if="!occurrenceCoaches.length" class="text-slate-400 py-1">Aucun encadrant affecté.</li>
              </ul>
              <div class="flex gap-2">
                <select v-model="assignForm.type" class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                  <option value="coach">Entraineur</option>
                  <option value="sparring">Sparring</option>
                </select>
                <select v-model="assignForm.id" class="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                  <option value="" disabled>Choisir…</option>
                  <option v-for="c in (assignForm.type === 'coach' ? coaches : sparrings)" :key="c.id" :value="c.id">
                    {{ c.firstName }} {{ c.lastName }}
                  </option>
                </select>
                <button class="rounded-lg bg-sky-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-sky-700" @click="onAssign">
                  Affecter
                </button>
              </div>
            </div>
          </li>
          <li v-if="!occurrences.length" class="py-2 text-slate-400 text-sm">Aucune séance générée.</li>
        </ul>
      </div>
    </div>
  </AppLayout>
</template>
