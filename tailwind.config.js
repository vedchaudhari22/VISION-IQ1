/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        slateBrand: {
          950: "#06131f"
        },
        mint: "#4ade80",
        amberSignal: "#facc15",
        coral: "#fb7185",
        cyanGlow: "#22d3ee"
      },
      boxShadow: {
        soft: "0 20px 60px rgba(15, 23, 42, 0.18)"
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at top left, rgba(34, 211, 238, 0.22), transparent 36%), radial-gradient(circle at bottom right, rgba(251, 113, 133, 0.18), transparent 28%)"
      },
      fontFamily: {
        display: ["Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};
