# UshnaRaksha — Heat-Health Early Warning (frontend prototype)

SIH 2026 · Problem Statement SIH26083 · Team "Good Team".

UshnaRaksha turns weather and vulnerability data into ward-level **human thermal stress** (WBGT / UTCI) risk, a
3–5 day forecast, predicted heat admissions and deaths, and human-approved alerts. This repo is a **frontend-only
prototype** for the demo video: everything is static JSON and **all data is simulated**.

## The four tabs

| Tab | Shortcut | What it shows |
|---|---|---|
| **Early Warning** | `1` | Ward risk map (IMD tiers or vulnerability), 6-day forecast timeline, city outlook, ward detail with forecast charts, SHAP "why flagged", who is at risk and actions. |
| **Alerts** | `2` | Alert queue, SMS / WhatsApp (English and Hindi) / CAP XML previews, and a human "Approve & dispatch" flow. |
| **Model Insights** | `3` | Pipeline, DLNM exposure–response, TFT backtest and comparison with baseline systems. |
| **Urban Planning** | `4` | The original 3D heat-attribution tool (cool roofs and green cover interventions). |

Other shortcuts on the Early Warning tab: `←` / `→` change the forecast day, `Space` plays or pauses, `Esc` closes the ward panel.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start
```

`dev` and `build` use `--webpack` on purpose (MapLibre's worker setup does not work with Turbopack).

## Regenerate the risk data

```bash
python3 scripts/generate_risk_data.py
```

It reads only `public/data/grid.geojson`, uses the standard library, is seeded (same output every time), needs no
network, and writes `public/data/risk/*.json`. **Do not re-run `scripts/generate_data.py`** — it downloads from OpenStreetMap and
would change the Urban Planning data.

## More

- `docs/USHNARAKSHA_SPEC.md` — the full design spec (the prototype was built to a reduced scope of it).
- Stack: Next.js 16 (App Router), React 19, Tailwind 4, deck.gl + MapLibre, Recharts, zustand.
- Everything shown is simulated; nothing here is a real forecast or real health data.
