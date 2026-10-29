# Feasibility Panel & Build Plan: aircheck.fyi — How It Feels Right Now

**Date:** 2026-10-29  
**Panel purpose:** Determine the sustainable way to deliver an overall “human feel” summary (air + temperature + weather) with minimal AI calls, location input or device geolocation, a prominent contribution link, and carved-in monetization options.

## Feasibility verdict
**High.** Open-Meteo supplies both weather and air quality client-side with no key. A deterministic template can always produce a useful short summary. The bank is used only for richer optional narrative, generated at most once per location. Contribution and monetization slots fit cleanly without breaking privacy or low-ops rules.

## Recommended architecture
1. **Static shell (works without JS)**  
   - Short explanation of what the page does.  
   - One worked example of a “how it feels” summary.  
   - Source links + Open-Meteo / CAMS attribution.  
   - Privacy statement.  
   - Prominent contribution link (“Support this free tool”).  
   - Empty / commented monetization placeholders (affiliates, sponsorship).

2. **Location**  
   - Text input for place / city / postal code.  
   - Clear “Use my location” button → one-time geolocation (never stored).  
   - Resolve via Open-Meteo geocoding API to lat/lon + canonical place name.

3. **Deterministic core (zero AI)**  
   - Fetch current weather + air quality from Open-Meteo.  
   - Compute three bands: temperature, weather/comfort, US AQI.  
   - Direct lookup in static granular feel-table (`/feel-table.json`).  
   - Render the matched sentence + advice, raw numbers, timestamp and citations.  
   - Fallback chain if exact combination is missing.  
   - This is always shown and is the primary experience.

4. **Bank for richer narrative (minimal AI)**  
   - Key: normalized place string (e.g. “Toronto, CA”).  
   - Client looks up static `/bank.json` (or individual files).  
   - Hit → show the stored richer paragraph.  
   - Miss → show only the deterministic summary.  
   - Growth: offline script generates once, commits, redeploys. Optional Worker+KV later for automatic accumulation.  
   - No live LLM on the request path.

5. **Stack**  
   - Cloudflare Pages on aircheck.fyi.  
   - Public GitHub.  
   - No user storage, no analytics by default.

## Monetization (carved in, not activated)
- Prominent contribution link (Buy Me a Coffee or equivalent).  
- Placeholder sections for future non-tracking affiliates or sponsorship — present in markup but inactive.

## MVP
- Static page with explanation, worked example, privacy, contribution link.  
- Client-side location or geolocation → Open-Meteo fetch → deterministic feel summary.  
- Bank lookup stub (seed 5–10 cities).  
- Deploy.

**Conclusion:** The broader “human feel” scope is feasible and more useful while remaining deterministic for the core and bank-sourced for optional richness. Minimal AI calls are preserved by design.