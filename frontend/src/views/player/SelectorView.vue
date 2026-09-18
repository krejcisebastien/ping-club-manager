<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useAuthStore } from "../../stores/auth.js";

const auth = useAuthStore();
const router = useRouter();
const players = ref([]);
const loading = ref(true);

onMounted(async () => {
  const results = await Promise.all(auth.user.playerIds.map((id) => api.get(`/players/${id}`)));
  players.value = results.map((r) => r.data.player);
  loading.value = false;

  if (players.value.length === 1) {
    router.replace(`/player/${players.value[0].id}`);
  }
});
</script>

<template>
  <AppLayout title="Mon espace joueur">
    <div v-if="!loading" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <p class="text-sm text-slate-500 mb-3">Choisis un joueur</p>
      <ul class="divide-y divide-slate-100">
        <li
          v-for="p in players"
          :key="p.id"
          class="py-3 cursor-pointer hover:text-sky-600"
          @click="router.push(`/player/${p.id}`)"
        >
          {{ p.firstName }} {{ p.lastName }}
        </li>
        <li v-if="!players.length" class="py-2 text-slate-400 text-sm">Aucun joueur rattaché à ce compte.</li>
      </ul>
    </div>
  </AppLayout>
</template>
