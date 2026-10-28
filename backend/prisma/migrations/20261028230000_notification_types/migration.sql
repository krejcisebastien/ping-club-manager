-- Type de chaque notification (réglable par compte) ; les notifications déjà
-- envoyées sont classées d'après leur titre.
ALTER TABLE "Notification" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'sessions';
UPDATE "Notification" SET "type" = 'reminders' WHERE "title" IN ('Séance demain', 'Présences à encoder', 'Stage dans 2 jours');
UPDATE "Notification" SET "type" = 'license' WHERE "title" = 'Licence bientôt échue';
ALTER TABLE "Notification" ALTER COLUMN "type" DROP DEFAULT;

-- Types de notifications coupés sur les appareils du compte.
ALTER TABLE "User" ADD COLUMN "mutedNotifications" TEXT[] DEFAULT ARRAY[]::TEXT[];
