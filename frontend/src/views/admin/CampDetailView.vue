<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const route = useRoute();
const router = useRouter();
const campId = route.params.id;

const camp = ref(null);
const editForm = ref({ name: "", location: "", startDate: "", endDate: "" });
const savingInfo = ref(false);
const newGroupName = ref("");
const newDayDate = ref("");
const expandedDayId = ref("");
const newPeriod = ref({ label: "", startTime: "", endTime: "" });
const assignGroupId = ref({}); // periodId -> campGroupId
const editingGroupId = ref("");
const editGroupName = ref("");
const editingPeriodId = ref("");
const editPeriodForm = ref({ label: "", startTime: "", endTime: "" });
const error = ref("");

async function loadCamp() {
  const { data } = await api.get(`/camps/${campId}`);
  camp.value = data.camp;
  editForm.value = {
    name: data.camp.name,
    location: data.camp.location ?? "",
    startDate: data.camp.startDate.slice(0, 10),
    endDate: data.camp.endDate.slice(0, 10),
  };
}

onMounted(loadCamp);

async function onSaveInfo() {
  savingInfo.value = true;
  try {
    await api.put(`/camps/${campId}`, editForm.value);
    await loadCamp();
  } finally {
    savingInfo.value = false;
  }
}

async function onAddGroup() {
  if (!newGroupName.value) return;
  await api.post(`/camps/${campId}/groups`, { name: newGroupName.value });
  newGroupName.value = "";
  await loadCamp();
}

async function onRemoveGroup(groupId) {
  await api.delete(`/camps/groups/${groupId}`);
  await loadCamp();
}

function onStartEditGroup(group) {
  editingGroupId.value = group.id;
  editGroupName.value = group.name;
}

async function onSaveGroupName(groupId) {
  await api.put(`/camps/groups/${groupId}`, { name: editGroupName.value });
  editingGroupId.value = "";
  await loadCamp();
}

async function onAddDay() {
  if (!newDayDate.value) return;
  await api.post(`/camps/${campId}/days`, { date: newDayDate.value });
  newDayDate.value = "";
  await loadCamp();
}

async function onRemoveDay(dayId) {
  await api.delete(`/camps/days/${dayId}`);
  await loadCamp();
}

function onToggleDay(dayId) {
  expandedDayId.value = expandedDayId.value === dayId ? "" : dayId;
  newPeriod.value = { label: "", startTime: "", endTime: "" };
}

async function onAddPeriod(dayId) {
  error.value = "";
  try {
    await api.post(`/camps/days/${dayId}/periods`, newPeriod.value);
    newPeriod.value = { label: "", startTime: "", endTime: "" };
    await loadCamp();
  } catch (err) {
    error.value = err.response?.data?.error ?? "Erreur lors de la création.";
  }
}

async function onRemovePeriod(periodId) {
  await api.delete(`/camps/periods/${periodId}`);
  await loadCamp();
}

function onStartEditPeriod(period) {
  editingPeriodId.value = period.id;
  editPeriodForm.value = { label: period.label, startTime: period.startTime, endTime: period.endTime };
}

async function onSavePeriod(periodId) {
  await api.put(`/camps/periods/${periodId}`, editPeriodForm.value);
  editingPeriodId.value = "";
  await loadCamp();
}

async function onAssignGroup(periodId) {
  const campGroupId = assignGroupId.value[periodId];
  if (!campGroupId) return;
  await api.post(`/camps/periods/${periodId}/groups`, { campGroupId });
  assignGroupId.value[periodId] = "";
  await loadCamp();
}

async function onRemovePeriodGroup(periodGroupId) {
  await api.delete(`/camps/period-groups/${periodGroupId}`);
  await loadCamp();
}
</script>

