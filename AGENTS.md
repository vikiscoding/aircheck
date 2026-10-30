# AGENTS.md

> Shared coding law: [`../ai-led-dev/README.md`](../ai-led-dev/README.md). This file is only this repository.

## What this is

aircheck.fyi: a static page that says how it feels outside right now. The visitor gives a place, or uses one-time geolocation. The page fetches Open-Meteo weather and air quality and looks up a sentence in `feel-table.json`.

Read `implementation.md` for the build. Read `status.md` for what is live. Leave `plan.md` as the feasibility note. Do not copy those files into this one.

## Commands

- Install: none. Static files. No package manager.
- Preview: `python -m http.server 8000` in this folder, then open http://localhost:8000
- Check: there is no test command yet. The first change that adds the lookup also adds `node tests/feel-lookup.test.js`. That command must exit 0.

## Done

- `node tests/feel-lookup.test.js` exits 0, and the reply includes the command output.
- The test shows an exact key hit, then each step of the fallback (drop weather, drop AQI, generic) failing closed to the next step.
- `index.html` still explains the page, the worked example, the privacy line, the contribution link, and the Open-Meteo / CAMS attribution with JavaScript disabled.
- A preview in the browser shows a place resolving to a table sentence, the raw numbers, a timestamp, and the citation.
- Nothing in this list was done by a model call during the page request.

## This repo only

- The feel sentence comes from `feel-table.json` plus the live Open-Meteo numbers. No model runs on the request path.
- A miss in `bank.json` shows the table sentence only. The bank is optional and is not required for the first deploy.
- Geolocation is one-time. Discard the coordinates after the fetch. No `localStorage` of location, no cookies, and no third-party analytics. A first-party visit counter may add one count for a browser session and must skip known bots. It stores no place, no coordinates, and no skin type. `sessionStorage` key `aircheck-visit` may remember that this tab already counted.
- Do not invent a feel sentence, an AQI number, or a pollutant value. If the table has no row, use the written fallback. If the fetch fails, say so.
- The attribution line stays visible: "Weather and air-quality data from Open-Meteo (CAMS global air quality). Not an official government source."
- The contribution link stays visible. Monetization slots stay inactive: no ad script, no tracker.
- `main` deploys to Cloudflare Pages on https://aircheck.fyi. Do not deploy, change DNS, or buy anything unless this task says so.
- Hostname, sources, and the "no model on the request" rule change only by editing `status.md` in the same change.
