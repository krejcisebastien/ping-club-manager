<script setup>
import { ref, onMounted } from "vue";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";
import Checkbox from "primevue/checkbox";
import Tag from "primevue/tag";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { useTableFilter } from "../../composables/useTableFilter.js";
import { fullName } from "../../lib/name.js";

const navLinks = useNavLinks();
const toast = useToast();
const confirm = useConfirm();
const { filters } = useTableFilter();

const emptyForm = () => ({ firstName: "", lastName: "", ranking: "", isClubMember: false, playerId: null, externalClub: "" });

const sparrings = ref([]);
const players = ref([]);
const loading = ref(true);
const dialogVisible = ref(false);
const editingId = ref(null);
const form = ref(emptyForm());
const saving = ref(false);

async function load() {
  loading.value = true;
  const [s, p] = await Promise.all([api.get("/sparrings"), api.get("/players")]);
  sparrings.value = s.data.sparrings;
  players.value = p.data.players;
  loading.value = false;
}

onMounted(load);

function playerOptions() {
  return players.value.map((p) => ({ label: fullName(p), value: p.id }));
}

function playerName(playerId) {
  return fullName(players.value.find((pl) => pl.id === playerId));
}

function openCreate() {
  editingId.value = null;
  form.value = emptyForm();
  dialogVisible.value = true;
}

function openEdit(sparring) {
  editingId.value = sparring.id;
  form.value = {
    firstName: sparring.firstName,
    lastName: sparring.lastName,
    ranking: sparring.ranking ?? "",
    isClubMember: sparring.isClubMember,
    playerId: sparring.playerId ?? null,
    externalClub: sparring.externalClub ?? "",
  };
  dialogVisible.value = true;
}

async function onSave() {
  saving.value = true;
  try {
    if (editingId.value) {
      await api.put(`/sparrings/${editingId.value}`, form.value);
    } else {
      await api.post("/sparrings", form.value);
    }
    dialogVisible.value = false;
    toast.add({ severity: "success", summary: editingId.value ? "Sparring modifié" : "Sparring créé", life: 3000 });
    await load();
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}

function onDelete(sparring) {
  confirm.require({
    message: `Supprimer ${fullName(sparring)} ?`,
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Supprimer",
    acceptClass: "p-button-danger",
    rejectLabel: "Annuler",
    rejectClass: "p-button-secondary p-button-outlined",
    accept: async () => {
      await api.delete(`/sparrings/${sparring.id}`);
      toast.add({ severity: "success", summary: "Sparring supprimé", life: 3000 });
      await load();
    },
  });
}
</script>

<template>
  <AppLayout title="Sparrings" :nav-links="navLinks">
    <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <h2 class="text-sm font-medium text-slate-600">{{ sparrings.length }} sparring(s)</h2>
      <div class="flex items-center gap-2 flex-1 sm:flex-none flex-wrap">
        <div class="relative flex-1 sm:w-64 min-w-[10rem]">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <InputText v-model="filters.global.value" placeholder="Rechercher…" class="w-full pl-9" />
        </div>
        <Button label="Nouveau sparring" icon="pi pi-plus" @click="openCreate" />
      </div>
    </div>

    <DataTable responsive-layout="stack" breakpoint="768px"
      :value="sparrings"
      :loading="loading"
      v-model:filters="filters"
      :global-filter-fields="['firstName', 'lastName', 'ranking', 'externalClub']"
      paginator
      :rows="10"
      :rows-per-page-options="[10, 25, 50]"
      class="bg-white rounded-xl shadow border border-slate-200 overflow-hidden"
      striped-rows
    >
      <template #empty>
        <p class="text-slate-400 text-sm py-4">{{ filters.global.value ? "Aucun résultat." : "Aucun sparring." }}</p>
      </template>
      <Column field="lastName" header="Nom" sortable>
        <template #body="{ data }">{{ fullName(data) }}</template>
      </Column>
      <Column field="ranking" header="Classement" />
      <Column header="Origine">
        <template #body="{ data }">
          <Tag v-if="data.isClubMember" severity="info" :value="`Club — ${playerName(data.playerId)}`" />
          <Tag v-else severity="secondary" :value="data.externalClub || 'Extérieur'" />
        </template>
      </Column>
      <Column header="" style="width: 7rem">
        <template #body="{ data }">
          <div class="flex gap-1 justify-end">
            <Button icon="pi pi-pencil" severity="secondary" text rounded aria-label="Modifier" @click="openEdit(data)" />
            <Button icon="pi pi-trash" severity="danger" text rounded aria-label="Supprimer" @click="onDelete(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="dialogVisible" :header="editingId ? 'Modifier le sparring' : 'Nouveau sparring'" modal style="width: 28rem" class="mx-4">
      <form class="grid gap-3 pt-2" @submit.prevent="onSave">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Prénom</label>
          <InputText v-model="form.firstName" required class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Nom</label>
          <InputText v-model="form.lastName" required class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Classement (optionnel)</label>
          <InputText v-model="form.ranking" class="w-full" />
        </div>
        <div class="flex items-center gap-2">
          <Checkbox v-model="form.isClubMember" binary input-id="isClubMember" />
          <label for="isClubMember" class="text-sm text-slate-600">Joueur du club</label>
        </div>
        <div v-if="form.isClubMember">
          <label class="text-xs text-slate-500 block mb-1">Joueur</label>
          <Dropdown v-model="form.playerId" :options="playerOptions()" option-label="label" option-value="value" placeholder="Choisir le joueur…" class="w-full" />
        </div>
        <div v-else>
          <label class="text-xs text-slate-500 block mb-1">Club extérieur (optionnel)</label>
          <InputText v-model="form.externalClub" class="w-full" />
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="dialogVisible = false" />
          <Button type="submit" label="Enregistrer" :loading="saving" />
        </div>
      </form>
    </Dialog>
  </AppLayout>
</template>
