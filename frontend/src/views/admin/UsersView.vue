<script setup>
import { ref, onMounted } from "vue";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import Dropdown from "primevue/dropdown";
import MultiSelect from "primevue/multiselect";
import Tag from "primevue/tag";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();
const toast = useToast();
const confirm = useConfirm();

const emptyForm = () => ({ email: "", password: "", roles: [], playerIds: [], coachId: null });
const roleOptions = [
  { label: "Administrateur", value: "ADMIN" },
  { label: "Entraineur", value: "COACH" },
  { label: "Joueur", value: "PLAYER" },
];

const users = ref([]);
const players = ref([]);
const coaches = ref([]);
const loading = ref(true);

const createDialogVisible = ref(false);
const form = ref(emptyForm());
const saving = ref(false);

const editDialogVisible = ref(false);
const editingUser = ref(null);
const editForm = ref(emptyForm());

async function loadUsers() {
  loading.value = true;
  const { data } = await api.get("/auth/users");
  users.value = data.users;
  loading.value = false;
}

onMounted(async () => {
  const [p, c] = await Promise.all([api.get("/players"), api.get("/coaches")]);
  players.value = p.data.players;
  coaches.value = c.data.coaches;
  await loadUsers();
});

function playerOptions() {
  return players.value.map((p) => ({ label: `${p.firstName} ${p.lastName}`, value: p.id }));
}
function coachOptions() {
  return coaches.value.map((c) => ({ label: `${c.firstName} ${c.lastName}`, value: c.id }));
}

function openCreate() {
  form.value = emptyForm();
  createDialogVisible.value = true;
}

