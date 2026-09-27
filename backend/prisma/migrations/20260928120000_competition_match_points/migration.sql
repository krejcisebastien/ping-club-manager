-- Enrichissement depuis la fiche joueur de data.aftt.be : points de base de la
-- saison, points de l'adversaire et +/- de chaque match (colonnes facultatives).
ALTER TABLE "CompetitionSeason" ADD COLUMN "basePoints" DECIMAL(8,2);

ALTER TABLE "CompetitionResult" ADD COLUMN "opponentPoints" DECIMAL(8,2),
ADD COLUMN "pointsDelta" DECIMAL(7,2);
