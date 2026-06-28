// One-off: generate extra-large 3840px WebP for the full-bleed homepage hero
// images (which render at 100vw and need more than 2400px on hi-DPI displays).
// Sources are read from the git-ignored masters/ copies.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const MASTERS = path.join(ROOT, "masters");
const manifest = JSON.parse(await fs.readFile(path.join(HERE, "image-manifest.json"), "utf8"));

const BASES = [
  "/img/graduation/elizabeth-fowler-graduation-26-of-80",
  "/img/myers-farm/myfarm-10",
  "/img/football/app-state/top/app-state-19",
  "/img/football/app-state/top/app-state-41",
];
const WIDTH = 3840;

async function resolveMaster(src) {
  const rel = src.replace(/^\//, "");
  for (const c of [rel, (() => { try { return decodeURIComponent(rel); } catch { return rel; } })()]) {
    const abs = path.join(MASTERS, c);
    try { await fs.access(abs); return abs; } catch {}
  }
  return null;
}

for (const base of BASES) {
  const jpg = `${base}-1600.jpg`;
  const entry = Object.entries(manifest).find(([, e]) => e.jpg === jpg);
  if (!entry) { console.warn(`! no manifest entry for ${base}`); continue; }
  const master = await resolveMaster(entry[0]);
  if (!master) { console.warn(`! no master for ${entry[0]}`); continue; }
  const out = path.join(ROOT, `${base}-${WIDTH}.webp`.replace(/^\//, ""));
  const info = await sharp(master)
    .rotate()
    .resize({ width: WIDTH, withoutEnlargement: true })
    .webp({ quality: 80, effort: 5 })
    .toFile(out);
  console.log(`  ${path.basename(out)}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
}
console.log("done");
