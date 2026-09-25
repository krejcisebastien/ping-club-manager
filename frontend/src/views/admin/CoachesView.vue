<script setup>
import { ref, onMounted } from "vue";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Dropdown from "primevue/dropdown";
import Tag from "primevue/tag";
import InputText from "primevue/inputtext";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { useTableFilter } from "../../composables/useTableFilter.js";
import { fullName } from "../../lib/name.js";
import { COACH_LEVEL_OPTIONS, COACH_LEVEL_LABELS } from "../../lib/ranking.js";

const navLinks = useNavLinks();
const toast = useToast();
const confirm = useConfirm();
const { filters } = useTableFilter();

const emptyForm = () => ({ firstName: "", lastName: "", email: "", phone: "", level: null, address: "", iban: "" });

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
  form.value = { firstName: coach.firstName, lastName: coach.lastName, email: coach.email ?? "", phone: coach.phone ?? "", level: coach.level ?? null, address: coach.address ?? "", iban: coach.iban ?? "" };
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
    message: `Supprimer ${fullName(coach)} ?`,
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
    <div class="flex flex-col items-stretch sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
      <h2 class="text-sm font-medium text-slate-600">{{ coaches.length }} entraineur(s)</h2>
      <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <div class="relative sm:w-64">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <InputText v-model="filters.global.value" placeholder="Rechercher…" class="w-full pl-9" />
        </div>
        <Button class="w-full sm:w-auto" label="Nouvel entraineur" icon="pi pi-plus" @click="openCreate" />
      </div>
    </div>

    <DataTable responsive-layout="stack" breakpoint="768px"
      :value="coaches"
      :loading="loading"
      v-model:filters="filters"
      :global-filter-fields="['firstName', 'lastName', 'email', 'phone']"
      paginator
      :rows="10"
      :rows-per-page-options="[10, 25, 50]"
      class="bg-white rounded-xl shadow border border-slate-200 overflow-hidden clickable-rows"
      striped-rows
      @row-click="openEdit($event.data)"
    >
      <template #empty>
        <p class="text-slate-400 text-sm py-4">{{ filters.global.value ? "Aucun résultat." : "Aucun entraineur." }}</p>
      </template>
      <Column field="lastName" header="Nom" sortable>
        <template #body="{ data }">{{ fullName(data) }}</template>
      </Column>
      <Column header="Niveau Adeps">
        <template #body="{ data }"><Tag v-if="data.level" severity="info" :value="COACH_LEVEL_LABELS[data.level]" /></template>
      </Column>
      <Column field="email" header="Email" />
      <Column field="phone" header="Téléphone" />
      <Column header="" style="width: 7rem">
        <template #body="{ data }">
          <div class="flex gap-1 justify-end">
            <Button icon="pi pi-pencil" severity="secondary" text rounded aria-label="Modifier" @click.stop="openEdit(data)" />
            <Button icon="pi pi-trash" severity="danger" text rounded aria-label="Supprimer" @click.stop="onDelete(data)" />
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
          <label class="text-xs text-slate-500 block mb-1">Niveau Adeps</label>
          <Dropdown v-model="form.level" :options="COACH_LEVEL_OPTIONS" option-label="label" option-value="value" placeholder="Non défini" show-clear class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Email (optionnel)</label>
          <InputText v-model="form.email" class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Téléphone (optionnel)</label>
          <InputText v-model="form.phone" class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Adresse (note de défraiement)</label>
          <InputText v-model="form.address" class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">N° de compte (IBAN)</label>
          <InputText v-model="form.iban" placeholder="BE68 5390 0754 7034" class="w-full" />
          <p class="text-xs text-slate-400 mt-1">Contrôlé à l'enregistrement ; repris sur la note de défraiement.</p>
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="dialogVisible = false" />
          <Button type="submit" label="Enregistrer" :loading="saving" />
        </div>
      </form>
    </Dialog>
  </AppLayout>
</template>
