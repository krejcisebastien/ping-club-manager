<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Calendar from "primevue/calendar";
import Dropdown from "primevue/dropdown";
import Tag from "primevue/tag";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { toDateOnly } from "../../lib/date.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const playerId = route.params.id;

const traitOptions = [
  { label: "Point fort", value: "STRENGTH" },
  { label: "Défaut", value: "WEAKNESS" },
];
const statusOptions = [
  { label: "à faire", value: "OPEN" },
  { label: "en cours", value: "IN_PROGRESS" },
  { label: "acquis", value: "DONE" },
];

const player = ref(null);
const editForm = ref({ firstName: "", lastName: "", birthDate: null, licenseNumber: "" });
const savingInfo = ref(false);

const seasons = ref([]);
const rankings = ref([]);
const newRanking = ref({ seasonId: null, rankingValue: "" });

const equipment = ref([]);
const newEquipment = ref({ type: "", brand: "", model: "" });

const traits = ref([]);
const newTrait = ref({ category: "STRENGTH", description: "" });

const pointsToWork = ref([]);
const newPoint = ref({ description: "" });

const evolutionNotes = ref([]);
const newNote = ref({ note: "" });

async function loadAll() {
  const [p, s, r, eq, tr, pts, notes] = await Promise.all([
    api.get(`/players/${playerId}`),
    api.get("/seasons"),
    api.get(`/players/${playerId}/rankings`),
    api.get(`/players/${playerId}/equipment`),
    api.get(`/players/${playerId}/traits`),
    api.get(`/players/${playerId}/points-to-work`),
    api.get(`/players/${playerId}/evolution-notes`),
  ]);
  player.value = p.data.player;
  editForm.value = {
    firstName: p.data.player.firstName,
    lastName: p.data.player.lastName,
    birthDate: new Date(p.data.player.birthDate),
    licenseNumber: p.data.player.licenseNumber ?? "",
  };
  seasons.value = s.data.seasons;
  rankings.value = r.data.rankings;
  equipment.value = eq.data.equipment;
  traits.value = tr.data.traits;
  pointsToWork.value = pts.data.pointsToWork;
  evolutionNotes.value = notes.data.evolutionNotes;
}

onMounted(loadAll);

async function onSaveInfo() {
  savingInfo.value = true;
  try {
    await api.put(`/players/${playerId}`, {
      ...editForm.value,
      birthDate: toDateOnly(editForm.value.birthDate),
    });
    toast.add({ severity: "success", summary: "Fiche mise à jour", life: 3000 });
    await loadAll();
  } finally {
    savingInfo.value = false;
  }
}

async function onAddRanking() {
  if (!newRanking.value.seasonId || !newRanking.value.rankingValue) return;
  await api.post(`/players/${playerId}/rankings`, newRanking.value);
  newRanking.value = { seasonId: null, rankingValue: "" };
  await loadAll();
}

async function onAddEquipment() {
  if (!newEquipment.value.type) return;
  await api.post(`/players/${playerId}/equipment`, newEquipment.value);
  newEquipment.value = { type: "", brand: "", model: "" };
  await loadAll();
}

async function onCloseEquipment(equipmentId) {
  await api.put(`/players/${playerId}/equipment/${equipmentId}/close`);
  await loadAll();
}

async function onAddTrait() {
  if (!newTrait.value.description) return;
  await api.post(`/players/${playerId}/traits`, newTrait.value);
  newTrait.value = { category: "STRENGTH", description: "" };
  await loadAll();
}

async function onAddPoint() {
  if (!newPoint.value.description) return;
  await api.post(`/players/${playerId}/points-to-work`, newPoint.value);
  newPoint.value = { description: "" };
  await loadAll();
}

async function onUpdatePointStatus(point, status) {
  await api.put(`/players/${playerId}/points-to-work/${point.id}`, { status });
  await loadAll();
}

async function onAddNote() {
  if (!newNote.value.note) return;
  await api.post(`/players/${playerId}/evolution-notes`, newNote.value);
  newNote.value = { note: "" };
  await loadAll();
}

function pointStatusSeverity(status) {
  return { OPEN: "secondary", IN_PROGRESS: "warn", DONE: "success" }[status];
}
</script>

