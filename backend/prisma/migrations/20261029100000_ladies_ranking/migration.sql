-- AlterTable
ALTER TABLE "CompetitionResult" ADD COLUMN     "ladies" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CompetitionSeason" ADD COLUMN     "ladiesRanking" TEXT;

