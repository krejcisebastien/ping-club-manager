<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import InputText from "primevue/inputtext";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { fullName } from "../../lib/name.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { useTableFilter } from "../../composables/useTableFilter.js";

// Points et classements estimés des joueurs du club : classement et points de
// début de saison, +/- des matchs, points actuels et classement que donnerait
// aujourd'hui le tableau d'équivalence AFTT (calcul côté serveur).
const navLinks = useNavLinks();
const router = useRouter();
const { filters } = useTableFilter();
const data = ref(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const { data: d } = await api.get("/competitions/rankings");
    data.value = { ...d, players: d.players.map((p) => ({ ...p, name: fullName(p) })) };
  } finally {
    loading.value = false;
  }
});

const players = computed(() => data.value?.players ?? []);
const withEstimate = computed(() => players.value.filter((p) => p.estimate).length);
const columnLabel = computed(() => {
  const s = data.value?.stats;
  if (!s) return null;
  return `${s.activePlayers.toLocaleString("fr-FR")} joueurs actifs hors NC${s.activeLadies ? ` et ${s.activeLadies.toLocaleString("fr-FR")} joueuses` : ""} au ${formatDate(s.date)}`;
});

const formatDate = (d) => new Date(d).toLocaleDateString("fr-FR");
const formatPoints = (v) => (v == null ? "—" : v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const formatDelta = (v) => (v == null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : "±"}${formatPoints(Math.abs(v))}`);
const deltaClass = (v) => (v > 0 ? "text-green-700" : v < 0 ? "text-red-600" : "text-slate-500");
const places = (n) => `${n.toLocaleString("fr-FR")} place${n > 1 ? "s" : ""}`;
// Évolution par rapport au classement de début de saison.
const trend = (from, to) => {
  if (!from || !to || from === to) return "same";
  const order = ["A", "B0", "B2", "B4", "B6", "C0", "C2", "C4", "C6", "D0", "D2", "D4", "D6", "E0", "E2", "E4", "E6", "NC"];
  const a = order.indexOf(from.startsWith("A") ? "A" : from);
  const b = order.indexOf(to);
  if (a < 0 || b < 0) return "same";
  return b < a ? "up" : "down";
};
const badgeClass = (t) =>
  t === "up" ? "bg-green-50 text-green-700 ring-green-200" : t === "down" ? "bg-red-50 text-red-700 ring-red-200" : "bg-slate-50 text-slate-700 ring-slate-200";
</script>

<template>
  <AppLayout title="Classements" :nav-links="navLinks">
    <div class="mb-5">
      <h2 class="page-title">Points et classements</h2>
      <p class="page-subtitle">
        <template v-if="data?.season">Saison {{ data.season.seasonName }} · </template>{{ players.length }} joueur(s) avec un n° de licence
      </p>
    </div>

    <div class="card p-4 mb-4 text-sm text-slate-600 space-y-1">
      <p>
        <strong class="font-medium text-slate-800">Points actuels</strong> = points de début de saison + bonus de début de saison éventuel + somme des points gagnés ou perdus
        en match (données AFTT importées chaque nuit).
      </p>
      <p>
        <strong class="font-medium text-slate-800">Classement estimé</strong> : place du joueur au dernier relevé du classement numérique,
        reportée dans le tableau d'équivalence AFTT 2026-2027<template v-if="columnLabel"> ({{ columnLabel }})</template>.
        Estimation indicative : le classement officiel dépend du nombre d'actifs à la date d'octroi.
      </p>
      <p v-if="data && !data.stats" class="text-amber-700">
        <i class="pi pi-info-circle mr-1"></i>Nombre de joueurs actifs pas encore relevé : les classements estimés apparaîtront après la prochaine synchronisation.
      </p>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
      <div class="relative sm:w-72">
        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
        <InputText v-model="filters.global.value" placeholder="Rechercher…" class="w-full pl-9" />
      </div>
      <p v-if="data?.stats" class="text-xs text-slate-500 sm:ml-auto">{{ withEstimate }} classement(s) estimé(s) sur {{ players.length }}</p>
    </div>

    <DataTable
      responsive-layout="stack"
      breakpoint="768px"
      :value="players"
      :loading="loading"
      v-model:filters="filters"
      :global-filter-fields="['name']"
      class="card overflow-hidden clickable-rows"
      striped-rows
      sort-field="currentPoints"
      :sort-order="-1"
      @row-click="router.push(`/admin/players/${$event.data.id}`)"
    >
      <template #empty>
        <p class="text-slate-400 text-sm py-4">
          {{ filters.global.value ? "Aucun résultat." : "Aucun joueur avec un n° de licence AFTT." }}
        </p>
      </template>
      <Column field="name" header="Joueur" sortable>
        <template #body="{ data: p }">
          <span class="font-medium text-slate-800">{{ p.name }}</span>
        </template>
      </Column>
      <Column field="startRanking" header="Classement début" sortable>
        <template #body="{ data: p }">
          <span>{{ p.startRanking ?? "—" }}<span v-if="p.startLadiesRanking" class="text-slate-500"> · {{ p.startLadiesRanking }} dames</span></span>
        </template>
      </Column>
      <Column field="basePoints" header="Points début" sortable>
        <template #body="{ data: p }">
          <span class="tabular-nums">{{ formatPoints(p.basePoints) }}</span>
          <span v-if="p.bonusPoints" class="block text-xs text-green-700 tabular-nums">bonus +{{ formatPoints(p.bonusPoints) }}</span>
        </template>
      </Column>
      <Column field="delta" header="Différentiel" sortable>
        <template #body="{ data: p }">
          <span class="tabular-nums font-medium" :class="p.delta != null ? deltaClass(p.delta) : 'text-slate-400'">{{ formatDelta(p.delta) }}</span>
          <span v-if="p.matchesWithoutDelta" class="block text-xs text-slate-400">{{ p.matchesWithoutDelta }} match(s) sans +/- connu</span>
        </template>
      </Column>
      <Column field="currentPoints" header="Points actuels" sortable>
        <template #body="{ data: p }"><span class="tabular-nums font-semibold text-slate-800">{{ formatPoints(p.currentPoints) }}</span></template>
      </Column>
      <Column header="Classement estimé" style="min-width: 15rem">
        <template #body="{ data: p }">
          <div v-if="p.estimate" class="space-y-1.5">
            <div>
              <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1" :class="badgeClass(trend(p.startRanking, p.estimate.ranking))">
                {{ p.estimate.ranking }}
              </span>
              <span class="text-xs text-slate-500 ml-1.5">{{ p.rankingPosition.toLocaleString("fr-FR") }}<sup>e</sup></span>
              <p class="text-xs text-slate-500 mt-0.5">
                <template v-if="p.estimate.upper">à {{ places(p.estimate.placesToUpper) }} de {{ p.estimate.upper }}</template>
                <template v-if="p.estimate.upper && p.estimate.lower"> · </template>
                <template v-if="p.estimate.lower">à {{ places(p.estimate.placesToLower) }} de {{ p.estimate.lower }}</template>
              </p>
            </div>
            <div v-if="p.ladiesEstimate">
              <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1" :class="badgeClass(trend(p.startLadiesRanking, p.ladiesEstimate.ranking))">
                {{ p.ladiesEstimate.ranking }} dames
              </span>
              <span class="text-xs text-slate-500 ml-1.5">{{ p.ladiesRankingPosition.toLocaleString("fr-FR") }}<sup>e</sup> dame</span>
              <p class="text-xs text-slate-500 mt-0.5">
                <template v-if="p.ladiesEstimate.upper">à {{ places(p.ladiesEstimate.placesToUpper) }} de {{ p.ladiesEstimate.upper }}</template>
                <template v-if="p.ladiesEstimate.upper && p.ladiesEstimate.lower"> · </template>
                <template v-if="p.ladiesEstimate.lower">à {{ places(p.ladiesEstimate.placesToLower) }} de {{ p.ladiesEstimate.lower }}</template>
              </p>
            </div>
          </div>
          <span v-else class="text-slate-400">—</span>
        </template>
      </Column>
    </DataTable>
  </AppLayout>
</template>
