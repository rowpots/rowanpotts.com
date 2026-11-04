// One-off: moves every root page from Dark Cinematic to the clean white redesign.
//
// Replaces the shared header + footer, swaps the Google Fonts URL, turns gallery
// cover heroes into a plain title (moving the cover photo into the masonry so it is
// not lost), restyles the hub pages, and rebuilds the homepage, Services, Contact,
// About and 404 bodies. EOL-aware and idempotent.
//
//   node tools/apply-clean-chrome.mjs            # rewrite pages
//   node tools/rewrite-html.mjs                  # <img> -> <picture> for moved covers
//   node tools/apply-clean-chrome.mjs --finish   # first gallery photo becomes the LCP
//   node tools/sync-mirrors.mjs                  # mirror

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const manifest = JSON.parse(await fs.readFile(path.join(HERE, "image-manifest.json"), "utf8"));
const byJpg = Object.fromEntries(Object.values(manifest).map((e) => [e.jpg, e]));
const SKIP = new Set(["selected-work.html", "oldindex.html", "test.html"]);
const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&display=swap";
const finish = process.argv.includes("--finish");

const IG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/></svg>`;
const LI = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M4 9h3.4v11H4zM5.7 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM10 9h3.3v1.5c.5-.9 1.7-1.8 3.4-1.8 3.6 0 4.3 2.3 4.3 5.4V20h-3.5v-5.2c0-1.3 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8V20H10z"/></svg>`;

const navLink = (href, label, active) =>
  `<a href="${href}"${active === label ? ' aria-current="page"' : ""}>${label}</a>`;

const header = (active) =>
  [
    `<header class="top">`,
    `      <a class="mark" href="/" aria-label="Rowan Potts Photography home">Rowan Potts</a>`,
    `      <nav aria-label="Primary navigation">`,
    `        ${navLink("/galleries", "Work", active)}`,
    `        ${navLink("/services", "Services", active)}`,
    `        ${navLink("/about", "About", active)}`,
    `        ${navLink("/contact", "Contact", active)}`,
    `        <span class="social">`,
    `          <a href="https://www.instagram.com/pottsey.photos/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">${IG}</a>`,
    `          <a href="https://www.linkedin.com/in/rowan-potts-7a2a72305/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">${LI}</a>`,
    `        </span>`,
    `      </nav>`,
    `    </header>`,
  ].join("\n");

const footer = [
  `<footer class="foot">`,
  `      <span>Rowan Potts Photography</span>`,
  `      <span>Harrisonburg and Northern Virginia</span>`,
  `      <a href="mailto:rowanpotts2005@gmail.com">rowanpotts2005@gmail.com</a>`,
  `    </footer>`,
].join("\n");

const book = (text, label = "Book a shoot") =>
  `<section class="book"><p>${text}</p><a class="btn" href="/contact">${label}</a></section>`;

function picture(jpg, alt, { sizes, eager = false }) {
  const e = byJpg[jpg];
  if (!e) throw new Error(`no manifest entry for ${jpg}`);
  const srcset = e.webp.map((w) => `${w.src} ${w.w}w`).join(", ");
  const load = eager ? `loading="eager" fetchpriority="high"` : `loading="lazy"`;
  return `<picture><source type="image/webp" srcset="${srcset}" sizes="${sizes}" /><img src="${e.jpg}" alt="${alt}" width="${e.width}" height="${e.height}" ${load} decoding="async" /></picture>`;
}

// ---- homepage wall: running order chosen by the owner, 2026-11-04 ----
const WALL = [
  ["/img/bestcomp/football-reedit-5-1600.jpg", "/football", "JMU football player in face paint"],
  ["/img/football/georgia-southern/top/rpp-gs-football-14-1600.jpg", "/football-georgia-southern", "JMU football players celebrating under the lights"],
  ["/img/pitbull/pitbull-42-of-78-1600.jpg", "/concerts", "Pitbull on stage between smoke cannons"],
  ["/img/bestcomp/troy-reedit-3-1600.jpg", "/football-troy", "JMU football player in front of the marching band"],
  ["/img/bestcomp/basketball-reedit-1-1600.jpg", "/basketball", "JMU basketball player in smoke and blue light"],
  ["/img/bestcomp/elizabeth-fowler-graduation-26-of-80-1-1600.jpg", "/graduation", "Graduation portrait at a stone archway"],
  ["/img/bestcomp/troy-reedit-1-1600.jpg", "/football-troy", "JMU football players at night"],
  ["/img/football/wagner/top/rpp-wagner-football-42-1600.jpg", "/football-wagner", "JMU ball carrier stiff-arming a Wagner defender"],
  ["/img/football/wagner/top/rpp-wagner-football-21-1600.jpg", "/football-wagner", "A tackle in front of a packed JMU crowd"],
  ["/img/football/georgia-southern/top/rpp-gs-football-36-1600.jpg", "/football-georgia-southern", "Georgia Southern player hurdling a diving JMU defender"],
];
const WALL_SIZES = "(min-width: 760px) 50vw, 100vw";

