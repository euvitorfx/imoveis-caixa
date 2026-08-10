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
          DEFAULT: "#1E293B",
          hover:   "#334155",
        },
        coral: {
          DEFAULT: "#4338CA",
          dark:    "#3730A3",
          light:   "#6366F1",
        },
      },
    },
  },
  plugins: [],
};

export default config;
