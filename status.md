# Status: aircheck.fyi

**URL:** https://aircheck.fyi
**Stage:** Live
**Last updated:** 2026-10-29

## Current state
https://aircheck.fyi and https://www.aircheck.fyi serve Cloudflare Pages project `aircheck` on the vikrant.singh1@outlook.com account. The pages.dev hostname is https://aircheck-c4s.pages.dev. GitHub Actions on `main` runs the lookup test and publishes the public files. The repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set. The support links open the Stripe payment page. Advertising and sponsorship stay off. A reading is the table sentence, the weather, UV, cloud, and air numbers, the weather time, and the Open-Meteo citation. When the UV index is 3 or higher, a written rule adds a burn-time range. A Fitzpatrick skin type stays on the device and is saved only if the visitor chooses Remember. The site files do not load an analytics script. Cloudflare may still inject Web Analytics until that account setting is switched off. The city bank is empty until a place needs a saved note.

## Next concrete action
- Grow the optional city bank with an offline script when a place needs a saved note.

## Key decisions
- Hostname: aircheck.fyi (apex).
- Core is deterministic: Open-Meteo weather, UV, cloud cover, and air quality → compute bands → direct lookup in the feel table, plus a written UV burn-time rule → sentence + citations.
- Feel-table covers temperature × weather/comfort × AQI bands (hundreds of combinations, with fallbacks).
- Optional richer bank is secondary and not required for MVP.
- Client-side only for user inputs. Geolocation is never stored. Skin type is stored only after an explicit Remember choice. No accounts, no history.
- Prominent contribution link; monetization placeholders present but not activated.
- Shared stack: Cloudflare Pages, static HTML/JS, public GitHub preferred.

## Metrics / signals
- Usage: live at https://aircheck.fyi
- Cost: Low (static + domain)
- Freshness: Live Open-Meteo data. The city bank has no saved notes.

## Open issues
- Bank growth process (offline script preferred).

## Kill check
- Meets any kill criteria? No
- Notes: Apex, www, and the GitHub Actions deploy are in place.
