-- Jeton secret de l'abonnement calendrier (flux iCal personnel).
ALTER TABLE "User" ADD COLUMN "calendarToken" TEXT;

CREATE UNIQUE INDEX "User_calendarToken_key" ON "User"("calendarToken");
