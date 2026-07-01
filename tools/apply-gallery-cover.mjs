// apply-gallery-cover.mjs — roll the "Dark Cinematic" gallery-page treatment
// (piloted on graduation.html) out to the remaining individual gallery pages.
//
// For each root <slug>.html it applies four transforms, asserting each anchor is
// found exactly once so a partial/silent edit can't happen:
//   1. add  <link rel="stylesheet" href="/base.css" />  before gallery_page.css
//   2. swap the Google Fonts href (Ramaraja+Roboto -> Fraunces+Inter)
//   3. swap the plain text brand for the aperture-mark brand
//   4. add the full-bleed <section class="gp_cover"> with overlaid title.
//      "rich" pages already carry a <section class="gallery_header"><h1> — the
//      cover REPLACES it (reusing the same id) so there is no duplicate <h1>;
//      "simple" pages get the cover inserted before .photo_container.
// It also drops the cover image's duplicate tile from the masonry/top-grid below.
//
// Run from the repo root:  node tools/apply-gallery-cover.mjs
// Mirrors (<slug>/index.html) are regenerated separately by sync-mirrors.mjs.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const OLD_CSS = `  <link rel="stylesheet" href="/gallery_page.css" />`;
const NEW_CSS = `  <link rel="stylesheet" href="/base.css" />\n  <link rel="stylesheet" href="/gallery_page.css" />`;

const OLD_FONTS = `    href="https://fonts.googleapis.com/css2?family=Ramaraja&family=Roboto:ital,wght@0,100..900;1,100..900&display=swap"`;
const NEW_FONTS = `    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300&family=Inter:wght@400;500;600&display=swap"`;

const OLD_BRAND = `      <a class="brand" href="/">Rowan Potts Photography</a>`;
const NEW_BRAND = [
  `      <a class="brand" href="/" aria-label="Rowan Potts Photography home">`,
  `        <svg class="brand_mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">`,
  `          <circle cx="12" cy="12" r="10"></circle>`,
  `          <line x1="14.31" y1="8" x2="20.05" y2="17.94"></line>`,
  `          <line x1="9.69" y1="8" x2="21.17" y2="8"></line>`,
  `          <line x1="7.38" y1="12" x2="13.12" y2="2.06"></line>`,
  `          <line x1="9.69" y1="16" x2="3.95" y2="6.06"></line>`,
  `          <line x1="14.31" y1="16" x2="2.83" y2="16"></line>`,
  `          <line x1="16.62" y1="12" x2="10.88" y2="21.94"></line>`,
  `        </svg>`,
  `        <span class="brand_name">Rowan Potts</span>`,
  `      </a>`,
].join("\n");

const PAGES = [
  { file: "baseball.html", rich: false, titleId: "baseball_title", cover: "/img/baseball/crop-1-of-1", alt: "Baseball player during game coverage", title: "Baseball", meta: "Game action &amp; editorial sports coverage &middot; JMU Athletics" },
  { file: "basketball.html", rich: false, titleId: "basketball_title", cover: "/img/basketball/wbb-16", alt: "JMU basketball player going up for a layup", title: "Basketball", meta: "Court action &amp; editorial sports coverage &middot; JMU Athletics" },
  { file: "football-app-state.html", rich: true, titleId: "app_state_title", cover: "/img/football/app-state/top/app-state-41", alt: "JMU football player during an Appalachian State game", title: "JMU vs. App State", meta: "Game action &amp; sideline moments &middot; James Madison University" },
  { file: "football-troy.html", rich: true, titleId: "troy_title", cover: "/img/football/troy/top/jmutroy-50", alt: "JMU football player during a Troy game", title: "JMU vs. Troy", meta: "Game action &amp; sideline moments &middot; James Madison University" },
  { file: "myers-farm.html", rich: false, titleId: "myers_farm_title", cover: "/img/myers-farm/myfarm-3", alt: "Highland cow at Myers Farm", title: "Myers Farm", meta: "Outdoor, farm &amp; documentary-style images" },
  { file: "softball.html", rich: false, titleId: "softball_title", cover: "/img/softball/wsoftballlousiana/rpp-wsoftball-louisiana-13", alt: "JMU softball player during game coverage", title: "Softball", meta: "Game action &amp; athlete portraits &middot; JMU Athletics" },
  { file: "portrait.html", rich: false, titleId: "portrait_title", cover: "/img/portrait/resized-sunset-silhouette-1", alt: "Silhouette portrait at sunset", title: "Portrait", meta: "Outdoor, lifestyle &amp; creative sessions &middot; Harrisonburg, VA" },
  { file: "downtown-gallery.html", rich: false, titleId: "downtown_title", cover: "/img/downtown-gallary/dthp-15", alt: "Downtown Harrisonburg street scene", title: "Downtown Harrisonburg", meta: "Street scenes &amp; local details &middot; Harrisonburg, VA" },
  { file: "other.html", rich: false, titleId: "other_title", cover: "/img/other/resized-jmu-students-7", alt: "JMU students gathered outdoors", title: "Assorted", meta: "Campus life, events &amp; creative editorial work" },
  { file: "featured-works.html", rich: true, titleId: "featured_works_title", cover: "/img/bestcomp/football-reedit-5", alt: "Close-up portrait of a JMU football player", title: "Featured Works", meta: "Sports, portraits, graduation &amp; landscape &mdash; a cross-section" },
];

