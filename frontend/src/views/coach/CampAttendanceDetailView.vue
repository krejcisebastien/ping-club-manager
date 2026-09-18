<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import InputSwitch from "primevue/inputswitch";
import Avatar from "primevue/avatar";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const periodGroupId = route.params.periodGroupId;

const attendance = ref([]);
const saving = ref(false);

const presentCount = computed(() => attendance.value.filter((r) => r.present).length);

function initials(row) {
  return `${row.firstName?.[0] ?? ""}${row.lastName?.[0] ?? ""}`.toUpperCase();
}

onMounted(async () => {
  const { data } = await api.get(`/camp-period-groups/${periodGroupId}/attendance`);
  attendance.value = data.attendance;
});

function markAll(present) {
  attendance.value.forEach((row) => (row.present = present));
}

async function onSave() {
  saving.value = true;
  try {
    await api.put(`/camp-period-groups/${periodGroupId}/attendance`, {
      records: attendance.value.map(({ playerId, present }) => ({ playerId, present })),
    });
    toast.add({ severity: "success", summary: "Présences enregistrées", life: 3000 });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AppLayout title="Feuille de présence — stage" :nav-links="navLinks">
    <Button label="Retour" icon="pi pi-arrow-left" text class="mb-3 -ml-2" @click="router.back()" />

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div class="flex items-center justify-between mb-3">
        <p class="text-sm font-medium text-slate-600">{{ presentCount }} / {{ attendance.length }} présent(s)</p>
        <div class="flex gap-1">
          <Button label="Tous présents" size="small" text @click="markAll(true)" />
          <Button label="Tous absents" size="small" text severity="danger" @click="markAll(false)" />
        </div>
      </div>

      <ul class="divide-y divide-slate-100 mb-4">
        <li v-for="row in attendance" :key="row.playerId" class="py-3 flex items-center gap-3">
          <Avatar :label="initials(row)" shape="circle" class="shrink-0" :style="{ backgroundColor: row.present ? '#dcfce7' : '#f1f5f9', color: row.present ? '#166534' : '#64748b' }" />
          <span class="flex-1 font-medium text-slate-700">{{ row.firstName }} {{ row.lastName }}</span>
          <InputSwitch v-model="row.present" />
        </li>
        <li v-if="!attendance.length" class="py-2 text-slate-400 text-sm">Aucun joueur inscrit sur ce groupe.</li>
      </ul>

      <Button label="Enregistrer" :loading="saving" @click="onSave" />
    </div>
  </AppLayout>
</template>
