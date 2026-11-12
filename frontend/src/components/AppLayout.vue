<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, RouterLink } from "vue-router";
import Avatar from "primevue/avatar";
import Button from "primevue/button";
import Sidebar from "primevue/sidebar";
import { useAuthStore } from "../stores/auth.js";
import { CLUB_NAME } from "../lib/config.js";
import { ROLE_LABELS, roleHome } from "../lib/roles.js";
import { useNotifications } from "../composables/useNotifications.js";

const props = defineProps({
  title: { type: String, required: true },
  navLinks: { type: Array, default: () => [] }, // [{ to, label, icon, exact?, section?, separate? }]
});

const ACTIVE_LINK_CLASS = "nav-link-active";

// Liens regroupés par domaine : un nouveau groupe commence à chaque changement
// de `section` (ou sur `separate`), avec la section en en-tête si elle est nommée.
const navGroups = computed(() => {
  const groups = [];
  for (const link of props.navLinks) {
    const section = link.section ?? "";
    const last = groups[groups.length - 1];
    if (!last || last.section !== section || link.separate) groups.push({ section, links: [link] });
    else last.links.push(link);
  }
  return groups;
});

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
    <aside class="hidden md:flex md:w-64 md:flex-col md:shrink-0 md:sticky md:top-0 md:h-screen md:self-start bg-ink text-slate-300">
      <div class="h-16 flex items-center gap-3 px-5">
        <img src="/pwa-64x64.png" alt="" class="h-9 w-9 rounded-xl shadow-lg shadow-black/30" />
        <div class="min-w-0">
          <p class="font-bold text-white truncate leading-tight">{{ auth.user?.clubName || CLUB_NAME }}</p>
          <p class="text-[0.7rem] uppercase tracking-wider text-slate-400">{{ ROLE_LABELS[auth.activeRole] }}</p>
        </div>
      </div>
      <nav class="flex-1 overflow-y-auto py-2 px-2.5 space-y-3.5" aria-label="Menu principal">
        <div v-for="(group, gi) in navGroups" :key="gi" class="space-y-0.5">
          <p v-if="group.section" class="nav-section">{{ group.section }}</p>
          <RouterLink
            v-for="link in group.links"
            :key="link.to"
            :to="link.to"
            class="nav-link"
            :active-class="link.exact ? '' : ACTIVE_LINK_CLASS"
            :exact-active-class="ACTIVE_LINK_CLASS"
          >
            <i :class="link.icon" class="text-base"></i>
            {{ link.label }}
          </RouterLink>
        </div>
      </nav>
      <div class="border-t border-white/10 p-3 space-y-2">
        <div v-if="auth.roles.length > 1" class="flex gap-1 rounded-lg bg-white/[0.06] p-[3px]">
          <button
            v-for="r in auth.roles"
            :key="r"
            type="button"
            class="flex-1 h-[30px] text-xs font-semibold rounded-md transition-colors"
            :class="auth.activeRole === r ? 'bg-brand-600 text-white' : 'bg-transparent text-slate-300 hover:bg-white/10'"
            @click="onSwitchRole(r)"
          >
            {{ ROLE_LABELS[r] }}
          </button>
        </div>
        <div class="flex items-center gap-1">
          <RouterLink
            to="/account"
            class="flex items-center gap-2 flex-1 min-w-0 rounded-lg px-1 py-1 hover:bg-white/10"
            title="Mon compte"
            @click="drawerOpen = false"
          >
            <Avatar :label="initials(auth.user?.email)" shape="circle" class="!bg-brand-600 !text-white shrink-0 text-xs font-semibold" />
            <span class="text-sm text-slate-300 truncate flex-1">{{ auth.user?.email }}</span>
            <i class="pi pi-cog text-slate-500" aria-hidden="true"></i>
          </RouterLink>
          <Button icon="pi pi-sign-out" severity="secondary" text rounded class="!text-slate-400" aria-label="Déconnexion" @click="onLogout" />
        </div>
      </div>
    </aside>

    <!-- Drawer mobile -->
    <Sidebar v-model:visible="drawerOpen" class="app-drawer flex flex-col">
      <template #header>
        <div class="flex items-center gap-3 min-w-0">
          <img src="/pwa-64x64.png" alt="" class="h-8 w-8 rounded-lg" />
          <span class="font-bold text-white truncate">{{ auth.user?.clubName || CLUB_NAME }}</span>
        </div>
      </template>
      <nav class="space-y-3" aria-label="Menu">
        <div v-for="(group, gi) in navGroups" :key="gi" class="space-y-0.5">
          <p v-if="group.section" class="nav-section">{{ group.section }}</p>
          <RouterLink
            v-for="link in group.links"
            :key="link.to"
            :to="link.to"
            class="nav-link"
            :active-class="link.exact ? '' : ACTIVE_LINK_CLASS"
            :exact-active-class="ACTIVE_LINK_CLASS"
            @click="drawerOpen = false"
          >
            <i :class="link.icon" class="text-base"></i>
            {{ link.label }}
          </RouterLink>
        </div>
      </nav>
      <div class="px-2 pt-4 mt-4 border-t border-white/10 space-y-2">
        <div v-if="auth.roles.length > 1" class="flex gap-1 rounded-lg bg-white/[0.06] p-[3px]">
          <button
            v-for="r in auth.roles"
            :key="r"
            type="button"
            class="flex-1 h-[30px] text-xs font-semibold rounded-md transition-colors"
            :class="auth.activeRole === r ? 'bg-brand-600 text-white' : 'bg-transparent text-slate-300 hover:bg-white/10'"
            @click="onSwitchRole(r)"
          >
            {{ ROLE_LABELS[r] }}
          </button>
        </div>
        <div class="flex items-center gap-1">
          <RouterLink
            to="/account"
            class="flex items-center gap-2 flex-1 min-w-0 rounded-lg px-1 py-1 hover:bg-white/10"
            title="Mon compte"
            @click="drawerOpen = false"
          >
            <Avatar :label="initials(auth.user?.email)" shape="circle" class="!bg-brand-600 !text-white shrink-0 text-xs font-semibold" />
            <span class="text-sm text-slate-300 truncate flex-1">{{ auth.user?.email }}</span>
            <i class="pi pi-cog text-slate-500" aria-hidden="true"></i>
          </RouterLink>
          <Button icon="pi pi-sign-out" severity="secondary" text rounded class="!text-slate-400" aria-label="Déconnexion" @click="onLogout" />
        </div>
      </div>
    </Sidebar>

    <div class="flex-1 min-w-0">
      <!-- Top bar mobile -->
      <header class="md:hidden sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200/70 h-14 flex items-center gap-2 px-3">
        <Button icon="pi pi-bars" severity="secondary" text rounded aria-label="Menu" @click="drawerOpen = true" />
        <span class="font-bold text-slate-900 truncate">{{ title }}</span>
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
      <header class="hidden md:flex items-center h-16 px-8 border-b border-slate-200/70 bg-white/80 backdrop-blur sticky top-0 z-10">
        <h1 class="text-lg font-bold text-slate-900 tracking-tight">{{ title }}</h1>
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

      <main class="p-4 md:p-8 max-w-6xl mx-auto">
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

<style scoped>
.nav-section {
  margin: 0;
  padding: 0 0.75rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8b9ab3;
}
.nav-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.6rem;
  font-size: 0.875rem;
  color: #aab6cb;
  transition: background-color 0.15s, color 0.15s;
}
.nav-link:hover {
  background: rgb(255 255 255 / 0.06);
  color: #fff;
}
.nav-link-active {
  background: rgb(255 255 255 / 0.1);
  color: #fff;
  font-weight: 600;
}
.nav-link-active::before {
  content: "";
  position: absolute;
  left: -0.5rem;
  top: 0.45rem;
  bottom: 0.45rem;
  width: 3px;
  border-radius: 999px;
  background: #ef3b4a;
}
.nav-link-active i {
  color: #93b8fd;
}
</style>
