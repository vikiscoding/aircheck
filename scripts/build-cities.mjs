// Build city-pages/<slug>.html, the city list on the home page, and sitemap.xml
// from cities.json and the saved summaries in data/cities. No network.
// Run: node scripts/build-cities.mjs

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const stats = require("./city-stats.js");

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://aircheck.fyi";
const SUPPORT = "https://buy.stripe.com/9B6dR9cXu2Pm5Pyc174sE01";
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function esc(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function between(text, start, end) {
  const from = text.indexOf(start);
  const to = text.indexOf(end);
  if (from === -1 || to === -1 || to < from) throw new Error("missing marker " + start);
  return { before: text.slice(0, from + start.length), inner: text.slice(from + start.length, to), after: text.slice(to) };
}

function readableDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return d + " " + MONTHS_SHORT[m - 1] + " " + y;
}

function cell(value, suffix) {
  return value === null || value === undefined ? "<td>No data</td>" : "<td>" + esc(value + (suffix || "")) + "</td>";
}

export function loadInputs(root = ROOT) {
  const cities = JSON.parse(fs.readFileSync(path.join(root, "cities.json"), "utf8"));
  const records = cities.map((city) =>
    JSON.parse(fs.readFileSync(path.join(root, "data", "cities", city.slug + ".json"), "utf8")));
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  return { cities, records, index };
}

