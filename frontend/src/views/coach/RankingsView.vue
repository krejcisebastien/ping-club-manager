<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import InputText from "primevue/inputtext";
import AppLayout from "../../components/AppLayout.vue";
import RankingEstimate from "../../components/RankingEstimate.vue";
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
// Le ranking AFTT est calculé sur les points du 1er du mois : on l'indique
// d'après le dernier relevé.
const rankingMonth = computed(() => {
  const dates = players.value.map((p) => p.positionDate).filter(Boolean).map((d) => new Date(d));
  if (!dates.length) return null;
  const last = new Date(Math.max(...dates));
  return new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), 1));
});
const rankingMonthLabel = computed(() =>
  rankingMonth.value ? `Points au 1er ${rankingMonth.value.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" })}` : "Points du ranking"
);
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
        <strong class="font-medium text-slate-800">{{ rankingMonthLabel }}</strong> : points officiels AFTT, recalculés le 1er de chaque mois ; c'est sur eux que
        se calcule la place au ranking.
      </p>
      <p>
        <strong class="font-medium text-slate-800">Classement estimé</strong> : place du joueur au dernier relevé du classement numérique,
        reportée dans le tableau d'équivalence AFTT 2026-2027<template v-if="columnLabel"> ({{ columnLabel }})</template>.
        Estimation indicative : le classement officiel dépend du nombre d'actifs à la date d'octroi. La jauge situe le joueur dans sa
        tranche, du classement inférieur (à gauche) au classement supérieur (à droite), avec les places qui l'en séparent.
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
      <Column field="rankingPoints" :header="rankingMonthLabel" sortable>
        <template #body="{ data: p }"><span class="tabular-nums">{{ formatPoints(p.rankingPoints) }}</span></template>
      </Column>
      <Column header="Classement estimé" style="min-width: 14rem">
        <template #body="{ data: p }">
          <div v-if="p.estimate" class="space-y-3 py-0.5">
            <RankingEstimate :estimate="p.estimate" :position="p.rankingPosition" :start="p.startRanking" />
            <RankingEstimate v-if="p.ladiesEstimate" :estimate="p.ladiesEstimate" :position="p.ladiesRankingPosition" :start="p.startLadiesRanking" ladies />
          </div>
          <span v-else class="text-slate-400">—</span>
        </template>
      </Column>
    </DataTable>
  </AppLayout>
</template>

