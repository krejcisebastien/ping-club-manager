-- category et difficulty passent en enum (au lieu de texte libre / entier
-- libre) ; illustrationUrl (jamais utilisé) et levelMin/levelMax (redondants
-- avec difficulty) sont retirés.

CREATE TYPE "ExerciseCategory" AS ENUM (
  'Regularite', 'Topspin', 'Service', 'Remise', 'Bloc', 'Deplacements',
  'PanierDeBalles', 'Poussette', 'Tactique', 'Defense', 'ContreInitiative',
  'Physique', 'Mental', 'Jeunes'
);

CREATE TYPE "ExerciseDifficulty" AS ENUM ('NIVEAU_1', 'NIVEAU_2', 'NIVEAU_3', 'NIVEAU_4', 'NIVEAU_5');

ALTER TABLE "Exercise"
  ALTER COLUMN "category" TYPE "ExerciseCategory" USING (NULLIF("category", ''))::"ExerciseCategory";

ALTER TABLE "Exercise"
  ALTER COLUMN "difficulty" TYPE "ExerciseDifficulty" USING (
    CASE "difficulty"
      WHEN 1 THEN 'NIVEAU_1'
      WHEN 2 THEN 'NIVEAU_2'
      WHEN 3 THEN 'NIVEAU_3'
      WHEN 4 THEN 'NIVEAU_4'
      WHEN 5 THEN 'NIVEAU_5'
      ELSE NULL
    END
  )::"ExerciseDifficulty";

ALTER TABLE "Exercise"
  DROP COLUMN "illustrationUrl",
  DROP COLUMN "levelMin",
  DROP COLUMN "levelMax";
