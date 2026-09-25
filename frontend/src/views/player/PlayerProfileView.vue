<script setup>
import { ref, watch } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Calendar from "primevue/calendar";
import Dropdown from "primevue/dropdown";
import { useToast } from "primevue/usetoast";
import ImageUpload from "../../components/ImageUpload.vue";
import { api } from "../../lib/api.js";
import { toDateOnly } from "../../lib/date.js";
import { usePlayerSpace } from "../../composables/usePlayerSpace.js";

const toast = useToast();
const { player } = usePlayerSpace();

const handOptions = [
  { label: "Droitier", value: "RIGHT" },
  { label: "Gaucher", value: "LEFT" },
];

const form = ref({});
const saving = ref(false);

function fillForm(p) {
  form.value = {
    firstName: p.firstName,
    lastName: p.lastName,
    birthDate: p.birthDate ? new Date(p.birthDate) : null,
    phone: p.phone ?? "",
    emergencyContactName: p.emergencyContactName ?? "",
    emergencyContactPhone: p.emergencyContactPhone ?? "",
    dominantHand: p.dominantHand ?? null,
    photoUrl: p.photoUrl ?? null,
  };
}
watch(player, (p) => p && fillForm(p), { immediate: true });

async function onSave() {
  saving.value = true;
  try {
    const { data } = await api.put(`/players/${player.value.id}/profile`, {
      ...form.value,
      birthDate: toDateOnly(form.value.birthDate),
    });
    player.value = data.player;
    toast.add({ severity: "success", summary: "Fiche mise à jour", life: 3000 });
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form class="grid gap-4 max-w-3xl" @submit.prevent="onSave">
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 grid gap-3">
      <p class="text-sm font-medium text-slate-600">Identité</p>
      <div>
        <label class="text-xs text-slate-500 block mb-1">Photo</label>
        <ImageUpload v-model="form.photoUrl" :max-size-mb="1" />
      </div>
      <div class="grid sm:grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Nom</label>
          <InputText v-model="form.lastName" required class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Prénom</label>
          <InputText v-model="form.firstName" required class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Date de naissance</label>
          <Calendar v-model="form.birthDate" date-format="dd/mm/yy" show-icon required :max-date="new Date()" class="w-full" input-class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">N° de licence</label>
          <InputText :model-value="player.licenseNumber ?? '—'" disabled class="w-full" />
          <p class="text-xs text-slate-400 mt-1">Modifiable uniquement par le club.</p>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 grid gap-3">
      <p class="text-sm font-medium text-slate-600">Coordonnées</p>
      <div>
        <label class="text-xs text-slate-500 block mb-1">Téléphone</label>
        <InputText v-model="form.phone" type="tel" class="w-full" />
      </div>
      <div class="grid sm:grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Contact d'urgence</label>
          <InputText v-model="form.emergencyContactName" placeholder="Nom" class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">N° d'urgence</label>
          <InputText v-model="form.emergencyContactPhone" type="tel" class="w-full" />
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 grid gap-3">
      <p class="text-sm font-medium text-slate-600">Mon jeu</p>
      <div class="grid sm:grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Main</label>
          <Dropdown v-model="form.dominantHand" :options="handOptions" option-label="label" option-value="value" placeholder="Choisir…" show-clear class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Style de jeu</label>
          <InputText :model-value="player.playStyle || '—'" disabled class="w-full" />
          <p class="text-xs text-slate-400 mt-1">Défini par ton entraineur.</p>
        </div>
      </div>
    </div>

    <Button type="submit" label="Enregistrer" :loading="saving" class="w-fit" />
  </form>
</template>
