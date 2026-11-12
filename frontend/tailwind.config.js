import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js}"],
  theme: {
    extend: {
      // Identité visuelle tirée du logo : bleu nuit (fond), bleu vif (actions),
      // rouge raquette (accents ponctuels).
      colors: {
        ink: { DEFAULT: "#0b1b34", 800: "#13284a", 700: "#1b355e" },
        brand: {
          50: "#eff5ff", 100: "#dbe8fe", 200: "#bfd5fe", 300: "#93b8fd", 400: "#6093fa",
          500: "#3b6ff6", 600: "#2554eb", 700: "#1d42d8", 800: "#1e37af", 900: "#1e338a",
        },
        racket: { 50: "#fff1f2", 100: "#ffe1e3", 500: "#ef3b4a", 600: "#dc2638", 700: "#b91c2c" },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};
