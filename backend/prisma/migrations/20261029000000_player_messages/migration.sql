-- AlterTable
ALTER TABLE "Coach" ADD COLUMN     "isTrainingManager" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PlayerMessage" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerMessage_playerId_createdAt_idx" ON "PlayerMessage"("playerId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlayerMessage" ADD CONSTRAINT "PlayerMessage_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMessage" ADD CONSTRAINT "PlayerMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

