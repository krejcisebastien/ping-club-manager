import { isNativeApp } from "./platform.js";
import { api } from "./api.js";

// Configuration Firebase web (même projet que FIREBASE_SERVICE_ACCOUNT côté
// API) : valeurs publiques, renseignées dans les variables VITE_FIREBASE_*.
const FIREBASE_WEB_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Push web possible : navigateur compatible (sur iPhone, seulement une fois
// l'app ajoutée à l'écran d'accueil) et configuration Firebase présente.
export function isWebPushAvailable() {
  if (isNativeApp()) return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return false;
  return Object.values(FIREBASE_WEB_CONFIG).every(Boolean) && Boolean(VAPID_KEY);
}

export function webPushPermission() {
  return "Notification" in window ? Notification.permission : "denied";
}

async function getWebToken() {
  const { initializeApp, getApps } = await import("firebase/app");
  const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
  if (!(await isSupported())) return null;
  const app = getApps()[0] ?? initializeApp(FIREBASE_WEB_CONFIG);
  // Le service worker de la PWA (sw.js) gère aussi la réception des push.
  const registration = await navigator.serviceWorker.ready;
  return getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
}

// Web : à appeler depuis un clic (exigé par Safari/iOS pour demander la
// permission). Renvoie true si l'appareil est désormais enregistré.
export async function enableWebPush() {
  if (!isWebPushAvailable()) return false;
  if ((await Notification.requestPermission()) !== "granted") return false;
  const token = await getWebToken();
  if (!token) return false;
  await api.post("/push/register", { token, platform: "web" });
  return true;
}

// Demande la permission puis enregistre le jeton de cet appareil côté serveur.
// Sur le web, ne demande rien : réenregistre seulement si la permission a déjà
// été accordée (le jeton peut changer). No-op si la permission est refusée.
export async function registerPushToken() {
  if (!isNativeApp()) {
    if (!isWebPushAvailable() || webPushPermission() !== "granted") return;
    const token = await getWebToken();
    if (token) await api.post("/push/register", { token, platform: "web" });
    return;
  }

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
  try {
    let token;
    if (isNativeApp()) {
      const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
      ({ token } = await FirebaseMessaging.getToken());
    } else {
      if (!isWebPushAvailable() || webPushPermission() !== "granted") return;
      token = await getWebToken();
    }
    if (token) await api.delete("/push/register", { data: { token } });
  } catch {
    // Pas grave : le jeton expirera / sera remplacé à la prochaine connexion.
  }
}