async function onCreate() {
  saving.value = true;
  try {
    await api.post("/auth/users", form.value);
    createDialogVisible.value = false;
    toast.add({ severity: "success", summary: "Compte créé", life: 3000 });
    await loadUsers();
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}

async function onToggleActive(user) {
  await api.put(`/auth/users/${user.id}`, { isActive: !user.isActive });
  toast.add({ severity: "success", summary: user.isActive ? "Compte désactivé" : "Compte activé", life: 3000 });
  await loadUsers();
}

function onDelete(user) {
  confirm.require({
    message: `Supprimer le compte ${user.email} ?`,
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Supprimer",
    acceptClass: "p-button-danger",
    rejectLabel: "Annuler",
    rejectClass: "p-button-secondary p-button-outlined",
    accept: async () => {
      await api.delete(`/auth/users/${user.id}`);
      toast.add({ severity: "success", summary: "Compte supprimé", life: 3000 });
      await loadUsers();
    },
  });
}

function openEdit(user) {
  editingUser.value = user;
  editForm.value = {
    email: user.email,
    password: "",
    roles: [...user.roles],
    playerIds: user.players.map((p) => p.id),
    coachId: user.coach?.id ?? null,
  };
  editDialogVisible.value = true;
}

async function onSaveEdit() {
  saving.value = true;
  try {
    await api.put(`/auth/users/${editingUser.value.id}`, {
      roles: editForm.value.roles,
      playerIds: editForm.value.playerIds,
      coachId: editForm.value.coachId,
    });
    editDialogVisible.value = false;
    toast.add({ severity: "success", summary: "Compte mis à jour", life: 3000 });
    await loadUsers();
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}

function linkedName(user) {
  if (user.players?.length) return user.players.map((p) => `${p.firstName} ${p.lastName}`).join(", ");
  if (user.coach) return `${user.coach.firstName} ${user.coach.lastName}`;
  return "—";
}

function roleSeverity(role) {
  return { ADMIN: "danger", COACH: "warn", PLAYER: "info" }[role] ?? "secondary";
}
</script>

<template>
  <AppLayout title="Comptes utilisateurs" :nav-links="navLinks">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-sm font-medium text-slate-600">{{ users.length }} compte(s)</h2>
      <Button label="Nouveau compte" icon="pi pi-plus" @click="openCreate" />
    </div>

    <DataTable :value="users" :loading="loading" class="bg-white rounded-xl shadow border border-slate-200 overflow-hidden" striped-rows>
      <template #empty>
        <p class="text-slate-400 text-sm py-4">Aucun compte.</p>
      </template>
      <Column field="email" header="Email" sortable />
      <Column header="Rôle(s)">
        <template #body="{ data }">
          <div class="flex flex-wrap gap-1">
            <Tag v-for="r in data.roles" :key="r" :severity="roleSeverity(r)" :value="r" />
          </div>
        </template>
      </Column>
      <Column header="Rattaché à">
        <template #body="{ data }">
          <span class="text-sm text-slate-600">{{ linkedName(data) }}</span>
        </template>
      </Column>
      <Column header="Statut">
        <template #body="{ data }"><Tag :severity="data.isActive ? 'success' : 'secondary'" :value="data.isActive ? 'actif' : 'inactif'" /></template>
      </Column>
      <Column header="" style="width: 11rem">
        <template #body="{ data }">
          <div class="flex gap-1 justify-end">
            <Button icon="pi pi-pencil" severity="secondary" text rounded aria-label="Modifier" @click="openEdit(data)" />
            <Button
              :icon="data.isActive ? 'pi pi-ban' : 'pi pi-check'"
              severity="secondary"
              text
              rounded
              :aria-label="data.isActive ? 'Désactiver' : 'Activer'"
              @click="onToggleActive(data)"
            />
            <Button icon="pi pi-trash" severity="danger" text rounded aria-label="Supprimer" @click="onDelete(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="createDialogVisible" header="Nouveau compte" modal style="width: 28rem" class="mx-4">
      <form class="grid gap-3 pt-2" @submit.prevent="onCreate">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Email</label>
          <InputText v-model="form.email" type="email" required class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Mot de passe</label>
          <Password v-model="form.password" required toggle-mask :feedback="false" class="w-full" input-class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Rôle(s)</label>
          <MultiSelect v-model="form.roles" :options="roleOptions" option-label="label" option-value="value" placeholder="Choisir un ou plusieurs rôles…" class="w-full" display="chip" />
          <p class="text-xs text-slate-400 mt-1">Un compte peut cumuler plusieurs rôles (ex. entraineur qui est aussi joueur).</p>
        </div>
        <div v-if="form.roles.includes('PLAYER')">
          <label class="text-xs text-slate-500 block mb-1">Joueur(s) rattaché(s)</label>
          <MultiSelect v-model="form.playerIds" :options="playerOptions()" option-label="label" option-value="value" filter placeholder="Choisir un ou plusieurs joueurs…" class="w-full" display="chip" />
          <p class="text-xs text-slate-400 mt-1">Plusieurs joueurs = compte familial partagé.</p>
        </div>
        <div v-if="form.roles.includes('COACH')">
          <label class="text-xs text-slate-500 block mb-1">Entraineur rattaché</label>
          <Dropdown v-model="form.coachId" :options="coachOptions()" option-label="label" option-value="value" placeholder="Choisir l'entraineur…" class="w-full" />
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="createDialogVisible = false" />
          <Button type="submit" label="Créer" :loading="saving" />
        </div>
      </form>
    </Dialog>

    <Dialog v-model:visible="editDialogVisible" header="Modifier le compte" modal style="width: 28rem" class="mx-4">
      <div class="grid gap-3 pt-2">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Rôle(s)</label>
          <MultiSelect v-model="editForm.roles" :options="roleOptions" option-label="label" option-value="value" placeholder="Choisir un ou plusieurs rôles…" class="w-full" display="chip" />
        </div>
        <div v-if="editForm.roles.includes('PLAYER')">
          <label class="text-xs text-slate-500 block mb-1">Joueur(s) rattaché(s)</label>
          <MultiSelect v-model="editForm.playerIds" :options="playerOptions()" option-label="label" option-value="value" filter class="w-full" display="chip" />
        </div>
        <div v-if="editForm.roles.includes('COACH')">
          <label class="text-xs text-slate-500 block mb-1">Entraineur rattaché</label>
          <Dropdown v-model="editForm.coachId" :options="coachOptions()" option-label="label" option-value="value" placeholder="Choisir l'entraineur…" class="w-full" />
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="editDialogVisible = false" />
          <Button label="Enregistrer" :loading="saving" @click="onSaveEdit" />
        </div>
      </div>
    </Dialog>
  </AppLayout>
</template>
