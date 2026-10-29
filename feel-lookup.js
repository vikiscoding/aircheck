(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else if (root) {
    root.FeelLookup = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var WRITTEN_FALLBACK = {
    feel: "There is no written sentence for this reading yet.",
    advice: "Use the numbers below, and check a local source if you need a health decision."
  };

  var WEATHER_LABELS = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
  };

  var STORMY_CODES = [95, 96, 99];
  var HEAVY_CODES = [55, 57, 63, 65, 67, 73, 75, 81, 82, 86];
  var FOG_CODES = [45, 48];
  var LIGHT_CODES = [51, 53, 56, 61, 66, 80, 71, 77, 85];
  var HUMID_CODES = [0, 1, 2, 3];
  var CLOUDY_CODES = [2, 3];
  var CLEAR_CODES = [0, 1];

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function hasCode(list, code) {
    return list.indexOf(code) !== -1;
  }

  function tempBand(celsius) {
    if (!isFiniteNumber(celsius)) return null;
    if (celsius < 0) return "freezing";
    if (celsius < 10) return "cold";
    if (celsius < 18) return "cool";
    if (celsius < 24) return "mild";
    if (celsius < 30) return "warm";
    if (celsius < 35) return "hot";
    return "very_hot";
  }

  function aqiBand(usAqi) {
    if (!isFiniteNumber(usAqi) || usAqi < 0) return null;
    if (usAqi <= 50) return "low";
    if (usAqi <= 100) return "moderate";
    if (usAqi <= 150) return "high";
    return "very_high";
  }

  function aqiCategory(usAqi) {
    if (aqiBand(usAqi) === null) return null;
    if (usAqi <= 50) return "Good";
    if (usAqi <= 100) return "Moderate";
    if (usAqi <= 150) return "Unhealthy for Sensitive Groups";
    if (usAqi <= 200) return "Unhealthy";
    if (usAqi <= 300) return "Very Unhealthy";
    return "Hazardous";
  }

  function weatherLabel(code) {
    if (!Object.prototype.hasOwnProperty.call(WEATHER_LABELS, code)) return null;
    return WEATHER_LABELS[code];
  }

  function weatherBand(reading) {
    // Product constraint: first match wins, in this order:
    // stormy; heavy_rain (heavy precipitation, including heavy snow; not rain-only);
    // foggy; windy (finite wind >= 40); light_rain (light precipitation, including light freezing rain and light snow);
    // humid; cloudy; clear_dry; otherwise null.
    var code = reading ? reading.weatherCode : undefined;
    var wind = reading ? reading.windSpeedKmh : undefined;
    var humidity = reading ? reading.humidityPct : undefined;
    var temp = reading ? reading.tempC : undefined;

    if (hasCode(STORMY_CODES, code)) return "stormy";
    if (hasCode(HEAVY_CODES, code)) return "heavy_rain";
    if (hasCode(FOG_CODES, code)) return "foggy";
    if (isFiniteNumber(wind) && wind >= 40) return "windy";
    if (hasCode(LIGHT_CODES, code)) return "light_rain";
    if (humidity >= 85 && temp >= 18 && hasCode(HUMID_CODES, code)) return "humid";
    if (hasCode(CLOUDY_CODES, code)) return "cloudy";
    if (hasCode(CLEAR_CODES, code)) return "clear_dry";
    return null;
  }

  function isHit(entry) {
    return !!entry && typeof entry.feel === "string" && entry.feel.length > 0;
  }

  function lookupFeel(table, bands) {
    var temp = bands && bands.temp;
    var weather = bands && bands.weather;
    var aqi = bands && bands.aqi;
    var steps = [
      {
        match: "exact",
        key: temp + "|" + weather + "|" + aqi,
        ok: temp != null && weather != null && aqi != null
      },
      {
        match: "weather_dropped",
        key: temp + "|*|" + aqi,
        ok: temp != null && aqi != null
      },
      {
        match: "aqi_dropped",
        key: temp + "|*|*",
        ok: temp != null
      },
      {
        match: "generic",
        key: "*|*|*",
        ok: true
      }
    ];
    var source = table || {};

    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      if (!step.ok) continue;
      var entry = source[step.key];
      if (!isHit(entry)) continue;
      return {
        feel: entry.feel,
        advice: typeof entry.advice === "string" ? entry.advice : "",
        match: step.match
      };
    }

    return {
      feel: WRITTEN_FALLBACK.feel,
      advice: WRITTEN_FALLBACK.advice,
      match: "fallback"
    };
  }

  return {
    tempBand: tempBand,
    aqiBand: aqiBand,
    aqiCategory: aqiCategory,
    weatherLabel: weatherLabel,
    weatherBand: weatherBand,
    lookupFeel: lookupFeel,
    WRITTEN_FALLBACK: WRITTEN_FALLBACK
  };
}));
