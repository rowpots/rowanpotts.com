// SEO metadata injector for rowanpotts.com.
//
// Injects a managed <head> block (canonical, Open Graph, Twitter card, and
// JSON-LD structured data) into each root page, and regenerates sitemap.xml +
// robots.txt from the same page list. Idempotent via <!-- seo:auto --> markers.
// Edits only root *.html; run sync-mirrors.mjs afterwards.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

const BASE = "https://rowanpotts.com";
const BRAND = "Rowan Potts Photography";
const HERO = "/img/landing-photo/elizabeth-fowler-graduation-26-of-80-50-1600.jpg";
const SAMEAS = [
  "https://www.instagram.com/pottsey.photos/",
  "https://www.linkedin.com/in/rowan-potts-7a2a72305",
];
const AREA = ["Harrisonburg, Virginia", "James Madison University", "Shenandoah Valley"];

// type: home | galleries | category | gallery | about | contact
// image: optional og:image override (defaults to the page's first /img JPG)
const PAGES = [
  { file: "index.html", path: "/", type: "home", image: HERO,
    title: "Rowan Potts Photography | Harrisonburg Portrait, Sports & Event Photographer",
    desc: "Harrisonburg, VA photographer Rowan Potts — portrait, graduation, sports, and event photography around James Madison University and the Shenandoah Valley. Book a shoot." },
  { file: "gallery_list.html", path: "/galleries", type: "galleries",
    title: "Galleries | Rowan Potts Photography",
    desc: "Photography galleries by Rowan Potts — graduation portraits, JMU sports, events and more in Harrisonburg and the Shenandoah Valley." },
  { file: "about.html", path: "/about", type: "about", image: HERO,
    title: "About | Rowan Potts Photography",
    desc: "Meet Rowan Potts, a Harrisonburg photographer shooting portraits, sports, and events, with editorial work for JMU's award-winning paper, The Breeze." },
  { file: "contact.html", path: "/contact", type: "contact", image: HERO,
    title: "Contact & Booking | Rowan Potts Photography",
    desc: "Book Rowan Potts Photography for portraits, graduation, sports, or events in Harrisonburg, at JMU, and across the Shenandoah Valley. Send an inquiry." },
  { file: "football.html", path: "/football", type: "category",
    title: "JMU Football Photography | Rowan Potts Photography",
    desc: "JMU football photography by Rowan Potts — game-day action from James Madison University in Harrisonburg, VA." },
  { file: "graduation.html", path: "/graduation", type: "gallery",
    title: "Graduation Portraits | Rowan Potts Photography",
    desc: "Graduation portrait photography by Rowan Potts around James Madison University and the Shenandoah Valley." },
  { file: "football-troy.html", path: "/football-troy", type: "gallery",
    title: "JMU vs. Troy Football | Rowan Potts Photography",
    desc: "JMU vs. Troy football photography by Rowan Potts — game-day action at James Madison University." },
  { file: "football-app-state.html", path: "/football-app-state", type: "gallery",
    title: "JMU vs. App State Football | Rowan Potts Photography",
    desc: "JMU vs. Appalachian State football photography by Rowan Potts at James Madison University." },
  { file: "baseball.html", path: "/baseball", type: "gallery",
    title: "JMU Baseball | Rowan Potts Photography",
    desc: "JMU baseball photography by Rowan Potts in Harrisonburg, VA." },
  { file: "basketball.html", path: "/basketball", type: "gallery",
    title: "JMU Women's Basketball | Rowan Potts Photography",
    desc: "JMU women's basketball photography by Rowan Potts in Harrisonburg, VA." },
  { file: "softball.html", path: "/softball", type: "gallery",
    title: "JMU Softball | Rowan Potts Photography",
    desc: "JMU softball photography by Rowan Potts in Harrisonburg, VA." },
  { file: "portrait.html", path: "/portrait", type: "gallery",
    title: "Portraits | Rowan Potts Photography",
    desc: "Portrait photography by Rowan Potts — senior, graduation, and personal portraits around Harrisonburg and JMU." },
  { file: "myers-farm.html", path: "/myers-farm", type: "gallery",
    title: "Myers Farm | Rowan Potts Photography",
    desc: "Event and outdoor photography at Myers Farm by Rowan Potts in the Shenandoah Valley." },
  { file: "downtown-gallery.html", path: "/downtown-gallery", type: "gallery",
    title: "Downtown Harrisonburg | Rowan Potts Photography",
    desc: "Downtown Harrisonburg street and architecture photography by Rowan Potts." },
  { file: "other.html", path: "/other", type: "gallery",
    title: "Assorted Work | Rowan Potts Photography",
    desc: "Assorted event and student-life photography by Rowan Potts around James Madison University and Harrisonburg." },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const businessNode = {
  "@type": ["ProfessionalService", "LocalBusiness"],
  "@id": `${BASE}/#business`,
  name: BRAND,
  url: `${BASE}/`,
  image: `${BASE}${HERO}`,
  description: "Portrait, sports, and event photography in Harrisonburg, VA and the Shenandoah Valley.",
  priceRange: "$$",
  areaServed: AREA.map((name) => ({ "@type": "Place", name })),
  founder: { "@type": "Person", name: "Rowan Potts" },
  address: { "@type": "PostalAddress", addressLocality: "Harrisonburg", addressRegion: "VA", addressCountry: "US" },
  sameAs: SAMEAS,
};

const personNode = {
  "@type": "Person",
  name: "Rowan Potts",
  url: `${BASE}/about`,
  jobTitle: "Photographer",
  worksFor: { "@type": "NewsMediaOrganization", name: "The Breeze (James Madison University)" },
  sameAs: SAMEAS,
};

function breadcrumb(cfg) {
  const items = [{ name: "Home", path: "/" }];
  if (cfg.type === "gallery" || cfg.type === "category") items.push({ name: "Galleries", path: "/galleries" });
  items.push({ name: cfg.title.split("|")[0].trim(), path: cfg.path });
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${BASE}${it.path === "/" ? "/" : it.path}`,
    })),
  };
}

function jsonLd(cfg, image) {
  const graph = [];
  if (cfg.type === "home") {
    graph.push(businessNode);
    graph.push({
      "@type": "WebSite",
      "@id": `${BASE}/#website`,
      url: `${BASE}/`,
      name: BRAND,
      publisher: { "@id": `${BASE}/#business` },
    });
  } else if (cfg.type === "about") {
    graph.push(personNode, businessNode);
  } else if (cfg.type === "contact") {
    graph.push({ "@type": "ContactPage", url: `${BASE}${cfg.path}`, name: cfg.title, about: { "@id": `${BASE}/#business` } });
    graph.push(businessNode, breadcrumb(cfg));
  } else if (cfg.type === "gallery") {
    graph.push({
      "@type": "ImageGallery",
      name: cfg.title.split("|")[0].trim(),
      description: cfg.desc,
      url: `${BASE}${cfg.path}`,
      image: `${BASE}${image}`,
      author: { "@type": "Person", name: "Rowan Potts" },
      isPartOf: { "@id": `${BASE}/#business` },
    });
    graph.push(breadcrumb(cfg));
  } else {
    // galleries index / category
    graph.push({ "@type": "CollectionPage", name: cfg.title.split("|")[0].trim(), description: cfg.desc, url: `${BASE}${cfg.path}`, isPartOf: { "@id": `${BASE}/#business` } });
    graph.push(breadcrumb(cfg));
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
}

