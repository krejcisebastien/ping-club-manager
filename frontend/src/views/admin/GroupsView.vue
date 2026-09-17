<script setup>
import { ref, onMounted, watch, computed } from "vue";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const seasons = ref([]);
const selectedSeasonId = ref("");
const groups = ref([]);
const allPlayers = ref([]);
const newGroup = ref({ name: "", rankingCriteria: "" });
const error = ref("");

const selectedGroupId = ref("");
const roster = ref([]);
const playerToAdd = ref("");
const editGroupForm = ref({ name: "", rankingCriteria: "" });

const availablePlayers = computed(() => {
  const rosterIds = new Set(roster.value.map((a) => a.player.id));
  return allPlayers.value.filter((p) => !rosterIds.has(p.id));
});

async function loadSeasons() {
  const { data } = await api.get("/seasons");
  seasons.value = data.seasons;
  if (!selectedSeasonId.value && seasons.value.length) {
    selectedSeasonId.value = seasons.value[0].id;
  }
}

async function loadGroups() {
  if (!selectedSeasonId.value) {
    groups.value = [];
    return;
  }
  const { data } = await api.get("/groups", { params: { seasonId: selectedSeasonId.value } });
  groups.value = data.groups;
}

async function loadRoster(groupId) {
  const { data } = await api.get(`/groups/${groupId}/players`);
  roster.value = data.assignments;
}

onMounted(async () => {
  const [, p] = await Promise.all([loadSeasons(), api.get("/players")]);
  allPlayers.value = p.data.players;
  await loadGroups();
});

watch(selectedSeasonId, loadGroups);

async function onCreateGroup() {
  error.value = "";
  try {
    await api.post("/groups", { seasonId: selectedSeasonId.value, ...newGroup.value });
    newGroup.value = { name: "", rankingCriteria: "" };
    await loadGroups();
  } catch (err) {
    error.value = err.response?.data?.error ?? "Erreur lors de la création.";
  }
}

async function onSelectGroup(groupId) {
  selectedGroupId.value = groupId;
  const group = groups.value.find((g) => g.id === groupId);
  editGroupForm.value = { name: group.name, rankingCriteria: group.rankingCriteria ?? "" };
  await loadRoster(groupId);
}

async function onSaveGroupEdit() {
  await api.put(`/groups/${selectedGroupId.value}`, editGroupForm.value);
  await loadGroups();
}

async function onAddPlayer() {
  if (!playerToAdd.value) return;
  await api.post(`/groups/${selectedGroupId.value}/players`, { playerId: playerToAdd.value });
  playerToAdd.value = "";
  await loadRoster(selectedGroupId.value);
}

async function onRemovePlayer(playerId) {
  await api.delete(`/groups/${selectedGroupId.value}/players/${playerId}`);
  await loadRoster(selectedGroupId.value);
}
</script>

<template>
  <AppLayout title="Groupes d'entrainement" :nav-links="navLinks">
    <div class="mb-4">
      <label class="text-xs text-slate-500">Saison</label>
      <select v-model="selectedSeasonId" class="block rounded-lg border border-slate-300 px-2 py-1.5">
        <option v-for="s in seasons" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="bg-white rounded-xl shadow-sm p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Groupes</p>
        <ul class="divide-y divide-slate-100 mb-4">
          <li
            v-for="g in groups"
            :key="g.id"
            class="py-2 flex items-center justify-between cursor-pointer hover:text-sky-600"
            :class="{ 'text-sky-600 font-medium': g.id === selectedGroupId }"
            @click="onSelectGroup(g.id)"
          >
            <span>{{ g.name }}</span>
            <span class="text-xs text-slate-400">{{ g.rankingCriteria }}</span>
          </li>
          <li v-if="!groups.length" class="py-2 text-slate-400 text-sm">Aucun groupe pour cette saison.</li>
        </ul>

        <form class="grid gap-2" @submit.prevent="onCreateGroup">
          <input v-model="newGroup.name" placeholder="Nom du groupe" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
          <input v-model="newGroup.rankingCriteria" placeholder="Critère de classement (optionnel)" class="rounded-lg border border-slate-300 px-2 py-1.5" />
          <button type="submit" class="rounded-lg bg-sky-600 text-white py-1.5 font-medium hover:bg-sky-700">
            Créer le groupe
          </button>
        </form>
        <p v-if="error" class="text-sm text-red-600 mt-2">{{ error }}</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Composition</p>
        <template v-if="selectedGroupId">
          <form class="grid gap-2 mb-4 pb-4 border-b border-slate-100" @submit.prevent="onSaveGroupEdit">
            <input v-model="editGroupForm.name" placeholder="Nom du groupe" required class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
            <input v-model="editGroupForm.rankingCriteria" placeholder="Critère de classement" class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
            <button type="submit" class="rounded-lg bg-sky-600 text-white py-1.5 text-sm font-medium hover:bg-sky-700">
              Enregistrer les modifications
            </button>
          </form>
          <ul class="divide-y divide-slate-100 mb-4">
            <li v-for="a in roster" :key="a.id" class="py-2 flex items-center justify-between">
              <span>{{ a.player.firstName }} {{ a.player.lastName }}</span>
              <button class="text-xs text-red-500 hover:underline" @click="onRemovePlayer(a.player.id)">retirer</button>
            </li>
            <li v-if="!roster.length" class="py-2 text-slate-400 text-sm">Aucun joueur dans ce groupe.</li>
          </ul>
          <div class="flex gap-2">
            <select v-model="playerToAdd" class="flex-1 rounded-lg border border-slate-300 px-2 py-1.5">
              <option value="" disabled>Ajouter un joueur…</option>
              <option v-for="p in availablePlayers" :key="p.id" :value="p.id">
                {{ p.firstName }} {{ p.lastName }}
              </option>
            </select>
            <button class="rounded-lg bg-sky-600 text-white px-3 py-1.5 font-medium hover:bg-sky-700" @click="onAddPlayer">
              Ajouter
            </button>
          </div>
        </template>
        <p v-else class="text-slate-400 text-sm">Sélectionne un groupe à gauche.</p>
      </div>
    </div>
  </AppLayout>
</template>