<template>
  <AppLayout :title="player ? `${player.firstName} ${player.lastName}` : 'Joueur'" :nav-links="navLinks">
    <Button label="Retour" icon="pi pi-arrow-left" text class="mb-3 -ml-2" @click="router.push('/admin/players')" />

    <div v-if="player" class="space-y-4">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Signalétique</p>
        <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="onSaveInfo">
          <div>
            <label class="text-xs text-slate-500 block mb-1">Prénom</label>
            <InputText v-model="editForm.firstName" required class="w-full" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Nom</label>
            <InputText v-model="editForm.lastName" required class="w-full" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Date de naissance</label>
            <Calendar v-model="editForm.birthDate" date-format="dd/mm/yy" show-icon required class="w-full" input-class="w-full" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">N° de licence</label>
            <InputText v-model="editForm.licenseNumber" class="w-full" />
          </div>
          <Button type="submit" label="Enregistrer" :loading="savingInfo" class="sm:col-span-2 w-fit" />
        </form>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Classement</p>
        <ul class="divide-y divide-slate-100 mb-3 text-sm">
          <li v-for="r in rankings" :key="r.id" class="py-1.5 flex items-center justify-between">
            <span class="font-medium">{{ r.rankingValue }}</span>
            <span class="text-xs text-slate-400">{{ new Date(r.effectiveDate).toLocaleDateString("fr-FR") }}</span>
          </li>
          <li v-if="!rankings.length" class="py-1.5 text-slate-400 text-sm">Aucun classement enregistré.</li>
        </ul>
        <div class="flex flex-wrap gap-2">
          <Dropdown v-model="newRanking.seasonId" :options="seasons" option-label="name" option-value="id" placeholder="Saison…" class="w-40" />
          <InputText v-model="newRanking.rankingValue" placeholder="Classement (ex. 1500)" class="flex-1 min-w-[10rem]" />
          <Button label="Ajouter" @click="onAddRanking" />
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Matériel</p>
        <ul class="divide-y divide-slate-100 mb-3 text-sm">
          <li v-for="e in equipment" :key="e.id" class="py-1.5 flex items-center justify-between">
            <span>{{ e.type }} <span class="text-slate-400">{{ e.brand }} {{ e.model }}</span></span>
            <Button v-if="!e.effectiveTo" label="clôturer" text size="small" severity="danger" @click="onCloseEquipment(e.id)" />
            <Tag v-else severity="secondary" value="terminé" />
          </li>
          <li v-if="!equipment.length" class="py-1.5 text-slate-400 text-sm">Aucun matériel enregistré.</li>
        </ul>
        <div class="flex flex-wrap gap-2">
          <InputText v-model="newEquipment.type" placeholder="Type (raquette, revêtement...)" class="flex-1 min-w-[10rem]" />
          <InputText v-model="newEquipment.brand" placeholder="Marque" class="w-28" />
          <InputText v-model="newEquipment.model" placeholder="Modèle" class="w-28" />
          <Button label="Ajouter" @click="onAddEquipment" />
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Points forts / défauts</p>
        <ul class="divide-y divide-slate-100 mb-3 text-sm">
          <li v-for="t in traits" :key="t.id" class="py-1.5 flex items-center gap-2">
            <Tag :severity="t.category === 'STRENGTH' ? 'success' : 'danger'" :value="t.category === 'STRENGTH' ? '+' : '−'" />
            {{ t.description }}
          </li>
          <li v-if="!traits.length" class="py-1.5 text-slate-400 text-sm">Aucun point renseigné.</li>
        </ul>
        <div class="flex flex-wrap gap-2">
          <Dropdown v-model="newTrait.category" :options="traitOptions" option-label="label" option-value="value" class="w-40" />
          <InputText v-model="newTrait.description" placeholder="Description" class="flex-1 min-w-[10rem]" />
          <Button label="Ajouter" @click="onAddTrait" />
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Points à travailler</p>
        <ul class="divide-y divide-slate-100 mb-3 text-sm">
          <li v-for="pt in pointsToWork" :key="pt.id" class="py-1.5 flex items-center justify-between gap-2">
            <span>{{ pt.description }}</span>
            <Dropdown
              :model-value="pt.status"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              class="w-36"
              @update:model-value="onUpdatePointStatus(pt, $event)"
            >
              <template #value="{ value }"><Tag :severity="pointStatusSeverity(value)" :value="statusOptions.find((o) => o.value === value)?.label" /></template>
            </Dropdown>
          </li>
          <li v-if="!pointsToWork.length" class="py-1.5 text-slate-400 text-sm">Aucun point enregistré.</li>
        </ul>
        <div class="flex flex-wrap gap-2">
          <InputText v-model="newPoint.description" placeholder="Nouveau point à travailler" class="flex-1 min-w-[10rem]" />
          <Button label="Ajouter" @click="onAddPoint" />
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Notes d'évolution</p>
        <ul class="divide-y divide-slate-100 mb-3 text-sm">
          <li v-for="n in evolutionNotes" :key="n.id" class="py-1.5">
            <span class="text-xs text-slate-400">{{ new Date(n.date).toLocaleDateString("fr-FR") }}</span>
            — {{ n.note }}
          </li>
          <li v-if="!evolutionNotes.length" class="py-1.5 text-slate-400 text-sm">Aucune note.</li>
        </ul>
        <div class="flex flex-wrap gap-2">
          <InputText v-model="newNote.note" placeholder="Nouvelle note" class="flex-1 min-w-[10rem]" />
          <Button label="Ajouter" @click="onAddNote" />
        </div>
      </div>
    </div>
  </AppLayout>
</template>
