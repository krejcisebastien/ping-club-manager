<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import AppLayout from "../../components/AppLayout.vue";
import CoachAssignmentList from "../../components/CoachAssignmentList.vue";
import PlayerEnrollmentList from "../../components/PlayerEnrollmentList.vue";
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

async function onAddPlayer(playerId) {
  await api.post(`/camp-period-groups/${id}/players`, { playerId });
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
          <p class="text-sm font-medium text-slate-600 mb-1">Encadrants</p>
          <p class="text-xs text-slate-400 mb-3">Repris par défaut du groupe, modifiable ici pour cette période uniquement.</p>
          <CoachAssignmentList :assignments="periodGroup.coaches" :coaches="allCoaches" :sparrings="allSparrings" @add="onAddCoach" @remove="onRemoveCoach" />
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p class="text-sm font-medium text-slate-600 mb-1">Joueurs inscrits</p>
          <p class="text-xs text-slate-400 mb-3">Repris par défaut du groupe, modifiable ici pour cette période uniquement.</p>
          <PlayerEnrollmentList :assignments="periodGroup.players" :players="allPlayers" @add="onAddPlayer" @remove="onRemovePlayer" />
        </div>
      </div>
    </div>
  </AppLayout>
</template>
