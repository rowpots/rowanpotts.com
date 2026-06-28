// Copies each root <slug>.html to its clean-URL mirror so the two never drift.
//
// GitHub Pages has no rewrite engine, so /about, /graduation etc. are served by
// byte-identical <slug>/index.html mirror files. This script regenerates every
// mirror from its root source. Run it after editing any page, before committing.
//
//   node sync-mirrors.mjs            # write mirrors
//   node sync-mirrors.mjs --check    # verify only (non-zero exit if any drift)

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

// Root pages that are NOT mirrored (legacy/unlinked or special).
const SKIP = new Set(["oldindex.html", "test.html", "404.html"]);

// Special-case mirror targets; everything else maps <slug>.html -> <slug>/index.html.
const SPECIAL = {
  "index.html": "home/index.html",
  "gallery_list.html": "galleries/index.html",
};

const checkOnly = process.argv.includes("--check");

function mirrorFor(name) {
  if (SPECIAL[name]) return SPECIAL[name];
  return `${name.replace(/\.html$/, "")}/index.html`;
}

async function main() {
  const entries = await fs.readdir(ROOT, { withFileTypes: true });
  const pages = entries
    .filter((e) => e.isFile() && e.name.endsWith(".html") && !SKIP.has(e.name))
    .map((e) => e.name);

  let wrote = 0;
  const drift = [];

  for (const name of pages) {
    const src = await fs.readFile(path.join(ROOT, name));
    const mirrorRel = mirrorFor(name);
    const mirrorAbs = path.join(ROOT, mirrorRel);

    let current = null;
    try {
      current = await fs.readFile(mirrorAbs);
    } catch {
      /* mirror missing */
    }

    const identical = current && current.equals(src);
    if (identical) continue;

    if (checkOnly) {
      drift.push(`${name} -> ${mirrorRel}`);
      continue;
    }

    await fs.mkdir(path.dirname(mirrorAbs), { recursive: true });
    await fs.writeFile(mirrorAbs, src);
    wrote++;
    console.log(`  synced ${name} -> ${mirrorRel}`);
  }

  if (checkOnly) {
    if (drift.length) {
      console.error(`Mirror drift detected (${drift.length}):`);
      for (const d of drift) console.error(`  ${d}`);
      process.exit(1);
    }
    console.log("All mirrors in sync.");
    return;
  }

  console.log(wrote ? `\nSynced ${wrote} mirror file(s).` : "All mirrors already in sync.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
