// Replaces weak generic gallery alt text (e.g. "Graduation photo 1") with a
// descriptive, subject/location-aware label per gallery. Honest and accessible,
// not keyword-stuffed. Edits only root *.html gallery pages; run sync-mirrors after.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ALT = {
  "graduation.html": "Graduation portrait session photo",
  "football-troy.html": "JMU vs. Troy football photo",
  "football-app-state.html": "JMU vs. Appalachian State football photo",
  "baseball.html": "JMU baseball game photo",
  "basketball.html": "JMU women's basketball game photo",
  "softball.html": "JMU softball game photo",
  "portrait.html": "Portrait session photo",
  "myers-farm.html": "Myers Farm event photo",
  "downtown-gallery.html": "Downtown Harrisonburg photo",
  "other.html": "Event and student-life photo",
};

async function main() {
  let total = 0;
  for (const [file, base] of Object.entries(ALT)) {
    const abs = path.join(ROOT, file);
    let html;
    try {
      html = await fs.readFile(abs, "utf8");
    } catch {
      continue;
    }
    let n = 0;
    html = html.replace(/(<img class="image"[^>]*?\salt=")[^"]*(")/g, (_m, p1, p2) => {
      n++;
      return `${p1}${base} ${n}${p2}`;
    });
    if (n > 0) {
      await fs.writeFile(abs, html);
      total += n;
      console.log(`  ${file}: ${n} alts -> "${base} N"`);
    }
  }
  console.log(`\nUpdated ${total} gallery image alt(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
