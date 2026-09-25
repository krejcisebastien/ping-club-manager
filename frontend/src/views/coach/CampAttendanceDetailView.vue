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
import { ATTENDANCE_STATUS_OPTIONS, colorsFor, ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_SEVERITY } from "../../lib/attendance.js";
import { fullName, initials as personInitials } from "../../lib/name.js";

const navLinks = useNavLinks();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();
const periodGroupId = route.params.periodGroupId;

const attendance = ref([]);
const saving = ref(false);
const undoing = ref(false);
const encoded = ref(false);

const counts = computed(() =>
  attendance.value.reduce((acc, r) => ({ ...acc, [r.status ?? "NONE"]: (acc[r.status ?? "NONE"] ?? 0) + 1 }), { PRESENT: 0, LATE: 0, EXCUSED: 0, ABSENT: 0, NONE: 0 })
);

function initials(row) {
  return personInitials(row);
}

onMounted(async () => {
  const { data } = await api.get(`/camp-period-groups/${periodGroupId}/attendance`);
  attendance.value = data.attendance;
  encoded.value = data.encoded;
});

function markAll(status) {
  attendance.value.forEach((row) => (row.status = status));
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
        await api.delete(`/camp-period-groups/${periodGroupId}/attendance`);
        attendance.value.forEach((row) => { row.status = null; });
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
    await api.put(`/camp-period-groups/${periodGroupId}/attendance`, {
      records: attendance.value.map(({ playerId, status }) => ({ playerId, status: status ?? "ABSENT" })),
    });
    encoded.value = true;
    toast.add({ severity: "success", summary: "Présences enregistrées", life: 3000 });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AppLayout title="Feuille de présence — stage" :nav-links="navLinks">
    <Button label="Retour" icon="pi pi-arrow-left" text class="mb-3 -ml-2" @click="router.back()" />

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="text-sm font-medium text-slate-600">
          <template v-if="attendance.length && counts.NONE === attendance.length">Non encodé</template>
          <template v-else>
            {{ counts.PRESENT }} présent(s) · {{ counts.ABSENT }} absent(s) · {{ counts.LATE }} retard(s) · {{ counts.EXCUSED }} excusé(s)<template v-if="counts.NONE"> · {{ counts.NONE }} à encoder</template>
          </template>
        </p>
        <div class="flex gap-1">
          <Button label="Tous présents" size="small" text @click="markAll('PRESENT')" />
          <Button label="Tous absents" size="small" text severity="danger" @click="markAll('ABSENT')" />
        </div>
      </div>

      <ul class="divide-y divide-slate-100 mb-4">
        <li v-for="row in attendance" :key="row.playerId" class="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <div class="flex items-center gap-3">
            <Avatar :label="initials(row)" shape="circle" class="shrink-0" :style="{ backgroundColor: colorsFor(row.status).bg, color: colorsFor(row.status).fg }" />
            <span class="font-medium text-slate-700">{{ fullName(row) }}</span>
          </div>
          <Dropdown v-model="row.status" :options="ATTENDANCE_STATUS_OPTIONS" option-label="label" option-value="value" class="w-36 sm:ml-auto">
            <template #value="{ value }"><Tag v-if="value" :severity="ATTENDANCE_STATUS_SEVERITY[value]" :value="ATTENDANCE_STATUS_LABELS[value]" /><span v-else class="text-slate-400 text-sm">À encoder</span></template>
          </Dropdown>
        </li>
        <li v-if="!attendance.length" class="py-2 text-slate-400 text-sm">Aucun joueur inscrit sur ce groupe.</li>
      </ul>

            <div class="flex flex-wrap items-center gap-2">
        <Button label="Enregistrer" :loading="saving" @click="onSave" />
        <Button v-if="encoded" label="Annuler l'encodage" icon="pi pi-undo" severity="danger" outlined :loading="undoing" @click="onUndo" />
        <span v-if="encoded" class="text-xs text-slate-400">Efface toutes les présences de cette période (mauvais jour, par exemple).</span>
      </div>
    </div>
  </AppLayout>
</template>
