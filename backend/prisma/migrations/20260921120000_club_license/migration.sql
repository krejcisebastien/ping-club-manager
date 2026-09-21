-- Licence annuelle par club. Les clubs déjà existants (créés avant la mise en
-- place des licences) sont conservés actifs jusqu'en 2099 pour ne pas être
-- verrouillés au déploiement ; ils pourront être ajustés avec
-- `npm run club -- license`.
ALTER TABLE "Club" ADD COLUMN "licenseEndsAt" TIMESTAMP(3),
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripeSubscriptionId" TEXT;

UPDATE "Club" SET "licenseEndsAt" = '2099-12-31 00:00:00';

CREATE UNIQUE INDEX "Club_stripeCustomerId_key" ON "Club"("stripeCustomerId");
