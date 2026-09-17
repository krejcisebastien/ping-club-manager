<script setup>
import { ref, onMounted } from "vue";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const exercises = ref([]);
const newExercise = ref({ title: "", description: "", category: "", difficulty: "" });
const editingId = ref("");
const editForm = ref({ title: "", description: "", category: "", difficulty: "" });
const error = ref("");

async function loadExercises() {
  const { data } = await api.get("/exercises");
  exercises.value = data.exercises;
}

onMounted(loadExercises);

async function onCreate() {
  error.value = "";
  try {
    await api.post("/exercises", newExercise.value);
    newExercise.value = { title: "", description: "", category: "", difficulty: "" };
    await loadExercises();
  } catch (err) {
    error.value = err.response?.data?.error ?? "Erreur lors de la création.";
  }
}

async function onDelete(id) {
  await api.delete(`/exercises/${id}`);
  await loadExercises();
}

function onStartEdit(ex) {
  editingId.value = ex.id;
  editForm.value = { title: ex.title, description: ex.description ?? "", category: ex.category ?? "", difficulty: ex.difficulty ?? "" };
}

async function onSaveEdit(id) {
  await api.put(`/exercises/${id}`, editForm.value);
  editingId.value = "";
  await loadExercises();
}
</script>

<template>
  <AppLayout title="Bibliothèque d'exercices" :nav-links="navLinks">
    <div class="bg-white rounded-xl shadow-sm p-4 mb-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Exercices</p>
      <ul class="divide-y divide-slate-100">
        <li v-for="ex in exercises" :key="ex.id" class="py-2">
          <form v-if="editingId === ex.id" class="grid gap-2 sm:grid-cols-2" @submit.prevent="onSaveEdit(ex.id)">
            <input v-model="editForm.title" placeholder="Titre" required class="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
            <input v-model="editForm.category" placeholder="Catégorie" class="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
            <input v-model="editForm.difficulty" placeholder="Difficulté" class="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
            <textarea v-model="editForm.description" placeholder="Description" class="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-1 text-sm" rows="2"></textarea>
            <div class="sm:col-span-2 flex gap-2">
              <button type="submit" class="rounded-lg bg-sky-600 text-white px-3 py-1 text-sm font-medium hover:bg-sky-700">Enregistrer</button>
              <button type="button" class="text-sm text-slate-500 hover:underline" @click="editingId = ''">annuler</button>
            </div>
          </form>
          <template v-else>
            <div class="flex items-center justify-between">
              <span class="font-medium">{{ ex.title }}</span>
              <div class="flex items-center gap-2 text-xs text-slate-400">
                <span v-if="ex.category">{{ ex.category }}</span>
                <span v-if="ex.difficulty">· {{ ex.difficulty }}</span>
                <button class="text-sky-600 hover:underline" @click="onStartEdit(ex)">modifier</button>
                <button class="text-red-500 hover:underline" @click="onDelete(ex.id)">supprimer</button>
              </div>
            </div>
            <p v-if="ex.description" class="text-sm text-slate-500 mt-1">{{ ex.description }}</p>
          </template>
        </li>
        <li v-if="!exercises.length" class="py-2 text-slate-400 text-sm">Aucun exercice.</li>
      </ul>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-4">
      <p class="text-sm font-medium text-slate-600 mb-3">Nouvel exercice</p>
      <form class="grid gap-2 sm:grid-cols-2" @submit.prevent="onCreate">
        <input v-model="newExercise.title" placeholder="Titre" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <input v-model="newExercise.category" placeholder="Catégorie (optionnel)" class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <input v-model="newExercise.difficulty" placeholder="Difficulté (optionnel)" class="rounded-lg border border-slate-300 px-2 py-1.5" />
        <textarea v-model="newExercise.description" placeholder="Description (optionnel)" class="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-1.5" rows="3"></textarea>
        <button type="submit" class="sm:col-span-2 rounded-lg bg-sky-600 text-white py-1.5 font-medium hover:bg-sky-700">
          Créer
        </button>
      </form>
      <p v-if="error" class="text-sm text-red-600 mt-2">{{ error }}</p>
    </div>
  </AppLayout>
</template>
