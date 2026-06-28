// Relocates the full-resolution master photos out of the served/tracked tree.
//
// Every photo referenced by the site now has optimized /img derivatives, so the
// originals no longer need to ship. This moves each manifest source into a
// git-ignored masters/ folder (preserving its original path + filename), which:
//   - keeps a local backup (files are moved, never deleted),
//   - removes ~1.3 GB of originals from what GitHub Pages serves,
//   - leaves mirror index.html pages, the favicon, and unreferenced files alone.
//
// Reversible: move masters/<path> back to <path> to restore. Idempotent: sources
// already moved are skipped.
//
//   node move-masters.mjs            # move masters out
//   node move-masters.mjs --dry-run  # report what would move, change nothing

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const MASTERS = path.join(ROOT, "masters");
const MANIFEST = path.join(HERE, "image-manifest.json");

const dryRun = process.argv.includes("--dry-run");

async function resolveSource(src) {
  const rel = src.replace(/^\//, "");
  const candidates = [rel];
  try {
    candidates.push(decodeURIComponent(rel));
  } catch {}
  for (const c of candidates) {
    const abs = path.join(ROOT, c);
    try {
      await fs.access(abs);
      return { abs, rel: c };
    } catch {}
  }
  return null;
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
  const srcs = Object.keys(manifest);
  let moved = 0;
  let bytes = 0;
  let already = 0;

  for (const src of srcs) {
    const found = await resolveSource(src);
    if (!found) {
      already++; // already moved (or genuinely gone)
      continue;
    }
    const dest = path.join(MASTERS, found.rel);
    bytes += (await fs.stat(found.abs)).size;
    if (dryRun) {
      moved++;
      continue;
    }
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.rename(found.abs, dest);
    moved++;
  }

  console.log(
    `${dryRun ? "[dry-run] would move" : "Moved"} ${moved} master(s) ` +
      `(${(bytes / 1024 / 1024).toFixed(1)} MB) to masters/.` +
      (already ? ` ${already} already moved/absent.` : "")
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
