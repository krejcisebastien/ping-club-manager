<script setup>
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import Calendar from "primevue/calendar";
import Dropdown from "primevue/dropdown";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { toDateOnly } from "../../lib/date.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();
const router = useRouter();
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
  return p.coach ? `${p.coach.firstName} ${p.coach.lastName}` : "";
}
</script>

<template>
  <AppLayout title="Plans d'entrainement" :nav-links="navLinks">
    <div class="mb-4 max-w-xs">
      <label class="text-xs text-slate-500 block mb-1">Saison</label>
      <Dropdown v-model="selectedSeasonId" :options="seasons" option-label="name" option-value="id" class="w-full" />
    </div>

    <div class="flex items-center justify-between mb-4">
      <h2 class="text-sm font-medium text-slate-600">{{ plans.length }} plan(s)</h2>
      <Button label="Nouveau plan" icon="pi pi-plus" @click="openCreate" />
    </div>

    <DataTable :value="plans" :loading="loading" class="bg-white rounded-xl shadow-sm overflow-hidden" striped-rows @row-click="router.push(`/coach/training-plans/${$event.data.id}`)">
      <template #empty>
        <p class="text-slate-400 text-sm py-4">Aucun plan pour cette saison.</p>
      </template>
      <Column field="title" header="Titre" sortable>
        <template #body="{ data }"><span class="cursor-pointer">{{ data.title }}</span></template>
      </Column>
      <Column header="Auteur">
        <template #body="{ data }">{{ coachName(data) }}</template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="dialogVisible" header="Nouveau plan" modal style="width: 28rem" class="mx-4">
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
          <Textarea v-model="form.description" rows="3" class="w-full" />
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="dialogVisible = false" />
          <Button type="submit" label="Créer" :loading="saving" />
        </div>
      </form>
    </Dialog>
  </AppLayout>
</template>
