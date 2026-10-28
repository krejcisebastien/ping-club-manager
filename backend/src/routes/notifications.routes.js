import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { NOTIFICATION_TYPES } from "../lib/notify.js";

// Boîte de notifications du compte connecté (voir lib/notify.js).
const router = Router();

router.use(requireAuth);

const LIST_LIMIT = 100;

router.get("/", async (req, res) => {
  const where = { userId: req.user.sub };
  const [notifications, unread] = await Promise.all([
    req.db.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: LIST_LIMIT }),
    req.db.notification.count({ where: { ...where, readAt: null } }),
  ]);
  res.json({ notifications, unread });
});

// Nombre de non lues : badge de la cloche, interrogé souvent.
router.get("/unread-count", async (req, res) => {
  res.json({ unread: await req.db.notification.count({ where: { userId: req.user.sub, readAt: null } }) });
});

// Réglages : types proposés au compte (selon ses rôles) et types coupés.
function typesFor(user) {
  return Object.entries(NOTIFICATION_TYPES)
    .filter(([, t]) => !t.roles || t.roles.some((r) => user.roles?.includes(r)))
    .map(([key, t]) => ({ key, label: t.label }));
}

router.get("/settings", async (req, res) => {
  const user = await req.db.user.findUnique({ where: { id: req.user.sub }, select: { mutedNotifications: true } });
  res.json({ types: typesFor(req.user), muted: user?.mutedNotifications ?? [] });
});

router.put("/settings", async (req, res) => {
  const { muted } = req.body ?? {};
  if (!Array.isArray(muted) || muted.some((k) => !NOTIFICATION_TYPES[k])) {
    return res.status(400).json({ error: `muted doit être une liste parmi : ${Object.keys(NOTIFICATION_TYPES).join(", ")}.` });
  }
  const user = await req.db.user.update({
    where: { id: req.user.sub },
    data: { mutedNotifications: [...new Set(muted)] },
    select: { mutedNotifications: true },
  });
  res.json({ types: typesFor(req.user), muted: user.mutedNotifications });
});

router.post("/read-all", async (req, res) => {
  await req.db.notification.updateMany({ where: { userId: req.user.sub, readAt: null }, data: { readAt: new Date() } });
  res.status(204).end();
});

router.post("/:id/read", async (req, res) => {
  const { count } = await req.db.notification.updateMany({
    where: { id: req.params.id, userId: req.user.sub, readAt: null },
    data: { readAt: new Date() },
  });
  if (!count && !(await req.db.notification.findFirst({ where: { id: req.params.id, userId: req.user.sub } }))) {
    return res.status(404).json({ error: "Notification introuvable." });
  }
  res.status(204).end();
});

export default router;
