<script setup>
import { ref, onMounted, watch, computed } from "vue";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";
import Tag from "primevue/tag";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { useTableFilter } from "../../composables/useTableFilter.js";
import { fullName } from "../../lib/name.js";

const navLinks = useNavLinks();
const toast = useToast();
const { filters } = useTableFilter();

const seasons = ref([]);
const selectedSeasonId = ref("");
const groups = ref([]);
const allPlayers = ref([]);
const loading = ref(true);

const selectedGroup = ref(null);
const roster = ref([]);
const playerToAdd = ref(null);

const groupDialogVisible = ref(false);
const editingGroupId = ref(null);
const groupForm = ref({ name: "", rankingCriteria: "" });
const saving = ref(false);

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
  selectedGroup.value = null;
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

function onRowSelect(event) {
  loadRoster(event.data.id);
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

function bumpGroupCount(groupId, delta) {
  const g = groups.value.find((g) => g.id === groupId);
  if (g) g.playerCount = (g.playerCount ?? 0) + delta;
}

async function onAddPlayer() {
  if (!playerToAdd.value) return;
  await api.post(`/groups/${selectedGroup.value.id}/players`, { playerId: playerToAdd.value });
  playerToAdd.value = null;
  await loadRoster(selectedGroup.value.id);
  bumpGroupCount(selectedGroup.value.id, 1);
  toast.add({ severity: "success", summary: "Joueur ajouté au groupe", life: 3000 });
}

async function onRemovePlayer(playerId) {
  await api.delete(`/groups/${selectedGroup.value.id}/players/${playerId}`);
  await loadRoster(selectedGroup.value.id);
  bumpGroupCount(selectedGroup.value.id, -1);
}
</script>

<template>
  <AppLayout title="Groupes d'entrainement" :nav-links="navLinks">
    <div class="mb-4 max-w-xs">
      <label class="text-xs text-slate-500 block mb-1">Saison</label>
      <Dropdown v-model="selectedSeasonId" :options="seasons" option-label="name" option-value="id" class="w-full" />
    </div>

    <div class="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <div class="min-w-0">
        <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h2 class="text-sm font-medium text-slate-600">{{ groups.length }} groupe(s)</h2>
          <div class="flex items-center gap-2 flex-wrap">
            <div class="relative w-40 min-w-[8rem]">
              <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <InputText v-model="filters.global.value" placeholder="Rechercher…" class="w-full pl-9" size="small" />
            </div>
            <Button label="Nouveau groupe" icon="pi pi-plus" size="small" @click="openCreate" />
          </div>
        </div>
        <DataTable
          :value="groups"
          :loading="loading"
          v-model:selection="selectedGroup"
          selection-mode="single"
          data-key="id"
          v-model:filters="filters"
          :global-filter-fields="['name', 'rankingCriteria']"
          paginator
          :rows="10"
          :rows-per-page-options="[10, 25, 50]"
          class="bg-white rounded-xl shadow border border-slate-200 overflow-hidden"
          striped-rows
          @row-select="onRowSelect"
        >
          <template #empty>
            <p class="text-slate-400 text-sm py-4">{{ filters.global.value ? "Aucun résultat." : "Aucun groupe pour cette saison." }}</p>
          </template>
          <Column field="name" header="Nom" sortable />
          <Column field="rankingCriteria" header="Critère de classement" />
          <Column field="playerCount" header="Joueurs" sortable style="width: 6rem">
            <template #body="{ data }">
              <Tag severity="secondary" :value="String(data.playerCount)" />
            </template>
          </Column>
          <Column header="" style="width: 4rem">
            <template #body="{ data }">
              <Button icon="pi pi-pencil" severity="secondary" text rounded aria-label="Modifier" @click.stop="openEdit(data)" />
            </template>
          </Column>
        </DataTable>
      </div>

      <div class="min-w-0">
        <h2 class="text-sm font-medium text-slate-600 mb-3">Composition</h2>
        <div class="bg-white rounded-xl shadow border border-slate-200 p-4">
          <template v-if="selectedGroup">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-medium text-slate-700">{{ selectedGroup.name }}</p>
              <span class="text-xs text-slate-400">{{ roster.length }} joueur(s)</span>
            </div>
            <ul class="divide-y divide-slate-100 mb-4">
              <li v-for="a in roster" :key="a.id" class="py-2 flex items-center justify-between text-sm">
                <span>{{ fullName(a.player) }}</span>
                <Button icon="pi pi-times" severity="danger" text rounded size="small" aria-label="Retirer" @click="onRemovePlayer(a.player.id)" />
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
                class="flex-1"
              />
              <Button label="Ajouter" @click="onAddPlayer" />
            </div>
          </template>
          <p v-else class="text-slate-400 text-sm">Sélectionne un groupe à gauche.</p>
        </div>
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
  </AppLayout>
</template>
