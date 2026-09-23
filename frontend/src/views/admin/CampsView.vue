<script setup>
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";
import Calendar from "primevue/calendar";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { toDateOnly } from "../../lib/date.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { useTableFilter } from "../../composables/useTableFilter.js";

const navLinks = useNavLinks();
const toast = useToast();
const router = useRouter();
const { filters } = useTableFilter();

const seasons = ref([]);
const selectedSeasonId = ref("");
const camps = ref([]);
const loading = ref(true);

const dialogVisible = ref(false);
const form = ref({ name: "", location: "", startDate: null, endDate: null });
const saving = ref(false);

async function loadSeasons() {
  const { data } = await api.get("/seasons");
  seasons.value = data.seasons;
  if (!selectedSeasonId.value && seasons.value.length) {
    selectedSeasonId.value = seasons.value[0].id;
  }
}

async function loadCamps() {
  if (!selectedSeasonId.value) {
    camps.value = [];
    return;
  }
  loading.value = true;
  const { data } = await api.get("/camps", { params: { seasonId: selectedSeasonId.value } });
  camps.value = data.camps;
  loading.value = false;
}

onMounted(async () => {
  await loadSeasons();
  await loadCamps();
});

watch(selectedSeasonId, loadCamps);

function openCreate() {
  form.value = { name: "", location: "", startDate: null, endDate: null };
  dialogVisible.value = true;
}

async function onCreate() {
  saving.value = true;
  try {
    await api.post("/camps", {
      seasonId: selectedSeasonId.value,
      ...form.value,
      startDate: toDateOnly(form.value.startDate),
      endDate: toDateOnly(form.value.endDate),
    });
    dialogVisible.value = false;
    toast.add({ severity: "success", summary: "Stage créé", life: 3000 });
    await loadCamps();
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AppLayout title="Stages" :nav-links="navLinks">
    <div class="mb-4 max-w-xs">
      <label class="text-xs text-slate-500 block mb-1">Saison</label>
      <Dropdown v-model="selectedSeasonId" :options="seasons" option-label="name" option-value="id" class="w-full" />
    </div>

    <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <h2 class="text-sm font-medium text-slate-600">{{ camps.length }} stage(s)</h2>
      <div class="flex items-center gap-2 flex-1 sm:flex-none flex-wrap">
        <div class="relative flex-1 sm:w-64 min-w-[10rem]">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <InputText v-model="filters.global.value" placeholder="Rechercher…" class="w-full pl-9" />
        </div>
        <Button label="Nouveau stage" icon="pi pi-plus" @click="openCreate" />
      </div>
    </div>

    <DataTable
      :value="camps"
      :loading="loading"
      v-model:filters="filters"
      :global-filter-fields="['name', 'location']"
      paginator
      :rows="10"
      :rows-per-page-options="[10, 25, 50]"
      class="bg-white rounded-xl shadow border border-slate-200 overflow-hidden"
      striped-rows
      @row-click="router.push(`/admin/camps/${$event.data.id}`)"
    >
      <template #empty>
        <p class="text-slate-400 text-sm py-4">{{ filters.global.value ? "Aucun résultat." : "Aucun stage pour cette saison." }}</p>
      </template>
      <Column field="name" header="Nom" sortable>
        <template #body="{ data }"><span class="cursor-pointer">{{ data.name }}</span></template>
      </Column>
      <Column field="location" header="Lieu" />
      <Column header="Période">
        <template #body="{ data }">
          {{ new Date(data.startDate).toLocaleDateString("fr-FR") }} → {{ new Date(data.endDate).toLocaleDateString("fr-FR") }}
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="dialogVisible" header="Nouveau stage" modal style="width: 28rem" class="mx-4">
      <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="onCreate">
        <InputText v-model="form.name" placeholder="Nom" required class="sm:col-span-2 w-full" />
        <InputText v-model="form.location" placeholder="Lieu (optionnel)" class="sm:col-span-2 w-full" />
        <Calendar v-model="form.startDate" date-format="dd/mm/yy" show-icon placeholder="Début" required class="w-full" input-class="w-full" />
        <Calendar v-model="form.endDate" date-format="dd/mm/yy" show-icon placeholder="Fin" required class="w-full" input-class="w-full" />
        <div class="sm:col-span-2 flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="dialogVisible = false" />
          <Button type="submit" label="Créer" :loading="saving" />
        </div>
      </form>
    </Dialog>
  </AppLayout>
</template>
