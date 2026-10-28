<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import AppLayout from "../../components/AppLayout.vue";
import PlayerMessages from "../../components/PlayerMessages.vue";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();
const route = useRoute();
const router = useRouter();
const player = ref(null);
</script>

<template>
  <AppLayout :title="player ? `Échanges — ${player.firstName} ${player.lastName}` : 'Échanges'" :nav-links="navLinks">
    <div class="max-w-2xl">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <Button label="Tous les échanges" icon="pi pi-arrow-left" text class="-ml-2" @click="router.push('/coach/messages')" />
        <Button v-if="player" label="Fiche du joueur" icon="pi pi-user" text size="small" @click="router.push(`/admin/players/${player.id}`)" />
      </div>
      <PlayerMessages :player-id="route.params.playerId" @loaded="(data) => (player = data?.player ?? null)" />
    </div>
  </AppLayout>
</template>
