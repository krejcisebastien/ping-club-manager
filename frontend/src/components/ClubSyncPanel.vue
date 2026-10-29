<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";
import { api } from "../lib/api.js";

// Resynchronisation TabT de tous les joueurs du club, sans attendre la tâche
// de la nuit. Elle tourne sur le serveur : on suit son avancement toutes les
// 5 secondes, et on peut quitter la page pendant ce temps.
const emit = defineEmits(["finished"]);
const toast = useToast();
const sync = ref(null);
const starting = ref(false);
let timer = null;

const running = computed(() => !!sync.value?.running);
const progress = computed(() => (sync.value?.total ? Math.round((sync.value.done / sync.value.total) * 100) : 0));
const formatTime = (d) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function poll() {
  clearTimeout(timer);
  timer = setTimeout(refresh, 5000);
}
async function refresh() {
  const wasRunning = running.value;
  const { data } = await api.get("/competitions/sync");
  sync.value = data.sync;
  if (running.value) poll();
  else if (wasRunning) emit("finished");
}
async function start() {
  starting.value = true;
  try {
    const { data } = await api.post("/competitions/sync");
    sync.value = data.sync;
    poll();
  } catch (err) {
    if (err.response?.data?.sync) sync.value = err.response.data.sync;
    toast.add({ severity: "warn", summary: "Resynchronisation", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 5000 });
    if (running.value) poll();
  } finally {
    starting.value = false;
  }
}
onMounted(refresh);
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <section class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
    <div class="flex-1 min-w-0">
      <h2 class="font-medium text-slate-800">Données TabT</h2>
      <p v-if="running" class="text-sm text-slate-600 mt-0.5" role="status">
        Resynchronisation en cours : {{ sync.done }} / {{ sync.total }} joueurs. Tu peux quitter la page.
      </p>
      <p v-else-if="sync?.finishedAt" class="text-sm mt-0.5" :class="sync.error || sync.failed ? 'text-amber-700' : 'text-slate-600'" role="status">
        Club resynchronisé à {{ formatTime(sync.finishedAt) }} : {{ sync.done - sync.failed }} joueur(s) à jour<template v-if="sync.failed">, {{ sync.failed }} en erreur</template>.
        <template v-if="sync.error"> {{ sync.error }}</template>
      </p>
      <p v-else class="text-sm text-slate-500 mt-0.5">Mises à jour chaque nuit. Tu peux aussi relancer tout le club maintenant (une fois par heure).</p>
      <div v-if="running" class="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
        <div class="h-full bg-sky-600 transition-all" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>
    <Button
      label="Tout resynchroniser"
      icon="pi pi-refresh"
      size="small"
      outlined
      class="w-full sm:w-auto shrink-0"
      :loading="starting || running"
      :disabled="starting || running"
      @click="start"
    />
  </section>
</template>
