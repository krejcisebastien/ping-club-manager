<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Dropdown from "primevue/dropdown";
import Tag from "primevue/tag";
import { useConfirm } from "primevue/useconfirm";
import Avatar from "primevue/avatar";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { ATTENDANCE_STATUS_OPTIONS, ATTENDANCE_STATUS_COLORS, ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_SEVERITY } from "../../lib/attendance.js";
import { fullName, initials } from "../../lib/name.js";

const navLinks = useNavLinks();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();
const dayId = route.params.dayId;

const day = ref(null);
const periods = ref([]);
const players = ref([]);
const saving = ref(false);
const undoing = ref(false);
const encoded = ref(false);

const dayLabel = computed(() =>
  day.value ? new Date(day.value.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : ""
);

const cellsOf = (row) => Object.values(row.cells);
const isFullDay = (row) => cellsOf(row).length > 0 && cellsOf(row).every((c) => c.status === "PRESENT");
const presentPlayers = computed(() => players.value.filter(isFullDay).length);

onMounted(async () => {
  const { data } = await api.get(`/camps/days/${dayId}/attendance`);
  day.value = data.day;
  periods.value = data.periods;
  players.value = data.players;
  encoded.value = data.encoded;
});

function setRow(row, status) {
  cellsOf(row).forEach((c) => (c.status = status));
}

function setAll(status) {
  players.value.forEach((row) => setRow(row, status));
}

function onUndo() {
  confirm.require({
    message: "Annuler l'encodage : toutes les présences enregistrées seront effacées. Continuer ?",
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Effacer",
    acceptClass: "p-button-danger",
    rejectLabel: "Garder",
    rejectClass: "p-button-secondary p-button-outlined",
    accept: async () => {
      undoing.value = true;
      try {
        await api.delete(`/camps/days/${dayId}/attendance`);
        players.value.forEach((row) => setRow(row, "ABSENT"));
        encoded.value = false;
        toast.add({ severity: "success", summary: "Encodage annulé", life: 3000 });
      } catch (err) {
        toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
      } finally {
        undoing.value = false;
      }
    },
  });
}

async function onSave() {
  saving.value = true;
  try {
    await api.put(`/camps/days/${dayId}/attendance`, {
      records: players.value.flatMap((row) =>
        cellsOf(row).map((c) => ({ campPeriodGroupId: c.campPeriodGroupId, playerId: row.playerId, status: c.status }))
      ),
    });
    encoded.value = true;
    toast.add({ severity: "success", summary: "Présences enregistrées", life: 3000 });
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}

function rowColor(row) {
  if (isFullDay(row)) return ATTENDANCE_STATUS_COLORS.PRESENT;
  return cellsOf(row).every((c) => c.status === "ABSENT") ? ATTENDANCE_STATUS_COLORS.ABSENT : ATTENDANCE_STATUS_COLORS.LATE;
}
</script>

<template>
  <AppLayout title="Présences — journée de stage" :nav-links="navLinks">
    <Button label="Retour" icon="pi pi-arrow-left" text class="mb-3 -ml-2" @click="router.back()" />

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <p class="font-medium text-slate-700 capitalize">{{ dayLabel }}</p>
          <p class="text-sm text-slate-500">{{ presentPlayers }} / {{ players.length }} présent(s) toute la journée</p>
        </div>
        <div class="flex gap-1">
          <Button label="Tous présents (journée)" size="small" text @click="setAll('PRESENT')" />
          <Button label="Tous absents" size="small" text severity="danger" @click="setAll('ABSENT')" />
        </div>
      </div>

      <ul class="divide-y divide-slate-100 mb-4">
        <li v-for="row in players" :key="row.playerId" class="py-3">
          <div class="flex items-center gap-3 mb-2 flex-wrap">
            <Avatar :label="initials(row)" shape="circle" class="shrink-0" :style="{ backgroundColor: rowColor(row).bg, color: rowColor(row).fg }" />
            <span class="font-medium text-slate-700">{{ fullName(row) }}</span>
            <Tag v-if="isFullDay(row)" severity="success" value="Journée entière" />
            <div class="ml-auto flex gap-1">
              <Button v-if="!isFullDay(row)" label="Journée entière" icon="pi pi-check" size="small" outlined @click="setRow(row, 'PRESENT')" />
              <Button v-else label="Absent" size="small" text severity="danger" @click="setRow(row, 'ABSENT')" />
            </div>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div v-for="period in periods" :key="period.id">
              <template v-if="row.cells[period.id]">
                <label class="text-xs text-slate-500 block mb-1">{{ period.label }} <span class="text-slate-400">{{ period.startTime }}–{{ period.endTime }}</span></label>
                <Dropdown v-model="row.cells[period.id].status" :options="ATTENDANCE_STATUS_OPTIONS" option-label="label" option-value="value" class="w-full">
                  <template #value="{ value }"><Tag :severity="ATTENDANCE_STATUS_SEVERITY[value]" :value="ATTENDANCE_STATUS_LABELS[value]" /></template>
                </Dropdown>
              </template>
            </div>
          </div>
        </li>
        <li v-if="!players.length" class="py-2 text-slate-400 text-sm">Aucun joueur inscrit sur les groupes de cette journée.</li>
      </ul>

            <div class="flex flex-wrap items-center gap-2">
        <Button label="Enregistrer" :loading="saving" @click="onSave" />
        <Button v-if="encoded" label="Annuler l'encodage" icon="pi pi-undo" severity="danger" outlined :loading="undoing" @click="onUndo" />
        <span v-if="encoded" class="text-xs text-slate-400">Efface toutes les présences de cette journée (mauvais jour, par exemple).</span>
      </div>
    </div>
  </AppLayout>
</template>
