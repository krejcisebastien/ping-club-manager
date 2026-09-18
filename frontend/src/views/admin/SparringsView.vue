<script setup>
import { ref, onMounted } from "vue";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const emptyForm = () => ({ firstName: "", lastName: "", ranking: "", isClubMember: false, playerId: "", externalClub: "" });

const sparrings = ref([]);
const players = ref([]);
const newSparring = ref(emptyForm());
const editingId = ref("");
const editForm = ref(emptyForm());
const error = ref("");

async function loadSparrings() {
  const { data } = await api.get("/sparrings");
  sparrings.value = data.sparrings;
}

onMounted(async () => {
  const [s, p] = await Promise.all([api.get("/sparrings"), api.get("/players")]);
  sparrings.value = s.data.sparrings;
  players.value = p.data.players;
});

async function onCreate() {
  error.value = "";
  try {
    await api.post("/sparrings", newSparring.value);
    newSparring.value = emptyForm();
    await loadSparrings();
  } catch (err) {
    error.value = err.response?.data?.error ?? "Erreur lors de la création.";
  }
}

function onStartEdit(sparring) {
  editingId.value = sparring.id;
  editForm.value = {
    firstName: sparring.firstName,
    lastName: sparring.lastName,
    ranking: sparring.ranking ?? "",
    isClubMember: sparring.isClubMember,
    playerId: sparring.playerId ?? "",
    externalClub: sparring.externalClub ?? "",
  };
}

async function onSaveEdit(id) {
  error.value = "";
  try {
    await api.put(`/sparrings/${id}`, editForm.value);
    editingId.value = "";
    await loadSparrings();
  } catch (err) {
    error.value = err.response?.data?.error ?? "Erreur lors de la modification.";
  }
}

async function onDelete(id) {
  await api.delete(`/sparrings/${id}`);
  await loadSparrings();
}

function playerName(playerId) {
  const p = players.value.find((pl) => pl.id === playerId);
  return p ? `${p.firstName} ${p.lastName}` : "";
}
</script>

<template>
  <AppLayout title="Sparrings" :nav-links="navLinks">
    <div class="bg-white rounded-xl shadow-sm p-4 mb-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Liste</p>
      <ul class="divide-y divide-slate-100">
        <li v-for="s in sparrings" :key="s.id" class="py-2">
          <template v-if="editingId === s.id">
            <form class="grid gap-2 sm:grid-cols-2" @submit.prevent="onSaveEdit(s.id)">
              <input v-model="editForm.firstName" placeholder="Prénom" required class="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
              <input v-model="editForm.lastName" placeholder="Nom" required class="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
              <input v-model="editForm.ranking" placeholder="Classement (optionnel)" class="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
              <label class="flex items-center gap-2 text-sm text-slate-600">
                <input v-model="editForm.isClubMember" type="checkbox" /> Joueur du club
              </label>
              <select v-if="editForm.isClubMember" v-model="editForm.playerId" class="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-1 text-sm">
                <option value="" disabled>Choisir le joueur…</option>
                <option v-for="p in players" :key="p.id" :value="p.id">{{ p.firstName }} {{ p.lastName }}</option>
              </select>
              <input v-else v-model="editForm.externalClub" placeholder="Club extérieur (optionnel)" class="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-1 text-sm" />
              <div class="sm:col-span-2 flex gap-2">
                <button type="submit" class="rounded-lg bg-sky-600 text-white px-3 py-1 text-sm font-medium hover:bg-sky-700">
                  Enregistrer
                </button>
                <button type="button" class="text-sm text-slate-500 hover:underline" @click="editingId = ''">annuler</button>
              </div>
            </form>
          </template>
          <template v-else>
            <div class="flex items-center justify-between">
              <span>
                {{ s.firstName }} {{ s.lastName }}
                <span class="text-xs text-slate-400">
                  {{ s.ranking }}
                  · {{ s.isClubMember ? `joueur du club${s.playerId ? " (" + playerName(s.playerId) + ")" : ""}` : (s.externalClub || "extérieur") }}
                </span>
              </span>
              <div class="flex items-center gap-3 text-xs">
                <button class="text-sky-600 hover:underline" @click="onStartEdit(s)">modifier</button>
                <button class="text-red-500 hover:underline" @click="onDelete(s.id)">supprimer</button>
              </div>
            </div>
          </template>
        </li>
        <li v-if="!sparrings.length" class="py-2 text-slate-400 text-sm">Aucun sparring.</li>
      </ul>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Nouveau sparring</p>
      <form class="grid gap-2 sm:grid-cols-2" @submit.prevent="onCreate">
        <input v-model="newSparring.firstName" placeholder="Prénom" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <input v-model="newSparring.lastName" placeholder="Nom" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <input v-model="newSparring.ranking" placeholder="Classement (optionnel)" class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <label class="flex items-center gap-2 text-sm text-slate-600">
          <input v-model="newSparring.isClubMember" type="checkbox" /> Joueur du club
        </label>
        <select v-if="newSparring.isClubMember" v-model="newSparring.playerId" class="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-1.5">
          <option value="" disabled>Choisir le joueur…</option>
          <option v-for="p in players" :key="p.id" :value="p.id">{{ p.firstName }} {{ p.lastName }}</option>
        </select>
        <input v-else v-model="newSparring.externalClub" placeholder="Club extérieur (optionnel)" class="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-1.5" />
        <button type="submit" class="sm:col-span-2 rounded-lg bg-sky-600 text-white py-1.5 font-medium hover:bg-sky-700">
          Créer
        </button>
      </form>
      <p v-if="error" class="text-sm text-red-600 mt-2">{{ error }}</p>
    </div>
  </AppLayout>
</template>
