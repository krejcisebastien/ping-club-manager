<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Calendar from "primevue/calendar";
import Dropdown from "primevue/dropdown";
import Tag from "primevue/tag";
import Rating from "primevue/rating";
import Chart from "primevue/chart";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import ImageUpload from "../../components/ImageUpload.vue";
import { api } from "../../lib/api.js";
import { toDateOnly } from "../../lib/date.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { fullName } from "../../lib/name.js";

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
const dominantHandOptions = [
  { label: "Droitier", value: "RIGHT" },
  { label: "Gaucher", value: "LEFT" },
];
const EVALUATION_CRITERIA = [
  { key: "service", label: "Service", color: "#0ea5e9" },
  { key: "remise", label: "Remise", color: "#8b5cf6" },
  { key: "coupDroit", label: "Coup droit", color: "#f97316" },
  { key: "revers", label: "Revers", color: "#22c55e" },
  { key: "deplacements", label: "Déplacements", color: "#ef4444" },
  { key: "tactique", label: "Tactique", color: "#eab308" },
  { key: "mental", label: "Mental", color: "#14b8a6" },
  { key: "physique", label: "Physique", color: "#6366f1" },
];
const emptyEvaluation = () => ({
  service: 5,
  remise: 5,
  coupDroit: 5,
  revers: 5,
  deplacements: 5,
  tactique: 5,
  mental: 5,
  physique: 5,
  note: "",
});

const player = ref(null);
const editForm = ref({
  firstName: "",
  lastName: "",
  birthDate: null,
  licenseNumber: "",
  phone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  photoUrl: null,
  playStyle: "",
  dominantHand: null,
});
const savingInfo = ref(false);

const seasons = ref([]);
const rankings = ref([]);
const newRanking = ref({ seasonId: null, rankingValue: "" });

const statsSeasonId = ref(null);
const stats = ref(null);
async function loadStats() {
  if (!statsSeasonId.value) {
    stats.value = null;
    return;
  }
  stats.value = (await api.get(`/players/${playerId}/stats`, { params: { seasonId: statsSeasonId.value } })).data.stats;
}
function formatRate(rate) {
  return rate == null ? "—" : `${Math.round(rate * 100)}%`;
}

const evaluations = ref([]);
const newEvaluation = ref(emptyEvaluation());
const savingEvaluation = ref(false);

const latestEvaluation = computed(() => evaluations.value[0] ?? null);

const radarChartData = computed(() => {
  if (!latestEvaluation.value) return null;
  return {
    labels: EVALUATION_CRITERIA.map((c) => c.label),
    datasets: [
      {
        label: new Date(latestEvaluation.value.date).toLocaleDateString("fr-FR"),
        data: EVALUATION_CRITERIA.map((c) => latestEvaluation.value[c.key]),
        backgroundColor: "rgba(14, 165, 233, 0.2)",
        borderColor: "#0ea5e9",
        pointBackgroundColor: "#0ea5e9",
      },
    ],
  };
});
const radarChartOptions = {
  maintainAspectRatio: false,
  scales: { r: { min: 0, max: 10, ticks: { stepSize: 2 } } },
  plugins: { legend: { display: false } },
};

const evolutionChartData = computed(() => {
  if (evaluations.value.length < 2) return null;
  const chronological = [...evaluations.value].reverse();
  return {
    labels: chronological.map((e) => new Date(e.date).toLocaleDateString("fr-FR")),
    datasets: EVALUATION_CRITERIA.map((c) => ({
      label: c.label,
      data: chronological.map((e) => e[c.key]),
      borderColor: c.color,
      backgroundColor: c.color,
      tension: 0.3,
    })),
  };
});
const evolutionChartOptions = {
  maintainAspectRatio: false,
  scales: { y: { min: 0, max: 10, ticks: { stepSize: 2 } } },
  plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } },
};

const equipment = ref([]);
const newEquipment = ref({ type: "", brand: "", model: "" });

const traits = ref([]);
const newTrait = ref({ category: "STRENGTH", description: "" });

