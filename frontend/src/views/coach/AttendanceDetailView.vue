<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import SelectButton from "primevue/selectbutton";
import Avatar from "primevue/avatar";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { ATTENDANCE_STATUS_OPTIONS, ATTENDANCE_STATUS_COLORS } from "../../lib/attendance.js";
import { fullName, initials as personInitials } from "../../lib/name.js";

const navLinks = useNavLinks();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const occurrenceId = route.params.occurrenceId;

const attendance = ref([]);
const saving = ref(false);

const counts = computed(() =>
  attendance.value.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), { PRESENT: 0, LATE: 0, EXCUSED: 0, ABSENT: 0 })
);

function initials(row) {
  return personInitials(row);
}

onMounted(async () => {
  const { data } = await api.get(`/occurrences/${occurrenceId}/attendance`);
  attendance.value = data.attendance;
});

function markAll(status) {
  attendance.value.forEach((row) => (row.status = status));
}

async function onSave() {
  saving.value = true;
  try {
    await api.put(`/occurrences/${occurrenceId}/attendance`, {
      records: attendance.value.map(({ playerId, status, note }) => ({ playerId, status, note })),
    });
    toast.add({ severity: "success", summary: "Présences enregistrées", life: 3000 });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AppLayout title="Feuille de présence" :nav-links="navLinks">
    <Button label="Retour" icon="pi pi-arrow-left" text class="mb-3 -ml-2" @click="router.back()" />

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="text-sm font-medium text-slate-600">
          {{ counts.PRESENT }} présent(s) · {{ counts.LATE }} retard(s) · {{ counts.EXCUSED }} excusé(s) · {{ counts.ABSENT }} absent(s)
        </p>
        <div class="flex gap-1">
          <Button label="Tous présents" size="small" text @click="markAll('PRESENT')" />
          <Button label="Tous absents" size="small" text severity="danger" @click="markAll('ABSENT')" />
        </div>
      </div>

      <ul class="divide-y divide-slate-100 mb-4">
        <li v-for="row in attendance" :key="row.playerId" class="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <div class="flex items-center gap-3">
            <Avatar :label="initials(row)" shape="circle" class="shrink-0" :style="{ backgroundColor: ATTENDANCE_STATUS_COLORS[row.status].bg, color: ATTENDANCE_STATUS_COLORS[row.status].fg }" />
            <span class="font-medium text-slate-700">{{ fullName(row) }}</span>
          </div>
          <div class="flex flex-wrap items-center gap-2 sm:ml-auto">
            <InputText v-model="row.note" placeholder="Note (optionnel)" class="w-40" />
            <SelectButton v-model="row.status" :options="ATTENDANCE_STATUS_OPTIONS" option-label="label" option-value="value" :allow-empty="false" />
          </div>
        </li>
        <li v-if="!attendance.length" class="py-2 text-slate-400 text-sm">Aucun joueur dans le groupe de cet entrainement.</li>
      </ul>

      <Button label="Enregistrer" :loading="saving" @click="onSave" />
    </div>
  </AppLayout>
</template>
