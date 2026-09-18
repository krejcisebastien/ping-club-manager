<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Tag from "primevue/tag";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import AppLayout from "../../components/AppLayout.vue";
import RichTextEditor from "../../components/RichTextEditor.vue";
import { api } from "../../lib/api.js";
import { sanitizeHtml } from "../../lib/richtext.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();
const exerciseId = route.params.id;

const exercise = ref(null);
const editing = ref(false);
const form = ref({ title: "", description: "", category: "", difficulty: "" });
const saving = ref(false);

async function load() {
  const { data } = await api.get(`/exercises/${exerciseId}`);
  exercise.value = data.exercise;
}

onMounted(load);

function openEdit() {
  form.value = {
    title: exercise.value.title,
    description: exercise.value.description ?? "",
    category: exercise.value.category ?? "",
    difficulty: exercise.value.difficulty ?? "",
  };
  editing.value = true;
}

async function onSave() {
  saving.value = true;
  try {
    await api.put(`/exercises/${exerciseId}`, form.value);
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
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-500 block mb-1">Catégorie</label>
            <InputText v-model="form.category" class="w-full" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Difficulté</label>
            <InputText v-model="form.difficulty" class="w-full" />
          </div>
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Description</label>
          <RichTextEditor v-model="form.description" placeholder="Déroulé de l'exercice, consignes…" />
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="editing = false" />
          <Button type="submit" label="Enregistrer" :loading="saving" />
        </div>
      </form>

      <div v-else>
        <div class="flex items-start justify-between mb-3">
          <div class="flex flex-wrap gap-2">
            <Tag v-if="exercise.category" severity="secondary" :value="exercise.category" />
            <Tag v-if="exercise.difficulty" severity="info" :value="exercise.difficulty" />
          </div>
          <div class="flex gap-1 shrink-0">
            <Button icon="pi pi-pencil" text rounded aria-label="Modifier" @click="openEdit" />
            <Button icon="pi pi-trash" severity="danger" text rounded aria-label="Supprimer" @click="onDelete" />
          </div>
        </div>
        <div v-if="exercise.description" class="rich-text-content" v-html="sanitizeHtml(exercise.description)"></div>
        <p v-else class="text-slate-400 text-sm">Aucune description.</p>
      </div>
    </div>
  </AppLayout>
</template>
