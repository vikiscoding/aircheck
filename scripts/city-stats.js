"use strict";

// Build-time only. Turns Open-Meteo history into the numbers and sentences on a city page.
// Nothing here runs during a page request.

var feel = require("../feel-lookup.js");

var MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
var UNHEALTHY_FROM = 150;
var UV_WORDS = { low: "low", moderate: "moderate", high: "high", very_high: "very high", extreme: "extreme" };

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function median(values) {
  var list = (values || []).filter(isFiniteNumber).sort(function (a, b) { return a - b; });
  if (!list.length) return null;
  var mid = Math.floor(list.length / 2);
  return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
}

function roundOrNull(value, places) {
  if (!isFiniteNumber(value)) return null;
  var scale = Math.pow(10, places || 0);
  return Math.round(value * scale) / scale;
}

function bump(map, key, value) {
  if (!Object.prototype.hasOwnProperty.call(map, key) || value > map[key]) map[key] = value;
}

function valuesOf(map) {
  return Object.keys(map).map(function (key) { return map[key]; });
}

// hourly: { time, us_aqi, uv_index } in local time. daily: { time, apparent_temperature_max }.
function summarize(hourly, daily) {
  var months = [];
  for (var m = 0; m < 12; m++) months.push({ aqi: [], dayMaxAqi: {}, dayMaxUv: {}, feels: [] });

  var times = (hourly && hourly.time) || [];
  for (var i = 0; i < times.length; i++) {
    var parts = /^(\d{4})-(\d{2})-(\d{2})T/.exec(times[i]);
    if (!parts) continue;
    var bucket = months[Number(parts[2]) - 1];
    if (!bucket) continue;
    var day = times[i].slice(0, 10);
    var aqi = hourly.us_aqi ? hourly.us_aqi[i] : null;
    if (isFiniteNumber(aqi)) {
      bucket.aqi.push(aqi);
      bump(bucket.dayMaxAqi, day, aqi);
    }
    var uv = hourly.uv_index ? hourly.uv_index[i] : null;
    if (isFiniteNumber(uv)) bump(bucket.dayMaxUv, day, uv);
  }

  var dailyTimes = (daily && daily.time) || [];
  for (var d = 0; d < dailyTimes.length; d++) {
    var month = Number(String(dailyTimes[d]).slice(5, 7)) - 1;
    var value = daily.apparent_temperature_max ? daily.apparent_temperature_max[d] : null;
    if (months[month] && isFiniteNumber(value)) months[month].feels.push(value);
  }

  var monthRows = months.map(function (bucket, index) {
    var dayMaxes = valuesOf(bucket.dayMaxAqi);
    var over = dayMaxes.filter(function (v) { return v > UNHEALTHY_FROM; }).length;
    var feelsC = roundOrNull(median(bucket.feels), 0);
    return {
      month: index + 1,
      name: MONTH_NAMES[index],
      medianAqi: roundOrNull(median(bucket.aqi), 0),
      daysOver150Pct: dayMaxes.length ? Math.round(100 * over / dayMaxes.length) : null,
      peakUv: roundOrNull(median(valuesOf(bucket.dayMaxUv)), 1),
      feelsHighC: feelsC,
      feelsHighF: feelsC === null ? null : Math.round(median(bucket.feels) * 9 / 5 + 32)
    };
  });

  // No hour-of-day pattern: US AQI uses 24-hour running averages for particles, so an hour's value is smoothed.
  return { months: monthRows };
}

// Index of the first value that beats every other. Ties keep the earlier one.
function pick(values, better) {
  var best = null;
  for (var i = 0; i < values.length; i++) {
    if (!isFiniteNumber(values[i])) continue;
    if (best === null || better(values[i], values[best])) best = i;
  }
  return best;
}

function pickMonth(months, field, better) {
  var index = pick(months.map(function (row) { return row[field]; }), better);
  return index === null ? null : months[index];
}

function higher(a, b) { return a > b; }
function lower(a, b) { return a < b; }

// Fixed sentence rules. Each sentence names only numbers that are in the summary.
function citySentences(name, summary) {
  var months = summary.months;
  var out = [];
  var worst = pickMonth(months, "medianAqi", higher);
  var best = pickMonth(months, "medianAqi", lower);
  if (worst) {
    out.push("In " + name + ", the air is usually worst in " + worst.name + ", with a median US AQI of " +
      worst.medianAqi + " (" + feel.aqiCategory(worst.medianAqi) + ").");
  }
  if (best && best !== worst) {
    out.push("It is usually cleanest in " + best.name + ", with a median of " + best.medianAqi +
      " (" + feel.aqiCategory(best.medianAqi) + ").");
  }
  if (worst && worst.daysOver150Pct > 0) {
    out.push("In " + worst.name + ", " + worst.daysOver150Pct + "% of days had at least one hour above " +
      UNHEALTHY_FROM + " (Unhealthy).");
  }
  var sunny = pickMonth(months, "peakUv", higher);
  if (sunny) {
    out.push("UV is highest in " + sunny.name + ", with a typical daily peak of " + sunny.peakUv +
      " (" + UV_WORDS[feel.uvBand(sunny.peakUv)] + ").");
  }
  var hot = pickMonth(months, "feelsHighC", higher);
  if (hot) {
    out.push("The hottest-feeling month is " + hot.name + ", with typical feels-like highs of " +
      hot.feelsHighC + "°C (" + hot.feelsHighF + "°F).");
  }
  return out;
}

module.exports = {
  MONTH_NAMES: MONTH_NAMES,
  UNHEALTHY_FROM: UNHEALTHY_FROM,
  median: median,
  summarize: summarize,
  citySentences: citySentences
};