<template>
  <AppLayout :title="camp ? `Stage — ${camp.name}` : 'Stage'" :nav-links="navLinks">
    <div v-if="camp" class="space-y-4">
      <div class="bg-white rounded-xl shadow-sm p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Informations</p>
        <form class="grid gap-2 sm:grid-cols-2" @submit.prevent="onSaveInfo">
          <input v-model="editForm.name" placeholder="Nom" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
          <input v-model="editForm.location" placeholder="Lieu" class="rounded-lg border border-slate-300 px-2 py-1.5" />
          <input v-model="editForm.startDate" type="date" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
          <input v-model="editForm.endDate" type="date" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
          <button type="submit" :disabled="savingInfo" class="sm:col-span-2 rounded-lg bg-sky-600 text-white py-1.5 font-medium hover:bg-sky-700 disabled:opacity-60">
            Enregistrer
          </button>
        </form>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Groupes du stage (initiation, perfectionnement...)</p>
        <ul class="flex flex-wrap gap-2 mb-3">
          <li v-for="g in camp.groups" :key="g.id" class="flex items-center gap-1 bg-slate-100 rounded-full px-3 py-1 text-sm">
            <template v-if="editingGroupId === g.id">
              <input v-model="editGroupName" class="w-24 rounded border border-slate-300 px-1 py-0.5 text-xs" />
              <button class="text-emerald-600" @click="onSaveGroupName(g.id)">✓</button>
              <button class="text-slate-400" @click="editingGroupId = ''">✕</button>
            </template>
            <template v-else>
              {{ g.name }}
              <button class="text-sky-600 hover:underline text-xs" @click="onStartEditGroup(g)">✎</button>
              <button class="text-red-500 hover:underline" @click="onRemoveGroup(g.id)">×</button>
            </template>
          </li>
          <li v-if="!camp.groups.length" class="text-slate-400 text-sm">Aucun groupe défini.</li>
        </ul>
        <div class="flex gap-2">
          <input v-model="newGroupName" placeholder="Nom du groupe" class="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <button class="rounded-lg bg-sky-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-sky-700" @click="onAddGroup">
            Ajouter
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Journées</p>
        <ul class="divide-y divide-slate-100">
          <li v-for="day in camp.days" :key="day.id" class="py-2">
            <div class="flex items-center justify-between cursor-pointer" @click="onToggleDay(day.id)">
              <span>{{ new Date(day.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) }}</span>
              <button class="text-xs text-red-500 hover:underline" @click.stop="onRemoveDay(day.id)">supprimer</button>
            </div>

            <div v-if="expandedDayId === day.id" class="mt-2 pl-2 border-l-2 border-slate-100 space-y-3">
              <div v-for="period in day.periods" :key="period.id" class="bg-slate-50 rounded-lg p-3">
                <form v-if="editingPeriodId === period.id" class="grid gap-2 sm:grid-cols-4 sm:items-end mb-2" @submit.prevent="onSavePeriod(period.id)">
                  <input v-model="editPeriodForm.label" required class="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
                  <input v-model="editPeriodForm.startTime" type="time" required class="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
                  <input v-model="editPeriodForm.endTime" type="time" required class="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
                  <div class="flex gap-2">
                    <button type="submit" class="rounded-lg bg-sky-600 text-white px-2 py-1 text-sm font-medium hover:bg-sky-700">OK</button>
                    <button type="button" class="text-sm text-slate-500" @click="editingPeriodId = ''">annuler</button>
                  </div>
                </form>
                <div v-else class="flex items-center justify-between">
                  <span class="text-sm font-medium">{{ period.label }} · {{ period.startTime }}–{{ period.endTime }}</span>
                  <div class="flex items-center gap-2 text-xs">
                    <button class="text-sky-600 hover:underline" @click="onStartEditPeriod(period)">modifier</button>
                    <button class="text-red-500 hover:underline" @click="onRemovePeriod(period.id)">supprimer</button>
                  </div>
                </div>

                <ul class="mt-2 space-y-1">
                  <li v-for="pg in period.groups" :key="pg.id" class="flex items-center justify-between text-sm">
                    <RouterLink :to="`/admin/camp-period-groups/${pg.id}`" class="text-sky-600 hover:underline">
                      {{ pg.group.name }}
                    </RouterLink>
                    <button class="text-xs text-red-500 hover:underline" @click="onRemovePeriodGroup(pg.id)">retirer</button>
                  </li>
                  <li v-if="!period.groups.length" class="text-slate-400 text-sm">Aucun groupe affecté.</li>
                </ul>

                <div class="flex gap-2 mt-2">
                  <select v-model="assignGroupId[period.id]" class="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm">
                    <option value="" disabled>Affecter un groupe…</option>
                    <option v-for="g in camp.groups" :key="g.id" :value="g.id">{{ g.name }}</option>
                  </select>
                  <button class="rounded-lg bg-sky-600 text-white px-3 py-1 text-sm font-medium hover:bg-sky-700" @click="onAssignGroup(period.id)">
                    Affecter
                  </button>
                </div>
              </div>

              <form class="grid gap-2 sm:grid-cols-4 sm:items-end" @submit.prevent="onAddPeriod(day.id)">
                <input v-model="newPeriod.label" placeholder="Matinée, après-midi…" required class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                <input v-model="newPeriod.startTime" type="time" required class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                <input v-model="newPeriod.endTime" type="time" required class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                <button type="submit" class="rounded-lg bg-sky-600 text-white py-1.5 text-sm font-medium hover:bg-sky-700">
                  Ajouter la période
                </button>
              </form>
              <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
            </div>
          </li>
          <li v-if="!camp.days.length" class="py-2 text-slate-400 text-sm">Aucune journée ajoutée.</li>
        </ul>

        <div class="flex gap-2 mt-3">
          <input v-model="newDayDate" type="date" class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <button class="rounded-lg bg-sky-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-sky-700" @click="onAddDay">
            Ajouter une journée
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
