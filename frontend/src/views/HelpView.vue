<script setup>
// Manuel utilisateur en ligne : chapitres filtrés selon les rôles du compte,
// recherche plein texte (sans accents) et lien direct vers une section
// (/help?s=<id de section>).
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import InputText from "primevue/inputtext";
import AppLayout from "../components/AppLayout.vue";
import { useNavLinks } from "../composables/useNavLinks.js";
import { useAuthStore } from "../stores/auth.js";
import { chaptersForRoles, sectionText } from "../lib/help.js";

const navLinks = useNavLinks();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const CHAPTER_BY_ROLE = { PLAYER: "player", COACH: "coach", ADMIN: "admin" };

const chapters = computed(() => chaptersForRoles(auth.roles));
const activeChapterId = ref(CHAPTER_BY_ROLE[auth.activeRole] ?? "start");
const activeChapter = computed(() => chapters.value.find((c) => c.id === activeChapterId.value) ?? chapters.value[0]);

const query = ref("");
const normalize = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Recherche : tous les mots doivent apparaître dans la section, tous chapitres confondus.
const results = computed(() => {
  const words = normalize(query.value).split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  return chapters.value.flatMap((chapter) =>
    chapter.sections
      .filter((section) => {
        const text = normalize(sectionText(section));
        return words.every((w) => text.includes(w));
      })
      .map((section) => ({ chapter, section }))
  );
});

const openIds = ref(new Set());
const isOpen = (id) => results.value !== null || openIds.value.has(id);
function toggle(id, event) {
  const next = new Set(openIds.value);
  if (event.target.open) next.add(id);
  else next.delete(id);
  openIds.value = next;
}

function selectChapter(id) {
  activeChapterId.value = id;
  query.value = "";
}

async function goToSection(sectionId) {
  const chapter = chapters.value.find((c) => c.sections.some((s) => s.id === sectionId));
  if (!chapter) return;
  query.value = "";
  activeChapterId.value = chapter.id;
  openIds.value = new Set([...openIds.value, sectionId]);
  if (route.query.s !== sectionId) router.replace({ query: { s: sectionId } });
  await nextTick();
  document.getElementById(`help-${sectionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

onMounted(() => {
  if (route.query.s) goToSection(String(route.query.s));
  else if (activeChapter.value?.sections.length) openIds.value = new Set([activeChapter.value.sections[0].id]);
});

watch(activeChapterId, () => {
  if (route.query.s) router.replace({ query: {} });
});
</script>

<template>
  <AppLayout title="Aide" :nav-links="navLinks">
    <div class="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex flex-wrap gap-2" role="tablist" aria-label="Chapitres">
        <button
          v-for="c in chapters"
          :key="c.id"
          type="button"
          role="tab"
          :aria-selected="!results && c.id === activeChapter?.id"
          class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors"
          :class="
            !results && c.id === activeChapter?.id
              ? 'bg-sky-600 border-sky-600 text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-700'
          "
          @click="selectChapter(c.id)"
        >
          <i :class="c.icon" class="text-xs" aria-hidden="true"></i>
          {{ c.title }}
        </button>
      </div>
      <div class="relative w-full lg:w-72">
        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
        <InputText v-model="query" placeholder="Rechercher dans l'aide…" class="w-full pl-9" aria-label="Rechercher dans l'aide" />
      </div>
    </div>

    <!-- Résultats de recherche -->
    <div v-if="results" class="space-y-3">
      <p class="text-sm text-slate-500">{{ results.length }} résultat(s) pour « {{ query.trim() }} »</p>
      <article
        v-for="{ chapter, section } in results"
        :key="section.id"
        class="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
      >
        <p class="text-xs text-sky-700 mb-1"><i :class="chapter.icon" class="text-xs mr-1" aria-hidden="true"></i>{{ chapter.title }}</p>
        <h2 class="font-semibold text-slate-800 mb-2">{{ section.title }}</h2>
        <!-- Contenu statique de lib/help.js (jamais de saisie utilisateur). -->
        <div class="help-body" v-html="section.body"></div>
        <button type="button" class="mt-3 text-sm text-sky-700 hover:underline" @click="goToSection(section.id)">
          Voir dans le chapitre
        </button>
      </article>
      <p v-if="!results.length" class="bg-white rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
        Aucun résultat. Essaie un autre mot (par exemple « présences », « mot de passe », « stage »).
      </p>
    </div>

    <!-- Chapitre -->
    <div v-else-if="activeChapter" class="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-6 lg:items-start">
      <nav class="hidden lg:block lg:sticky lg:top-4 bg-white rounded-xl shadow-sm border border-slate-200 p-3" aria-label="Sommaire">
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2 px-2">{{ activeChapter.title }}</p>
        <a
          v-for="s in activeChapter.sections"
          :key="s.id"
          :href="`?s=${s.id}`"
          class="block rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-sky-700"
          @click.prevent="goToSection(s.id)"
        >
          {{ s.title }}
        </a>
      </nav>

      <div class="space-y-3">
        <details
          v-for="s in activeChapter.sections"
          :id="`help-${s.id}`"
          :key="s.id"
          :open="isOpen(s.id)"
          class="group bg-white rounded-xl shadow-sm border border-slate-200 scroll-mt-20"
          @toggle="toggle(s.id, $event)"
        >
          <summary class="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-medium text-slate-800">
            {{ s.title }}
            <i class="pi pi-chevron-down text-xs text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true"></i>
          </summary>
          <!-- Contenu statique de lib/help.js (jamais de saisie utilisateur). -->
          <div class="help-body px-4 pb-4" v-html="s.body"></div>
        </details>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
summary::-webkit-details-marker {
  display: none;
}
.help-body {
  color: #334155; /* slate-700 */
  font-size: 0.9rem;
  line-height: 1.6;
}
.help-body :deep(p) {
  margin: 0 0 0.6rem;
}
.help-body :deep(ul),
.help-body :deep(ol) {
  margin: 0 0 0.6rem;
  padding-left: 1.25rem;
}
.help-body :deep(ul) {
  list-style: disc;
}
.help-body :deep(ol) {
  list-style: decimal;
}
.help-body :deep(li) {
  margin: 0.2rem 0;
}
.help-body :deep(li > ul) {
  margin-top: 0.3rem;
}
.help-body :deep(strong) {
  color: #1e293b; /* slate-800 */
  font-weight: 600;
}
.help-body > :deep(:last-child) {
  margin-bottom: 0;
}
</style>
