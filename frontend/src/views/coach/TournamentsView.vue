<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Dropdown from "primevue/dropdown";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { opponentName } from "../../lib/competition.js";

// Tournois d'une saison (importés de TabT) et, pour chacun, les joueurs du
// club qui y ont participé : séries jouées, bilan et détail des matchs.
const navLinks = useNavLinks();
const router = useRouter();
const data = ref(null);
const season = ref(null);
const open = ref(new Set());

async function load() {
  const { data: d } = await api.get("/competitions/tournaments", { params: season.value ? { season: season.value } : {} });
  data.value = d;
  season.value = d.season;
  open.value = new Set();
}
onMounted(load);

const seasonOptions = computed(() => (data.value?.seasons ?? []).map((s) => ({ label: `Saison ${s.name}`, value: s.season })));
const totals = computed(() => {
  const list = data.value?.tournaments ?? [];
  const players = new Set(list.flatMap((t) => t.players.map((p) => p.player.id)));
  const wins = list.reduce((n, t) => n + t.wins, 0);
  const played = list.reduce((n, t) => n + t.played, 0);
  return { tournaments: list.length, players: players.size, wins, losses: played - wins };
});

const toggle = (key) => {
  const next = new Set(open.value);
  next.has(key) ? next.delete(key) : next.add(key);
  open.value = next;
};

const formatDate = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const formatRange = (t) => {
  const from = new Date(t.from).toDateString();
  return from === new Date(t.to).toDateString() ? formatDate(t.from) : `${formatDate(t.from)} au ${formatDate(t.to)}`;
};
const record = (b) => `${b.wins} V – ${b.losses} D${b.walkovers ? ` (+${b.walkovers} WO)` : ""}`;
</script>

<template>
  <AppLayout title="Tournois" :nav-links="navLinks">
    <div class="max-w-3xl space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p class="text-sm text-slate-500">Les tournois joués par les joueurs du club, d'après les résultats AFTT importés chaque nuit.</p>
        <Dropdown
          v-if="seasonOptions.length > 1"
          v-model="season"
          :options="seasonOptions"
          option-label="label"
          option-value="value"
          class="w-full sm:w-56"
          aria-label="Saison"
          @change="load"
        />
      </div>

      <p v-if="data && !data.tournaments.length" class="bg-white rounded-xl border border-slate-200 p-4 text-sm text-slate-400">
        Aucun tournoi importé. Les résultats arrivent de TabT pour les joueurs dont le n° de licence AFTT est renseigné.
      </p>

      <template v-else-if="data">
        <p class="text-sm text-slate-600">
          <strong>{{ totals.tournaments }}</strong> tournoi(s) · <strong>{{ totals.players }}</strong> joueur(s) · {{ totals.wins }} victoire(s), {{ totals.losses }} défaite(s)
        </p>

        <section v-for="t in data.tournaments" :key="t.name" class="bg-white rounded-xl shadow-sm border border-slate-200">
          <header class="p-4 border-b border-slate-100">
            <h2 class="font-medium text-slate-800">{{ t.name }}</h2>
            <p class="text-xs text-slate-500 mt-0.5">{{ formatRange(t) }} · {{ t.players.length }} joueur(s) · {{ record(t) }}</p>
          </header>
          <ul class="divide-y divide-slate-100">
            <li v-for="p in t.players" :key="p.player.id">
              <button
                type="button"
                class="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-start gap-3"
                :aria-expanded="open.has(`${t.name}|${p.player.id}`)"
                @click="toggle(`${t.name}|${p.player.id}`)"
              >
                <i class="pi text-xs text-slate-400 mt-1.5" :class="open.has(`${t.name}|${p.player.id}`) ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
                <span class="flex-1 min-w-0">
                  <span class="block font-medium text-slate-800">{{ p.player.firstName }} {{ p.player.lastName }}</span>
                  <span v-if="p.series.some((s) => s.name)" class="block text-xs text-slate-500">{{ p.series.map((s) => s.name).filter(Boolean).join(" · ") }}</span>
                </span>
                <span class="text-sm tabular-nums whitespace-nowrap" :class="p.wins >= p.losses ? 'text-green-700' : 'text-slate-600'">{{ record(p) }}</span>
              </button>
              <div v-if="open.has(`${t.name}|${p.player.id}`)" class="px-4 pb-3 pl-10 space-y-3">
                <div v-for="s in p.series" :key="s.name ?? ''">
                  <p v-if="s.name" class="text-xs font-medium text-slate-600">{{ s.name }} · {{ record(s) }}</p>
                  <ul class="mt-1 space-y-1">
                    <li v-for="m in s.matches" :key="m.id" class="flex items-baseline gap-2 text-sm">
                      <span class="w-5 text-center font-semibold" :class="m.walkover ? 'text-slate-400' : m.won ? 'text-green-700' : 'text-red-600'">{{ m.walkover ? "WO" : m.won ? "V" : "D" }}</span>
                      <span class="flex-1 min-w-0 text-slate-700">
                        {{ opponentName(m) }} <span class="text-slate-400">({{ m.opponentRanking }}<template v-if="m.opponentClub">, {{ m.opponentClub }}</template>)</span>
                      </span>
                      <span class="tabular-nums text-slate-600">{{ m.setsFor }}-{{ m.setsAgainst }}</span>
                    </li>
                  </ul>
                </div>
                <button type="button" class="text-xs text-sky-700 hover:underline" @click="router.push(`/admin/players/${p.player.id}`)">Voir la fiche du joueur</button>
              </div>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </AppLayout>
</template>
