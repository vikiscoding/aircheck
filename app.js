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
  var TABLE_FAILED = "No sentence loaded. The numbers below are the reading.";
  var ASKING_LOCATION = "Asking for your location…";
  var CITATION = "Weather and air-quality data from Open-Meteo (CAMS global air quality). Not an official government source.";

  var AQI_CLASSES = {
    low: "aqi-low",
    moderate: "aqi-moderate",
    high: "aqi-high",
    very_high: "aqi-very_high"
  };

  var tablePromise = null;
  var bankPromise = null;
  var activeRequest = 0;

  document.addEventListener("DOMContentLoaded", function () {
    countVisit();
    init();
  });

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
    var skinSelect = document.getElementById("skin-type");
    var rememberSkin = document.getElementById("remember-skin");
    var lastPaint = null;
    var requestBusy = false;

    restoreSkin();
    if (skinSelect) skinSelect.addEventListener("change", onSkinChange);
    if (rememberSkin) rememberSkin.addEventListener("change", onSkinChange);

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

    function chosenSkin() {
      var value = skinSelect && typeof skinSelect.value === "string" ? skinSelect.value : "";
      return /^(I|II|III|IV|V|VI)$/.test(value) ? value : "";
    }

    function readStoredSkin() {
      try {
        var value = localStorage.getItem("aircheck-skin-type");
        return /^(I|II|III|IV|V|VI)$/.test(value) ? value : "";
      } catch (err) {
        return "";
      }
    }

    function restoreSkin() {
      var stored = readStoredSkin();
      if (!stored || !skinSelect) return;
      skinSelect.value = stored;
      if (rememberSkin) rememberSkin.checked = true;
    }

    function onSkinChange() {
      var type = chosenSkin();
      if (rememberSkin && !type) rememberSkin.checked = false;
      try {
        if (rememberSkin && rememberSkin.checked && type) localStorage.setItem("aircheck-skin-type", type);
        else localStorage.removeItem("aircheck-skin-type");
      } catch (err) {
        // Private browsing can refuse storage. The choice still lasts for this page.
      }
      if (!lastPaint) return;
      lastPaint.skinType = type;
      paintReading(output, lastPaint);
    }

    function clearChoices() {
      clearChildren(choices);
      var label = document.getElementById("choices-label");
      if (label) label.hidden = true;
    }

    function showChoicesLabel() {
      var label = document.getElementById("choices-label");
      if (!label || !choices) return;
      label.hidden = choices.children.length === 0;
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
      clearChoices();

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
          clearChoices();
          return null;
        }
        var results = data && Array.isArray(data.results) ? data.results : null;
        var place = results && results.length ? placeFromResult(results[0]) : null;
        if (!results || !place) {
          setStatus(NOT_FOUND);
          clearChildren(output);
          clearChoices();
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
        clearChoices();
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
      clearChoices();

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
      clearChoices();
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
      showChoicesLabel();
    }

    function renderReading(serial, place) {
      var weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude=" +
        encodeURIComponent(place.lat) + "&longitude=" + encodeURIComponent(place.lon) +
        "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature,uv_index,uv_index_clear_sky,cloud_cover" +
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

        lastPaint = {
          label: place.label,
          lookedUp: lookedUp,
          bankText: bankNote(bank, place.bankKey),
          current: current,
          weatherData: weather.data,
          airCurrent: air.ok ? airCurrent : null,
          tempC: tempC,
          skinType: chosenSkin()
        };
        paintReading(output, lastPaint);

        if (!table) setStatus(TABLE_FAILED);
        else if (!air.ok) setStatus(AIR_FAILED);
        else setStatus("");
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
    if (typeof result.admin1 === "string" && result.admin1 && result.admin1 !== result.name) {
      parts.push(result.admin1);
    }
    var country = "";
    if (typeof result.country === "string" && result.country) country = result.country;
    else if (typeof result.country_code === "string" && result.country_code) country = result.country_code;
    if (country && country !== result.name && country !== result.admin1) parts.push(country);

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

    var currentForSun = reading.current || {};
    var uvIndex = finiteOrNull(currentForSun.uv_index);
    if (uvIndex === null) {
      output.appendChild(el("p", "sun-note", "UV did not load. The sun line was not estimated."));
    } else if (typeof FeelLookup.sunLine === "function") {
      var sun = callOrNull(function () { return FeelLookup.sunLine(uvIndex, reading.skinType); });
      if (sun && typeof sun.sentence === "string" && sun.sentence) {
        output.appendChild(el("p", "sun-sentence", sun.sentence));
      }
    }

    if (reading.bankText) {
      output.appendChild(el("p", "bank-note", reading.bankText));
    }

    var facts = el("dl", "facts", "");
    var current = reading.current || {};
    addFact(facts, "Temperature", formatTemperature(reading.tempC));
    addFact(facts, "Feels like", formatTemperature(finiteOrNull(current.apparent_temperature)));
    addFact(facts, "Humidity", formatHumidity(finiteOrNull(current.relative_humidity_2m)));
    addFact(facts, "Wind", formatWind(finiteOrNull(current.wind_speed_10m)));
    addFact(facts, "Weather", weatherText(finiteOrNull(current.weather_code)));
    if (uvIndex !== null) addFact(facts, "UV index", formatQuantity(uvIndex));
    addFact(facts, "Clear-sky UV", formatQuantity(finiteOrNull(current.uv_index_clear_sky)));
    var cloudCover = finiteOrNull(current.cloud_cover);
    if (cloudCover !== null) addFact(facts, "Cloud cover", formatQuantity(cloudCover) + "%");

    var aqiNumber = reading.airCurrent ? finiteOrNull(reading.airCurrent.us_aqi) : null;
    if (aqiNumber !== null) {
      addFact(facts, "US AQI", formatAqi(aqiNumber), AQI_CLASSES[reading.lookedUp.aqiBand] || "");
    }
    addFact(facts, "Weather time", formatObserved(current.time, reading.weatherData));
    output.appendChild(facts);

    if (reading.airCurrent) {
      var pollutantList = el("dl", "facts", "");
      addFact(pollutantList, "PM2.5", formatPollutant(finiteOrNull(reading.airCurrent.pm2_5)));
      addFact(pollutantList, "PM10", formatPollutant(finiteOrNull(reading.airCurrent.pm10)));
      addFact(pollutantList, "Nitrogen dioxide", formatPollutant(finiteOrNull(reading.airCurrent.nitrogen_dioxide)));
      addFact(pollutantList, "Ozone", formatPollutant(finiteOrNull(reading.airCurrent.ozone)));
      if (pollutantList.childNodes.length) {
        var details = el("details", "pollutants", "");
        details.appendChild(el("summary", "", "More air readings"));
        details.appendChild(pollutantList);
        output.appendChild(details);
      }
    }

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

  function countVisit() {
    var node = document.getElementById("visit-count");
    if (!node) return;
    if (document.prerendering) {
      document.addEventListener("prerenderingchange", countVisit, { once: true });
      return;
    }

    var countedKey = "aircheck-visit";
    var already = false;
    try {
      already = sessionStorage.getItem(countedKey) === "1";
    } catch (err) {
      already = false;
    }
    var automated = navigator.webdriver === true;
    var method = already || automated ? "GET" : "POST";

    fetch("/api/visits", {
      method: method,
      headers: { accept: "application/json" }
    }).then(function (response) {
      if (!response.ok) throw new Error("visits");
      return response.json();
    }).then(function (data) {
      if (!data || typeof data.count !== "number" || !isFinite(data.count) || data.count < 0) {
        throw new Error("visits");
      }
      node.textContent = formatVisits(data.count);
      if (method === "POST" && data.counted === true) {
        try {
          sessionStorage.setItem(countedKey, "1");
        } catch (err) {
          // The count was recorded. This tab may count once more if storage is blocked.
        }
      }
    }).catch(function () {
      node.textContent = "Visit count did not load.";
    });
  }

  function formatVisits(count) {
    var whole = Math.floor(count);
    var text = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return text + (whole === 1 ? " visit" : " visits");
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
