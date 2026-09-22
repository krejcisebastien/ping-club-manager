-- CreateEnum
CREATE TYPE "DominantHand" AS ENUM ('LEFT', 'RIGHT');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "dominantHand" "DominantHand",
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "playStyle" TEXT;
