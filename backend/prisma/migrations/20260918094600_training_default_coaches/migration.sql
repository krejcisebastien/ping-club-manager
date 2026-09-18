-- CreateTable
CREATE TABLE "TrainingCoach" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "coachId" TEXT,
    "sparringId" TEXT,

    CONSTRAINT "TrainingCoach_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TrainingCoach" ADD CONSTRAINT "TrainingCoach_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCoach" ADD CONSTRAINT "TrainingCoach_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCoach" ADD CONSTRAINT "TrainingCoach_sparringId_fkey" FOREIGN KEY ("sparringId") REFERENCES "Sparring"("id") ON DELETE CASCADE ON UPDATE CASCADE;
