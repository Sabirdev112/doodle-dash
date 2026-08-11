import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sketch: ["var(--font-sketch)", "cursive"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      colors: {
        paper: {
          DEFAULT: "#fff8eb",
          dark: "#f5ecd8",
          line: "#2c2416",
        },
        doodle: {
          yellow: "#ffd166",
          coral: "#ff6b6b",
          mint: "#06d6a0",
          sky: "#4cc9f0",
          grape: "#9b5de5",
          ink: "#2c2416",
          muted: "#6b5c4c",
        },
      },
      boxShadow: {
        sketch: "3px 3px 0 0 #2c2416",
        "sketch-sm": "2px 2px 0 0 #2c2416",
        "sketch-lg": "5px 5px 0 0 #2c2416",
      },
    },
  },
  plugins: [],
};

export default config;
