-- CreateTable
CREATE TABLE "CampGroupCoach" (
    "id" TEXT NOT NULL,
    "campGroupId" TEXT NOT NULL,
    "coachId" TEXT,
    "sparringId" TEXT,

    CONSTRAINT "CampGroupCoach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampGroupPlayer" (
    "id" TEXT NOT NULL,
    "campGroupId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,

    CONSTRAINT "CampGroupPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampGroupPlayer_campGroupId_playerId_key" ON "CampGroupPlayer"("campGroupId", "playerId");

-- AddForeignKey
ALTER TABLE "CampGroupCoach" ADD CONSTRAINT "CampGroupCoach_campGroupId_fkey" FOREIGN KEY ("campGroupId") REFERENCES "CampGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampGroupCoach" ADD CONSTRAINT "CampGroupCoach_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampGroupCoach" ADD CONSTRAINT "CampGroupCoach_sparringId_fkey" FOREIGN KEY ("sparringId") REFERENCES "Sparring"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampGroupPlayer" ADD CONSTRAINT "CampGroupPlayer_campGroupId_fkey" FOREIGN KEY ("campGroupId") REFERENCES "CampGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampGroupPlayer" ADD CONSTRAINT "CampGroupPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
