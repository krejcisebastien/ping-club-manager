<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";
import Calendar from "primevue/calendar";
import Dialog from "primevue/dialog";
import Tag from "primevue/tag";
import Accordion from "primevue/accordion";
import AccordionTab from "primevue/accordiontab";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import FullCalendar from "@fullcalendar/vue3";
import { useToast } from "primevue/usetoast";
import { CALENDAR_PLUGINS_DAY_ONLY } from "../../lib/calendar.js";
import { useConfirm } from "primevue/useconfirm";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { toDateOnly } from "../../lib/date.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();
const campId = route.params.id;

const camp = ref(null);
const editForm = ref({ name: "", location: "", startDate: null, endDate: null });
const savingInfo = ref(false);

const groupDialogVisible = ref(false);
const groupForm = ref({ id: null, name: "" });

const dayDialogVisible = ref(false);
const newDayDate = ref(null);

const periodDialogVisible = ref(false);
const periodForm = ref({ id: null, dayId: null, label: "", startTime: null, endTime: null });
const assignGroupId = ref({});

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

async function loadCamp() {
  const { data } = await api.get(`/camps/${campId}`);
  camp.value = data.camp;
  editForm.value = {
    name: data.camp.name,
    location: data.camp.location ?? "",
    startDate: new Date(data.camp.startDate),
    endDate: new Date(data.camp.endDate),
  };
}

onMounted(loadCamp);

async function onSaveInfo() {
  savingInfo.value = true;
  try {
    await api.put(`/camps/${campId}`, {
      ...editForm.value,
      startDate: toDateOnly(editForm.value.startDate),
      endDate: toDateOnly(editForm.value.endDate),
    });
    toast.add({ severity: "success", summary: "Stage mis à jour", life: 3000 });
    await loadCamp();
  } finally {
    savingInfo.value = false;
  }
}

function openCreateGroup() {
  groupForm.value = { id: null, name: "" };
  groupDialogVisible.value = true;
}
function openEditGroup(group) {
  groupForm.value = { id: group.id, name: group.name };
  groupDialogVisible.value = true;
}
async function onSaveGroup() {
  if (groupForm.value.id) {
    await api.put(`/camps/groups/${groupForm.value.id}`, { name: groupForm.value.name });
  } else {
    await api.post(`/camps/${campId}/groups`, { name: groupForm.value.name });
  }
  groupDialogVisible.value = false;
  toast.add({ severity: "success", summary: "Groupe enregistré", life: 3000 });
  await loadCamp();
}
function confirmRemoveGroup(group) {
  confirm.require({
    message: `Supprimer le groupe "${group.name}" ?`,
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Supprimer",
    acceptClass: "p-button-danger",
    rejectLabel: "Annuler",
    accept: async () => {
      await api.delete(`/camps/groups/${group.id}`);
      toast.add({ severity: "success", summary: "Groupe supprimé", life: 3000 });
      await loadCamp();
    },
  });
}

function openAddDay() {
  newDayDate.value = null;
  dayDialogVisible.value = true;
}
async function onAddDay() {
  if (!newDayDate.value) return;
  await api.post(`/camps/${campId}/days`, { date: toDateOnly(newDayDate.value) });
  dayDialogVisible.value = false;
  toast.add({ severity: "success", summary: "Journée ajoutée", life: 3000 });
  await loadCamp();
}
function confirmRemoveDay(day) {
  confirm.require({
    message: "Supprimer cette journée et toutes ses périodes ?",
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Supprimer",
    acceptClass: "p-button-danger",
    rejectLabel: "Annuler",
    accept: async () => {
      await api.delete(`/camps/days/${day.id}`);
      toast.add({ severity: "success", summary: "Journée supprimée", life: 3000 });
      await loadCamp();
    },
  });
}

