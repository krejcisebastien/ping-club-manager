import exerciseLibrary from "../data/exercise-library.json" with { type: "json" };

// Peuple la bibliothèque d'exercices de base d'un club (idempotent : les
// exercices déjà présents, identifiés par leur sourceCode, ne sont pas
// recréés). Appelé à la création de chaque club.
export async function seedExerciseLibrary(prisma, clubId) {
  const existing = await prisma.exercise.findMany({
    where: { clubId, sourceCode: { in: exerciseLibrary.map((e) => e.id) } },
    select: { sourceCode: true },
  });
  const already = new Set(existing.map((e) => e.sourceCode));
  const toCreate = exerciseLibrary.filter((e) => !already.has(e.id));
  if (!toCreate.length) return 0;

  await prisma.exercise.createMany({
    skipDuplicates: true,
    data: toCreate.map((item) => ({
      clubId,
      title: item.nom,
      category: item.categorie,
      difficulty: item.difficulte ?? null,
      intensity: item.intensite ?? null,
      levelMin: item.niveauMin ?? null,
      levelMax: item.niveauMax ?? null,
      skills: item.fonctionnalites ?? null,
      objective: item.objectif ?? null,
      instructions: item.consignes ?? null,
      successCriteria: item.criteresReussite ?? null,
      easierVariant: item.varianteFacile ?? null,
      harderVariant: item.varianteDifficile ?? null,
      competitionVariant: item.varianteCompetition ?? null,
      sourceCode: item.id,
    })),
  });
  return toCreate.length;
}
