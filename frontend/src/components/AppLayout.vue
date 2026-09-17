<script setup>
import { useRouter, RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth.js";

defineProps({
  title: { type: String, required: true },
  navLinks: { type: Array, default: () => [] }, // [{ to, label }]
});

const auth = useAuthStore();
const router = useRouter();

async function onLogout() {
  await auth.logout();
  router.push("/login");
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <header class="bg-white border-b border-slate-200 px-4 py-3">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-semibold text-slate-800">{{ title }}</h1>
        <div class="flex items-center gap-3 text-sm text-slate-600">
          <span class="hidden sm:inline">{{ auth.user?.email }}</span>
          <button class="text-sky-600 hover:underline" @click="onLogout">Déconnexion</button>
        </div>
      </div>
      <nav v-if="navLinks.length" class="flex flex-wrap gap-3 mt-2 text-sm">
        <RouterLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="text-slate-600 hover:text-sky-600"
          active-class="text-sky-600 font-medium"
        >
          {{ link.label }}
        </RouterLink>
      </nav>
    </header>
    <main class="p-4 max-w-5xl mx-auto">
      <slot />
    </main>
  </div>
</template>
