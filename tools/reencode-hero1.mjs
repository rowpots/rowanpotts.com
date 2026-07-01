// One-off: re-encode the first homepage hero image (graduation-26) WebP
// derivatives at higher quality (q88) for a sharper LCP. Source is the
// 6141x4094 master; only the hero-relevant sizes are regenerated in place.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const MASTER = path.join(ROOT, "bestcomp/Elizabeth-Fowler-Graduation (26 of 80) (1).jpg");
const OUTBASE = path.join(ROOT, "img/bestcomp/elizabeth-fowler-graduation-26-of-80-1");
const SIZES = [1600, 2400, 3840];
const QUALITY = 88;

for (const w of SIZES) {
  const out = `${OUTBASE}-${w}.webp`;
  const before = fs.existsSync(out) ? fs.statSync(out).size : 0;
  const info = await sharp(MASTER)
    .rotate()
    .resize({ width: w, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(out);
  console.log(
    `${w}w -> ${info.width}x${info.height}  ${(before / 1024).toFixed(0)}KB -> ${(info.size / 1024).toFixed(0)}KB (q${QUALITY})`
  );
}
console.log("done");
