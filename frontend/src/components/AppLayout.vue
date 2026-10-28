<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, RouterLink } from "vue-router";
import Avatar from "primevue/avatar";
import Button from "primevue/button";
import Sidebar from "primevue/sidebar";
import { useAuthStore } from "../stores/auth.js";
import { CLUB_NAME, CLUB_ICON } from "../lib/config.js";
import { ROLE_LABELS, roleHome } from "../lib/roles.js";
import { useNotifications } from "../composables/useNotifications.js";

defineProps({
  title: { type: String, required: true },
  navLinks: { type: Array, default: () => [] }, // [{ to, label, icon, exact? }]
});

const ACTIVE_LINK_CLASS = "!bg-sky-50 !text-sky-700 font-medium";

const auth = useAuthStore();
const router = useRouter();
const drawerOpen = ref(false);

// Cloche : visible avec une licence active (la boîte en dépend).
const { unread, refreshUnread } = useNotifications();
onMounted(() => {
  if (auth.licenseActive) refreshUnread();
});
const unreadLabel = computed(() => (unread.value > 9 ? "9+" : String(unread.value)));

const expiringSoon = computed(() => {
  const license = auth.license;
  return !!license?.active && (license.status === "GRACE" || license.daysLeft <= 30);
});

function initials(email) {
  return (email || "?").slice(0, 2).toUpperCase();
}

function onSwitchRole(role) {
  if (role === auth.activeRole) return;
  auth.setActiveRole(role);
  drawerOpen.value = false;
  router.push(roleHome(role));
}

