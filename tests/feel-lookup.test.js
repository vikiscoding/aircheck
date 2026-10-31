"use strict";

var fs = require("fs");
var path = require("path");
var feel = require("../feel-lookup.js");

function check(label, ok) {
  if (!ok) {
    console.error("FAIL " + label);
    process.exit(1);
  }
  console.log("PASS " + label);
}

var exactFeel = "Exact sentence for this reading.";
var weatherDroppedFeel = "Weather-dropped sentence for this reading.";
var aqiDroppedFeel = "AQI-dropped sentence for this reading.";
var genericFeel = "Generic sentence for this reading.";
var seenFeels = [exactFeel, weatherDroppedFeel, aqiDroppedFeel, genericFeel];

var fixture = {
  "mild|clear_dry|low": { feel: exactFeel, advice: "Exact advice." },
  "mild|*|low": { feel: weatherDroppedFeel, advice: "Weather-dropped advice." },
  "mild|*|*": { feel: aqiDroppedFeel, advice: "AQI-dropped advice." },
  "*|*|*": { feel: genericFeel, advice: "Generic advice." }
};
var bands = { temp: "mild", weather: "clear_dry", aqi: "low" };

var exactHit = feel.lookupFeel(fixture, bands);
check(
  "exact key hit returns the entry and match exact",
  exactHit.feel === exactFeel &&
    exactHit.advice === "Exact advice." &&
    exactHit.match === "exact"
);

delete fixture["mild|clear_dry|low"];
check(
  "exact key is absent after removal",
  !Object.prototype.hasOwnProperty.call(fixture, "mild|clear_dry|low")
);
var weatherDropped = feel.lookupFeel(fixture, bands);
check(
  "same bands fall through to the weather-dropped entry",
  weatherDropped.feel === weatherDroppedFeel &&
    weatherDropped.advice === "Weather-dropped advice." &&
    weatherDropped.match === "weather_dropped"
);

delete fixture["mild|*|low"];
check(
  "weather-dropped key is absent after removal",
  !Object.prototype.hasOwnProperty.call(fixture, "mild|*|low")
);
var aqiDropped = feel.lookupFeel(fixture, bands);
check(
  "same bands fall through to the aqi-dropped entry",
  aqiDropped.feel === aqiDroppedFeel &&
    aqiDropped.advice === "AQI-dropped advice." &&
    aqiDropped.match === "aqi_dropped"
);

delete fixture["mild|*|*"];
check(
  "aqi-dropped key is absent after removal",
  !Object.prototype.hasOwnProperty.call(fixture, "mild|*|*")
);
var genericHit = feel.lookupFeel(fixture, bands);
check(
  "same bands fall through to the generic entry",
  genericHit.feel === genericFeel &&
    genericHit.advice === "Generic advice." &&
    genericHit.match === "generic"
);

delete fixture["*|*|*"];
check(
  "generic key is absent after removal",
  !Object.prototype.hasOwnProperty.call(fixture, "*|*|*")
);
var fallbackHit = feel.lookupFeel(fixture, bands);
check(
  "same bands fall through to the written fallback",
  fallbackHit.feel === "There isn't a sentence for this reading." &&
    fallbackHit.advice === "Use the numbers if you are deciding whether to go out. For a health decision, check a local source." &&
    fallbackHit.feel === feel.WRITTEN_FALLBACK.feel &&
    fallbackHit.advice === feel.WRITTEN_FALLBACK.advice &&
    fallbackHit.match === "fallback" &&
    seenFeels.indexOf(fallbackHit.feel) === -1
);

var table = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "feel-table.json"), "utf8")
);
var requiredFeel = "Mild, clear and dry with low air-quality risk \u2014 comfortable for most people.";
var requiredAdvice = "Ideal for walking, cycling or outdoor sports.";
check(
  "production mild|clear_dry|low feel",
  table["mild|clear_dry|low"].feel === requiredFeel
);
check(
  "production mild|clear_dry|low advice",
  table["mild|clear_dry|low"].advice === requiredAdvice
);
var productionExact = feel.lookupFeel(table, bands);
check(
  "production lookupFeel returns match exact",
  productionExact.feel === requiredFeel &&
    productionExact.advice === requiredAdvice &&
    productionExact.match === "exact"
);
check(
  "production table has generic row",
  !!table["*|*|*"] && typeof table["*|*|*"].feel === "string" && table["*|*|*"].feel.length > 0
);

