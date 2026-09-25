-- Tarifs horaires (niveaux Adeps des entraineurs, séries des sparrings).

CREATE TYPE "CoachLevel" AS ENUM ('ANIMATEUR', 'MSIN', 'MSED', 'MSEN');
CREATE TYPE "RateCategory" AS ENUM ('COACH_LEVEL', 'SPARRING_SERIES');

ALTER TABLE "Coach" ADD COLUMN "level" "CoachLevel";

CREATE TABLE "HourlyRate" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "category" "RateCategory" NOT NULL,
    "code" TEXT NOT NULL,
    "hourlyRate" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "HourlyRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HourlyRate_clubId_category_code_key" ON "HourlyRate"("clubId", "category", "code");

ALTER TABLE "HourlyRate" ADD CONSTRAINT "HourlyRate_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Un sparring rattaché à un joueur du club ne duplique plus ses données : nom et
-- classement viennent du joueur (le nom reste recopié par l'application pour les
-- affichages, le classement n'est plus stocké).
UPDATE "Sparring" s
SET "firstName" = p."firstName", "lastName" = p."lastName", "ranking" = NULL
FROM "Player" p
WHERE s."playerId" = p."id";

-- Classements saisis à la main : mise en forme (« d4 » -> « D4 »).
UPDATE "Sparring" SET "ranking" = upper(btrim("ranking")) WHERE "ranking" IS NOT NULL;
UPDATE "RankingHistory" SET "rankingValue" = upper(btrim("rankingValue"));
