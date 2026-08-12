// One-off: swap the old single <link rel="shortcut icon" ... r_icon.png> tag for the
// new favicon set (favicon.svg + favicon.ico + apple-touch-icon.png) on every root page.
// Run once, then `node tools/sync-mirrors.mjs` to propagate to the mirrors.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const OLD = '  <link rel="shortcut icon" type="image/png" href="/photos/r_icon.png" />';
const NEW = [
  '  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />',
  '  <link rel="icon" href="/favicon.ico" sizes="32x32" />',
  '  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
].join("\n");

const rootFiles = readdirSync(root).filter((f) => f.endsWith(".html"));

let changed = 0;
for (const file of rootFiles) {
  const full = path.join(root, file);
  const raw = readFileSync(full, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const normalized = raw.replace(/\r\n/g, "\n");
  const oldNorm = OLD;
  if (!normalized.includes(oldNorm)) {
    console.log(`SKIP (no match): ${file}`);
    continue;
  }
  const updated = normalized.replace(oldNorm, NEW);
  writeFileSync(full, updated.replace(/\n/g, eol));
  changed++;
  console.log(`Updated: ${file}`);
}

console.log(`\n${changed}/${rootFiles.length} root files updated.`);
