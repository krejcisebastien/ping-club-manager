import { GoogleGenAI } from "@google/genai";
import exerciseLibrary from "../data/exercise-library.json" with { type: "json" };

// Modèle gratuit (aucune carte bancaire requise) : 10 requêtes/minute,
// 500 requêtes/jour, largement suffisant vu la limite de 20/heure ci-dessous.
const MODEL = "gemini-2.5-flash";

const CATEGORIES = [
  "Regularite", "Topspin", "Service", "Remise", "Bloc", "Deplacements",
  "PanierDeBalles", "Poussette", "Tactique", "Defense", "ContreInitiative",
  "Physique", "Mental", "Jeunes",
];

let client = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error("Génération IA indisponible : GEMINI_API_KEY n'est pas configurée.");
    err.code = "AI_NOT_CONFIGURED";
    throw err;
  }
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

// Quelques exemples réels de la bibliothèque, comme référence de style et de
// niveau de détail (consignes actionnables, critères chiffrés/observables).
function sampleExamples(category, count = 4) {
  const pool = category ? exerciseLibrary.filter((e) => e.categorie === category) : exerciseLibrary;
  const source = pool.length >= count ? pool : exerciseLibrary;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((e) => ({
    nom: e.nom,
    categorie: e.categorie,
    difficulte: e.difficulte,
    intensite: e.intensite,
    fonctionnalites: e.fonctionnalites,
    objectif: e.objectif,
    consignes: e.consignes,
    criteresReussite: e.criteresReussite,
    varianteFacile: e.varianteFacile,
    varianteDifficile: e.varianteDifficile,
    varianteCompetition: e.varianteCompetition,
  }));
}

async function generateJson({ systemInstruction, prompt, schema, maxOutputTokens = 1500 }) {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { systemInstruction, responseMimeType: "application/json", responseSchema: schema, maxOutputTokens },
  });
  if (!response.text) throw new Error("Réponse IA invalide : aucun contenu reçu.");
  return JSON.parse(response.text);
}

const EXERCISE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING", description: "Nom court de l'exercice" },
    category: { type: "STRING", enum: CATEGORIES },
    difficulty: { type: "INTEGER", minimum: 1, maximum: 5 },
    intensity: { type: "INTEGER", minimum: 1, maximum: 5 },
    skills: { type: "ARRAY", items: { type: "STRING" }, description: "Qualités travaillées, 2 à 4 mots-clés" },
    objective: { type: "STRING", description: "Une phrase claire décrivant le but de l'exercice" },
    instructions: { type: "ARRAY", items: { type: "STRING" }, minItems: "2", maxItems: "4" },
    successCriteria: {
      type: "ARRAY",
      items: { type: "STRING" },
      minItems: "2",
      maxItems: "3",
      description: "Critères chiffrés ou observables (ex. '8 balles sur 10 en cible.'), jamais de formulation vague type 'bonne qualité' ou 'transition fluide'",
    },
    easierVariant: { type: "ARRAY", items: { type: "STRING" }, minItems: "1", maxItems: "1" },
    harderVariant: { type: "ARRAY", items: { type: "STRING" }, minItems: "1", maxItems: "1" },
    competitionVariant: { type: "ARRAY", items: { type: "STRING" }, minItems: "1", maxItems: "1" },
  },
  required: ["title", "category", "difficulty", "intensity", "skills", "objective", "instructions", "successCriteria", "easierVariant", "harderVariant", "competitionVariant"],
};

// Génère un exercice (brouillon, non enregistré) sur base de critères libres.
export async function generateExercise({ category, difficulty, skills, notes }) {
  const examples = sampleExamples(category);
  const criteria = [
    category && `Catégorie souhaitée : ${category}.`,
    difficulty && `Difficulté souhaitée : ${difficulty}/5.`,
    skills?.length && `Qualités à travailler : ${skills.join(", ")}.`,
    notes && `Consignes du coach : ${notes}`,
  ].filter(Boolean).join("\n");

  return generateJson({
    systemInstruction:
      "Tu es un entraineur expert de tennis de table qui conçoit des exercices d'entrainement pour un club. " +
      "Réponds uniquement en français. Chaque critère de réussite doit être chiffré ou observable " +
      "(ex. \"8 services sur 10 en cible.\"), jamais une formulation vague (\"bonne qualité\", \"transition fluide\"). " +
      "Voici des exemples représentatifs du style attendu dans la bibliothèque du club :\n" +
      JSON.stringify(examples, null, 2),
    prompt: criteria || "Propose un exercice pertinent pour un club de tennis de table, niveau varié.",
    schema: EXERCISE_SCHEMA,
  });
}

const PLAN_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    description: { type: "STRING", description: "2-3 phrases décrivant le déroulé et les objectifs de la séance" },
    exerciseIds: {
      type: "ARRAY",
      items: { type: "STRING" },
      minItems: "3",
      description: "Identifiants d'exercices choisis dans la liste fournie, dans l'ordre où ils doivent être enchaînés",
    },
  },
  required: ["title", "description", "exerciseIds"],
};

// Sélectionne et ordonne des exercices existants du club pour construire un
// plan d'entrainement (l'IA n'invente pas de nouveaux exercices ici).
export async function generateTrainingPlan({ theme, exerciseCount, availableExercises }) {
  const catalog = availableExercises.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    difficulty: e.difficulty,
    objective: e.objective,
  }));

  const count = exerciseCount && exerciseCount > 0 ? exerciseCount : 5;

  const draft = await generateJson({
    systemInstruction:
      "Tu es un entraineur expert de tennis de table qui construit des séances d'entrainement pour un club, " +
      "en choisissant uniquement parmi les exercices déjà existants dans la bibliothèque du club (fournie ci-dessous). " +
      "N'invente jamais d'exercice : choisis des identifiants (\"id\") réels dans la liste, dans un ordre pédagogique " +
      "cohérent (échauffement/régularité d'abord, exercices plus intenses ou tactiques ensuite). Réponds en français.\n" +
      "Bibliothèque disponible :\n" + JSON.stringify(catalog),
    prompt: [
      theme && `Thème de la séance : ${theme}.`,
      `Nombre d'exercices souhaité : environ ${count}.`,
    ].filter(Boolean).join("\n"),
    schema: PLAN_SCHEMA,
    maxOutputTokens: 2000,
  });

  const validIds = new Set(availableExercises.map((e) => e.id));
  draft.exerciseIds = draft.exerciseIds.filter((id) => validIds.has(id));
  return draft;
}
