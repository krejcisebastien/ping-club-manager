<script setup>
import Tag from "primevue/tag";
import { usePlayerSpace, POINT_STATUS, formatDate } from "../../composables/usePlayerSpace.js";

const { pointsToWork, strengths, weaknesses, evolutionNotes, rankings, currentEquipment } = usePlayerSpace();
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-2">
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <p class="text-sm font-medium text-slate-600 mb-2">Points à travailler</p>
      <ul class="divide-y divide-slate-100 text-sm">
        <li v-for="pt in pointsToWork" :key="pt.id" class="py-2 flex items-center justify-between gap-2">
          <span>{{ pt.description }}</span>
          <Tag :severity="POINT_STATUS[pt.status].severity" :value="POINT_STATUS[pt.status].label" />
        </li>
        <li v-if="!pointsToWork.length" class="py-2 text-slate-400">Aucun point enregistré.</li>
      </ul>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <p class="text-sm font-medium text-slate-600 mb-2">Points forts et défauts</p>
      <ul class="text-sm space-y-1">
        <li v-for="t in strengths" :key="t.id" class="flex items-center gap-2"><Tag severity="success" value="+" />{{ t.description }}</li>
        <li v-for="t in weaknesses" :key="t.id" class="flex items-center gap-2"><Tag severity="danger" value="−" />{{ t.description }}</li>
        <li v-if="!strengths.length && !weaknesses.length" class="text-slate-400">Aucun point renseigné.</li>
      </ul>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <p class="text-sm font-medium text-slate-600 mb-2">Notes d'évolution</p>
      <ul class="divide-y divide-slate-100 text-sm">
        <li v-for="n in evolutionNotes" :key="n.id" class="py-2">
          <span class="text-xs text-slate-400">{{ formatDate(n.date) }}</span> — {{ n.note }}
        </li>
        <li v-if="!evolutionNotes.length" class="py-2 text-slate-400">Aucune note.</li>
      </ul>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <p class="text-sm font-medium text-slate-600 mb-2">Classement et matériel</p>
      <ul class="divide-y divide-slate-100 text-sm mb-3">
        <li v-for="r in rankings" :key="r.id" class="py-1.5 flex items-center justify-between">
          <strong>{{ r.rankingValue }}</strong><span class="text-xs text-slate-400">{{ formatDate(r.effectiveDate) }}</span>
        </li>
        <li v-if="!rankings.length" class="py-1.5 text-slate-400">Aucun classement enregistré.</li>
      </ul>
      <ul class="text-sm space-y-1">
        <li v-for="e in currentEquipment" :key="e.id">{{ e.type }} <span class="text-slate-400">{{ e.brand }} {{ e.model }}</span></li>
        <li v-if="!currentEquipment.length" class="text-slate-400">Aucun matériel enregistré.</li>
      </ul>
    </div>
  </div>
</template>
