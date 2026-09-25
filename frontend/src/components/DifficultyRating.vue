<script setup>
import { computed } from "vue";
import Rating from "primevue/rating";

const model = defineModel({ type: String, default: null });
defineProps({ cancel: { type: Boolean, default: false } });

const level = computed({
  get: () => (model.value ? Number(model.value.replace("NIVEAU_", "")) : null),
  set: (n) => {
    model.value = n ? `NIVEAU_${n}` : null;
  },
});
</script>

<template>
  <Rating v-model="level" :stars="5" :cancel="cancel" on-icon="pi pi-star-fill" off-icon="pi pi-star-fill" class="difficulty-rating" />
</template>
