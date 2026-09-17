/*
  Warnings:

  - You are about to drop the column `playerId` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_playerId_fkey";

-- DropIndex
DROP INDEX "User_playerId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "playerId";

-- CreateTable
CREATE TABLE "UserPlayer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,

    CONSTRAINT "UserPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPlayer_userId_playerId_key" ON "UserPlayer"("userId", "playerId");

-- AddForeignKey
ALTER TABLE "UserPlayer" ADD CONSTRAINT "UserPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlayer" ADD CONSTRAINT "UserPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
