import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

// Injecte le nom du club dans index.html avec une vraie valeur par défaut :
// contrairement à la substitution native Vite (%VAR%), qui laisse le texte
// littéral "%VITE_CLUB_NAME%" si la variable n'est pas définie au build.
function htmlClubName() {
  return {
    name: "html-club-name",
    transformIndexHtml(html, { mode }) {
      const env = loadEnv(mode, process.cwd(), "VITE_");
      const clubName = env.VITE_CLUB_NAME || "Club Tennis de Table";
      return html.replace(/%VITE_CLUB_NAME%/g, clubName);
    },
  };
}

// Application installable (PWA) : manifest + service worker qui met en cache
// l'interface seulement. Les appels à l'API ne sont jamais mis en cache (données
// toujours fraîches) ; hors ligne, l'app s'ouvre mais les données ne chargent pas.
function pwa(mode) {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const clubName = env.VITE_CLUB_NAME || "Club Tennis de Table";
  return VitePWA({
    registerType: "prompt",
    // Enregistrement manuel (PwaUpdatePrompt.vue) : pas de service worker dans
    // l'app native Capacitor.
    injectRegister: false,
    includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png", "logo.svg"],
    manifest: {
      name: clubName,
      short_name: env.VITE_CLUB_SHORT_NAME || clubName,
      description: "Gestion du club de tennis de table : entraînements, présences, stages.",
      lang: "fr",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "any",
      theme_color: "#0284c7",
      background_color: "#ffffff",
      icons: [
        { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
        { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
        { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
        { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}"],
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      navigateFallback: "/index.html",
      navigateFallbackDenylist: [/^\/api\//],
      cleanupOutdatedCaches: true,
    },
  });
}

export default defineConfig(({ mode }) => ({
  plugins: [vue(), htmlClubName(), pwa(mode)],
  server: {
    port: 5173,
  },
}));