var absentExact = "cool|humid|low";
check(
  "production exact key cool|humid|low is absent",
  !Object.prototype.hasOwnProperty.call(table, absentExact)
);
check(
  "production fallback key cool|*|low is present",
  typeof table["cool|*|low"].feel === "string" && table["cool|*|low"].feel.length > 0
);
var productionDropped = feel.lookupFeel(table, {
  temp: "cool",
  weather: "humid",
  aqi: "low"
});
check(
  "absent exact weather key still returns a table sentence",
  productionDropped.match === "weather_dropped" &&
    productionDropped.feel === table["cool|*|low"].feel &&
    productionDropped.advice === table["cool|*|low"].advice &&
    productionDropped.feel !== feel.WRITTEN_FALLBACK.feel
);

var tempEdges = [
  [-0.1, "freezing"],
  [0, "cold"],
  [9.9, "cold"],
  [10, "cool"],
  [17.9, "cool"],
  [18, "mild"],
  [23.9, "mild"],
  [24, "warm"],
  [29.9, "warm"],
  [30, "hot"],
  [34.9, "hot"],
  [35, "very_hot"]
];
tempEdges.forEach(function (pair) {
  check("tempBand " + pair[0] + " is " + pair[1], feel.tempBand(pair[0]) === pair[1]);
});

var aqiEdges = [
  [0, "low"],
  [50, "low"],
  [51, "moderate"],
  [100, "moderate"],
  [101, "high"],
  [150, "high"],
  [151, "very_high"],
  [null, null],
  [-1, null]
];
aqiEdges.forEach(function (pair) {
  check("aqiBand " + pair[0] + " is " + pair[1], feel.aqiBand(pair[0]) === pair[1]);
});

