<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import AppLayout from "../components/AppLayout.vue";
import { useAuthStore } from "../stores/auth.js";
import { useNavLinks } from "../composables/useNavLinks.js";
import { roleHome } from "../lib/roles.js";
import { api } from "../lib/api.js";
import { SUPPORT_EMAIL } from "../lib/config.js";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const navLinks = useNavLinks();

const checkout = route.query.checkout;
const busy = ref(false);
const error = ref("");
const waiting = ref(checkout === "success");
let poll = null;

const license = computed(() => auth.license);
const date = (value) => (value ? new Date(value).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" }) : "");

const summary = computed(() => {
  const l = license.value;
  if (!l) return { tone: "slate", title: "Statut de la licence indisponible", text: "" };
  if (l.status === "ACTIVE") return { tone: "green", title: "Licence active", text: `Valable jusqu'au ${date(l.endsAt)} (${l.daysLeft} jour${l.daysLeft > 1 ? "s" : ""}).` };
  if (l.status === "GRACE") return { tone: "amber", title: "Licence échue", text: `Échue le ${date(l.endsAt)}. L'accès est maintenu jusqu'au ${date(l.graceEndsAt)}, renouvelez-la avant cette date.` };
  if (l.status === "EXPIRED") return { tone: "red", title: "Licence expirée", text: `Expirée le ${date(l.endsAt)}. Renouvelez-la pour retrouver l'accès à l'application.` };
  return { tone: "amber", title: "Aucune licence", text: "Activez la licence de votre club pour commencer à utiliser l'application." };
});
const tones = {
  green: "border-green-300 bg-green-50 text-green-900",
  amber: "border-amber-300 bg-amber-50 text-amber-900",
  red: "border-red-300 bg-red-50 text-red-900",
  slate: "border-slate-300 bg-slate-50 text-slate-700",
};

async function redirectToStripe(path) {
  error.value = "";
  busy.value = true;
  try {
    window.location.assign((await api.post(path)).data.url);
  } catch (err) {
    error.value = err.response?.data?.error ?? "Une erreur est survenue.";
    busy.value = false;
  }
}

onMounted(() => {
  if (!waiting.value) return;
  // Le webhook Stripe peut arriver quelques secondes après le retour du paiement.
  let attempts = 0;
  poll = setInterval(async () => {
    attempts += 1;
    await auth.fetchLicense();
    if (auth.licenseActive && license.value?.status === "ACTIVE") {
      clearInterval(poll);
      router.replace(roleHome(auth.activeRole));
    } else if (attempts >= 15) {
      clearInterval(poll);
      waiting.value = false;
    }
  }, 2000);
});
onBeforeUnmount(() => clearInterval(poll));
</script>

<template>
  <AppLayout title="Licence du club" :nav-links="auth.licenseActive ? navLinks : []">
    <div class="max-w-xl space-y-4">
      <p v-if="waiting" class="rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <i class="pi pi-spin pi-spinner mr-2"></i>Paiement reçu, activation de la licence en cours…
      </p>
      <p v-else-if="checkout === 'cancelled'" class="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Paiement annulé, aucune somme n'a été prélevée.
      </p>

      <div class="rounded-xl border px-5 py-4" :class="tones[summary.tone]">
        <h2 class="font-semibold">{{ summary.title }}</h2>
        <p v-if="summary.text" class="text-sm mt-1">{{ summary.text }}</p>
      </div>

      <template v-if="auth.isAdmin">
        <div class="bg-white rounded-xl shadow border border-slate-200 p-5 space-y-3">
          <template v-if="license?.onlinePaymentEnabled">
            <h3 class="font-medium text-slate-800">Paiement en ligne</h3>
            <p class="text-sm text-slate-600">Abonnement annuel réglé par carte sur une page sécurisée. L'accès s'ouvre dès le paiement.</p>
            <div class="flex flex-wrap gap-2">
              <Button
                :label="license.status === 'ACTIVE' ? 'Renouveler la licence' : 'Activer la licence'"
                icon="pi pi-credit-card"
                :loading="busy"
                @click="redirectToStripe('/billing/checkout')"
              />
              <Button
                v-if="license.hasSubscription"
                label="Gérer mon abonnement"
                icon="pi pi-cog"
                severity="secondary"
                outlined
                :loading="busy"
                @click="redirectToStripe('/billing/portal')"
              />
            </div>
          </template>

          <h3 class="font-medium text-slate-800" :class="license?.onlinePaymentEnabled && 'pt-2 border-t border-slate-200'">
            Règlement par facture ou virement
          </h3>
          <p class="text-sm text-slate-600">
            Pour régler par facture, contactez-nous : la licence est activée dès réception du paiement.
            <a v-if="SUPPORT_EMAIL" :href="`mailto:${SUPPORT_EMAIL}`" class="text-sky-600 hover:text-sky-700">{{ SUPPORT_EMAIL }}</a>
          </p>
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        </div>
      </template>
      <p v-else class="text-sm text-slate-600">
        Seul un administrateur du club peut gérer la licence. Contactez l'administrateur de votre club.
      </p>
    </div>
  </AppLayout>
</template>
