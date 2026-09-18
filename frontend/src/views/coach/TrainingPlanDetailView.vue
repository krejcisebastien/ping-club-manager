<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Calendar from "primevue/calendar";
import Dropdown from "primevue/dropdown";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import RichTextEditor from "../../components/RichTextEditor.vue";
import { api } from "../../lib/api.js";
import { toDateOnly } from "../../lib/date.js";
import { sanitizeHtml } from "../../lib/richtext.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const planId = route.params.id;

const plan = ref(null);
const editing = ref(false);
const editForm = ref({ title: "", description: "", periodStart: null, periodEnd: null });
const savingInfo = ref(false);
const allExercises = ref([]);
const exerciseToAdd = ref(null);

const availableExercises = computed(() => {
  const usedIds = new Set((plan.value?.exercises ?? []).map((e) => e.exercise.id));
  return allExercises.value.filter((e) => !usedIds.has(e.id)).map((e) => ({ label: e.title, value: e.id }));
});

async function loadPlan() {
  const { data } = await api.get(`/training-plans/${planId}`);
  plan.value = data.plan;
}

onMounted(async () => {
  const [, ex] = await Promise.all([loadPlan(), api.get("/exercises")]);
  allExercises.value = ex.data.exercises;
});

function openEdit() {
  editForm.value = {
    title: plan.value.title,
    description: plan.value.description ?? "",
    periodStart: plan.value.periodStart ? new Date(plan.value.periodStart) : null,
    periodEnd: plan.value.periodEnd ? new Date(plan.value.periodEnd) : null,
  };
  editing.value = true;
}

async function onSaveInfo() {
  savingInfo.value = true;
  try {
    await api.put(`/training-plans/${planId}`, {
      ...editForm.value,
      periodStart: toDateOnly(editForm.value.periodStart),
      periodEnd: toDateOnly(editForm.value.periodEnd),
    });
    editing.value = false;
    toast.add({ severity: "success", summary: "Plan mis à jour", life: 3000 });
    await loadPlan();
  } finally {
    savingInfo.value = false;
  }
}

async function onAddExercise() {
  if (!exerciseToAdd.value) return;
  await api.post(`/training-plans/${planId}/exercises`, { exerciseId: exerciseToAdd.value });
  exerciseToAdd.value = null;
  await loadPlan();
}

async function onRemoveExercise(exerciseId) {
  await api.delete(`/training-plans/${planId}/exercises/${exerciseId}`);
  await loadPlan();
}
</script>

<template>
  <AppLayout :title="plan ? `Plan — ${plan.title}` : 'Plan d\'entrainement'" :nav-links="navLinks">
    <Button label="Retour" icon="pi pi-arrow-left" text class="mb-3 -ml-2" @click="router.back()" />

    <div v-if="plan" class="space-y-4">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <form v-if="editing" class="grid gap-3 sm:grid-cols-2" @submit.prevent="onSaveInfo">
          <div class="sm:col-span-2">
            <label class="text-xs text-slate-500 block mb-1">Titre</label>
            <InputText v-model="editForm.title" required class="w-full" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Début (optionnel)</label>
            <Calendar v-model="editForm.periodStart" date-format="dd/mm/yy" show-icon class="w-full" input-class="w-full" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Fin (optionnel)</label>
            <Calendar v-model="editForm.periodEnd" date-format="dd/mm/yy" show-icon class="w-full" input-class="w-full" />
          </div>
          <div class="sm:col-span-2">
            <label class="text-xs text-slate-500 block mb-1">Description</label>
            <RichTextEditor v-model="editForm.description" placeholder="Objectifs, déroulé de la semaine…" />
          </div>
          <div class="sm:col-span-2 flex gap-2">
            <Button type="button" label="Annuler" severity="secondary" outlined @click="editing = false" />
            <Button type="submit" label="Enregistrer" :loading="savingInfo" />
          </div>
        </form>

        <div v-else>
          <div class="flex items-start justify-between mb-2">
            <p class="text-lg font-medium text-slate-800">{{ plan.title }}</p>
            <Button icon="pi pi-pencil" text rounded aria-label="Modifier" @click="openEdit" />
          </div>
          <p v-if="plan.periodStart || plan.periodEnd" class="text-sm text-slate-500 mb-3">
            {{ plan.periodStart ? new Date(plan.periodStart).toLocaleDateString("fr-FR") : "…" }}
            →
            {{ plan.periodEnd ? new Date(plan.periodEnd).toLocaleDateString("fr-FR") : "…" }}
          </p>
          <div v-if="plan.description" class="rich-text-content" v-html="sanitizeHtml(plan.description)"></div>
          <p v-else class="text-slate-400 text-sm">Aucune description.</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Exercices du plan</p>
        <ul class="divide-y divide-slate-100 mb-3">
          <li v-for="link in plan.exercises" :key="link.id" class="py-2 flex items-center justify-between text-sm">
            <RouterLink :to="`/coach/exercises/${link.exercise.id}`" class="text-sky-600 hover:underline">{{ link.exercise.title }}</RouterLink>
            <Button icon="pi pi-times" severity="danger" text rounded size="small" aria-label="Retirer" @click="onRemoveExercise(link.exercise.id)" />
          </li>
          <li v-if="!plan.exercises.length" class="py-2 text-slate-400 text-sm">Aucun exercice rattaché.</li>
        </ul>
        <div class="flex gap-2">
          <Dropdown v-model="exerciseToAdd" :options="availableExercises" option-label="label" option-value="value" filter placeholder="Ajouter un exercice…" class="flex-1" />
          <Button label="Ajouter" @click="onAddExercise" />
        </div>
      </div>
    </div>
  </AppLayout>
</template>
