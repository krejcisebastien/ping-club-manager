-- Coordonnées utiles à la note de défraiement des bénévoles (entraineurs et sparrings).
ALTER TABLE "Coach" ADD COLUMN "address" TEXT, ADD COLUMN "iban" TEXT;
ALTER TABLE "Sparring" ADD COLUMN "address" TEXT, ADD COLUMN "iban" TEXT;
