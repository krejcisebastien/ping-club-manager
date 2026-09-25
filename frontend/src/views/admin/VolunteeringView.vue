<script setup>
import { ref, computed, watch, onMounted } from "vue";
import Button from "primevue/button";
import Calendar from "primevue/calendar";
import Dropdown from "primevue/dropdown";
import SelectButton from "primevue/selectbutton";
import Tag from "primevue/tag";
import { useToast } from "primevue/usetoast";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { toDateOnly } from "../../lib/date.js";
import { fullName } from "../../lib/name.js";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { COACH_LEVEL_LABELS, SERIES_LABELS } from "../../lib/ranking.js";

const navLinks = useNavLinks();
const toast = useToast();

const LINES_PER_SHEET = 10;
const typeOptions = [
  { label: "Entraineur", value: "coach" },
  { label: "Sparring", value: "sparring" },
];

const type = ref("coach");
const personId = ref(null);
const coaches = ref([]);
const sparrings = ref([]);

// Une fiche par mois : par défaut le mois précédent.
const today = new Date();
const month = ref(new Date(today.getFullYear(), today.getMonth() - 1, 1));
const from = computed(() => month.value && new Date(month.value.getFullYear(), month.value.getMonth(), 1));
const to = computed(() => month.value && new Date(month.value.getFullYear(), month.value.getMonth() + 1, 0));
const monthLabel = computed(() => month.value?.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));

const sheet = ref(null);
const loading = ref(false);
const downloading = ref(false);

const people = computed(() => (type.value === "coach" ? coaches.value : sparrings.value).map((p) => ({ label: fullName(p), value: p.id })));
const sheetCount = computed(() => Math.max(1, Math.ceil((sheet.value?.lines.length ?? 0) / LINES_PER_SHEET)));
const params = computed(() => ({ type: type.value, id: personId.value, from: toDateOnly(from.value), to: toDateOnly(to.value) }));
const ready = computed(() => personId.value && month.value);

const eur = (n) => (n == null ? "—" : new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(n));
const hours = (n) => `${String(n).replace(".", ",")} h`;
const dateLabel = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
const rateLabel = computed(() => {
  const r = sheet.value?.rate;
  if (!r) return "Pas de tarif";
  const amount = r.basis === "SESSION" ? r.sessionRate : r.hourlyRate;
  return amount == null ? "Pas de tarif" : `${eur(amount)} / ${r.basis === "SESSION" ? "séance" : "heure"}`;
});
const categoryLabel = computed(() => {
  const p = sheet.value?.person;
  if (!p?.code) return null;
  return p.category === "COACH_LEVEL" ? COACH_LEVEL_LABELS[p.code] : SERIES_LABELS[p.code];
});

onMounted(async () => {
  const [c, s] = await Promise.all([api.get("/coaches"), api.get("/sparrings")]);
  coaches.value = c.data.coaches;
  sparrings.value = s.data.sparrings;
});

async function loadSheet() {
  sheet.value = null;
  if (!ready.value) return;
  loading.value = true;
  try {
    sheet.value = (await api.get("/volunteering", { params: params.value })).data.sheet;
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  } finally {
    loading.value = false;
  }
}

watch(type, () => (personId.value = null));
watch([personId, month], loadSheet);

async function download() {
  downloading.value = true;
  try {
    const response = await api.get("/volunteering/export", { params: params.value, responseType: "blob" });
    const name = /filename="(.+)"/.exec(response.headers["content-disposition"] ?? "")?.[1] ?? "note-de-defraiement.xlsx";
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.add({ severity: "error", summary: "Erreur", detail: "Le fichier n'a pas pu être généré.", life: 4000 });
  } finally {
    downloading.value = false;
  }
}
</script>

