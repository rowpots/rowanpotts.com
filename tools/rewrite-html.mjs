// Rewrites <img> tags in the top-level *.html pages into responsive <picture>
// blocks, using tools/image-manifest.json produced by optimize-images.mjs.
//
// - Gallery photos (class "image"): adds data-full (full-res WebP) for the
//   lightbox, lazy loading, and grid-appropriate sizes.
// - Hero image (class "hero_image"): eager + fetchpriority high, 100vw sizes,
//   and a matching <link rel="preload"> injected into <head> (LCP).
// - Other content images (tiles, cards): lazy, column-appropriate sizes.
//
// Idempotent: once an <img> points at /img/...jpg it is no longer a manifest
// key, so re-running is a no-op. Only edits root *.html; run sync-mirrors.mjs
// afterwards to propagate to the /<slug>/index.html copies.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const MANIFEST = path.join(HERE, "image-manifest.json");

const SIZES = {
  hero: "100vw",
  gallery: "(min-width: 1760px) 880px, (min-width: 720px) 50vw, 100vw",
  content: "(min-width: 720px) 33vw, 100vw",
};

// Phones get one un-negotiable file for the masonry instead of a srcset the
// browser picks from. Press-and-hold "Save" hands the OS whichever candidate is
// already cached, so a responsive grid saves a thumbnail. 1600w is the tuned
// compromise: big enough for a camera roll (Instagram caps uploads at 1080px
// anyway) at ~220KB/photo, where 2400w doubled gallery weight for pixels almost
// nobody sees. The lightbox still opens the full 2400w via data-full.
// Media query matches the single-column breakpoint in gallery_page.css.
const GALLERY_MOBILE_MEDIA = "(max-width: 600px)";
const GALLERY_MOBILE_WIDTH = 1600;

// largest webp at or below the mobile cap (smaller masters may top out lower)
function mobileSrc(entry) {
  const usable = entry.webp.filter((x) => x.w <= GALLERY_MOBILE_WIDTH);
  return (usable.length ? usable[usable.length - 1] : entry.webp[0]).src;
}

function parseAttrs(tag) {
  const attrs = {};
  for (const m of tag.matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) attrs[m[1]] = m[2];
  return attrs;
}

function srcset(entry) {
  return entry.webp.map((x) => `${x.src} ${x.w}w`).join(", ");
}

function buildPicture(entry, attrs) {
  const cls = attrs.class || "";
  const isHero = /\bhero_image\b/.test(cls);
  const isGallery = /\bimage\b/.test(cls);
  const sizes = isHero ? SIZES.hero : isGallery ? SIZES.gallery : SIZES.content;

  const imgAttrs = [];
  if (attrs.class) imgAttrs.push(`class="${attrs.class}"`);
  imgAttrs.push(`src="${entry.jpg}"`);
  if (attrs.alt !== undefined) imgAttrs.push(`alt="${attrs.alt}"`);
  imgAttrs.push(`width="${entry.width}"`, `height="${entry.height}"`);
  if (isHero) {
    imgAttrs.push(`loading="eager"`, `fetchpriority="high"`, `decoding="async"`);
  } else {
    imgAttrs.push(`loading="lazy"`, `decoding="async"`);
  }
  if (isGallery) imgAttrs.push(`data-full="${entry.full}"`);

  // a lone candidate, so the phone has no choice to get wrong
  const mobileSource = isGallery
    ? `<source media="${GALLERY_MOBILE_MEDIA}" type="image/webp" srcset="${mobileSrc(entry)}" />`
    : "";

  return (
    `<picture>` +
    mobileSource +
    `<source type="image/webp" srcset="${srcset(entry)}" sizes="${sizes}" />` +
    `<img ${imgAttrs.join(" ")} />` +
    `</picture>`
  );
}

function injectHeroPreload(html, entry) {
  if (html.includes(`imagesrcset="${srcset(entry)}"`)) return html; // already present
  const preload =
    `  <link rel="preload" as="image" type="image/webp" ` +
    `imagesrcset="${srcset(entry)}" imagesizes="${SIZES.hero}" />\n`;
  // Insert right before the stylesheet link so it is discovered early.
  return html.replace(/(\n\s*<link rel="stylesheet")/, `\n${preload}$1`);
}

async function main() {
  const SKIP_HTML = new Set(["oldindex.html", "test.html"]); // dead/unlinked legacy files
  const manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
  const entries = await fs.readdir(ROOT, { withFileTypes: true });
  const htmlFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".html") && !SKIP_HTML.has(e.name))
    .map((e) => e.name);

  let totalImgs = 0;
  const touched = [];

  for (const name of htmlFiles) {
    const file = path.join(ROOT, name);
    let html = await fs.readFile(file, "utf8");
    let count = 0;
    let heroEntry = null;

    html = html.replace(/<img\b[^>]*>/gi, (tag) => {
      const attrs = parseAttrs(tag);
      const entry = manifest[attrs.src];
      if (!entry) return tag; // unknown / already rewritten
      count++;
      if (/\bhero_image\b/.test(attrs.class || "")) heroEntry = entry;
      return buildPicture(entry, attrs);
    });

    if (heroEntry) html = injectHeroPreload(html, heroEntry);

    if (count > 0) {
      await fs.writeFile(file, html);
      totalImgs += count;
      touched.push(`${name} (${count})`);
    }
  }

  console.log(`Rewrote ${totalImgs} <img> tag(s) across ${touched.length} file(s):`);
  for (const t of touched) console.log(`  ${t}`);
  if (touched.length === 0) console.log("  (nothing to do — already rewritten?)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
