<script setup>
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import Checkbox from "primevue/checkbox";
import Calendar from "primevue/calendar";
import Dropdown from "primevue/dropdown";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import RichTextEditor from "../../components/RichTextEditor.vue";
import { api } from "../../lib/api.js";
import { toDateOnly } from "../../lib/date.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { useTableFilter } from "../../composables/useTableFilter.js";
import { fullName } from "../../lib/name.js";
import { EXERCISE_CATEGORY_LABELS, EXERCISE_DIFFICULTY_LABELS } from "../../lib/exercise.js";

const navLinks = useNavLinks();
const router = useRouter();
const { filters } = useTableFilter();
const toast = useToast();

const seasons = ref([]);
const selectedSeasonId = ref("");
const plans = ref([]);
const loading = ref(true);

const dialogVisible = ref(false);
const form = ref({ title: "", description: "", periodStart: null, periodEnd: null });
const saving = ref(false);

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
  loading.value = true;
  const { data } = await api.get("/training-plans", { params: { seasonId: selectedSeasonId.value } });
  plans.value = data.plans;
  loading.value = false;
}

onMounted(async () => {
  await loadSeasons();
  await loadPlans();
});

watch(selectedSeasonId, loadPlans);

function openCreate() {
  form.value = { title: "", description: "", periodStart: null, periodEnd: null };
  dialogVisible.value = true;
}

async function onCreate() {
  saving.value = true;
  try {
    await api.post("/training-plans", {
      seasonId: selectedSeasonId.value,
      ...form.value,
      periodStart: toDateOnly(form.value.periodStart),
      periodEnd: toDateOnly(form.value.periodEnd),
    });
    dialogVisible.value = false;
    toast.add({ severity: "success", summary: "Plan créé", life: 3000 });
    await loadPlans();
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}

function coachName(p) {
  return p.coach ? fullName(p.coach) : "";
}

const aiDialogVisible = ref(false);
const aiStep = ref("criteria");
const aiForm = ref({ theme: "", exerciseCount: 6 });
const aiGenerating = ref(false);
const aiDraft = ref(null);
const aiSelectedIds = ref(new Set());
const aiCreating = ref(false);

function openAiGenerate() {
  aiStep.value = "criteria";
  aiForm.value = { theme: "", exerciseCount: 6 };
  aiDraft.value = null;
  aiDialogVisible.value = true;
}

async function onAiGenerateDraft() {
  aiGenerating.value = true;
  try {
    const { data } = await api.post("/training-plans/generate", aiForm.value);
    aiDraft.value = data.draft;
    aiSelectedIds.value = new Set(data.draft.exercises.map((e) => e.id));
    aiStep.value = "review";
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 5000 });
  } finally {
    aiGenerating.value = false;
  }
}

function toggleAiExercise(id) {
  if (aiSelectedIds.value.has(id)) aiSelectedIds.value.delete(id);
  else aiSelectedIds.value.add(id);
}

async function onAiConfirm() {
  aiCreating.value = true;
  try {
    const { data } = await api.post("/training-plans", {
      seasonId: selectedSeasonId.value,
      title: aiDraft.value.title,
      description: aiDraft.value.description,
    });
    const orderedIds = aiDraft.value.exercises.map((e) => e.id).filter((id) => aiSelectedIds.value.has(id));
    for (const exerciseId of orderedIds) {
      await api.post(`/training-plans/${data.plan.id}/exercises`, { exerciseId });
    }
    aiDialogVisible.value = false;
    toast.add({ severity: "success", summary: "Plan créé", life: 3000 });
    router.push(`/coach/training-plans/${data.plan.id}`);
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 5000 });
  } finally {
    aiCreating.value = false;
  }
}
</script>

