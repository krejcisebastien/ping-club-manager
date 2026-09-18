<script setup>
import { ref, onMounted } from "vue";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();
const toast = useToast();
const confirm = useConfirm();

const emptyForm = () => ({ firstName: "", lastName: "", email: "", phone: "" });

const coaches = ref([]);
const loading = ref(true);
const dialogVisible = ref(false);
const editingId = ref(null);
const form = ref(emptyForm());
const saving = ref(false);

async function load() {
  loading.value = true;
  const { data } = await api.get("/coaches");
  coaches.value = data.coaches;
  loading.value = false;
}

onMounted(load);

function openCreate() {
  editingId.value = null;
  form.value = emptyForm();
  dialogVisible.value = true;
}

function openEdit(coach) {
  editingId.value = coach.id;
  form.value = { firstName: coach.firstName, lastName: coach.lastName, email: coach.email ?? "", phone: coach.phone ?? "" };
  dialogVisible.value = true;
}

async function onSave() {
  saving.value = true;
  try {
    if (editingId.value) {
      await api.put(`/coaches/${editingId.value}`, form.value);
    } else {
      await api.post("/coaches", form.value);
    }
    dialogVisible.value = false;
    toast.add({ severity: "success", summary: editingId.value ? "Entraineur modifié" : "Entraineur créé", life: 3000 });
    await load();
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}

function onDelete(coach) {
  confirm.require({
    message: `Supprimer ${coach.firstName} ${coach.lastName} ?`,
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Supprimer",
    acceptClass: "p-button-danger",
    rejectLabel: "Annuler",
    rejectClass: "p-button-secondary p-button-outlined",
    accept: async () => {
      await api.delete(`/coaches/${coach.id}`);
      toast.add({ severity: "success", summary: "Entraineur supprimé", life: 3000 });
      await load();
    },
  });
}
</script>

<template>
  <AppLayout title="Entraineurs" :nav-links="navLinks">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-sm font-medium text-slate-600">{{ coaches.length }} entraineur(s)</h2>
      <Button label="Nouvel entraineur" icon="pi pi-plus" @click="openCreate" />
    </div>

    <DataTable :value="coaches" :loading="loading" class="bg-white rounded-xl shadow border border-slate-200 overflow-hidden" striped-rows>
      <template #empty>
        <p class="text-slate-400 text-sm py-4">Aucun entraineur.</p>
      </template>
      <Column field="lastName" header="Nom" sortable>
        <template #body="{ data }">{{ data.firstName }} {{ data.lastName }}</template>
      </Column>
      <Column field="email" header="Email" />
      <Column field="phone" header="Téléphone" />
      <Column header="" style="width: 7rem">
        <template #body="{ data }">
          <div class="flex gap-1 justify-end">
            <Button icon="pi pi-pencil" severity="secondary" text rounded aria-label="Modifier" @click="openEdit(data)" />
            <Button icon="pi pi-trash" severity="danger" text rounded aria-label="Supprimer" @click="onDelete(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="dialogVisible" :header="editingId ? 'Modifier l\'entraineur' : 'Nouvel entraineur'" modal style="width: 26rem" class="mx-4">
      <form class="grid gap-3 pt-2" @submit.prevent="onSave">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Prénom</label>
          <InputText v-model="form.firstName" required class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Nom</label>
          <InputText v-model="form.lastName" required class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Email (optionnel)</label>
          <InputText v-model="form.email" class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Téléphone (optionnel)</label>
          <InputText v-model="form.phone" class="w-full" />
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="dialogVisible = false" />
          <Button type="submit" label="Enregistrer" :loading="saving" />
        </div>
      </form>
    </Dialog>
  </AppLayout>
</template>