check("code 95 with wind 80 is stormy", feel.weatherBand({ weatherCode: 95, windSpeedKmh: 80 }) === "stormy");
check("code 96 is stormy", feel.weatherBand({ weatherCode: 96 }) === "stormy");
check("code 99 is stormy", feel.weatherBand({ weatherCode: 99 }) === "stormy");
check("code 65 is heavy_rain", feel.weatherBand({ weatherCode: 65 }) === "heavy_rain");
check("code 63 moderate rain is light_rain", feel.weatherBand({ weatherCode: 63 }) === "light_rain");
check("code 73 moderate snow is light_rain", feel.weatherBand({ weatherCode: 73 }) === "light_rain");
check("code 81 moderate rain showers is light_rain", feel.weatherBand({ weatherCode: 81 }) === "light_rain");
check("code 55 dense drizzle stays heavy_rain", feel.weatherBand({ weatherCode: 55 }) === "heavy_rain");
check("code 57 dense freezing drizzle stays heavy_rain", feel.weatherBand({ weatherCode: 57 }) === "heavy_rain");
check("code 75 snow is heavy_rain", feel.weatherBand({ weatherCode: 75 }) === "heavy_rain");
check("code 45 is foggy", feel.weatherBand({ weatherCode: 45 }) === "foggy");
check("code 48 is foggy", feel.weatherBand({ weatherCode: 48 }) === "foggy");
check("code 0 with wind 40 is windy", feel.weatherBand({ weatherCode: 0, windSpeedKmh: 40 }) === "windy");
check("code 61 is light_rain", feel.weatherBand({ weatherCode: 61 }) === "light_rain");
check("code 66 light freezing rain is light_rain", feel.weatherBand({ weatherCode: 66 }) === "light_rain");
check("code 67 heavy freezing rain is heavy_rain", feel.weatherBand({ weatherCode: 67 }) === "heavy_rain");
check("code 71 snow is light_rain", feel.weatherBand({ weatherCode: 71 }) === "light_rain");
check(
  "code 0 humidity 85 temp 18 is humid",
  feel.weatherBand({ weatherCode: 0, humidityPct: 85, tempC: 18 }) === "humid"
);
check(
  "code 2 humidity 85 temp 18 is humid before cloudy",
  feel.weatherBand({ weatherCode: 2, humidityPct: 85, tempC: 18 }) === "humid"
);
check(
  "code 0 humidity 84 temp 18 is clear_dry",
  feel.weatherBand({ weatherCode: 0, humidityPct: 84, tempC: 18 }) === "clear_dry"
);
check("code 3 is cloudy", feel.weatherBand({ weatherCode: 3 }) === "cloudy");
check("unknown code 999 is null", feel.weatherBand({ weatherCode: 999 }) === null);
check("unknown code 999 with wind below 40 is null", feel.weatherBand({ weatherCode: 999, windSpeedKmh: 39 }) === null);
check("missing code with wind 40 is windy", feel.weatherBand({ windSpeedKmh: 40 }) === "windy");
check("missing code with wind below 40 is null", feel.weatherBand({ windSpeedKmh: 39 }) === null);
check("tempBand non-finite is null", feel.tempBand(NaN) === null && feel.tempBand(Infinity) === null);
check("aqiCategory null when band is null", feel.aqiCategory(null) === null && feel.aqiCategory(-1) === null);
check("aqiCategory 50 is Good", feel.aqiCategory(50) === "Good");
check("aqiCategory 100 is Moderate", feel.aqiCategory(100) === "Moderate");
check("aqiCategory 150 is Unhealthy for Sensitive Groups", feel.aqiCategory(150) === "Unhealthy for Sensitive Groups");
check("aqiCategory 200 is Unhealthy", feel.aqiCategory(200) === "Unhealthy");
check("aqiCategory 300 is Very Unhealthy", feel.aqiCategory(300) === "Very Unhealthy");
check("aqiCategory 301 is Hazardous", feel.aqiCategory(301) === "Hazardous");
check("weatherLabel 0 is Clear sky", feel.weatherLabel(0) === "Clear sky");
check("weatherLabel 99 is Thunderstorm with heavy hail", feel.weatherLabel(99) === "Thunderstorm with heavy hail");
check("weatherLabel unknown is null", feel.weatherLabel(999) === null);

check(
  "production generic sentence names the missing row",
  table["*|*|*"].feel === "There isn't a sentence for this reading. The numbers below are what came back." &&
    table["*|*|*"].advice === feel.WRITTEN_FALLBACK.advice
);
check(
  "production mild clear dry moderate is not the ideal line",
  table["mild|clear_dry|moderate"].feel === "Mild, clear, and dry." &&
    table["mild|clear_dry|moderate"].advice === "A good time for a walk or easy time outside. If you are sensitive to air pollution, go easier on a long outing." &&
    table["mild|clear_dry|moderate"].advice.indexOf("Ideal") === -1
);
check(
  "production mild clear dry high says the weather suits a walk but the air does not",
  table["mild|clear_dry|high"].advice === "The weather suits a walk, but the air does not. Keep outdoor time shorter or the effort easier." &&
    table["mild|clear_dry|very_high"].advice === "The weather suits a walk, but the air does not. Keep outdoor time short and the effort easy."
);
check(
  "production freezing storm high keeps the cold and the shelter",
  table["freezing|stormy|high"].feel.indexOf("hard strain") !== -1 &&
    table["freezing|stormy|high"].advice.indexOf("Dress for deep cold") === 0 &&
    table["freezing|stormy|high"].advice.indexOf("shelter") !== -1
);
check(
  "production heavy rain does not say shorter twice",
  table["freezing|heavy_rain|high"].advice === table["freezing|heavy_rain|low"].advice &&
    table["freezing|heavy_rain|very_high"].advice.indexOf("Because of the air, choose an easier effort.") !== -1 &&
    table["freezing|heavy_rain|very_high"].advice.indexOf("keep outdoor time") === -1
);
check(
  "production cool fog advice is two sentences",
  table["cool|foggy|low"].advice === "A light jacket is enough. Leave extra time to see ahead."
);
check(
  "production mild fallback is plain temperature speech",
  table["mild|*|low"].feel === "The temperature is mild." &&
    table["mild|*|low"].advice === "Ordinary clothes are enough for an easy hour outside." &&
    table["mild|*|*"].feel === table["mild|*|low"].feel
);
check(
  "production light rain sentence does not say light precipitation",
  table["mild|light_rain|low"].feel.indexOf("light precipitation") === -1 &&
    table["mild|light_rain|low"].feel.indexOf("precipitation") !== -1 &&
    table["mild|heavy_rain|low"].feel.indexOf("heavy precipitation") !== -1
);

