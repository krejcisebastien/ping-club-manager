<script setup>
import { computed, ref } from "vue";
import Tag from "primevue/tag";
import Chart from "primevue/chart";
import EvaluationDetail from "../../components/EvaluationDetail.vue";
import { usePlayerSpace, formatDate, average } from "../../composables/usePlayerSpace.js";

const { evaluations, latest, previous, radarData, radarOptions, evolutionData, evolutionOptions } = usePlayerSpace();

// Évaluation affichée en détail : la dernière, ou celle choisie dans l'historique.
const selectedId = ref(null);
const selectedIndex = computed(() => {
  const i = evaluations.value.findIndex((e) => e.id === selectedId.value);
  return i >= 0 ? i : 0;
});
const selected = computed(() => evaluations.value[selectedIndex.value] ?? null);
const selectedPrevious = computed(() => evaluations.value[selectedIndex.value + 1] ?? null);
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
    <div v-if="latest">
      <EvaluationDetail :evaluation="selected" :previous="selectedPrevious" class="mb-6" />

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

      <p class="text-sm font-medium text-slate-600 mt-6 mb-1">Historique</p>
      <p v-if="evaluations.length > 1" class="text-xs text-slate-400 mb-2">Touche une évaluation pour en voir le détail.</p>
      <ul class="divide-y divide-slate-100 text-sm">
        <li v-for="e in evaluations" :key="e.id">
          <button
            type="button"
            class="w-full py-2 px-2 -mx-2 rounded-md flex items-center justify-between gap-2 text-left hover:bg-slate-50"
            :class="e.id === selected?.id ? 'bg-sky-50' : ''"
            @click="selectedId = e.id"
          >
            <span class="min-w-0">{{ formatDate(e.date) }}<span v-if="e.note" class="text-slate-400"> — {{ e.note }}</span></span>
            <Tag severity="info" :value="`${average(e).toFixed(1)}/10`" />
          </button>
        </li>
      </ul>
    </div>
    <p v-else class="text-sm text-slate-400">Aucune évaluation enregistrée pour l'instant.</p>
  </div>
</template>
