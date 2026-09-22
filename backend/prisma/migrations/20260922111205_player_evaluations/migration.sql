-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "coachId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "service" INTEGER NOT NULL,
    "remise" INTEGER NOT NULL,
    "coupDroit" INTEGER NOT NULL,
    "revers" INTEGER NOT NULL,
    "deplacements" INTEGER NOT NULL,
    "tactique" INTEGER NOT NULL,
    "mental" INTEGER NOT NULL,
    "physique" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Evaluation_playerId_idx" ON "Evaluation"("playerId");

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
