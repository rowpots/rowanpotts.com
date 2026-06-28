// Image optimizer for rowanpotts.com.
//
// Reads every <img src="..."> referenced by the top-level *.html pages, then for
// each source photo emits responsive WebP derivatives + a JPG fallback into /img,
// auto-orienting from EXIF and stripping metadata. Writes tools/image-manifest.json
// describing the outputs so rewrite-html.mjs can swap the <img> tags to <picture>.
//
// Usage:
//   node optimize-images.mjs            # process every referenced image
//   node optimize-images.mjs graduation # only sources whose path contains "graduation"
//
// The deployed site stays static HTML/CSS — this is a local developer utility.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUT_ROOT = path.join(ROOT, "img");
const MANIFEST = path.join(HERE, "image-manifest.json");

const WIDTHS = [480, 960, 1600, 2400]; // responsive breakpoints (never upscaled)
const JPG_FALLBACK_WIDTH = 1600;
const WEBP_QUALITY = 80;
const JPG_QUALITY = 82;
const CONCURRENCY = 4;

const filter = process.argv[2] || ""; // optional substring filter for testing

const SKIP_HTML = new Set(["oldindex.html", "test.html"]); // dead/unlinked legacy files

const isImage = (p) => /\.(jpe?g|png)$/i.test(p);

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Slugify a directory path segment-by-segment so /img URLs never contain
// spaces or underscores (a space in a srcset URL breaks the descriptor parser).
function slugifyDir(dir) {
  if (!dir || dir === ".") return "";
  return dir
    .split("/")
    .map((seg) => seg.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))
    .join("/");
}

// Resolve an HTML src ("/football/troy/a1.jpg") to an absolute file path,
// tolerating both literal-space and %20-encoded forms.
async function resolveSource(src) {
  const rel = src.replace(/^\//, "");
  const candidates = [rel];
  try {
    candidates.push(decodeURIComponent(rel));
  } catch {
    /* ignore malformed encodings */
  }
  for (const c of candidates) {
    const abs = path.join(ROOT, c);
    try {
      await fs.access(abs);
      return abs;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function collectReferencedSources() {
  const entries = await fs.readdir(ROOT, { withFileTypes: true });
  const htmlFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".html") && !SKIP_HTML.has(e.name))
    .map((e) => path.join(ROOT, e.name));

  const srcs = new Set();
  for (const file of htmlFiles) {
    const html = await fs.readFile(file, "utf8");
    for (const m of html.matchAll(/\bsrc\s*=\s*"([^"]+)"/gi)) {
      const src = m[1];
      if (!isImage(src)) continue;
      if (src.startsWith("/img/")) continue; // already-optimized output
      if (/r_icon\.png$/i.test(src)) continue; // favicon, left as-is
      srcs.add(src);
    }
  }
  return [...srcs].filter((s) => s.includes(filter));
}

async function mapPool(items, limit, fn) {
  const results = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

async function processOne(src, usedNames) {
  const abs = await resolveSource(src);
  if (!abs) {
    console.warn(`  ! missing source, skipped: ${src}`);
    return null;
  }

  const meta = await sharp(abs).metadata();
  let width = meta.width;
  let height = meta.height;
  if (meta.orientation && meta.orientation >= 5) [width, height] = [height, width];

  // Output dir mirrors the source dir under /img (slugified so URLs are
  // space/underscore-free); filename is slugified + width.
  const relDir = slugifyDir(path.dirname(src.replace(/^\//, "")));
  const outDir = path.join(OUT_ROOT, relDir);
  await fs.mkdir(outDir, { recursive: true });

  // Guarantee a unique base name within this output dir.
  let base = slugify(path.basename(src));
  const dirKey = relDir.toLowerCase();
  let unique = base;
  let n = 2;
  while (usedNames.has(`${dirKey}/${unique}`)) unique = `${base}-${n++}`;
  usedNames.add(`${dirKey}/${unique}`);
  base = unique;

  const targets = WIDTHS.filter((w) => w <= width);
  if (targets.length === 0) targets.push(width); // image smaller than smallest breakpoint

  const webp = [];
  let bytes = 0;
  for (const w of targets) {
    const outName = `${base}-${w}.webp`;
    const outPath = path.join(outDir, outName);
    const info = await sharp(abs)
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 5 })
      .toFile(outPath);
    bytes += info.size;
    webp.push({ w, src: `/${path.posix.join("img", relDir, outName)}` });
  }

  const jpgW = Math.min(JPG_FALLBACK_WIDTH, width);
  const jpgName = `${base}-${jpgW}.jpg`;
  const jpgInfo = await sharp(abs)
    .rotate()
    .resize({ width: jpgW, withoutEnlargement: true })
    .jpeg({ quality: JPG_QUALITY, mozjpeg: true })
    .toFile(path.join(outDir, jpgName));
  bytes += jpgInfo.size;

  return {
    src,
    width,
    height,
    webp,
    jpg: `/${path.posix.join("img", relDir, jpgName)}`,
    full: webp[webp.length - 1].src,
    outBytes: bytes,
  };
}

async function main() {
  const srcs = await collectReferencedSources();
  console.log(`Found ${srcs.length} referenced image(s)${filter ? ` matching "${filter}"` : ""}.`);
  if (srcs.length === 0) return;

  const usedNames = new Set();
  let inBytes = 0;
  let outBytes = 0;
  let done = 0;

  // Pre-seed used names sequentially-safe by processing in order via the pool,
  // but reserve names up front to avoid races on usedNames.
  const manifest = {};
  const results = await mapPool(srcs, CONCURRENCY, async (src) => {
    const abs = await resolveSource(src);
    if (abs) {
      try {
        inBytes += (await fs.stat(abs)).size;
      } catch {}
    }
    const res = await processOne(src, usedNames);
    done++;
    if (res) {
      outBytes += res.outBytes;
      const { outBytes: _omit, ...entry } = res;
      manifest[src] = entry;
      process.stdout.write(`\r  processed ${done}/${srcs.length}`);
    }
    return res;
  });

  process.stdout.write("\n");

  // Merge into any existing manifest (so per-gallery test runs accumulate).
  let existing = {};
  try {
    existing = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
  } catch {}
  const merged = { ...existing, ...manifest };
  await fs.writeFile(MANIFEST, JSON.stringify(merged, null, 2) + "\n");

  const ok = results.filter(Boolean).length;
  console.log(
    `\nOptimized ${ok}/${srcs.length} images.\n` +
      `  source:  ${(inBytes / 1024 / 1024).toFixed(1)} MB\n` +
      `  output:  ${(outBytes / 1024 / 1024).toFixed(1)} MB (all derivatives)\n` +
      `  manifest: ${path.relative(ROOT, MANIFEST)} (${Object.keys(merged).length} entries total)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
