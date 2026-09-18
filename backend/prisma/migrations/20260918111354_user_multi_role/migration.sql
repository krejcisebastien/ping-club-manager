-- Un compte peut désormais avoir plusieurs rôles (ex. ADMIN + COACH).
-- On ajoute la nouvelle colonne tableau, on y copie le rôle existant de
-- chaque compte, puis on supprime l'ancienne colonne scalaire.
ALTER TABLE "User" ADD COLUMN "roles" "Role"[] NOT NULL DEFAULT ARRAY[]::"Role"[];

UPDATE "User" SET "roles" = ARRAY["role"] WHERE "role" IS NOT NULL;

ALTER TABLE "User" DROP COLUMN "role";
