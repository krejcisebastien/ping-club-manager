<script setup>
import { ref } from "vue";
import { useRouter, RouterLink } from "vue-router";
import Avatar from "primevue/avatar";
import Button from "primevue/button";
import Sidebar from "primevue/sidebar";
import { useAuthStore } from "../stores/auth.js";

defineProps({
  title: { type: String, required: true },
  navLinks: { type: Array, default: () => [] }, // [{ to, label, icon }]
});

const auth = useAuthStore();
const router = useRouter();
const drawerOpen = ref(false);

function initials(email) {
  return (email || "?").slice(0, 2).toUpperCase();
}

function onLogout() {
  auth.logout();
  router.push("/login");
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 md:flex">
    <!-- Sidebar desktop -->
    <aside class="hidden md:flex md:w-64 md:flex-col md:shrink-0 bg-white border-r border-slate-200">
      <div class="h-16 flex items-center gap-2 px-5 border-b border-slate-200">
        <i class="pi pi-star-fill text-xl text-sky-600" aria-hidden="true"></i>
        <span class="font-semibold text-slate-800">Club Tennis de Table</span>
      </div>
      <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <RouterLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
          active-class="!bg-sky-50 !text-sky-700 font-medium"
        >
          <i :class="link.icon" class="text-base"></i>
          {{ link.label }}
        </RouterLink>
      </nav>
      <div class="border-t border-slate-200 p-3 flex items-center gap-2">
        <Avatar :label="initials(auth.user?.email)" shape="circle" class="bg-sky-100 text-sky-700 shrink-0" />
        <span class="text-sm text-slate-600 truncate flex-1">{{ auth.user?.email }}</span>
        <Button icon="pi pi-sign-out" severity="secondary" text rounded aria-label="Déconnexion" @click="onLogout" />
      </div>
    </aside>

    <!-- Drawer mobile -->
    <Sidebar v-model:visible="drawerOpen" header="Menu" class="flex flex-col">
      <nav class="space-y-0.5">
        <RouterLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
          active-class="!bg-sky-50 !text-sky-700 font-medium"
          @click="drawerOpen = false"
        >
          <i :class="link.icon" class="text-base"></i>
          {{ link.label }}
        </RouterLink>
      </nav>
      <div class="flex items-center gap-2 px-2 pt-4 mt-4 border-t border-slate-200">
        <Avatar :label="initials(auth.user?.email)" shape="circle" class="bg-sky-100 text-sky-700 shrink-0" />
        <span class="text-sm text-slate-600 truncate flex-1">{{ auth.user?.email }}</span>
        <Button icon="pi pi-sign-out" severity="secondary" text rounded aria-label="Déconnexion" @click="onLogout" />
      </div>
    </Sidebar>

    <div class="flex-1 min-w-0">
      <!-- Top bar mobile -->
      <header class="md:hidden sticky top-0 z-10 bg-white border-b border-slate-200 h-14 flex items-center gap-2 px-3">
        <Button icon="pi pi-bars" severity="secondary" text rounded aria-label="Menu" @click="drawerOpen = true" />
        <span class="font-semibold text-slate-800 truncate">{{ title }}</span>
      </header>

      <!-- Top bar desktop -->
      <header class="hidden md:flex items-center h-16 px-6 border-b border-slate-200 bg-white">
        <h1 class="text-lg font-semibold text-slate-800">{{ title }}</h1>
      </header>

      <main class="p-4 md:p-6 max-w-5xl mx-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
