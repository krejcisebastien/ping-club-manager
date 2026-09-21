import { verifyToken } from "../utils/jwt.js";
import { tenantClient } from "../lib/tenant.js";

// Authentifie la requête et lui attache req.db : un client Prisma restreint au
// club de l'utilisateur (à utiliser dans toutes les routes à la place du client
// global). Un jeton sans clubId (émis avant le multi-tenant) est refusé.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Non authentifié." });
  }
  try {
    const user = verifyToken(token);
    if (!user.clubId) throw new Error("Jeton sans club.");
    req.user = user;
    req.db = tenantClient(user.clubId);
    next();
  } catch {
    return res.status(401).json({ error: "Session invalide ou expirée." });
  }
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
