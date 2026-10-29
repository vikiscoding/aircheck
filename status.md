# Status: aircheck.fyi

**URL:** https://aircheck.fyi
**Stage:** Live
**Last updated:** 2026-10-29

## Current state
https://aircheck.fyi and https://www.aircheck.fyi serve Cloudflare Pages project `aircheck` on the vikrant.singh1@outlook.com account. The pages.dev hostname is https://aircheck-c4s.pages.dev. GitHub Actions on `main` runs the lookup test and publishes the public files. The repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set. The support links open the Stripe payment page. Advertising and sponsorship stay off.

## Next concrete action
- Grow the optional city bank with an offline script when a place needs a saved note.

## Key decisions
- Hostname: aircheck.fyi (apex).
- Core is deterministic: Open-Meteo weather + air quality → compute bands → direct lookup in granular static feel-table → sentence + citations.
- Feel-table covers temperature × weather/comfort × AQI bands (hundreds of combinations, with fallbacks).
- Optional richer bank is secondary and not required for MVP.
- Client-side only for user inputs (geolocation never stored, no accounts, no history).
- Prominent contribution link; monetization placeholders present but not activated.
- Shared stack: Cloudflare Pages, static HTML/JS, public GitHub preferred.

## Metrics / signals
- Usage: live at https://aircheck.fyi
- Cost: Low (static + domain)
- Freshness: Live Open-Meteo data; bank entries dated 2026-10-29.

## Open issues
- Bank growth process (offline script preferred).

## Kill check
- Meets any kill criteria? No
- Notes: Apex, www, and the GitHub Actions deploy are in place.
