<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Rating from "primevue/rating";
import DifficultyRating from "../../components/DifficultyRating.vue";
import Dropdown from "primevue/dropdown";
import Textarea from "primevue/textarea";
import Tag from "primevue/tag";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import AppLayout from "../../components/AppLayout.vue";
import RichTextEditor from "../../components/RichTextEditor.vue";
import TableDiagramEditor from "../../components/TableDiagramEditor.vue";
import { api } from "../../lib/api.js";
import { sanitizeHtml } from "../../lib/richtext.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import {
  EXERCISE_CATEGORY_OPTIONS,
  EXERCISE_CATEGORY_LABELS,
  EXERCISE_DIFFICULTY_OPTIONS,
  EXERCISE_DIFFICULTY_LABELS,
  linesToArray,
  arrayToLines,
} from "../../lib/exercise.js";

const navLinks = useNavLinks();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();
const exerciseId = route.params.id;

const exercise = ref(null);
const editing = ref(false);
const form = ref(null);
const saving = ref(false);

const categoryLabel = (ex) => EXERCISE_CATEGORY_LABELS[ex.category] ?? "";
const difficultyLabel = (ex) => EXERCISE_DIFFICULTY_LABELS[ex.difficulty] ?? "";

async function load() {
  const { data } = await api.get(`/exercises/${exerciseId}`);
  exercise.value = data.exercise;
}

onMounted(load);

function openEdit() {
  const ex = exercise.value;
  form.value = {
    title: ex.title,
    description: ex.description ?? "",
    category: ex.category ?? null,
    difficulty: ex.difficulty ?? null,
    intensity: ex.intensity ?? null,
    objective: ex.objective ?? "",
    skills: arrayToLines(ex.skills),
    instructions: arrayToLines(ex.instructions),
    successCriteria: arrayToLines(ex.successCriteria),
    easierVariant: arrayToLines(ex.easierVariant),
    harderVariant: arrayToLines(ex.harderVariant),
    competitionVariant: arrayToLines(ex.competitionVariant),
    diagram: ex.diagram ?? { points: [] },
  };
  editing.value = true;
}

