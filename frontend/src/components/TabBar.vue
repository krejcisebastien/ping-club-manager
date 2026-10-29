<script setup>
// Barre d'onglets partagée par les fiches joueur (staff et espace joueur).
// tabs : [{ key, label, short }] ; short est affiché sur mobile.
defineProps({ tabs: { type: Array, required: true }, ariaLabel: { type: String, default: "Onglets" } });
const model = defineModel({ type: String, required: true });
</script>

<template>
  <nav class="flex gap-1 border-b border-slate-200 mb-4" role="tablist" :aria-label="ariaLabel">
    <button
      v-for="t in tabs"
      :key="t.key"
      type="button"
      role="tab"
      :aria-selected="model === t.key"
      class="px-3 py-2 -mb-px text-sm font-medium border-b-2 whitespace-nowrap"
      :class="model === t.key ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-700'"
      @click="model = t.key"
    >
      <span class="hidden sm:inline">{{ t.label }}</span><span class="sm:hidden">{{ t.short }}</span>
    </button>
  </nav>
</template>
