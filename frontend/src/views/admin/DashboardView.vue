<script setup>
import { ref, onMounted } from "vue";
import { RouterLink } from "vue-router";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Calendar from "primevue/calendar";
import Checkbox from "primevue/checkbox";
import Tag from "primevue/tag";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { toDateOnly } from "../../lib/date.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { useTableFilter } from "../../composables/useTableFilter.js";

const navLinks = useNavLinks();
const toast = useToast();
const { filters } = useTableFilter();

const seasons = ref([]);
const players = ref([]);
const coaches = ref([]);
const loading = ref(true);

const dialogVisible = ref(false);
const editingId = ref(null);
const form = ref({ name: "", startDate: null, endDate: null, isActive: false });
const saving = ref(false);

async function loadSeasons() {
  loading.value = true;
  const { data } = await api.get("/seasons");
  seasons.value = data.seasons;
  loading.value = false;
}

onMounted(async () => {
  const [p, c] = await Promise.all([api.get("/players"), api.get("/coaches")]);
  players.value = p.data.players;
  coaches.value = c.data.coaches;
  await loadSeasons();
});

function openCreate() {
  editingId.value = null;
  form.value = { name: "", startDate: null, endDate: null, isActive: false };
  dialogVisible.value = true;
}

function openEdit(season) {
  editingId.value = season.id;
  form.value = {
    name: season.name,
    startDate: new Date(season.startDate),
    endDate: new Date(season.endDate),
    isActive: season.isActive,
  };
  dialogVisible.value = true;
}

async function onSave() {
  saving.value = true;
  const payload = {
    ...form.value,
    startDate: toDateOnly(form.value.startDate),
    endDate: toDateOnly(form.value.endDate),
  };
  try {
    if (editingId.value) {
      await api.put(`/seasons/${editingId.value}`, payload);
    } else {
      await api.post("/seasons", payload);
    }
    dialogVisible.value = false;
    toast.add({ severity: "success", summary: editingId.value ? "Saison modifiée" : "Saison créée", life: 3000 });
    await loadSeasons();
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("fr-FR");
}
</script>

<template>
  <AppLayout title="Espace administrateur" :nav-links="navLinks">
    <div class="grid gap-4 sm:grid-cols-3 mb-6">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm text-slate-500">Saisons</p>
        <p class="text-2xl font-semibold">{{ seasons.length }}</p>
      </div>
      <RouterLink to="/admin/players" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:ring-1 hover:ring-sky-300">
        <p class="text-sm text-slate-500">Joueurs</p>
        <p class="text-2xl font-semibold">{{ players.length }}</p>
      </RouterLink>
      <RouterLink to="/admin/coaches" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:ring-1 hover:ring-sky-300">
        <p class="text-sm text-slate-500">Entraineurs</p>
        <p class="text-2xl font-semibold">{{ coaches.length }}</p>
      </RouterLink>
    </div>

    <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <h2 class="text-sm font-medium text-slate-600">Saisons</h2>
      <div class="flex items-center gap-2 flex-1 sm:flex-none flex-wrap">
        <div class="relative flex-1 sm:w-64 min-w-[10rem]">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <InputText v-model="filters.global.value" placeholder="Rechercher…" class="w-full pl-9" />
        </div>
        <Button label="Nouvelle saison" icon="pi pi-plus" @click="openCreate" />
      </div>
    </div>

    <DataTable responsive-layout="stack" breakpoint="768px"
      :value="seasons"
      :loading="loading"
      v-model:filters="filters"
      :global-filter-fields="['name']"
      paginator
      :rows="10"
      :rows-per-page-options="[10, 25, 50]"
      class="bg-white rounded-xl shadow border border-slate-200 overflow-hidden"
      striped-rows
    >
      <template #empty>
        <p class="text-slate-400 text-sm py-4">{{ filters.global.value ? "Aucun résultat." : "Aucune saison créée." }}</p>
      </template>
      <Column field="name" header="Nom" sortable>
        <template #body="{ data }">
          {{ data.name }}
          <Tag v-if="data.isActive" severity="success" value="active" class="ml-2" />
        </template>
      </Column>
      <Column header="Période">
        <template #body="{ data }">{{ formatDate(data.startDate) }} → {{ formatDate(data.endDate) }}</template>
      </Column>
      <Column header="" style="width: 4rem">
        <template #body="{ data }">
          <Button icon="pi pi-pencil" severity="secondary" text rounded aria-label="Modifier" @click="openEdit(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="dialogVisible" :header="editingId ? 'Modifier la saison' : 'Nouvelle saison'" modal style="width: 26rem" class="mx-4">
      <form class="grid gap-3 pt-2" @submit.prevent="onSave">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Nom</label>
          <InputText v-model="form.name" required class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-500 block mb-1">Début</label>
            <Calendar v-model="form.startDate" date-format="dd/mm/yy" show-icon required class="w-full" input-class="w-full" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Fin</label>
            <Calendar v-model="form.endDate" date-format="dd/mm/yy" show-icon required class="w-full" input-class="w-full" />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Checkbox v-model="form.isActive" binary input-id="isActive" />
          <label for="isActive" class="text-sm text-slate-600">Saison active</label>
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="dialogVisible = false" />
          <Button type="submit" label="Enregistrer" :loading="saving" />
        </div>
      </form>
    </Dialog>
  </AppLayout>
</template>