function openCreatePeriod(dayId) {
  periodForm.value = { id: null, dayId, label: "", startTime: null, endTime: null };
  periodDialogVisible.value = true;
}
function openEditPeriod(period) {
  periodForm.value = { id: period.id, dayId: null, label: period.label, startTime: stringToTime(period.startTime), endTime: stringToTime(period.endTime) };
  periodDialogVisible.value = true;
}
async function onSavePeriod() {
  const payload = {
    label: periodForm.value.label,
    startTime: timeToString(periodForm.value.startTime),
    endTime: timeToString(periodForm.value.endTime),
  };
  try {
    if (periodForm.value.id) {
      await api.put(`/camps/periods/${periodForm.value.id}`, payload);
    } else {
      await api.post(`/camps/days/${periodForm.value.dayId}/periods`, payload);
    }
    periodDialogVisible.value = false;
    toast.add({ severity: "success", summary: "Période enregistrée", life: 3000 });
    await loadCamp();
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  }
}
function confirmRemovePeriod(period) {
  confirm.require({
    message: `Supprimer la période "${period.label}" ?`,
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Supprimer",
    acceptClass: "p-button-danger",
    rejectLabel: "Annuler",
    accept: async () => {
      await api.delete(`/camps/periods/${period.id}`);
      toast.add({ severity: "success", summary: "Période supprimée", life: 3000 });
      await loadCamp();
    },
  });
}

async function onAssignGroup(periodId) {
  const campGroupId = assignGroupId.value[periodId];
  if (!campGroupId) return;
  await api.post(`/camps/periods/${periodId}/groups`, { campGroupId });
  assignGroupId.value[periodId] = null;
  await loadCamp();
}
async function onRemovePeriodGroup(periodGroupId) {
  await api.delete(`/camps/period-groups/${periodGroupId}`);
  await loadCamp();
}

const calendarEvents = computed(() =>
  (camp.value?.days ?? []).map((d) => ({
    id: d.id,
    title: d.periods.length ? `${d.periods.length} période(s)` : "Journée",
    start: d.date.slice(0, 10),
    allDay: true,
    color: "#0284c7",
  }))
);
const calendarOptions = computed(() => ({
  plugins: CALENDAR_PLUGINS_DAY_ONLY,
  initialView: "dayGridMonth",
  headerToolbar: { left: "prev,next today", center: "title", right: "" },
  events: calendarEvents.value,
  height: "auto",
  locale: "fr",
}));
</script>

