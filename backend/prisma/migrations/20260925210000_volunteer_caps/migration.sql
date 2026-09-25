-- Plafonds des indemnités de volontariat, paramétrables par club et par année civile.
CREATE TABLE "VolunteerCap" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "perDay" DECIMAL(8,2) NOT NULL,
    "perYear" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "VolunteerCap_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VolunteerCap_clubId_year_key" ON "VolunteerCap"("clubId", "year");

ALTER TABLE "VolunteerCap" ADD CONSTRAINT "VolunteerCap_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