<template>
  <AppLayout title="Fiches bénévolat" :nav-links="navLinks">
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
      <p class="text-xs text-slate-400 mb-3">
        Prépare la note de défraiement d'un entraineur ou d'un sparring : une ligne par séance d'entrainement ou période de stage où il est
        affecté (séances annulées exclues), valorisée selon son tarif (à l'heure ou à la séance).
      </p>
      <div class="grid gap-3 sm:grid-cols-3">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Bénévole</label>
          <SelectButton v-model="type" :options="typeOptions" option-label="label" option-value="value" :allow-empty="false" class="w-full flex" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Personne</label>
          <Dropdown v-model="personId" :options="people" option-label="label" option-value="value" filter placeholder="Choisir…" class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Mois</label>
          <Calendar v-model="month" view="month" date-format="MM yy" show-icon class="w-full" input-class="w-full capitalize" />
        </div>
      </div>
    </div>

    <p v-if="!personId" class="text-sm text-slate-400">Choisis une personne et un mois.</p>
    <p v-else-if="loading" class="text-sm text-slate-400">Calcul en cours…</p>

    <div v-else-if="sheet" class="space-y-4">
      <div v-if="sheet.warnings.length" class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
        <p v-for="w in sheet.warnings" :key="w"><i class="pi pi-exclamation-triangle mr-2"></i>{{ w }}</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div class="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div class="min-w-0">
            <p class="font-medium text-slate-800">{{ sheet.person.lastName }} {{ sheet.person.firstName }}</p>
            <p class="text-xs text-slate-500">{{ sheet.person.address || "Adresse non renseignée" }}</p>
            <p class="text-xs text-slate-500">{{ sheet.person.iban || "N° de compte non renseigné" }}</p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <Tag v-if="categoryLabel" severity="info" :value="categoryLabel" />
            <Tag severity="secondary" :value="rateLabel" />
          </div>
        </div>

        <ul class="divide-y divide-slate-100 text-sm">
          <!-- Mobile : date | montant, puis nature | heures ; à partir de sm : 4 colonnes. -->
          <li class="py-2 hidden sm:grid grid-cols-[9rem_5rem_1fr_6rem] gap-2 text-xs text-slate-400">
            <span>Date</span><span class="text-right">Heures</span><span>Nature de la prestation</span><span class="text-right">Total</span>
          </li>
          <li v-for="line in sheet.lines" :key="line.id" class="py-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 sm:grid-cols-[9rem_5rem_1fr_6rem] sm:gap-2 items-baseline">
            <span class="capitalize font-medium sm:font-normal">{{ dateLabel(line.date) }}</span>
            <span class="order-4 sm:order-none text-right tabular-nums">{{ hours(line.hours) }}</span>
            <span class="order-3 sm:order-none min-w-0 text-slate-600">{{ line.nature }} <span class="text-slate-400 whitespace-nowrap">{{ line.startTime }}–{{ line.endTime }}</span></span>
            <span class="order-2 sm:order-none text-right tabular-nums font-medium" :class="line.dayOverCap ? 'text-amber-600' : ''">{{ eur(line.amount) }}</span>
          </li>
          <li v-if="!sheet.lines.length" class="py-3 text-slate-400">Aucune prestation en {{ monthLabel }}.</li>
          <li v-else class="py-2 grid grid-cols-[1fr_auto] gap-x-3 sm:grid-cols-[9rem_5rem_1fr_6rem] sm:gap-2 font-semibold">
            <span>Total</span><span class="order-4 sm:order-none text-right tabular-nums">{{ hours(sheet.totalHours) }}</span><span class="order-3 sm:order-none"></span>
            <span class="order-2 sm:order-none text-right tabular-nums">{{ eur(sheet.total) }}</span>
          </li>
        </ul>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div class="flex items-baseline justify-between text-sm mb-2">
          <span class="text-slate-600">Cumul {{ sheet.year.year }} (du 1er janvier au {{ dateLabel(sheet.to) }})</span>
          <span class="tabular-nums"><strong>{{ eur(sheet.year.total) }}</strong> <span class="text-slate-400">/ {{ eur(sheet.year.cap) }}</span></span>
        </div>
        <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div class="h-full rounded-full" :class="sheet.year.total > sheet.year.cap ? 'bg-red-500' : 'bg-sky-500'" :style="{ width: `${Math.min(100, (sheet.year.total / sheet.year.cap) * 100)}%` }"></div>
        </div>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <Button label="Télécharger la note (Excel)" icon="pi pi-file-excel" :loading="downloading" :disabled="!sheet.lines.length" @click="download" />
        <span v-if="sheetCount > 1" class="text-xs text-slate-500">{{ sheet.lines.length }} séances : le fichier contiendra {{ sheetCount }} feuilles de {{ LINES_PER_SHEET }} lignes.</span>
      </div>
    </div>
  </AppLayout>
</template>
