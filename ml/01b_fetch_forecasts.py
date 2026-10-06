"""Stage 1b: archived NWP forecasts *as issued* 1–5 days before the valid time (Open-Meteo Previous Runs API).

Finding (checked 2026-10 against the live API, see SOURCES): `<var>_previous_dayN` holds the value forecast by the model run
issued N days before each valid hour. Temperature is available from 2021, but relative humidity, shortwave radiation and
wind (all needed for WBGT/UTCI) only from March 2024. So the NWP baseline and the NWP post-processing model can only use
2024 onward; no lead times are invented.

Writes ml/data/raw/nwp_hourly.csv (not committed).
"""
import datetime as dt
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from common.http import get_json_cached  # noqa: E402
from common.sources import write_section  # noqa: E402
from common.paths import LAT, LON, RAW, TZ  # noqa: E402

URL = "https://previous-runs-api.open-meteo.com/v1/forecast"
BASE = ["temperature_2m", "relative_humidity_2m", "wind_speed_10m", "shortwave_radiation"]
SHORT = {"temperature_2m": "ta", "relative_humidity_2m": "rh", "wind_speed_10m": "wind", "shortwave_radiation": "sw"}
LEADS = [1, 2, 3, 4, 5]
START = dt.date(2024, 3, 1)  # first date with all four variables at every lead (probed: 2024-01-01 empty, 2024-03-01 complete)


def main():
    end = dt.date.today() - dt.timedelta(days=1)
    hourly = [f"{v}_previous_day{n}" for v in BASE for n in LEADS]
    frames = []
    for year in range(START.year, end.year + 1):
        a = max(START, dt.date(year, 1, 1))
        b = min(end, dt.date(year, 12, 31))
        params = {"latitude": LAT, "longitude": LON, "start_date": a.isoformat(), "end_date": b.isoformat(),
                  "hourly": ",".join(hourly), "timezone": TZ, "wind_speed_unit": "ms"}
        tag = "" if b == dt.date(year, 12, 31) else "_" + b.isoformat()
        data = get_json_cached(URL, params, os.path.join(RAW, f"nwp_{year}{tag}.json"))
        df = pd.DataFrame(data["hourly"])
        frames.append(df)
        print(f"{year}: {len(df)} hours; non-null per lead (ta): " +
              ", ".join(f"d{n}={df[f'temperature_2m_previous_day{n}'].notna().sum()}" for n in LEADS))
    nwp = pd.concat(frames, ignore_index=True)
    nwp["time"] = pd.to_datetime(nwp["time"])
    long = []
    for n in LEADS:
        part = nwp[["time"] + [f"{v}_previous_day{n}" for v in BASE]].copy()
        part.columns = ["time"] + [SHORT[v] for v in BASE]
        part["lead"] = n
        long.append(part)
    out = pd.concat(long, ignore_index=True).dropna()
    out.to_csv(os.path.join(RAW, "nwp_hourly.csv"), index=False)
    print(f"nwp_hourly.csv: {len(out)} rows (hour × lead), {out['time'].min()} → {out['time'].max()}")
    write_section("nwp", (
            "## Archived NWP forecasts: Open-Meteo Previous Runs API\n\n"
            f"- Endpoint: `{URL}` (model: Open-Meteo `best_match` for this location)\n"
            f"- Variables: {', '.join(BASE)} as `<var>_previous_day1…5` = value forecast by the run issued 1–5 days before each valid hour\n"
            f"- Coverage used: {out['time'].min():%Y-%m-%d} → {out['time'].max():%Y-%m-%d}. Probed availability at this point: temperature from 2021; "
            "humidity, radiation and wind only from March 2024, so WBGT/UTCI forecasts start in March 2024.\n"
            f"- Fetched: {dt.date.today().isoformat()}\n"
            "- Licence: CC BY 4.0, attribution Open-Meteo.com; underlying model data from national weather services as listed by Open-Meteo.\n"
    ))


if __name__ == "__main__":
    main()
