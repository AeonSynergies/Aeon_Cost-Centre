import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#0F1629",
        navy2: "#1A2540",
        navy3: "#243357",
        blue: "#3266AD",
        "blue-lt": "#E6F1FB",
        teal: "#1D9E75",
        "teal-lt": "#E1F5EE",
        purple: "#7F77DD",
        "purple-lt": "#EEEDFE",
        coral: "#D85A30",
        "coral-lt": "#FAECE7",
        amber: "#BA7517",
        "amber-lt": "#FAEEDA",
        pink: "#D4537E",
        "pink-lt": "#FBEAF0",
        bg: "#F8F9FC",
        card: "#FFFFFF",
        border: "#E8ECF4",
        text1: "#0F1629",
        text2: "#64748B",
        text3: "#94A3B8",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
