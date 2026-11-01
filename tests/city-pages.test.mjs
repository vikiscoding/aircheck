import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { buildAll, loadInputs, ROOT } from "../scripts/build-cities.mjs";

const require = createRequire(import.meta.url);
const stats = require("../scripts/city-stats.js");

let failed = 0;
function check(label, ok) {
  if (ok) {
    console.log("PASS " + label);
  } else {
    failed++;
    console.error("FAIL " + label);
  }
}

check("median of an odd list", stats.median([3, 1, 2]) === 2);
check("median of an even list", stats.median([4, 1, 3, 2]) === 2.5);
check("median skips missing values, and an empty list has none",
  stats.median([null, 5, undefined, 7]) === 6 && stats.median([null]) === null);

// Two January days and one February day. Day 1 peaks at 160, day 2 at 120.
const fixture = stats.summarize(
  {
    time: ["2024-01-01T10:00", "2024-01-01T11:00", "2024-01-02T10:00", "2024-01-02T11:00", "2024-02-01T10:00"],
    us_aqi: [100, 160, 120, 110, null],
    uv_index: [2, 4, 1, 3, 6.04]
  },
  { time: ["2024-01-01", "2024-01-02", "2024-02-01"], apparent_temperature_max: [10, 12, null] }
);
const jan = fixture.months[0];
const feb = fixture.months[1];
check("month median US AQI uses every hour", jan.medianAqi === 115);
check("days above 150 counts a day by its worst hour", jan.daysOver150Pct === 50);
check("typical UV peak is the median of daily peaks", jan.peakUv === 3.5);
check("feels-like high has Celsius and Fahrenheit", jan.feelsHighC === 11 && jan.feelsHighF === 52);
check("a month with no air hours has no air numbers",
  feb.medianAqi === null && feb.daysOver150Pct === null && feb.peakUv === 6 && feb.feelsHighC === null);
check("a month with no data at all is empty", fixture.months[5].medianAqi === null && fixture.months[5].peakUv === null);

const sentences = stats.citySentences("Testville", fixture);
check("worst and cleanest month sentences",
  sentences[0] === "In Testville, the air is usually worst in January, with a median US AQI of 115 (Unhealthy for Sensitive Groups)." &&
  sentences.every((s) => s.indexOf("cleanest") === -1));
check("the above-150 sentence names the share of days",
  sentences.indexOf("In January, 50% of days had at least one hour above 150 (Unhealthy).") !== -1);
check("UV and heat sentences",
  sentences.indexOf("UV is highest in February, with a typical daily peak of 6 (high).") !== -1 &&
  sentences.indexOf("The hottest-feeling month is January, with typical feels-like highs of 11°C (52°F).") !== -1);
const calm = stats.summarize({ time: ["2024-03-01T10:00"], us_aqi: [40], uv_index: [1] }, { time: [], apparent_temperature_max: [] });
check("no above-150 sentence when no day went above 150",
  stats.citySentences("Calm", calm).every((s) => s.indexOf("above 150") === -1));

const bannedWord = /\b(safe|cure|guaranteed|official|healthy|everyone)\b/i;
const { records } = loadInputs();
check("every city sentence avoids a forbidden word",
  records.every((r) => stats.citySentences(r.name, r.summary).every((s) => !bannedWord.test(s))));

// The committed output must be what the builder makes from the committed inputs.
const built = buildAll();
const stale = Object.keys(built).filter((name) => {
  const onDisk = fs.readFileSync(path.join(ROOT, name), "utf8").replace(/\r\n/g, "\n");
  return onDisk !== built[name];
});
check("generated pages, home city list, and sitemap are up to date (run node scripts/build-cities.mjs)", stale.length === 0);

function numbersIn(value, out) {
  if (typeof value === "number") out.add(value);
  else if (typeof value === "string") (value.match(/\d+(\.\d+)?/g) || []).forEach((n) => out.add(Number(n)));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => numbersIn(v, out));
  return out;
}

for (const record of records) {
  const page = built["city-pages/" + record.slug + ".html"];
  const section = page.slice(page.indexOf("<section id=\"city-year\""), page.indexOf("<section id=\"other-cities\""));
  const text = section.replace(/<[^>]+>/g, " ");
  const known = numbersIn(record, new Set([stats.UNHEALTHY_FROM]));
  const unknown = (text.match(/\d+(\.\d+)?/g) || []).map(Number).filter((n) => !known.has(n));
  check(record.slug + ": every number in the yearly section comes from its data file", unknown.length === 0);
  check(record.slug + ": canonical, place id, attribution, and the live form",
    page.indexOf("<link rel=\"canonical\" href=\"https://aircheck.fyi/" + record.slug + "\">") !== -1 &&
    page.indexOf("<main data-place-id=\"" + record.id + "\">") !== -1 &&
    page.indexOf("(CAMS global air quality). Not an official government source.") !== -1 &&
    page.indexOf("id=\"place-form\"") !== -1 && page.indexOf("id=\"reading-output\"") !== -1);
  check(record.slug + ": listed in the sitemap and on the home page",
    built["sitemap.xml"].indexOf("<loc>https://aircheck.fyi/" + record.slug + "</loc>") !== -1 &&
    built["index.html"].indexOf("href=\"/" + record.slug + "\"") !== -1);
}

if (failed) process.exit(1);
