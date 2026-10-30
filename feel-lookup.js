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
    feel: "There isn't a sentence for this reading.",
    advice: "Use the numbers if you are deciding whether to go out. For a health decision, check a local source."
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
  var HEAVY_CODES = [55, 57, 65, 67, 75, 82, 86];
  var FOG_CODES = [45, 48];
  var LIGHT_CODES = [51, 53, 56, 61, 63, 66, 71, 73, 77, 80, 81, 85];
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
    // foggy; windy (finite wind >= 40); light_rain (precipitation that is not heavy: drizzle, moderate rain, moderate snow, showers, light freezing rain, and light snow);
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

  // WHO UV index bands use the nearest whole index.
  // 1 UV index = 0.025 W/m², so one minute delivers 1.5 J/m².
  // MED ranges are the published SED spans (1 SED = 100 J/m²).
  var SKIN_MED_J = {
    I: [200, 300],
    II: [250, 300],
    III: [300, 500],
    IV: [400, 700],
    V: [600, 2000],
    VI: [600, 2000]
  };

  var SKIN_NAME = {
    I: "very fair skin",
    II: "fair skin",
    III: "medium skin",
    IV: "olive skin",
    V: "brown skin",
    VI: "dark skin"
  };

  var SUN_BAND_WORD = {
    moderate: "Moderate",
    high: "High",
    very_high: "Very high",
    extreme: "Extreme"
  };

  function uvBand(uvIndex) {
    if (!isFiniteNumber(uvIndex) || uvIndex < 0) return null;
    var index = Math.round(uvIndex);
    if (index <= 2) return "low";
    if (index <= 5) return "moderate";
    if (index <= 7) return "high";
    if (index <= 10) return "very_high";
    return "extreme";
  }

  function burnWindow(uvIndex, skinType) {
    var med = SKIN_MED_J[skinType];
    if (!med || !isFiniteNumber(uvIndex) || uvIndex <= 0) return null;
    return {
      lowMinutes: med[0] / (uvIndex * 1.5),
      highMinutes: med[1] / (uvIndex * 1.5)
    };
  }

  function stepDown(minutes) {
    if (minutes < 5) return 0;
    return Math.floor((minutes + 1e-9) / 5) * 5;
  }

  function stepUp(minutes) {
    return Math.ceil((minutes - 1e-9) / 5) * 5;
  }

  function formatMinutes(total) {
    var minutes = Math.round(total);
    if (minutes < 60) return minutes + " min";
    var hours = Math.floor(minutes / 60);
    var rest = minutes % 60;
    if (rest === 0) return hours + " hr";
    return hours + " hr " + rest + " min";
  }

  function formatBurnRange(lowMinutes, highMinutes) {
    var low = stepDown(lowMinutes);
    var high = stepUp(highMinutes);
    if (high < 5) return "under 5 min";
    if (low < 5) return "under " + formatMinutes(high);
    if (low === high) return "about " + formatMinutes(low);
    if (high < 60) return "~" + low + "\u2013" + high + " min";
    return "~" + formatMinutes(low) + "\u2013" + formatMinutes(high);
  }

  function sunLine(uvIndex, skinType) {
    var band = uvBand(uvIndex);
    if (!band || band === "low") return null;
    var word = SUN_BAND_WORD[band];
    var window = burnWindow(uvIndex, skinType);
    if (!window) {
      return {
        band: band,
        sentence: word + " UV. Choose a skin type to see a burn-time range. The type stays on this device."
      };
    }
    return {
      band: band,
      sentence: word + " burn risk in " + formatBurnRange(window.lowMinutes, window.highMinutes) +
        " of direct sun for " + SKIN_NAME[skinType] + "."
    };
  }

  return {
    tempBand: tempBand,
    aqiBand: aqiBand,
    aqiCategory: aqiCategory,
    weatherLabel: weatherLabel,
    weatherBand: weatherBand,
    lookupFeel: lookupFeel,
    uvBand: uvBand,
    burnWindow: burnWindow,
    sunLine: sunLine,
    WRITTEN_FALLBACK: WRITTEN_FALLBACK
  };
}));
