-- Grille d'évaluation : points notés de 1 à 5 par critère, dont la moyenne
-- (x 2) donne la note du critère sur 10. Les notes deviennent décimales
-- (ex. 7,3) ; les notes entières existantes sont conservées telles quelles.
CREATE TYPE "EvaluationCriterion" AS ENUM ('SERVICE', 'REMISE', 'COUP_DROIT', 'REVERS', 'DEPLACEMENTS', 'TACTIQUE', 'MENTAL', 'PHYSIQUE');

ALTER TABLE "Evaluation" ALTER COLUMN "service" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "remise" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "coupDroit" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "revers" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "deplacements" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "tactique" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "mental" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "physique" SET DATA TYPE DOUBLE PRECISION;

CREATE TABLE "EvaluationItem" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "criterion" "EvaluationCriterion" NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvaluationItemScore" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "evaluationItemId" TEXT,
    "criterion" "EvaluationCriterion" NOT NULL,
    "label" TEXT NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "EvaluationItemScore_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EvaluationItem_clubId_criterion_idx" ON "EvaluationItem"("clubId", "criterion");

CREATE INDEX "EvaluationItemScore_evaluationId_idx" ON "EvaluationItemScore"("evaluationId");

ALTER TABLE "EvaluationItem" ADD CONSTRAINT "EvaluationItem_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvaluationItemScore" ADD CONSTRAINT "EvaluationItemScore_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvaluationItemScore" ADD CONSTRAINT "EvaluationItemScore_evaluationItemId_fkey" FOREIGN KEY ("evaluationItemId") REFERENCES "EvaluationItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