var bannedWord = /\b(safe|cure|guaranteed|official|healthy|everyone)\b/i;
var skyClaim = /\b(clear|cloudy|fog|foggy|storm|stormy|wind|windy|precipitation|humid|rain|snow)\b/;
Object.keys(table).forEach(function (key) {
  var row = table[key];
  check("no forbidden word in " + key, !bannedWord.test(row.feel) && !bannedWord.test(row.advice));
  check(
    "no light precipitation wording in " + key,
    row.feel.indexOf("light precipitation") === -1 && row.advice.indexOf("light precipitation") === -1
  );
  if (key !== "mild|clear_dry|low") {
    check(
      "air-quality slot and Ideal stay off " + key,
      row.feel.indexOf("air-quality risk") === -1 && row.advice.indexOf("Ideal") === -1
    );
  }
  if (key.indexOf("*") !== -1 && key !== "*|*|*") {
    check("fallback feel makes no sky claim " + key, !skyClaim.test(row.feel));
  }
});

var uvEdges = [
  [0, "low"],
  [2, "low"],
  [2.4, "low"],
  [2.5, "moderate"],
  [5, "moderate"],
  [5.4, "moderate"],
  [5.5, "high"],
  [7, "high"],
  [7.4, "high"],
  [7.5, "very_high"],
  [10, "very_high"],
  [10.4, "very_high"],
  [10.5, "extreme"],
  [11, "extreme"],
  [null, null],
  [-1, null]
];
uvEdges.forEach(function (pair) {
  check("uvBand " + pair[0] + " is " + pair[1], feel.uvBand(pair[0]) === pair[1]);
});
check("uvBand non-finite is null", feel.uvBand(NaN) === null && feel.uvBand(Infinity) === null);

var typeOneAtTen = feel.burnWindow(10, "I");
check(
  "UV 10 type I uses 200 and 300 J over 1.5 J per minute",
  Math.abs(typeOneAtTen.lowMinutes - (200 / 15)) < 1e-9 &&
    Math.abs(typeOneAtTen.highMinutes - 20) < 1e-9
);
check("unknown skin type has no burn window", feel.burnWindow(10, "VII") === null);
check("UV 0 has no burn window", feel.burnWindow(0, "I") === null);

check(
  "UV 10 type I sun line",
  feel.sunLine(10, "I").sentence === "Very high burn risk in ~10\u201320 min of direct sun for very fair skin." &&
    feel.sunLine(10, "I").band === "very_high"
);
check(
  "UV 7 type II sun line",
  feel.sunLine(7, "II").sentence === "High burn risk in ~20\u201330 min of direct sun for fair skin."
);
check(
  "UV 10 type V keeps the wide published range",
  feel.sunLine(10, "V").sentence === "Very high burn risk in ~40 min\u20132 hr 15 min of direct sun for brown skin."
);
check(
  "very strong UV stays under 5 minutes",
  feel.sunLine(50, "I").sentence === "Extreme burn risk in under 5 min of direct sun for very fair skin."
);
check("low UV does not add a sun line", feel.sunLine(2, "I") === null && feel.sunLine(0, "II") === null);
check(
  "moderate UV without a skin type asks for one",
  feel.sunLine(3, "").sentence === "Moderate UV. Open Sun settings and choose a skin type to see a burn-time range." &&
    feel.sunLine(3, null).sentence === feel.sunLine(3, "").sentence
);

