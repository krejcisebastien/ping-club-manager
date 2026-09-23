export const EXERCISE_CATEGORY_OPTIONS = [
  { value: "Regularite", label: "Régularité" },
  { value: "Topspin", label: "Topspin" },
  { value: "Service", label: "Service" },
  { value: "Remise", label: "Remise" },
  { value: "Bloc", label: "Bloc" },
  { value: "Deplacements", label: "Déplacements" },
  { value: "PanierDeBalles", label: "Panier de balles" },
  { value: "Poussette", label: "Poussette" },
  { value: "Tactique", label: "Tactique" },
  { value: "Defense", label: "Défense" },
  { value: "ContreInitiative", label: "Contre-initiative" },
  { value: "Physique", label: "Physique" },
  { value: "Mental", label: "Mental" },
  { value: "Jeunes", label: "Jeunes" },
];
export const EXERCISE_CATEGORY_LABELS = Object.fromEntries(EXERCISE_CATEGORY_OPTIONS.map((c) => [c.value, c.label]));

export const EXERCISE_DIFFICULTY_OPTIONS = [
  { value: "NIVEAU_1", label: "1/5" },
  { value: "NIVEAU_2", label: "2/5" },
  { value: "NIVEAU_3", label: "3/5" },
  { value: "NIVEAU_4", label: "4/5" },
  { value: "NIVEAU_5", label: "5/5" },
];
export const EXERCISE_DIFFICULTY_LABELS = Object.fromEntries(EXERCISE_DIFFICULTY_OPTIONS.map((d) => [d.value, d.label]));
