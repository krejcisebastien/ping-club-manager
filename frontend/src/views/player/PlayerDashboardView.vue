<script setup>
import { RouterLink } from "vue-router";
import Tag from "primevue/tag";
import Avatar from "primevue/avatar";
import Chart from "primevue/chart";
import { fullName, initials } from "../../lib/name.js";
import { usePlayerSpace, formatDate, formatRate } from "../../composables/usePlayerSpace.js";

const {
  player, age, currentRanking, stats, latest, latestAverage, openPoints, evolutionNotes,
  radarData, radarOptions, strongestCriteria, weakestCriteria,
} = usePlayerSpace();
</script>

<template>
  <div class="space-y-4">
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4 flex-wrap">
      <div class="flex items-center gap-4 min-w-0">
        <img v-if="player.photoUrl" :src="player.photoUrl" alt="" class="w-16 h-16 rounded-full object-cover shrink-0" />
        <Avatar v-else :label="initials(player)" shape="circle" size="xlarge" class="shrink-0 bg-sky-100 text-sky-700" />
        <div class="min-w-0">
          <p class="text-xl font-semibold text-slate-800">{{ fullName(player) }}</p>
          <div class="flex flex-wrap gap-2 mt-1">
            <Tag v-if="age != null" severity="secondary" :value="`${age} ans`" />
            <Tag v-if="currentRanking" severity="info" :value="`Classement ${currentRanking}`" />
            <Tag v-if="player.dominantHand" severity="secondary" :value="player.dominantHand === 'LEFT' ? 'Gaucher' : 'Droitier'" />
            <Tag v-if="player.playStyle" severity="secondary" :value="player.playStyle" />
          </div>
        </div>
      </div>
      <RouterLink :to="`/player/${player.id}/profile`" class="ml-auto text-sm text-sky-600 hover:underline">
        <i class="pi pi-pencil mr-1 text-xs"></i>Ma fiche
      </RouterLink>
    </div>

    <div class="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-xs text-slate-500 mb-1">Niveau global</p>
        <p class="text-2xl font-semibold text-slate-800">{{ latestAverage != null ? latestAverage.toFixed(1) : "—" }}<span class="text-sm font-normal text-slate-400">/10</span></p>
        <p class="text-xs text-slate-400">{{ latest ? `évalué le ${formatDate(latest.date)}` : "pas encore évalué" }}</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-xs text-slate-500 mb-1">Présence entrainements</p>
        <p class="text-2xl font-semibold text-slate-800">{{ formatRate(stats?.training.attendanceRate) }}</p>
        <p class="text-xs text-slate-400">{{ stats?.training.hours ?? 0 }} h cette saison</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-xs text-slate-500 mb-1">Présence stages</p>
        <p class="text-2xl font-semibold text-slate-800">{{ formatRate(stats?.camp.attendanceRate) }}</p>
        <p class="text-xs text-slate-400">{{ stats?.camp.hours ?? 0 }} h cette saison</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-xs text-slate-500 mb-1">À travailler</p>
        <p class="text-2xl font-semibold text-slate-800">{{ openPoints.length }}</p>
        <p class="text-xs text-slate-400">point(s) en cours</p>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div v-if="latest" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-medium text-slate-600">Mon profil de jeu</p>
          <RouterLink :to="`/player/${player.id}/evaluation`" class="text-xs text-sky-600 hover:underline">Voir le rapport</RouterLink>
        </div>
        <div class="h-64"><Chart type="radar" :data="radarData" :options="radarOptions" class="h-full" /></div>
        <p class="text-xs text-slate-500 mt-2">
          Point fort : <strong>{{ strongestCriteria.label }}</strong> ({{ latest[strongestCriteria.key] }}/10) ·
          à progresser : <strong>{{ weakestCriteria.label }}</strong> ({{ latest[weakestCriteria.key] }}/10)
        </p>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-2">Ce que dit mon entraineur</p>
        <p v-if="latest?.note" class="text-sm text-slate-700 italic mb-3">« {{ latest.note }} »</p>
        <ul class="divide-y divide-slate-100 text-sm">
          <li v-for="n in evolutionNotes.slice(0, 3)" :key="n.id" class="py-2">
            <span class="text-xs text-slate-400">{{ formatDate(n.date) }}</span> — {{ n.note }}
          </li>
          <li v-if="!evolutionNotes.length && !latest?.note" class="py-2 text-slate-400">Aucune remarque pour l'instant.</li>
        </ul>
      </div>
    </div>
  </div>
</template>
