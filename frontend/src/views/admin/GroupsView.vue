<script setup>
import { ref, onMounted, watch, computed } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";
import Tag from "primevue/tag";
import Avatar from "primevue/avatar";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { fullName, initials } from "../../lib/name.js";

const navLinks = useNavLinks();
const toast = useToast();

const seasons = ref([]);
const selectedSeasonId = ref("");
const groups = ref([]);
const allPlayers = ref([]);
const loading = ref(true);
const searchQuery = ref("");

const filteredGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return groups.value;
  return groups.value.filter((g) => g.name.toLowerCase().includes(q) || g.rankingCriteria?.toLowerCase().includes(q));
});

const groupDialogVisible = ref(false);
const editingGroupId = ref(null);
const groupForm = ref({ name: "", rankingCriteria: "" });
const saving = ref(false);

const rosterDialogVisible = ref(false);
const managingGroup = ref(null);
const roster = ref([]);
const playerToAdd = ref(null);

const availablePlayers = computed(() => {
  const rosterIds = new Set(roster.value.map((a) => a.player.id));
  return allPlayers.value.filter((p) => !rosterIds.has(p.id)).map((p) => ({ label: fullName(p), value: p.id }));
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
  loading.value = true;
  const { data } = await api.get("/groups", { params: { seasonId: selectedSeasonId.value } });
  groups.value = data.groups;
  loading.value = false;
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

function openManage(group) {
  managingGroup.value = group;
  playerToAdd.value = null;
  rosterDialogVisible.value = true;
  loadRoster(group.id);
}

function openCreate() {
  editingGroupId.value = null;
  groupForm.value = { name: "", rankingCriteria: "" };
  groupDialogVisible.value = true;
}

function openEdit(group) {
  editingGroupId.value = group.id;
  groupForm.value = { name: group.name, rankingCriteria: group.rankingCriteria ?? "" };
  groupDialogVisible.value = true;
}

async function onSaveGroup() {
  saving.value = true;
  try {
    if (editingGroupId.value) {
      await api.put(`/groups/${editingGroupId.value}`, groupForm.value);
    } else {
      await api.post("/groups", { seasonId: selectedSeasonId.value, ...groupForm.value });
    }
    groupDialogVisible.value = false;
    toast.add({ severity: "success", summary: editingGroupId.value ? "Groupe modifié" : "Groupe créé", life: 3000 });
    await loadGroups();
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}

async function onAddPlayer() {
  if (!playerToAdd.value) return;
  await api.post(`/groups/${managingGroup.value.id}/players`, { playerId: playerToAdd.value });
  playerToAdd.value = null;
  await Promise.all([loadRoster(managingGroup.value.id), loadGroups()]);
  toast.add({ severity: "success", summary: "Joueur ajouté au groupe", life: 3000 });
}

async function onRemovePlayer(playerId) {
  await api.delete(`/groups/${managingGroup.value.id}/players/${playerId}`);
  await Promise.all([loadRoster(managingGroup.value.id), loadGroups()]);
}
</script>

<template>
  <AppLayout title="Groupes d'entrainement" :nav-links="navLinks">
    <div class="mb-4 max-w-xs">
      <label class="text-xs text-slate-500 block mb-1">Saison</label>
      <Dropdown v-model="selectedSeasonId" :options="seasons" option-label="name" option-value="id" class="w-full" />
    </div>

    <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <h2 class="text-sm font-medium text-slate-600">{{ filteredGroups.length }} groupe(s)</h2>
      <div class="flex items-center gap-2 flex-1 sm:flex-none flex-wrap">
        <div class="relative flex-1 sm:w-64 min-w-[10rem]">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <InputText v-model="searchQuery" placeholder="Rechercher…" class="w-full pl-9" />
        </div>
        <Button label="Nouveau groupe" icon="pi pi-plus" @click="openCreate" />
      </div>
    </div>

    <div v-if="loading" class="text-slate-400 text-sm py-4">Chargement…</div>
    <p v-else-if="!filteredGroups.length" class="text-slate-400 text-sm py-4">
      {{ searchQuery ? "Aucun résultat." : "Aucun groupe pour cette saison." }}
    </p>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="g in filteredGroups"
        :key="g.id"
        class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-sky-200 transition-shadow cursor-pointer"
        @click="openManage(g)"
      >
        <div class="flex items-start justify-between gap-2 mb-1">
          <div class="min-w-0">
            <p class="font-medium text-slate-800 truncate">{{ g.name }}</p>
            <p v-if="g.rankingCriteria" class="text-xs text-slate-400 truncate">{{ g.rankingCriteria }}</p>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <Tag severity="secondary" :value="`${g.playerCount}`" />
            <Button icon="pi pi-pencil" severity="secondary" text rounded aria-label="Modifier" @click.stop="openEdit(g)" />
          </div>
        </div>

        <div v-if="g.players.length" class="flex flex-wrap gap-1.5 mt-3">
          <span
            v-for="p in g.players"
            :key="p.id"
            class="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-100 text-slate-600 text-xs rounded-full pl-1 pr-2.5 py-0.5"
          >
            <Avatar :label="initials(p)" shape="circle" style="width: 1.25rem; height: 1.25rem; font-size: 0.6rem; background-color: #e2e8f0; color: #475569" />
            {{ fullName(p) }}
          </span>
          <span v-if="g.playerCount > g.players.length" class="text-xs text-slate-400 self-center px-1">
            +{{ g.playerCount - g.players.length }}
          </span>
        </div>
        <p v-else class="text-xs text-slate-400 mt-3">Aucun joueur.</p>
      </div>
    </div>

    <Dialog v-model:visible="groupDialogVisible" :header="editingGroupId ? 'Modifier le groupe' : 'Nouveau groupe'" modal style="width: 26rem" class="mx-4">
      <form class="grid gap-3 pt-2" @submit.prevent="onSaveGroup">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Nom</label>
          <InputText v-model="groupForm.name" required class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Critère de classement (optionnel)</label>
          <InputText v-model="groupForm.rankingCriteria" class="w-full" />
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="groupDialogVisible = false" />
          <Button type="submit" label="Enregistrer" :loading="saving" />
        </div>
      </form>
    </Dialog>

    <Dialog v-model:visible="rosterDialogVisible" :header="managingGroup?.name" modal style="width: 30rem" class="mx-4">
      <div v-if="managingGroup">
        <p class="text-xs text-slate-400 mb-3">{{ roster.length }} joueur(s)</p>
        <ul class="divide-y divide-slate-100 mb-4 max-h-72 overflow-y-auto">
          <li v-for="a in roster" :key="a.id" class="py-2 flex items-center justify-between text-sm">
            <span class="flex items-center gap-2 min-w-0">
              <Avatar :label="initials(a.player)" shape="circle" class="shrink-0" style="background-color: #f1f5f9; color: #475569" />
              <span class="truncate">{{ fullName(a.player) }}</span>
            </span>
            <Button icon="pi pi-times" severity="danger" text rounded size="small" aria-label="Retirer" class="shrink-0" @click="onRemovePlayer(a.player.id)" />
          </li>
          <li v-if="!roster.length" class="py-2 text-slate-400 text-sm">Aucun joueur dans ce groupe.</li>
        </ul>
        <div class="flex gap-2">
          <Dropdown
            v-model="playerToAdd"
            :options="availablePlayers"
            option-label="label"
            option-value="value"
            placeholder="Ajouter un joueur…"
            filter
            reset-filter-on-hide
            class="flex-1 min-w-0"
          />
          <Button label="Ajouter" @click="onAddPlayer" />
        </div>
      </div>
    </Dialog>
  </AppLayout>
</template>
