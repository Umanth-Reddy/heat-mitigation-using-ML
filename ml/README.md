# UshnaRaksha ML pipeline

Real, reproducible models behind the Model Insights tab. Everything here runs on public data; nothing is hand-entered.

## Setup

```bash
python3 -m venv ml/.venv
ml/.venv/bin/pip install -r ml/requirements.txt          # torch: add --index-url https://download.pytorch.org/whl/cpu
ml/.venv/bin/pip install --no-deps pythermalcomfort==4.6.0 # 4.6.0 pins an old numpy; its runtime deps are already installed
ml/.venv/bin/python ml/run_all.py
```

Tested with Python 3.14 on CPU. Raw downloads are cached in `ml/data/raw/` (not committed); processed CSVs and every output JSON are committed.

## Stages

| Stage | Script | Output |
|---|---|---|
| 0 | `common/thermal.py`, `tests/test_thermal_parity.py` | WBGT/UTCI shared with `lib/thermal.ts` (parity-tested) |
| 1 | `01_fetch_obs.py` | Hourly ERA5 (Open-Meteo archive), New Delhi, 2015 → latest; `data/SOURCES.md` |
| 1b | `01b_fetch_forecasts.py` | Archived NWP forecasts as issued 1–5 days ahead (Open-Meteo Previous Runs API). Full WBGT inputs only from March 2024 |
| 2a | `02_features.py` | Hourly WBGT/UTCI → daily (`data/daily_obs.csv`, `data/daily_nwp.csv`); 7-day lags, trends, season features; warning tiers from real training-year percentiles → `outputs/tiers.json` |
| 2b | `02b_layerA_models.py` | Persistence, climatology, raw NWP, LightGBM quantile, NWP post-processing, LSTM; conformal (CQR) band calibration on 2023 (NWP post-processing: leave-one-month-out in 2024); metrics, events, SHAP, backtest → `outputs/layerA.json`, `reports/layerA_metrics.md` |
| 3 | `03_layer_b.py`, `data/literature_coefficients.json` | Published Delhi heat–mortality slope (Hajat et al. 2005, quoted from the abstract), applied on its native air-temperature metric via a reported WBGT→Tmean mapping → `outputs/layerB.json`. DLNM benchmark skipped (no R) |
| 4 | `04_layer_c.py` | PCA heat-vulnerability index from real Census 2011 ward-level data (District New Delhi, 11 ward-parts) → `outputs/layerC.json`, `data/census_ward_indicators.csv` |
| 5 | `05_risk_engine.py` | Excess deaths for the hottest real 6-day test window from Layers A–C → `outputs/risk_engine.json` |
| 5b | `06_export.py` | Everything the app shows → `public/data/risk/model_results.json`; marks `models.json` as trained |
| 6 | `../scripts/generate_risk_data.py`, `generate_ops_data.py` | App scenario data, with tiers read from `outputs/tiers.json` and WBGT values on the real scale |
| all | `run_all.py` | Reproduces every stage (`--refresh` re-downloads) |

## What is real and what is not

- **Real:** ERA5 observations and archived NWP forecasts (Open-Meteo), every Layer A metric, SHAP value and backtest point, the Census 2011 index, and the published coefficients and baseline deaths (quoted with sources in `data/literature_coefficients.json`).
- **Simulated or assumed (labelled in the app):** the 6 dashboard wards' heat offsets, population split and vulnerability spread; the admissions-per-death ratio; WBGT → daily mean temperature mapping error is not propagated.
- **Not built:** a local DLNM (no Delhi daily mortality series available), an admissions forecaster, and the optional DLNM benchmark on `dlnm::chicagoNMMAPS` (R is not installed here).
