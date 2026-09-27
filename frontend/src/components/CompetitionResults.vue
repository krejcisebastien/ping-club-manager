<script setup>
import { ref, computed, onMounted, watch } from "vue";
import Button from "primevue/button";
import Dropdown from "primevue/dropdown";
import Tag from "primevue/tag";
import Chart from "primevue/chart";
import { useToast } from "primevue/usetoast";
import { api } from "../lib/api.js";
import {
  summarize, byOpponentRanking, byStrength, evolutionGrid, rollingRate, groupByDay, opponentName, rateColor,
} from "../lib/competition.js";

// Résultats de compétition d'un joueur importés de TabT (AFTT) : bilan,
// évolution dans le temps par classement adverse et historique par journée.
// Utilisé dans l'espace joueur et dans la fiche joueur du staff.
const props = defineProps({
  playerId: { type: String, required: true },
  // Texte d'aide quand le n° de licence manque (le joueur ne peut pas le saisir).
  missingLicenceHint: { type: String, default: "Demande à un entraineur de renseigner ton n° de licence AFTT." },
});

const toast = useToast();
const data = ref(null);
const refreshing = ref(false);
const seasonFilter = ref(null);
const DAYS_STEP = 15;
const visibleDays = ref(DAYS_STEP);

async function load() {
  data.value = (await api.get(`/players/${props.playerId}/competition`)).data;
  if (!data.value.seasons.some((s) => s.season === seasonFilter.value)) seasonFilter.value = data.value.seasons[0]?.season ?? null;
}

async function refresh() {
  refreshing.value = true;
  try {
    const { summary } = (await api.post(`/players/${props.playerId}/competition/refresh`)).data;
    await load();
    toast.add({ severity: "success", summary: "Résultats actualisés", detail: `${summary.matches} match(s) importé(s).`, life: 3000 });
  } catch (err) {
    await load().catch(() => {});
    toast.add({ severity: "error", summary: "Actualisation impossible", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 5000 });
  } finally {
    refreshing.value = false;
  }
}

onMounted(load);
watch(() => props.playerId, load);
watch(seasonFilter, () => (visibleDays.value = DAYS_STEP));

const seasonNames = computed(() => new Map((data.value?.seasons ?? []).map((s) => [s.season, s.seasonName])));
const rankingBySeason = computed(() => new Map((data.value?.seasons ?? []).map((s) => [s.season, s.ranking])));
const seasonOptions = computed(() => [
  ...(data.value?.seasons ?? []).map((s) => ({ label: `Saison ${s.seasonName}`, value: s.season })),
  ...((data.value?.seasons?.length ?? 0) > 1 ? [{ label: "Toutes les saisons", value: "ALL" }] : []),
]);
const allSeasons = computed(() => seasonFilter.value === "ALL");
const selectedSeason = computed(() => (allSeasons.value ? null : data.value?.seasons.find((s) => s.season === seasonFilter.value) ?? null));
const current = computed(() => data.value?.seasons[0] ?? null);

const results = computed(() => (data.value?.results ?? []).filter((r) => allSeasons.value || r.season === seasonFilter.value));
const totals = computed(() => summarize(results.value));
const walkovers = computed(() => results.value.filter((r) => r.walkover).length);
const perRanking = computed(() => byOpponentRanking(results.value));
const strength = computed(() => byStrength(results.value, rankingBySeason.value));
const grid = computed(() => evolutionGrid(results.value, { seasonNames: seasonNames.value, singleSeason: !allSeasons.value }));
const days = computed(() => groupByDay(results.value));

const pct = (rate) => (rate == null ? "—" : `${Math.round(rate * 100)} %`);
const formatDate = (d) => new Date(d).toLocaleDateString("fr-FR");
const formatDateTime = (d) => new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

const STRENGTH_LABELS = [
  { key: "stronger", label: "Mieux classés" },
  { key: "equal", label: "Même classement" },
  { key: "weaker", label: "Moins bien classés" },
];

