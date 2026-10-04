# UshnaRaksha — Heat-Health Early Warning (frontend prototype)

SIH 2026 · Problem Statement SIH26083 · Team "Good Team".

UshnaRaksha turns weather and vulnerability data into ward-level **human thermal stress** (WBGT / UTCI) risk, a
3–5 day forecast, predicted heat admissions and deaths, and human-approved alerts. This repo is a **frontend-only
prototype** for the demo video: everything is static JSON and **all data is simulated**.

## The four tabs

| Tab | Shortcut | What it shows |
|---|---|---|
| **Early Warning** | `1` | Ward risk map (WBGT tiers, UTCI, vulnerability or satellite LST; 2D/3D; cooling centres and hospitals), 6-day forecast timeline, city outlook, ward detail with forecast charts, SHAP "why flagged", who is at risk and actions. |
| **Alerts** | `2` | Alert queue, SMS / WhatsApp (English and Hindi) / CAP XML previews, a human "Approve & dispatch" flow, history and settings. |
| **Impact** | `3` | Scenario estimates: lives saved and admissions avoided with a 3-day warning vs no warning or a 1-day warning, a lead-time slider, per-day and per-ward breakdowns, assumptions and an Ahmedabad benchmark. |
| **Model Insights** | `4` | Pipeline, DLNM exposure–response, TFT backtest and comparison with baseline systems. |
| **Urban Planning** | `5` | The original 3D heat-attribution tool (cool roofs and green cover interventions). |

Other shortcuts on the Early Warning tab: `←` / `→` change the forecast day, `Space` plays or pauses, `D` toggles 3D, `Esc` closes the ward panel. `I` (or `/?intro=1`) shows the title screen; Enter, Space or a click dismisses it.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start
```

`dev` and `build` use `--webpack` on purpose (MapLibre's worker setup does not work with Turbopack).

## Regenerate the risk data

```bash
python3 scripts/generate_risk_data.py   # wards, cells, alerts, models
python3 scripts/generate_ops_data.py    # facilities.json and impact.json (run after the first one)
```

Both use only the standard library, are seeded (same output every time) and need no network. The first reads `public/data/grid.geojson`; the second reads the first one's output. They write `public/data/risk/*.json`. **Do not re-run `scripts/generate_data.py`** — it downloads from OpenStreetMap and
would change the Urban Planning data.

## Deploy on Vercel

1. Push the branch, then in Vercel choose **Add New → Project → Import Git Repository** and pick this repo.
2. Set the production branch to `ushnaraksha` (Settings → Git), or deploy that branch as a preview.
3. Framework preset **Next.js** (detected). Build command **`npm run build`** (do not override it with plain `next build`: the script adds `--webpack`). Install command and output directory: defaults. Root directory: the repo root.
4. No environment variables are needed. Use Node 20.9 or newer (Vercel's default works).
5. `public/` is served as static files: `/maplibre-worker.mjs`, `/maplibre-gl-shared.mjs` and everything under `/data/**`. Map tiles come from Esri, and fonts are fetched at build time from Google Fonts.

## More

- `docs/USHNARAKSHA_SPEC.md` — the full design spec (the prototype was built to a reduced scope of it).
- Stack: Next.js 16 (App Router), React 19, Tailwind 4, deck.gl + MapLibre, Recharts, zustand.
- Everything shown is simulated; nothing here is a real forecast or real health data.
