<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { api } from "../lib/api.js";
import { groupByTournament, formatTournamentDay, venueLabel } from "../lib/tournaments.js";

// Tournois de la saison où le joueur est inscrit (à venir, puis déjà joués
// avec son bilan), lus chaque nuit dans TabT.
// Utilisé dans l'espace joueur et dans la fiche joueur du staff.
const props = defineProps({
  playerId: { type: String, required: true },
  asPlayer: { type: Boolean, default: false },
});

const registrations = ref(null);
const syncing = ref(false);
let timer = null;

// Pendant une relecture TabT (bouton « Actualiser »), on recharge toutes les
// 5 s jusqu'à la fin.
async function load() {
  clearTimeout(timer);
  const { data } = await api.get(`/players/${props.playerId}/tournament-registrations`);
  registrations.value = data.registrations;
  syncing.value = !!data.sync?.running;
  if (syncing.value) timer = setTimeout(load, 5000);
}
onMounted(load);
onBeforeUnmount(() => clearTimeout(timer));
watch(() => props.playerId, load);
defineExpose({ load });

// Les dates TabT sont à minuit UTC : on compare la partie date au jour local.
const today = new Date().toLocaleDateString("sv-SE");
const upcoming = computed(() => groupByTournament((registrations.value ?? []).filter((r) => r.date.slice(0, 10) >= today)));
const played = computed(() => groupByTournament((registrations.value ?? []).filter((r) => r.date.slice(0, 10) < today)).reverse());
const seriesLabel = (t) => t.entries.map((e) => e.serieName).filter(Boolean).join(" · ");

function resultLabel(entry) {
  const r = entry.result;
  if (!r) return "résultats pas encore dans TabT";
  const parts = [`${r.wins} V – ${r.losses} D`];
  if (r.walkovers) parts.push(`${r.walkovers} forfait${r.walkovers > 1 ? "s" : ""}`);
  return parts.join(", ");
}
</script>

<template>
  <div v-if="registrations" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p class="text-sm font-medium text-slate-600">Tournois de la saison</p>
      <p v-if="syncing" class="text-xs text-sky-700"><i class="pi pi-spin pi-spinner text-xs mr-1"></i>Relecture des inscriptions en cours…</p>
      <p v-else class="text-xs text-slate-400">Inscriptions AFTT, mises à jour chaque nuit</p>
    </div>

    <p class="text-xs font-medium uppercase tracking-wide text-slate-400 mt-3">À venir</p>
    <p v-if="!upcoming.length" class="text-sm text-slate-400 mt-1">
      {{ asPlayer ? "Aucune inscription à un tournoi à venir. Une fois inscrit auprès de l'AFTT, ton tournoi apparaîtra ici le lendemain, ou tout de suite avec « Actualiser depuis TabT »." : "Aucune inscription à un tournoi à venir." }}
    </p>
    <ul v-else class="divide-y divide-slate-100">
      <li v-for="t in upcoming" :key="t.id" class="py-2.5 flex items-start gap-3">
        <span class="w-20 shrink-0 text-sm font-medium text-slate-700 capitalize">{{ formatTournamentDay(t.date) }}</span>
        <span class="flex-1 min-w-0">
          <span class="block font-medium text-slate-800 break-words">{{ t.name }}</span>
          <span class="block text-xs text-slate-500">
            {{ seriesLabel(t) }}<template v-if="venueLabel(t)"><template v-if="seriesLabel(t)"> · </template>{{ venueLabel(t) }}</template>
          </span>
        </span>
      </li>
    </ul>

    <template v-if="played.length">
      <p class="text-xs font-medium uppercase tracking-wide text-slate-400 mt-4">Déjà joués</p>
      <ul class="divide-y divide-slate-100">
        <li v-for="t in played" :key="t.id" class="py-2.5 flex items-start gap-3">
          <span class="w-20 shrink-0 text-sm text-slate-500 capitalize">{{ formatTournamentDay(t.date) }}</span>
          <span class="flex-1 min-w-0">
            <span class="block font-medium text-slate-700 break-words">{{ t.name }}</span>
            <span v-for="e in t.entries" :key="e.id" class="block text-xs" :class="e.result ? 'text-slate-600' : 'text-slate-400'">
              <template v-if="e.serieName">{{ e.serieName }} : </template>{{ resultLabel(e) }}
            </span>
          </span>
        </li>
      </ul>
    </template>
  </div>
</template>
