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
4. Compute the three bands. A separate written rule turns the UV index into a sun line when the rounded index is 3 or higher. Burn time uses the cloud-adjusted `uv_index`. A Fitzpatrick type, if the visitor set one, only refines that range. Clear-sky UV is a displayed number and is not used when `uv_index` is missing.
5. Look up feel-table (with fallback). The table keys stay temperature, weather, and air quality.
6. Render place name, feel sentence + advice, the sun line when the UV index is 3 or higher, simple facts, timestamp, citation.
7. Optionally append bank.json entry if present.

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
- Monetization placeholders present but inactive (no ads, no tracking).

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