["I", "II", "III", "IV", "V", "VI"].forEach(function (skin) {
  [3, 6, 8, 11].forEach(function (uv) {
    var line = feel.sunLine(uv, skin);
    check(
      "sun line " + uv + " " + skin + " avoids a forbidden word",
      line && !bannedWord.test(line.sentence)
    );
  });
});

var offerFixture = {
  cover: {
    sentence: "A layer against the precipitation is the usual companion to this reading.",
    label: "Cover",
    href: "https://example.com/cover"
  },
  air: {
    sentence: "A well-fitted mask or an indoor air filter is the usual companion to this air reading.",
    label: "Air",
    href: "https://example.com/air"
  },
  sun: {
    sentence: "Shade, a hat, or sunscreen is the usual companion to this UV index.",
    label: "Sun",
    href: "https://example.com/sun"
  }
};
check(
  "storm with high air uses the cover offer",
  feel.offerLine(offerFixture, { weather: "stormy", aqi: "very_high", uv: "high" }).key === "cover"
);
check(
  "high air with high UV uses the air offer",
  feel.offerLine(offerFixture, { weather: "clear_dry", aqi: "high", uv: "very_high" }).key === "air"
);
check(
  "moderate air with high UV uses the sun offer",
  feel.offerLine(offerFixture, { weather: "clear_dry", aqi: "moderate", uv: "high" }).key === "sun"
);
check(
  "storm with high UV uses the cover offer",
  feel.offerLine(offerFixture, { weather: "stormy", uv: "extreme" }).key === "cover"
);
check(
  "heavy precipitation uses the cover offer",
  feel.offerLine(offerFixture, { weather: "heavy_rain", uv: "low" }).key === "cover"
);
check(
  "light precipitation with high UV uses the sun offer",
  feel.offerLine(offerFixture, { weather: "light_rain", uv: "high" }).key === "sun"
);
check(
  "clear low UV has no offer",
  feel.offerLine(offerFixture, { weather: "clear_dry", uv: "low" }) === null
);
check(
  "an http offer link is refused",
  feel.offerLine({
    sun: { sentence: offerFixture.sun.sentence, label: "Sun", href: "http://example.com/sun" }
  }, { weather: "clear_dry", uv: "high" }) === null
);
check(
  "an offer without a label is silent",
  feel.offerLine({
    sun: { sentence: offerFixture.sun.sentence, label: "", href: "https://example.com/sun" }
  }, { weather: "clear_dry", uv: "high" }) === null
);

var productionOffers = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "offer-table.json"), "utf8"));
check(
  "production cover sentence",
  productionOffers.cover.sentence === offerFixture.cover.sentence &&
    !bannedWord.test(productionOffers.cover.sentence)
);
check(
  "production air sentence",
  productionOffers.air.sentence === offerFixture.air.sentence &&
    !bannedWord.test(productionOffers.air.sentence) &&
    productionOffers.air.href === "" && productionOffers.air.label === "" &&
    feel.offerLine(productionOffers, { weather: "clear_dry", aqi: "very_high" }) === null
);
check(
  "production sun sentence",
  productionOffers.sun.sentence === offerFixture.sun.sentence &&
    !bannedWord.test(productionOffers.sun.sentence)
);
check(
  "production offer links stay blank",
  productionOffers.cover.href === "" && productionOffers.cover.label === "" &&
    productionOffers.sun.href === "" && productionOffers.sun.label === "" &&
    feel.offerLine(productionOffers, { weather: "stormy", uv: "extreme" }) === null
);

var sponsorFixture = { name: "Northwind", href: "https://example.com/sponsor", until: "2026-10-30" };
check(
  "sponsor shows on the until date",
  feel.sponsorLine(sponsorFixture, "2026-10-30").name === "Northwind"
);
check(
  "sponsor hides the day after until",
  feel.sponsorLine(sponsorFixture, "2026-10-31") === null
);
check(
  "sponsor refuses an http link",
  feel.sponsorLine({ name: "Northwind", href: "http://example.com", until: "2026-10-30" }, "2026-10-30") === null
);
var productionSponsor = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "sponsor.json"), "utf8"));
check(
  "production sponsor stays blank",
  productionSponsor.name === "" && productionSponsor.href === "" && productionSponsor.until === "" &&
    feel.sponsorLine(productionSponsor, "2026-10-30") === null
);

