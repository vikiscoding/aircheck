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
    table["mild|clear_dry|moderate"].advice === "A good time for a walk or easy time outside. Check the air number before a long outing." &&
    table["mild|clear_dry|moderate"].advice.indexOf("Ideal") === -1
);
check(
  "production mild clear dry high keeps a walk and adds shorter time",
  table["mild|clear_dry|high"].advice === "A good time for a walk or easy time outside. Keep time outside shorter, or choose an easier effort." &&
    table["mild|clear_dry|very_high"].advice === "A good time for a walk or easy time outside. Keep time outside shorter, and choose an easier effort."
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
    table["freezing|heavy_rain|very_high"].advice.indexOf("Choose an easier effort.") !== -1 &&
    table["freezing|heavy_rain|very_high"].advice.indexOf("Keep time outside shorter") === -1
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