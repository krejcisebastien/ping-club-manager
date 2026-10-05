<script setup>
import { ref, computed, nextTick, onMounted } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { EVALUATION_SCALE } from "../../lib/evaluationScale.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { EVALUATION_CRITERIA } from "../../lib/evaluation.js";

// Grille d'évaluation du club : pour chaque critère, les points que les
// entraineurs notent de 1 à 5 ; leur moyenne (x 2) donne la note sur 10.
// Un critère à la fois : sélection du critère (pastilles en mobile, liste à
// gauche sur grand écran), puis sa liste de points et une saisie rapide.
const navLinks = useNavLinks();
const toast = useToast();
const confirm = useConfirm();

const items = ref([]);
const selected = ref(EVALUATION_CRITERIA[0].criterion);
const newLabel = ref("");
const adding = ref(false);
const addInput = ref(null);
const editingId = ref(null);
const editingLabel = ref("");
const editingDescription = ref("");

const current = computed(() => EVALUATION_CRITERIA.find((c) => c.criterion === selected.value));
const countOf = (criterion) => items.value.filter((i) => i.criterion === criterion).length;
const currentItems = computed(() => items.value.filter((i) => i.criterion === selected.value));

const showError = (err) =>
  toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });

async function load() {
  items.value = (await api.get("/evaluation-items")).data.items;
}

function select(criterion) {
  selected.value = criterion;
  editingId.value = null;
  newLabel.value = "";
}

// Ajout rapide : Entrée valide et garde le curseur dans la zone pour enchaîner.
// Plusieurs lignes collées d'un coup = plusieurs points.
async function add() {
  const labels = newLabel.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!labels.length) return;
  adding.value = true;
  try {
    for (const label of labels) await api.post("/evaluation-items", { criterion: selected.value, label });
    newLabel.value = "";
    await load();
  } catch (err) {
    showError(err);
    await load();
  } finally {
    adding.value = false;
    await nextTick();
    addInput.value?.$el?.focus();
  }
}

function onAddKeydown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    add();
  }
}

function startEdit(item) {
  editingId.value = item.id;
  editingLabel.value = item.label;
  editingDescription.value = item.description ?? "";
}

