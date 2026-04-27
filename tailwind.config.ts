import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        bmw: {
          base: "#070c16",
          panel: "#162741",
          accent: "#4f8de6",
          soft: "#d9e9ff"
        }
      },
      boxShadow: {
        "bmw-glow": "0 10px 30px rgba(25, 73, 145, 0.22)"
      }
    }
  },
  plugins: []
};

export default config;
