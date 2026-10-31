# Status: aircheck.fyi

**URL:** https://aircheck.fyi
**Stage:** Live
**Last updated:** 2026-10-31

## Current state
https://aircheck.fyi and https://www.aircheck.fyi serve Cloudflare Pages project `aircheck` on the vikrant.singh1@outlook.com account. The pages.dev hostname is https://aircheck-c4s.pages.dev. GitHub Actions on `main` runs the lookup test and publishes the public files. The repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set. The support links open the Stripe payment page. The offer table has cover, air, and sun rows, and the sponsor record is present. Both render nothing until a row has an https link. Advertising and sponsorship stay off while those links are empty. A reading is the table sentence, three glance tiles (feels like, US AQI, UV index), the weather, UV, cloud, and air numbers, a readable weather time, the Open-Meteo citation, a contribution link, and a share link for a typed place. A share link carries the place name and the Open-Meteo place id, never coordinates. The page has an Open Graph image and question-style explainer sections. A heat line appears when the feels-like band is hotter than the air-temperature band. One activity line names the first limit among a storm, heavy precipitation, a very high US AQI band, and that heat. The result card is tinted and labeled only for limiting conditions or easier conditions. When the UV index is 3 or higher, a written rule adds a burn-time range. A Fitzpatrick skin type stays on the device and is saved only if the visitor chooses Remember. The site files do not load a third-party analytics script. A first-party visit counter adds one count for a browser session and skips known bots. It stores no place, no coordinates, and no skin type. Cloudflare may still inject Web Analytics until that account setting is switched off. The city bank is empty until a place needs a saved note.

## Next concrete action
- Grow the optional city bank with an offline script when a place needs a saved note.

## Key decisions
- Hostname: aircheck.fyi (apex).
- Core is deterministic: Open-Meteo weather, UV, cloud cover, and air quality → compute bands → direct lookup in the feel table, plus a written UV burn-time rule, a heat line, and one activity line → sentence + citations. The result card is tinted only at the two written ends.
- Feel-table covers temperature × weather/comfort × AQI bands (hundreds of combinations, with fallbacks).
- Optional richer bank is secondary and not required for MVP.
- Client-side only for user inputs. Geolocation is never stored. Skin type is stored only after an explicit Remember choice. No accounts, no history.
- Prominent contribution link, also shown under each reading. The offer table has three universal rows, cover, air, and sun, and renders a line only after a label and an https link are filled. The sponsor record renders one credit only while its until date is current. No ad script.
- Shared stack: Cloudflare Pages, static HTML/JS, public GitHub preferred.

## Metrics / signals
- Usage: live at https://aircheck.fyi
- Cost: Low (static + domain)
- Freshness: Live Open-Meteo data. The city bank has no saved notes.

## Open issues
- Bank growth process (offline script preferred).
- www.aircheck.fyi serves a 200 copy of the page. The canonical tag points at the apex. A Cloudflare redirect rule from www to the apex is still to do.

## Kill check
- Meets any kill criteria? No
- Notes: Apex, www, and the GitHub Actions deploy are in place.
