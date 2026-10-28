<script setup>
// Détail d'une évaluation sportive, lisible d'un coup d'œil : points forts et
// points à améliorer d'abord, puis la note de chaque critère (évolution depuis
// l'évaluation précédente) et, sur demande, le détail des points de la grille.
import { computed, ref } from "vue";
import Tag from "primevue/tag";
import { EVALUATION_CRITERIA, evaluationAverage, formatScore, strengthsAndWeaknesses } from "../lib/evaluation.js";

const props = defineProps({
  evaluation: { type: Object, required: true },
  previous: { type: Object, default: null },
});

const showItems = ref(false);
const summary = computed(() => strengthsAndWeaknesses(props.evaluation));
const delta = (key) => (props.previous ? Math.round((props.evaluation[key] - props.previous[key]) * 10) / 10 : 0);
const itemsOf = (c) => (props.evaluation.itemScores ?? []).filter((i) => i.criterion === c.criterion);
const hasItems = computed(() => (props.evaluation.itemScores ?? []).length > 0);
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-baseline justify-between flex-wrap gap-2">
      <p class="text-sm text-slate-500">Évaluation du {{ new Date(evaluation.date).toLocaleDateString("fr-FR") }}</p>
      <Tag severity="info" :value="`moyenne ${formatScore(evaluationAverage(evaluation))}/10`" />
    </div>
    <p v-if="evaluation.note" class="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">« {{ evaluation.note }} »</p>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div class="rounded-lg border border-green-200 bg-green-50/60 p-3">
        <p class="text-sm font-medium text-green-800 mb-2"><i class="pi pi-thumbs-up mr-1.5" aria-hidden="true"></i>Points forts</p>
        <ul v-if="summary.strengths.length" class="space-y-1">
          <li v-for="s in summary.strengths" :key="s.id" class="flex items-baseline justify-between gap-2 text-sm">
            <span class="min-w-0 text-slate-700">
              {{ s.label }}<span v-if="s.max === 5" class="text-xs text-slate-400"> · {{ s.criterion?.label }}</span>
            </span>
            <span class="tabular-nums whitespace-nowrap text-green-700 font-medium">{{ formatScore(s.score) }}<span class="text-xs font-normal text-slate-400">/{{ s.max }}</span></span>
          </li>
        </ul>
        <p v-else class="text-sm text-slate-500">Pas encore de point fort marqué.</p>
      </div>
      <div class="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
        <p class="text-sm font-medium text-amber-800 mb-2"><i class="pi pi-flag mr-1.5" aria-hidden="true"></i>À améliorer</p>
        <ul v-if="summary.weaknesses.length" class="space-y-1">
          <li v-for="w in summary.weaknesses" :key="w.id" class="flex items-baseline justify-between gap-2 text-sm">
            <span class="min-w-0 text-slate-700">
              {{ w.label }}<span v-if="w.max === 5" class="text-xs text-slate-400"> · {{ w.criterion?.label }}</span>
            </span>
            <span class="tabular-nums whitespace-nowrap text-amber-700 font-medium">{{ formatScore(w.score) }}<span class="text-xs font-normal text-slate-400">/{{ w.max }}</span></span>
          </li>
        </ul>
        <p v-else class="text-sm text-slate-500">Rien de faible à signaler.</p>
      </div>
    </div>

    <div>
      <div class="flex items-baseline justify-between gap-2 mb-2">
        <p class="text-sm font-medium text-slate-600">Par critère</p>
        <button v-if="hasItems" type="button" class="text-xs text-sky-700 hover:underline" @click="showItems = !showItems">
          {{ showItems ? "Masquer le détail" : "Voir le détail des points" }}
        </button>
      </div>
      <ul class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <li v-for="c in EVALUATION_CRITERIA" :key="c.key">
          <div class="flex items-baseline justify-between text-sm mb-1">
            <span class="text-slate-600">{{ c.label }}</span>
            <span class="tabular-nums">
              <strong :style="{ color: c.color }">{{ formatScore(evaluation[c.key]) }}</strong><span class="text-xs text-slate-400">/10</span>
              <span v-if="delta(c.key)" class="ml-2 text-xs" :class="delta(c.key) > 0 ? 'text-green-600' : 'text-red-500'">
                {{ delta(c.key) > 0 ? "▲" : "▼" }} {{ formatScore(Math.abs(delta(c.key))) }}
              </span>
            </span>
          </div>
          <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div class="h-full rounded-full" :style="{ width: `${evaluation[c.key] * 10}%`, backgroundColor: c.color }"></div>
          </div>
          <ul v-if="showItems && itemsOf(c).length" class="mt-1.5 space-y-0.5">
            <li v-for="p in itemsOf(c)" :key="p.id" class="flex items-baseline justify-between gap-2 text-xs text-slate-500">
              <span class="min-w-0">{{ p.label }}</span>
              <span class="tabular-nums whitespace-nowrap">{{ p.score }}<span class="text-slate-400">/5</span></span>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
</template>
