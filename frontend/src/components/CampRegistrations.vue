<script setup>
import { ref, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import PlayerEnrollmentList from "./PlayerEnrollmentList.vue";
import { api } from "../lib/api.js";
import { fullName } from "../lib/name.js";

// Liste des joueurs inscrits à un stage (base des présences). Modifiable par les
// admins et les entraineurs ; retirer un joueur efface aussi ses présences du stage.
const props = defineProps({
  campId: { type: String, required: true },
  registrations: { type: Array, default: () => [] }, // [{ id, player }]
});
const emit = defineEmits(["changed"]);

const toast = useToast();
const confirm = useConfirm();
const allPlayers = ref([]);

onMounted(async () => {
  allPlayers.value = (await api.get("/players")).data.players;
});

async function onAdd(playerId) {
  try {
    await api.post(`/camps/${props.campId}/players`, { playerId });
    emit("changed");
  } catch (err) {
    toast.add({ severity: "error", summary: "Erreur", detail: err.response?.data?.error ?? "Une erreur est survenue.", life: 4000 });
  }
}

function onRemove(playerId) {
  const registration = props.registrations.find((r) => r.player.id === playerId);
  confirm.require({
    message: `Désinscrire ${fullName(registration?.player)} ? Ses affectations aux groupes et ses présences de ce stage seront supprimées.`,
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Désinscrire",
    acceptClass: "p-button-danger",
    rejectLabel: "Annuler",
    rejectClass: "p-button-secondary p-button-outlined",
    accept: async () => {
      await api.delete(`/camps/${props.campId}/players/${playerId}`);
      emit("changed");
    },
  });
}
</script>

<template>
  <PlayerEnrollmentList
    :assignments="registrations"
    :players="allPlayers"
    empty-label="Aucun joueur inscrit au stage."
    placeholder="Inscrire un joueur…"
    @add="onAdd"
    @remove="onRemove"
  />
</template>
