<script setup>
import { ref, nextTick, onMounted, watch } from "vue";
import Button from "primevue/button";
import Textarea from "primevue/textarea";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import { api } from "../lib/api.js";

// Fil d'échanges d'un joueur avec ses entraineurs et le responsable de la
// cellule entrainement. Utilisé dans l'espace joueur et côté entraineur.
const props = defineProps({
  playerId: { type: String, required: true },
  // Côté joueur : texte d'invitation adapté.
  asPlayer: { type: Boolean, default: false },
});
const emit = defineEmits(["loaded"]);
// Écran d'envoi : un compte à la fois parent et entraineur écrit au nom du
// joueur depuis l'espace joueur, et en son nom d'entraineur ailleurs.
const side = props.asPlayer ? "PLAYER" : "STAFF";

const MAX_LENGTH = 2000;
const toast = useToast();
const confirm = useConfirm();
const messages = ref([]);
const loaded = ref(false);
const denied = ref(false);
const draft = ref("");
const sending = ref(false);
const listEl = ref(null);

async function scrollToEnd() {
  await nextTick();
  listEl.value?.scrollTo({ top: listEl.value.scrollHeight });
}

async function load() {
  loaded.value = false;
  denied.value = false;
  try {
    const { data } = await api.get(`/players/${props.playerId}/messages`, { params: { side } });
    messages.value = data.messages;
    emit("loaded", data);
    scrollToEnd();
  } catch (err) {
    if (err.response?.status !== 403) throw err;
    denied.value = true;
    emit("loaded", null);
  } finally {
    loaded.value = true;
  }
}

async function send() {
  const body = draft.value.trim();
  if (!body) return;
  sending.value = true;
  try {
    const { data } = await api.post(`/players/${props.playerId}/messages`, { body, side });
    messages.value.push(data.message);
    draft.value = "";
    scrollToEnd();
  } catch (err) {
    toast.add({ severity: "error", summary: "Envoi impossible", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 5000 });
  } finally {
    sending.value = false;
  }
}

// Ctrl/Cmd + Entrée envoie ; Entrée seule va à la ligne.
function onKeydown(event) {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) send();
}

function remove(message) {
  confirm.require({
    message: "Supprimer ce message ?",
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Supprimer",
    acceptClass: "p-button-danger",
    rejectLabel: "Retour",
    rejectClass: "p-button-secondary p-button-outlined",
    accept: async () => {
      await api.delete(`/players/${props.playerId}/messages/${message.id}`, { params: { side } });
      messages.value = messages.value.filter((m) => m.id !== message.id);
    },
  });
}

const formatWhen = (d) => new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

onMounted(load);
watch(() => props.playerId, load);
</script>

<template>
  <div v-if="loaded && !denied" class="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
    <div ref="listEl" class="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
      <p v-if="!messages.length" class="text-sm text-slate-400 text-center py-6">
        {{ asPlayer ? "Pose ici tes questions à tes entraineurs : un conseil après un match, un geste à travailler…" : "Aucun message pour l'instant." }}
      </p>
      <div
        v-for="m in messages"
        :key="m.id"
        class="flex flex-col max-w-[85%]"
        :class="m.author.isMe ? 'ml-auto items-end' : 'items-start'"
      >
        <p class="text-xs text-slate-500 mb-0.5">
          <span class="font-medium" :class="m.author.side === 'staff' ? 'text-sky-700' : 'text-slate-700'">{{ m.author.isMe ? "Moi" : m.author.name }}</span>
          · {{ formatWhen(m.createdAt) }}
        </p>
        <div class="rounded-2xl px-3 py-2 text-sm whitespace-pre-line break-words" :class="m.author.isMe ? 'bg-sky-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'">
          {{ m.body }}
        </div>
        <button v-if="m.canDelete" type="button" class="text-xs text-slate-400 hover:text-red-600 mt-0.5" @click="remove(m)">Supprimer</button>
      </div>
    </div>
    <form class="border-t border-slate-200 p-3 flex gap-2 items-end" @submit.prevent="send">
      <Textarea
        v-model="draft"
        auto-resize
        rows="2"
        :maxlength="MAX_LENGTH"
        :placeholder="asPlayer ? 'Écris à tes entraineurs…' : 'Répondre…'"
        aria-label="Message"
        class="flex-1 min-w-0"
        @keydown="onKeydown"
      />
      <Button type="submit" icon="pi pi-send" aria-label="Envoyer" :loading="sending" :disabled="!draft.trim()" />
    </form>
  </div>
  <p v-else-if="denied" class="text-sm text-slate-400">Tu n'as pas accès aux échanges de ce joueur.</p>
</template>