<template>
  <AppLayout title="Plans d'entrainement" :nav-links="navLinks">
    <div class="mb-4 max-w-xs">
      <label class="text-xs text-slate-500 block mb-1">Saison</label>
      <Dropdown v-model="selectedSeasonId" :options="seasons" option-label="name" option-value="id" class="w-full" />
    </div>

    <div class="flex flex-col items-stretch sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
      <h2 class="text-sm font-medium text-slate-600">{{ plans.length }} plan(s)</h2>
      <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <div class="relative sm:w-64">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <InputText v-model="filters.global.value" placeholder="Rechercher…" class="w-full pl-9" />
        </div>
        <Button class="w-full sm:w-auto" label="Générer avec l'IA" icon="pi pi-sparkles" severity="secondary" outlined @click="openAiGenerate" />
        <Button class="w-full sm:w-auto" label="Nouveau plan" icon="pi pi-plus" @click="openCreate" />
      </div>
    </div>

    <DataTable responsive-layout="stack" breakpoint="768px"
      :value="plans"
      :loading="loading"
      v-model:filters="filters"
      :global-filter-fields="['title', coachName]"
      paginator
      :rows="10"
      :rows-per-page-options="[10, 25, 50]"
      class="bg-white rounded-xl shadow border border-slate-200 overflow-hidden"
      striped-rows
      @row-click="router.push(`/coach/training-plans/${$event.data.id}`)"
    >
      <template #empty>
        <p class="text-slate-400 text-sm py-4">{{ filters.global.value ? "Aucun résultat." : "Aucun plan pour cette saison." }}</p>
      </template>
      <Column field="title" header="Titre" sortable>
        <template #body="{ data }"><span class="cursor-pointer">{{ data.title }}</span></template>
      </Column>
      <Column header="Auteur">
        <template #body="{ data }">{{ coachName(data) }}</template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="dialogVisible" header="Nouveau plan" modal style="width: 42rem" class="mx-4">
      <form class="grid gap-3 pt-2" @submit.prevent="onCreate">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Titre</label>
          <InputText v-model="form.title" required class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-500 block mb-1">Début (optionnel)</label>
            <Calendar v-model="form.periodStart" date-format="dd/mm/yy" show-icon class="w-full" input-class="w-full" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Fin (optionnel)</label>
            <Calendar v-model="form.periodEnd" date-format="dd/mm/yy" show-icon class="w-full" input-class="w-full" />
          </div>
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Description (optionnel)</label>
          <RichTextEditor v-model="form.description" placeholder="Objectifs, déroulé de la semaine…" />
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="dialogVisible = false" />
          <Button type="submit" label="Créer" :loading="saving" />
        </div>
      </form>
    </Dialog>

    <Dialog v-model:visible="aiDialogVisible" header="Générer un plan avec l'IA" modal style="width: 34rem" class="mx-4">
      <form v-if="aiStep === 'criteria'" class="grid gap-3 pt-2" @submit.prevent="onAiGenerateDraft">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Thème de la séance (optionnel)</label>
          <InputText v-model="aiForm.theme" class="w-full" placeholder="ex. Topspin pour intermédiaires, 1h30" />
        </div>
        <div class="max-w-[10rem]">
          <label class="text-xs text-slate-500 block mb-1">Nombre d'exercices</label>
          <InputText v-model.number="aiForm.exerciseCount" type="number" min="3" max="12" class="w-full" />
        </div>
        <p class="text-xs text-slate-400">
          L'IA choisit des exercices déjà présents dans la bibliothèque du club (aucun nouvel exercice inventé) et les enchaîne dans un ordre
          pédagogique cohérent. Tu pourras retirer ou garder chaque exercice avant de créer le plan.
        </p>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="aiDialogVisible = false" />
          <Button type="submit" label="Générer" icon="pi pi-sparkles" :loading="aiGenerating" />
        </div>
      </form>

      <div v-else-if="aiDraft" class="grid gap-3 pt-2">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Titre</label>
          <InputText v-model="aiDraft.title" class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Description</label>
          <Textarea v-model="aiDraft.description" class="w-full" rows="2" auto-resize />
        </div>
        <div>
          <p class="text-xs text-slate-500 mb-1">Exercices suggérés (décoche pour retirer)</p>
          <ul class="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-72 overflow-y-auto">
            <li v-for="ex in aiDraft.exercises" :key="ex.id" class="flex items-center gap-2 px-3 py-2">
              <Checkbox
                :model-value="aiSelectedIds.has(ex.id)"
                binary
                @update:model-value="toggleAiExercise(ex.id)"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm text-slate-700 truncate">{{ ex.title }}</p>
                <p class="text-xs text-slate-400">
                  {{ EXERCISE_CATEGORY_LABELS[ex.category] ?? "" }} · {{ EXERCISE_DIFFICULTY_LABELS[ex.difficulty] ?? "" }}
                </p>
              </div>
            </li>
          </ul>
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Régénérer" severity="secondary" outlined :loading="aiGenerating" @click="onAiGenerateDraft" />
          <Button
            type="button"
            label="Créer le plan"
            :loading="aiCreating"
            :disabled="!aiSelectedIds.size"
            @click="onAiConfirm"
          />
        </div>
      </div>
    </Dialog>
  </AppLayout>
</template>
