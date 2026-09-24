import Anthropic from "@anthropic-ai/sdk";
import exerciseLibrary from "../data/exercise-library.json" with { type: "json" };

const MODEL = "claude-sonnet-5";

const CATEGORIES = [
  "Regularite", "Topspin", "Service", "Remise", "Bloc", "Deplacements",
  "PanierDeBalles", "Poussette", "Tactique", "Defense", "ContreInitiative",
  "Physique", "Mental", "Jeunes",
];

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error("Génération IA indisponible : ANTHROPIC_API_KEY n'est pas configurée.");
    err.code = "AI_NOT_CONFIGURED";
    throw err;
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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

const EXERCISE_TOOL = {
  name: "submit_exercise",
  description: "Soumet la fiche d'un exercice de tennis de table structuré.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Nom court de l'exercice" },
      category: { type: "string", enum: CATEGORIES },
      difficulty: { type: "integer", minimum: 1, maximum: 5 },
      intensity: { type: "integer", minimum: 1, maximum: 5 },
      skills: { type: "array", items: { type: "string" }, description: "Qualités travaillées, 2 à 4 mots-clés" },
      objective: { type: "string", description: "Une phrase claire décrivant le but de l'exercice" },
      instructions: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
      successCriteria: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 3,
        description: "Critères chiffrés ou observables (ex. '8 balles sur 10 en cible.'), jamais de formulation vague type 'bonne qualité' ou 'transition fluide'",
      },
      easierVariant: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 1 },
      harderVariant: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 1 },
      competitionVariant: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 1 },
    },
    required: ["title", "category", "difficulty", "intensity", "skills", "objective", "instructions", "successCriteria", "easierVariant", "harderVariant", "competitionVariant"],
  },
};

function extractToolInput(message, toolName) {
  const block = message.content.find((b) => b.type === "tool_use" && b.name === toolName);
  if (!block) throw new Error("Réponse IA invalide : aucune fiche structurée reçue.");
  return block.input;
}

// Génère un exercice (brouillon, non enregistré) sur base de critères libres.
export async function generateExercise({ category, difficulty, skills, notes }) {
  const examples = sampleExamples(category);
  const criteria = [
    category && `Catégorie souhaitée : ${category}.`,
    difficulty && `Difficulté souhaitée : ${difficulty}/5.`,
    skills?.length && `Qualités à travailler : ${skills.join(", ")}.`,
    notes && `Consignes du coach : ${notes}`,
  ].filter(Boolean).join("\n");

  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1500,
    system:
      "Tu es un entraineur expert de tennis de table qui conçoit des exercices d'entrainement pour un club. " +
      "Réponds uniquement en français. Chaque critère de réussite doit être chiffré ou observable " +
      "(ex. \"8 services sur 10 en cible.\"), jamais une formulation vague (\"bonne qualité\", \"transition fluide\"). " +
      "Voici des exemples représentatifs du style attendu dans la bibliothèque du club :\n" +
      JSON.stringify(examples, null, 2),
    tools: [EXERCISE_TOOL],
    tool_choice: { type: "tool", name: "submit_exercise" },
    messages: [
      {
        role: "user",
        content: criteria || "Propose un exercice pertinent pour un club de tennis de table, niveau varié.",
      },
    ],
  });

  return extractToolInput(message, "submit_exercise");
}

const PLAN_TOOL = {
  name: "submit_training_plan",
  description: "Soumet un plan d'entrainement construit à partir d'exercices existants.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: "string", description: "2-3 phrases décrivant le déroulé et les objectifs de la séance" },
      exerciseIds: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        description: "Identifiants d'exercices choisis dans la liste fournie, dans l'ordre où ils doivent être enchaînés",
      },
    },
    required: ["title", "description", "exerciseIds"],
  },
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

  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1500,
    system:
      "Tu es un entraineur expert de tennis de table qui construit des séances d'entrainement pour un club, " +
      "en choisissant uniquement parmi les exercices déjà existants dans la bibliothèque du club (fournie ci-dessous). " +
      "N'invente jamais d'exercice : choisis des identifiants (\"id\") réels dans la liste, dans un ordre pédagogique " +
      "cohérent (échauffement/régularité d'abord, exercices plus intenses ou tactiques ensuite). Réponds en français.\n" +
      "Bibliothèque disponible :\n" + JSON.stringify(catalog),
    tools: [PLAN_TOOL],
    tool_choice: { type: "tool", name: "submit_training_plan" },
    messages: [
      {
        role: "user",
        content: [
          theme && `Thème de la séance : ${theme}.`,
          `Nombre d'exercices souhaité : environ ${count}.`,
        ].filter(Boolean).join("\n"),
      },
    ],
  });

  const draft = extractToolInput(message, "submit_training_plan");
  const validIds = new Set(availableExercises.map((e) => e.id));
  draft.exerciseIds = draft.exerciseIds.filter((id) => validIds.has(id));
  return draft;
}
