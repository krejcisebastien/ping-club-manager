-- Tarifs à l'heure ET à la séance, avec la base de calcul retenue.
CREATE TYPE "RateBasis" AS ENUM ('HOUR', 'SESSION');

ALTER TABLE "HourlyRate"
  ALTER COLUMN "hourlyRate" DROP NOT NULL,
  ADD COLUMN "sessionRate" DECIMAL(8,2),
  ADD COLUMN "basis" "RateBasis" NOT NULL DEFAULT 'HOUR';
