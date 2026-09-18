-- DropIndex
DROP INDEX "CampPeriodGroupCoach_campPeriodGroupId_coachId_key";

-- AlterTable
ALTER TABLE "CampGroup" ADD COLUMN     "trainingPlanId" TEXT;

-- AlterTable
ALTER TABLE "CampPeriodGroupCoach" ADD COLUMN     "sparringId" TEXT,
ALTER COLUMN "coachId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CampGroup" ADD CONSTRAINT "CampGroup_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampPeriodGroupCoach" ADD CONSTRAINT "CampPeriodGroupCoach_sparringId_fkey" FOREIGN KEY ("sparringId") REFERENCES "Sparring"("id") ON DELETE CASCADE ON UPDATE CASCADE;
