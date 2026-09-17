<script setup>
import { ref, onMounted } from "vue";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const users = ref([]);
const players = ref([]);
const coaches = ref([]);
const newUser = ref({ email: "", password: "", role: "PLAYER", playerId: "", coachId: "" });
const error = ref("");

async function loadUsers() {
  const { data } = await api.get("/auth/users");
  users.value = data.users;
}

onMounted(async () => {
  const [p, c] = await Promise.all([api.get("/players"), api.get("/coaches")]);
  players.value = p.data.players;
  coaches.value = c.data.coaches;
  await loadUsers();
});

async function onCreate() {
  error.value = "";
  try {
    await api.post("/auth/users", newUser.value);
    newUser.value = { email: "", password: "", role: "PLAYER", playerId: "", coachId: "" };
    await loadUsers();
  } catch (err) {
    error.value = err.response?.data?.error ?? "Erreur lors de la création.";
  }
}

async function onToggleActive(user) {
  await api.put(`/auth/users/${user.id}`, { isActive: !user.isActive });
  await loadUsers();
}

async function onDelete(id) {
  await api.delete(`/auth/users/${id}`);
  await loadUsers();
}

function linkedName(user) {
  if (user.player) return `${user.player.firstName} ${user.player.lastName}`;
  if (user.coach) return `${user.coach.firstName} ${user.coach.lastName}`;
  return "—";
}
</script>

<template>
  <AppLayout title="Comptes utilisateurs" :nav-links="navLinks">
    <div class="bg-white rounded-xl shadow-sm p-4 mb-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Liste</p>
      <ul class="divide-y divide-slate-100">
        <li v-for="u in users" :key="u.id" class="py-2 flex items-center justify-between">
          <span>
            {{ u.email }}
            <span class="text-xs text-slate-400">{{ u.role }} · {{ linkedName(u) }}</span>
          </span>
          <div class="flex items-center gap-3 text-xs">
            <button class="hover:underline" :class="u.isActive ? 'text-amber-600' : 'text-emerald-600'" @click="onToggleActive(u)">
              {{ u.isActive ? "désactiver" : "activer" }}
            </button>
            <button class="text-red-500 hover:underline" @click="onDelete(u.id)">supprimer</button>
          </div>
        </li>
        <li v-if="!users.length" class="py-2 text-slate-400 text-sm">Aucun compte.</li>
      </ul>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Nouveau compte</p>
      <form class="grid gap-2 sm:grid-cols-2" @submit.prevent="onCreate">
        <input v-model="newUser.email" type="email" placeholder="Email" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <input v-model="newUser.password" type="password" placeholder="Mot de passe" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <select v-model="newUser.role" class="rounded-lg border border-slate-300 px-2 py-1.5">
          <option value="ADMIN">Administrateur</option>
          <option value="COACH">Entraineur</option>
          <option value="PLAYER">Joueur</option>
        </select>
        <select v-if="newUser.role === 'PLAYER'" v-model="newUser.playerId" required class="rounded-lg border border-slate-300 px-2 py-1.5">
          <option value="" disabled>Rattacher au joueur…</option>
          <option v-for="p in players" :key="p.id" :value="p.id">{{ p.firstName }} {{ p.lastName }}</option>
        </select>
        <select v-if="newUser.role === 'COACH'" v-model="newUser.coachId" required class="rounded-lg border border-slate-300 px-2 py-1.5">
          <option value="" disabled>Rattacher à l'entraineur…</option>
          <option v-for="c in coaches" :key="c.id" :value="c.id">{{ c.firstName }} {{ c.lastName }}</option>
        </select>
        <button type="submit" class="sm:col-span-2 rounded-lg bg-sky-600 text-white py-1.5 font-medium hover:bg-sky-700">
          Créer le compte
        </button>
      </form>
      <p v-if="error" class="text-sm text-red-600 mt-2">{{ error }}</p>
    </div>
  </AppLayout>
</template>
