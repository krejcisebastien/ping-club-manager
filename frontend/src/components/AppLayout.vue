<script setup>
import { ref } from "vue";
import { useRouter, RouterLink } from "vue-router";
import Avatar from "primevue/avatar";
import Button from "primevue/button";
import Sidebar from "primevue/sidebar";
import Dialog from "primevue/dialog";
import Password from "primevue/password";
import { useToast } from "primevue/usetoast";
import { useAuthStore } from "../stores/auth.js";
import { CLUB_NAME, CLUB_ICON } from "../lib/config.js";
import { ROLE_LABELS, roleHome } from "../lib/roles.js";
import { api } from "../lib/api.js";

defineProps({
  title: { type: String, required: true },
  navLinks: { type: Array, default: () => [] }, // [{ to, label, icon }]
});

const auth = useAuthStore();
const router = useRouter();
const toast = useToast();
const drawerOpen = ref(false);

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

const passwordDialogVisible = ref(false);
const passwordForm = ref({ currentPassword: "", newPassword: "", confirmPassword: "" });
const passwordSaving = ref(false);
const passwordError = ref("");

function openPasswordDialog() {
  passwordForm.value = { currentPassword: "", newPassword: "", confirmPassword: "" };
  passwordError.value = "";
  passwordDialogVisible.value = true;
  drawerOpen.value = false;
}

async function onChangePassword() {
  passwordError.value = "";
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = "Les deux mots de passe ne correspondent pas.";
    return;
  }
  passwordSaving.value = true;
  try {
    await api.put("/auth/change-password", {
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword,
    });
    passwordDialogVisible.value = false;
    toast.add({ severity: "success", summary: "Mot de passe mis à jour", life: 3000 });
  } catch (err) {
    passwordError.value = err.response?.data?.error ?? "Une erreur est survenue.";
  } finally {
    passwordSaving.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 md:flex">
    <!-- Sidebar desktop -->
    <aside class="hidden md:flex md:w-64 md:flex-col md:shrink-0 bg-white border-r border-slate-200">
      <div class="h-16 flex items-center gap-2 px-5 border-b border-slate-200">
        <i :class="CLUB_ICON" class="pi text-xl text-sky-600" aria-hidden="true"></i>
        <span class="font-semibold text-slate-800">{{ CLUB_NAME }}</span>
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
        <div class="flex items-center gap-2">
          <Avatar :label="initials(auth.user?.email)" shape="circle" class="bg-sky-100 text-sky-700 shrink-0" />
          <span class="text-sm text-slate-600 truncate flex-1">{{ auth.user?.email }}</span>
          <Button icon="pi pi-lock" severity="secondary" text rounded aria-label="Changer le mot de passe" @click="openPasswordDialog" />
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
          active-class="!bg-sky-50 !text-sky-700 font-medium"
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
        <div class="flex items-center gap-2">
          <Avatar :label="initials(auth.user?.email)" shape="circle" class="bg-sky-100 text-sky-700 shrink-0" />
          <span class="text-sm text-slate-600 truncate flex-1">{{ auth.user?.email }}</span>
          <Button icon="pi pi-lock" severity="secondary" text rounded aria-label="Changer le mot de passe" @click="openPasswordDialog" />
          <Button icon="pi pi-sign-out" severity="secondary" text rounded aria-label="Déconnexion" @click="onLogout" />
        </div>
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

    <Dialog v-model:visible="passwordDialogVisible" header="Changer le mot de passe" modal style="width: 26rem" class="mx-4">
      <form class="grid gap-3 pt-2" @submit.prevent="onChangePassword">
        <div>
          <label class="text-xs text-slate-500 block mb-1">Mot de passe actuel</label>
          <Password v-model="passwordForm.currentPassword" required toggle-mask :feedback="false" class="w-full" input-class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Nouveau mot de passe</label>
          <Password v-model="passwordForm.newPassword" required toggle-mask :feedback="false" class="w-full" input-class="w-full" />
        </div>
        <div>
          <label class="text-xs text-slate-500 block mb-1">Confirmer le nouveau mot de passe</label>
          <Password v-model="passwordForm.confirmPassword" required toggle-mask :feedback="false" class="w-full" input-class="w-full" />
        </div>
        <p v-if="passwordError" class="text-sm text-red-600">{{ passwordError }}</p>
        <div class="flex justify-end gap-2 mt-2">
          <Button type="button" label="Annuler" severity="secondary" outlined @click="passwordDialogVisible = false" />
          <Button type="submit" label="Enregistrer" :loading="passwordSaving" />
        </div>
      </form>
    </Dialog>
  </div>
</template>