function firstImage(html) {
  const m = html.match(/<img[^>]+src="(\/img\/[^"]+\.jpg)"/i);
  return m ? m[1] : HERO;
}

function metaBlock(cfg, html) {
  const image = cfg.image || firstImage(html);
  const url = `${BASE}${cfg.path}`;
  const absImg = `${BASE}${image}`;
  const lines = [
    `  <!-- seo:auto start -->`,
    `  <link rel="canonical" href="${url}" />`,
    `  <meta name="description" content="${esc(cfg.desc)}" />`,
    `  <meta name="author" content="Rowan Potts" />`,
    `  <meta property="og:type" content="website" />`,
    `  <meta property="og:site_name" content="${esc(BRAND)}" />`,
    `  <meta property="og:title" content="${esc(cfg.title)}" />`,
    `  <meta property="og:description" content="${esc(cfg.desc)}" />`,
    `  <meta property="og:url" content="${url}" />`,
    `  <meta property="og:image" content="${absImg}" />`,
    `  <meta name="twitter:card" content="summary_large_image" />`,
    `  <meta name="twitter:title" content="${esc(cfg.title)}" />`,
    `  <meta name="twitter:description" content="${esc(cfg.desc)}" />`,
    `  <meta name="twitter:image" content="${absImg}" />`,
    `  <script type="application/ld+json">${jsonLd(cfg, image)}</script>`,
    `  <!-- seo:auto end -->`,
  ];
  return lines.join("\n");
}

async function writeSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = PAGES.map(
    (p) => `  <url><loc>${BASE}${p.path}</loc><lastmod>${today}</lastmod>` +
      `<changefreq>${p.type === "home" ? "weekly" : "monthly"}</changefreq>` +
      `<priority>${p.type === "home" ? "1.0" : p.type === "gallery" ? "0.7" : "0.8"}</priority></url>`
  ).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  await fs.writeFile(path.join(ROOT, "sitemap.xml"), xml);
}

async function writeRobots() {
  const txt = `User-agent: *\nAllow: /\nDisallow: /masters/\n\nSitemap: ${BASE}/sitemap.xml\n`;
  await fs.writeFile(path.join(ROOT, "robots.txt"), txt);
}

async function main() {
  let touched = 0;
  for (const cfg of PAGES) {
    const file = path.join(ROOT, cfg.file);
    let html;
    try {
      html = await fs.readFile(file, "utf8");
    } catch {
      console.warn(`  ! missing page, skipped: ${cfg.file}`);
      continue;
    }
    // strip previous managed block + stray description/keywords metas
    html = html.replace(/\n?[ \t]*<!-- seo:auto start -->[\s\S]*?<!-- seo:auto end -->/g, "");
    html = html.replace(/[ \t]*<meta name="description"[^>]*>\s*\n/gi, "");
    html = html.replace(/[ \t]*<meta name="keywords"[^>]*>\s*\n/gi, "");
    // canonical title + fresh block (function replacements so literal $ in
    // JSON-LD, e.g. priceRange "$$", is not treated as a replacement pattern)
    html = html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${esc(cfg.title)}</title>`);
    const block = metaBlock(cfg, html);
    html = html.replace(/<\/title>/i, () => `</title>\n${block}`);
    await fs.writeFile(file, html);
    touched++;
  }
  await writeSitemap();
  await writeRobots();
  console.log(`Injected SEO meta into ${touched} page(s); wrote sitemap.xml + robots.txt.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
