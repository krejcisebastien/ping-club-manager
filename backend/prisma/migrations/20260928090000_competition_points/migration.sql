-- Points du classement numérique AFTT, relevés chaque jour (source : data.aftt.be).
CREATE TABLE "CompetitionPoints" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "seasonName" TEXT NOT NULL,
    "points" DECIMAL(8,2) NOT NULL,
    "rankingPosition" INTEGER,

    CONSTRAINT "CompetitionPoints_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompetitionPoints_playerId_date_key" ON "CompetitionPoints"("playerId", "date");

ALTER TABLE "CompetitionPoints" ADD CONSTRAINT "CompetitionPoints_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
