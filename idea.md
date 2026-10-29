# Idea: aircheck.fyi — How It Feels Right Now

**Date:** 2026-10-29  
**Source of friction:** People want a quick, trustworthy sense of how a place will feel right now (air quality + temperature + weather) without accounts, tracking, or apps.  
**Who has the problem:** Anyone deciding whether to go outside, exercise, or plan an activity.  
**What they currently do:** Check multiple weather and AQI sites or apps that mix data with accounts and ads.  
**Why a small site could help:** Single-purpose, client-side, source-cited, privacy-first “human feel” summary.

**One-sentence hypothesis:** A pure client-side page at aircheck.fyi that accepts a location or one-time geolocation, combines free Open-Meteo weather + air-quality data, and looks up a granular deterministic “how a human would feel” table will be useful and stay low-ops.

**Validation plan (time-boxed):**  
- Confirm combined weather + air-quality fetches work client-side.  
- Prototype deterministic template summary.  
- Seed a small bank of richer narratives for major cities.  
- Verify static HTML remains informative and includes contribution link.

**Kill criteria specific to this idea:**  
- Primary free APIs become unreliable or break CORS.  
- Deterministic summary feels too crude and bank maintenance exceeds value.  
- Usage stays negligible after launch window.  
- A better free official single-page viewer already exists.

**Notes:**  
Core “feel” summary is always deterministic (templates + live data). Richer narrative comes only from the public bank (generated at most once per location). Nothing user-specific is stored. Contribution link is prominent; other monetization slots are carved in but inactive. Aligns with portfolio rules.