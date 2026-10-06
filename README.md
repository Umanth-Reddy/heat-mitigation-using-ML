<div align="center">

# UshnaRaksha · उष्णरक्षा

**AI-Powered Human Thermal Stress & Heat-Mortality Early Warning System**

*Know who the heat will hurt, where, and when: 3–5 days before it happens.*

[How it works](#how-it-works) · [Run locally](#run-locally) · [Built vs planned](#built-vs-planned)

<img src="docs/screenshots/01-early-warning-day3.png" alt="UshnaRaksha early-warning map showing three red wards on the forecast peak day" width="100%">

</div>

## The problem

Heatwave warnings in India are still built on air temperature alone. They are issued city-wide and arrive 24–72 hours ahead. But heat harms people through humidity, solar radiation and nights that never cool down, and it reaches the elderly, outdoor workers and people in informal settlements first. Official heat-death counts also capture only a small fraction of the true toll, so cities rarely see a heatwave's real health cost coming.

## Our solution

UshnaRaksha turns raw weather data into physiological heat-risk intelligence.

| What it does | Why it matters |
|---|---|
| Computes WBGT and UTCI, two human thermal-stress indices, for every ~120 m zone | Measures the heat the body actually feels, not just the thermometer reading |
| Downscales Landsat/MODIS land-surface temperature and fuses it with Census/SECC vulnerability data | Ward-level risk instead of city-wide averages |
| Forecasts heat-related hospital admissions and deaths 3–5 days ahead (DLNM, LightGBM, TFT) | Predicts health impact, not just weather |
| Explains every forecast with SHAP | Officials can see why a ward is flagged, and trust it |
| Drafts SMS, WhatsApp and CAP alerts in English and Hindi, sent only after human approval | Targeted, accountable early action |
| Triggers cooling centres, work-hour shifts, hospital and power-grid readiness | Turns warnings into action on the ground |

## Prototype tour

The prototype covers a pilot area in central New Delhi: 6 wards, 256 zones of ~120 m, with a 6-day forecast window.

| Tab | Key | Highlights |
|---|---|---|
| Early Warning | `1` | Ward risk map (WBGT tiers, UTCI, vulnerability, satellite LST), 2D/3D, playable 5-day forecast, cooling centres and hospitals with daily load, city outlook, and a ward panel with forecast, predicted admissions and deaths, SHAP "why flagged", at-risk groups and actions |
| Alerts | `2` | Alert queue, SMS / WhatsApp (English and Hindi) / CAP 1.2 XML previews, human Approve & dispatch with delivery tracking, history and threshold settings |
| Impact | `3` | Deaths and admissions averted with a 3-day warning vs a 1-day warning or none, lead-time slider, per-ward breakdown, Ahmedabad Heat Action Plan benchmark |
| Model Insights | `4` | Real results from `ml/`: heat-stress forecast error by lead day, backtest, interval coverage, comparison with persistence, climatology and weather-model forecasts, heat-day warning skill, SHAP, the published heat–mortality curve, the census vulnerability index and a risk-engine run on a real heatwave, each with a plain-language note that says where the model loses |
| Urban Planning | `5` | 3D heat attribution on real OpenStreetMap buildings, plus cool-roof and green-cover interventions ranked by cost per °C of cooling |
| How it works | `6` | Formulas, IMD tiers, data sources, model cards, decision flow, and what is real vs simulated |

Also included: a live heat-stress calculator (`C`), a title screen (`I` or `?intro=1`), and a mobile summary screen. On the map, `Space` plays the forecast, `←` / `→` change the day, `D` toggles 3D, and `Esc` closes panels.

<table>
  <tr>
    <td><img src="docs/screenshots/02-ward-detail.png" alt="Ward detail panel with SHAP explanation"></td>
    <td><img src="docs/screenshots/04-alerts-whatsapp-hindi.png" alt="Alerts centre with a Hindi WhatsApp preview"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/05-impact.png" alt="Impact tab: lives saved by lead time"></td>
    <td><img src="docs/screenshots/06-model-insights.png" alt="Model Insights charts"></td>
  </tr>
</table>

## How it works

| 1. Ingest | 2. Compute | 3. Model | 4. Decide | 5. Act |
|---|---|---|---|---|
| IMD NWP forecast<br>Landsat / MODIS LST<br>Census / SECC<br>IDSP + hospitals | LST downscaling<br>WBGT + UTCI per ~120 m zone | DLNM, LightGBM<br>TFT forecast<br>SHAP explanations | IMD 4-tier colour<br>Local P95 thresholds<br>Human approval | SMS, WhatsApp, CAP<br>Cooling centres<br>Hospital and grid readiness |

### Heat-stress indices

| Index | What it captures | How we compute it |
|---|---|---|
| **WBGT**, Wet Bulb Globe Temperature | The occupational heat-stress standard: temperature, humidity, sun | `0.7·Tw + 0.3·Ta + radiant term`, with wet-bulb Tw from Stull (2011) |
| **UTCI**, Universal Thermal Climate Index | How the human body exchanges heat with its surroundings | 6th-order polynomial of Bröde et al. (2012), ported from [pythermalcomfort](https://github.com/CenterForTheBuiltEnvironment/pythermalcomfort) and tested against its reference values |

Wards are classified with IMD's 4-tier colour code (Green, Yellow, Orange, Red). Thresholds come from the local 95th-percentile baseline, not fixed national cut-offs, which keeps false alarms down.

### Models

**Planned design** (from the proposal):

| Model | Role | Output |
|---|---|---|
| DLNM, Distributed Lag Non-Linear Model | Epidemiological exposure-lag-response between heat stress and mortality | Relative risk by WBGT, over 0–5 day lags |
| LightGBM / XGBoost | How local vulnerability (elderly, outdoor workers, informal housing, tree cover) changes risk | Ward vulnerability and interaction effects |
| LSTM / Temporal Fusion Transformer | Forecasts health impact | Admissions and deaths at days 1–5, with uncertainty bands |
| SHAP | Explainability | Per-ward "why flagged" drivers |

**What is built and tested today** (`ml/`, reproducible with `python ml/run_all.py`):

| Layer | What ran | Data | Result |
|---|---|---|---|
| A · heat-stress forecaster | LightGBM quantile models (one per lead day), an LSTM and an NWP post-processing model, against persistence, climatology and raw weather-model forecasts | ERA5 via Open-Meteo, New Delhi, 2015 → latest; archived NWP forecasts 2024 → | Test 2024 → latest, split by time: see [`ml/reports/layerA_metrics.md`](ml/reports/layerA_metrics.md) |
| B · heat → mortality | Published Delhi exposure–response, applied on its native air-temperature scale | Hajat et al. 2005 (*Epidemiology* 16:613–620) | Not fitted by us; no local mortality series was available |
| C · vulnerability | PCA index from 5 census indicators | Census 2011 ward-level PCA, New Delhi district | Ward level achieved; no elderly or slum data at that level |
| D · risk engine | Excess deaths for a real heatwave window from A + B + C | Baseline deaths: de Bont et al. 2024; population: Census 2011 | Ward split, ward heat offsets and the admissions ratio are simulated or assumed and labelled |

## Architecture

```mermaid
flowchart LR
  subgraph Planned["Planned: production stack"]
    SRC["IMD, Earth Engine,<br>Census, IDSP"] --> AF["Apache Airflow"]
    AF --> PG[("PostgreSQL + PostGIS")]
    PG --> ML["DLNM, LightGBM, TFT + SHAP"]
    ML --> API["FastAPI + rule engine"]
    API --> UI["Same dashboard"]
    API --> DISP["SMS, WhatsApp, CAP<br>after human approval"]
  end
  subgraph Built["Built: static prototype (this repo)"]
    GEN["scripts/generate_*.py<br>seeded scenario data"] --> JSON["public/data/**/*.json"]
    THERM["lib/thermal.ts<br>real WBGT + UTCI"] --> APP
    JSON --> APP["Next.js 16 dashboard<br>MapLibre, deck.gl,<br>Recharts, zustand"]
  end
```

**Tech stack:** Next.js (React), TypeScript, MapLibre GL, deck.gl, Recharts, Tailwind CSS, zustand, Python. Planned: FastAPI, PostgreSQL/PostGIS, Apache Airflow, Docker, Google Earth Engine.

## Built vs planned

We want evaluators to see exactly what is real.

| Capability | Status |
|---|---|
| Dashboard: map, forecast timeline, ward panel, alerts flow, impact, model insights | **Built** |
| WBGT + UTCI calculator | **Built**: real formulas, unit-tested (`npm run test:thermal`) |
| Building footprints (Urban Planning) | **Real** OpenStreetMap data |
| Early Warning map, alerts, facilities, Impact tab | **Simulated**: seeded scenario data for the demo |
| Heat-stress forecaster (Layer A) | **Trained & tested**: ERA5 via Open-Meteo, test 2024 → latest; beats persistence at every lead, close to climatology by day 5, intervals too narrow (see Model Insights) |
| Heat → mortality curve (Layer B) | **Published coefficients**: Hajat et al. 2005 (Delhi); not fitted by us |
| Vulnerability index (Layer C) | **Real**: Census 2011 ward level, New Delhi district |
| Risk engine on a real heatwave (Layer D) | **Partly real**: real forecast, coefficients and census inputs; ward split and admissions ratio simulated or assumed |
| Local DLNM, admissions forecast (TFT), vulnerability ML model | **Not built**: no Delhi daily mortality or admissions series was available |
| Live IMD / satellite / census / hospital ingestion | Planned |
| FastAPI, PostGIS, Airflow backend | Planned |
| Real SMS / WhatsApp / CAP dispatch | Planned |

## Run locally

Requirements: Node.js 20.9+ and npm. Python 3.9+ only if you want to regenerate data.

```bash
git clone https://github.com/Umanth-Reddy/heat-mitigation-using-ML.git
cd heat-mitigation-using-ML
npm install
npm run dev            # http://localhost:3000
```

```bash
npm run build && npm run start   # production build
npm run test:thermal             # WBGT/UTCI reference tests
```

`dev` and `build` intentionally use `--webpack`, because MapLibre's worker setup is not compatible with Turbopack.

### Regenerate the scenario data

```bash
python3 scripts/generate_risk_data.py   # wards, zones, forecasts, alerts, models
python3 scripts/generate_ops_data.py    # facilities + impact scenarios (run second)
```

Both scripts use only the standard library, are seeded (identical output every run) and need no network. Do not re-run `scripts/generate_data.py`: it re-downloads OpenStreetMap buildings and changes the Urban Planning data.

## Deploy

Import the repo on Vercel with the Next.js preset and build command `npm run build`. No environment variables are needed.

## Repository layout

```
app/                 Next.js entry
components/
  warning/           risk map, forecast timeline, city outlook, ward detail
  alerts/            queue, phone previews, approval flow
  impact/            lives-saved scenarios
  models/            model insights
  how/               methodology page
  planning/          3D heat-attribution tool
  shell/             header, intro screen, calculator, shortcuts
lib/                 store, data loading, types, thermal.ts (index maths)
scripts/             data generators + thermal tests
public/data/         static JSON (risk/ is generated)
```

## Feasibility and rollout

- **Open data only:** IMD NWP, free Landsat/MODIS, Census/SECC.
- **Existing standards:** IMD's 4-tier colour code and CAP, so agencies do not need to adopt anything new.
- **Phase 1:** pilot in 1–2 cities with Heat Action Plans (Ahmedabad / Delhi / Chennai).
- **Phase 2:** state rollout through SDMAs, funded via SDRF/NDRF heat-mitigation allocations.
- **Phase 3:** national scale through NDMA's SACHET/CAP framework and Smart Cities dashboards.

The benchmark we build on is Ahmedabad's Heat Action Plan, which is estimated to avoid more than 1,100 deaths a year (Hess et al.).

## References

- Brimicombe et al., [Wet Bulb Globe Temperature: Indicating Extreme Heat Risk on a Global Grid](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9941479/) (PMC9941479)
- Bröde et al. (2012), [Deriving the operational procedure for the Universal Thermal Climate Index (UTCI)](https://doi.org/10.1007/s00484-011-0454-1)
- NDMA, [Heat Wave guidelines](https://ndma.gov.in/Natural-Hazards/Heat-Wave)
- Knowlton et al., [Development and Implementation of South Asia's First Heat-Health Action Plan in Ahmedabad](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4024996/) (PMC4024996)
- Hess et al., [Building Resilience to Climate Change: Pilot Evaluation of the Impact of India's First Heat Action Plan on All-Cause Mortality](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6236972/) (PMC6236972)
- [Machine learning-based analysis and prediction of heatstroke using DLNM](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2024.1420608/full) (Frontiers in Public Health, 2024)

---

Team **Good Team** · Smart India Hackathon 2026 · SIH26083

[MIT License](LICENSE) · Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
