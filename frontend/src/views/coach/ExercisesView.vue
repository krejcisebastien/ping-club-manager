<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import SelectButton from "primevue/selectbutton";
import Dropdown from "primevue/dropdown";
import Tag from "primevue/tag";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import AppLayout from "../../components/AppLayout.vue";
import RichTextEditor from "../../components/RichTextEditor.vue";
import { api } from "../../lib/api.js";
import { stripHtml } from "../../lib/richtext.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { useTableFilter } from "../../composables/useTableFilter.js";
import {
  EXERCISE_CATEGORY_OPTIONS,
  EXERCISE_CATEGORY_LABELS,
  EXERCISE_DIFFICULTY_OPTIONS,
  EXERCISE_DIFFICULTY_LABELS,
  linesToArray,
  arrayToLines,
} from "../../lib/exercise.js";

const navLinks = useNavLinks();
const router = useRouter();
const toast = useToast();
const { filters } = useTableFilter();
const confirm = useConfirm();

const emptyForm = () => ({ title: "", description: "", category: null, difficulty: null });

const exercises = ref([]);
const loading = ref(true);
const dialogVisible = ref(false);
const form = ref(emptyForm());
const saving = ref(false);

const categoryFilter = ref(null);
const difficultyFilter = ref(null);

const filteredExercises = computed(() =>
  exercises.value.filter(
    (e) => (!categoryFilter.value || e.category === categoryFilter.value) && (!difficultyFilter.value || e.difficulty === difficultyFilter.value)
  )
);

const categoryLabel = (ex) => EXERCISE_CATEGORY_LABELS[ex.category] ?? "";
const difficultyLabel = (ex) => EXERCISE_DIFFICULTY_LABELS[ex.difficulty] ?? "";

async function load() {
  loading.value = true;
  const { data } = await api.get("/exercises");
  exercises.value = data.exercises;
  loading.value = false;
}

onMounted(load);

function openCreate() {
  form.value = emptyForm();
  dialogVisible.value = true;
}

async function onCreate() {
  saving.value = true;
  try {
    await api.post("/exercises", form.value);
    dialogVisible.value = false;
    toast.add({ severity: "success", summary: "Exercice créé", life: 3000 });
    await load();
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}

function onDelete(ex) {
  confirm.require({
    message: `Supprimer l'exercice « ${ex.title} » ?`,
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Supprimer",
    acceptClass: "p-button-danger",
    rejectLabel: "Annuler",
    rejectClass: "p-button-secondary p-button-outlined",
    accept: async () => {
      await api.delete(`/exercises/${ex.id}`);
      toast.add({ severity: "success", summary: "Exercice supprimé", life: 3000 });
      await load();
    },
  });
}

function onRowClick(event) {
  router.push(`/coach/exercises/${event.data.id}`);
}

const aiDialogVisible = ref(false);
const aiStep = ref("criteria");
const aiCriteria = ref({ category: null, difficulty: null, skills: "", notes: "" });
const aiGenerating = ref(false);
const aiDraft = ref(null);
const aiCreating = ref(false);

function openAiGenerate() {
  aiStep.value = "criteria";
  aiCriteria.value = { category: null, difficulty: null, skills: "", notes: "" };
  aiDraft.value = null;
  aiDialogVisible.value = true;
}

async function onAiGenerateDraft() {
  aiGenerating.value = true;
  try {
    const { data } = await api.post("/exercises/generate", {
      category: aiCriteria.value.category,
      difficulty: aiCriteria.value.difficulty ? Number(aiCriteria.value.difficulty.replace("NIVEAU_", "")) : undefined,
      skills: aiCriteria.value.skills.split(",").map((s) => s.trim()).filter(Boolean),
      notes: aiCriteria.value.notes,
    });
    aiDraft.value = {
      ...data.draft,
      skills: arrayToLines(data.draft.skills),
      instructions: arrayToLines(data.draft.instructions),
      successCriteria: arrayToLines(data.draft.successCriteria),
      easierVariant: arrayToLines(data.draft.easierVariant),
      harderVariant: arrayToLines(data.draft.harderVariant),
      competitionVariant: arrayToLines(data.draft.competitionVariant),
    };
    aiStep.value = "review";
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 5000 });
  } finally {
    aiGenerating.value = false;
  }
}

