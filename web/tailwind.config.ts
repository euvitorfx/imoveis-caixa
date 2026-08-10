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
          DEFAULT: "#1a1a2e",
          hover:   "#252545",
        },
        coral: {
          DEFAULT: "#E83A3A",
          dark:    "#c92d2d",
          light:   "#ff7043",
        },
      },
    },
  },
  plugins: [],
};

export default config;
