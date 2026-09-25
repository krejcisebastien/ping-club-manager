<script setup>
import { ref, computed, onMounted } from "vue";
import Button from "primevue/button";
import InputNumber from "primevue/inputnumber";
import SelectButton from "primevue/selectbutton";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { COACH_LEVEL_LABELS, SERIES_LABELS } from "../../lib/ranking.js";

const navLinks = useNavLinks();
const toast = useToast();

const basisOptions = [
  { label: "À l'heure", value: "HOUR" },
  { label: "À la séance", value: "SESSION" },
];

const rates = ref([]);
const caps = ref([]);
const saving = ref(false);

const coachRates = computed(() => rates.value.filter((r) => r.category === "COACH_LEVEL"));
const sparringRates = computed(() => rates.value.filter((r) => r.category === "SPARRING_SERIES"));

// Un seul montant par niveau, interprété selon la base choisie (à l'heure ou à la séance).
async function load() {
  // Anciennes données : si seul l'autre montant est renseigné, on le reprend avec sa base.
  rates.value = (await api.get("/rates")).data.rates.map((r) => {
    let basis = r.basis;
    if (basis === "HOUR" && r.hourlyRate == null && r.sessionRate != null) basis = "SESSION";
    if (basis === "SESSION" && r.sessionRate == null && r.hourlyRate != null) basis = "HOUR";
    return { category: r.category, code: r.code, basis, amount: basis === "SESSION" ? r.sessionRate : r.hourlyRate };
  });
  // Plafonds : rien de paramétré -> on propose l'année en cours avec les valeurs par défaut.
  const { data } = await api.get("/rates/caps");
  caps.value = data.caps.length ? data.caps : [{ year: new Date().getFullYear(), ...data.defaults }];
}

function addCapYear() {
  const last = caps.value.reduce((a, b) => (b.year > (a?.year ?? 0) ? b : a), null);
  caps.value.push({ year: (last?.year ?? new Date().getFullYear() - 1) + 1, perDay: last?.perDay ?? null, perYear: last?.perYear ?? null });
}

function removeCapYear(index) {
  caps.value.splice(index, 1);
}
onMounted(load);

async function onSave() {
  saving.value = true;
  try {
    const payload = rates.value.map(({ category, code, basis, amount }) => ({
      category,
      code,
      basis,
      hourlyRate: basis === "HOUR" ? amount ?? null : null,
      sessionRate: basis === "SESSION" ? amount ?? null : null,
    }));
    await api.put("/rates", { rates: payload });
    await api.put("/rates/caps", { caps: caps.value });
    toast.add({ severity: "success", summary: "Tarifs et plafonds enregistrés", life: 3000 });
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AppLayout title="Tarifs" :nav-links="navLinks">
    <p class="text-sm text-slate-500 mb-4 max-w-3xl">
      Pour chaque niveau, renseigne un montant puis choisis s'il s'applique à l'heure ou à la séance. À la séance, chaque séance
      d'entrainement et chaque période de stage compte pour un forfait ; à l'heure, on multiplie la durée par le tarif horaire.
    </p>

    <div class="grid gap-4 lg:grid-cols-2 max-w-5xl">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-1">Entraineurs — niveau Adeps</p>
        <p class="text-xs text-slate-400 mb-3">Selon le niveau attribué à chaque entraineur.</p>
        <ul class="grid gap-4">
          <li v-for="r in coachRates" :key="r.code" class="grid gap-2">
            <span class="text-sm font-medium text-slate-700">{{ COACH_LEVEL_LABELS[r.code] }}</span>
            <div class="grid gap-2 sm:grid-cols-[10rem_1fr] sm:items-center">
              <InputNumber v-model="r.amount" mode="currency" currency="EUR" locale="fr-BE" :min="0" :max-fraction-digits="2" placeholder="—" :aria-label="`Montant ${r.basis === 'SESSION' ? 'par séance' : 'par heure'}`" class="w-full" input-class="w-full text-right" />
              <SelectButton v-model="r.basis" :options="basisOptions" option-label="label" option-value="value" :allow-empty="false" class="w-full flex" />
            </div>
          </li>
        </ul>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <p class="text-sm font-medium text-slate-600 mb-1">Sparrings — série</p>
        <p class="text-xs text-slate-400 mb-3">Déduite du classement du sparring (NC compte dans la série E).</p>
        <ul class="grid gap-4">
          <li v-for="r in sparringRates" :key="r.code" class="grid gap-2">
            <span class="text-sm font-medium text-slate-700">{{ SERIES_LABELS[r.code] }}</span>
            <div class="grid gap-2 sm:grid-cols-[10rem_1fr] sm:items-center">
              <InputNumber v-model="r.amount" mode="currency" currency="EUR" locale="fr-BE" :min="0" :max-fraction-digits="2" placeholder="—" :aria-label="`Montant ${r.basis === 'SESSION' ? 'par séance' : 'par heure'}`" class="w-full" input-class="w-full text-right" />
              <SelectButton v-model="r.basis" :options="basisOptions" option-label="label" option-value="value" :allow-empty="false" class="w-full flex" />
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mt-4 max-w-5xl">
      <p class="text-sm font-medium text-slate-600 mb-1">Plafonds des indemnités de volontariat</p>
      <p class="text-xs text-slate-400 mb-3">
        Par année civile, identiques pour les entraineurs et les sparrings. Une année sans ligne reprend les plafonds de la plus récente
        année précédente.
      </p>
      <div class="grid gap-3">
        <div class="hidden sm:grid grid-cols-[6rem_1fr_1fr_2.5rem] gap-2 text-xs text-slate-400">
          <span>Année</span><span>€ / jour</span><span>€ / an</span><span></span>
        </div>
        <div v-for="(c, i) in caps" :key="i" class="grid grid-cols-2 sm:grid-cols-[6rem_1fr_1fr_2.5rem] gap-2 items-end sm:items-center">
          <div class="col-span-2 sm:col-span-1 flex items-center gap-2">
            <InputNumber v-model="c.year" :use-grouping="false" :min="2000" :max="2100" aria-label="Année" class="flex-1" input-class="w-full" />
            <Button icon="pi pi-trash" severity="danger" text rounded aria-label="Retirer l'année" class="sm:!hidden" @click="removeCapYear(i)" />
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1 sm:hidden">€ / jour</label>
            <InputNumber v-model="c.perDay" mode="currency" currency="EUR" locale="fr-BE" :min="0" :max-fraction-digits="2" aria-label="Plafond par jour" class="w-full" input-class="w-full text-right" />
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1 sm:hidden">€ / an</label>
            <InputNumber v-model="c.perYear" mode="currency" currency="EUR" locale="fr-BE" :min="0" :max-fraction-digits="2" aria-label="Plafond par an" class="w-full" input-class="w-full text-right" />
          </div>
          <Button icon="pi pi-trash" severity="danger" text rounded aria-label="Retirer l'année" class="!hidden sm:!inline-flex" @click="removeCapYear(i)" />
        </div>
      </div>
      <Button label="Ajouter une année" icon="pi pi-plus" text class="mt-2" @click="addCapYear" />
    </div>

    <Button label="Enregistrer les tarifs et plafonds" :loading="saving" class="mt-4" @click="onSave" />
  </AppLayout>
</template>
