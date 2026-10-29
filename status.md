# Status: aircheck.fyi

**URL:** https://aircheck.fyi
**Stage:** Deployed to Cloudflare Pages; custom hostname DNS is still pending
**Last updated:** 2026-10-29

## Current state
The public site is deployed to Cloudflare Pages project `aircheck` on the vikrant.singh1@outlook.com account. Production deployment is https://aircheck-c4s.pages.dev. The hostnames aircheck.fyi and www.aircheck.fyi are attached to the project and waiting on DNS. The Wrangler login on this machine can publish Pages and cannot edit DNS records. GitHub Actions workflow `.github/workflows/deploy.yml` publishes the same public files on every push to `main` once the repo secrets are set.

## Next concrete action
- Add proxied CNAME records for aircheck.fyi and www to aircheck-c4s.pages.dev.
- Create a Cloudflare API token with Pages edit on this account, then set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` on the GitHub repo.

## Key decisions
- Hostname: aircheck.fyi (apex).
- Core is deterministic: Open-Meteo weather + air quality → compute bands → direct lookup in granular static feel-table → sentence + citations.
- Feel-table covers temperature × weather/comfort × AQI bands (hundreds of combinations, with fallbacks).
- Optional richer bank is secondary and not required for MVP.
- Client-side only for user inputs (geolocation never stored, no accounts, no history).
- Prominent contribution link; monetization placeholders present but not activated.
- Shared stack: Cloudflare Pages, static HTML/JS, public GitHub preferred.

## Metrics / signals
- Usage: production Pages deployment, custom hostname not resolving yet
- Cost: Low (static + domain)
- Freshness: Live Open-Meteo data; bank entries dated 2026-10-29.

## Open issues
- The contribution link points at the on-page support section. No payment URL is connected.
- Bank growth process (offline script preferred).
- Custom hostname DNS and the GitHub Actions API token are not done.

## Kill check
- Meets any kill criteria? No
- Notes: Pages production is live at the pages.dev hostname. Apex DNS and the Actions secret remain.