// Points du classement numérique : relevés de la saison du dernier relevé.
const latestPoints = computed(() => data.value?.points?.at(-1) ?? null);
const seasonPoints = computed(() => (data.value?.points ?? []).filter((p) => p.seasonName === latestPoints.value?.seasonName));
const pointsDelta = computed(() => {
  if (seasonPoints.value.length < 2) return null;
  const first = seasonPoints.value[0];
  return { value: latestPoints.value.points - first.points, since: first.date };
});
const formatPoints = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pointsChartData = computed(() => ({
  labels: seasonPoints.value.map((p) => formatDate(p.date)),
  datasets: [
    {
      label: "Points",
      data: seasonPoints.value.map((p) => p.points),
      borderColor: "#0284c7",
      backgroundColor: "#0284c7",
      tension: 0,
      pointRadius: seasonPoints.value.length > 40 ? 0 : 2,
      pointHitRadius: 8,
    },
  ],
}));
const pointsChartOptions = {
  maintainAspectRatio: false,
  scales: {
    x: { ticks: { maxTicksLimit: 6, maxRotation: 0 } },
    y: { ticks: { callback: (v) => Number(v).toLocaleString("fr-FR") } },
  },
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${formatPoints(c.parsed.y)} pts` } } },
};

const rolling = computed(() => rollingRate(results.value));
const chartData = computed(() => ({
  labels: rolling.value.map((p) => formatDate(p.date)),
  datasets: [
    {
      label: "Victoires sur les 10 derniers matchs",
      data: rolling.value.map((p) => Math.round(p.rate * 100)),
      borderColor: "#0284c7",
      backgroundColor: "rgba(2, 132, 199, 0.12)",
      fill: true,
      tension: 0.15,
      pointRadius: 0,
      pointHitRadius: 8,
    },
  ],
}));
const chartOptions = {
  maintainAspectRatio: false,
  scales: {
    y: { min: 0, max: 100, ticks: { stepSize: 25, callback: (v) => `${v} %` } },
    x: { ticks: { maxTicksLimit: 6, maxRotation: 0 } },
  },
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.parsed.y} % de victoires (10 derniers)` } } },
};
</script>

