<script setup>
import { ref, onMounted } from "vue";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const players = ref([]);

onMounted(async () => {
  const { data } = await api.get("/players");
  players.value = data.players;
});
</script>

<template>
  <AppLayout title="Espace entraineur" :nav-links="navLinks">
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <p class="text-sm text-slate-500 mb-2">Joueurs du club</p>
      <ul class="divide-y divide-slate-100">
        <li v-for="p in players" :key="p.id" class="py-2 text-slate-700">
          {{ p.firstName }} {{ p.lastName }}
        </li>
      </ul>
    </div>
  </AppLayout>
</template>
