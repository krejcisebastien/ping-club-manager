<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { api } from "../lib/api.js";
import { groupByTournament, formatTournamentDay, venueLabel } from "../lib/tournaments.js";

// Tournois à venir où le joueur est inscrit, lus chaque nuit dans TabT.
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

const tournaments = computed(() => groupByTournament(registrations.value ?? []));
</script>

<template>
  <div v-if="registrations" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p class="text-sm font-medium text-slate-600">Tournois à venir</p>
      <p v-if="syncing" class="text-xs text-sky-700"><i class="pi pi-spin pi-spinner text-xs mr-1"></i>Relecture des inscriptions en cours…</p>
      <p v-else class="text-xs text-slate-400">Inscriptions AFTT, mises à jour chaque nuit</p>
    </div>
    <p v-if="!tournaments.length" class="text-sm text-slate-400 mt-3">
      {{ asPlayer ? "Aucune inscription à un tournoi à venir. Une fois inscrit auprès de l'AFTT, ton tournoi apparaîtra ici le lendemain, ou tout de suite avec « Actualiser depuis TabT »." : "Aucune inscription à un tournoi à venir." }}
    </p>
    <ul v-else class="divide-y divide-slate-100 mt-2">
      <li v-for="t in tournaments" :key="t.id" class="py-2.5 flex items-start gap-3">
        <span class="w-20 shrink-0 text-sm font-medium text-slate-700 capitalize">{{ formatTournamentDay(t.date) }}</span>
        <span class="flex-1 min-w-0">
          <span class="block font-medium text-slate-800 break-words">{{ t.name }}</span>
          <span class="block text-xs text-slate-500">
            {{ t.entries.map((e) => e.serieName).filter(Boolean).join(" · ") }}<template v-if="venueLabel(t)"> · {{ venueLabel(t) }}</template>
          </span>
        </span>
      </li>
    </ul>
  </div>
</template>