function replaceOnce(content, oldStr, newStr, label, file) {
  const count = content.split(oldStr).length - 1;
  if (count !== 1) throw new Error(`${file}: expected exactly 1 "${label}", found ${count}`);
  return content.replace(oldStr, newStr);
}

function coverSrcset(cover) {
  const widths = [960, 1600, 2400].filter((w) =>
    fs.existsSync(path.join(ROOT, cover.replace(/^\//, "") + `-${w}.webp`))
  );
  if (!widths.length) throw new Error(`no webp widths found for cover ${cover}`);
  return widths.map((w) => `${cover}-${w}.webp ${w}w`).join(", ");
}

function coverSection(p) {
  const srcset = coverSrcset(p.cover);
  return [
    `      <section class="gp_cover" aria-labelledby="${p.titleId}">`,
    `        <picture><source type="image/webp" srcset="${srcset}" sizes="100vw" /><img class="gp_cover_img" src="${p.cover}-1600.jpg" alt="${p.alt}" loading="eager" fetchpriority="high" decoding="async" /></picture>`,
    `        <div class="gp_cover_cap">`,
    `          <a class="gp_back" href="/galleries">&larr; All galleries</a>`,
    `          <h1 id="${p.titleId}">${p.title}</h1>`,
    `          <p class="gp_meta">${p.meta}</p>`,
    `        </div>`,
    `      </section>`,
  ].join("\n");
}

function dropDuplicateTile(content, cover) {
  // remove the masonry/top-grid <picture> line that repeats the cover image
  const before = content.split("\n");
  const after = before.filter(
    (line) => !(line.includes('class="image"') && line.includes(`src="${cover}-1600.jpg"`))
  );
  return { content: after.join("\n"), removed: before.length - after.length };
}

const nl = (s, eol) => s.split("\n").join(eol); // match the file's line endings

let changed = 0;
for (const p of PAGES) {
  const fp = path.join(ROOT, p.file);
  let c = fs.readFileSync(fp, "utf8");
  const EOL = c.includes("\r\n") ? "\r\n" : "\n";

  if (c.includes('href="/base.css"') || c.includes("gp_cover")) {
    console.log(`skip  ${p.file} (already converted)`);
    continue;
  }

  c = replaceOnce(c, OLD_CSS, nl(NEW_CSS, EOL), "gallery_page.css link", p.file);
  c = replaceOnce(c, OLD_FONTS, NEW_FONTS, "fonts href", p.file);
  c = replaceOnce(c, OLD_BRAND, nl(NEW_BRAND, EOL), "brand link", p.file);

  const cover = nl(coverSection(p), EOL);
  if (p.rich) {
    const oldHeader = nl(
      `      <section class="gallery_header" aria-labelledby="${p.titleId}">\n` +
        `        <h1 id="${p.titleId}">${p.title}</h1>\n` +
        `      </section>`,
      EOL
    );
    c = replaceOnce(c, oldHeader, cover, "gallery_header section", p.file);
  } else {
    const anchor = nl(`    <main>\n      <section class="photo_container"`, EOL);
    const replacement = nl(`    <main>\n`, EOL) + cover + nl(`\n\n      <section class="photo_container"`, EOL);
    c = replaceOnce(c, anchor, replacement, "main/photo_container anchor", p.file);
  }

  const dedup = dropDuplicateTile(c, p.cover);
  c = dedup.content;

  fs.writeFileSync(fp, c);
  changed++;
  console.log(`ok    ${p.file}  (dup tiles removed: ${dedup.removed})`);
}

console.log(`\nDone. ${changed}/${PAGES.length} pages converted. Run: node tools/sync-mirrors.mjs`);