var heatUpgrade = feel.heatLine(22, 31);
check(
  "feels-like heat above the air band",
  heatUpgrade && heatUpgrade.band === "hot" &&
    heatUpgrade.sentence === "It feels hot, a step hotter than the air temperature." &&
    !bannedWord.test(heatUpgrade.sentence)
);
check(
  "the top feels-like band is named very hot",
  feel.heatLine(32, 35).sentence === "It feels very hot, a step hotter than the air temperature."
);
check("the same temperature band has no heat line", feel.heatLine(31, 33) === null);
check("a cooler feels-like band has no heat line", feel.heatLine(22, 16) === null);
check("a missing feels-like temperature has no heat line", feel.heatLine(22, null) === null);
check("a missing air temperature has no heat line", feel.heatLine(null, 31) === null);
check("band edges stay exclusive", feel.heatLine(29.9, 30).band === "hot" && feel.heatLine(35, 35) === null);

var heatBands = { weather: "clear_dry", aqi: "low", temp: "warm", apparent: "hot", uv: "low" };
check(
  "heat is the activity line when it is the tightest limit",
  feel.activityLine(heatBands).key === "heat" &&
    feel.activityLine(heatBands).sentence === "The heat is the main limit on a long effort."
);
check(
  "a storm wins over air and heat",
  feel.activityLine({ weather: "stormy", aqi: "very_high", temp: "warm", apparent: "hot" }).sentence ===
    "The storm is the main limit on time outside."
);
check(
  "heavy precipitation wins over a very high air band",
  feel.activityLine({ weather: "heavy_rain", aqi: "very_high", temp: "mild", apparent: "mild" }).sentence ===
    "The heavy precipitation is the main limit on a long outing."
);
check(
  "a very high air band wins over heat",
  feel.activityLine({ weather: "clear_dry", aqi: "very_high", temp: "warm", apparent: "very_hot" }).key === "air"
);
check(
  "a warm feels-like upgrade is not an activity limit",
  feel.activityLine({ weather: "clear_dry", aqi: "low", temp: "mild", apparent: "warm" }) === null
);
check(
  "heat that matches the air band is not an activity limit",
  feel.activityLine({ weather: "clear_dry", aqi: "low", temp: "hot", apparent: "hot" }) === null
);
check(
  "an ordinary mild reading has no activity line",
  feel.activityLine({ weather: "clear_dry", aqi: "low", temp: "mild", apparent: "mild", uv: "low" }) === null
);
["storm", "precipitation", "air", "heat"].forEach(function (key) {
  var sample = {
    storm: { weather: "stormy" },
    precipitation: { weather: "heavy_rain" },
    air: { aqi: "very_high" },
    heat: heatBands
  }[key];
  var line = feel.activityLine(sample);
  check("activity " + key + " avoids a forbidden word", line && !bannedWord.test(line.sentence));
});