async function onSave() {
  saving.value = true;
  try {
    await api.put(`/exercises/${exerciseId}`, {
      ...form.value,
      skills: linesToArray(form.value.skills),
      instructions: linesToArray(form.value.instructions),
      successCriteria: linesToArray(form.value.successCriteria),
      easierVariant: linesToArray(form.value.easierVariant),
      harderVariant: linesToArray(form.value.harderVariant),
      competitionVariant: linesToArray(form.value.competitionVariant),
    });
    editing.value = false;
    toast.add({ severity: "success", summary: "Exercice modifié", life: 3000 });
    await load();
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}

function onDelete() {
  confirm.require({
    message: `Supprimer l'exercice « ${exercise.value.title} » ?`,
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Supprimer",
    acceptClass: "p-button-danger",
    rejectLabel: "Annuler",
    rejectClass: "p-button-secondary p-button-outlined",
    accept: async () => {
      await api.delete(`/exercises/${exerciseId}`);
      toast.add({ severity: "success", summary: "Exercice supprimé", life: 3000 });
      router.push("/coach/exercises");
    },
  });
}
</script>

<template>
  <AppLayout :title="exercise ? exercise.title : 'Exercice'" :nav-links="navLinks">
    <Button label="Retour" icon="pi pi-arrow-left" text class="mb-3 -ml-2" @click="router.push('/coach/exercises')" />

    <div v-if="exercise" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <form v-if="editing" class="grid gap-3" @submit.prevent="onSave">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Titre</label>
          <InputText v-model="form.title" required class="w-full" />
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="col-span-2 sm:col-span-1">
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
            <DifficultyRating v-model="form.difficulty" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Intensité (1-5)</label>
            <Rating v-model="form.intensity" :stars="5" :cancel="false" on-icon="pi pi-bolt" off-icon="pi pi-bolt" class="intensity-rating" />
          </div>
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Objectif</label>
          <Textarea v-model="form.objective" class="w-full" rows="2" auto-resize />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Qualités travaillées (une par ligne)</label>
          <Textarea v-model="form.skills" class="w-full" rows="2" auto-resize />
        </div>
        <div class="grid sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-500 block mb-1">Consignes (une par ligne)</label>
            <Textarea v-model="form.instructions" class="w-full" rows="4" auto-resize />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Critères de réussite (un par ligne)</label>
            <Textarea v-model="form.successCriteria" class="w-full" rows="4" auto-resize />
          </div>
        </div>
        <div class="grid sm:grid-cols-3 gap-3">
          <div>
            <label class="text-xs text-slate-500 block mb-1">Variante facile (une par ligne)</label>
            <Textarea v-model="form.easierVariant" class="w-full" rows="3" auto-resize />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Variante difficile (une par ligne)</label>
            <Textarea v-model="form.harderVariant" class="w-full" rows="3" auto-resize />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Variante compétition (une par ligne)</label>
            <Textarea v-model="form.competitionVariant" class="w-full" rows="3" auto-resize />
          </div>
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Description libre (optionnel)</label>
          <RichTextEditor v-model="form.description" placeholder="Notes complémentaires…" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Schéma de la table (échanges, points à jouer)</label>
          <TableDiagramEditor v-model="form.diagram" />
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="editing = false" />
          <Button type="submit" label="Enregistrer" :loading="saving" />
        </div>
      </form>

      <div v-else>
        <div class="flex items-start justify-between mb-3">
          <div class="flex flex-wrap gap-2">
            <Tag v-if="exercise.category" severity="secondary" :value="categoryLabel(exercise)" />
            <Tag v-if="exercise.difficulty" severity="warn" :value="`Difficulté ${difficultyLabel(exercise)}`" />
            <Tag v-if="exercise.intensity" severity="danger" :value="`Intensité ${exercise.intensity}/5`" />
          </div>
          <div class="flex gap-1 shrink-0">
            <Button icon="pi pi-pencil" text rounded aria-label="Modifier" @click="openEdit" />
            <Button icon="pi pi-trash" severity="danger" text rounded aria-label="Supprimer" @click="onDelete" />
          </div>
        </div>

        <p
          v-if="!exercise.objective && !exercise.description && !exercise.instructions?.length && !exercise.successCriteria?.length"
          class="text-slate-400 text-sm mb-3"
        >
          Aucune description.
        </p>

        <div v-if="exercise.skills?.length" class="flex flex-wrap gap-1 mb-3">
          <Tag v-for="skill in exercise.skills" :key="skill" severity="secondary" :value="skill" />
        </div>

        <p v-if="exercise.objective" class="text-slate-700 mb-3">{{ exercise.objective }}</p>

        <div v-if="exercise.instructions?.length" class="mb-3">
          <p class="text-xs font-medium text-slate-500 mb-1">Consignes</p>
          <ul class="list-disc list-inside text-sm text-slate-700 space-y-0.5">
            <li v-for="(item, i) in exercise.instructions" :key="i">{{ item }}</li>
          </ul>
        </div>

        <div v-if="exercise.successCriteria?.length" class="mb-3">
          <p class="text-xs font-medium text-slate-500 mb-1">Critères de réussite</p>
          <ul class="list-disc list-inside text-sm text-slate-700 space-y-0.5">
            <li v-for="(item, i) in exercise.successCriteria" :key="i">{{ item }}</li>
          </ul>
        </div>

        <div v-if="exercise.easierVariant?.length || exercise.harderVariant?.length || exercise.competitionVariant?.length"
             class="grid sm:grid-cols-3 gap-3 mb-3">
          <div v-if="exercise.easierVariant?.length">
            <p class="text-xs font-medium text-slate-500 mb-1">Variante facile</p>
            <ul class="list-disc list-inside text-sm text-slate-700 space-y-0.5">
              <li v-for="(item, i) in exercise.easierVariant" :key="i">{{ item }}</li>
            </ul>
          </div>
          <div v-if="exercise.harderVariant?.length">
            <p class="text-xs font-medium text-slate-500 mb-1">Variante difficile</p>
            <ul class="list-disc list-inside text-sm text-slate-700 space-y-0.5">
              <li v-for="(item, i) in exercise.harderVariant" :key="i">{{ item }}</li>
            </ul>
          </div>
          <div v-if="exercise.competitionVariant?.length">
            <p class="text-xs font-medium text-slate-500 mb-1">Variante compétition</p>
            <ul class="list-disc list-inside text-sm text-slate-700 space-y-0.5">
              <li v-for="(item, i) in exercise.competitionVariant" :key="i">{{ item }}</li>
            </ul>
          </div>
        </div>

        <div v-if="exercise.description" class="rich-text-content mb-3" v-html="sanitizeHtml(exercise.description)"></div>

        <div v-if="exercise.diagram?.points?.length">
          <p class="text-xs text-slate-500 mb-1">Schéma de la table</p>
          <TableDiagramEditor :model-value="exercise.diagram" readonly />
        </div>
      </div>
    </div>
  </AppLayout>
</template>
