<script setup>
import Tag from "primevue/tag";
import { ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_SEVERITY } from "../../lib/attendance.js";
import { usePlayerSpace, formatDate, formatRate } from "../../composables/usePlayerSpace.js";

const { attendances, campAttendances, stats } = usePlayerSpace();
</script>

<template>
  <div class="space-y-4">
    <div v-if="stats" class="grid grid-cols-2 gap-3">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-xs text-slate-500 mb-1">Entrainements (saison)</p>
        <p class="text-2xl font-semibold text-slate-800">{{ formatRate(stats.training.attendanceRate) }}</p>
        <p class="text-xs text-slate-400">{{ stats.training.hours }} h cumulées</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-xs text-slate-500 mb-1">Stages (saison)</p>
        <p class="text-2xl font-semibold text-slate-800">{{ formatRate(stats.camp.attendanceRate) }}</p>
        <p class="text-xs text-slate-400">{{ stats.camp.hours }} h cumulées</p>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-2">Entrainements</p>
        <ul class="divide-y divide-slate-100 text-sm">
          <li v-for="a in attendances" :key="a.id" class="py-2 flex items-center justify-between gap-2">
            <span>{{ formatDate(a.occurrence.date) }} — {{ a.occurrence.training.name }}</span>
            <Tag :severity="ATTENDANCE_STATUS_SEVERITY[a.status]" :value="ATTENDANCE_STATUS_LABELS[a.status]" />
          </li>
          <li v-if="!attendances.length" class="py-2 text-slate-400">Aucune présence enregistrée.</li>
        </ul>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-2">Stages</p>
        <ul class="divide-y divide-slate-100 text-sm">
          <li v-for="a in campAttendances" :key="a.id" class="py-2 flex items-center justify-between gap-2">
            <span>
              {{ formatDate(a.campPeriod.campDay.date) }} — {{ a.campPeriod.campDay.camp.name }}
              ({{ a.campPeriod.label }}<template v-if="a.groupName"> · {{ a.groupName }}</template>)
            </span>
            <Tag :severity="ATTENDANCE_STATUS_SEVERITY[a.status]" :value="ATTENDANCE_STATUS_LABELS[a.status]" />
          </li>
          <li v-if="!campAttendances.length" class="py-2 text-slate-400">Aucune présence enregistrée.</li>
        </ul>
      </div>
    </div>
  </div>
</template>
