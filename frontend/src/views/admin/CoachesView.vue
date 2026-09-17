<script setup>
import { ref, onMounted } from "vue";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const coaches = ref([]);
const newCoach = ref({ firstName: "", lastName: "", email: "", phone: "" });
const editingId = ref("");
const editForm = ref({ firstName: "", lastName: "", email: "", phone: "" });
const error = ref("");

async function loadCoaches() {
  const { data } = await api.get("/coaches");
  coaches.value = data.coaches;
}

onMounted(loadCoaches);

async function onCreate() {
  error.value = "";
  try {
    await api.post("/coaches", newCoach.value);
    newCoach.value = { firstName: "", lastName: "", email: "", phone: "" };
    await loadCoaches();
  } catch (err) {
    error.value = err.response?.data?.error ?? "Erreur lors de la création.";
  }
}

function onStartEdit(coach) {
  editingId.value = coach.id;
  editForm.value = { firstName: coach.firstName, lastName: coach.lastName, email: coach.email ?? "", phone: coach.phone ?? "" };
}

async function onSaveEdit(id) {
  await api.put(`/coaches/${id}`, editForm.value);
  editingId.value = "";
  await loadCoaches();
}

async function onDelete(id) {
  await api.delete(`/coaches/${id}`);
  await loadCoaches();
}
</script>

<template>
  <AppLayout title="Entraineurs" :nav-links="navLinks">
    <div class="bg-white rounded-xl shadow-sm p-4 mb-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Liste</p>
      <ul class="divide-y divide-slate-100">
        <li v-for="c in coaches" :key="c.id" class="py-2">
          <template v-if="editingId === c.id">
            <form class="grid gap-2 sm:grid-cols-2" @submit.prevent="onSaveEdit(c.id)">
              <input v-model="editForm.firstName" placeholder="Prénom" required class="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
              <input v-model="editForm.lastName" placeholder="Nom" required class="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
              <input v-model="editForm.email" placeholder="Email" class="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
              <input v-model="editForm.phone" placeholder="Téléphone" class="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
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
              <span>{{ c.firstName }} {{ c.lastName }} <span class="text-xs text-slate-400">{{ c.email }}</span></span>
              <div class="flex items-center gap-3 text-xs">
                <button class="text-sky-600 hover:underline" @click="onStartEdit(c)">modifier</button>
                <button class="text-red-500 hover:underline" @click="onDelete(c.id)">supprimer</button>
              </div>
            </div>
          </template>
        </li>
        <li v-if="!coaches.length" class="py-2 text-slate-400 text-sm">Aucun entraineur.</li>
      </ul>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Nouvel entraineur</p>
      <form class="grid gap-2 sm:grid-cols-2" @submit.prevent="onCreate">
        <input v-model="newCoach.firstName" placeholder="Prénom" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <input v-model="newCoach.lastName" placeholder="Nom" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <input v-model="newCoach.email" placeholder="Email (optionnel)" class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <input v-model="newCoach.phone" placeholder="Téléphone (optionnel)" class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <button type="submit" class="sm:col-span-2 rounded-lg bg-sky-600 text-white py-1.5 font-medium hover:bg-sky-700">
          Créer
        </button>
      </form>
      <p v-if="error" class="text-sm text-red-600 mt-2">{{ error }}</p>
    </div>
  </AppLayout>
</template>