<template>
  <div v-if="data" class="space-y-4">
    <!-- Situation et actualisation -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div class="flex flex-wrap items-start gap-3">
        <div class="flex-1 min-w-[12rem]">
          <p class="text-sm font-medium text-slate-600">Résultats AFTT</p>
          <p v-if="current" class="text-sm text-slate-700 mt-1">
            Classement <strong>{{ current.ranking ?? "—" }}</strong>
            <template v-if="current.club"> · club {{ current.club }}</template>
            <span class="text-slate-400"> · licence {{ data.licenseNumber }}</span>
          </p>
          <p class="text-xs text-slate-400 mt-1">
            <template v-if="data.syncedAt">Mis à jour le {{ formatDateTime(data.syncedAt) }} (chaque nuit depuis TabT)</template>
            <template v-else-if="data.licenseNumber">Pas encore importés depuis TabT.</template>
          </p>
        </div>
        <Button
          v-if="data.licenseNumber"
          label="Actualiser"
          icon="pi pi-refresh"
          outlined
          size="small"
          :loading="refreshing"
          @click="refresh"
        />
      </div>
      <p v-if="!data.licenseNumber" class="text-sm text-slate-500 mt-3">Aucun n° de licence : {{ missingLicenceHint }}</p>
      <p v-else-if="data.syncError" class="text-sm text-red-600 mt-3">
        <i class="pi pi-exclamation-triangle mr-1"></i>Problème lors de la dernière synchronisation : {{ data.syncError }}
      </p>
    </div>

    <!-- Classement numérique (points relevés chaque jour sur data.aftt.be) -->
    <div v-if="latestPoints" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p class="text-sm font-medium text-slate-600">Classement numérique {{ latestPoints.seasonName }}</p>
        <p class="text-xs text-slate-400">Relevé du {{ formatDate(latestPoints.date) }} · source data.aftt.be</p>
      </div>
      <div class="flex flex-wrap items-baseline gap-x-6 gap-y-1 mt-2">
        <p class="text-3xl font-semibold text-slate-800 tabular-nums">{{ formatPoints(latestPoints.points) }} <span class="text-base font-normal text-slate-500">pts</span></p>
        <p v-if="latestPoints.rankingPosition" class="text-sm text-slate-600">{{ latestPoints.rankingPosition }}<sup>e</sup> au ranking mixte <span class="text-slate-400">(sans les inactifs)</span></p>
        <p v-if="pointsDelta" class="text-sm font-medium tabular-nums" :class="pointsDelta.value >= 0 ? 'text-green-700' : 'text-red-600'">
          {{ pointsDelta.value >= 0 ? "+" : "−" }}{{ formatPoints(Math.abs(pointsDelta.value)) }} pts depuis le {{ formatDate(pointsDelta.since) }}
        </p>
      </div>
      <div v-if="seasonPoints.length >= 2" class="h-44 mt-3">
        <Chart type="line" :data="pointsChartData" :options="pointsChartOptions" class="h-full" />
      </div>
      <p v-else class="text-xs text-slate-400 mt-2">
        Les points sont relevés chaque nuit : la courbe d'évolution se construira au fil des jours.
      </p>
    </div>

    <template v-if="data.seasons.length">
      <div class="flex flex-wrap items-center gap-3">
        <Dropdown v-model="seasonFilter" :options="seasonOptions" option-label="label" option-value="value" class="w-full sm:w-64" />
        <span v-if="selectedSeason?.ranking" class="text-sm text-slate-500">Classé {{ selectedSeason.ranking }} cette saison</span>
      </div>

      <p v-if="!results.length" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-sm text-slate-400">
        Aucun match pour cette saison.
      </p>

      <template v-else>
        <!-- Bilan -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p class="text-xs text-slate-500 mb-1">Matchs joués</p>
            <p class="text-2xl font-semibold text-slate-800 tabular-nums">{{ totals.played }}</p>
            <p v-if="walkovers" class="text-xs text-slate-400">+ {{ walkovers }} forfait(s) non compté(s)</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p class="text-xs text-slate-500 mb-1">Victoires</p>
            <p class="text-2xl font-semibold text-green-700 tabular-nums">{{ totals.wins }}</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p class="text-xs text-slate-500 mb-1">Défaites</p>
            <p class="text-2xl font-semibold text-red-600 tabular-nums">{{ totals.losses }}</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p class="text-xs text-slate-500 mb-1">Taux de victoire</p>
            <p class="text-2xl font-semibold text-slate-800 tabular-nums">{{ pct(totals.rate) }}</p>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <!-- Par classement adverse -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p class="text-sm font-medium text-slate-600 mb-3">Par classement adverse</p>
            <ul class="space-y-2">
              <li v-for="row in perRanking" :key="row.ranking" class="grid grid-cols-[2.5rem_1fr_9.25rem] items-center gap-3 text-sm">
                <span class="font-semibold text-slate-700">{{ row.ranking }}</span>
                <div class="h-2.5 rounded-full bg-red-100 overflow-hidden" :title="`${row.wins} V – ${row.losses} D`">
                  <div class="h-full bg-green-500" :style="{ width: `${row.rate * 100}%` }"></div>
                </div>
                <span class="tabular-nums text-slate-600 text-right whitespace-nowrap">
                  {{ row.wins }} V – {{ row.losses }} D <span class="text-slate-400">· {{ pct(row.rate) }}</span>
                </span>
              </li>
            </ul>
          </div>

          <!-- Selon l'écart de classement -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p class="text-sm font-medium text-slate-600 mb-1">Face à des adversaires…</p>
            <p class="text-xs text-slate-400 mb-3">Par rapport à son classement de la saison du match.</p>
            <ul class="divide-y divide-slate-100 text-sm">
              <li v-for="s in STRENGTH_LABELS" :key="s.key" class="py-2 flex items-center justify-between gap-2">
                <span class="text-slate-700">{{ s.label }}</span>
                <span class="tabular-nums text-slate-600">
                  {{ strength[s.key].wins }} V – {{ strength[s.key].losses }} D
                  <span class="inline-block w-12 text-right font-semibold" :style="{ color: rateColor(strength[s.key].rate).color }">{{ pct(strength[s.key].rate) }}</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Évolution dans le temps -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p class="text-sm font-medium text-slate-600">Évolution dans le temps</p>
          <p class="text-xs text-slate-400 mb-3">
            Victoires / matchs contre chaque classement,
            {{ allSeasons ? "saison par saison" : "mois par mois" }}.
            <span class="whitespace-nowrap"><span class="legend bg-red-100"></span>moins d'1 sur 3</span>
            <span class="whitespace-nowrap"><span class="legend bg-amber-100"></span>entre les deux</span>
            <span class="whitespace-nowrap"><span class="legend bg-green-100"></span>au moins 2 sur 3</span>
          </p>
          <div class="overflow-x-auto -mx-4 px-4">
            <table class="evolution text-sm tabular-nums">
              <thead>
                <tr>
                  <th class="sticky left-0 bg-white text-left">Adv.</th>
                  <th v-for="c in grid.columns" :key="c.key">{{ c.label }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in grid.rows" :key="row.ranking">
                  <th class="sticky left-0 bg-white text-left">{{ row.ranking }}</th>
                  <td v-for="(cell, i) in row.cells" :key="i">
                    <span v-if="cell" class="cell" :style="rateColor(cell.rate)" :title="`${cell.wins} victoire(s) sur ${cell.played}`">
                      {{ cell.wins }}/{{ cell.played }}
                    </span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th class="sticky left-0 bg-white text-left">Total</th>
                  <td v-for="(t, i) in grid.totals" :key="i" class="font-semibold text-slate-700">{{ pct(t.rate) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div v-if="rolling.length >= 5" class="mt-5">
            <p class="text-xs text-slate-500 mb-2">Taux de victoire sur les 10 derniers matchs</p>
            <div class="h-48">
              <Chart type="line" :data="chartData" :options="chartOptions" class="h-full" />
            </div>
          </div>
        </div>

        <!-- Historique -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p class="text-sm font-medium text-slate-600 mb-2">Historique des rencontres</p>
          <div class="divide-y divide-slate-100">
            <section v-for="day in days.slice(0, visibleDays)" :key="day.key" class="py-3">
              <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-1">
                <p class="text-sm font-medium text-slate-700">
                  {{ formatDate(day.date) }}
                  <span class="font-normal text-slate-500">
                    · {{ day.eventName ?? (day.competition === "TOURNAMENT" ? "Tournoi" : "Championnat") }}
                    <template v-if="day.competition === 'CHAMPIONSHIP' && day.clubs.length"> · {{ day.clubs.join(", ") }}</template>
                  </span>
                </p>
                <span class="text-xs text-slate-500 tabular-nums">{{ day.summary.wins }} V – {{ day.summary.losses }} D</span>
              </div>
              <ul class="text-sm">
                <li v-for="m in day.matches" :key="m.id" class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 py-1">
                  <span class="truncate text-slate-700">
                    {{ opponentName(m) }}
                    <span v-if="day.competition === 'TOURNAMENT' && m.opponentClub" class="text-xs text-slate-400">({{ m.opponentClub }})</span>
                  </span>
                  <span class="text-xs font-semibold text-slate-500 w-7 text-center">{{ m.opponentRanking }}</span>
                  <span class="tabular-nums text-slate-600 w-8 text-center">{{ m.setsFor }}-{{ m.setsAgainst }}</span>
                  <Tag
                    :severity="m.won ? 'success' : 'danger'"
                    :value="(m.won ? 'V' : 'D') + (m.walkover ? ' (WO)' : '')"
                    class="justify-self-end"
                  />
                </li>
              </ul>
            </section>
          </div>
          <Button
            v-if="days.length > visibleDays"
            :label="`Afficher plus (${days.length - visibleDays} journées restantes)`"
            text
            size="small"
            class="mt-2"
            @click="visibleDays += DAYS_STEP"
          />
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.evolution {
  border-collapse: separate;
  border-spacing: 4px 3px;
}
.evolution th {
  font-weight: 600;
  color: #475569;
  padding: 2px 6px;
  white-space: nowrap;
  font-size: 0.75rem;
}
.evolution td {
  text-align: center;
  padding: 0;
  min-width: 3.5rem;
}
.evolution .cell {
  display: block;
  border-radius: 6px;
  padding: 3px 6px;
  font-weight: 600;
}
.legend {
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 3px;
  margin: 0 0.25rem 0 0.5rem;
  vertical-align: -1px;
}
</style>
