import { ref, computed, provide, inject } from "vue";
import { api } from "../lib/api.js";

export const EVALUATION_CRITERIA = [
  { key: "service", label: "Service", color: "#0ea5e9" },
  { key: "remise", label: "Remise", color: "#8b5cf6" },
  { key: "coupDroit", label: "Coup droit", color: "#f97316" },
  { key: "revers", label: "Revers", color: "#22c55e" },
  { key: "deplacements", label: "Déplacements", color: "#ef4444" },
  { key: "tactique", label: "Tactique", color: "#eab308" },
  { key: "mental", label: "Mental", color: "#14b8a6" },
  { key: "physique", label: "Physique", color: "#6366f1" },
];

export const POINT_STATUS = {
  OPEN: { label: "à faire", severity: "warn" },
  IN_PROGRESS: { label: "en cours", severity: "info" },
  DONE: { label: "acquis", severity: "success" },
};

export const formatDate = (d) => new Date(d).toLocaleDateString("fr-FR");
export const formatRate = (rate) => (rate == null ? "—" : `${Math.round(rate * 100)}%`);
export const average = (e) => EVALUATION_CRITERIA.reduce((sum, c) => sum + e[c.key], 0) / EVALUATION_CRITERIA.length;

const KEY = Symbol("playerSpace");

// Données de l'espace joueur, chargées une fois par la page parente puis
// partagées avec toutes les pages du menu (tableau de bord, évaluation, suivi...).
export function providePlayerSpace(playerId) {
  const player = ref(null);
  const evaluations = ref([]);
  const rankings = ref([]);
  const equipment = ref([]);
  const traits = ref([]);
  const pointsToWork = ref([]);
  const evolutionNotes = ref([]);
  const attendances = ref([]);
  const campAttendances = ref([]);
  const stats = ref(null);

  async function load() {
    const id = playerId.value;
    const get = (path) => api.get(`/players/${id}${path}`);
    const [p, ev, rk, eq, tr, pts, notes, att, campAtt, seasons] = await Promise.all([
      get(""),
      get("/evaluations"),
      get("/rankings"),
      get("/equipment"),
      get("/traits"),
      get("/points-to-work"),
      get("/evolution-notes"),
      get("/attendance"),
      get("/camp-attendance"),
      api.get("/seasons"),
    ]);
    player.value = p.data.player;
    evaluations.value = ev.data.evaluations;
    rankings.value = rk.data.rankings;
    equipment.value = eq.data.equipment;
    traits.value = tr.data.traits;
    pointsToWork.value = pts.data.pointsToWork;
    evolutionNotes.value = notes.data.evolutionNotes;
    attendances.value = att.data.attendances;
    campAttendances.value = campAtt.data.attendances;

    const activeSeason = seasons.data.seasons.find((s) => s.isActive);
    stats.value = activeSeason ? (await get(`/stats?seasonId=${activeSeason.id}`)).data.stats : null;
  }

  const age = computed(() => {
    if (!player.value?.birthDate) return null;
    const b = new Date(player.value.birthDate);
    const now = new Date();
    let years = now.getFullYear() - b.getFullYear();
    if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) years -= 1;
    return years;
  });
  const currentRanking = computed(() => rankings.value[0]?.rankingValue ?? null);
  const currentEquipment = computed(() => equipment.value.filter((e) => !e.effectiveTo));
  const strengths = computed(() => traits.value.filter((t) => t.category === "STRENGTH" && !t.effectiveTo));
  const weaknesses = computed(() => traits.value.filter((t) => t.category === "WEAKNESS" && !t.effectiveTo));
  const openPoints = computed(() => pointsToWork.value.filter((p) => p.status !== "DONE"));

  const latest = computed(() => evaluations.value[0] ?? null);
  const previous = computed(() => evaluations.value[1] ?? null);
  const delta = (key) => (latest.value && previous.value ? latest.value[key] - previous.value[key] : null);
  const latestAverage = computed(() => (latest.value ? average(latest.value) : null));
  const ranked = computed(() => (latest.value ? [...EVALUATION_CRITERIA].sort((a, b) => latest.value[b.key] - latest.value[a.key]) : []));
  const strongestCriteria = computed(() => ranked.value[0] ?? null);
  const weakestCriteria = computed(() => ranked.value[ranked.value.length - 1] ?? null);

  const radarData = computed(() => {
    if (!latest.value) return null;
    const datasets = [
      {
        label: formatDate(latest.value.date),
        data: EVALUATION_CRITERIA.map((c) => latest.value[c.key]),
        backgroundColor: "rgba(14, 165, 233, 0.2)",
        borderColor: "#0ea5e9",
        pointBackgroundColor: "#0ea5e9",
      },
    ];
    if (previous.value) {
      datasets.unshift({
        label: formatDate(previous.value.date),
        data: EVALUATION_CRITERIA.map((c) => previous.value[c.key]),
        backgroundColor: "rgba(148, 163, 184, 0.12)",
        borderColor: "#94a3b8",
        borderDash: [4, 4],
        pointRadius: 0,
      });
    }
    return { labels: EVALUATION_CRITERIA.map((c) => c.label), datasets };
  });
  const radarOptions = {
    maintainAspectRatio: false,
    scales: { r: { min: 0, max: 10, ticks: { stepSize: 2 } } },
    plugins: { legend: { display: false } },
  };

  const evolutionData = computed(() => {
    if (evaluations.value.length < 2) return null;
    const chronological = [...evaluations.value].reverse();
    return {
      labels: chronological.map((e) => formatDate(e.date)),
      datasets: EVALUATION_CRITERIA.map((c) => ({
        label: c.label,
        data: chronological.map((e) => e[c.key]),
        borderColor: c.color,
        backgroundColor: c.color,
        tension: 0.3,
      })),
    };
  });
  const evolutionOptions = {
    maintainAspectRatio: false,
    scales: { y: { min: 0, max: 10, ticks: { stepSize: 2 } } },
    plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } },
  };

  const space = {
    player, evaluations, rankings, equipment, traits, pointsToWork, evolutionNotes, attendances, campAttendances, stats,
    age, currentRanking, currentEquipment, strengths, weaknesses, openPoints,
    latest, previous, delta, latestAverage, strongestCriteria, weakestCriteria,
    radarData, radarOptions, evolutionData, evolutionOptions,
    load,
  };
  provide(KEY, space);
  return space;
}

export function usePlayerSpace() {
  return inject(KEY);
}
