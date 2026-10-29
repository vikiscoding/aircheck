"use strict";

(function () {
  var EMPTY_PLACE = "Type a place, or use your location.";
  var CHECKING = "Checking that place…";
  var NOT_FOUND = "That place could not be found. Try a city and a country, such as Lisbon, Portugal.";
  var NO_GEO = "This browser cannot share location. Type a place instead.";
  var GEO_DENIED = "Location permission was denied. Type a place instead.";
  var GEO_TIMEOUT = "The location request timed out. Type a place instead.";
  var GEO_FAILED = "The location request failed. Type a place instead.";
  var BOTH_FAILED = "The weather and air-quality service did not respond. Nothing here was estimated.";
  var WEATHER_FAILED = "The weather service did not respond. Nothing here was estimated.";
  var NO_TEMPERATURE = "The weather service returned no temperature. Nothing here was estimated.";
  var AIR_FAILED = "Air quality did not load. The sentence does not use an air-quality number.";
  var PLACE_FAILED = "The place service did not respond. Nothing here was estimated.";
  var TABLE_FAILED = "The sentence table did not load. The numbers below are the reading, and there is no table sentence.";
  var ASKING_LOCATION = "Asking for your location…";
  var READY = "Reading ready.";
  var CITATION = "Weather and air-quality data from Open-Meteo (CAMS global air quality). Not an official government source.";

  var MATCH_NOTES = {
    exact: "Table match: this temperature, sky, and air combination.",
    weather_dropped: "Table match: this temperature and air, for any sky.",
    aqi_dropped: "Table match: this temperature, for any sky and any air.",
    generic: "Table match: the general sentence.",
    fallback: "Table match: none. This is the written fallback."
  };

  var AQI_CLASSES = {
    low: "aqi-low",
    moderate: "aqi-moderate",
    high: "aqi-high",
    very_high: "aqi-very_high"
  };

  var tablePromise = null;
  var bankPromise = null;
  var activeRequest = 0;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    if (typeof FeelLookup === "undefined" || !FeelLookup) return;

    var form = document.getElementById("place-form");
    if (!form) return;

    var input = document.getElementById("place-input");
    var locationButton = document.getElementById("use-location");
    var statusNode = document.getElementById("reading-status");
    var output = document.getElementById("reading-output");
    var choices = document.getElementById("place-choices");
    var submitButton = findSubmitButton(form, locationButton);
    var requestBusy = false;

    form.addEventListener("submit", onSubmit);
    if (submitButton) {
      submitButton.addEventListener("click", onSubmitClick);
    }
    if (locationButton) {
      locationButton.addEventListener("click", onLocation);
    }

    function setStatus(text) {
      if (statusNode) statusNode.textContent = text;
    }

    function setBusy(isBusy) {
      requestBusy = isBusy;
      if (submitButton) submitButton.disabled = isBusy;
      if (locationButton) locationButton.disabled = isBusy;
      if (!choices) return;
      var buttons = choices.querySelectorAll("button");
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].disabled = isBusy;
      }
    }

    function onSubmitClick(event) {
      if (requestBusy) return;
      var query = input && typeof input.value === "string" ? input.value.trim() : "";
      if (!query) {
        event.preventDefault();
        setStatus(EMPTY_PLACE);
      }
    }

    function onSubmit(event) {
      event.preventDefault();
      if (requestBusy) return;
      var query = input && typeof input.value === "string" ? input.value.trim() : "";
      if (!query) {
        setStatus(EMPTY_PLACE);
        return;
      }

      var serial = ++activeRequest;
      setBusy(true);
      setStatus(CHECKING);
      clearChildren(output);
      clearChildren(choices);

      var url = "https://geocoding-api.open-meteo.com/v1/search?name=" +
        encodeURIComponent(query) + "&count=5&language=en&format=json";

      fetch(url).then(function (response) {
        if (!response.ok) {
          console.error("geocoding");
          return { error: true };
        }
        return response.json().then(function (data) {
          return data || { error: true };
        }, function () {
          console.error("geocoding");
          return { error: true };
        });
      }).then(function (data) {
        if (serial !== activeRequest) return null;
        if (data && data.error === true && !Array.isArray(data.results)) {
          setStatus(PLACE_FAILED);
          clearChildren(output);
          clearChildren(choices);
          return null;
        }
        var results = data && Array.isArray(data.results) ? data.results : null;
        var place = results && results.length ? placeFromResult(results[0]) : null;
        if (!results || !place) {
          setStatus(NOT_FOUND);
          clearChildren(output);
          clearChildren(choices);
          return null;
        }
        fillChoices(results.slice(1, 5));
        setBusy(true);
        return renderReading(serial, place);
      }).catch(function () {
        console.error("geocoding");
        if (serial !== activeRequest) return;
        setStatus(PLACE_FAILED);
        clearChildren(output);
        clearChildren(choices);
      }).finally(function () {
        if (serial === activeRequest) setBusy(false);
      });
    }

    function onLocation(event) {
      if (event && typeof event.preventDefault === "function") event.preventDefault();
      if (requestBusy) return;
      if (!navigator.geolocation || typeof navigator.geolocation.getCurrentPosition !== "function") {
        setStatus(NO_GEO);
        return;
      }

      var serial = ++activeRequest;
      setBusy(true);
      setStatus(ASKING_LOCATION);
      clearChildren(output);
      clearChildren(choices);

      new Promise(function (resolve, reject) {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 0
        });
      }).then(function (position) {
        var coords = position && position.coords;
        var lat = coords ? coords.latitude : null;
        var lon = coords ? coords.longitude : null;
        if (!isFiniteNumber(lat) || !isFiniteNumber(lon)) {
          if (serial === activeRequest) setStatus(GEO_FAILED);
          return null;
        }
        var label = "Your current location";
        if (serial !== activeRequest) return null;
        return renderReading(serial, {
          lat: lat,
          lon: lon,
          label: label,
          bankKey: null
        });
      }).catch(function (error) {
        if (serial !== activeRequest) return;
        setStatus(locationFailureMessage(error));
      }).finally(function () {
        if (serial === activeRequest) setBusy(false);
      });
    }

    function fillChoices(results) {
      clearChildren(choices);
      if (!choices || !results) return;
      results.forEach(function (result) {
        var place = placeFromResult(result);
        if (!place) return;
        var lat = place.lat;
        var lon = place.lon;
        var label = place.label;
        var bankKey = place.bankKey;
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.addEventListener("click", function () {
          if (requestBusy) return;
          var serial = ++activeRequest;
          setBusy(true);
          setStatus(CHECKING);
          renderReading(serial, {
            lat: lat,
            lon: lon,
            label: label,
            bankKey: bankKey
          }).finally(function () {
            if (serial === activeRequest) setBusy(false);
          });
        });
        var item = document.createElement("li");
        item.appendChild(button);
        choices.appendChild(item);
      });
    }

    function renderReading(serial, place) {
      var weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude=" +
        encodeURIComponent(place.lat) + "&longitude=" + encodeURIComponent(place.lon) +
        "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature" +
        "&timezone=auto&temperature_unit=celsius&wind_speed_unit=kmh";
      var airUrl = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" +
        encodeURIComponent(place.lat) + "&longitude=" + encodeURIComponent(place.lon) +
        "&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone&timezone=auto";

      return Promise.resolve().then(function () {
        if (serial !== activeRequest) return null;
        setStatus(CHECKING);
        clearChildren(output);
        return Promise.all([
          fetchService(weatherUrl, "weather"),
          fetchService(airUrl, "air-quality"),
          loadStatic("/feel-table.json", "feel-table", "table"),
          loadStatic("/bank.json", "bank", "bank")
        ]);
      }).then(function (parts) {
        if (!parts || serial !== activeRequest) return;
        var weather = parts[0];
        var air = parts[1];
        var table = parts[2];
        var bank = parts[3];

        if (!weather.ok && !air.ok) {
          setStatus(BOTH_FAILED);
          clearChildren(output);
          return;
        }
        if (!weather.ok) {
          setStatus(WEATHER_FAILED);
          clearChildren(output);
          return;
        }

        var current = weather.data && weather.data.current && typeof weather.data.current === "object"
          ? weather.data.current
          : null;
        var tempC = finiteOrNull(current && current.temperature_2m);
        if (tempC === null) {
          setStatus(NO_TEMPERATURE);
          clearChildren(output);
          return;
        }

        var airCurrent = air.ok && air.data && air.data.current && typeof air.data.current === "object"
          ? air.data.current
          : null;
        var lookedUp = table ? lookupReading(table, {
          tempC: tempC,
          weatherCode: finiteOrNull(current.weather_code),
          windKmh: finiteOrNull(current.wind_speed_10m),
          humidityPct: finiteOrNull(current.relative_humidity_2m),
          usAqi: air.ok ? finiteOrNull(airCurrent && airCurrent.us_aqi) : null
        }) : { feel: "", advice: "", match: "", aqiBand: null };

        paintReading(output, {
          label: place.label,
          lookedUp: lookedUp,
          bankText: bankNote(bank, place.bankKey),
          current: current,
          weatherData: weather.data,
          airCurrent: air.ok ? airCurrent : null,
          tempC: tempC
        });

        if (!table) setStatus(TABLE_FAILED);
        else setStatus(air.ok ? READY : AIR_FAILED);
      }).catch(function () {
        if (serial !== activeRequest) return;
        console.error("weather");
        setStatus(BOTH_FAILED);
        clearChildren(output);
      });
    }
  }

  function findSubmitButton(form, locationButton) {
    var explicit = form.querySelector("button[type='submit'], input[type='submit']");
    if (explicit) return explicit;
    var controls = form.querySelectorAll("button");
    for (var i = 0; i < controls.length; i++) {
      if (controls[i] === locationButton) continue;
      if (controls[i].type === "button") continue;
      return controls[i];
    }
    return null;
  }

  function placeFromResult(result) {
    if (!result || typeof result !== "object") return null;
    if (!isFiniteNumber(result.latitude) || !isFiniteNumber(result.longitude)) return null;
    if (typeof result.name !== "string" || !result.name) return null;

    var parts = [result.name];
    if (typeof result.admin1 === "string" && result.admin1) parts.push(result.admin1);
    if (typeof result.country_code === "string" && result.country_code) parts.push(result.country_code);

    var bankKey = null;
    if (typeof result.country_code === "string" && result.country_code) {
      bankKey = result.name + ", " + result.country_code;
    }

    return {
      lat: result.latitude,
      lon: result.longitude,
      label: parts.join(", "),
      bankKey: bankKey
    };
  }

  function locationFailureMessage(error) {
    var code = error && typeof error.code === "number" ? error.code : 0;
    if (code === 1) return GEO_DENIED;
    if (code === 3) return GEO_TIMEOUT;
    return GEO_FAILED;
  }

  function lookupReading(table, reading) {
    var bands = {
      temp: callOrNull(function () { return FeelLookup.tempBand(reading.tempC); }),
      weather: callOrNull(function () {
        return FeelLookup.weatherBand({
          weatherCode: reading.weatherCode,
          windSpeedKmh: reading.windKmh,
          humidityPct: reading.humidityPct,
          tempC: reading.tempC
        });
      }),
      aqi: callOrNull(function () { return FeelLookup.aqiBand(reading.usAqi); })
    };

    try {
      var result = FeelLookup.lookupFeel(table || {}, bands);
      if (result && typeof result.feel === "string" && result.feel.trim()) {
        return {
          feel: result.feel,
          advice: typeof result.advice === "string" ? result.advice : "",
          match: result.match,
          aqiBand: bands.aqi
        };
      }
    } catch (err) {
      console.error("feel-table");
    }

    return {
      feel: fallbackFeel(),
      advice: fallbackAdvice(),
      match: "fallback",
      aqiBand: bands.aqi
    };
  }

  function fallbackFeel() {
    var fallback = FeelLookup.WRITTEN_FALLBACK;
    if (typeof fallback === "string") return fallback;
    if (fallback && typeof fallback.feel === "string") return fallback.feel;
    return "";
  }

  function fallbackAdvice() {
    var fallback = FeelLookup.WRITTEN_FALLBACK;
    if (fallback && typeof fallback === "object" && typeof fallback.advice === "string") return fallback.advice;
    return "";
  }

  function paintReading(output, reading) {
    if (!output) return;
    clearChildren(output);

    output.appendChild(el("p", "place-name", reading.label));

    if (reading.lookedUp.feel) {
      output.appendChild(el("p", "feel-sentence", reading.lookedUp.feel));
    }

    if (typeof reading.lookedUp.advice === "string" && reading.lookedUp.advice.trim()) {
      output.appendChild(el("p", "feel-advice", reading.lookedUp.advice));
    }

    var matchNote = MATCH_NOTES[reading.lookedUp.match];
    if (matchNote && reading.lookedUp.feel) {
      output.appendChild(el("p", "match-note", matchNote));
    }

    if (reading.bankText) {
      var note = el("p", "bank-note", "");
      var prefix = document.createElement("strong");
      prefix.textContent = "Saved note. ";
      note.appendChild(prefix);
      note.appendChild(document.createTextNode(reading.bankText));
      output.appendChild(note);
    }

    var facts = el("dl", "facts", "");
    var current = reading.current || {};
    addFact(facts, "Temperature", formatTemperature(reading.tempC));
    addFact(facts, "Feels like", formatTemperature(finiteOrNull(current.apparent_temperature)));
    addFact(facts, "Humidity", formatHumidity(finiteOrNull(current.relative_humidity_2m)));
    addFact(facts, "Wind", formatWind(finiteOrNull(current.wind_speed_10m)));
    addFact(facts, "Weather", weatherText(finiteOrNull(current.weather_code)));

    var aqiNumber = reading.airCurrent ? finiteOrNull(reading.airCurrent.us_aqi) : null;
    if (aqiNumber !== null) {
      addFact(facts, "US AQI", formatAqi(aqiNumber), AQI_CLASSES[reading.lookedUp.aqiBand] || "");
    }
    if (reading.airCurrent) {
      addFact(facts, "PM2.5", formatPollutant(finiteOrNull(reading.airCurrent.pm2_5)));
      addFact(facts, "PM10", formatPollutant(finiteOrNull(reading.airCurrent.pm10)));
      addFact(facts, "Nitrogen dioxide", formatPollutant(finiteOrNull(reading.airCurrent.nitrogen_dioxide)));
      addFact(facts, "Ozone", formatPollutant(finiteOrNull(reading.airCurrent.ozone)));
    }
    addFact(facts, "Observed", formatObserved(current.time, reading.weatherData));
    output.appendChild(facts);
    output.appendChild(el("p", "citation", CITATION));
  }

  function weatherText(code) {
    if (code === null || typeof FeelLookup.weatherLabel !== "function") return null;
    var label = callOrNull(function () { return FeelLookup.weatherLabel(code); });
    if (typeof label !== "string" || !label.trim()) return null;
    return label;
  }

  function formatAqi(value) {
    var numberText = formatQuantity(value);
    if (!numberText) return null;
    var category = null;
    if (typeof FeelLookup.aqiCategory === "function") {
      category = callOrNull(function () { return FeelLookup.aqiCategory(value); });
    }
    if (typeof category === "string" && category.trim()) {
      return numberText + " (" + category + ")";
    }
    return numberText;
  }

  function formatObserved(time, weatherData) {
    if (typeof time !== "string" || !time) return null;
    var zone = null;
    if (weatherData && typeof weatherData.timezone_abbreviation === "string" && weatherData.timezone_abbreviation) {
      zone = weatherData.timezone_abbreviation;
    } else if (weatherData && typeof weatherData.timezone === "string" && weatherData.timezone) {
      zone = weatherData.timezone;
    }
    return zone ? time + " " + zone : time;
  }

  function formatTemperature(celsius) {
    if (celsius === null) return null;
    var fahrenheit = Math.round(celsius * 9 / 5 + 32);
    return formatQuantity(celsius) + "°C (" + fahrenheit + "°F)";
  }

  function formatHumidity(value) {
    if (value === null) return null;
    return formatQuantity(value) + "%";
  }

  function formatWind(kmh) {
    if (kmh === null) return null;
    var mph = Math.round(kmh * 0.621371);
    return formatQuantity(kmh) + " km/h (" + mph + " mph)";
  }

  function formatPollutant(value) {
    if (value === null) return null;
    return formatQuantity(value) + " µg/m³";
  }

  function formatQuantity(value) {
    if (!isFiniteNumber(value)) return null;
    var rounded = Math.round(value * 100) / 100;
    if (Object.is(rounded, -0)) rounded = 0;
    if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
    return rounded.toFixed(2).replace(/0$/, "");
  }

  function addFact(list, label, value, valueClass) {
    if (value === null || value === undefined || value === "") return;
    var term = el("dt", "", label);
    var detail = el("dd", valueClass || "", value);
    list.appendChild(term);
    list.appendChild(detail);
  }

  function bankNote(bank, bankKey) {
    if (!bankKey || !bank || typeof bank !== "object") return null;
    if (!Object.prototype.hasOwnProperty.call(bank, bankKey)) return null;
    var entry = bank[bankKey];
    if (!entry || typeof entry.text !== "string") return null;
    var text = entry.text.trim();
    return text ? text : null;
  }

  function fetchService(url, serviceName) {
    return fetch(url).then(function (response) {
      if (!response.ok) {
        console.error(serviceName);
        return { ok: false };
      }
      return response.json().then(function (data) {
        if (!data || typeof data !== "object" || data.error === true) {
          console.error(serviceName);
          return { ok: false };
        }
        return { ok: true, data: data };
      });
    }).catch(function () {
      console.error(serviceName);
      return { ok: false };
    });
  }

  function loadStatic(url, serviceName, slot) {
    var existing = slot === "table" ? tablePromise : bankPromise;
    if (existing) return existing;

    var promise = fetch(url).then(function (response) {
      if (!response.ok) return null;
      return response.json();
    }).then(function (data) {
      if (!data || typeof data !== "object") {
        console.error(serviceName);
        clearStaticSlot(slot);
        return null;
      }
      return data;
    }).catch(function () {
      console.error(serviceName);
      clearStaticSlot(slot);
      return null;
    });

    if (slot === "table") tablePromise = promise;
    if (slot === "bank") bankPromise = promise;
    return promise;
  }

  function clearStaticSlot(slot) {
    if (slot === "table") tablePromise = null;
    if (slot === "bank") bankPromise = null;
  }

  function callOrNull(fn) {
    try {
      return fn();
    } catch (err) {
      return null;
    }
  }

  function finiteOrNull(value) {
    return isFiniteNumber(value) ? value : null;
  }

  function isFiniteNumber(value) {
    return typeof value === "number" && isFinite(value);
  }

  function clearChildren(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
})();
