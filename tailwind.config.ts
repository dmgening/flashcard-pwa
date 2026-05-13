import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        article: {
          der: "#5aa9ff",
          die: "#ff7a9a",
          das: "#6ee7b7",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
