<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Tag from "primevue/tag";
import Avatar from "primevue/avatar";
import Chart from "primevue/chart";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useAuthStore } from "../../stores/auth.js";
import { ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_SEVERITY } from "../../lib/attendance.js";
import { fullName, initials } from "../../lib/name.js";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();

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
const POINT_STATUS = {
  OPEN: { label: "à faire", severity: "warn" },
  IN_PROGRESS: { label: "en cours", severity: "info" },
  DONE: { label: "acquis", severity: "success" },
};

const player = ref(null);
const evaluations = ref([]);
const rankings = ref([]);
const equipment = ref([]);
const traits = ref([]);
const pointsToWork = ref([]);
const evolutionNotes = ref([]);
const attendances = ref([]);
const campAttendances = ref([]);
const stats = ref(null);

async function load() {
  const playerId = route.params.id;
  const get = (path) => api.get(`/players/${playerId}${path}`);
  const [p, ev, rk, eq, tr, pts, notes, att, campAtt, seasons] = await Promise.all([
    get(""),
    get("/evaluations"),
    get("/rankings"),
    get("/equipment"),
    get("/traits"),
    get("/points-to-work"),
    get("/evolution-notes"),
    get("/attendance"),
    get("/camp-attendance"),
    api.get("/seasons"),
  ]);
  player.value = p.data.player;
  evaluations.value = ev.data.evaluations;
  rankings.value = rk.data.rankings;
  equipment.value = eq.data.equipment;
  traits.value = tr.data.traits;
  pointsToWork.value = pts.data.pointsToWork;
  evolutionNotes.value = notes.data.evolutionNotes;
  attendances.value = att.data.attendances;
  campAttendances.value = campAtt.data.attendances;

  const activeSeason = seasons.data.seasons.find((s) => s.isActive);
  stats.value = activeSeason ? (await get(`/stats?seasonId=${activeSeason.id}`)).data.stats : null;
}

onMounted(load);
watch(() => route.params.id, load);

const formatDate = (d) => new Date(d).toLocaleDateString("fr-FR");
const formatRate = (rate) => (rate == null ? "—" : `${Math.round(rate * 100)}%`);
const average = (e) => EVALUATION_CRITERIA.reduce((sum, c) => sum + e[c.key], 0) / EVALUATION_CRITERIA.length;

const age = computed(() => {
  if (!player.value?.birthDate) return null;
  const b = new Date(player.value.birthDate);
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) years -= 1;
  return years;
});
const currentRanking = computed(() => rankings.value[0]?.rankingValue ?? null);
const currentEquipment = computed(() => equipment.value.filter((e) => !e.effectiveTo));
const strengths = computed(() => traits.value.filter((t) => t.category === "STRENGTH" && !t.effectiveTo));
const weaknesses = computed(() => traits.value.filter((t) => t.category === "WEAKNESS" && !t.effectiveTo));
const openPoints = computed(() => pointsToWork.value.filter((p) => p.status !== "DONE"));

// ---------- Rapport d'évaluation ----------

const latest = computed(() => evaluations.value[0] ?? null);
const previous = computed(() => evaluations.value[1] ?? null);
const delta = (key) => (latest.value && previous.value ? latest.value[key] - previous.value[key] : null);
const latestAverage = computed(() => (latest.value ? average(latest.value) : null));
const strongestCriteria = computed(() => (latest.value ? [...EVALUATION_CRITERIA].sort((a, b) => latest.value[b.key] - latest.value[a.key])[0] : null));
const weakestCriteria = computed(() => (latest.value ? [...EVALUATION_CRITERIA].sort((a, b) => latest.value[a.key] - latest.value[b.key])[0] : null));

const radarData = computed(() => {
  if (!latest.value) return null;
  const datasets = [
    {
      label: formatDate(latest.value.date),
      data: EVALUATION_CRITERIA.map((c) => latest.value[c.key]),
      backgroundColor: "rgba(14, 165, 233, 0.2)",
      borderColor: "#0ea5e9",
      pointBackgroundColor: "#0ea5e9",
    },
  ];
  if (previous.value) {
    datasets.unshift({
      label: formatDate(previous.value.date),
      data: EVALUATION_CRITERIA.map((c) => previous.value[c.key]),
      backgroundColor: "rgba(148, 163, 184, 0.12)",
      borderColor: "#94a3b8",
      borderDash: [4, 4],
      pointRadius: 0,
    });
  }
  return { labels: EVALUATION_CRITERIA.map((c) => c.label), datasets };
});
const radarOptions = {
  maintainAspectRatio: false,
  scales: { r: { min: 0, max: 10, ticks: { stepSize: 2 } } },
  plugins: { legend: { display: false } },
};

