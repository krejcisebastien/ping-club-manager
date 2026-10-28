import { ref } from "vue";
import { api } from "../lib/api.js";

// Nombre de notifications non lues du compte (badge de la cloche), partagé par
// toutes les pages. Rafraîchi à l'ouverture d'une page, au retour sur l'app et
// à la réception d'une notification push quand l'app est ouverte.
const unread = ref(0);
let listening = false;

export async function refreshUnread() {
  try {
    unread.value = (await api.get("/notifications/unread-count")).data.unread;
  } catch {
    // Hors ligne ou session expirée : on garde la dernière valeur.
  }
}

function listen() {
  if (listening) return;
  listening = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshUnread();
  });
  // Message du service worker (public/push-sw.js) à la réception d'un push.
  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type === "notification") refreshUnread();
  });
}

export function useNotifications() {
  listen();
  return { unread, refreshUnread };
}
