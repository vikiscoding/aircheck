// Fetch three years of Open-Meteo history for each city in cities.json and save one summary per city.
// Run by hand when the history should move forward: node scripts/refresh-cities.mjs
// Then rebuild the pages: node scripts/build-cities.mjs
// This is the only step that touches the network. The page build reads the saved summaries.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const stats = require("./city-stats.js");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const START = "2023-01-01";
const END = "2025-12-31";
const OUT = path.join(ROOT, "data", "cities");

async function getJson(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data && data.error !== true) return data;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
  }
  throw new Error("request failed: " + url);
}

const cities = JSON.parse(fs.readFileSync(path.join(ROOT, "cities.json"), "utf8"));
fs.mkdirSync(OUT, { recursive: true });

for (const city of cities) {
  const place = await getJson("https://geocoding-api.open-meteo.com/v1/get?id=" + city.id);
  const where = "latitude=" + place.latitude + "&longitude=" + place.longitude;
  const airUrl = "https://air-quality-api.open-meteo.com/v1/air-quality?" + where +
    "&hourly=us_aqi,uv_index&start_date=" + START + "&end_date=" + END + "&timezone=auto";
  const weatherUrl = "https://archive-api.open-meteo.com/v1/archive?" + where +
    "&daily=apparent_temperature_max&start_date=" + START + "&end_date=" + END + "&timezone=auto";
  const air = await getJson(airUrl);
  const weather = await getJson(weatherUrl);
  const summary = stats.summarize(air.hourly, weather.daily);

  const record = {
    slug: city.slug,
    name: city.name,
    country: city.country,
    id: city.id,
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: air.timezone,
    from: START,
    to: END,
    retrieved: new Date().toISOString().slice(0, 10),
    sources: [airUrl, weatherUrl],
    summary: summary
  };
  fs.writeFileSync(path.join(OUT, city.slug + ".json"), JSON.stringify(record, null, 2) + "\n");
  console.log(city.slug, "worst month", summary.months.reduce((a, b) => (b.medianAqi > a.medianAqi ? b : a)).name);
}
