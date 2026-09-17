import { verifyToken } from "../utils/jwt.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Non authentifié." });
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Session invalide ou expirée." });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Accès refusé." });
    }
    next();
  };
}

// Autorise un admin/coach, ou un joueur consultant uniquement sa propre fiche.
export function requireSelfPlayerOrRole(playerIdParam, ...roles) {
  return (req, res, next) => {
    if (roles.includes(req.user.role)) return next();
    if (req.user.role === "PLAYER" && req.user.playerId === req.params[playerIdParam]) {
      return next();
    }
    return res.status(403).json({ error: "Accès refusé." });
  };
}
