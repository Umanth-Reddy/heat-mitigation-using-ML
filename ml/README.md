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
