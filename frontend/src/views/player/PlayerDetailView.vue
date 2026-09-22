<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Tag from "primevue/tag";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useAuthStore } from "../../stores/auth.js";
import { ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_SEVERITY } from "../../lib/attendance.js";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const player = ref(null);
const pointsToWork = ref([]);
const attendances = ref([]);
const campAttendances = ref([]);
const stats = ref(null);

async function load() {
  const playerId = route.params.id;
  const [p, pts, att, campAtt, seasons] = await Promise.all([
    api.get(`/players/${playerId}`),
    api.get(`/players/${playerId}/points-to-work`),
    api.get(`/players/${playerId}/attendance`),
    api.get(`/players/${playerId}/camp-attendance`),
    api.get("/seasons"),
  ]);
  player.value = p.data.player;
  pointsToWork.value = pts.data.pointsToWork;
  attendances.value = att.data.attendances;
  campAttendances.value = campAtt.data.attendances;

  const activeSeason = seasons.data.seasons.find((s) => s.isActive);
  stats.value = activeSeason ? (await api.get(`/players/${playerId}/stats`, { params: { seasonId: activeSeason.id } })).data.stats : null;
}

function formatRate(rate) {
  return rate == null ? "—" : `${Math.round(rate * 100)}%`;
}

onMounted(load);
watch(() => route.params.id, load);
</script>

<template>
  <AppLayout title="Mon espace joueur">
    <button
      v-if="auth.user.playerIds.length > 1"
      class="text-sm text-sky-600 hover:underline mb-3"
      @click="router.push('/player')"
    >
      ← changer de joueur
    </button>

    <div v-if="player" class="space-y-4">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
        <img v-if="player.photoUrl" :src="player.photoUrl" alt="" class="w-12 h-12 rounded-full object-cover shrink-0" />
        <p class="text-lg font-medium">{{ player.firstName }} {{ player.lastName }}</p>
      </div>
      <div v-if="stats" class="grid grid-cols-2 gap-3">
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p class="text-xs text-slate-500 mb-1">Présence entrainements (saison)</p>
          <p class="text-2xl font-semibold text-slate-800">{{ formatRate(stats.training.attendanceRate) }}</p>
          <p class="text-xs text-slate-400">{{ stats.training.hours }} h cumulées</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p class="text-xs text-slate-500 mb-1">Présence stages (saison)</p>
          <p class="text-2xl font-semibold text-slate-800">{{ formatRate(stats.camp.attendanceRate) }}</p>
          <p class="text-xs text-slate-400">{{ stats.camp.hours }} h cumulées</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm text-slate-500 mb-2">Points à travailler</p>
        <ul class="divide-y divide-slate-100">
          <li v-for="pt in pointsToWork" :key="pt.id" class="py-2 text-slate-700">
            {{ pt.description }}
            <span class="text-xs text-slate-400">({{ pt.status }})</span>
          </li>
          <li v-if="!pointsToWork.length" class="py-2 text-slate-400 text-sm">Aucun point enregistré.</li>
        </ul>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm text-slate-500 mb-2">Participation aux entrainements</p>
        <ul class="divide-y divide-slate-100">
          <li v-for="a in attendances" :key="a.id" class="py-2 flex items-center justify-between text-slate-700">
            <span>
              {{ new Date(a.occurrence.date).toLocaleDateString("fr-FR") }}
              — {{ a.occurrence.training.name }}
            </span>
            <Tag :severity="ATTENDANCE_STATUS_SEVERITY[a.status]" :value="ATTENDANCE_STATUS_LABELS[a.status]" />
          </li>
          <li v-if="!attendances.length" class="py-2 text-slate-400 text-sm">Aucune présence enregistrée.</li>
        </ul>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm text-slate-500 mb-2">Participation aux stages</p>
        <ul class="divide-y divide-slate-100">
          <li v-for="a in campAttendances" :key="a.id" class="py-2 flex items-center justify-between text-slate-700">
            <span>
              {{ new Date(a.campPeriodGroup.period.campDay.date).toLocaleDateString("fr-FR") }}
              — {{ a.campPeriodGroup.period.campDay.camp.name }}
              ({{ a.campPeriodGroup.period.label }} · {{ a.campPeriodGroup.group.name }})
            </span>
            <Tag :severity="ATTENDANCE_STATUS_SEVERITY[a.status]" :value="ATTENDANCE_STATUS_LABELS[a.status]" />
          </li>
          <li v-if="!campAttendances.length" class="py-2 text-slate-400 text-sm">Aucune présence enregistrée.</li>
        </ul>
      </div>
    </div>
  </AppLayout>
</template>
