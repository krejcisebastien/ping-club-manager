<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const route = useRoute();
const router = useRouter();
const id = route.params.id;

const periodGroup = ref(null);
const allCoaches = ref([]);
const allPlayers = ref([]);
const coachToAdd = ref("");
const playerToAdd = ref("");

const availableCoaches = computed(() => {
  const ids = new Set((periodGroup.value?.coaches ?? []).map((c) => c.coach.id));
  return allCoaches.value.filter((c) => !ids.has(c.id));
});
const availablePlayers = computed(() => {
  const ids = new Set((periodGroup.value?.players ?? []).map((p) => p.player.id));
  return allPlayers.value.filter((p) => !ids.has(p.id));
});

async function load() {
  const { data } = await api.get(`/camp-period-groups/${id}`);
  periodGroup.value = data.periodGroup;
}

onMounted(async () => {
  const [, c, p] = await Promise.all([load(), api.get("/coaches"), api.get("/players")]);
  allCoaches.value = c.data.coaches;
  allPlayers.value = p.data.players;
});

async function onAddCoach() {
  if (!coachToAdd.value) return;
  await api.post(`/camp-period-groups/${id}/coaches`, { coachId: coachToAdd.value });
  coachToAdd.value = "";
  await load();
}

async function onRemoveCoach(assignmentId) {
  await api.delete(`/camp-period-groups/${id}/coaches/${assignmentId}`);
  await load();
}

async function onAddPlayer() {
  if (!playerToAdd.value) return;
  await api.post(`/camp-period-groups/${id}/players`, { playerId: playerToAdd.value });
  playerToAdd.value = "";
  await load();
}

async function onRemovePlayer(playerId) {
  await api.delete(`/camp-period-groups/${id}/players/${playerId}`);
  await load();
}
</script>

<template>
  <AppLayout title="Groupe de stage" :nav-links="navLinks">
    <div v-if="periodGroup" class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-slate-500">
          {{ periodGroup.group.name }} — {{ periodGroup.period.label }}
          ({{ new Date(periodGroup.period.campDay.date).toLocaleDateString("fr-FR") }})
        </p>
        <button
          class="text-sm text-sky-600 hover:underline"
          @click="router.push(`/coach/camp-attendance/${id}`)"
        >
          Prendre les présences →
        </button>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p class="text-sm font-medium text-slate-600 mb-3">Entraineurs</p>
          <ul class="divide-y divide-slate-100 mb-3">
            <li v-for="c in periodGroup.coaches" :key="c.id" class="py-2 flex items-center justify-between">
              <span>{{ c.coach.firstName }} {{ c.coach.lastName }}</span>
              <button class="text-xs text-red-500 hover:underline" @click="onRemoveCoach(c.id)">retirer</button>
            </li>
            <li v-if="!periodGroup.coaches.length" class="py-2 text-slate-400 text-sm">Aucun entraineur affecté.</li>
          </ul>
          <div class="flex gap-2">
            <select v-model="coachToAdd" class="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              <option value="" disabled>Ajouter un entraineur…</option>
              <option v-for="c in availableCoaches" :key="c.id" :value="c.id">{{ c.firstName }} {{ c.lastName }}</option>
            </select>
            <button class="rounded-lg bg-sky-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-sky-700" @click="onAddCoach">
              Ajouter
            </button>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p class="text-sm font-medium text-slate-600 mb-3">Joueurs inscrits</p>
          <ul class="divide-y divide-slate-100 mb-3">
            <li v-for="p in periodGroup.players" :key="p.id" class="py-2 flex items-center justify-between">
              <span>{{ p.player.firstName }} {{ p.player.lastName }}</span>
              <button class="text-xs text-red-500 hover:underline" @click="onRemovePlayer(p.player.id)">retirer</button>
            </li>
            <li v-if="!periodGroup.players.length" class="py-2 text-slate-400 text-sm">Aucun joueur inscrit.</li>
          </ul>
          <div class="flex gap-2">
            <select v-model="playerToAdd" class="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              <option value="" disabled>Inscrire un joueur…</option>
              <option v-for="p in availablePlayers" :key="p.id" :value="p.id">{{ p.firstName }} {{ p.lastName }}</option>
            </select>
            <button class="rounded-lg bg-sky-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-sky-700" @click="onAddPlayer">
              Ajouter
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
