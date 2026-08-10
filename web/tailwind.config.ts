import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        night: {
          DEFAULT: "#01304D",
          hover:   "#0A3D5C",
        },
        coral: {
          DEFAULT: "#F59E0B",
          dark:    "#D97706",
          light:   "#FBBF24",
        },
      },
    },
  },
  plugins: [],
};

export default config;
