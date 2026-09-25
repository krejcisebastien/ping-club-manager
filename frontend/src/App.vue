<script setup>
import { RouterView } from "vue-router";
import Toast from "primevue/toast";
import ConfirmDialog from "primevue/confirmdialog";
import PwaUpdatePrompt from "./components/PwaUpdatePrompt.vue";
</script>

<template>
  <RouterView />
  <Toast position="top-right" />
  <ConfirmDialog />
  <PwaUpdatePrompt />
</template>
