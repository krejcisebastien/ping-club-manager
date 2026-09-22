import { verifyToken } from "../utils/jwt.js";
import { tenantClient } from "../lib/tenant.js";
import { getLicense } from "../lib/license.js";
import { isPlatformAdmin } from "../lib/platform.js";

// Authentifie la requête et lui attache req.db : un client Prisma restreint au
// club de l'utilisateur (à utiliser dans toutes les routes à la place du client
// global) et req.license, l'état de la licence du club. Un jeton sans clubId
// (émis avant le multi-tenant) est refusé.
async function authenticate(req, res) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Non authentifié." });
    return false;
  }
  let user;
  try {
    user = verifyToken(token);
    if (!user.clubId) throw new Error("Jeton sans club.");
  } catch {
    res.status(401).json({ error: "Session invalide ou expirée." });
    return false;
  }
  req.user = user;
  req.db = tenantClient(user.clubId);
  req.license = await getLicense(user.clubId);
  return true;
}

// Par défaut, toute route authentifiée exige une licence valide (402 sinon).
export async function requireAuth(req, res, next) {
  if (!(await authenticate(req, res))) return;
  if (!req.license.active) {
    return res.status(402).json({
      error: "La licence de ce club est absente ou expirée.",
      code: "LICENSE_REQUIRED",
      status: req.license.status,
    });
  }
  next();
}

// Pour les rares routes qui doivent rester accessibles sans licence : de quoi
// se connaître (/auth/me), changer son mot de passe, et obtenir une licence.
export async function requireAuthAnyLicense(req, res, next) {
  if (!(await authenticate(req, res))) return;
  next();
}

// Propriétaire de la plateforme (PLATFORM_ADMIN_EMAILS) : vérifié à chaque
// requête, donc retirer une adresse de la liste révoque l'accès immédiatement.
export function requirePlatformAdmin(req, res, next) {
  if (!isPlatformAdmin(req.user?.email)) return res.status(403).json({ error: "Accès refusé." });
  next();
}

// Un compte peut avoir plusieurs rôles (ex. ADMIN + COACH) : autorisé dès
// qu'il possède au moins un des rôles requis par la route.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.some((r) => req.user.roles?.includes(r))) {
      return res.status(403).json({ error: "Accès refusé." });
    }
    next();
  };
}

// Autorise un admin/coach, ou un joueur consultant la fiche d'un des joueurs
// rattachés à son compte (compte familial : plusieurs joueurs possibles).
export function requireSelfPlayerOrRole(playerIdParam, ...roles) {
  return (req, res, next) => {
    if (roles.some((r) => req.user.roles?.includes(r))) return next();
    if (req.user.roles?.includes("PLAYER") && req.user.playerIds?.includes(req.params[playerIdParam])) {
      return next();
    }
    return res.status(403).json({ error: "Accès refusé." });
  };
}
