<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const router = useRouter();
const players = ref([]);
const newPlayer = ref({ firstName: "", lastName: "", birthDate: "", licenseNumber: "" });
const error = ref("");

async function loadPlayers() {
  const { data } = await api.get("/players");
  players.value = data.players;
}

onMounted(loadPlayers);

async function onCreate() {
  error.value = "";
  try {
    await api.post("/players", newPlayer.value);
    newPlayer.value = { firstName: "", lastName: "", birthDate: "", licenseNumber: "" };
    await loadPlayers();
  } catch (err) {
    error.value = err.response?.data?.error ?? "Erreur lors de la création.";
  }
}

async function onDelete(id) {
  await api.delete(`/players/${id}`);
  await loadPlayers();
}
</script>

<template>
  <AppLayout title="Joueurs" :nav-links="navLinks">
    <div class="bg-white rounded-xl shadow-sm p-4 mb-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Liste</p>
      <ul class="divide-y divide-slate-100">
        <li v-for="p in players" :key="p.id" class="py-2 flex items-center justify-between">
          <span class="cursor-pointer hover:text-sky-600" @click="router.push(`/admin/players/${p.id}`)">
            {{ p.firstName }} {{ p.lastName }}
            <span class="text-xs text-slate-400">{{ new Date(p.birthDate).toLocaleDateString("fr-FR") }}</span>
          </span>
          <button class="text-xs text-red-500 hover:underline" @click="onDelete(p.id)">supprimer</button>
        </li>
        <li v-if="!players.length" class="py-2 text-slate-400 text-sm">Aucun joueur.</li>
      </ul>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Nouveau joueur</p>
      <form class="grid gap-2 sm:grid-cols-2" @submit.prevent="onCreate">
        <input v-model="newPlayer.firstName" placeholder="Prénom" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <input v-model="newPlayer.lastName" placeholder="Nom" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <div>
          <label class="text-xs text-slate-500">Date de naissance</label>
          <input v-model="newPlayer.birthDate" type="date" required class="w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </div>
        <input v-model="newPlayer.licenseNumber" placeholder="N° de licence (optionnel)" class="rounded-lg border border-slate-300 px-2 py-1.5 self-end" />
        <button type="submit" class="sm:col-span-2 rounded-lg bg-sky-600 text-white py-1.5 font-medium hover:bg-sky-700">
          Créer
        </button>
      </form>
      <p v-if="error" class="text-sm text-red-600 mt-2">{{ error }}</p>
    </div>
  </AppLayout>
</template>
