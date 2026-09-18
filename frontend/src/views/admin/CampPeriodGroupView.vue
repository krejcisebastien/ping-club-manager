<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Dropdown from "primevue/dropdown";
import AppLayout from "../../components/AppLayout.vue";
import CoachAssignmentList from "../../components/CoachAssignmentList.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const route = useRoute();
const router = useRouter();
const id = route.params.id;

const periodGroup = ref(null);
const allCoaches = ref([]);
const allSparrings = ref([]);
const allPlayers = ref([]);
const playerToAdd = ref(null);

const availablePlayers = computed(() => {
  const ids = new Set((periodGroup.value?.players ?? []).map((p) => p.player.id));
  return allPlayers.value.filter((p) => !ids.has(p.id)).map((p) => ({ label: `${p.firstName} ${p.lastName}`, value: p.id }));
});

async function load() {
  const { data } = await api.get(`/camp-period-groups/${id}`);
  periodGroup.value = data.periodGroup;
}

onMounted(async () => {
  const [, c, s, p] = await Promise.all([load(), api.get("/coaches"), api.get("/sparrings"), api.get("/players")]);
  allCoaches.value = c.data.coaches;
  allSparrings.value = s.data.sparrings;
  allPlayers.value = p.data.players;
});

async function onAddCoach(payload) {
  await api.post(`/camp-period-groups/${id}/coaches`, payload);
  await load();
}

async function onRemoveCoach(assignmentId) {
  await api.delete(`/camp-period-groups/${id}/coaches/${assignmentId}`);
  await load();
}

async function onAddPlayer() {
  if (!playerToAdd.value) return;
  await api.post(`/camp-period-groups/${id}/players`, { playerId: playerToAdd.value });
  playerToAdd.value = null;
  await load();
}

async function onRemovePlayer(playerId) {
  await api.delete(`/camp-period-groups/${id}/players/${playerId}`);
  await load();
}
</script>

<template>
  <AppLayout title="Groupe de stage" :nav-links="navLinks">
    <Button label="Retour" icon="pi pi-arrow-left" text class="mb-3 -ml-2" @click="router.back()" />

    <div v-if="periodGroup" class="space-y-4">
      <div class="flex items-center justify-between bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm text-slate-600">
          <span class="font-medium">{{ periodGroup.group.name }}</span> — {{ periodGroup.period.label }}
          <span class="text-slate-400">({{ new Date(periodGroup.period.campDay.date).toLocaleDateString("fr-FR") }})</span>
        </p>
        <Button label="Prendre les présences" icon="pi pi-check-square" size="small" @click="router.push(`/coach/camp-attendance/${id}`)" />
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p class="text-sm font-medium text-slate-600 mb-3">Encadrants</p>
          <CoachAssignmentList :assignments="periodGroup.coaches" :coaches="allCoaches" :sparrings="allSparrings" @add="onAddCoach" @remove="onRemoveCoach" />
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p class="text-sm font-medium text-slate-600 mb-3">Joueurs inscrits</p>
          <ul class="divide-y divide-slate-100 mb-3">
            <li v-for="p in periodGroup.players" :key="p.id" class="py-2 flex items-center justify-between text-sm">
              <span>{{ p.player.firstName }} {{ p.player.lastName }}</span>
              <Button icon="pi pi-times" severity="danger" text rounded size="small" aria-label="Retirer" @click="onRemovePlayer(p.player.id)" />
            </li>
            <li v-if="!periodGroup.players.length" class="py-2 text-slate-400 text-sm">Aucun joueur inscrit.</li>
          </ul>
          <div class="flex gap-2">
            <Dropdown v-model="playerToAdd" :options="availablePlayers" option-label="label" option-value="value" filter placeholder="Inscrire un joueur…" class="flex-1" />
            <Button label="Ajouter" @click="onAddPlayer" />
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
