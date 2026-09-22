<script setup>
import { ref, onMounted } from "vue";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import Tag from "primevue/tag";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();
const toast = useToast();

const clubs = ref([]);
const loading = ref(true);
const saving = ref(false);

const LICENSE = {
  ACTIVE: { label: "Active", severity: "success" },
  GRACE: { label: "En grâce", severity: "warn" },
  EXPIRED: { label: "Expirée", severity: "danger" },
  PENDING: { label: "Sans licence", severity: "secondary" },
};

const day = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");
const errorMessage = (err) => err.response?.data?.error ?? "Une erreur est survenue.";

async function load() {
  loading.value = true;
  clubs.value = (await api.get("/platform/clubs")).data.clubs;
  loading.value = false;
}
onMounted(load);

function replaceClub(updated) {
  clubs.value = clubs.value.map((c) => (c.id === updated.id ? updated : c));
}

async function extend(club) {
  try {
    replaceClub((await api.put(`/platform/clubs/${club.id}`, { addYears: 1 })).data.club);
    toast.add({ severity: "success", summary: `Licence de ${club.name} prolongée d'un an`, life: 3000 });
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: errorMessage(err), life: 4000 });
  }
}

// ---------- Modifier ----------
const editVisible = ref(false);
const editing = ref(null);
const editForm = ref({ name: "", licenseEndsAt: "" });

function openEdit(club) {
  editing.value = club;
  editForm.value = { name: club.name, licenseEndsAt: day(club.licenseEndsAt) };
  editVisible.value = true;
}

async function saveEdit() {
  saving.value = true;
  try {
    const body = { name: editForm.value.name, licenseEndsAt: editForm.value.licenseEndsAt || null };
    replaceClub((await api.put(`/platform/clubs/${editing.value.id}`, body)).data.club);
    editVisible.value = false;
    toast.add({ severity: "success", summary: "Club mis à jour", life: 3000 });
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: errorMessage(err), life: 4000 });
  } finally {
    saving.value = false;
  }
}

// ---------- Nouveau club ----------
const createVisible = ref(false);
const createForm = ref({ name: "", adminEmail: "", adminPassword: "", licenseEndsAt: "" });

function openCreate() {
  createForm.value = { name: "", adminEmail: "", adminPassword: "", licenseEndsAt: "" };
  createVisible.value = true;
}

async function saveCreate() {
  saving.value = true;
  try {
    const body = { ...createForm.value, licenseEndsAt: createForm.value.licenseEndsAt || undefined };
    await api.post("/platform/clubs", body);
    createVisible.value = false;
    toast.add({ severity: "success", summary: "Club créé", life: 3000 });
    await load();
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: errorMessage(err), life: 4000 });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AppLayout title="Plateforme" :nav-links="navLinks">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-sm font-medium text-slate-600">{{ clubs.length }} club(s)</h2>
      <Button label="Nouveau club" icon="pi pi-plus" @click="openCreate" />
    </div>

    <DataTable
      :value="clubs"
      :loading="loading"
      paginator
      :rows="10"
      :rows-per-page-options="[10, 25, 50]"
      class="bg-white rounded-xl shadow border border-slate-200 overflow-hidden"
      striped-rows
    >
      <template #empty>
        <p class="text-slate-400 text-sm py-4">Aucun club.</p>
      </template>
      <Column field="name" header="Club" sortable>
        <template #body="{ data }">
          <div class="font-medium text-slate-800">{{ data.name }}</div>
          <div class="text-xs text-slate-400">{{ data.slug }}</div>
        </template>
      </Column>
      <Column header="Effectifs">
        <template #body="{ data }">
          <span class="text-sm text-slate-600">{{ data.users }} compte(s) · {{ data.players }} joueur(s)</span>
        </template>
      </Column>
      <Column header="Licence">
        <template #body="{ data }">
          <div class="flex items-center gap-2 flex-wrap">
            <Tag :severity="LICENSE[data.license].severity" :value="LICENSE[data.license].label" />
            <span v-if="data.licenseEndsAt" class="text-sm text-slate-600">{{ day(data.licenseEndsAt) }}</span>
            <Tag v-if="data.stripe" severity="info" value="Stripe" />
          </div>
        </template>
      </Column>
      <Column header="" style="width: 9rem">
        <template #body="{ data }">
          <div class="flex gap-1 justify-end">
            <Button label="+1 an" icon="pi pi-plus" size="small" severity="secondary" outlined :aria-label="`Prolonger ${data.name} d'un an`" @click="extend(data)" />
            <Button icon="pi pi-pencil" severity="secondary" text rounded aria-label="Modifier" @click="openEdit(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="editVisible" header="Modifier le club" modal style="width: 26rem" class="mx-4">
      <form class="grid gap-3 pt-2" @submit.prevent="saveEdit">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Nom du club</label>
          <InputText v-model="editForm.name" required class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Fin de licence</label>
          <InputText v-model="editForm.licenseEndsAt" type="date" class="w-full" />
          <p class="text-xs text-slate-400 mt-1">Vide = aucune licence : le club n'a plus accès à l'application.</p>
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="editVisible = false" />
          <Button type="submit" label="Enregistrer" :loading="saving" />
        </div>
      </form>
    </Dialog>

    <Dialog v-model:visible="createVisible" header="Nouveau club" modal style="width: 28rem" class="mx-4">
      <form class="grid gap-3 pt-2" @submit.prevent="saveCreate">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Nom du club</label>
          <InputText v-model="createForm.name" required class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Email de l'administrateur</label>
          <InputText v-model="createForm.adminEmail" type="email" required class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Mot de passe initial</label>
          <Password v-model="createForm.adminPassword" required toggle-mask :feedback="false" class="w-full" input-class="w-full" />
          <p class="text-xs text-slate-400 mt-1">8 caractères minimum. À transmettre à l'administrateur, qui pourra le changer.</p>
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Fin de licence (optionnel)</label>
          <InputText v-model="createForm.licenseEndsAt" type="date" class="w-full" />
          <p class="text-xs text-slate-400 mt-1">Pour un club payé sur facture. Vide : le club devra régler sa licence lui-même.</p>
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="createVisible = false" />
          <Button type="submit" label="Créer" :loading="saving" />
        </div>
      </form>
    </Dialog>
  </AppLayout>
</template>
