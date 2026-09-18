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
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();
const toast = useToast();

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const weekdayOptions = WEEKDAYS.map((label, value) => ({ label, value }));

const router = useRouter();
const seasons = ref([]);
const selectedSeasonId = ref("");
const groups = ref([]);
const trainings = ref([]);
const loading = ref(true);

const dialogVisible = ref(false);
const form = ref({ name: "", groupId: null, location: "", weekday: null, startTime: null, endTime: null });
const saving = ref(false);

async function loadSeasons() {
  const { data } = await api.get("/seasons");
  seasons.value = data.seasons;
  if (!selectedSeasonId.value && seasons.value.length) {
    selectedSeasonId.value = seasons.value[0].id;
  }
}

async function loadGroupsAndTrainings() {
  if (!selectedSeasonId.value) {
    groups.value = [];
    trainings.value = [];
    return;
  }
  loading.value = true;
  const [g, t] = await Promise.all([
    api.get("/groups", { params: { seasonId: selectedSeasonId.value } }),
    api.get("/trainings", { params: { seasonId: selectedSeasonId.value } }),
  ]);
  groups.value = g.data.groups;
  trainings.value = t.data.trainings;
  loading.value = false;
}

onMounted(async () => {
  await loadSeasons();
  await loadGroupsAndTrainings();
});

watch(selectedSeasonId, loadGroupsAndTrainings);

function timeToString(date) {
  if (!date) return null;
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function openCreate() {
  form.value = { name: "", groupId: null, location: "", weekday: null, startTime: null, endTime: null };
  dialogVisible.value = true;
}

async function onCreate() {
  saving.value = true;
  try {
    await api.post("/trainings", {
      seasonId: selectedSeasonId.value,
      ...form.value,
      startTime: timeToString(form.value.startTime),
      endTime: timeToString(form.value.endTime),
    });
    dialogVisible.value = false;
    toast.add({ severity: "success", summary: "Entrainement créé", life: 3000 });
    await loadGroupsAndTrainings();
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}

function weekdayLabel(w) {
  return w != null ? WEEKDAYS[w] : "";
}
</script>

<template>
  <AppLayout title="Entrainements" :nav-links="navLinks">
    <div class="mb-4 max-w-xs">
      <label class="text-xs text-slate-500 block mb-1">Saison</label>
      <Dropdown v-model="selectedSeasonId" :options="seasons" option-label="name" option-value="id" class="w-full" />
    </div>

    <div class="flex items-center justify-between mb-4">
      <h2 class="text-sm font-medium text-slate-600">{{ trainings.length }} entrainement(s)</h2>
      <Button label="Nouvel entrainement" icon="pi pi-plus" @click="openCreate" />
    </div>

    <DataTable :value="trainings" :loading="loading" class="bg-white rounded-xl shadow border border-slate-200 overflow-hidden" striped-rows @row-click="router.push(`/admin/trainings/${$event.data.id}`)">
      <template #empty>
        <p class="text-slate-400 text-sm py-4">Aucun entrainement pour cette saison.</p>
      </template>
      <Column field="name" header="Nom" sortable>
        <template #body="{ data }"><span class="cursor-pointer">{{ data.name }}</span></template>
      </Column>
      <Column header="Groupe">
        <template #body="{ data }">{{ data.group?.name }}</template>
      </Column>
      <Column header="Horaire">
        <template #body="{ data }">{{ weekdayLabel(data.weekday) }} {{ data.startTime }}–{{ data.endTime }}</template>
      </Column>
      <Column field="location" header="Lieu" />
    </DataTable>

    <Dialog v-model:visible="dialogVisible" header="Nouvel entrainement" modal style="width: 28rem" class="mx-4">
      <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="onCreate">
        <InputText v-model="form.name" placeholder="Nom" required class="sm:col-span-2 w-full" />
        <Dropdown v-model="form.groupId" :options="groups" option-label="name" option-value="id" placeholder="Groupe…" required class="sm:col-span-2 w-full" />
        <InputText v-model="form.location" placeholder="Lieu (optionnel)" class="sm:col-span-2 w-full" />
        <Dropdown v-model="form.weekday" :options="weekdayOptions" option-label="label" option-value="value" placeholder="Jour de semaine…" class="sm:col-span-2 w-full" />
        <Calendar v-model="form.startTime" time-only hour-format="24" placeholder="Début" class="w-full" input-class="w-full" />
        <Calendar v-model="form.endTime" time-only hour-format="24" placeholder="Fin" class="w-full" input-class="w-full" />
        <div class="sm:col-span-2 flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="dialogVisible = false" />
          <Button type="submit" label="Créer" :loading="saving" />
        </div>
      </form>
    </Dialog>
  </AppLayout>
</template>