async function saveEdit(item) {
  const label = editingLabel.value.trim();
  const description = editingDescription.value.trim();
  if (!label || (label === item.label && description === (item.description ?? ""))) {
    editingId.value = null;
    return;
  }
  try {
    await api.put(`/evaluation-items/${item.id}`, { label, description });
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
      Choisis un critère et liste les points que les entraineurs notent de 1 à 5. La note du critère sur 10 est la moyenne
      des points notés × 2 ; un critère sans point se note directement sur 10.
    </p>
    <p class="text-xs text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5 mb-4 -mt-2">
      <span v-for="s in EVALUATION_SCALE" :key="s.value"><strong class="font-semibold text-slate-500">{{ s.value }}</strong> = {{ s.label }}</span>
    </p>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-[15rem_minmax(0,1fr)] md:items-start">
      <!-- Critères : pastilles en mobile, liste verticale sur grand écran -->
      <nav class="flex flex-wrap gap-2 md:flex-col md:gap-1 md:bg-white md:rounded-xl md:shadow-sm md:border md:border-slate-200 md:p-2" aria-label="Critères">
        <button
          v-for="c in EVALUATION_CRITERIA"
          :key="c.criterion"
          type="button"
          class="criterion-chip"
          :class="{ active: selected === c.criterion }"
          :aria-pressed="selected === c.criterion"
          @click="select(c.criterion)"
        >
          <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: c.color }"></span>
          <span class="md:flex-1 text-left">{{ c.label }}</span>
          <span class="count">{{ countOf(c.criterion) }}</span>
        </button>
      </nav>

      <!-- Points du critère sélectionné -->
      <section class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 min-w-0">
        <div class="flex items-baseline justify-between gap-3 mb-2">
          <h2 class="text-base font-semibold text-slate-800 flex items-center gap-2">
            <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: current.color }"></span>{{ current.label }}
          </h2>
          <span class="text-xs text-slate-400">{{ currentItems.length ? `${currentItems.length} point(s)` : "note directe sur 10" }}</span>
        </div>

        <ol class="divide-y divide-slate-100 text-sm mb-4">
          <li v-for="(item, index) in currentItems" :key="item.id" class="py-1.5 flex items-center gap-2 min-h-[2.75rem]">
            <span class="w-5 text-xs text-slate-400 tabular-nums shrink-0">{{ index + 1 }}.</span>
            <template v-if="editingId === item.id">
              <div class="flex-1 min-w-0 grid gap-1.5">
                <InputText
                  v-model="editingLabel"
                  class="w-full"
                  autofocus
                  placeholder="Libellé"
                  @keydown.enter.prevent="saveEdit(item)"
                  @keydown.esc="editingId = null"
                />
                <InputText
                  v-model="editingDescription"
                  class="w-full"
                  placeholder="Description (aide à la notation, facultative)"
                  @keydown.enter.prevent="saveEdit(item)"
                  @keydown.esc="editingId = null"
                />
              </div>
              <Button icon="pi pi-check" text rounded aria-label="Enregistrer" class="shrink-0" @click="saveEdit(item)" />
              <Button icon="pi pi-times" text rounded severity="secondary" aria-label="Annuler" class="shrink-0" @click="editingId = null" />
            </template>
            <template v-else>
              <button type="button" class="flex-1 min-w-0 text-left text-slate-700 py-1" title="Modifier" @click="startEdit(item)">
                {{ item.label }}
                <span v-if="item.description" class="block text-xs text-slate-400 leading-snug mt-0.5">{{ item.description }}</span>
              </button>
              <Button icon="pi pi-pencil" text rounded severity="secondary" aria-label="Modifier" class="shrink-0" @click="startEdit(item)" />
              <Button icon="pi pi-trash" text rounded severity="danger" aria-label="Supprimer" class="shrink-0" @click="remove(item)" />
            </template>
          </li>
          <li v-if="!currentItems.length" class="py-3 text-slate-400">
            Aucun point : ce critère se note directement sur 10. Ajoute un premier point ci-dessous.
          </li>
        </ol>

        <form class="add-row" @submit.prevent="add">
          <Textarea
            ref="addInput"
            v-model="newLabel"
            auto-resize
            rows="1"
            :placeholder="`Nouveau point pour « ${current.label} »`"
            class="flex-1 min-w-0 w-full"
            :disabled="adding"
            @keydown="onAddKeydown"
          />
          <Button type="submit" icon="pi pi-plus" aria-label="Ajouter" :loading="adding" :disabled="!newLabel.trim()" class="shrink-0" />
        </form>
        <p class="text-xs text-slate-400 mt-2">Entrée pour ajouter et enchaîner ; colle plusieurs lignes pour ajouter plusieurs points d'un coup.</p>
      </section>
    </div>
  </AppLayout>
</template>

<style scoped>
.criterion-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 9999px;
  background: #fff;
  font-size: 0.875rem;
  color: #334155;
  transition: background-color 0.15s, border-color 0.15s;
}
.criterion-chip:hover {
  background: #f8fafc;
}
.criterion-chip.active {
  border-color: #0284c7;
  background: #f0f9ff;
  color: #0c4a6e;
  font-weight: 600;
}
.criterion-chip .count {
  min-width: 1.4rem;
  padding: 0 0.35rem;
  border-radius: 9999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
}
.criterion-chip.active .count {
  background: #0284c7;
  color: #fff;
}
@media (min-width: 768px) {
  .criterion-chip {
    width: 100%;
    border-color: transparent;
    border-radius: 0.5rem;
  }
  .criterion-chip.active {
    border-color: #bae6fd;
  }
}
.add-row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}
.add-row :deep(textarea) {
  resize: none;
}
</style>
