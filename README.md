# aircheck.fyi

A static page that says how it feels outside right now. Enter a place, or share your location once. The page fetches live weather and air quality from Open-Meteo and reads a sentence from `feel-table.json`.

There is no account, no cookie, and no analytics. Geolocation is used once for that request and then discarded. The feel sentence is not written by a model during the page request.

## Preview

```
python -m http.server 8000
```

Open http://localhost:8000

## Check

```
node tests/feel-lookup.test.js
```

The command must exit 0.

## Deploy

Cloudflare Pages project `aircheck` on the vikrant.singh1@outlook.com account. Production is https://aircheck-c4s.pages.dev. The custom hostnames aircheck.fyi and www.aircheck.fyi are attached to that project.

Pushes to `main` on GitHub run `.github/workflows/deploy.yml`. The workflow runs the lookup test, then publishes the public site files. It does not publish the notes or the tests. The repo secrets are `CLOUDFLARE_API_TOKEN` (Pages edit) and `CLOUDFLARE_ACCOUNT_ID`.
