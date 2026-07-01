// One-off: add a "Services" link to the primary nav + footer of every root page.
//
// Inserts <a href="/services">Services</a> immediately after each standalone
//   <a href="/galleries">Galleries</a>
// link (which appears in both the nav and the footer of nearly every page), with
// matching indentation and the file's own EOL. gallery_list.html has no Galleries
// link in its nav (it *is* the galleries page), so it also gets Services after its
// nav "Home" link. Idempotent: skips any file that already links /services.
//
// Only touches root *.html; run `node tools/sync-mirrors.mjs` afterward to mirror.
//
//   node tools/add-services-link.mjs

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

// Root pages we do NOT touch: the page itself, redirects/legacy, and the
// paper-theme About (orphaned; slated for its own redesign).
const SKIP = new Set([
  "services.html",
  "selected-work.html",
  "oldindex.html",
  "test.html",
  "404.html",
  "about.html",
]);

const GALLERIES_LINK = /([ \t]*)<a href="\/galleries">Galleries<\/a>/g;
const HOME_LINK = /([ \t]*)<a href="\/">Home<\/a>/g;

async function main() {
  const entries = await fs.readdir(ROOT, { withFileTypes: true });
  const pages = entries
    .filter((e) => e.isFile() && e.name.endsWith(".html") && !SKIP.has(e.name))
    .map((e) => e.name);

  let changed = 0;
  for (const name of pages) {
    const abs = path.join(ROOT, name);
    let content = await fs.readFile(abs, "utf8");

    if (content.includes('href="/services"')) {
      console.log(`  skip (already linked) ${name}`);
      continue;
    }

    const eol = content.includes("\r\n") ? "\r\n" : "\n";
    let hits = 0;

    content = content.replace(GALLERIES_LINK, (m, ws) => {
      hits++;
      return `${m}${eol}${ws}<a href="/services">Services</a>`;
    });

    // gallery_list.html nav has no Galleries link — add Services after nav Home.
    if (name === "gallery_list.html") {
      content = content.replace(HOME_LINK, (m, ws) => {
        hits++;
        return `${m}${eol}${ws}<a href="/services">Services</a>`;
      });
    }

    if (!hits) {
      console.warn(`  WARN no insertion point in ${name}`);
      continue;
    }

    await fs.writeFile(abs, content);
    changed++;
    console.log(`  updated ${name} (${hits} insertion${hits > 1 ? "s" : ""})`);
  }

  console.log(changed ? `\nUpdated ${changed} file(s).` : "No files changed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
