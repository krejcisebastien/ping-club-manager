import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

// Clé de compte de service Firebase (JSON brut sur une ligne), jamais commitée :
// voir backend/.env.example. Tant qu'elle n'est pas renseignée, l'envoi échoue
// proprement plutôt que de planter le serveur au démarrage.
let app = null;
function getApp() {
  if (app) return app;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    const err = new Error("Notifications indisponibles : FIREBASE_SERVICE_ACCOUNT n'est pas configurée.");
    err.code = "PUSH_NOT_CONFIGURED";
    throw err;
  }
  const existing = getApps()[0];
  app = existing ?? initializeApp({ credential: cert(JSON.parse(raw)) });
  return app;
}

// Envoie la même notification à une liste de jetons (appareils). Les jetons
// qui ne sont plus valides (désinstallation, etc.) sont renvoyés pour nettoyage.
export async function sendPushToTokens(tokens, { title, body }) {
  if (!tokens.length) return { successCount: 0, invalidTokens: [] };
  const messaging = getMessaging(getApp());
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
  });
  const INVALID_CODES = ["messaging/registration-token-not-registered", "messaging/invalid-registration-token", "messaging/invalid-argument"];
  const invalidTokens = response.responses
    .map((r, i) => (!r.success && INVALID_CODES.includes(r.error?.code) ? tokens[i] : null))
    .filter(Boolean);
  return { successCount: response.successCount, invalidTokens };
}
