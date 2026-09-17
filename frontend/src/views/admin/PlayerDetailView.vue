<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppLayout from "../../components/AppLayout.vue";
import { api } from "../../lib/api.js";
import { useNavLinks } from "../../composables/useNavLinks.js";

const navLinks = useNavLinks();

const route = useRoute();
const router = useRouter();
const playerId = route.params.id;

const player = ref(null);
const editForm = ref({ firstName: "", lastName: "", birthDate: "", licenseNumber: "" });
const savingInfo = ref(false);

const seasons = ref([]);
const rankings = ref([]);
const newRanking = ref({ seasonId: "", rankingValue: "" });

const equipment = ref([]);
const newEquipment = ref({ type: "", brand: "", model: "" });

const traits = ref([]);
const newTrait = ref({ category: "STRENGTH", description: "" });

const pointsToWork = ref([]);
const newPoint = ref({ description: "" });

const evolutionNotes = ref([]);
const newNote = ref({ note: "" });

async function loadAll() {
  const [p, s, r, eq, tr, pts, notes] = await Promise.all([
    api.get(`/players/${playerId}`),
    api.get("/seasons"),
    api.get(`/players/${playerId}/rankings`),
    api.get(`/players/${playerId}/equipment`),
    api.get(`/players/${playerId}/traits`),
    api.get(`/players/${playerId}/points-to-work`),
    api.get(`/players/${playerId}/evolution-notes`),
  ]);
  player.value = p.data.player;
  editForm.value = {
    firstName: p.data.player.firstName,
    lastName: p.data.player.lastName,
    birthDate: p.data.player.birthDate.slice(0, 10),
    licenseNumber: p.data.player.licenseNumber ?? "",
  };
  seasons.value = s.data.seasons;
  rankings.value = r.data.rankings;
  equipment.value = eq.data.equipment;
  traits.value = tr.data.traits;
  pointsToWork.value = pts.data.pointsToWork;
  evolutionNotes.value = notes.data.evolutionNotes;
}

onMounted(loadAll);

async function onSaveInfo() {
  savingInfo.value = true;
  try {
    await api.put(`/players/${playerId}`, editForm.value);
    await loadAll();
  } finally {
    savingInfo.value = false;
  }
}

async function onAddRanking() {
  if (!newRanking.value.seasonId || !newRanking.value.rankingValue) return;
  await api.post(`/players/${playerId}/rankings`, newRanking.value);
  newRanking.value = { seasonId: "", rankingValue: "" };
  await loadAll();
}

async function onAddEquipment() {
  if (!newEquipment.value.type) return;
  await api.post(`/players/${playerId}/equipment`, newEquipment.value);
  newEquipment.value = { type: "", brand: "", model: "" };
  await loadAll();
}

async function onCloseEquipment(equipmentId) {
  await api.put(`/players/${playerId}/equipment/${equipmentId}/close`);
  await loadAll();
}

async function onAddTrait() {
  if (!newTrait.value.description) return;
  await api.post(`/players/${playerId}/traits`, newTrait.value);
  newTrait.value = { category: "STRENGTH", description: "" };
  await loadAll();
}

async function onAddPoint() {
  if (!newPoint.value.description) return;
  await api.post(`/players/${playerId}/points-to-work`, newPoint.value);
  newPoint.value = { description: "" };
  await loadAll();
}

async function onUpdatePointStatus(point, status) {
  await api.put(`/players/${playerId}/points-to-work/${point.id}`, { status });
  await loadAll();
}

async function onAddNote() {
  if (!newNote.value.note) return;
  await api.post(`/players/${playerId}/evolution-notes`, newNote.value);
  newNote.value = { note: "" };
  await loadAll();
}
</script>

