// Generates the site favicon set from the aperture brand mark (base.css .brand_mark)
// so the browser tab icon matches the Dark Cinematic nav logo instead of the old
// yellow-circle "R" icon. Local-only tool; outputs land in the repo root.
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const BG = "#0e0e0f"; // --bg
const GOLD = "#c9a96a"; // --gold

// Same geometry as the inline <svg class="brand_mark"> in every page's <header>,
// on a filled rounded-square backdrop and a slightly heavier stroke so the
// aperture reads at favicon sizes.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect x="0" y="0" width="24" height="24" rx="5" fill="${BG}" />
  <g fill="none" stroke="${GOLD}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="14.31" y1="8" x2="20.05" y2="17.94"></line>
    <line x1="9.69" y1="8" x2="21.17" y2="8"></line>
    <line x1="7.38" y1="12" x2="13.12" y2="2.06"></line>
    <line x1="9.69" y1="16" x2="3.95" y2="6.06"></line>
    <line x1="14.31" y1="16" x2="2.83" y2="16"></line>
    <line x1="16.62" y1="12" x2="10.88" y2="21.94"></line>
  </g>
</svg>`;

writeFileSync(path.join(root, "favicon.svg"), svg);

function toIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const entries = [];
  const images = [];
  let offset = 6 + count * 16;
  for (const { size, data } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    images.push(data);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...images]);
}

const targets = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of targets) {
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  writeFileSync(path.join(root, name), buf);
}

const icoSizes = [16, 32, 48];
const icoBuffers = [];
for (const size of icoSizes) {
  const data = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  icoBuffers.push({ size, data });
}
writeFileSync(path.join(root, "favicon.ico"), toIco(icoBuffers));

console.log("Wrote favicon.svg, favicon.ico, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png");
