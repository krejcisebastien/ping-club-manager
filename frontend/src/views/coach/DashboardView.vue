<script setup>
import { ref, onMounted } from "vue";
import { RouterLink } from "vue-router";
import Button from "primevue/button";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const upcomingTrainings = ref([]);
const upcomingCampPeriods = ref([]);
const pendingAttendance = ref([]);
const stats = ref(null);
const loading = ref(true);

onMounted(async () => {
  const { data } = await api.get("/dashboard/coach");
  upcomingTrainings.value = data.upcomingTrainings;
  upcomingCampPeriods.value = data.upcomingCampPeriods;
  pendingAttendance.value = data.pendingAttendance;
  stats.value = data.stats;
  loading.value = false;
});

function formatDate(d) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}
</script>

<template>
  <AppLayout title="Espace entraineur" :nav-links="navLinks">
    <div v-if="stats" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <RouterLink to="/admin/players" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:ring-1 hover:ring-sky-300">
        <p class="text-sm text-slate-500">Joueurs</p>
        <p class="text-2xl font-semibold">{{ stats.players }}</p>
      </RouterLink>
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm text-slate-500">Séances (7 j)</p>
        <p class="text-2xl font-semibold">{{ stats.upcomingTrainings }}</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm text-slate-500">Stages (7 j)</p>
        <p class="text-2xl font-semibold">{{ stats.upcomingCampPeriods }}</p>
      </div>
      <div class="rounded-xl shadow-sm border p-4" :class="stats.pendingAttendance ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'">
        <p class="text-sm" :class="stats.pendingAttendance ? 'text-amber-700' : 'text-slate-500'">Présences en attente</p>
        <p class="text-2xl font-semibold" :class="stats.pendingAttendance && 'text-amber-800'">{{ stats.pendingAttendance }}</p>
      </div>
    </div>

    <div v-if="pendingAttendance.length" class="bg-amber-50 rounded-xl shadow-sm border border-amber-200 p-4 mb-4">
      <p class="text-sm font-medium text-amber-800 mb-2">
        <i class="pi pi-exclamation-triangle mr-1"></i>Présences pas encore pointées
      </p>
      <ul class="divide-y divide-amber-100">
        <li v-for="o in pendingAttendance" :key="o.id" class="py-2 flex items-center justify-between gap-2 text-sm">
          <span>{{ formatDate(o.date) }} — {{ o.trainingName }} <span class="text-amber-600">({{ o.groupName }})</span></span>
          <RouterLink :to="`/coach/attendance/${o.id}`">
            <Button label="Pointer" size="small" severity="warning" />
          </RouterLink>
        </li>
      </ul>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Entrainements — 7 prochains jours</p>
        <ul class="divide-y divide-slate-100">
          <li v-for="o in upcomingTrainings" :key="o.id" class="py-2.5 flex items-center justify-between gap-2 text-sm">
            <div class="min-w-0">
              <p class="font-medium text-slate-700 truncate">{{ o.trainingName }} <span class="text-slate-400 font-normal">— {{ o.groupName }}</span></p>
              <p class="text-xs text-slate-400">
                {{ formatDate(o.date) }} · {{ o.startTime }}–{{ o.endTime }}
                <span v-if="o.coaches.length"> · {{ o.coaches.join(", ") }}</span>
              </p>
            </div>
            <RouterLink :to="`/coach/attendance/${o.id}`" class="shrink-0">
              <Button label="Pointer" size="small" severity="secondary" outlined />
            </RouterLink>
          </li>
          <li v-if="!loading && !upcomingTrainings.length" class="py-2 text-slate-400 text-sm">Aucun entrainement à venir.</li>
        </ul>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Stages — 7 prochains jours</p>
        <ul class="divide-y divide-slate-100">
          <li v-for="pg in upcomingCampPeriods" :key="pg.periodGroupId" class="py-2.5 flex items-center justify-between gap-2 text-sm">
            <div class="min-w-0">
              <p class="font-medium text-slate-700 truncate">{{ pg.campName }} <span class="text-slate-400 font-normal">— {{ pg.groupName }}</span></p>
              <p class="text-xs text-slate-400">{{ formatDate(pg.date) }} · {{ pg.label }} · {{ pg.startTime }}–{{ pg.endTime }}</p>
            </div>
            <RouterLink :to="`/coach/camp-attendance/${pg.periodGroupId}`" class="shrink-0">
              <Button label="Pointer" size="small" severity="secondary" outlined />
            </RouterLink>
          </li>
          <li v-if="!loading && !upcomingCampPeriods.length" class="py-2 text-slate-400 text-sm">Aucun stage à venir.</li>
        </ul>
      </div>
    </div>
  </AppLayout>
</template>