<template>
  <AppLayout :title="player ? `${player.firstName} ${player.lastName}` : 'Joueur'" :nav-links="navLinks">
    <button class="text-sm text-sky-600 hover:underline mb-3" @click="router.push('/admin/players')">← retour</button>

    <div v-if="player" class="space-y-4">
      <div class="bg-white rounded-xl shadow-sm p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Signalétique</p>
        <form class="grid gap-2 sm:grid-cols-2" @submit.prevent="onSaveInfo">
          <input v-model="editForm.firstName" placeholder="Prénom" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
          <input v-model="editForm.lastName" placeholder="Nom" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
          <input v-model="editForm.birthDate" type="date" required class="rounded-lg border border-slate-300 px-2 py-1.5" />
          <input v-model="editForm.licenseNumber" placeholder="N° de licence" class="rounded-lg border border-slate-300 px-2 py-1.5" />
          <button type="submit" :disabled="savingInfo" class="sm:col-span-2 rounded-lg bg-sky-600 text-white py-1.5 font-medium hover:bg-sky-700 disabled:opacity-60">
            Enregistrer
          </button>
        </form>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Classement</p>
        <ul class="divide-y divide-slate-100 mb-3 text-sm">
          <li v-for="r in rankings" :key="r.id" class="py-1.5 flex items-center justify-between">
            <span>{{ r.rankingValue }}</span>
            <span class="text-xs text-slate-400">{{ new Date(r.effectiveDate).toLocaleDateString("fr-FR") }}</span>
          </li>
          <li v-if="!rankings.length" class="py-1.5 text-slate-400 text-sm">Aucun classement enregistré.</li>
        </ul>
        <div class="flex gap-2">
          <select v-model="newRanking.seasonId" class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="" disabled>Saison…</option>
            <option v-for="s in seasons" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <input v-model="newRanking.rankingValue" placeholder="Classement (ex. 1500)" class="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <button class="rounded-lg bg-sky-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-sky-700" @click="onAddRanking">
            Ajouter
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Matériel</p>
        <ul class="divide-y divide-slate-100 mb-3 text-sm">
          <li v-for="e in equipment" :key="e.id" class="py-1.5 flex items-center justify-between">
            <span>{{ e.type }} <span class="text-slate-400">{{ e.brand }} {{ e.model }}</span></span>
            <button v-if="!e.effectiveTo" class="text-xs text-red-500 hover:underline" @click="onCloseEquipment(e.id)">clôturer</button>
            <span v-else class="text-xs text-slate-400">terminé</span>
          </li>
          <li v-if="!equipment.length" class="py-1.5 text-slate-400 text-sm">Aucun matériel enregistré.</li>
        </ul>
        <div class="flex gap-2">
          <input v-model="newEquipment.type" placeholder="Type (raquette, revêtement...)" class="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <input v-model="newEquipment.brand" placeholder="Marque" class="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <input v-model="newEquipment.model" placeholder="Modèle" class="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <button class="rounded-lg bg-sky-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-sky-700" @click="onAddEquipment">
            Ajouter
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Points forts / défauts</p>
        <ul class="divide-y divide-slate-100 mb-3 text-sm">
          <li v-for="t in traits" :key="t.id" class="py-1.5">
            <span :class="t.category === 'STRENGTH' ? 'text-emerald-600' : 'text-red-500'" class="font-medium">
              {{ t.category === "STRENGTH" ? "+" : "−" }}
            </span>
            {{ t.description }}
          </li>
          <li v-if="!traits.length" class="py-1.5 text-slate-400 text-sm">Aucun point renseigné.</li>
        </ul>
        <div class="flex gap-2">
          <select v-model="newTrait.category" class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="STRENGTH">Point fort</option>
            <option value="WEAKNESS">Défaut</option>
          </select>
          <input v-model="newTrait.description" placeholder="Description" class="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <button class="rounded-lg bg-sky-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-sky-700" @click="onAddTrait">
            Ajouter
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Points à travailler</p>
        <ul class="divide-y divide-slate-100 mb-3 text-sm">
          <li v-for="pt in pointsToWork" :key="pt.id" class="py-1.5 flex items-center justify-between gap-2">
            <span>{{ pt.description }}</span>
            <select :value="pt.status" class="rounded-lg border border-slate-300 px-1.5 py-1 text-xs" @change="onUpdatePointStatus(pt, $event.target.value)">
              <option value="OPEN">à faire</option>
              <option value="IN_PROGRESS">en cours</option>
              <option value="DONE">acquis</option>
            </select>
          </li>
          <li v-if="!pointsToWork.length" class="py-1.5 text-slate-400 text-sm">Aucun point enregistré.</li>
        </ul>
        <div class="flex gap-2">
          <input v-model="newPoint.description" placeholder="Nouveau point à travailler" class="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <button class="rounded-lg bg-sky-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-sky-700" @click="onAddPoint">
            Ajouter
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-4">
        <p class="text-sm font-medium text-slate-600 mb-3">Notes d'évolution</p>
        <ul class="divide-y divide-slate-100 mb-3 text-sm">
          <li v-for="n in evolutionNotes" :key="n.id" class="py-1.5">
            <span class="text-xs text-slate-400">{{ new Date(n.date).toLocaleDateString("fr-FR") }}</span>
            — {{ n.note }}
          </li>
          <li v-if="!evolutionNotes.length" class="py-1.5 text-slate-400 text-sm">Aucune note.</li>
        </ul>
        <div class="flex gap-2">
          <input v-model="newNote.note" placeholder="Nouvelle note" class="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <button class="rounded-lg bg-sky-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-sky-700" @click="onAddNote">
            Ajouter
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
