import { prisma } from "./prisma.js";

// Licence annuelle d'un club : accès jusqu'à licenseEndsAt, puis GRACE_DAYS de
// tolérance (le temps que Stripe retente un paiement échoué ou qu'une facture
// soit réglée), puis accès refusé.
export const GRACE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

// PENDING : jamais de licence · ACTIVE · GRACE : échue mais tolérée · EXPIRED
export function licenseState(club, now = Date.now()) {
  const endsAt = club.licenseEndsAt;
  if (!endsAt) return { status: "PENDING", active: false, endsAt: null, graceEndsAt: null, daysLeft: null };
  const graceEndsAt = new Date(endsAt.getTime() + GRACE_DAYS * DAY_MS);
  const daysLeft = Math.ceil((endsAt.getTime() - now) / DAY_MS);
  if (now < endsAt.getTime()) return { status: "ACTIVE", active: true, endsAt, graceEndsAt, daysLeft };
  if (now < graceEndsAt.getTime()) return { status: "GRACE", active: true, endsAt, graceEndsAt, daysLeft };
  return { status: "EXPIRED", active: false, endsAt, graceEndsAt, daysLeft };
}

// Lue à chaque requête authentifiée : petit cache pour ne pas ajouter une
// requête SQL à chacune. Un changement fait depuis un autre processus (commande
// `npm run club -- license`) est donc pris en compte sous TTL_MS.
const TTL_MS = 30_000;
const cache = new Map();

export async function getLicense(clubId) {
  const hit = cache.get(clubId);
  if (hit && hit.expiresAt > Date.now()) return hit.state;
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { licenseEndsAt: true, stripeCustomerId: true },
  });
  const state = { ...licenseState(club ?? {}), hasCustomer: !!club?.stripeCustomerId };
  cache.set(clubId, { state, expiresAt: Date.now() + TTL_MS });
  return state;
}

export function invalidateLicense(clubId) {
  cache.delete(clubId);
}
