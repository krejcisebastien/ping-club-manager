<script setup>
import { ref, computed } from "vue";
import Button from "primevue/button";
import Dropdown from "primevue/dropdown";
import Avatar from "primevue/avatar";

const props = defineProps({
  assignments: { type: Array, default: () => [] },
  players: { type: Array, default: () => [] },
  emptyLabel: { type: String, default: "Aucun joueur inscrit." },
  placeholder: { type: String, default: "Inscrire un joueur…" },
});
const emit = defineEmits(["add", "remove"]);

const playerToAdd = ref(null);

const availablePlayers = computed(() => {
  const ids = new Set(props.assignments.map((a) => a.player.id));
  return props.players.filter((p) => !ids.has(p.id)).map((p) => ({ label: `${p.firstName} ${p.lastName}`, value: p.id }));
});

function initials(p) {
  return `${p.firstName?.[0] ?? ""}${p.lastName?.[0] ?? ""}`.toUpperCase();
}

function onAdd() {
  if (!playerToAdd.value) return;
  emit("add", playerToAdd.value);
  playerToAdd.value = null;
}
</script>

<template>
  <div>
    <ul class="divide-y divide-slate-100 mb-3">
      <li v-for="a in assignments" :key="a.id" class="py-2 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <Avatar :label="initials(a.player)" shape="circle" class="shrink-0" style="background-color: #f1f5f9; color: #475569" />
          <span class="font-medium text-slate-700 truncate">{{ a.player.firstName }} {{ a.player.lastName }}</span>
        </div>
        <Button icon="pi pi-times" severity="danger" text rounded size="small" aria-label="Retirer" class="shrink-0" @click="emit('remove', a.player.id)" />
      </li>
      <li v-if="!assignments.length" class="py-2 text-slate-400 text-sm">{{ emptyLabel }}</li>
    </ul>
    <div class="flex gap-2">
      <Dropdown v-model="playerToAdd" :options="availablePlayers" option-label="label" option-value="value" filter :placeholder="placeholder" class="flex-1 min-w-0" />
      <Button label="Ajouter" @click="onAdd" />
    </div>
  </div>
</template>
