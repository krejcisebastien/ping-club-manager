-- Passage en multi-tenant : chaque entité racine appartient à un club.
-- Les données existantes sont rattachées à un club par défaut (renommable
-- avec `npm run club -- rename`), sans perte.

CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

INSERT INTO "Club" ("id", "name", "slug") VALUES ('club_default', 'Club Tennis de Table', 'default');

-- Season
ALTER TABLE "Season" ADD COLUMN "clubId" TEXT;
UPDATE "Season" SET "clubId" = 'club_default';
ALTER TABLE "Season" ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "Season" ADD CONSTRAINT "Season_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Season_clubId_idx" ON "Season"("clubId");

-- User
ALTER TABLE "User" ADD COLUMN "clubId" TEXT;
UPDATE "User" SET "clubId" = 'club_default';
ALTER TABLE "User" ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "User_clubId_idx" ON "User"("clubId");

-- Player
ALTER TABLE "Player" ADD COLUMN "clubId" TEXT;
UPDATE "Player" SET "clubId" = 'club_default';
ALTER TABLE "Player" ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "Player" ADD CONSTRAINT "Player_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Player_clubId_idx" ON "Player"("clubId");

-- Coach (l'email n'est plus unique globalement, mais par club)
ALTER TABLE "Coach" ADD COLUMN "clubId" TEXT;
UPDATE "Coach" SET "clubId" = 'club_default';
ALTER TABLE "Coach" ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Coach_clubId_idx" ON "Coach"("clubId");
DROP INDEX "Coach_email_key";
CREATE UNIQUE INDEX "Coach_clubId_email_key" ON "Coach"("clubId", "email");

-- Sparring
ALTER TABLE "Sparring" ADD COLUMN "clubId" TEXT;
UPDATE "Sparring" SET "clubId" = 'club_default';
ALTER TABLE "Sparring" ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "Sparring" ADD CONSTRAINT "Sparring_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Sparring_clubId_idx" ON "Sparring"("clubId");

-- Exercise
ALTER TABLE "Exercise" ADD COLUMN "clubId" TEXT;
UPDATE "Exercise" SET "clubId" = 'club_default';
ALTER TABLE "Exercise" ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Exercise_clubId_idx" ON "Exercise"("clubId");
