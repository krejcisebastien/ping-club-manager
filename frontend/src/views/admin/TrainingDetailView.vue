<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";
import Calendar from "primevue/calendar";
import Tag from "primevue/tag";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import FullCalendar from "@fullcalendar/vue3";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import { CALENDAR_PLUGINS } from "../../lib/calendar.js";
import AppLayout from "../../components/AppLayout.vue";
import CoachAssignmentList from "../../components/CoachAssignmentList.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { useAuthStore } from "../../stores/auth.js";
import { occurrenceState } from "../../lib/occurrence.js";

const navLinks = useNavLinks();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();
const trainingId = route.params.id;

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const weekdayOptions = WEEKDAYS.map((label, value) => ({ label, value }));

const training = ref(null);
const occurrences = ref([]);
const coaches = ref([]);
const sparrings = ref([]);
const groups = ref([]);
const editForm = ref({ name: "", weekday: null, startTime: null, endTime: null, groupId: null });
const savingInfo = ref(false);
const generateForm = ref({ startDate: null, endDate: null });
const generating = ref(false);

const assignDialogVisible = ref(false);
const activeOccurrence = ref(null);
const occurrenceCoaches = ref([]);

function timeToString(date) {
  if (!date) return null;
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
function stringToTime(str) {
  if (!str) return null;
  const [h, m] = str.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
function toDateOnly(date) {
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function loadTraining() {
  const { data } = await api.get(`/trainings/${trainingId}`);
  training.value = data.training;
  editForm.value = {
    name: data.training.name,
    weekday: data.training.weekday ?? null,
    startTime: stringToTime(data.training.startTime),
    endTime: stringToTime(data.training.endTime),
    groupId: data.training.groupId,
  };
}

async function onSaveInfo() {
  savingInfo.value = true;
  try {
    await api.put(`/trainings/${trainingId}`, {
      ...editForm.value,
      startTime: timeToString(editForm.value.startTime),
      endTime: timeToString(editForm.value.endTime),
    });
    toast.add({ severity: "success", summary: "Entrainement mis à jour", life: 3000 });
    await loadTraining();
  } finally {
    savingInfo.value = false;
  }
}

async function loadOccurrences() {
  const { data } = await api.get(`/trainings/${trainingId}/occurrences`);
  occurrences.value = data.occurrences;
}

onMounted(async () => {
  await loadTraining();
  const [, c, s, g] = await Promise.all([
    loadOccurrences(),
    api.get("/coaches"),
    api.get("/sparrings"),
    api.get("/groups", { params: { seasonId: training.value.seasonId } }),
  ]);
  coaches.value = c.data.coaches;
  sparrings.value = s.data.sparrings;
  groups.value = g.data.groups;
});

async function onGenerate() {
  generating.value = true;
  try {
    const { data } = await api.post(`/trainings/${trainingId}/generate-occurrences`, {
      startDate: toDateOnly(generateForm.value.startDate),
      endDate: toDateOnly(generateForm.value.endDate),
    });
    toast.add({ severity: "success", summary: `${data.created} séance(s) créée(s)`, detail: `${data.skipped} déjà existante(s).`, life: 4000 });
    await loadOccurrences();
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    generating.value = false;
  }
}

async function openAssignDialog(occurrence) {
  activeOccurrence.value = occurrence;
  assignDialogVisible.value = true;
  const { data } = await api.get(`/occurrences/${occurrence.id}`);
  occurrenceCoaches.value = data.occurrence.coaches;
}

async function onAssign(payload) {
  const { data } = await api.post(`/occurrences/${activeOccurrence.value.id}/coaches`, payload);
  occurrenceCoaches.value.push(data.assignment);
}

async function onUnassign(assignmentId) {
  await api.delete(`/occurrences/${activeOccurrence.value.id}/coaches/${assignmentId}`);
  occurrenceCoaches.value = occurrenceCoaches.value.filter((a) => a.id !== assignmentId);
}

async function onAssignDefault(payload) {
  await api.post(`/trainings/${trainingId}/coaches`, payload);
  await loadTraining();
}

async function onUnassignDefault(assignmentId) {
  await api.delete(`/trainings/${trainingId}/coaches/${assignmentId}`);
  await loadTraining();
}


function onToggleCancel(occurrence) {
  const cancelling = occurrence.status !== "CANCELLED";
  const label = new Date(occurrence.date).toLocaleDateString("fr-FR");
  confirm.require({
    message: cancelling ? `Annuler la séance du ${label} ?` : `Rétablir la séance du ${label} ?`,
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: cancelling ? "Annuler la séance" : "Rétablir",
    acceptClass: cancelling ? "p-button-danger" : "",
    rejectLabel: "Retour",
    rejectClass: "p-button-secondary p-button-outlined",
    accept: async () => {
      try {
        await api.put(`/occurrences/${occurrence.id}`, { status: cancelling ? "CANCELLED" : "PLANNED" });
        toast.add({ severity: "success", summary: cancelling ? "Séance annulée" : "Séance rétablie", life: 3000 });
        await loadOccurrences();
      } catch (err) {
        toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 5000 });
      }
    },
  });
}

const calendarEvents = computed(() =>
  occurrences.value.map((o) => ({
    id: o.id,
    title: `${o.startTime}–${o.endTime}`,
    start: `${o.date.slice(0, 10)}T${o.startTime}`,
    end: `${o.date.slice(0, 10)}T${o.endTime}`,
    color: occurrenceState(o).color,
  }))
);

const calendarOptions = computed(() => ({
  plugins: CALENDAR_PLUGINS,
  initialView: "dayGridMonth",
  headerToolbar: { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek" },
  events: calendarEvents.value,
  height: "auto",
  locale: "fr",
  eventClick: (info) => {
    const occurrence = occurrences.value.find((o) => o.id === info.event.id);
    if (occurrence) openAssignDialog(occurrence);
  },
}));
</script>

<template>
  <AppLayout :title="training ? `Entrainement — ${training.name}` : 'Entrainement'" :nav-links="navLinks">
    <Button label="Retour" icon="pi pi-arrow-left" text class="mb-3 -ml-2" @click="router.push('/admin/trainings')" />

    <div v-if="training" class="space-y-4">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Informations</p>
        <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="onSaveInfo">
          <InputText v-model="editForm.name" placeholder="Nom" required class="w-full" />
          <Dropdown v-model="editForm.groupId" :options="groups" option-label="name" option-value="id" required class="w-full" />
          <Dropdown v-model="editForm.weekday" :options="weekdayOptions" option-label="label" option-value="value" placeholder="Jour de semaine…" class="sm:col-span-2 w-full" />
          <Calendar v-model="editForm.startTime" time-only hour-format="24" placeholder="Début" class="w-full" input-class="w-full" />
          <Calendar v-model="editForm.endTime" time-only hour-format="24" placeholder="Fin" class="w-full" input-class="w-full" />
          <Button type="submit" label="Enregistrer" :loading="savingInfo" class="sm:col-span-2 w-fit" />
        </form>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-1">Encadrants par défaut</p>
        <p class="text-xs text-slate-400 mb-3">Affectés automatiquement à chaque nouvelle séance générée. Modifiable ensuite au cas par cas sur une séance.</p>
        <CoachAssignmentList
          :assignments="training.coaches"
          :coaches="coaches"
          :sparrings="sparrings"
          empty-label="Aucun encadrant par défaut."
          @add="onAssignDefault"
          @remove="onUnassignDefault"
        />
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Générer les séances de la période</p>
        <form class="grid gap-3 sm:grid-cols-3 sm:items-end" @submit.prevent="onGenerate">
          <Calendar v-model="generateForm.startDate" date-format="dd/mm/yy" show-icon placeholder="Du" required class="w-full" input-class="w-full" />
          <Calendar v-model="generateForm.endDate" date-format="dd/mm/yy" show-icon placeholder="Au" required class="w-full" input-class="w-full" />
          <Button type="submit" label="Générer" :loading="generating" />
        </form>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Séances ({{ occurrences.length }})</p>
        <TabView lazy>
          <TabPanel header="Liste">
            <DataTable responsive-layout="stack" breakpoint="768px" :value="occurrences" paginator :rows="10" :rows-per-page-options="[10, 25, 50]" class="border border-slate-200 rounded-lg overflow-hidden">
              <template #empty>
                <p class="text-slate-400 text-sm py-4">Aucune séance générée.</p>
              </template>
              <Column header="Date">
                <template #body="{ data }">{{ new Date(data.date).toLocaleDateString("fr-FR") }}</template>
              </Column>
              <Column header="Horaire">
                <template #body="{ data }">{{ data.startTime }}–{{ data.endTime }}</template>
              </Column>
              <Column header="Statut">
                <template #body="{ data }"><Tag :severity="occurrenceState(data).severity" :value="occurrenceState(data).label" /></template>
              </Column>
              <Column header="" style="width: 20rem">
                <template #body="{ data }">
                  <div class="flex gap-1 justify-end">
                    <Button label="Encadrants" icon="pi pi-users" size="small" text @click="openAssignDialog(data)" />
                    <Button label="Présences" icon="pi pi-check-square" size="small" text :disabled="data.status === 'CANCELLED'" @click="router.push(`/coach/attendance/${data.id}`)" />
                    <Button
                      v-if="auth.isAdmin"
                      :label="data.status === 'CANCELLED' ? 'Rétablir' : 'Annuler'"
                      :icon="data.status === 'CANCELLED' ? 'pi pi-replay' : 'pi pi-ban'"
                      size="small"
                      text
                      :severity="data.status === 'CANCELLED' ? 'secondary' : 'danger'"
                      @click="onToggleCancel(data)"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </TabPanel>
          <TabPanel header="Calendrier">
            <FullCalendar :options="calendarOptions" />
          </TabPanel>
        </TabView>
      </div>
    </div>

    <Dialog v-model:visible="assignDialogVisible" header="Encadrants de la séance" modal style="width: 32rem" class="mx-4">
      <div v-if="activeOccurrence" class="pt-2">
        <p class="text-sm text-slate-500 mb-3">
          {{ new Date(activeOccurrence.date).toLocaleDateString("fr-FR") }} · {{ activeOccurrence.startTime }}–{{ activeOccurrence.endTime }}
        </p>
        <CoachAssignmentList :assignments="occurrenceCoaches" :coaches="coaches" :sparrings="sparrings" @add="onAssign" @remove="onUnassign" />
      </div>
    </Dialog>
  </AppLayout>
</template>
