import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/2026-korea-busan-travel/",
  publicDir: "images",
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["app-icon.svg", "app-icon-192.png", "app-icon-512.png", "transport/*.svg"],
      manifest: {
        name: "釜山 4 天 3 夜旅行工具",
        short_name: "釜山 2026",
        description: "離線可用的釜山手機行程、交通與注意事項",
        lang: "zh-Hant",
        start_url: "/2026-korea-busan-travel/",
        scope: "/2026-korea-busan-travel/",
        display: "standalone",
        background_color: "#eef5f3",
        theme_color: "#0b5d66",
        icons: [
          {
            src: "app-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "app-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  test: {
    environment: "jsdom",
    exclude: ["test/e2e/**", "node_modules/**", "dist/**"],
    setupFiles: "./src/test/setup.ts",
  },
});
