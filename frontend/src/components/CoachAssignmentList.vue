<script setup>
import { ref, computed } from "vue";
import Button from "primevue/button";
import Dropdown from "primevue/dropdown";
import { fullName, initials as personInitials } from "../lib/name.js";

const props = defineProps({
  assignments: { type: Array, default: () => [] },
  coaches: { type: Array, default: () => [] },
  sparrings: { type: Array, default: () => [] },
  emptyLabel: { type: String, default: "Aucun encadrant affecté." },
});
const emit = defineEmits(["add", "remove"]);

const form = ref({ type: "coach", id: null });

const typeOptions = [
  { label: "Entraineur", value: "coach" },
  { label: "Sparring", value: "sparring" },
];

const personOptions = computed(() =>
  (form.value.type === "coach" ? props.coaches : props.sparrings).map((p) => ({ label: fullName(p), value: p.id }))
);

function personName(a) {
  return fullName(a.coach ?? a.sparring);
}
function initials(a) {
  return personInitials(a.coach ?? a.sparring);
}

function onAdd() {
  if (!form.value.id) return;
  emit("add", form.value.type === "coach" ? { coachId: form.value.id } : { sparringId: form.value.id });
  form.value.id = null;
}
</script>

<template>
  <div>
    <!-- Encadrants : pastille bleue pour un entraineur, violette pour un sparring. -->
    <ul class="flex flex-wrap gap-2 mb-3">
      <li
        v-for="a in assignments"
        :key="a.id"
        class="inline-flex items-center gap-2 max-w-full rounded-full border py-1 pl-1 pr-1.5 text-[0.8125rem] font-semibold text-slate-900"
        :class="a.coach ? 'bg-brand-50 border-brand-100' : 'bg-violet-50 border-violet-100'"
      >
        <span
          class="w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] shrink-0"
          :class="a.coach ? 'bg-brand-100 text-brand-700' : 'bg-violet-100 text-violet-700'"
        >{{ initials(a) }}</span>
        <span class="truncate">{{ personName(a) }}</span>
        <span
          class="rounded-full px-2 py-0.5 text-[11px] font-bold text-white shrink-0"
          :class="a.coach ? 'bg-brand-600' : 'bg-violet-600'"
        >{{ a.coach ? "Entraineur" : "Sparring" }}</span>
        <Button icon="pi pi-times" severity="secondary" text rounded size="small" aria-label="Retirer" class="shrink-0 !w-6 !h-6" @click="emit('remove', a.id)" />
      </li>
      <li v-if="!assignments.length" class="py-1 text-slate-400 text-sm">{{ emptyLabel }}</li>
    </ul>
    <div class="flex flex-col gap-2">
      <div class="flex gap-2">
        <Dropdown v-model="form.type" :options="typeOptions" option-label="label" option-value="value" class="w-40 shrink-0" />
        <Dropdown
          v-model="form.id"
          :options="personOptions"
          option-label="label"
          option-value="value"
          filter
          reset-filter-on-hide
          placeholder="Choisir…"
          class="flex-1 min-w-0"
        />
      </div>
      <Button label="Affecter" @click="onAdd" />
    </div>
  </div>
</template>
