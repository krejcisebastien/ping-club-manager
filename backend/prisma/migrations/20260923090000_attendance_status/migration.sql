-- Présence enrichie : le simple booléen "present" devient un statut à 4
-- valeurs (présent / absent / excusé / retard). Les données existantes sont
-- préservées : present=true -> PRESENT, present=false -> ABSENT.

CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED', 'LATE');

-- Attendance (entrainements)
ALTER TABLE "Attendance" ADD COLUMN "status" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT';
UPDATE "Attendance" SET "status" = CASE WHEN "present" THEN 'PRESENT' ELSE 'ABSENT' END::"AttendanceStatus";
ALTER TABLE "Attendance" DROP COLUMN "present";

-- CampAttendance (stages)
ALTER TABLE "CampAttendance" ADD COLUMN "status" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT';
UPDATE "CampAttendance" SET "status" = CASE WHEN "present" THEN 'PRESENT' ELSE 'ABSENT' END::"AttendanceStatus";
ALTER TABLE "CampAttendance" DROP COLUMN "present";
