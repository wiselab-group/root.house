// maplibre-gl v6 resolves its tile-parsing worker via
// `new URL('./maplibre-gl-worker.mjs', import.meta.url)` instead of the
// inlined-blob approach older versions used. Turbopack (Next.js 16's dev
// server) doesn't statically detect that pattern and never emits the worker
// chunk — the worker request fails silently (no console error, no network
// error), tile data never loads, and the map renders as a blank background
// forever. Confirmed via a live Playwright reproduction: `page.workers()`
// stayed empty and MapView's `onLoad` handler never fired even after 8s,
// despite style.json/sprite/tiles.json all returning 200 — only the actual
// worker request never happened.
//
// Fix: copy maplibre-gl's own worker + its shared chunk (the worker imports
// `./maplibre-gl-shared.mjs` by relative path, so both must sit together)
// into public/maplibre/, then MapView calls
// maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs') before
// creating any map instance. Runs on every `pnpm install` (see
// package.json's postinstall) so a fresh checkout/CI never silently loses
// this — it is NOT committed to git (public/ output from node_modules).
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const srcDir = join(repoRoot, "node_modules/maplibre-gl/dist");
const destDir = join(repoRoot, "public/maplibre");

const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

if (!existsSync(srcDir)) {
  // maplibre-gl not installed (e.g. a partial/filtered install) — nothing to do.
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
for (const file of files) {
  copyFileSync(join(srcDir, file), join(destDir, file));
}
console.log("copied maplibre-gl worker files to public/maplibre/");
