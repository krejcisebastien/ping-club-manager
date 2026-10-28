<script setup>
import PlayerMessages from "../../components/PlayerMessages.vue";
import { usePlayerSpace } from "../../composables/usePlayerSpace.js";

const { player } = usePlayerSpace();
</script>

<template>
  <div class="max-w-2xl space-y-2">
    <p class="text-sm text-slate-500">Tes entraineurs et le responsable de la cellule entrainement lisent ce fil et te répondent ici.</p>
    <PlayerMessages :player-id="player.id" as-player />
  </div>
</template>
