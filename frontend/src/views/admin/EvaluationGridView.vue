<script setup>
import { ref, computed, onMounted } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { EVALUATION_CRITERIA } from "../../lib/evaluation.js";

// Grille d'évaluation du club : pour chaque critère, les points que les
// entraineurs notent de 1 à 5 ; leur moyenne (x 2) donne la note sur 10.
const navLinks = useNavLinks();
const toast = useToast();
const confirm = useConfirm();

const items = ref([]);
const newLabels = ref(Object.fromEntries(EVALUATION_CRITERIA.map((c) => [c.criterion, ""])));
const editingId = ref(null);
const editingLabel = ref("");

const byCriterion = computed(() =>
  Object.fromEntries(EVALUATION_CRITERIA.map((c) => [c.criterion, items.value.filter((i) => i.criterion === c.criterion)]))
);

const showError = (err) =>
  toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });

async function load() {
  items.value = (await api.get("/evaluation-items")).data.items;
}

async function add(criterion) {
  const label = newLabels.value[criterion].trim();
  if (!label) return;
  try {
    await api.post("/evaluation-items", { criterion, label });
    newLabels.value[criterion] = "";
    await load();
  } catch (err) {
    showError(err);
  }
}

function startEdit(item) {
  editingId.value = item.id;
  editingLabel.value = item.label;
}

async function saveEdit(item) {
  const label = editingLabel.value.trim();
  if (!label) return;
  try {
    await api.put(`/evaluation-items/${item.id}`, { label });
    editingId.value = null;
    await load();
  } catch (err) {
    showError(err);
  }
}

function remove(item) {
  confirm.require({
    message: `Supprimer le point « ${item.label} » ? Les évaluations déjà enregistrées le conservent.`,
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Supprimer",
    acceptClass: "p-button-danger",
    rejectLabel: "Annuler",
    rejectClass: "p-button-secondary p-button-outlined",
    accept: async () => {
      try {
        await api.delete(`/evaluation-items/${item.id}`);
        toast.add({ severity: "success", summary: "Point supprimé", life: 3000 });
        await load();
      } catch (err) {
        showError(err);
      }
    },
  });
}

onMounted(load);
</script>

<template>
  <AppLayout title="Grille d'évaluation" :nav-links="navLinks">
    <p class="text-sm text-slate-500 mb-4">
      Pour chaque critère, liste les points que les entraineurs notent de 1 à 5 lors d'une évaluation. La note du critère sur 10
      est la moyenne des points notés, multipliée par 2. Un critère sans point se note directement sur 10.
    </p>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div v-for="c in EVALUATION_CRITERIA" :key="c.criterion" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 min-w-0">
        <p class="text-sm font-semibold mb-2 flex flex-wrap items-center gap-2">
          <span class="inline-block w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: c.color }"></span>
          {{ c.label }}
          <span class="text-xs font-normal text-slate-400">
            {{ byCriterion[c.criterion].length ? `${byCriterion[c.criterion].length} point(s)` : "note directe sur 10" }}
          </span>
        </p>
        <ul class="divide-y divide-slate-100 mb-3 text-sm">
          <li v-for="item in byCriterion[c.criterion]" :key="item.id" class="py-1.5 flex items-center gap-2">
            <template v-if="editingId === item.id">
              <InputText v-model="editingLabel" class="flex-1 min-w-0" autofocus @keydown.enter.prevent="saveEdit(item)" @keydown.esc="editingId = null" />
              <Button icon="pi pi-check" text rounded aria-label="Enregistrer" @click="saveEdit(item)" />
              <Button icon="pi pi-times" text rounded severity="secondary" aria-label="Annuler" @click="editingId = null" />
            </template>
            <template v-else>
              <span class="flex-1 min-w-0 text-slate-700">{{ item.label }}</span>
              <Button icon="pi pi-pencil" text rounded severity="secondary" aria-label="Modifier" @click="startEdit(item)" />
              <Button icon="pi pi-trash" text rounded severity="danger" aria-label="Supprimer" @click="remove(item)" />
            </template>
          </li>
          <li v-if="!byCriterion[c.criterion].length" class="py-1.5 text-slate-400">Aucun point défini.</li>
        </ul>
        <form class="flex gap-2" @submit.prevent="add(c.criterion)">
          <InputText v-model="newLabels[c.criterion]" placeholder="Nouveau point (ex. placement)" class="flex-1 min-w-0 w-full" />
          <Button type="submit" label="Ajouter" :disabled="!newLabels[c.criterion].trim()" />
        </form>
      </div>
    </div>
  </AppLayout>
</template>
