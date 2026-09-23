-- Fiche pédagogique enrichie pour les exercices (import d'une bibliothèque
-- standard : objectif, consignes, critères de réussite, variantes, etc.)
-- et passage de "difficulty" en échelle numérique 1-5 (texte libre avant).

ALTER TABLE "Exercise"
  ALTER COLUMN "difficulty" TYPE INTEGER USING (NULLIF("difficulty", ''))::INTEGER;

ALTER TABLE "Exercise"
  ADD COLUMN "intensity" INTEGER,
  ADD COLUMN "levelMin" TEXT,
  ADD COLUMN "levelMax" TEXT,
  ADD COLUMN "skills" JSONB,
  ADD COLUMN "objective" TEXT,
  ADD COLUMN "instructions" JSONB,
  ADD COLUMN "successCriteria" JSONB,
  ADD COLUMN "easierVariant" JSONB,
  ADD COLUMN "harderVariant" JSONB,
  ADD COLUMN "competitionVariant" JSONB,
  ADD COLUMN "sourceCode" TEXT;

CREATE UNIQUE INDEX "Exercise_clubId_sourceCode_key" ON "Exercise"("clubId", "sourceCode");
