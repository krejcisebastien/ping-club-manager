<script setup>
import { ref, onMounted } from "vue";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Tag from "primevue/tag";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import AppLayout from "../../components/AppLayout.vue";
import RichTextEditor from "../../components/RichTextEditor.vue";
import { api } from "../../lib/api.js";
import { stripHtml } from "../../lib/richtext.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();
const toast = useToast();
const confirm = useConfirm();

const emptyForm = () => ({ title: "", description: "", category: "", difficulty: "" });

const exercises = ref([]);
const loading = ref(true);
const dialogVisible = ref(false);
const editingId = ref(null);
const form = ref(emptyForm());
const saving = ref(false);

async function load() {
  loading.value = true;
  const { data } = await api.get("/exercises");
  exercises.value = data.exercises;
  loading.value = false;
}

onMounted(load);

function openCreate() {
  editingId.value = null;
  form.value = emptyForm();
  dialogVisible.value = true;
}

function openEdit(ex) {
  editingId.value = ex.id;
  form.value = { title: ex.title, description: ex.description ?? "", category: ex.category ?? "", difficulty: ex.difficulty ?? "" };
  dialogVisible.value = true;
}

async function onSave() {
  saving.value = true;
  try {
    if (editingId.value) {
      await api.put(`/exercises/${editingId.value}`, form.value);
    } else {
      await api.post("/exercises", form.value);
    }
    dialogVisible.value = false;
    toast.add({ severity: "success", summary: editingId.value ? "Exercice modifié" : "Exercice créé", life: 3000 });
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
</script>

<template>
  <AppLayout title="Bibliothèque d'exercices" :nav-links="navLinks">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-sm font-medium text-slate-600">{{ exercises.length }} exercice(s)</h2>
      <Button label="Nouvel exercice" icon="pi pi-plus" @click="openCreate" />
    </div>

    <DataTable :value="exercises" :loading="loading" class="bg-white rounded-xl shadow border border-slate-200 overflow-hidden" striped-rows>
      <template #empty>
        <p class="text-slate-400 text-sm py-4">Aucun exercice.</p>
      </template>
      <Column field="title" header="Titre" sortable />
      <Column header="Catégorie">
        <template #body="{ data }"><Tag v-if="data.category" severity="secondary" :value="data.category" /></template>
      </Column>
      <Column field="difficulty" header="Difficulté" />
      <Column header="Description">
        <template #body="{ data }"><span class="text-slate-500 text-sm line-clamp-1">{{ stripHtml(data.description) }}</span></template>
      </Column>
      <Column header="" style="width: 7rem">
        <template #body="{ data }">
          <div class="flex gap-1 justify-end">
            <Button icon="pi pi-pencil" severity="secondary" text rounded aria-label="Modifier" @click="openEdit(data)" />
            <Button icon="pi pi-trash" severity="danger" text rounded aria-label="Supprimer" @click="onDelete(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="dialogVisible" :header="editingId ? 'Modifier l\'exercice' : 'Nouvel exercice'" modal style="width: 34rem" class="mx-4">
      <form class="grid gap-3 pt-2" @submit.prevent="onSave">
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
          <Button type="button" label="Annuler" severity="secondary" outlined @click="dialogVisible = false" />
          <Button type="submit" label="Enregistrer" :loading="saving" />
        </div>
      </form>
    </Dialog>
  </AppLayout>
</template>
