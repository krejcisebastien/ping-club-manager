import grid from "../data/evaluation-grid.json" with { type: "json" };

// Grille d'évaluation de base : points (libellé + description) par critère.
// Idempotent : un point déjà présent (même critère et même libellé) n'est pas
// recréé, mais reçoit sa description s'il n'en avait pas. Les points ajoutés
// par le club restent en place, les nouveaux se placent à la suite.
export async function seedEvaluationGrid(prisma, clubId) {
  const existing = await prisma.evaluationItem.findMany({ where: { clubId } });
  const byKey = new Map(existing.map((i) => [`${i.criterion}:${i.label}`, i]));
  const nextPosition = new Map();
  for (const item of existing) {
    nextPosition.set(item.criterion, Math.max(nextPosition.get(item.criterion) ?? 0, item.position + 1));
  }

  let created = 0;
  let described = 0;
  for (const [criterion, items] of Object.entries(grid)) {
    for (const { label, description } of items) {
      const found = byKey.get(`${criterion}:${label}`);
      if (found) {
        if (!found.description) {
          await prisma.evaluationItem.update({ where: { id: found.id }, data: { description } });
          described += 1;
        }
        continue;
      }
      const position = nextPosition.get(criterion) ?? 0;
      nextPosition.set(criterion, position + 1);
      await prisma.evaluationItem.create({ data: { clubId, criterion, label, description, position } });
      created += 1;
    }
  }
  return { created, described };
}
