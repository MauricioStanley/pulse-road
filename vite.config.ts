import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/*.png", "icons/*.svg", "audio/*.mp3"],
      manifest: {
        id: base,
        name: "Pulse Road",
        short_name: "Pulse Road",
        lang: "es",
        description: "Tu próximo récord está a un toque.",
        start_url: base,
        scope: base,
        display: "standalone",
        orientation: "portrait",
        background_color: "#07151e",
        theme_color: "#07151e",
        icons: [
          {
            src: `${base}icons/icon-192.png`,
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: `${base}icons/icon-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: `${base}icons/maskable-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,mp3,png,svg,json}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
    rollupOptions: { output: { manualChunks: { phaser: ["phaser"] } } },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