const evolutionData = computed(() => {
  if (evaluations.value.length < 2) return null;
  const chronological = [...evaluations.value].reverse();
  return {
    labels: chronological.map((e) => formatDate(e.date)),
    datasets: EVALUATION_CRITERIA.map((c) => ({
      label: c.label,
      data: chronological.map((e) => e[c.key]),
      borderColor: c.color,
      backgroundColor: c.color,
      tension: 0.3,
    })),
  };
});
const evolutionOptions = {
  maintainAspectRatio: false,
  scales: { y: { min: 0, max: 10, ticks: { stepSize: 2 } } },
  plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } },
};

// ---------- Édition de mes informations ----------

const editVisible = ref(false);
const editForm = ref({});
const saving = ref(false);

function openEdit() {
  const p = player.value;
  editForm.value = {
    firstName: p.firstName,
    lastName: p.lastName,
    phone: p.phone ?? "",
    emergencyContactName: p.emergencyContactName ?? "",
    emergencyContactPhone: p.emergencyContactPhone ?? "",
  };
  editVisible.value = true;
}

async function onSaveProfile() {
  saving.value = true;
  try {
    const { data } = await api.put(`/players/${player.value.id}/profile`, editForm.value);
    player.value = data.player;
    editVisible.value = false;
    toast.add({ severity: "success", summary: "Informations mises à jour", life: 3000 });
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AppLayout title="Mon espace joueur">
    <button
      v-if="auth.user.playerIds.length > 1"
      class="text-sm text-sky-600 hover:underline mb-3"
      @click="router.push('/player')"
    >
      ← changer de joueur
    </button>

    <div v-if="player" class="space-y-4">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4 flex-wrap">
        <img v-if="player.photoUrl" :src="player.photoUrl" alt="" class="w-16 h-16 rounded-full object-cover shrink-0" />
        <Avatar v-else :label="initials(player)" shape="circle" size="xlarge" class="shrink-0 bg-sky-100 text-sky-700" />
        <div class="min-w-0">
          <p class="text-xl font-semibold text-slate-800">{{ fullName(player) }}</p>
          <div class="flex flex-wrap gap-2 mt-1">
            <Tag v-if="age != null" severity="secondary" :value="`${age} ans`" />
            <Tag v-if="currentRanking" severity="info" :value="`Classement ${currentRanking}`" />
            <Tag v-if="player.dominantHand" severity="secondary" :value="player.dominantHand === 'LEFT' ? 'Gaucher' : 'Droitier'" />
            <Tag v-if="player.playStyle" severity="secondary" :value="player.playStyle" />
          </div>
        </div>
        <Button label="Modifier mes infos" icon="pi pi-pencil" outlined size="small" class="ml-auto" @click="openEdit" />
      </div>

      <TabView>
        <TabPanel header="Aperçu">
          <div class="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-4">
            <div class="rounded-xl border border-slate-200 p-4">
              <p class="text-xs text-slate-500 mb-1">Niveau global</p>
              <p class="text-2xl font-semibold text-slate-800">{{ latestAverage != null ? latestAverage.toFixed(1) : "—" }}<span class="text-sm font-normal text-slate-400">/10</span></p>
              <p class="text-xs text-slate-400">{{ latest ? `évalué le ${formatDate(latest.date)}` : "pas encore évalué" }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 p-4">
              <p class="text-xs text-slate-500 mb-1">Présence entrainements</p>
              <p class="text-2xl font-semibold text-slate-800">{{ formatRate(stats?.training.attendanceRate) }}</p>
              <p class="text-xs text-slate-400">{{ stats?.training.hours ?? 0 }} h cette saison</p>
            </div>
            <div class="rounded-xl border border-slate-200 p-4">
              <p class="text-xs text-slate-500 mb-1">Présence stages</p>
              <p class="text-2xl font-semibold text-slate-800">{{ formatRate(stats?.camp.attendanceRate) }}</p>
              <p class="text-xs text-slate-400">{{ stats?.camp.hours ?? 0 }} h cette saison</p>
            </div>
            <div class="rounded-xl border border-slate-200 p-4">
              <p class="text-xs text-slate-500 mb-1">À travailler</p>
              <p class="text-2xl font-semibold text-slate-800">{{ openPoints.length }}</p>
              <p class="text-xs text-slate-400">point(s) en cours</p>
            </div>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <div v-if="latest" class="rounded-xl border border-slate-200 p-4">
              <p class="text-sm font-medium text-slate-600 mb-2">Mon profil de jeu</p>
              <div class="h-64"><Chart type="radar" :data="radarData" :options="radarOptions" class="h-full" /></div>
              <p class="text-xs text-slate-500 mt-2">
                Point fort : <strong>{{ strongestCriteria.label }}</strong> ({{ latest[strongestCriteria.key] }}/10) ·
                à progresser : <strong>{{ weakestCriteria.label }}</strong> ({{ latest[weakestCriteria.key] }}/10)
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 p-4">
              <p class="text-sm font-medium text-slate-600 mb-2">Ce que dit mon entraineur</p>
              <p v-if="latest?.note" class="text-sm text-slate-700 italic mb-3">« {{ latest.note }} »</p>
              <ul class="divide-y divide-slate-100 text-sm">
                <li v-for="n in evolutionNotes.slice(0, 3)" :key="n.id" class="py-2">
                  <span class="text-xs text-slate-400">{{ formatDate(n.date) }}</span> — {{ n.note }}
                </li>
                <li v-if="!evolutionNotes.length && !latest?.note" class="py-2 text-slate-400">Aucune remarque pour l'instant.</li>
              </ul>
            </div>
          </div>
        </TabPanel>

        <TabPanel header="Évaluation">
          <div v-if="latest">
            <div class="flex items-baseline justify-between mb-3 flex-wrap gap-2">
              <p class="text-sm text-slate-500">Dernier rapport du {{ formatDate(latest.date) }}</p>
              <Tag severity="info" :value="`moyenne ${latestAverage.toFixed(1)}/10`" />
            </div>
            <p v-if="latest.note" class="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 mb-4">« {{ latest.note }} »</p>

            <ul class="grid gap-3 sm:grid-cols-2 mb-6">
              <li v-for="c in EVALUATION_CRITERIA" :key="c.key">
                <div class="flex items-baseline justify-between text-sm mb-1">
                  <span class="text-slate-600">{{ c.label }}</span>
                  <span class="tabular-nums">
                    <strong :style="{ color: c.color }">{{ latest[c.key] }}</strong><span class="text-xs text-slate-400">/10</span>
                    <span v-if="delta(c.key)" class="ml-2 text-xs" :class="delta(c.key) > 0 ? 'text-green-600' : 'text-red-500'">
                      {{ delta(c.key) > 0 ? "▲" : "▼" }} {{ Math.abs(delta(c.key)) }}
                    </span>
                  </span>
                </div>
                <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div class="h-full rounded-full" :style="{ width: `${latest[c.key] * 10}%`, backgroundColor: c.color }"></div>
                </div>
              </li>
            </ul>

            <div class="grid gap-4 lg:grid-cols-2">
              <div>
                <p class="text-sm font-medium text-slate-600 mb-2">Profil{{ previous ? " (pointillés : évaluation précédente)" : "" }}</p>
                <div class="h-72"><Chart type="radar" :data="radarData" :options="radarOptions" class="h-full" /></div>
              </div>
              <div>
                <p class="text-sm font-medium text-slate-600 mb-2">Évolution</p>
                <div v-if="evolutionData" class="h-72"><Chart type="line" :data="evolutionData" :options="evolutionOptions" class="h-full" /></div>
                <p v-else class="text-sm text-slate-400">La courbe apparaîtra dès la 2<sup>e</sup> évaluation.</p>
              </div>
            </div>

            <p class="text-sm font-medium text-slate-600 mt-6 mb-2">Historique</p>
            <ul class="divide-y divide-slate-100 text-sm">
              <li v-for="e in evaluations" :key="e.id" class="py-2 flex items-center justify-between gap-2">
                <span>{{ formatDate(e.date) }}<span v-if="e.note" class="text-slate-400"> — {{ e.note }}</span></span>
                <Tag severity="info" :value="`${average(e).toFixed(1)}/10`" />
              </li>
            </ul>
          </div>
          <p v-else class="text-sm text-slate-400">Aucune évaluation enregistrée pour l'instant.</p>
        </TabPanel>

        <TabPanel header="Suivi">
          <div class="grid gap-4 lg:grid-cols-2">
            <div class="rounded-xl border border-slate-200 p-4">
              <p class="text-sm font-medium text-slate-600 mb-2">Points à travailler</p>
              <ul class="divide-y divide-slate-100 text-sm">
                <li v-for="pt in pointsToWork" :key="pt.id" class="py-2 flex items-center justify-between gap-2">
                  <span>{{ pt.description }}</span>
                  <Tag :severity="POINT_STATUS[pt.status].severity" :value="POINT_STATUS[pt.status].label" />
                </li>
                <li v-if="!pointsToWork.length" class="py-2 text-slate-400">Aucun point enregistré.</li>
              </ul>
            </div>
            <div class="rounded-xl border border-slate-200 p-4">
              <p class="text-sm font-medium text-slate-600 mb-2">Points forts et défauts</p>
              <ul class="text-sm space-y-1">
                <li v-for="t in strengths" :key="t.id" class="flex items-center gap-2"><Tag severity="success" value="+" />{{ t.description }}</li>
                <li v-for="t in weaknesses" :key="t.id" class="flex items-center gap-2"><Tag severity="danger" value="−" />{{ t.description }}</li>
                <li v-if="!strengths.length && !weaknesses.length" class="text-slate-400">Aucun point renseigné.</li>
              </ul>
            </div>
            <div class="rounded-xl border border-slate-200 p-4">
              <p class="text-sm font-medium text-slate-600 mb-2">Notes d'évolution</p>
              <ul class="divide-y divide-slate-100 text-sm">
                <li v-for="n in evolutionNotes" :key="n.id" class="py-2">
                  <span class="text-xs text-slate-400">{{ formatDate(n.date) }}</span> — {{ n.note }}
                </li>
                <li v-if="!evolutionNotes.length" class="py-2 text-slate-400">Aucune note.</li>
              </ul>
            </div>
            <div class="rounded-xl border border-slate-200 p-4">
              <p class="text-sm font-medium text-slate-600 mb-2">Classement et matériel</p>
              <ul class="divide-y divide-slate-100 text-sm mb-3">
                <li v-for="r in rankings" :key="r.id" class="py-1.5 flex items-center justify-between">
                  <strong>{{ r.rankingValue }}</strong><span class="text-xs text-slate-400">{{ formatDate(r.effectiveDate) }}</span>
                </li>
                <li v-if="!rankings.length" class="py-1.5 text-slate-400">Aucun classement enregistré.</li>
              </ul>
              <ul class="text-sm space-y-1">
                <li v-for="e in currentEquipment" :key="e.id">{{ e.type }} <span class="text-slate-400">{{ e.brand }} {{ e.model }}</span></li>
                <li v-if="!currentEquipment.length" class="text-slate-400">Aucun matériel enregistré.</li>
              </ul>
            </div>
          </div>
        </TabPanel>

        <TabPanel header="Présences">
          <div class="grid gap-4 lg:grid-cols-2">
            <div>
              <p class="text-sm font-medium text-slate-600 mb-2">Entrainements</p>
              <ul class="divide-y divide-slate-100 text-sm">
                <li v-for="a in attendances" :key="a.id" class="py-2 flex items-center justify-between gap-2">
                  <span>{{ formatDate(a.occurrence.date) }} — {{ a.occurrence.training.name }}</span>
                  <Tag :severity="ATTENDANCE_STATUS_SEVERITY[a.status]" :value="ATTENDANCE_STATUS_LABELS[a.status]" />
                </li>
                <li v-if="!attendances.length" class="py-2 text-slate-400">Aucune présence enregistrée.</li>
              </ul>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-600 mb-2">Stages</p>
              <ul class="divide-y divide-slate-100 text-sm">
                <li v-for="a in campAttendances" :key="a.id" class="py-2 flex items-center justify-between gap-2">
                  <span>
                    {{ formatDate(a.campPeriodGroup.period.campDay.date) }} — {{ a.campPeriodGroup.period.campDay.camp.name }}
                    ({{ a.campPeriodGroup.period.label }} · {{ a.campPeriodGroup.group.name }})
                  </span>
                  <Tag :severity="ATTENDANCE_STATUS_SEVERITY[a.status]" :value="ATTENDANCE_STATUS_LABELS[a.status]" />
                </li>
                <li v-if="!campAttendances.length" class="py-2 text-slate-400">Aucune présence enregistrée.</li>
              </ul>
            </div>
          </div>
        </TabPanel>
      </TabView>
    </div>

    <Dialog v-model:visible="editVisible" modal header="Mes informations" :style="{ width: '28rem', maxWidth: '95vw' }">
      <form class="grid gap-3" @submit.prevent="onSaveProfile">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-500 block mb-1">Nom</label>
            <InputText v-model="editForm.lastName" required class="w-full" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Prénom</label>
            <InputText v-model="editForm.firstName" required class="w-full" />
          </div>
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Téléphone</label>
          <InputText v-model="editForm.phone" type="tel" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-500 block mb-1">Contact d'urgence</label>
            <InputText v-model="editForm.emergencyContactName" placeholder="Nom" class="w-full" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">N° d'urgence</label>
            <InputText v-model="editForm.emergencyContactPhone" type="tel" class="w-full" />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" text severity="secondary" @click="editVisible = false" />
          <Button type="submit" label="Enregistrer" :loading="saving" />
        </div>
      </form>
    </Dialog>
  </AppLayout>
</template>
