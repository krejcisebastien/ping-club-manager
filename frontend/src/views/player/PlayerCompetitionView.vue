<script setup>
import CompetitionResults from "../../components/CompetitionResults.vue";
import { usePlayerSpace } from "../../composables/usePlayerSpace.js";

const { player } = usePlayerSpace();
</script>

<template>
  <CompetitionResults :player-id="player.id" />
</template>
