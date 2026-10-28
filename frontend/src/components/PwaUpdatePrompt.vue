<script setup>
// Service worker de la PWA : enregistré seulement dans le navigateur (pas dans
// l'app native). Quand une nouvelle version est déployée, on propose de
// recharger plutôt que de le faire en plein encodage.
import { onMounted, ref } from "vue";
import Button from "primevue/button";
import { isNativeApp } from "../lib/platform.js";

const needRefresh = ref(false);
let updateSW = null;

onMounted(async () => {
  if (isNativeApp() || !("serviceWorker" in navigator)) return;
  const { registerSW } = await import("virtual:pwa-register");
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh.value = true;
    },
    // Vérifie une nouvelle version toutes les heures (app laissée ouverte), et
    // à chaque retour sur l'app : sur iPhone, l'app installée est mise en pause
    // en arrière-plan (minuteries suspendues) et rouverte sans rechargement.
    onRegisteredSW(url, registration) {
      if (!registration) return;
      let lastCheck = Date.now();
      const check = () => {
        lastCheck = Date.now();
        registration.update().catch(() => {});
      };
      setInterval(check, 60 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && Date.now() - lastCheck > 60 * 1000) check();
      });
    },
  });
});

function reload() {
  updateSW?.(true);
}
</script>

<template>
  <div
    v-if="needRefresh"
    role="status"
    class="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
  >
    <i class="pi pi-refresh text-sky-600" aria-hidden="true"></i>
    <span class="flex-1 text-sm text-slate-700">Nouvelle version disponible.</span>
    <Button label="Plus tard" text size="small" @click="needRefresh = false" />
    <Button label="Mettre à jour" size="small" @click="reload" />
  </div>
</template>
