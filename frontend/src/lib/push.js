import { isNativeApp } from "./platform.js";
import { api } from "./api.js";

// Demande la permission puis enregistre le jeton de cet appareil côté serveur.
// No-op silencieux hors app native (web/PWA) ou si la permission est refusée.
export async function registerPushToken() {
  if (!isNativeApp()) return;

  const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
  const { Capacitor } = await import("@capacitor/core");

  const { receive } = await FirebaseMessaging.checkPermissions();
  if (receive !== "granted") {
    const { receive: requested } = await FirebaseMessaging.requestPermissions();
    if (requested !== "granted") return;
  }

  const { token } = await FirebaseMessaging.getToken();
  if (!token) return;

  await api.post("/push/register", { token, platform: Capacitor.getPlatform() });
}

// Appelé à la déconnexion : on arrête de cibler cet appareil (sans échouer si
// le jeton n'est plus disponible ou si l'appel réseau échoue).
export async function unregisterPushToken() {
  if (!isNativeApp()) return;
  try {
    const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
    const { token } = await FirebaseMessaging.getToken();
    if (token) await api.delete("/push/register", { data: { token } });
  } catch {
    // Pas grave : le jeton expirera / sera remplacé à la prochaine connexion.
  }
}
