<script setup>
import { computed } from "vue";

// Classement estimé d'un joueur (page Classements) : le classement, sa place au
// ranking, et une jauge entre le classement inférieur (à gauche) et le
// classement supérieur (à droite), avec le nombre de places de chaque côté.
const props = defineProps({
  estimate: { type: Object, required: true },
  position: { type: Number, required: true },
  // Classement de début de saison, pour colorer une montée ou une descente.
  start: { type: String, default: null },
  ladies: { type: Boolean, default: false },
});

const ORDER = ["A", "B0", "B2", "B4", "B6", "C0", "C2", "C4", "C6", "D0", "D2", "D4", "D6", "E0", "E2", "E4", "E6", "NC"];
const trend = computed(() => {
  const from = props.start?.startsWith("A") ? "A" : props.start;
  const a = ORDER.indexOf(from);
  const b = ORDER.indexOf(props.estimate.ranking);
  if (a < 0 || b < 0 || a === b) return "same";
  return b < a ? "up" : "down";
});
const rankingClass = computed(() => ({ up: "text-green-700", down: "text-red-600", same: "text-slate-800" })[trend.value]);
const trendIcon = computed(() => ({ up: "pi-arrow-up", down: "pi-arrow-down", same: null })[trend.value]);

// Avancement dans la tranche : 0 % juste au-dessus du classement inférieur,
// 100 % au seuil du classement supérieur.
const progress = computed(() => {
  const { placesToLower: down, placesToUpper: up } = props.estimate;
  if (down == null || up == null) return null;
  return Math.round((down / (down + up)) * 100);
});
const n = (v) => v.toLocaleString("fr-FR");
</script>

<template>
  <div class="min-w-[12rem]">
    <div class="flex items-baseline gap-2">
      <span class="text-base font-semibold tabular-nums" :class="rankingClass">
        {{ estimate.ranking }}<template v-if="ladies"> dames</template>
        <i v-if="trendIcon" class="pi text-[10px] ml-0.5" :class="trendIcon"></i>
      </span>
      <span class="text-xs text-slate-500">{{ n(position) }}<sup>e</sup>{{ ladies ? " dame" : "" }}</span>
    </div>
    <template v-if="estimate.lower || estimate.upper">
      <div v-if="progress != null" class="relative h-1 rounded-full bg-slate-200 mt-1.5" :title="`${progress} % de la tranche`">
        <div class="absolute inset-y-0 left-0 rounded-full bg-sky-500" :style="{ width: `${progress}%` }"></div>
      </div>
      <div class="flex justify-between gap-3 text-[11px] text-slate-500 mt-1 tabular-nums">
        <span v-if="estimate.lower">{{ estimate.lower }} <span class="text-slate-400">à {{ n(estimate.placesToLower) }} pl.</span></span>
        <span v-else></span>
        <span v-if="estimate.upper" class="text-right">{{ estimate.upper }} <span class="text-slate-400">à {{ n(estimate.placesToUpper) }} pl.</span></span>
      </div>
    </template>
  </div>
</template>
