-- Résultats de compétition importés de TabT (AFTT) : situation par saison et matchs.
CREATE TYPE "CompetitionType" AS ENUM ('CHAMPIONSHIP', 'TOURNAMENT');

ALTER TABLE "Player" ADD COLUMN "competitionSyncedAt" TIMESTAMP(3),
ADD COLUMN "competitionSyncError" TEXT;

CREATE TABLE "CompetitionSeason" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "seasonName" TEXT NOT NULL,
    "ranking" TEXT,
    "club" TEXT,
    "elo" INTEGER,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitionSeason_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompetitionResult" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "competition" "CompetitionType" NOT NULL,
    "opponentLicence" INTEGER,
    "opponentFirstName" TEXT NOT NULL,
    "opponentLastName" TEXT NOT NULL,
    "opponentRanking" TEXT NOT NULL,
    "opponentClub" TEXT,
    "won" BOOLEAN NOT NULL,
    "walkover" BOOLEAN NOT NULL DEFAULT false,
    "setsFor" INTEGER NOT NULL,
    "setsAgainst" INTEGER NOT NULL,
    "eventName" TEXT,

    CONSTRAINT "CompetitionResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompetitionSeason_playerId_season_key" ON "CompetitionSeason"("playerId", "season");

CREATE INDEX "CompetitionResult_playerId_season_idx" ON "CompetitionResult"("playerId", "season");

ALTER TABLE "CompetitionSeason" ADD CONSTRAINT "CompetitionSeason_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompetitionResult" ADD CONSTRAINT "CompetitionResult_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
