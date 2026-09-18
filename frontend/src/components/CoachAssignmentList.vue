<script setup>
import { ref, computed } from "vue";
import Button from "primevue/button";
import Dropdown from "primevue/dropdown";
import Avatar from "primevue/avatar";
import Tag from "primevue/tag";

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
  (form.value.type === "coach" ? props.coaches : props.sparrings).map((p) => ({ label: `${p.firstName} ${p.lastName}`, value: p.id }))
);

function personName(a) {
  const p = a.coach ?? a.sparring;
  return `${p.firstName} ${p.lastName}`;
}
function initials(a) {
  const p = a.coach ?? a.sparring;
  return `${p.firstName?.[0] ?? ""}${p.lastName?.[0] ?? ""}`.toUpperCase();
}

function onAdd() {
  if (!form.value.id) return;
  emit("add", form.value.type === "coach" ? { coachId: form.value.id } : { sparringId: form.value.id });
  form.value.id = null;
}
</script>

<template>
  <div>
    <ul class="divide-y divide-slate-100 mb-3">
      <li v-for="a in assignments" :key="a.id" class="py-2 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <Avatar
            :label="initials(a)"
            shape="circle"
            class="shrink-0"
            :style="a.coach ? { backgroundColor: '#e0f2fe', color: '#0369a1' } : { backgroundColor: '#ffedd5', color: '#c2410c' }"
          />
          <span class="font-medium text-slate-700 truncate">{{ personName(a) }}</span>
          <Tag :severity="a.coach ? 'info' : 'warning'" :value="a.coach ? 'Entraineur' : 'Sparring'" />
        </div>
        <Button icon="pi pi-times" severity="danger" text rounded size="small" aria-label="Retirer" class="shrink-0" @click="emit('remove', a.id)" />
      </li>
      <li v-if="!assignments.length" class="py-2 text-slate-400 text-sm">{{ emptyLabel }}</li>
    </ul>
    <div class="flex flex-col gap-2">
      <div class="flex gap-2">
        <Dropdown v-model="form.type" :options="typeOptions" option-label="label" option-value="value" class="w-40 shrink-0" />
        <Dropdown v-model="form.id" :options="personOptions" option-label="label" option-value="value" filter placeholder="Choisir…" class="flex-1 min-w-0" />
      </div>
      <Button label="Affecter" @click="onAdd" />
    </div>
  </div>
</template>