const pointsToWork = ref([]);
const newPoint = ref({ description: "" });

const evolutionNotes = ref([]);
const newNote = ref({ note: "" });

async function loadAll() {
  const [p, s, r, ev, eq, tr, pts, notes] = await Promise.all([
    api.get(`/players/${playerId}`),
    api.get("/seasons"),
    api.get(`/players/${playerId}/rankings`),
    api.get(`/players/${playerId}/evaluations`),
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
    phone: p.data.player.phone ?? "",
    emergencyContactName: p.data.player.emergencyContactName ?? "",
    emergencyContactPhone: p.data.player.emergencyContactPhone ?? "",
    photoUrl: p.data.player.photoUrl ?? null,
    playStyle: p.data.player.playStyle ?? "",
    dominantHand: p.data.player.dominantHand ?? null,
  };
  seasons.value = s.data.seasons;
  rankings.value = r.data.rankings;
  evaluations.value = ev.data.evaluations;
  equipment.value = eq.data.equipment;
  traits.value = tr.data.traits;
  pointsToWork.value = pts.data.pointsToWork;
  evolutionNotes.value = notes.data.evolutionNotes;

  if (!statsSeasonId.value) {
    statsSeasonId.value = (seasons.value.find((season) => season.isActive) ?? seasons.value[0])?.id ?? null;
  }
  await loadStats();
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

async function onAddEvaluation() {
  savingEvaluation.value = true;
  try {
    const payload = { ...newEvaluation.value };
    for (const c of EVALUATION_CRITERIA) payload[c.key] ??= 0;
    await api.post(`/players/${playerId}/evaluations`, payload);
    newEvaluation.value = emptyEvaluation();
    toast.add({ severity: "success", summary: "Évaluation enregistrée", life: 3000 });
    await loadAll();
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    savingEvaluation.value = false;
  }
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
  <AppLayout :title="player ? fullName(player) : 'Joueur'" :nav-links="navLinks">
    <Button label="Retour" icon="pi pi-arrow-left" text class="mb-3 -ml-2" @click="router.push('/admin/players')" />

    <div v-if="player" class="space-y-4">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Signalétique</p>
        <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="onSaveInfo">
          <div class="sm:col-span-2">
            <label class="text-xs text-slate-500 block mb-1">Photo</label>
            <ImageUpload v-model="editForm.photoUrl" :max-size-mb="1" />
          </div>
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
          <div>
            <label class="text-xs text-slate-500 block mb-1">Téléphone du joueur</label>
            <InputText v-model="editForm.phone" class="w-full" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Main dominante</label>
            <Dropdown
              v-model="editForm.dominantHand"
              :options="dominantHandOptions"
              option-label="label"
              option-value="value"
              show-clear
              placeholder="Non renseigné"
              class="w-full"
            />
          </div>
          <div class="sm:col-span-2">
            <label class="text-xs text-slate-500 block mb-1">Style de jeu</label>
            <InputText v-model="editForm.playStyle" placeholder="ex. offensif, pivot appuyé..." class="w-full" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Contact d'urgence — nom</label>
            <InputText v-model="editForm.emergencyContactName" class="w-full" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Contact d'urgence — téléphone</label>
            <InputText v-model="editForm.emergencyContactPhone" class="w-full" />
          </div>
          <Button type="submit" label="Enregistrer" :loading="savingInfo" class="sm:col-span-2 w-fit" />
        </form>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <p class="text-sm font-medium text-slate-600">Statistiques</p>
          <Dropdown
            v-model="statsSeasonId"
            :options="seasons"
            option-label="name"
            option-value="id"
            placeholder="Saison…"
            class="w-48"
            @change="loadStats"
          />
        </div>
        <div v-if="stats" class="grid grid-cols-2 gap-3">
          <div>
            <p class="text-xs text-slate-500 mb-1">Présence entrainements</p>
            <p class="text-2xl font-semibold text-slate-800">{{ formatRate(stats.training.attendanceRate) }}</p>
            <p class="text-xs text-slate-400">{{ stats.training.hours }} h cumulées</p>
            <p class="text-xs text-slate-400">
              {{ stats.training.counts.PRESENT }} présent(s) · {{ stats.training.counts.ABSENT }} absent(s) · {{ stats.training.counts.LATE }}
              retard(s) · {{ stats.training.counts.EXCUSED }} excusé(s)
            </p>
          </div>
          <div>
            <p class="text-xs text-slate-500 mb-1">Présence stages</p>
            <p class="text-2xl font-semibold text-slate-800">{{ formatRate(stats.camp.attendanceRate) }}</p>
            <p class="text-xs text-slate-400">{{ stats.camp.hours }} h cumulées</p>
            <p class="text-xs text-slate-400">
              {{ stats.camp.counts.PRESENT }} présent(s) · {{ stats.camp.counts.ABSENT }} absent(s) · {{ stats.camp.counts.LATE }} retard(s) ·
              {{ stats.camp.counts.EXCUSED }} excusé(s)
            </p>
          </div>
        </div>
        <p v-else class="text-slate-400 text-sm">Aucune saison disponible.</p>
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
        <p class="text-sm font-medium text-slate-600 mb-3">Évaluation sportive</p>

        <div v-if="latestEvaluation" class="grid gap-4 sm:grid-cols-2 mb-4">
          <div>
            <p class="text-xs text-slate-400 mb-1">
              Radar — dernière évaluation ({{ new Date(latestEvaluation.date).toLocaleDateString("fr-FR") }})
            </p>
            <div style="height: 260px">
              <Chart type="radar" :data="radarChartData" :options="radarChartOptions" class="h-full" />
            </div>
          </div>
          <div v-if="evolutionChartData">
            <p class="text-xs text-slate-400 mb-1">Évolution</p>
            <div style="height: 260px">
              <Chart type="line" :data="evolutionChartData" :options="evolutionChartOptions" class="h-full" />
            </div>
          </div>
          <div v-else class="flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
            Une 2<sup>e</sup> évaluation fera apparaître la courbe d'évolution.
          </div>
        </div>
        <p v-else class="text-slate-400 text-sm mb-4">Aucune évaluation enregistrée.</p>

        <ul v-if="evaluations.length" class="divide-y divide-slate-100 mb-3 text-sm">
          <li v-for="e in evaluations" :key="e.id" class="py-1.5 flex items-center justify-between gap-2">
            <span>
              {{ new Date(e.date).toLocaleDateString("fr-FR") }}
              <span v-if="e.note" class="text-slate-400">— {{ e.note }}</span>
            </span>
            <Tag
              severity="info"
              :value="`moy. ${(EVALUATION_CRITERIA.reduce((sum, c) => sum + e[c.key], 0) / EVALUATION_CRITERIA.length).toFixed(1)}/10`"
            />
          </li>
        </ul>

        <form class="grid gap-3" @submit.prevent="onAddEvaluation">
          <div class="grid gap-2">
            <div v-for="c in EVALUATION_CRITERIA" :key="c.key" class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <label class="text-sm text-slate-600 w-28 shrink-0">{{ c.label }}</label>
              <Rating v-model="newEvaluation[c.key]" :stars="10" cancel class="eval-rating">
                <template #onicon><span class="ball ball-on" aria-hidden="true">🏓</span></template>
                <template #officon><span class="ball ball-off" aria-hidden="true">🏓</span></template>
              </Rating>
              <span class="text-sm font-semibold tabular-nums w-10 text-right" :style="{ color: c.color }">{{ newEvaluation[c.key] ?? 0 }}<span class="text-xs font-normal text-slate-400">/10</span></span>
            </div>
          </div>
          <InputText v-model="newEvaluation.note" placeholder="Commentaire (optionnel)" class="w-full" />
          <Button type="submit" label="Enregistrer l'évaluation" :loading="savingEvaluation" class="w-fit" />
        </form>
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