<template>
  <AppLayout :title="camp ? `Stage — ${camp.name}` : 'Stage'" :nav-links="navLinks">
    <Button label="Retour" icon="pi pi-arrow-left" text class="mb-3 -ml-2" @click="router.push('/admin/camps')" />

    <div v-if="camp" class="space-y-4">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Informations</p>
        <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="onSaveInfo">
          <InputText v-model="editForm.name" placeholder="Nom" required class="w-full" />
          <InputText v-model="editForm.location" placeholder="Lieu" class="w-full" />
          <Calendar v-model="editForm.startDate" date-format="dd/mm/yy" show-icon required class="w-full" input-class="w-full" />
          <Calendar v-model="editForm.endDate" date-format="dd/mm/yy" show-icon required class="w-full" input-class="w-full" />
          <Button type="submit" label="Enregistrer" :loading="savingInfo" class="sm:col-span-2 w-fit" />
        </form>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-medium text-slate-600">Groupes du stage (initiation, perfectionnement…)</p>
          <Button label="Ajouter" icon="pi pi-plus" size="small" @click="openCreateGroup" />
        </div>
        <div class="flex flex-wrap gap-2">
          <div v-for="g in camp.groups" :key="g.id" class="flex items-center gap-1 bg-slate-100 rounded-full pl-3 pr-1 py-1 text-sm">
            {{ g.name }}
            <Button icon="pi pi-pencil" text rounded size="small" class="!w-6 !h-6" @click="openEditGroup(g)" />
            <Button icon="pi pi-times" severity="danger" text rounded size="small" class="!w-6 !h-6" @click="confirmRemoveGroup(g)" />
          </div>
          <p v-if="!camp.groups.length" class="text-slate-400 text-sm">Aucun groupe défini.</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-medium text-slate-600">Journées ({{ camp.days.length }})</p>
          <Button label="Ajouter une journée" icon="pi pi-plus" size="small" @click="openAddDay" />
        </div>

        <TabView lazy>
          <TabPanel header="Liste">
            <Accordion multiple>
              <AccordionTab v-for="day in camp.days" :key="day.id">
                <template #header>
                  <div class="flex items-center justify-between w-full pr-2">
                    <span>{{ new Date(day.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) }}</span>
                    <Button icon="pi pi-times" severity="danger" text rounded size="small" @click.stop="confirmRemoveDay(day)" />
                  </div>
                </template>

                <div class="space-y-3">
                  <div v-for="period in day.periods" :key="period.id" class="bg-slate-50 rounded-lg p-3">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium">{{ period.label }} · {{ period.startTime }}–{{ period.endTime }}</span>
                      <div class="flex gap-1">
                        <Button icon="pi pi-pencil" text rounded size="small" @click="openEditPeriod(period)" />
                        <Button icon="pi pi-times" severity="danger" text rounded size="small" @click="confirmRemovePeriod(period)" />
                      </div>
                    </div>

                    <ul class="mt-2 flex flex-wrap gap-2">
                      <li v-for="pg in period.groups" :key="pg.id">
                        <Tag severity="info" class="cursor-pointer" @click="router.push(`/admin/camp-period-groups/${pg.id}`)">
                          {{ pg.group.name }}
                          <i class="pi pi-times text-xs ml-1" @click.stop="onRemovePeriodGroup(pg.id)"></i>
                        </Tag>
                      </li>
                      <li v-if="!period.groups.length" class="text-slate-400 text-sm">Aucun groupe affecté.</li>
                    </ul>

                    <div class="flex gap-2 mt-2">
                      <Dropdown v-model="assignGroupId[period.id]" :options="camp.groups" option-label="name" option-value="id" placeholder="Affecter un groupe…" class="flex-1" />
                      <Button label="Affecter" size="small" @click="onAssignGroup(period.id)" />
                    </div>
                  </div>

                  <Button label="Ajouter une période" icon="pi pi-plus" size="small" outlined @click="openCreatePeriod(day.id)" />
                </div>
              </AccordionTab>
            </Accordion>
            <p v-if="!camp.days.length" class="text-slate-400 text-sm py-2">Aucune journée ajoutée.</p>
          </TabPanel>
          <TabPanel header="Calendrier">
            <FullCalendar :options="calendarOptions" />
          </TabPanel>
        </TabView>
      </div>
    </div>

    <Dialog v-model:visible="groupDialogVisible" :header="groupForm.id ? 'Modifier le groupe' : 'Nouveau groupe'" modal style="width: 24rem" class="mx-4">
      <form class="grid gap-3" @submit.prevent="onSaveGroup">
        <InputText v-model="groupForm.name" placeholder="Nom du groupe" required class="w-full" />
        <div class="flex justify-end gap-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="groupDialogVisible = false" />
          <Button type="submit" label="Enregistrer" />
        </div>
      </form>
    </Dialog>

    <Dialog v-model:visible="dayDialogVisible" header="Nouvelle journée" modal style="width: 24rem" class="mx-4">
      <form class="grid gap-3" @submit.prevent="onAddDay">
        <Calendar v-model="newDayDate" date-format="dd/mm/yy" show-icon required class="w-full" input-class="w-full" />
        <div class="flex justify-end gap-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="dayDialogVisible = false" />
          <Button type="submit" label="Ajouter" />
        </div>
      </form>
    </Dialog>

    <Dialog v-model:visible="periodDialogVisible" :header="periodForm.id ? 'Modifier la période' : 'Nouvelle période'" modal style="width: 26rem" class="mx-4">
      <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="onSavePeriod">
        <InputText v-model="periodForm.label" placeholder="Matinée, après-midi…" required class="sm:col-span-2 w-full" />
        <Calendar v-model="periodForm.startTime" time-only hour-format="24" placeholder="Début" class="w-full" input-class="w-full" />
        <Calendar v-model="periodForm.endTime" time-only hour-format="24" placeholder="Fin" class="w-full" input-class="w-full" />
        <div class="sm:col-span-2 flex justify-end gap-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="periodDialogVisible = false" />
          <Button type="submit" label="Enregistrer" />
        </div>
      </form>
    </Dialog>
  </AppLayout>
</template>
