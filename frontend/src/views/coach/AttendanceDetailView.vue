<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Textarea from "primevue/textarea";
import { useConfirm } from "primevue/useconfirm";
import Avatar from "primevue/avatar";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { ATTENDANCE_STATUS_OPTIONS, colorsFor } from "../../lib/attendance.js";
import { fullName, initials as personInitials } from "../../lib/name.js";

const navLinks = useNavLinks();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();
const occurrenceId = route.params.occurrenceId;

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
  const { data } = await api.get(`/occurrences/${occurrenceId}/attendance`);
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
        await api.delete(`/occurrences/${occurrenceId}/attendance`);
        attendance.value.forEach((row) => { row.status = null; row.note = null; });
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
    await api.put(`/occurrences/${occurrenceId}/attendance`, {
      records: attendance.value.map(({ playerId, status, note }) => ({ playerId, status: status ?? "ABSENT", note })),
    });
    encoded.value = true;
    toast.add({ severity: "success", summary: "Présences enregistrées", life: 3000 });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AppLayout title="Feuille de présence" :nav-links="navLinks">
    <Button label="Retour" icon="pi pi-arrow-left" text class="mb-3 -ml-2" @click="router.back()" />

    <div class="card p-5">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p class="section-title">
          <template v-if="attendance.length && counts.NONE === attendance.length">Non encodé</template>
          <template v-else>
            {{ counts.PRESENT }} présent(s) · {{ counts.ABSENT }} absent(s) · {{ counts.LATE }} retard(s) · {{ counts.EXCUSED }} excusé(s)<template v-if="counts.NONE"> · {{ counts.NONE }} à encoder</template>
          </template>
        </p>
        <div class="flex gap-1">
          <Button label="Tous présents" icon="pi pi-check" size="small" severity="secondary" @click="markAll('PRESENT')" />
          <Button label="Tous absents" icon="pi pi-times" size="small" severity="secondary" @click="markAll('ABSENT')" />
        </div>
      </div>

      <ul class="divide-y divide-slate-100 mb-4">
        <!-- Statut en pastilles (un toucher), note sur toute la largeur qui grandit avec le texte. -->
        <li v-for="row in attendance" :key="row.playerId" class="py-3 flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
          <Avatar :label="initials(row)" shape="circle" class="shrink-0" :style="{ backgroundColor: colorsFor(row.status).bg, color: colorsFor(row.status).fg }" />
          <span class="flex-1 basis-40 font-semibold text-sm text-slate-900">{{ fullName(row) }}</span>
          <div role="radiogroup" :aria-label="`Statut de ${fullName(row)}`" class="grid grid-cols-4 gap-1.5 w-full sm:flex sm:w-auto">
            <button
              v-for="o in ATTENDANCE_STATUS_OPTIONS"
              :key="o.value"
              type="button"
              role="radio"
              :aria-checked="row.status === o.value"
              class="h-[34px] px-2 sm:px-3 rounded-full border text-[0.8125rem] font-semibold transition-colors"
              :style="row.status === o.value
                ? { borderColor: colorsFor(o.value).fg, backgroundColor: colorsFor(o.value).bg, color: colorsFor(o.value).fg }
                : { borderColor: '#e6eaf2', backgroundColor: '#fff', color: '#64748b' }"
              @click="row.status = o.value"
            >{{ o.label }}</button>
          </div>
          <Textarea
            v-model="row.note"
            rows="1"
            auto-resize
            placeholder="Note (optionnel)"
            :aria-label="`Note pour ${fullName(row)}`"
            class="basis-full w-full !text-sm !bg-slate-50 !border-[#e6eaf2] resize-none"
          />
        </li>
        <li v-if="!attendance.length" class="py-2 text-slate-400 text-sm">Aucun joueur dans le groupe de cet entrainement.</li>
      </ul>

            <div class="flex flex-wrap items-center gap-2">
        <Button label="Enregistrer" :loading="saving" @click="onSave" />
        <Button v-if="encoded" label="Annuler l'encodage" icon="pi pi-undo" severity="danger" outlined :loading="undoing" @click="onUndo" />
        <span v-if="encoded" class="text-xs text-slate-400">Efface toutes les présences de cette séance (mauvais jour, par exemple).</span>
      </div>
    </div>
  </AppLayout>
</template>