export function cityPage(record, records, index) {
  const name = record.name;
  const place = name + ", " + record.country;
  const readingBlock = between(index, "<!-- reading:start", "<!-- reading:end -->").inner
    .replace(/^[^>]*-->\n/, "").replace(/\s+$/, "\n");
  const sentences = stats.citySentences(name, record.summary);
  const fromYear = record.from.slice(0, 4);
  const toYear = record.to.slice(0, 4);
  const title = name + " air quality, UV and heat: now and by month";
  const description = "Live US AQI, UV index and feels-like temperature for " + place +
    ", in one plain sentence. " + (sentences[0] || "");
  const url = SITE + "/" + record.slug;

  const rows = record.summary.months.map((row) =>
    "            <tr><th scope=\"row\">" + MONTHS_SHORT[row.month - 1] + "</th>" +
    cell(row.medianAqi) + cell(row.daysOver150Pct, "%") + cell(row.peakUv) +
    (row.feelsHighC === null ? "<td>No data</td>" : "<td>" + row.feelsHighC + "°C (" + row.feelsHighF + "°F)</td>") +
    "</tr>").join("\n");

  const others = records.filter((other) => other.slug !== record.slug).map((other) =>
    "        <li><a href=\"/" + other.slug + "\">" + esc(other.name + ", " + other.country) + "</a></li>").join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${url}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#0f6e6b">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="preconnect" href="https://geocoding-api.open-meteo.com" crossorigin>
  <link rel="preconnect" href="https://api.open-meteo.com" crossorigin>
  <link rel="preconnect" href="https://air-quality-api.open-meteo.com" crossorigin>
  <link rel="stylesheet" href="/style.css">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_US">
  <meta property="og:site_name" content="aircheck.fyi">
  <meta property="og:image" content="${SITE}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${SITE}/og-image.png">
</head>
<body>
  <a class="skip-link" href="#place-form">Skip to the place form</a>
  <header class="site-header">
    <a class="site-name" href="/"><span class="site-mark" aria-hidden="true"></span>aircheck.fyi</a>
    <a class="support-link" href="${SUPPORT}" rel="noopener noreferrer">Support this free tool</a>
  </header>
  <main data-place-id="${record.id}">
    <section class="hero" aria-labelledby="page-title">
      <p class="crumbs"><a href="/">aircheck.fyi</a> <span aria-hidden="true">›</span> ${esc(name)}</p>
      <h1 id="page-title">How it feels outside in ${esc(name)} right now</h1>
      <p class="lead">The live reading for ${esc(place)} loads below. Under it is the usual air, UV and heat for each month.</p>
${readingBlock}    </section>

    <section id="city-year" aria-labelledby="year-title">
      <h2 id="year-title">${esc(name)} through the year</h2>
      <ul class="city-facts">
${sentences.map((s) => "        <li>" + esc(s) + "</li>").join("\n")}
      </ul>
      <div class="table-wrap">
        <table class="month-table">
          <caption>Typical values by month in ${esc(name)}, ${fromYear}–${toYear}</caption>
          <thead>
            <tr><th scope="col">Month</th><th scope="col">Median US AQI</th><th scope="col">Days with an hour above 150</th><th scope="col">Typical UV peak</th><th scope="col">Typical feels-like high</th></tr>
          </thead>
          <tbody>
${rows}
          </tbody>
        </table>
      </div>
      <h3>Where these numbers come from</h3>
      <p>US AQI and UV index come from the Open-Meteo air-quality API (CAMS global), hour by hour. Feels-like highs come from the Open-Meteo historical weather API, day by day. Each value is the median across ${fromYear}–${toYear}, retrieved ${readableDate(record.retrieved)}. CAMS is a model on a grid tens of kilometres wide. It describes the wider city area, not one street, and it can differ from local monitoring stations. Its US AQI averages particles over a day, so a single hour is smoothed. For a health decision, check a local official source.</p>
    </section>

    <section id="other-cities" aria-labelledby="others-title">
      <h2 id="others-title">Other cities</h2>
      <ul class="city-list">
${others}
      </ul>
      <p class="note">Or <a href="/">check any place</a>.</p>
    </section>

    <section id="privacy" aria-labelledby="privacy-title">
      <h2 id="privacy-title">Privacy and support</h2>
      <p>No account. No history. No cookies. The sentence comes from a fixed table, not a model. If you use your location, the coordinates are used once and then discarded. aircheck.fyi has no ads and no trackers. If it helps, <a href="${SUPPORT}" rel="noopener noreferrer">support this free tool</a>.</p>
    </section>
  </main>
  <footer>
    <p><a class="support-link" href="${SUPPORT}" rel="noopener noreferrer">Support this free tool</a></p>
    <p class="attribution">Weather and air-quality data from <a href="https://open-meteo.com/" rel="noopener noreferrer">Open-Meteo</a> (CAMS global air quality). Not an official government source.</p>
    <p id="visit-count" class="visit-count">Visit count needs JavaScript.</p>
  </footer>
  <script src="/feel-lookup.js" defer></script>
  <script src="/app.js" defer></script>
</body>
</html>
`;
}

export function homeWithCities(index, records) {
  const parts = between(index, "<!-- cities:start (generated by scripts/build-cities.mjs) -->", "<!-- cities:end -->");
  const list = "\n      <ul class=\"city-list\">\n" + records.map((r) =>
    "        <li><a href=\"/" + r.slug + "\">" + esc(r.name + ", " + r.country) + "</a></li>").join("\n") +
    "\n      </ul>\n      ";
  return parts.before + list + parts.after;
}

export function sitemap(records) {
  const latest = records.map((r) => r.retrieved).sort().slice(-1)[0];
  const entry = (loc, lastmod, priority) =>
    "  <url>\n    <loc>" + loc + "</loc>\n    <lastmod>" + lastmod + "</lastmod>\n    <priority>" + priority + "</priority>\n  </url>";
  return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n" +
    [entry(SITE + "/", latest, "1.0")].concat(records.map((r) => entry(SITE + "/" + r.slug, r.retrieved, "0.8"))).join("\n") +
    "\n</urlset>\n";
}

export function buildAll(root = ROOT) {
  const { records, index } = loadInputs(root);
  const files = {};
  for (const record of records) files["city-pages/" + record.slug + ".html"] = cityPage(record, records, index);
  files["index.html"] = homeWithCities(index, records);
  files["sitemap.xml"] = sitemap(records);
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = buildAll();
  fs.mkdirSync(path.join(ROOT, "city-pages"), { recursive: true });
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(ROOT, name), text);
  console.log("wrote " + Object.keys(files).length + " files");
}
