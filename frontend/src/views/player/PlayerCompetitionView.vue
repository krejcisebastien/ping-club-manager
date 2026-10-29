<script setup>
import CompetitionResults from "../../components/CompetitionResults.vue";
import UpcomingTournaments from "../../components/UpcomingTournaments.vue";
import { ref } from "vue";
import { usePlayerSpace } from "../../composables/usePlayerSpace.js";

const { player } = usePlayerSpace();
const upcoming = ref(null);
</script>

<template>
  <div class="space-y-4">
    <UpcomingTournaments ref="upcoming" :player-id="player.id" as-player />
    <CompetitionResults :player-id="player.id" @refreshed="upcoming?.load()" />
  </div>
</template>
