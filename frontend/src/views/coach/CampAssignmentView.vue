<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Dropdown from "primevue/dropdown";
import Avatar from "primevue/avatar";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { fullName, initials } from "../../lib/name.js";

const navLinks = useNavLinks();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const dayId = route.params.dayId;

const day = ref(null);
const periods = ref([]);
const groups = ref([]);
const players = ref([]);
const saving = ref(false);

const dayLabel = computed(() =>
  day.value ? new Date(day.value.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : ""
);
const unassigned = computed(() => players.value.filter((p) => periods.value.some((period) => !p.cells[period.id])).length);

async function load() {
  const { data } = await api.get(`/camps/days/${dayId}/assignment`);
  day.value = data.day;
  periods.value = data.periods;
  groups.value = data.groups;
  players.value = data.players;
}
onMounted(load);

const groupOptions = computed(() => groups.value.map((g) => ({ label: g.name, value: g.id })));

// Reprend, pour tous les joueurs, le groupe qu'ils avaient sur la période précédente.
function copyFromPrevious(index) {
  const previous = periods.value[index - 1];
  const current = periods.value[index];
  players.value.forEach((p) => (p.cells[current.id] = p.cells[previous.id]));
}

async function onSave() {
  saving.value = true;
  try {
    await api.put(`/camps/days/${dayId}/assignment`, {
      assignments: players.value.flatMap((p) =>
        periods.value.map((period) => ({ periodId: period.id, playerId: p.playerId, campGroupId: p.cells[period.id] ?? null }))
      ),
    });
    toast.add({ severity: "success", summary: "Répartition enregistrée", life: 3000 });
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AppLayout title="Répartition — journée de stage" :nav-links="navLinks">
    <Button label="Retour" icon="pi pi-arrow-left" text class="mb-3 -ml-2" @click="router.back()" />

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div class="mb-3">
        <p class="font-medium text-slate-700 capitalize">{{ dayLabel }}</p>
        <p class="text-sm text-slate-500">
          Chaque période, place chaque joueur inscrit dans son groupe.
          <span v-if="unassigned" class="text-amber-600">{{ unassigned }} joueur(s) pas encore réparti(s) sur toutes les périodes.</span>
        </p>
      </div>

      <div v-if="periods.length > 1" class="flex flex-wrap gap-1 mb-3">
        <Button
          v-for="(period, i) in periods.slice(1)"
          :key="period.id"
          :label="`Copier « ${periods[i].label} » vers « ${period.label} »`"
          icon="pi pi-copy"
          size="small"
          text
          @click="copyFromPrevious(i + 1)"
        />
      </div>

      <ul class="divide-y divide-slate-100 mb-4">
        <li v-for="row in players" :key="row.playerId" class="py-3">
          <div class="flex items-center gap-3 mb-2">
            <Avatar :label="initials(row)" shape="circle" class="shrink-0 bg-slate-100 text-slate-600" />
            <span class="font-medium text-slate-700">{{ fullName(row) }}</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div v-for="period in periods" :key="period.id">
              <label class="text-xs text-slate-500 block mb-1">{{ period.label }} <span class="text-slate-400">{{ period.startTime }}–{{ period.endTime }}</span></label>
              <Dropdown v-model="row.cells[period.id]" :options="groupOptions" option-label="label" option-value="value" placeholder="Pas de groupe" show-clear class="w-full" />
            </div>
          </div>
        </li>
        <li v-if="!players.length" class="py-2 text-slate-400 text-sm">Aucun joueur inscrit au stage : inscris-les d'abord.</li>
        <li v-if="players.length && !periods.length" class="py-2 text-slate-400 text-sm">Cette journée n'a pas encore de période.</li>
      </ul>

      <Button label="Enregistrer" :loading="saving" @click="onSave" />
    </div>
  </AppLayout>
</template>
