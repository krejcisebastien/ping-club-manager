<script setup>
import CompetitionResults from "../../components/CompetitionResults.vue";
import UpcomingTournaments from "../../components/UpcomingTournaments.vue";
import { usePlayerSpace } from "../../composables/usePlayerSpace.js";

const { player } = usePlayerSpace();
</script>

<template>
  <div class="space-y-4">
    <UpcomingTournaments :player-id="player.id" as-player />
    <CompetitionResults :player-id="player.id" />
  </div>
</template>
