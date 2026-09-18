import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

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

export default defineConfig({
  plugins: [vue(), htmlClubName()],
  server: {
    port: 5173,
  },
});