function homeMain() {
  // keep the running order, always add to the shorter column so both end level
  const cols = [[], []];
  const heights = [0, 0];
  WALL.forEach(([jpg, href, alt], i) => {
    const e = byJpg[jpg];
    if (!e) throw new Error(`no manifest entry for ${jpg}`);
    const k = heights[0] <= heights[1] ? 0 : 1;
    cols[k].push(`<a href="${href}">${picture(jpg, alt, { sizes: WALL_SIZES, eager: i === 0 })}</a>`);
    heights[k] += e.height / e.width;
  });
  const html = cols.map((c) => `<div class="wall_col">\n${c.join("\n")}\n</div>`).join("\n");
  return `<main>
      <h1 class="sr_only">Rowan Potts Photography</h1>
      <div class="wall">
${html}
      </div>
      ${book("I&rsquo;m Rowan Potts, a photographer for <i>The Breeze</i> at JMU. I also shoot portraits, graduations and events in Harrisonburg and Northern Virginia.")}
    </main>`;
}

function homePreload() {
  const e = byJpg[WALL[0][0]];
  return `<link rel="preload" as="image" type="image/webp" fetchpriority="high" imagesrcset="${e.webp.map((w) => `${w.src} ${w.w}w`).join(", ")}" imagesizes="${WALL_SIZES}" />`;
}

// ---- services: confirmed by the owner 2026-11-04 ----
const SERVICES = [
  ["/img/bestcomp/elizabeth-fowler-graduation-8-of-80-1-1600.jpg", "Graduation", "$100", "Cap-and-gown and campus portraits around your campus.", ["Starting at a 1-hour session, multiple campus spots", "15+ hand-edited high-resolution photos", "Delivered within 1 week"], "Book graduation", "50% 45%"],
  ["/img/portrait/liz-portrait-6-1600.jpg", "Portraits", "$75", "Couples, families and personal branding.", ["Starting at a 30-minute session, one location", "Delivered within 1 week"], "Book portraits", "50% 52%"],
  ["/img/bestcomp/football-reedit-5-1600.jpg", "Sports and editorial", "$150", "Game-day coverage, events and press assignments.", ["Event or game coverage", "Gallery of hand-edited high-resolution photos", "1 to 2 week turnaround"], "Request coverage", "50% 30%"],
];

function servicesMain() {
  const rows = SERVICES.map(
    ([jpg, name, price, about, list, cta, pos], i) => `<article style="--pos:${pos}">
          <div class="svc_img">${picture(jpg, `${name} photograph by Rowan Potts`, { sizes: "(min-width: 760px) 55vw, 100vw", eager: i === 0 })}</div>
          <div class="svc_txt">
            <h2>${name}</h2>
            <p class="price">From ${price}</p>
            <p>${about}</p>
            <ul>${list.map((x) => `<li>${x}</li>`).join("")}</ul>
            <a class="btn" href="/contact">${cta}</a>
          </div>
        </article>`,
  ).join("\n        ");
  return `<main>
      <div class="page_head"><h1 id="services_title">Services</h1></div>
      <div class="svc">
        ${rows}
      </div>
      ${book("Something else in mind? Tell me about it and I&rsquo;ll put together a quote.", "Get in touch")}
    </main>`;
}

