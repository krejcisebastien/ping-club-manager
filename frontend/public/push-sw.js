// Chargé par le service worker de la PWA (workbox importScripts) : affiche les
// notifications push web envoyées par l'API via Firebase Cloud Messaging.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { notification: { body: event.data?.text() } };
  }
  const notification = payload.notification ?? payload.data ?? {};
  const title = notification.title || "PingDesk";
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: notification.body || "",
        icon: "/pwa-192x192.png",
        badge: "/pwa-64x64.png",
      }),
      // App ouverte : met à jour le badge de la cloche.
      self.clients.matchAll({ type: "window" }).then((clients) => clients.forEach((c) => c.postMessage({ type: "notification" }))),
    ]),
  );
});

// Un clic sur la notification ouvre la boîte de notifications de l'app
// (onglet existant si possible).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => "focus" in c);
      if (!existing) return self.clients.openWindow("/notifications");
      return existing.focus().then((client) => client.navigate?.("/notifications")).catch(() => {});
    }),
  );
});
