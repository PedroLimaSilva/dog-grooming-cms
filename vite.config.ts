import { execFileSync } from "node:child_process";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";

const base = process.env.VITE_BASE_PATH?.trim() || "/";

/** Strip leading `v` from tags like `v1.2.3`. */
function normalizeReleaseTag(tag: string): string {
  const t = tag.trim();
  if (/^v\d/i.test(t)) return t.slice(1);
  return t;
}

function tryGit(args: string[]): string {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      cwd: import.meta.dirname,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

/**
 * Semver from git: exact release tag on HEAD, else `nearestTag+shortSha`
 * (7-char hash). No tags / not a git checkout falls back to `0.0.1+…`.
 */
function resolveAppVersionFromGit(): string {
  const shortSha = tryGit(["rev-parse", "--short=7", "HEAD"]);
  const exact = tryGit(["describe", "--tags", "--exact-match", "HEAD"]);
  if (exact) {
    return normalizeReleaseTag(exact);
  }
  const nearest = tryGit(["describe", "--tags", "--abbrev=0", "HEAD"]);
  const base = nearest ? normalizeReleaseTag(nearest) : "0.0.1";
  const suffix = shortSha || "unknown";
  return `${base}+${suffix}`;
}

// https://vite.dev/config/
export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(resolveAppVersionFromGit()),
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
