<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const route = useRoute();
const router = useRouter();
const planId = route.params.id;

const plan = ref(null);
const editForm = ref({ title: "", description: "", periodStart: "", periodEnd: "" });
const savingInfo = ref(false);
const allExercises = ref([]);
const exerciseToAdd = ref("");

const availableExercises = computed(() => {
  const usedIds = new Set((plan.value?.exercises ?? []).map((e) => e.exercise.id));
  return allExercises.value.filter((e) => !usedIds.has(e.id));
});

async function loadPlan() {
  const { data } = await api.get(`/training-plans/${planId}`);
  plan.value = data.plan;
  editForm.value = {
    title: data.plan.title,
    description: data.plan.description ?? "",
    periodStart: data.plan.periodStart ? data.plan.periodStart.slice(0, 10) : "",
    periodEnd: data.plan.periodEnd ? data.plan.periodEnd.slice(0, 10) : "",
  };
}

onMounted(async () => {
  const [, ex] = await Promise.all([loadPlan(), api.get("/exercises")]);
  allExercises.value = ex.data.exercises;
});

async function onSaveInfo() {
  savingInfo.value = true;
  try {
    await api.put(`/training-plans/${planId}`, editForm.value);
    await loadPlan();
  } finally {
    savingInfo.value = false;
  }
}

async function onAddExercise() {
  if (!exerciseToAdd.value) return;
  await api.post(`/training-plans/${planId}/exercises`, { exerciseId: exerciseToAdd.value });
  exerciseToAdd.value = "";
  await loadPlan();
}

async function onRemoveExercise(exerciseId) {
  await api.delete(`/training-plans/${planId}/exercises/${exerciseId}`);
  await loadPlan();
}
</script>

<template>
  <AppLayout :title="plan ? `Plan — ${plan.title}` : 'Plan d\'entrainement'" :nav-links="navLinks">
    <button class="text-sm text-sky-600 hover:underline mb-3" @click="router.back()">← retour</button>

    <div v-if="plan" class="space-y-4">
      <div class="bg-white rounded-xl shadow-sm p-4">
        <form class="grid gap-2 sm:grid-cols-2" @submit.prevent="onSaveInfo">
          <input v-model="editForm.title" placeholder="Titre" required class="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-1.5" />
          <input v-model="editForm.periodStart" type="date" class="rounded-lg border border-slate-300 px-2 py-1.5" />
          <input v-model="editForm.periodEnd" type="date" class="rounded-lg border border-slate-300 px-2 py-1.5" />
          <textarea v-model="editForm.description" placeholder="Description" class="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-1.5" rows="3"></textarea>
          <button type="submit" :disabled="savingInfo" class="sm:col-span-2 rounded-lg bg-sky-600 text-white py-1.5 font-medium hover:bg-sky-700 disabled:opacity-60">
            Enregistrer
          </button>
        </form>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Exercices du plan</p>
        <ul class="divide-y divide-slate-100 mb-3">
          <li v-for="link in plan.exercises" :key="link.id" class="py-2 flex items-center justify-between">
            <span>{{ link.exercise.title }}</span>
            <button class="text-xs text-red-500 hover:underline" @click="onRemoveExercise(link.exercise.id)">retirer</button>
          </li>
          <li v-if="!plan.exercises.length" class="py-2 text-slate-400 text-sm">Aucun exercice rattaché.</li>
        </ul>
        <div class="flex gap-2">
          <select v-model="exerciseToAdd" class="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="" disabled>Ajouter un exercice…</option>
            <option v-for="e in availableExercises" :key="e.id" :value="e.id">{{ e.title }}</option>
          </select>
          <button class="rounded-lg bg-sky-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-sky-700" @click="onAddExercise">
            Ajouter
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
