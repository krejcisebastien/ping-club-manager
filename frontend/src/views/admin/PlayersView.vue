<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Avatar from "primevue/avatar";
import InputText from "primevue/inputtext";
import Calendar from "primevue/calendar";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { toDateOnly } from "../../lib/date.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

const emptyForm = () => ({ firstName: "", lastName: "", birthDate: null, licenseNumber: "" });

const players = ref([]);
const loading = ref(true);
const dialogVisible = ref(false);
const form = ref(emptyForm());
const saving = ref(false);

async function load() {
  loading.value = true;
  const { data } = await api.get("/players");
  players.value = data.players;
  loading.value = false;
}

onMounted(load);

function openCreate() {
  form.value = emptyForm();
  dialogVisible.value = true;
}

async function onCreate() {
  saving.value = true;
  try {
    await api.post("/players", {
      ...form.value,
      birthDate: toDateOnly(form.value.birthDate),
    });
    dialogVisible.value = false;
    toast.add({ severity: "success", summary: "Joueur créé", life: 3000 });
    await load();
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}

function onDelete(player) {
  confirm.require({
    message: `Supprimer ${player.firstName} ${player.lastName} ? Toutes ses données seront perdues.`,
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Supprimer",
    acceptClass: "p-button-danger",
    rejectLabel: "Annuler",
    rejectClass: "p-button-secondary p-button-outlined",
    accept: async () => {
      await api.delete(`/players/${player.id}`);
      toast.add({ severity: "success", summary: "Joueur supprimé", life: 3000 });
      await load();
    },
  });
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("fr-FR");
}
</script>

<template>
  <AppLayout title="Joueurs" :nav-links="navLinks">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-sm font-medium text-slate-600">{{ players.length }} joueur(s)</h2>
      <Button label="Nouveau joueur" icon="pi pi-plus" @click="openCreate" />
    </div>

    <DataTable :value="players" :loading="loading" class="bg-white rounded-xl shadow border border-slate-200 overflow-hidden" striped-rows @row-click="router.push(`/admin/players/${$event.data.id}`)">
      <template #empty>
        <p class="text-slate-400 text-sm py-4">Aucun joueur.</p>
      </template>
      <Column field="lastName" header="Nom" sortable>
        <template #body="{ data }">
          <div class="flex items-center gap-2 cursor-pointer">
            <Avatar
              :image="data.photoUrl || undefined"
              :label="!data.photoUrl ? `${data.firstName[0]}${data.lastName[0]}`.toUpperCase() : undefined"
              shape="circle"
              class="bg-sky-100 text-sky-700 shrink-0"
            />
            <span>{{ data.firstName }} {{ data.lastName }}</span>
          </div>
        </template>
      </Column>
      <Column field="birthDate" header="Date de naissance" sortable>
        <template #body="{ data }">{{ formatDate(data.birthDate) }}</template>
      </Column>
      <Column field="licenseNumber" header="N° licence" />
      <Column header="" style="width: 4rem">
        <template #body="{ data }">
          <Button icon="pi pi-trash" severity="danger" text rounded aria-label="Supprimer" @click.stop="onDelete(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="dialogVisible" header="Nouveau joueur" modal style="width: 26rem" class="mx-4">
      <form class="grid gap-3 pt-2" @submit.prevent="onCreate">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Prénom</label>
          <InputText v-model="form.firstName" required class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Nom</label>
          <InputText v-model="form.lastName" required class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Date de naissance</label>
          <Calendar v-model="form.birthDate" date-format="dd/mm/yy" show-icon required class="w-full" input-class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">N° de licence (optionnel)</label>
          <InputText v-model="form.licenseNumber" class="w-full" />
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="dialogVisible = false" />
          <Button type="submit" label="Créer" :loading="saving" />
        </div>
      </form>
    </Dialog>
  </AppLayout>
</template>
