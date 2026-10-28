<script setup>
// Boîte de notifications du compte : tout ce qui a été envoyé (séance annulée,
// déplacée, encadrement…), consultable même si le push n'est pas activé ou si
// la notification du téléphone a été effacée.
import { onMounted, ref } from "vue";
import AppLayout from "../components/AppLayout.vue";
import { useNavLinks } from "../composables/useNavLinks.js";
import { useNotifications } from "../composables/useNotifications.js";
import { api } from "../lib/api.js";

const navLinks = useNavLinks();
const { unread } = useNotifications();

const notifications = ref([]);
const loading = ref(true);
const error = ref("");

const DATE_FORMAT = new Intl.DateTimeFormat("fr-BE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const formatDate = (iso) => DATE_FORMAT.format(new Date(iso));

onMounted(async () => {
  try {
    const { data } = await api.get("/notifications");
    notifications.value = data.notifications;
    // Les non lues restent mises en avant pendant cette visite, puis sont
    // marquées comme lues (le badge de la cloche disparaît).
    if (data.unread) {
      await api.post("/notifications/read-all");
      unread.value = 0;
    }
  } catch (err) {
    error.value = err.response?.data?.error ?? "Impossible de charger les notifications.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <AppLayout title="Notifications" :nav-links="navLinks">
    <div class="max-w-xl">
      <p v-if="loading" class="text-sm text-slate-500"><i class="pi pi-spin pi-spinner mr-2"></i>Chargement…</p>
      <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>
      <div v-else-if="!notifications.length" class="bg-white rounded-xl shadow border border-slate-200 p-6 text-center text-sm text-slate-500">
        <i class="pi pi-bell text-2xl text-slate-300 mb-2 block"></i>
        Aucune notification pour l'instant. Tu seras prévenu ici quand une de tes séances est annulée, déplacée, ou quand tu es ajouté à
        l'encadrement.
      </div>
      <ul v-else class="bg-white rounded-xl shadow border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        <li v-for="n in notifications" :key="n.id" class="flex gap-3 px-4 py-3" :class="n.readAt ? '' : 'bg-sky-50'">
          <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :class="n.readAt ? 'bg-transparent' : 'bg-sky-600'" aria-hidden="true"></span>
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between gap-2">
              <p class="text-sm font-medium text-slate-800">{{ n.title }}</p>
              <time class="text-xs text-slate-400 shrink-0" :datetime="n.createdAt">{{ formatDate(n.createdAt) }}</time>
            </div>
            <p class="text-sm text-slate-600 break-words">{{ n.body }}</p>
          </div>
        </li>
      </ul>
      <p v-if="notifications.length" class="text-xs text-slate-400 mt-2">Les notifications sont conservées 60 jours.</p>
    </div>
  </AppLayout>
</template>