const contactMain = `<main class="contact">
      <div class="c_left">
        <h1 id="contact_title">Contact</h1>
        <p class="c_mail"><a href="mailto:rowanpotts2005@gmail.com">rowanpotts2005@gmail.com</a></p>
        <p>Based in Harrisonburg and Northern Virginia. I usually reply within a day or two.</p>
        <p>Tell me your date or a rough timeframe, the location, and the type of shoot.</p>
        <p class="c_links"><a href="https://www.instagram.com/pottsey.photos/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.linkedin.com/in/rowan-potts-7a2a72305/" target="_blank" rel="noopener noreferrer">LinkedIn</a></p>
      </div>
      <form class="c_form" action="https://formspree.io/f/mbdpgqay" method="post">
        <div class="two">
          <label for="cf_first">First name<input id="cf_first" type="text" name="first" autocomplete="given-name" autocapitalize="words" required /></label>
          <label for="cf_last">Last name<input id="cf_last" type="text" name="last" autocomplete="family-name" autocapitalize="words" required /></label>
        </div>
        <label for="cf_email">Email<input id="cf_email" type="email" name="email" autocomplete="email" autocapitalize="off" required /></label>
        <label for="cf_type">Shoot type<select id="cf_type" name="shoot_type" required>
          <option value="" disabled selected>Choose one</option>
          <option>Portraits</option>
          <option>Graduation</option>
          <option>Sports</option>
          <option>Event</option>
          <option>Editorial</option>
          <option>Other</option>
        </select></label>
        <label for="cf_message">Message<textarea id="cf_message" name="message" rows="6" required></textarea></label>
        <button class="btn" type="submit">Send message</button>
      </form>
    </main>`;

const aboutMain = `<main class="about">
      <div class="page_head"><h1>About</h1></div>
      <div class="about_body">
        <div class="about_copy">
          <p class="about_lead">I&rsquo;m Rowan Potts, a photographer based in Harrisonburg, Virginia.</p>
          <p>I shoot JMU sports, concerts and events, and my work has appeared in <i>The Breeze</i>, JMU&rsquo;s award-winning student newspaper.</p>
          <p>I also photograph portraits and graduations around Harrisonburg and Northern Virginia.</p>
          <p>Off the sideline, I&rsquo;m a computer science student at James Madison University.</p>
          <a class="btn" href="/contact">Book a shoot</a>
        </div>
        <div class="about_img">${picture("/img/photos/1725295094297-400.jpg", "Rowan Potts", { sizes: "(min-width: 760px) 400px, 100vw" })}</div>
      </div>
    </main>`;

const notFoundMain = `<main class="nf">
      <h1>Page not found</h1>
      <p>The page you&rsquo;re looking for isn&rsquo;t here. It may have moved, or the link might be off.</p>
      <a class="btn" href="/galleries">See the work</a>
    </main>`;

const GALLERY_BOOK = {
  "graduation.html": "Graduation sessions start at $100, with 15+ edited photos delivered within a week.",
  "portrait.html": "Portrait sessions start at $75, delivered within a week.",
};
const SPORTS_BOOK = "Sports and event coverage starts at $150.";
const OTHER_BOOK = "Need a photographer? Tell me what you&rsquo;re shooting.";
const NOT_SPORTS = new Set(["downtown-gallery.html", "other.html", "myers-farm.html", "featured-works.html"]);

function must(html, re, what, name) {
  if (!re.test(html)) throw new Error(`${name}: ${what} not found`);
}

