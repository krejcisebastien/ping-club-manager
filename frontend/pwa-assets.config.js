import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Génère les icônes PWA (favicon, apple-touch-icon, 64/192/512, maskable) à
// partir de public/logo.svg : « npm run icons » après avoir changé le logo.
export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: "#0284c7" } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: "#0284c7" } },
  },
  images: ["public/logo.svg"],
});
