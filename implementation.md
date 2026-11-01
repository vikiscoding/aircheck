# Implementation Instructions: aircheck.fyi

**Last updated:** 2026-10-29  
**Purpose:** Detailed instructions for an agentic AI or developer to build the site.

## Core product rules (must not be violated)
- Pure client-side for all user data. Location is never stored. A Fitzpatrick skin type is saved in localStorage only after an explicit Remember choice, and it is never sent. No cookies, no analytics.
- Geolocation is one-time, explicit, and discarded after the request.
- Core “how it feels” result always comes from the deterministic feel-table + live Open-Meteo data. No AI on the request path.
- Static HTML must remain fully informative with JavaScript disabled.
- Prominent contribution link. Monetization slots carved in but inactive.
- Source citation and timestamp always visible.
- Cloudflare Pages, apex domain aircheck.fyi, public GitHub preferred.

## 1. Project structure
```
/
├── index.html              # Static shell (readable without JS)
├── feel-table.json         # Deterministic lookup table
├── bank.json               # Optional richer narratives (seed only)
├── app.js                  # Client-side logic
├── style.css               # Minimal, clean styling
├── README.md
└── _headers                # Optional Cloudflare headers
```

## 2. Static HTML shell (`index.html`)
Must contain, before any script runs:
- Title and one-paragraph explanation of what the page does.
- One worked example (e.g. “Mild, clear, low AQI → comfortable for outdoor activity”).
- Privacy statement: no accounts, no history, geolocation never stored, no tracking.
- Prominent contribution link: “Support this free tool”.
- Monetization placeholders (commented or visually hidden).
- Source attribution line: Open-Meteo + CAMS.
- Form: place-name input + “Use my location” button.
- Empty result container that JS will fill.

## 3. Deterministic feel-table (`feel-table.json`)
Key format: `${temp}|${weather}|${aqi}`

Bands:
- Temperature: freezing (<0), cold (0–10), cool (10–18), mild (18–24), warm (24–30), hot (30–35), very_hot (>35)
- Weather/comfort: clear_dry, cloudy, light_rain, heavy_rain, stormy, windy, humid, foggy
- AQI: low (0–50), moderate (51–100), high (101–150), very_high (151+)

Each entry:
```json
{
  "mild|clear_dry|low": {
    "feel": "Mild, clear and dry with low air-quality risk — comfortable for most people.",
    "advice": "Ideal for walking, cycling or outdoor sports."
  }
}
```

Implement fallback chain in code: exact → drop weather → drop AQI → generic.  
Seed at least 30–40 common combinations.

## 4. Client-side logic (`app.js`)
1. “Use my location” → `navigator.geolocation.getCurrentPosition` (never store coordinates).
2. Place-name submit → Open-Meteo geocoding API → lat/lon + name + country.
3. Fetch in parallel:
   - Weather: `https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature,uv_index,uv_index_clear_sky,cloud_cover&timezone=auto`
   - Air quality: `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=...&longitude=...&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone&timezone=auto`
4. Compute the three bands. A separate written rule turns the UV index into a sun line when the rounded index is 3 or higher. Burn time uses the cloud-adjusted `uv_index`. A Fitzpatrick type, if the visitor set one, only refines that range. Clear-sky UV is a displayed number and is not used when `uv_index` is missing. A heat line uses apparent temperature and the same temperature bands, and it appears only when that band is hotter than the air-temperature band. One activity line names the first matching limit: stormy, heavy precipitation, very high US AQI, then heat when the feels-like band is hot or very hot and hotter than the air. The result card is labeled Limiting conditions or Easier conditions only when that written rule matches. A missing UV or AQI number cannot make the easier tint.
5. Look up feel-table (with fallback). The table keys stay temperature, weather, and air quality.
6. Render place name, the card label when the tone rule matches, feel sentence + advice, the heat line, the activity line, the sun line when the UV index is 3 or higher, three glance tiles (feels like, US AQI, UV index) for the numbers that came back, simple facts, a readable timestamp, citation, then a share link for a geocoded place and the contribution link.
   - A share link is `/?place=<label>&id=<Open-Meteo place id>`. On load, a valid `id` is looked up with the geocoding `get` endpoint. Otherwise `place` is searched. Coordinates never go in a link, and a geolocation reading has no link.
7. Optionally append one offer line from `offer-table.json`. `cover` wins for `stormy` or `heavy_rain`. Next, `air` wins when the US AQI band is high or very high. Otherwise `sun` wins when the UV band is moderate or higher. The line renders only when that row has a sentence, a label, and an `https` link. Skin type and place are not part of the key.
8. Optionally append bank.json entry if present.
9. A sponsor line renders in the support section only when `sponsor.json` has a name, an `https` link, and an `until` date that is today or later.

## 4b. City pages
- `cities.json` lists slug, name, country, and Open-Meteo place id.
- `scripts/refresh-cities.mjs` fetches 2023–2025 hourly US AQI and UV (air-quality API) and daily apparent temperature max (archive API), and saves a monthly summary per city in `data/cities/`.
- `scripts/build-cities.mjs` writes `city-pages/<slug>.html`, the home city list, and `sitemap.xml`. The live form is copied from the `reading:start`/`reading:end` block in `index.html`. Deploy copies the city pages to the site root, so `/delhi` serves `delhi.html`.
- A city page sets `<main data-place-id>`, and `app.js` loads that place's live reading. Sentences come from fixed rules in `scripts/city-stats.js`. Every number in the yearly section must appear in that city's data file. There is no hour-of-day sentence, because US AQI averages particles over 24 hours.

## 5. Simple facts display
Always show alongside the feel sentence:
- Temperature / feels-like
- Humidity
- Wind
- Weather condition (from weather_code)
- UV index, when the reading includes it
- Clear-sky UV, when the reading includes it
- Cloud cover, when the reading includes it
- US AQI + category
- Key pollutants if available
- Observation time

## 6. Contribution & monetization
- Contribution link visible in footer and near result.
- `offer-table.json` has three universal rows, `cover`, `air`, and `sun`. Leave `label` and `href` empty until a brand link exists. An empty link renders nothing.
- `sponsor.json` holds one name, one `https` link, and an inclusive `until` date (`YYYY-MM-DD`). An empty record renders nothing.
- No ad script and no tracker. The lines are ordinary links.

## 7. Privacy & static fallback
- Privacy statement in static HTML.
- Page remains informative with JS disabled.
- No cookies and no third-party analytics. A first-party visit counter at `/api/visits` adds one count for a browser session and skips known bots. It stores no place, no coordinates, and no skin type. Location is never stored. Skin type is stored only after an explicit Remember choice.

## 8. Deployment
- Cloudflare Pages → aircheck.fyi (apex).
- Public GitHub repo.
- Optional long cache on JSON files.

## 9. Attribution (required)
Visible text: “Weather and air-quality data from Open-Meteo (CAMS global air quality). Not an official government source.”

## 10. MVP acceptance criteria
- Location input or geolocation works.
- Feel sentence from table + simple facts + timestamp + citation are shown.
- No AI calls on the request path.
- Static HTML is informative.
- Contribution link is prominent.
- Location is never stored. A skin type is stored only after an explicit Remember choice, and it is never sent.
- Deployed to aircheck.fyi.
