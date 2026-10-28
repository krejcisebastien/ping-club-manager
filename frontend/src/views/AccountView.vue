<script setup>
// Paramètres du compte connecté (tous rôles) : mot de passe et notifications
// push de cet appareil, regroupés ici plutôt qu'en icônes au bas du menu.
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import Password from "primevue/password";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
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
const confirm = useConfirm();

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

// Abonnement calendrier : flux iCal des séances et stages du compte (comme
// entraineur, sparring ou joueur), mis à jour automatiquement par l'agenda.
const hasCalendar = computed(() => !!auth.user?.coachId || auth.user?.playerIds?.length > 0);
const calendarToken = ref(null);
const loadingCalendar = ref(false);
const calendarUrl = computed(() => (calendarToken.value ? `${api.defaults.baseURL}/calendar/${calendarToken.value}.ics` : ""));
const webcalUrl = computed(() => calendarUrl.value.replace(/^https?:\/\//, "webcal://"));
const googleUrl = computed(() => `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl.value)}`);

async function onShowCalendar() {
  loadingCalendar.value = true;
  try {
    calendarToken.value = (await api.get("/calendar/link")).data.token;
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 5000 });
  } finally {
    loadingCalendar.value = false;
  }
}

async function onCopyCalendarUrl() {
  try {
    await navigator.clipboard.writeText(calendarUrl.value);
    toast.add({ severity: "success", summary: "Lien copié", life: 3000 });
  } catch {
    toast.add({ severity: "warn", summary: "Copie impossible", detail: "Sélectionne le lien et copie-le manuellement.", life: 5000 });
  }
}

function onResetCalendar() {
  confirm.require({
    message: "L'ancien lien cessera de fonctionner : il faudra réabonner tes agendas avec le nouveau. Continuer ?",
    header: "Nouveau lien de calendrier",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Générer un nouveau lien",
    rejectLabel: "Annuler",
    rejectClass: "p-button-secondary p-button-outlined",
    accept: async () => {
      try {
        calendarToken.value = (await api.post("/calendar/link/reset")).data.token;
        toast.add({ severity: "success", summary: "Nouveau lien généré", life: 3000 });
      } catch (err) {
        toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 5000 });
      }
    },
  });
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
          <p class="text-sm text-slate-600">Sois prévenu sur cet appareil quand une de tes séances est annulée ou déplacée.</p>
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

      <div v-if="hasCalendar && auth.licenseActive" class="bg-white rounded-xl shadow border border-slate-200 p-5 space-y-3">
        <h2 class="font-medium text-slate-800">Calendrier</h2>
        <p class="text-sm text-slate-600">
          Retrouve tes séances d'entrainement et tes stages dans ton agenda (Google, iPhone, Outlook). Ils se mettent à jour
          automatiquement, annulations comprises.
        </p>
        <Button v-if="!calendarToken" label="Ajouter à mon agenda" icon="pi pi-calendar-plus" :loading="loadingCalendar" @click="onShowCalendar" />
        <template v-else>
          <div class="flex flex-wrap gap-2">
            <a :href="googleUrl" target="_blank" rel="noopener" class="p-button p-component no-underline">
              <i class="pi pi-google mr-2"></i>Google Agenda
            </a>
            <a :href="webcalUrl" class="p-button p-component p-button-outlined no-underline">
              <i class="pi pi-apple mr-2"></i>iPhone / Mac / Outlook
            </a>
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Ou copie ce lien dans ton agenda (« S'abonner à un calendrier »)</label>
            <div class="flex gap-2">
              <input :value="calendarUrl" readonly class="flex-1 min-w-0 text-xs border border-slate-300 rounded-md px-2 py-2 text-slate-600 bg-slate-50" @focus="$event.target.select()" />
              <Button icon="pi pi-copy" severity="secondary" outlined aria-label="Copier le lien" @click="onCopyCalendarUrl" />
            </div>
            <p class="text-xs text-slate-500 mt-1">
              Ce lien est personnel : ne le partage pas.
              <button type="button" class="text-sky-700 underline" @click="onResetCalendar">Générer un nouveau lien</button>
            </p>
          </div>
        </template>
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
