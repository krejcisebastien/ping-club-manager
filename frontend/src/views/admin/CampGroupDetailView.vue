<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import CoachAssignmentList from "../../components/CoachAssignmentList.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const groupId = route.params.id;

const group = ref(null);
const editForm = ref({ name: "", trainingPlanId: null });
const savingInfo = ref(false);
const trainingPlans = ref([]);
const coaches = ref([]);
const sparrings = ref([]);

async function loadGroup() {
  const { data } = await api.get(`/camps/groups/${groupId}`);
  group.value = data.group;
  editForm.value = { name: data.group.name, trainingPlanId: data.group.trainingPlanId };
}

onMounted(async () => {
  await loadGroup();
  const [p, c, s] = await Promise.all([
    api.get("/training-plans", { params: { seasonId: group.value.camp.seasonId } }),
    api.get("/coaches"),
    api.get("/sparrings"),
  ]);
  trainingPlans.value = p.data.plans;
  coaches.value = c.data.coaches;
  sparrings.value = s.data.sparrings;
});

async function onSaveInfo() {
  savingInfo.value = true;
  try {
    await api.put(`/camps/groups/${groupId}`, editForm.value);
    toast.add({ severity: "success", summary: "Groupe mis à jour", life: 3000 });
    await loadGroup();
  } finally {
    savingInfo.value = false;
  }
}

async function onAddCoach(payload) {
  await api.post(`/camps/groups/${groupId}/coaches`, payload);
  await loadGroup();
}
async function onRemoveCoach(assignmentId) {
  await api.delete(`/camps/groups/${groupId}/coaches/${assignmentId}`);
  await loadGroup();
}
</script>

<template>
  <AppLayout :title="group ? `Groupe — ${group.name}` : 'Groupe de stage'" :nav-links="navLinks">
    <Button label="Retour" icon="pi pi-arrow-left" text class="mb-3 -ml-2" @click="router.push(`/admin/camps/${group?.campId}`)" />

    <div v-if="group" class="space-y-4">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Informations</p>
        <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="onSaveInfo">
          <InputText v-model="editForm.name" placeholder="Nom" required class="w-full" />
          <Dropdown v-model="editForm.trainingPlanId" :options="trainingPlans" option-label="title" option-value="id" show-clear placeholder="Plan d'entrainement…" class="w-full" />
          <Button type="submit" label="Enregistrer" :loading="savingInfo" class="sm:col-span-2 w-fit" />
        </form>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-1">Encadrants par défaut</p>
        <p class="text-xs text-slate-400 mb-3">Affectés automatiquement à chaque période où ce groupe est programmé. Modifiable ensuite au cas par cas sur une période.</p>
        <CoachAssignmentList :assignments="group.coaches" :coaches="coaches" :sparrings="sparrings" empty-label="Aucun encadrant par défaut." @add="onAddCoach" @remove="onRemoveCoach" />
      </div>
    </div>
  </AppLayout>
</template>
