-- Stages : liste d'inscrits au stage + présences par période (indépendantes du groupe).

-- 1) Inscrits au stage
CREATE TABLE "CampPlayer" (
    "id" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,

    CONSTRAINT "CampPlayer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampPlayer_campId_playerId_key" ON "CampPlayer"("campId", "playerId");

ALTER TABLE "CampPlayer" ADD CONSTRAINT "CampPlayer_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampPlayer" ADD CONSTRAINT "CampPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise de l'existant : tout joueur déjà rattaché à un groupe du stage (par défaut
-- ou sur une période) ou déjà pointé devient inscrit au stage.
INSERT INTO "CampPlayer" ("id", "campId", "playerId")
SELECT 'cp_' || md5(src."campId" || ':' || src."playerId"), src."campId", src."playerId"
FROM (
    SELECT g."campId", gp."playerId" FROM "CampGroupPlayer" gp JOIN "CampGroup" g ON g."id" = gp."campGroupId"
    UNION
    SELECT g."campId", pgp."playerId"
    FROM "CampPeriodGroupPlayer" pgp
    JOIN "CampPeriodGroup" pg ON pg."id" = pgp."campPeriodGroupId"
    JOIN "CampGroup" g ON g."id" = pg."campGroupId"
    UNION
    SELECT g."campId", a."playerId"
    FROM "CampAttendance" a
    JOIN "CampPeriodGroup" pg ON pg."id" = a."campPeriodGroupId"
    JOIN "CampGroup" g ON g."id" = pg."campGroupId"
) src;

-- 2) Présences par période : on rattache chaque présence à la période de son groupe.
ALTER TABLE "CampAttendance" ADD COLUMN "campPeriodId" TEXT;

UPDATE "CampAttendance" a
SET "campPeriodId" = pg."campPeriodId"
FROM "CampPeriodGroup" pg
WHERE pg."id" = a."campPeriodGroupId";

-- Un joueur pointé dans deux groupes de la même période : on garde le statut le plus « présent ».
DELETE FROM "CampAttendance" a
USING "CampAttendance" b
WHERE a."campPeriodId" = b."campPeriodId"
  AND a."playerId" = b."playerId"
  AND a."id" <> b."id"
  AND (
    CASE a."status" WHEN 'PRESENT' THEN 4 WHEN 'LATE' THEN 3 WHEN 'EXCUSED' THEN 2 ELSE 1 END
    < CASE b."status" WHEN 'PRESENT' THEN 4 WHEN 'LATE' THEN 3 WHEN 'EXCUSED' THEN 2 ELSE 1 END
    OR (
      CASE a."status" WHEN 'PRESENT' THEN 4 WHEN 'LATE' THEN 3 WHEN 'EXCUSED' THEN 2 ELSE 1 END
      = CASE b."status" WHEN 'PRESENT' THEN 4 WHEN 'LATE' THEN 3 WHEN 'EXCUSED' THEN 2 ELSE 1 END
      AND a."id" > b."id"
    )
  );

ALTER TABLE "CampAttendance" ALTER COLUMN "campPeriodId" SET NOT NULL;

ALTER TABLE "CampAttendance" DROP CONSTRAINT "CampAttendance_campPeriodGroupId_fkey";
DROP INDEX "CampAttendance_campPeriodGroupId_playerId_key";
ALTER TABLE "CampAttendance" DROP COLUMN "campPeriodGroupId";

CREATE UNIQUE INDEX "CampAttendance_campPeriodId_playerId_key" ON "CampAttendance"("campPeriodId", "playerId");
ALTER TABLE "CampAttendance" ADD CONSTRAINT "CampAttendance_campPeriodId_fkey" FOREIGN KEY ("campPeriodId") REFERENCES "CampPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Plus de joueurs par défaut sur les groupes (remplacés par la liste d'inscrits).
DROP TABLE "CampGroupPlayer";
