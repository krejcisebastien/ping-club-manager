<script setup>
// Paramètres du compte connecté (tous rôles) : mot de passe et notifications
// push de cet appareil, regroupés ici plutôt qu'en icônes au bas du menu.
import { ref } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import Password from "primevue/password";
import { useToast } from "primevue/usetoast";
import AppLayout from "../components/AppLayout.vue";
import { useNavLinks } from "../composables/useNavLinks.js";
import { useAuthStore } from "../stores/auth.js";
import { ROLE_LABELS } from "../lib/roles.js";
import { api } from "../lib/api.js";
import { isNativeApp } from "../lib/platform.js";
import { isWebPushAvailable, webPushPermission, enableWebPush } from "../lib/push.js";

const navLinks = useNavLinks();
const auth = useAuthStore();
const router = useRouter();
const toast = useToast();

const passwordForm = ref({ currentPassword: "", newPassword: "", confirmPassword: "" });
const passwordSaving = ref(false);
const passwordError = ref("");

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
    passwordForm.value = { currentPassword: "", newPassword: "", confirmPassword: "" };
    toast.add({ severity: "success", summary: "Mot de passe mis à jour", life: 3000 });
  } catch (err) {
    passwordError.value = err.response?.data?.error ?? "Une erreur est survenue.";
  } finally {
    passwordSaving.value = false;
  }
}

// État des notifications sur cet appareil : "native" (gérées par l'app
// installée), "unavailable" (navigateur incompatible ou non configuré),
// sinon la permission du navigateur ("default" | "granted" | "denied").
function pushState() {
  if (isNativeApp()) return "native";
  if (!isWebPushAvailable()) return "unavailable";
  return webPushPermission();
}
const notifState = ref(pushState());
const enablingPush = ref(false);

// L'abonnement doit partir d'un clic (exigé par Safari/iOS).
async function onEnableWebPush() {
  enablingPush.value = true;
  try {
    if (await enableWebPush()) {
      toast.add({ severity: "success", summary: "Notifications activées", life: 3000 });
    } else {
      toast.add({ severity: "warn", summary: "Notifications non activées", detail: "Autorisez-les dans les réglages du navigateur.", life: 5000 });
    }
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 5000 });
  } finally {
    enablingPush.value = false;
    notifState.value = pushState();
  }
}

// Phase de test des notifications push, réservée à ce compte (vérifié aussi
// côté serveur : masquer le bouton ne suffit pas à restreindre l'accès).
const PUSH_TEST_EMAIL = "seb.krejci@live.com";
const sendingReminder = ref(false);
async function onSendReminder() {
  sendingReminder.value = true;
  try {
    const { data } = await api.post("/push/reminder", { message: "Rappel depuis PingDesk" });
    toast.add({ severity: "success", summary: `Notification envoyée (${data.sent} appareil(s))`, life: 3000 });
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 5000 });
  } finally {
    sendingReminder.value = false;
  }
}

function onLogout() {
  auth.logout();
  router.push("/login");
}
</script>

<template>
  <AppLayout title="Mon compte" :nav-links="auth.licenseActive ? navLinks : []">
    <div class="max-w-xl space-y-4">
      <div class="bg-white rounded-xl shadow border border-slate-200 p-5 space-y-1">
        <h2 class="font-medium text-slate-800">Compte</h2>
        <p class="text-sm text-slate-600 break-all">{{ auth.user?.email }}</p>
        <p class="text-sm text-slate-500">
          {{ auth.user?.clubName }}<span v-if="auth.roles.length"> · {{ auth.roles.map((r) => ROLE_LABELS[r]).join(", ") }}</span>
        </p>
      </div>

      <div class="bg-white rounded-xl shadow border border-slate-200 p-5 space-y-3">
        <h2 class="font-medium text-slate-800">Notifications</h2>
        <p v-if="notifState === 'native'" class="text-sm text-slate-600">
          Les notifications de cet appareil se règlent dans les réglages du téléphone.
        </p>
        <p v-else-if="notifState === 'granted'" class="text-sm text-slate-600">
          <i class="pi pi-check-circle text-green-600 mr-1"></i>Activées sur cet appareil.
        </p>
        <p v-else-if="notifState === 'denied'" class="text-sm text-slate-600">
          Bloquées sur cet appareil. Autorise-les dans les réglages du navigateur (ou du téléphone), puis recharge la page.
        </p>
        <p v-else-if="notifState === 'unavailable'" class="text-sm text-slate-600">
          Non disponibles dans ce navigateur. Sur iPhone, ajoute d'abord l'application à l'écran d'accueil, puis ouvre-la depuis son icône.
        </p>
        <template v-else>
          <p class="text-sm text-slate-600">Reçois les rappels du club sur cet appareil.</p>
          <Button label="Activer les notifications" icon="pi pi-bell" :loading="enablingPush" @click="onEnableWebPush" />
        </template>
        <div v-if="auth.user?.email === PUSH_TEST_EMAIL" class="pt-2 border-t border-slate-100">
          <Button
            label="Envoyer un rappel (test)"
            icon="pi pi-send"
            severity="secondary"
            outlined
            size="small"
            :loading="sendingReminder"
            @click="onSendReminder"
          />
        </div>
      </div>

      <form class="bg-white rounded-xl shadow border border-slate-200 p-5 space-y-3" @submit.prevent="onChangePassword">
        <h2 class="font-medium text-slate-800">Mot de passe</h2>
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
        <div class="flex justify-end">
          <Button type="submit" label="Enregistrer" :loading="passwordSaving" />
        </div>
      </form>

      <Button label="Se déconnecter" icon="pi pi-sign-out" severity="secondary" outlined class="w-full md:w-auto" @click="onLogout" />
    </div>
  </AppLayout>
</template>
