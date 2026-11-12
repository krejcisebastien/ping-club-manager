<script setup>
import { ref, computed, onMounted } from "vue";
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


const todayLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const today = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);
const greeting = new Date().getHours() < 18 ? "Bonjour" : "Bonsoir";

// Phrase de synthèse du bandeau : ce qui attend l'entraineur en priorité.
const summary = computed(() => {
  if (!stats.value) return "";
  const parts = [];
  if (stats.value.pendingAttendance) parts.push(`${stats.value.pendingAttendance} présence(s) à pointer`);
  parts.push(`${stats.value.upcomingTrainings} séance(s) dans les 7 prochains jours`);
  return parts.join(" · ");
});
const nextTraining = computed(() => upcomingTrainings.value[0] ?? null);

function dayNumber(d) {
  return new Date(d).getDate();
}
function monthShort(d) {
  return new Date(d).toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");
}
function weekdayShort(d) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}
</script>

<template>
  <AppLayout title="Espace entraineur" :nav-links="navLinks">
    <!-- Bandeau d'accueil -->
    <section class="hero relative overflow-hidden rounded-2xl bg-ink text-white p-6 md:p-8 mb-6">
      <div class="relative z-10 flex flex-col md:flex-row md:items-end gap-5">
        <div class="flex-1 min-w-0">
          <p class="text-sm text-brand-200">{{ today }}</p>
          <h2 class="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">{{ greeting }} coach</h2>
          <p class="text-slate-300 mt-2">{{ summary }}</p>
        </div>
        <RouterLink
          v-if="nextTraining"
          :to="`/coach/attendance/${nextTraining.id}`"
          class="inline-flex items-center gap-3 self-start md:self-auto rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-3 backdrop-blur transition"
        >
          <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600"><i class="pi pi-play text-sm"></i></span>
          <span class="text-left">
            <span class="block text-xs text-slate-300">Prochaine séance · {{ formatDate(nextTraining.date) }} {{ nextTraining.startTime }}</span>
            <span class="block font-semibold">{{ nextTraining.trainingName }}</span>
          </span>
        </RouterLink>
      </div>
      <svg class="absolute inset-0 h-full w-full" viewBox="0 0 800 220" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="coach-glow" cx="90%" cy="0%" r="80%">
            <stop offset="0" stop-color="#2554eb" stop-opacity="0.6" />
            <stop offset="1" stop-color="#0b1b34" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="800" height="220" fill="url(#coach-glow)" />
        <g stroke="#fff" stroke-opacity="0.07" stroke-width="2" fill="none">
          <rect x="520" y="-40" width="360" height="300" rx="4" transform="rotate(-14 700 110)" />
          <line x1="560" y1="230" x2="840" y2="-20" />
        </g>
        <circle class="hidden md:block" cx="742" cy="196" r="12" fill="#fff" fill-opacity="0.85" />
      </svg>
    </section>

    <!-- Chiffres clés -->
    <div v-if="stats" class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
      <RouterLink to="/admin/players" class="kpi group">
        <span class="kpi-icon bg-brand-50 text-brand-600"><i class="pi pi-users"></i></span>
        <p class="kpi-value">{{ stats.players }}</p>
        <p class="kpi-label">Joueurs <i class="pi pi-arrow-right text-[0.65rem] opacity-0 group-hover:opacity-100 transition"></i></p>
      </RouterLink>
      <div class="kpi">
        <span class="kpi-icon bg-emerald-50 text-emerald-600"><i class="pi pi-calendar"></i></span>
        <p class="kpi-value">{{ stats.upcomingTrainings }}</p>
        <p class="kpi-label">Séances sur 7 jours</p>
      </div>
      <div class="kpi">
        <span class="kpi-icon bg-violet-50 text-violet-600"><i class="pi pi-flag"></i></span>
        <p class="kpi-value">{{ stats.upcomingCampPeriods }}</p>
        <p class="kpi-label">Périodes de stage sur 7 jours</p>
      </div>
      <div class="kpi" :class="stats.pendingAttendance && '!border-racket-100 !bg-racket-50/60'">
        <span class="kpi-icon" :class="stats.pendingAttendance ? 'bg-racket-500 text-white' : 'bg-slate-100 text-slate-500'"><i class="pi pi-check-square"></i></span>
        <p class="kpi-value" :class="stats.pendingAttendance && 'text-racket-700'">{{ stats.pendingAttendance }}</p>
        <p class="kpi-label">Présences à pointer</p>
      </div>
    </div>

    <!-- À pointer -->
    <div v-if="pendingAttendance.length" class="card mb-6">
      <div class="card-head">
        <h3 class="card-title"><span class="dot bg-racket-500"></span>À pointer</h3>
        <span class="text-xs font-semibold text-racket-700 bg-racket-50 rounded-full px-2.5 py-1">{{ pendingAttendance.length }} en retard</span>
      </div>
      <ul class="divide-y divide-slate-100">
        <li v-for="o in pendingAttendance" :key="o.id">
          <RouterLink :to="`/coach/attendance/${o.id}`" class="row group">
            <div class="date-chip">
              <span class="text-[0.65rem] uppercase text-slate-500">{{ weekdayShort(o.date) }}</span>
              <span class="text-lg font-bold leading-none text-slate-900">{{ dayNumber(o.date) }}</span>
              <span class="text-[0.65rem] uppercase text-slate-500">{{ monthShort(o.date) }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-slate-800 truncate">{{ o.trainingName }}</p>
              <p class="text-xs text-slate-500 truncate">{{ o.groupName }}</p>
            </div>
            <Button label="Pointer" size="small" class="shrink-0" />
          </RouterLink>
        </li>
      </ul>
    </div>

    <div class="flex flex-col gap-6">
      <div class="card">
        <div class="card-head">
          <h3 class="card-title"><span class="dot bg-emerald-500"></span>Entrainements à venir</h3>
          <span class="text-xs text-slate-400">7 prochains jours</span>
        </div>
        <ul class="divide-y divide-slate-100">
          <li v-for="o in upcomingTrainings" :key="o.id">
            <RouterLink :to="`/coach/attendance/${o.id}`" class="row group">
              <div class="date-chip">
                <span class="text-[0.65rem] uppercase text-slate-500">{{ weekdayShort(o.date) }}</span>
                <span class="text-lg font-bold leading-none text-slate-900">{{ dayNumber(o.date) }}</span>
                <span class="text-[0.65rem] uppercase text-slate-500">{{ monthShort(o.date) }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-slate-800 truncate">{{ o.trainingName }}</p>
                <p class="text-xs text-slate-500 truncate">
                  <i class="pi pi-clock text-[0.65rem] mr-1"></i>{{ o.startTime }}–{{ o.endTime }} · {{ o.groupName }}
                  <span v-if="o.coaches.length"> · {{ o.coaches.join(", ") }}</span>
                </p>
              </div>
              <i class="pi pi-chevron-right text-slate-300 group-hover:text-brand-600 transition"></i>
            </RouterLink>
          </li>
        </ul>
        <div v-if="!loading && !upcomingTrainings.length" class="empty">
          <span class="empty-icon"><i class="pi pi-calendar"></i></span>
          <p>Aucun entrainement dans les 7 prochains jours.</p>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <h3 class="card-title"><span class="dot bg-violet-500"></span>Stages à venir</h3>
          <span class="text-xs text-slate-400">7 prochains jours</span>
        </div>
        <ul class="divide-y divide-slate-100">
          <li v-for="pg in upcomingCampPeriods" :key="pg.periodGroupId">
            <RouterLink :to="`/coach/camp-attendance/${pg.periodGroupId}`" class="row group">
              <div class="date-chip">
                <span class="text-[0.65rem] uppercase text-slate-500">{{ weekdayShort(pg.date) }}</span>
                <span class="text-lg font-bold leading-none text-slate-900">{{ dayNumber(pg.date) }}</span>
                <span class="text-[0.65rem] uppercase text-slate-500">{{ monthShort(pg.date) }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-slate-800 truncate">{{ pg.campName }}</p>
                <p class="text-xs text-slate-500 truncate">{{ pg.label }} · {{ pg.startTime }}–{{ pg.endTime }} · {{ pg.groupName }}</p>
              </div>
              <i class="pi pi-chevron-right text-slate-300 group-hover:text-brand-600 transition"></i>
            </RouterLink>
          </li>
        </ul>
        <div v-if="!loading && !upcomingCampPeriods.length" class="empty">
          <span class="empty-icon"><i class="pi pi-sun"></i></span>
          <p>Pas de stage cette semaine.</p>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.kpi {
  display: block;
  background: #fff;
  border: 1px solid #e6eaf2;
  border-radius: 1rem;
  padding: 1rem 1.1rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
  transition: transform 0.15s, box-shadow 0.15s;
}
a.kpi:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px -8px rgb(15 23 42 / 0.15);
}
.kpi-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.7rem;
}
.kpi-value {
  margin-top: 0.75rem;
  font-size: 1.875rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
  color: #0f172a;
}
.kpi-label {
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: #64748b;
}
.card {
  background: #fff;
  border: 1px solid #e6eaf2;
  border-radius: 1rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
  overflow: hidden;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 1rem 1.25rem 0.75rem;
}
.card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  color: #0f172a;
}
.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
}
.row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.75rem 1.25rem;
  transition: background-color 0.15s;
}
.row:hover {
  background: #f8fafc;
}
.date-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  width: 3rem;
  height: 3.4rem;
  flex-shrink: 0;
  border-radius: 0.75rem;
  background: #f1f4f9;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 1.5rem 1.25rem 2rem;
  text-align: center;
  font-size: 0.875rem;
  color: #94a3b8;
}
.empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  background: #f1f4f9;
  color: #94a3b8;
  font-size: 1.25rem;
}
</style>
