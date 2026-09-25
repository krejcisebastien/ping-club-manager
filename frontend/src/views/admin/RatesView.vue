<script setup>
import { ref, computed, onMounted } from "vue";
import Button from "primevue/button";
import InputNumber from "primevue/inputnumber";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { COACH_LEVEL_LABELS, SERIES_LABELS } from "../../lib/ranking.js";

const navLinks = useNavLinks();
const toast = useToast();

const rates = ref([]);
const saving = ref(false);

const coachRates = computed(() => rates.value.filter((r) => r.category === "COACH_LEVEL"));
const sparringRates = computed(() => rates.value.filter((r) => r.category === "SPARRING_SERIES"));

async function load() {
  rates.value = (await api.get("/rates")).data.rates;
}
onMounted(load);

async function onSave() {
  saving.value = true;
  try {
    await api.put("/rates", { rates: rates.value });
    toast.add({ severity: "success", summary: "Tarifs enregistrés", life: 3000 });
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AppLayout title="Tarifs horaires" :nav-links="navLinks">
    <div class="grid gap-4 md:grid-cols-2 max-w-4xl">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-1">Entraineurs — niveau Adeps</p>
        <p class="text-xs text-slate-400 mb-3">Tarif appliqué selon le niveau attribué à chaque entraineur.</p>
        <ul class="grid gap-3">
          <li v-for="r in coachRates" :key="r.code" class="flex items-center justify-between gap-3">
            <span class="text-sm font-medium text-slate-700">{{ COACH_LEVEL_LABELS[r.code] }}</span>
            <InputNumber v-model="r.hourlyRate" mode="currency" currency="EUR" locale="fr-BE" :min="0" :max-fraction-digits="2" placeholder="—" class="w-40" input-class="w-full text-right" />
          </li>
        </ul>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-1">Sparrings — série</p>
        <p class="text-xs text-slate-400 mb-3">Déduite du classement du sparring (NC compte dans la série E).</p>
        <ul class="grid gap-3">
          <li v-for="r in sparringRates" :key="r.code" class="flex items-center justify-between gap-3">
            <span class="text-sm font-medium text-slate-700">{{ SERIES_LABELS[r.code] }}</span>
            <InputNumber v-model="r.hourlyRate" mode="currency" currency="EUR" locale="fr-BE" :min="0" :max-fraction-digits="2" placeholder="—" class="w-40" input-class="w-full text-right" />
          </li>
        </ul>
      </div>
    </div>

    <Button label="Enregistrer les tarifs" :loading="saving" class="mt-4" @click="onSave" />
  </AppLayout>
</template>
