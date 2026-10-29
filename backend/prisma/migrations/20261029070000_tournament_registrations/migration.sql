-- CreateTable
CREATE TABLE "TournamentRegistration" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "serieId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "serieName" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "town" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentRegistration_date_idx" ON "TournamentRegistration"("date");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRegistration_playerId_serieId_key" ON "TournamentRegistration"("playerId", "serieId");

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

