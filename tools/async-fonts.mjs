// One-off: stop the Google Fonts stylesheet from render-blocking every page.
// Lighthouse flagged ~900ms of render-blocking time from the synchronous
// <link rel="stylesheet" href="https://fonts.googleapis.com/..."> tag. Swaps it
// for the standard preload + media=print/onload swap pattern, with a <noscript>
// fallback for the (rare) no-JS case. Run once, then sync-mirrors.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const rootFiles = readdirSync(root).filter((f) => f.endsWith(".html"));

const pattern =
  /<link\n(\s*)href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]*)"\n\s*rel="stylesheet"\n\s*\/>/;

let changed = 0;
for (const file of rootFiles) {
  const full = path.join(root, file);
  const raw = readFileSync(full, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const normalized = raw.replace(/\r\n/g, "\n");

  const m = normalized.match(pattern);
  if (!m) {
    console.log(`SKIP (no match): ${file}`);
    continue;
  }
  const [full_match, indent, href] = m;
  const replacement = [
    `<link rel="preload" as="style" href="${href}" />`,
    `<link`,
    `${indent}href="${href}"`,
    `${indent}rel="stylesheet"`,
    `${indent}media="print"`,
    `${indent}onload="this.media='all'"`,
    `/>`,
    `<noscript><link rel="stylesheet" href="${href}" /></noscript>`,
  ].join("\n");

  const updated = normalized.replace(pattern, replacement);
  writeFileSync(full, updated.replace(/\n/g, eol));
  changed++;
  console.log(`Updated: ${file}`);
}

console.log(`\n${changed}/${rootFiles.length} root files updated.`);
