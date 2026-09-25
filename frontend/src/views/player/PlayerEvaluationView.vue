<script setup>
import Tag from "primevue/tag";
import Chart from "primevue/chart";
import {
  usePlayerSpace, EVALUATION_CRITERIA, formatDate, average,
} from "../../composables/usePlayerSpace.js";

const {
  evaluations, latest, previous, latestAverage, delta,
  radarData, radarOptions, evolutionData, evolutionOptions,
} = usePlayerSpace();
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
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
  </div>
</template>
