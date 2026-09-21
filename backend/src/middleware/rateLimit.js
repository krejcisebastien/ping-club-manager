// Limiteur simple en mémoire, par adresse IP (suffisant pour une instance
// unique ; à remplacer par un stockage partagé si l'API passe à plusieurs
// instances).
export function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [ip, entry] of hits) if (entry.resetAt <= now) hits.delete(ip);
    const entry = hits.get(req.ip) ?? { count: 0, resetAt: now + windowMs };
    entry.count += 1;
    hits.set(req.ip, entry);
    if (entry.count > max) {
      return res.status(429).json({ error: "Trop de tentatives, réessaie plus tard." });
    }
    next();
  };
}
