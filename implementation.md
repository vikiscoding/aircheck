# Implementation Instructions: aircheck.fyi

**Last updated:** 2026-10-29  
**Purpose:** Detailed instructions for an agentic AI or developer to build the site.

## Core product rules (must not be violated)
- Pure client-side for all user data. Nothing about the user is stored (no localStorage of location, no cookies, no analytics by default).
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
   - Weather: `https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature&timezone=auto`
   - Air quality: `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=...&longitude=...&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone&timezone=auto`
4. Compute the three bands.
5. Look up feel-table (with fallback).
6. Render place name, feel sentence + advice, simple facts, timestamp, citation.
7. Optionally append bank.json entry if present.

## 5. Simple facts display
Always show alongside the feel sentence:
- Temperature / feels-like
- Humidity
- Wind
- Weather condition (from weather_code)
- US AQI + category
- Key pollutants if available
- Observation time

## 6. Contribution & monetization
- Contribution link visible in footer and near result.
- Monetization placeholders present but inactive (no ads, no tracking).

## 7. Privacy & static fallback
- Privacy statement in static HTML.
- Page remains informative with JS disabled.
- No localStorage, cookies, or analytics.

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
- Nothing about the user is stored.
- Deployed to aircheck.fyi.
