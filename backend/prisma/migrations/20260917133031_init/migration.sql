-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COACH', 'PLAYER');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TraitCategory" AS ENUM ('STRENGTH', 'WEAKNESS');

-- CreateEnum
CREATE TYPE "PointStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('PLANNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('PHOTO', 'VIDEO');

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "playerId" TEXT,
    "coachId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "licenseNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSeason" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "status" "PlayerStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "PlayerSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingHistory" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "rankingValue" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerTrait" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "category" "TraitCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerTrait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointToWork" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "PointStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointToWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvolutionNote" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "coachId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvolutionNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerMedia" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingGroup" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rankingCriteria" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerGroupAssignment" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "PlayerGroupAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sparring" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "ranking" TEXT,
    "isClubMember" BOOLEAN NOT NULL DEFAULT false,
    "playerId" TEXT,
    "externalClub" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sparring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Training" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "weekday" INTEGER,
    "startTime" TEXT,
    "endTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingOccurrence" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'PLANNED',

    CONSTRAINT "TrainingOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingOccurrenceCoach" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "coachId" TEXT,
    "sparringId" TEXT,

    CONSTRAINT "TrainingOccurrenceCoach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "coachId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "difficulty" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPlanExercise" (
    "id" TEXT NOT NULL,
    "trainingPlanId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,

    CONSTRAINT "TrainingPlanExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Camp" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Camp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampDay" (
    "id" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampPeriod" (
    "id" TEXT NOT NULL,
    "campDayId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "CampPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampGroup" (
    "id" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CampGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampPeriodGroup" (
    "id" TEXT NOT NULL,
    "campPeriodId" TEXT NOT NULL,
    "campGroupId" TEXT NOT NULL,

    CONSTRAINT "CampPeriodGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampPeriodGroupCoach" (
    "id" TEXT NOT NULL,
    "campPeriodGroupId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,

    CONSTRAINT "CampPeriodGroupCoach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampPeriodGroupPlayer" (
    "id" TEXT NOT NULL,
    "campPeriodGroupId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,

    CONSTRAINT "CampPeriodGroupPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampAttendance" (
    "id" TEXT NOT NULL,
    "campPeriodGroupId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CampAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_playerId_key" ON "User"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_coachId_key" ON "User"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSeason_playerId_seasonId_key" ON "PlayerSeason"("playerId", "seasonId");

-- CreateIndex
CREATE INDEX "RankingHistory_playerId_seasonId_idx" ON "RankingHistory"("playerId", "seasonId");

-- CreateIndex
CREATE INDEX "Equipment_playerId_idx" ON "Equipment"("playerId");

-- CreateIndex
CREATE INDEX "PlayerTrait_playerId_idx" ON "PlayerTrait"("playerId");

-- CreateIndex
CREATE INDEX "PointToWork_playerId_idx" ON "PointToWork"("playerId");

-- CreateIndex
CREATE INDEX "EvolutionNote_playerId_idx" ON "EvolutionNote"("playerId");

-- CreateIndex
CREATE INDEX "PlayerGroupAssignment_playerId_idx" ON "PlayerGroupAssignment"("playerId");

-- CreateIndex
CREATE INDEX "PlayerGroupAssignment_groupId_idx" ON "PlayerGroupAssignment"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Coach_email_key" ON "Coach"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sparring_playerId_key" ON "Sparring"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_occurrenceId_playerId_key" ON "Attendance"("occurrenceId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingPlanExercise_trainingPlanId_exerciseId_key" ON "TrainingPlanExercise"("trainingPlanId", "exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "CampPeriodGroup_campPeriodId_campGroupId_key" ON "CampPeriodGroup"("campPeriodId", "campGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "CampPeriodGroupCoach_campPeriodGroupId_coachId_key" ON "CampPeriodGroupCoach"("campPeriodGroupId", "coachId");

-- CreateIndex
CREATE UNIQUE INDEX "CampPeriodGroupPlayer_campPeriodGroupId_playerId_key" ON "CampPeriodGroupPlayer"("campPeriodGroupId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "CampAttendance_campPeriodGroupId_playerId_key" ON "CampAttendance"("campPeriodGroupId", "playerId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSeason" ADD CONSTRAINT "PlayerSeason_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSeason" ADD CONSTRAINT "PlayerSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingHistory" ADD CONSTRAINT "RankingHistory_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingHistory" ADD CONSTRAINT "RankingHistory_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTrait" ADD CONSTRAINT "PlayerTrait_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointToWork" ADD CONSTRAINT "PointToWork_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointToWork" ADD CONSTRAINT "PointToWork_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvolutionNote" ADD CONSTRAINT "EvolutionNote_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvolutionNote" ADD CONSTRAINT "EvolutionNote_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMedia" ADD CONSTRAINT "PlayerMedia_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingGroup" ADD CONSTRAINT "TrainingGroup_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerGroupAssignment" ADD CONSTRAINT "PlayerGroupAssignment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerGroupAssignment" ADD CONSTRAINT "PlayerGroupAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TrainingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sparring" ADD CONSTRAINT "Sparring_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TrainingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingOccurrence" ADD CONSTRAINT "TrainingOccurrence_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingOccurrenceCoach" ADD CONSTRAINT "TrainingOccurrenceCoach_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "TrainingOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingOccurrenceCoach" ADD CONSTRAINT "TrainingOccurrenceCoach_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingOccurrenceCoach" ADD CONSTRAINT "TrainingOccurrenceCoach_sparringId_fkey" FOREIGN KEY ("sparringId") REFERENCES "Sparring"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "TrainingOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlanExercise" ADD CONSTRAINT "TrainingPlanExercise_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlanExercise" ADD CONSTRAINT "TrainingPlanExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Camp" ADD CONSTRAINT "Camp_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampDay" ADD CONSTRAINT "CampDay_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampPeriod" ADD CONSTRAINT "CampPeriod_campDayId_fkey" FOREIGN KEY ("campDayId") REFERENCES "CampDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampGroup" ADD CONSTRAINT "CampGroup_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampPeriodGroup" ADD CONSTRAINT "CampPeriodGroup_campPeriodId_fkey" FOREIGN KEY ("campPeriodId") REFERENCES "CampPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampPeriodGroup" ADD CONSTRAINT "CampPeriodGroup_campGroupId_fkey" FOREIGN KEY ("campGroupId") REFERENCES "CampGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampPeriodGroupCoach" ADD CONSTRAINT "CampPeriodGroupCoach_campPeriodGroupId_fkey" FOREIGN KEY ("campPeriodGroupId") REFERENCES "CampPeriodGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampPeriodGroupCoach" ADD CONSTRAINT "CampPeriodGroupCoach_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampPeriodGroupPlayer" ADD CONSTRAINT "CampPeriodGroupPlayer_campPeriodGroupId_fkey" FOREIGN KEY ("campPeriodGroupId") REFERENCES "CampPeriodGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampPeriodGroupPlayer" ADD CONSTRAINT "CampPeriodGroupPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampAttendance" ADD CONSTRAINT "CampAttendance_campPeriodGroupId_fkey" FOREIGN KEY ("campPeriodGroupId") REFERENCES "CampPeriodGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampAttendance" ADD CONSTRAINT "CampAttendance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