var easeBands = { weather: "clear_dry", aqi: "low", temp: "mild", apparent: "mild", uv: "low" };
check(
  "mild clear low UV is easier conditions",
  feel.resultTone(easeBands).tone === "ease" && feel.resultTone(easeBands).label === "Easier conditions"
);
check(
  "cloudy mild low UV is easier conditions",
  feel.resultTone({ weather: "cloudy", aqi: "low", temp: "mild", apparent: "mild", uv: "low" }).tone === "ease"
);
check(
  "a storm is limiting even on a mild air temperature",
  feel.resultTone({ weather: "stormy", aqi: "low", temp: "mild", apparent: "mild", uv: "low" }).tone === "limit"
);
check(
  "very high UV blocks the easier tint",
  feel.resultTone({ weather: "clear_dry", aqi: "low", temp: "mild", apparent: "mild", uv: "very_high" }).label ===
    "Limiting conditions"
);
check(
  "extreme UV is limiting",
  feel.resultTone({ weather: "clear_dry", aqi: "low", temp: "mild", apparent: "mild", uv: "extreme" }).tone === "limit"
);
check(
  "very hot air is limiting without a heat upgrade",
  feel.resultTone({ weather: "clear_dry", aqi: "low", temp: "very_hot", apparent: "very_hot", uv: "low" }).tone === "limit"
);
check(
  "a hot day below very hot keeps the plain card",
  feel.resultTone({ weather: "clear_dry", aqi: "low", temp: "warm", apparent: "hot", uv: "low" }) === null
);
check(
  "a missing UV index keeps the card plain",
  feel.resultTone({ weather: "clear_dry", aqi: "low", temp: "mild", apparent: "mild", uv: null }) === null
);
check(
  "a missing air number keeps the card plain",
  feel.resultTone({ weather: "clear_dry", aqi: null, temp: "mild", apparent: "mild", uv: "low" }) === null
);
check(
  "a feels-like band above mild keeps the card plain",
  feel.resultTone({ weather: "clear_dry", aqi: "low", temp: "mild", apparent: "warm", uv: "low" }) === null
);
check(
  "tone labels avoid a forbidden word",
  !bannedWord.test(feel.resultTone(easeBands).label) &&
    !bannedWord.test(feel.resultTone({ weather: "heavy_rain" }).label)
);
check(
  "weather time reads as clock, zone, and date",
  feel.readableTime("2026-10-31T15:30", "GMT") === "15:30 GMT, 31 Oct 2026"
);
check(
  "weather time without a zone",
  feel.readableTime("2026-01-05T07:00", null) === "07:00, 5 Jan 2026"
);
check(
  "an unrecognized weather time is shown as sent",
  feel.readableTime("yesterday", "GMT") === "yesterday GMT" && feel.readableTime("", "GMT") === null
);

check(
  "a place link carries the name and the place id",
  feel.placeLink("Lisbon, Portugal", 2267057) === "/?place=Lisbon%2C%20Portugal&id=2267057"
);
check(
  "a place link refuses a missing or fractional id",
  feel.placeLink("Lisbon", null) === null && feel.placeLink("Lisbon", 38.7) === null &&
    feel.placeLink("Lisbon", -1) === null
);
check(
  "a link id wins over the place text",
  JSON.stringify(feel.placeRequest("?place=Lisbon&id=2267057")) === JSON.stringify({ id: 2267057 })
);
check(
  "a place without an id is a search",
  JSON.stringify(feel.placeRequest("?place=%20Lisbon%2C%20Portugal%20")) === JSON.stringify({ query: "Lisbon, Portugal" })
);
check(
  "a bad id falls back to the place text, and an empty link is no request",
  JSON.stringify(feel.placeRequest("?place=Oslo&id=12abc")) === JSON.stringify({ query: "Oslo" }) &&
    feel.placeRequest("?id=0") === null && feel.placeRequest("") === null && feel.placeRequest("?lat=1&lon=2") === null
);

var airRows = Object.keys(table).filter(function (key) { return /\|(high|very_high)$/.test(key); });
check(
  "every high or very high air row names the air in the sentence",
  airRows.length > 0 && airRows.every(function (key) {
    return /\bThe air is unhealthy\b/.test(table[key].feel);
  })
);
check(
  "a very high air row does not soften to sensitive groups only",
  airRows.every(function (key) {
    return /\|very_high$/.test(key) ? table[key].feel.indexOf("sensitive groups") === -1 : true;
  })
);
check(
  "no advice both praises the outing and cuts it short",
  Object.keys(table).every(function (key) {
    var advice = table[key].advice;
    return !(/good time|ideal|pleasant/i.test(advice) && /keep outdoor time|because of the air/i.test(advice));
  })
);
check(
  "low and moderate rows keep the air out of the sentence",
  Object.keys(table).every(function (key) {
    return /\|(low|moderate)$/.test(key) ? table[key].feel.indexOf("The air is unhealthy") === -1 : true;
  })
);
