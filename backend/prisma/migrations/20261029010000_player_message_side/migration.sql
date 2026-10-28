-- Côté de l'auteur de chaque message. Les messages existants : côté joueur si
-- le compte est rattaché au joueur sans fiche entraineur, sinon côté entraineur
-- (un compte à la fois parent et entraineur reste ambigu).
ALTER TABLE "PlayerMessage" ADD COLUMN "authorSide" TEXT NOT NULL DEFAULT 'STAFF';

UPDATE "PlayerMessage" m SET "authorSide" = 'PLAYER'
FROM "User" u
WHERE u."id" = m."authorId"
  AND u."coachId" IS NULL
  AND EXISTS (SELECT 1 FROM "UserPlayer" up WHERE up."userId" = u."id" AND up."playerId" = m."playerId");

ALTER TABLE "PlayerMessage" ALTER COLUMN "authorSide" DROP DEFAULT;