function convert(name, source) {
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  let html = source.replace(/\r\n/g, "\n");
  if (html.includes('class="top"')) return source; // already converted

  const isGallery = html.includes('href="/gallery_page.css"');
  const isHub = html.includes('href="/gallery_list.css"');
  const active = { "services.html": "Services", "about.html": "About", "contact.html": "Contact" }[name] ?? (isGallery || isHub ? "Work" : "");

  must(html, /<header class="topbar">[\s\S]*?<\/header>/, "header", name);
  must(html, /<footer class="(?:footer|site_footer)">[\s\S]*?<\/footer>/, "footer", name);
  html = html.replace(/<header class="topbar">[\s\S]*?<\/header>/, () => header(active));
  html = html.replace(/<footer class="(?:footer|site_footer)">[\s\S]*?<\/footer>/, () => footer);
  html = html.replace(/https:\/\/fonts\.googleapis\.com\/css2\?family=[^"]+/g, () => FONT_URL);

  if (isGallery) {
    const cover = html.match(/<section class="gp_cover"[\s\S]*?<\/section>/);
    if (!cover) throw new Error(`${name}: no cover`);
    const img = cover[0].match(/<img class="gp_cover_img" src="([^"]+)" alt="([^"]*)"/);
    const h1 = cover[0].match(/<h1 id="([^"]+)">([^<]+)<\/h1>/);
    if (!img || !h1) throw new Error(`${name}: cover parts`);
    const head = `<div class="page_head"><h1 id="${h1[1]}">${h1[2]}</h1><a href="/galleries">All work</a></div>`;
    html = html.replace(cover[0], () => head);
    // the cover is not repeated in the grid, so it has to move there or it is lost
    const entry = byJpg[img[1]];
    if (!entry) throw new Error(`${name}: cover not in manifest: ${img[1]}`);
    if (!html.includes(`src="${img[1]}"`)) {
      must(html, /<div class="gallery_masonry">/, "masonry", name);
      html = html.replace(/<div class="gallery_masonry">/, () => `<div class="gallery_masonry">\n          <img class="image" src="${entry.src}" alt="${img[2]}" />`);
    }
    const line = GALLERY_BOOK[name] ?? (NOT_SPORTS.has(name) ? OTHER_BOOK : SPORTS_BOOK);
    html = html.replace("</main>", () => `  ${book(line)}\n    </main>`);
  }

  if (isHub) {
    html = html.replace(
      /<section class="g_hero"[^>]*>\s*<div class="g_hero_inner">\s*<h1 id="([^"]+)">([^<]+)<\/h1>\s*<\/div>\s*<\/section>/,
      (_, id, title) => `<div class="page_head tight"><h1 id="${id}">${title === "Galleries" ? "Work" : title}</h1></div>`,
    );
    must(html, /class="page_head tight"/, "hub heading", name);
    html = html.replace(/<span class="r_view">[^<]*<\/span>/g, "");
    html = html.replace(/(<a class="r_item"[\s\S]*?<\/a>)/g, (row) => row.replace('sizes="100vw"', 'sizes="(min-width: 1080px) 1016px, 100vw"'));
  }

  if (name === "index.html") {
    must(html, /<main>[\s\S]*<\/main>/, "main", name);
    html = html.replace(/<main>[\s\S]*<\/main>/, () => homeMain());
    html = html.replace(/<!-- must stay pointed[\s\S]*?-->/, () => `<!-- Keep pointed at the first photo in the wall (the LCP). fetchpriority="high" belongs\n       here too: the preload scanner starts this request before the <img> is parsed. -->`);
    html = html.replace(/<link rel="preload" as="image"[^>]*>/, () => homePreload());
    html = html.replace(/\s*<script>\s*\/\/ Hero frames[\s\S]*?<\/script>/, "");
  }
  if (name === "services.html") {
    html = html.replace(/<main>[\s\S]*<\/main>/, () => servicesMain());
  }
  if (name === "contact.html") {
    const a = html.indexOf('<div class="c_bg"');
    const b = html.indexOf('<div class="page"');
    if (a < 0 || b < a) throw new Error("contact: collage bounds");
    html = html.slice(0, a) + html.slice(b);
    html = html.replace(/<main>[\s\S]*<\/main>/, () => contactMain);
  }
  if (name === "about.html") {
    html = html.replace(/<main class="about_layout">[\s\S]*<\/main>/, () => aboutMain);
    html = html.replace(/([ \t]*)<link[^>]*href="\/about\.css"[^>]*>/, (_, sp) => `${sp}<link rel="stylesheet" href="/base.css" />\n${sp}<link rel="stylesheet" href="/about.css" />`);
    html = html.replaceAll("About Rowan Potts | Photographer and Computer Science Student", "About Rowan Potts | Harrisonburg Photographer");
    must(html, /href="\/base\.css"/, "base.css link", name);
  }
  if (name === "404.html") {
    html = html.replace(/\s*<style>[\s\S]*?<\/style>/, "");
    html = html.replace(/<main>[\s\S]*<\/main>/, () => notFoundMain);
  }

  return eol === "\r\n" ? html.replace(/\n/g, "\r\n") : html;
}

// the cover moved into the masonry, so the first gallery photo is now the LCP
function promoteFirst(source) {
  if (!source.includes('href="/gallery_page.css"')) return source;
  const at = source.indexOf('<div class="gallery_masonry">');
  if (at < 0) return source;
  const next = source.indexOf('loading="lazy"', at);
  const eager = source.indexOf('fetchpriority="high"', at);
  if (next < 0 || (eager >= 0 && eager < next)) return source;
  return source.slice(0, next) + 'loading="eager" fetchpriority="high"' + source.slice(next + 'loading="lazy"'.length);
}

const files = (await fs.readdir(ROOT, { withFileTypes: true }))
  .filter((e) => e.isFile() && e.name.endsWith(".html") && !SKIP.has(e.name))
  .map((e) => e.name);

let changed = 0;
for (const name of files) {
  const file = path.join(ROOT, name);
  const before = await fs.readFile(file, "utf8");
  const after = finish ? promoteFirst(before) : convert(name, before);
  if (after !== before) {
    await fs.writeFile(file, after);
    changed++;
  }
}
console.log(`${finish ? "promoted" : "converted"} ${changed} of ${files.length} pages`);
