import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";

const base = process.env.VITE_BASE_PATH?.trim() || "/";

function readPackageVersion(): string {
  const pkgPath = resolve(import.meta.dirname, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    version?: string;
  };
  const v = typeof pkg.version === "string" ? pkg.version.trim() : "";
  return v || "0.0.0";
}

// https://vite.dev/config/
export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(readPackageVersion()),
  },
  plugins: [
    svelte(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Dog Grooming CMS",
        short_name: "Grooming",
        description: "On-device dog grooming salon appointments",
        theme_color: "#1a5f4a",
        background_color: "#f0f4f2",
        display: "standalone",
        orientation: "any",
        scope: base,
        start_url: base,
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
      },
    }),
  ],
});
