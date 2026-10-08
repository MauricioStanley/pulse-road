import { defineConfig } from "vite";
import { VitePWA, type ManifestOptions } from "vite-plugin-pwa";
import { getTheme, iconFolder, manifestFile, themes, type ThemeId } from "./src/themes";
const base = process.env.BASE_PATH || "/";

/** Same app (same id) in every palette; only the colors and icons change. */
function manifestFor(id: ThemeId): Partial<ManifestOptions> {
  const theme = getTheme(id);
  const icons = `${base}${iconFolder(id)}`;
  return {
    id: base,
    name: "Neo Rush",
    short_name: "Neo Rush",
    lang: "es",
    description: "Tu próximo récord está a un toque.",
    start_url: base,
    scope: base,
    display: "standalone",
    orientation: "portrait",
    background_color: theme.background,
    theme_color: theme.background,
    icons: [
      {
        src: `${icons}icon-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${icons}icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${icons}maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/*.png", "icons/*.svg", "audio/*.mp3"],
      manifest: manifestFor("mint"),
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,mp3,png,svg,json}"],
        // Other palettes' PNGs are only needed when installing; keep them
        // out of the offline download.
        globIgnores: ["icons/themes/**/*.png"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
    {
      // The game links the selected palette's manifest before installing.
      name: "palette-manifests",
      apply: "build",
      generateBundle() {
        for (const theme of themes)
          if (theme.id !== "mint")
            this.emitFile({
              type: "asset",
              fileName: manifestFile(theme.id),
              source: JSON.stringify(manifestFor(theme.id)),
            });
      },
    },
  ],
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
    rollupOptions: { output: { manualChunks: { phaser: ["phaser"] } } },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
