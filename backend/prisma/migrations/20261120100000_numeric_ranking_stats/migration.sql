-- Place parmi les dames du classement mixte, et nombre d'actifs relevé chaque jour.
ALTER TABLE "CompetitionPoints" ADD COLUMN "ladiesRankingPosition" INTEGER;

CREATE TABLE "NumericRankingStats" (
    "date" DATE NOT NULL,
    "activePlayers" INTEGER NOT NULL,
    "activeLadies" INTEGER,

    CONSTRAINT "NumericRankingStats_pkey" PRIMARY KEY ("date")
);
