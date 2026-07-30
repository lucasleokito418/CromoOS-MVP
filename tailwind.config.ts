import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#121214",
        surface: "#1C1C1F",
        "surface-hover": "#242428",
        sidebar: "#0E0E10",
        border: "rgba(255,255,255,0.10)",
        "text-primary": "#F5F5F0",
        "text-secondary": "#96969E",
        accent: {
          DEFAULT: "#E5FF00",
          hover: "#C7DB00",
          on: "#14140F",
        },
        danger: "#FF4D4D",
        success: "#2DD4BF",
        warning: "#FF8A3D",
        info: "#4C8DFF",
      },
      borderRadius: {
        DEFAULT: "8px",
      },
      fontFamily: {
        oswald: ["var(--font-oswald)", "sans-serif"],
        inter: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        sm: "0 1px 3px 0 rgba(0,0,0,0.3)",
        lg: "0 8px 32px 0 rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
export default config;