<script setup>
import { ref } from "vue";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";

const props = defineProps({
  modelValue: { type: String, default: null },
  maxSizeMb: { type: Number, default: 2 },
});
const emit = defineEmits(["update:modelValue"]);

const toast = useToast();
const inputRef = ref(null);

function pickFile() {
  inputRef.value?.click();
}

function onFileChange(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    toast.add({ severity: "error", summary: "Fichier invalide", detail: "Choisis une image.", life: 4000 });
    return;
  }
  if (file.size > props.maxSizeMb * 1024 * 1024) {
    toast.add({ severity: "error", summary: "Image trop lourde", detail: `Maximum ${props.maxSizeMb} Mo.`, life: 4000 });
    return;
  }
  const reader = new FileReader();
  reader.onload = () => emit("update:modelValue", reader.result);
  reader.readAsDataURL(file);
}

function remove() {
  emit("update:modelValue", null);
}
</script>

<template>
  <div>
    <input ref="inputRef" type="file" accept="image/*" class="hidden" @change="onFileChange" />
    <div v-if="modelValue" class="relative inline-block">
      <img :src="modelValue" alt="Illustration" class="max-h-40 rounded-lg border border-slate-200" />
      <Button icon="pi pi-times" severity="danger" rounded size="small" class="!absolute -top-2 -right-2" aria-label="Retirer l'image" @click="remove" />
    </div>
    <Button v-else label="Choisir une image" icon="pi pi-image" severity="secondary" outlined size="small" @click="pickFile" />
  </div>
</template>
