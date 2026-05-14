import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    // The build-decks workspace has its own vitest config with a different
    // alias setup (@app → src). Run it via `npm test -w @flashcard-pwa/build-decks`.
    exclude: ["**/node_modules/**", "**/dist/**", "tools/**"],
  },
});
