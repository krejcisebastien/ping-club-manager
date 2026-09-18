<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const route = useRoute();
const router = useRouter();
const occurrenceId = route.params.occurrenceId;

const attendance = ref([]);
const saving = ref(false);
const saved = ref(false);

onMounted(async () => {
  const { data } = await api.get(`/occurrences/${occurrenceId}/attendance`);
  attendance.value = data.attendance;
});

async function onSave() {
  saving.value = true;
  saved.value = false;
  try {
    await api.put(`/occurrences/${occurrenceId}/attendance`, {
      records: attendance.value.map(({ playerId, present, note }) => ({ playerId, present, note })),
    });
    saved.value = true;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AppLayout title="Feuille de présence" :nav-links="navLinks">
    <button class="text-sm text-sky-600 hover:underline mb-3" @click="router.back()">← retour</button>

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <ul class="divide-y divide-slate-100 mb-4">
        <li v-for="row in attendance" :key="row.playerId" class="py-2 flex items-center justify-between gap-3">
          <label class="flex items-center gap-2 flex-1">
            <input type="checkbox" v-model="row.present" class="h-4 w-4" />
            <span>{{ row.firstName }} {{ row.lastName }}</span>
          </label>
          <input
            v-model="row.note"
            placeholder="Note (optionnel)"
            class="w-40 rounded-lg border border-slate-300 px-2 py-1 text-sm"
          />
        </li>
        <li v-if="!attendance.length" class="py-2 text-slate-400 text-sm">Aucun joueur dans le groupe de cet entrainement.</li>
      </ul>

      <button
        :disabled="saving"
        class="rounded-lg bg-sky-600 text-white px-4 py-1.5 font-medium hover:bg-sky-700 disabled:opacity-60"
        @click="onSave"
      >
        {{ saving ? "Enregistrement..." : "Enregistrer" }}
      </button>
      <span v-if="saved" class="text-sm text-emerald-600 ml-2">Présences enregistrées.</span>
    </div>
  </AppLayout>
</template>
