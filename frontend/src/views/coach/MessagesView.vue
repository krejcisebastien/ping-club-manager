<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import Tag from "primevue/tag";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

// Fils d'échanges que l'entraineur peut lire : ceux des joueurs de ses
// groupes, ou tous pour le responsable de la cellule entrainement.
const navLinks = useNavLinks();
const router = useRouter();
const threads = ref([]);
const isManager = ref(false);
const loading = ref(true);

onMounted(async () => {
  try {
    const { data } = await api.get("/player-messages");
    threads.value = data.threads;
    isManager.value = data.isManager;
  } finally {
    loading.value = false;
  }
});

const formatWhen = (d) => new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
</script>

<template>
  <AppLayout title="Échanges joueurs" :nav-links="navLinks">
    <div class="max-w-2xl space-y-3">
      <p class="text-sm text-slate-500">
        {{ isManager ? "Responsable de la cellule entrainement : tu vois les échanges de tous les joueurs." : "Les échanges des joueurs de tes groupes." }}
        Pour écrire à un joueur qui n'a pas encore de fil, ouvre sa fiche dans <strong>Joueurs</strong>.
      </p>
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
        <p v-if="!loading && !threads.length" class="p-4 text-sm text-slate-400">Aucun échange pour l'instant.</p>
        <button
          v-for="t in threads"
          :key="t.player.id"
          type="button"
          class="w-full text-left p-4 hover:bg-slate-50 flex items-start gap-3"
          @click="router.push(`/coach/messages/${t.player.id}`)"
        >
          <span class="flex-1 min-w-0">
            <span class="flex items-center gap-2">
              <span class="font-medium text-slate-800">{{ t.player.firstName }} {{ t.player.lastName }}</span>
              <Tag v-if="t.last.author.side === 'player'" value="À répondre" severity="warning" />
            </span>
            <span class="block text-sm text-slate-500 truncate">
              {{ t.last.author.isMe ? "Moi" : t.last.author.name }} : {{ t.last.body }}
            </span>
          </span>
          <span class="text-xs text-slate-400 whitespace-nowrap">{{ formatWhen(t.last.createdAt) }}</span>
        </button>
      </div>
    </div>
  </AppLayout>
</template>