async function onAiConfirm() {
  aiCreating.value = true;
  try {
    const { data } = await api.post("/exercises", {
      ...aiDraft.value,
      skills: linesToArray(aiDraft.value.skills),
      instructions: linesToArray(aiDraft.value.instructions),
      successCriteria: linesToArray(aiDraft.value.successCriteria),
      easierVariant: linesToArray(aiDraft.value.easierVariant),
      harderVariant: linesToArray(aiDraft.value.harderVariant),
      competitionVariant: linesToArray(aiDraft.value.competitionVariant),
    });
    aiDialogVisible.value = false;
    toast.add({ severity: "success", summary: "Exercice créé", life: 3000 });
    router.push(`/coach/exercises/${data.exercise.id}`);
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 5000 });
  } finally {
    aiCreating.value = false;
  }
}
</script>

<template>
  <AppLayout title="Bibliothèque d'exercices" :nav-links="navLinks">
    <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <h2 class="text-sm font-medium text-slate-600">{{ filteredExercises.length }} exercice(s)</h2>
      <div class="flex items-center gap-2 flex-1 sm:flex-none flex-wrap">
        <div class="relative flex-1 sm:w-56 min-w-[10rem]">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <InputText v-model="filters.global.value" placeholder="Rechercher…" class="w-full pl-9" />
        </div>
        <Dropdown
          v-model="categoryFilter"
          :options="EXERCISE_CATEGORY_OPTIONS"
          option-label="label"
          option-value="value"
          placeholder="Toutes catégories"
          show-clear
          class="w-56"
        />
        <Dropdown
          v-model="difficultyFilter"
          :options="EXERCISE_DIFFICULTY_OPTIONS"
          option-label="label"
          option-value="value"
          placeholder="Toutes difficultés"
          show-clear
          class="w-52"
        />
        <Button label="Générer avec l'IA" icon="pi pi-sparkles" severity="secondary" outlined @click="openAiGenerate" />
        <Button label="Nouvel exercice" icon="pi pi-plus" @click="openCreate" />
      </div>
    </div>

    <DataTable
      :value="filteredExercises"
      :loading="loading"
      v-model:filters="filters"
      :global-filter-fields="[categoryLabel, difficultyLabel, 'title']"
      paginator
      :rows="10"
      :rows-per-page-options="[10, 25, 50]"
      class="bg-white rounded-xl shadow border border-slate-200 overflow-hidden"
      striped-rows
      @row-click="onRowClick"
    >
      <template #empty>
        <p class="text-slate-400 text-sm py-4">
          {{ filters.global.value || categoryFilter || difficultyFilter ? "Aucun résultat." : "Aucun exercice." }}
        </p>
      </template>
      <Column field="title" header="Titre" sortable>
        <template #body="{ data }"><span class="cursor-pointer">{{ data.title }}</span></template>
      </Column>
      <Column header="Catégorie">
        <template #body="{ data }"><Tag v-if="data.category" severity="secondary" :value="categoryLabel(data)" /></template>
      </Column>
      <Column field="difficulty" header="Difficulté" sortable style="width: 7rem">
        <template #body="{ data }"><Tag v-if="data.difficulty" severity="warn" :value="difficultyLabel(data)" /></template>
      </Column>
      <Column header="Description">
        <template #body="{ data }">
          <span class="text-slate-500 text-sm line-clamp-1">{{ stripHtml(data.description) || data.objective || "" }}</span>
        </template>
      </Column>
      <Column header="" style="width: 4rem">
        <template #body="{ data }">
          <div class="flex gap-1 justify-end">
            <Button icon="pi pi-trash" severity="danger" text rounded aria-label="Supprimer" @click.stop="onDelete(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="dialogVisible" header="Nouvel exercice" modal style="width: 42rem" class="mx-4">
      <form class="grid gap-3 pt-2" @submit.prevent="onCreate">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Titre</label>
          <InputText v-model="form.title" required class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-500 block mb-1">Catégorie</label>
            <Dropdown
              v-model="form.category"
              :options="EXERCISE_CATEGORY_OPTIONS"
              option-label="label"
              option-value="value"
              placeholder="Choisir…"
              show-clear
              class="w-full"
            />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Difficulté</label>
            <Dropdown
              v-model="form.difficulty"
              :options="EXERCISE_DIFFICULTY_OPTIONS"
              option-label="label"
              option-value="value"
              placeholder="Choisir…"
              show-clear
              class="w-full"
            />
          </div>
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Description</label>
          <RichTextEditor v-model="form.description" placeholder="Déroulé de l'exercice, consignes…" />
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="dialogVisible = false" />
          <Button type="submit" label="Créer" :loading="saving" />
        </div>
      </form>
    </Dialog>

    <Dialog v-model:visible="aiDialogVisible" header="Générer un exercice avec l'IA" modal style="width: 44rem" class="mx-4">
      <form v-if="aiStep === 'criteria'" class="grid gap-3 pt-2" @submit.prevent="onAiGenerateDraft">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-500 block mb-1">Catégorie (optionnel)</label>
            <Dropdown
              v-model="aiCriteria.category"
              :options="EXERCISE_CATEGORY_OPTIONS"
              option-label="label"
              option-value="value"
              placeholder="Laisser l'IA choisir"
              show-clear
              class="w-full"
            />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Difficulté (optionnel)</label>
            <Dropdown
              v-model="aiCriteria.difficulty"
              :options="EXERCISE_DIFFICULTY_OPTIONS"
              option-label="label"
              option-value="value"
              placeholder="Laisser l'IA choisir"
              show-clear
              class="w-full"
            />
          </div>
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Qualités à travailler (optionnel, séparées par des virgules)</label>
          <InputText v-model="aiCriteria.skills" class="w-full" placeholder="ex. Pivot, Explosivité" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Précisions pour le coach (optionnel)</label>
          <Textarea v-model="aiCriteria.notes" class="w-full" rows="2" auto-resize placeholder="ex. pour des jeunes débutants, sans matériel particulier…" />
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="aiDialogVisible = false" />
          <Button type="submit" label="Générer" icon="pi pi-sparkles" :loading="aiGenerating" />
        </div>
      </form>

      <form v-else-if="aiDraft" class="grid gap-3 pt-2" @submit.prevent="onAiConfirm">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Titre</label>
          <InputText v-model="aiDraft.title" required class="w-full" />
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="col-span-2 sm:col-span-1">
            <label class="text-xs text-slate-500 block mb-1">Catégorie</label>
            <Dropdown v-model="aiDraft.category" :options="EXERCISE_CATEGORY_OPTIONS" option-label="label" option-value="value" class="w-full" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Difficulté</label>
            <Dropdown v-model="aiDraft.difficulty" :options="EXERCISE_DIFFICULTY_OPTIONS" option-label="label" option-value="value" class="w-full" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Intensité (1-5)</label>
            <SelectButton v-model="aiDraft.intensity" :options="[1, 2, 3, 4, 5]" :allow-empty="true" class="w-full flex" />
          </div>
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Objectif</label>
          <Textarea v-model="aiDraft.objective" class="w-full" rows="2" auto-resize />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Qualités travaillées (une par ligne)</label>
          <Textarea v-model="aiDraft.skills" class="w-full" rows="2" auto-resize />
        </div>
        <div class="grid sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-500 block mb-1">Consignes (une par ligne)</label>
            <Textarea v-model="aiDraft.instructions" class="w-full" rows="4" auto-resize />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Critères de réussite (un par ligne)</label>
            <Textarea v-model="aiDraft.successCriteria" class="w-full" rows="4" auto-resize />
          </div>
        </div>
        <div class="grid sm:grid-cols-3 gap-3">
          <div>
            <label class="text-xs text-slate-500 block mb-1">Variante facile</label>
            <Textarea v-model="aiDraft.easierVariant" class="w-full" rows="2" auto-resize />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Variante difficile</label>
            <Textarea v-model="aiDraft.harderVariant" class="w-full" rows="2" auto-resize />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Variante compétition</label>
            <Textarea v-model="aiDraft.competitionVariant" class="w-full" rows="2" auto-resize />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Régénérer" severity="secondary" outlined :loading="aiGenerating" @click="onAiGenerateDraft" />
          <Button type="submit" label="Créer l'exercice" :loading="aiCreating" />
        </div>
      </form>
    </Dialog>
  </AppLayout>
</template>
