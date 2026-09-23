import { hashPassword } from "../utils/password.js";
import { seedExerciseLibrary } from "./exerciseLibrary.js";

// Prolonge une fin de licence de N ans, à partir de la fin actuelle si elle est
// encore dans le futur, sinon à partir d'aujourd'hui.
export function extendLicense(current, years) {
  const start = current && current.getTime() > Date.now() ? current : new Date();
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + years);
  return end;
}

// Date AAAA-MM-JJ -> Date (minuit UTC), ou null si le format est invalide.
export function parseDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createClubWithAdmin(prisma, { name, slug, email, password, licenseEndsAt }) {
  const club = await prisma.club.create({
    data: {
      name,
      slug,
      licenseEndsAt,
      users: { create: { email, passwordHash: await hashPassword(password), roles: ["ADMIN"] } },
    },
  });
  await seedExerciseLibrary(prisma, club.id);
  return club;
}
