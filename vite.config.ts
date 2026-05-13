import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Flashcards",
        short_name: "Flashcards",
        description: "Offline flashcards for language learning",
        theme_color: "#0d0d0d",
        background_color: "#0d0d0d",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        // Precache deck JSONs so the app is fully usable offline on the
        // first install — the runtime cache only fills after a hit.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2,json}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/decks/"),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "decks-cache" },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