function onLogout() {
  auth.logout();
  router.push("/login");
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 md:flex">
    <!-- Sidebar desktop -->
    <aside class="hidden md:flex md:w-64 md:flex-col md:shrink-0 md:sticky md:top-0 md:h-screen md:self-start bg-white border-r border-slate-200">
      <div class="h-16 flex items-center gap-2 px-5 border-b border-slate-200">
        <i :class="CLUB_ICON" class="pi text-xl text-sky-600" aria-hidden="true"></i>
        <span class="font-semibold text-slate-800 truncate">{{ auth.user?.clubName || CLUB_NAME }}</span>
      </div>
      <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <RouterLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
          :active-class="link.exact ? '' : ACTIVE_LINK_CLASS"
          :exact-active-class="ACTIVE_LINK_CLASS"
        >
          <i :class="link.icon" class="text-base"></i>
          {{ link.label }}
        </RouterLink>
      </nav>
      <div class="border-t border-slate-200 p-3 space-y-2">
        <div v-if="auth.roles.length > 1" class="flex gap-1">
          <button
            v-for="r in auth.roles"
            :key="r"
            type="button"
            class="flex-1 text-xs px-1.5 py-1 rounded-md border transition-colors"
            :class="
              auth.activeRole === r
                ? 'bg-sky-600 border-sky-600 text-white font-medium'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            "
            @click="onSwitchRole(r)"
          >
            {{ ROLE_LABELS[r] }}
          </button>
        </div>
        <div class="flex items-center gap-1">
          <RouterLink
            to="/account"
            class="flex items-center gap-2 flex-1 min-w-0 rounded-lg px-1 py-1 hover:bg-slate-100"
            title="Mon compte"
            @click="drawerOpen = false"
          >
            <Avatar :label="initials(auth.user?.email)" shape="circle" class="bg-sky-100 text-sky-700 shrink-0" />
            <span class="text-sm text-slate-600 truncate flex-1">{{ auth.user?.email }}</span>
            <i class="pi pi-cog text-slate-400" aria-hidden="true"></i>
          </RouterLink>
          <Button icon="pi pi-sign-out" severity="secondary" text rounded aria-label="Déconnexion" @click="onLogout" />
        </div>
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
          :active-class="link.exact ? '' : ACTIVE_LINK_CLASS"
          :exact-active-class="ACTIVE_LINK_CLASS"
          @click="drawerOpen = false"
        >
          <i :class="link.icon" class="text-base"></i>
          {{ link.label }}
        </RouterLink>
      </nav>
      <div class="px-2 pt-4 mt-4 border-t border-slate-200 space-y-2">
        <div v-if="auth.roles.length > 1" class="flex gap-1">
          <button
            v-for="r in auth.roles"
            :key="r"
            type="button"
            class="flex-1 text-xs px-1.5 py-1 rounded-md border transition-colors"
            :class="
              auth.activeRole === r
                ? 'bg-sky-600 border-sky-600 text-white font-medium'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            "
            @click="onSwitchRole(r)"
          >
            {{ ROLE_LABELS[r] }}
          </button>
        </div>
        <div class="flex items-center gap-1">
          <RouterLink
            to="/account"
            class="flex items-center gap-2 flex-1 min-w-0 rounded-lg px-1 py-1 hover:bg-slate-100"
            title="Mon compte"
            @click="drawerOpen = false"
          >
            <Avatar :label="initials(auth.user?.email)" shape="circle" class="bg-sky-100 text-sky-700 shrink-0" />
            <span class="text-sm text-slate-600 truncate flex-1">{{ auth.user?.email }}</span>
            <i class="pi pi-cog text-slate-400" aria-hidden="true"></i>
          </RouterLink>
          <Button icon="pi pi-sign-out" severity="secondary" text rounded aria-label="Déconnexion" @click="onLogout" />
        </div>
      </div>
    </Sidebar>

    <div class="flex-1 min-w-0">
      <!-- Top bar mobile -->
      <header class="md:hidden sticky top-0 z-10 bg-white border-b border-slate-200 h-14 flex items-center gap-2 px-3">
        <Button icon="pi pi-bars" severity="secondary" text rounded aria-label="Menu" @click="drawerOpen = true" />
        <span class="font-semibold text-slate-800 truncate">{{ title }}</span>
        <RouterLink
          v-if="auth.licenseActive"
          to="/notifications"
          class="relative ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          :aria-label="unread ? `Notifications (${unread} non lues)` : 'Notifications'"
        >
          <i class="pi pi-bell text-lg" aria-hidden="true"></i>
          <span
            v-if="unread"
            class="absolute right-0.5 top-0.5 min-w-[1.1rem] rounded-full bg-red-600 px-1 text-center text-[0.65rem] font-semibold leading-[1.1rem] text-white"
          >{{ unreadLabel }}</span>
        </RouterLink>
      </header>

      <!-- Top bar desktop -->
      <header class="hidden md:flex items-center h-16 px-6 border-b border-slate-200 bg-white">
        <h1 class="text-lg font-semibold text-slate-800">{{ title }}</h1>
        <RouterLink
          v-if="auth.licenseActive"
          to="/notifications"
          class="relative ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          :aria-label="unread ? `Notifications (${unread} non lues)` : 'Notifications'"
        >
          <i class="pi pi-bell text-lg" aria-hidden="true"></i>
          <span
            v-if="unread"
            class="absolute right-0.5 top-0.5 min-w-[1.1rem] rounded-full bg-red-600 px-1 text-center text-[0.65rem] font-semibold leading-[1.1rem] text-white"
          >{{ unreadLabel }}</span>
        </RouterLink>
      </header>

      <main class="p-4 md:p-6 max-w-5xl mx-auto">
        <RouterLink
          v-if="auth.isAdmin && expiringSoon"
          to="/license"
          class="block mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100"
        >
          <i class="pi pi-exclamation-triangle mr-2"></i>
          <span v-if="auth.license.status === 'GRACE'">La licence du club est échue : accès maintenu quelques jours, pensez à la renouveler.</span>
          <span v-else>La licence du club expire dans {{ auth.license.daysLeft }} jour(s). Renouveler</span>
        </RouterLink>
        <slot />
      </main>
    </div>
  </div>
</template>
