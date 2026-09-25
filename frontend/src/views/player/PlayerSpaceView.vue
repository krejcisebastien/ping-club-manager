<script setup>
import { computed, onMounted, watch } from "vue";
import { useRoute, RouterView } from "vue-router";
import AppLayout from "../../components/AppLayout.vue";
import { useNavLinks } from "../../composables/useNavLinks.js";
import { providePlayerSpace } from "../../composables/usePlayerSpace.js";

const route = useRoute();
const navLinks = useNavLinks();
const { player, load } = providePlayerSpace(computed(() => route.params.id));

const title = computed(() => route.meta.title ?? "Mon espace joueur");

onMounted(load);
watch(() => route.params.id, load);
</script>

<template>
  <AppLayout :title="title" :nav-links="navLinks">
    <RouterView v-if="player" />
  </AppLayout>
</template>
