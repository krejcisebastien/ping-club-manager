<script setup>
import { ref, onMounted, watch, computed } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";
import Avatar from "primevue/avatar";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { useAuthStore } from "../../stores/auth.js";
import { fullName, initials } from "../../lib/name.js";

const navLinks = useNavLinks();
const auth = useAuthStore();
const toast = useToast();

const seasons = ref([]);
const selectedSeasonId = ref("");
const groups = ref([]);
const allPlayers = ref([]);
const loading = ref(true);

// Teintes des pastilles d'icône et des avatars, attribuées par position.
const GROUP_TONES = ["bg-brand-50 text-brand-600", "bg-emerald-50 text-emerald-600", "bg-violet-50 text-violet-600", "bg-orange-50 text-orange-700"];
const AVATAR_TONES = [
  ["#dbe8fe", "#1d42d8"], ["#d1fae5", "#047857"], ["#ffedd5", "#c2410c"], ["#ede9fe", "#6d28d9"], ["#ffe4e6", "#be123c"],
];
const MAX_FACES = 6;

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
    <div class="mb-5">
      <h2 class="page-title">Groupes</h2>
      <p class="page-subtitle">{{ groups.length }} groupe(s)</p>
    </div>
    <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 mb-4">
      <Dropdown v-model="selectedSeasonId" :options="seasons" option-label="name" option-value="id" class="w-full sm:w-56" aria-label="Saison" />
      <Button v-if="auth.isAdmin" class="w-full sm:w-auto sm:ml-auto" label="Nouveau groupe" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div v-if="loading" class="text-slate-400 text-sm py-4">Chargement…</div>
    <p v-else-if="!groups.length" class="text-slate-400 text-sm py-4">
      Aucun groupe pour cette saison.
    </p>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div
        v-for="(g, gi) in groups"
        :key="g.id"
        class="card p-5 flex flex-col gap-4 hover:shadow-md hover:border-brand-200 transition-shadow cursor-pointer"
        @click="openManage(g)"
      >
        <div class="flex items-start gap-3">
          <span class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :class="GROUP_TONES[gi % GROUP_TONES.length]">
            <i class="pi pi-users" aria-hidden="true"></i>
          </span>
          <div class="flex-1 min-w-0">
            <h3 class="text-[1.0625rem] font-bold text-slate-900 truncate" :title="g.name">{{ g.name }}</h3>
            <p v-if="g.rankingCriteria" class="text-[0.8125rem] text-slate-500 whitespace-nowrap truncate">{{ g.rankingCriteria }}</p>
          </div>
          <Button v-if="auth.isAdmin" icon="pi pi-pencil" severity="secondary" text rounded aria-label="Modifier le groupe" @click.stop="openEdit(g)" />
        </div>

        <div class="flex items-center flex-wrap gap-y-2">
          <template v-if="g.players.length">
            <span
              v-for="(p, i) in g.players.slice(0, MAX_FACES)"
              :key="p.id"
              class="w-[34px] h-[34px] rounded-full border-2 border-white inline-flex items-center justify-center text-[11px] font-bold"
              :class="i ? '-ml-2' : ''"
              :style="{ background: AVATAR_TONES[(i + gi) % 5][0], color: AVATAR_TONES[(i + gi) % 5][1] }"
              :title="fullName(p)"
            >{{ initials(p) }}</span>
            <span v-if="g.playerCount > Math.min(g.players.length, MAX_FACES)" class="ml-3 text-[0.8125rem] text-slate-500">
              + {{ g.playerCount - Math.min(g.players.length, MAX_FACES) }} autres
            </span>
          </template>
          <span v-else class="text-[0.8125rem] text-slate-400">Aucun joueur.</span>
          <span class="ml-auto inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-semibold whitespace-nowrap">
            {{ g.playerCount }} joueur{{ g.playerCount > 1 ? "s" : "" }}
          </span>
        </div>
      </div>
    </div>

    <Dialog v-model:visible="groupDialogVisible" :header="editingGroupId ? 'Modifier le groupe' : 'Nouveau groupe'" modal style="width: 26rem" class="mx-4">
      <form class="grid grid-cols-1 gap-3 pt-2" @submit.prevent="onSaveGroup">
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
