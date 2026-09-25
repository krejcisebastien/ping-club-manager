// Vrai dans l'app native (Capacitor iOS/Android), faux dans un navigateur ou
// une PWA installée.
export function isNativeApp() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}
