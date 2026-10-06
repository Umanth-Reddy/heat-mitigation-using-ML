"""Stage 1: hourly ERA5-based observations for New Delhi from the Open-Meteo archive API, 2015 → latest.

Writes ml/data/raw/obs_hourly.csv (not committed; re-created by this script) and records the source in ml/data/SOURCES.md.
"""
import datetime as dt
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from common.http import get_json_cached  # noqa: E402
from common.sources import write_section  # noqa: E402
from common.paths import LAT, LON, RAW, TZ  # noqa: E402

URL = "https://archive-api.open-meteo.com/v1/archive"
VARS = ["temperature_2m", "relative_humidity_2m", "dew_point_2m", "wind_speed_10m", "shortwave_radiation"]
START_YEAR = 2015


def fetch_year(year: int, end: dt.date) -> pd.DataFrame:
    start = dt.date(year, 1, 1)
    stop = min(dt.date(year, 12, 31), end)
    params = {"latitude": LAT, "longitude": LON, "start_date": start.isoformat(), "end_date": stop.isoformat(),
              "hourly": ",".join(VARS), "timezone": TZ, "wind_speed_unit": "ms"}
    complete_year = stop == dt.date(year, 12, 31)
    cache = os.path.join(RAW, f"obs_{year}{'' if complete_year else '_' + stop.isoformat()}.json")
    data = get_json_cached(URL, params, cache)
    df = pd.DataFrame(data["hourly"])
    df["time"] = pd.to_datetime(df["time"])
    return df, data


def main():
    end = dt.date.today() - dt.timedelta(days=1)
    frames, meta = [], None
    for year in range(START_YEAR, end.year + 1):
        df, meta = fetch_year(year, end)
        frames.append(df)
        print(f"{year}: {len(df)} hours")
    obs = pd.concat(frames, ignore_index=True).dropna(subset=VARS, how="any")
    obs = obs.rename(columns={"temperature_2m": "ta", "relative_humidity_2m": "rh", "dew_point_2m": "td",
                              "wind_speed_10m": "wind", "shortwave_radiation": "sw"})
    obs.to_csv(os.path.join(RAW, "obs_hourly.csv"), index=False)
    first, last = obs["time"].min(), obs["time"].max()
    print(f"obs_hourly.csv: {len(obs)} complete hours, {first} → {last}; grid point {meta['latitude']}, {meta['longitude']}")
    write_section("obs", (
            "## Observations: ERA5 reanalysis via the Open-Meteo Historical Weather API\n\n"
            f"- Endpoint: `{URL}`\n"
            f"- Query: latitude={LAT}, longitude={LON}, hourly={','.join(VARS)}, timezone={TZ}, wind_speed_unit=ms, yearly chunks {START_YEAR}→{end.year}\n"
            f"- Grid point returned: {meta['latitude']}, {meta['longitude']} (elevation {meta.get('elevation')} m)\n"
            f"- Coverage used: {first:%Y-%m-%d %H:%M} → {last:%Y-%m-%d %H:%M} local time ({len(obs):,} complete hours)\n"
            f"- Fetched: {dt.date.today().isoformat()}\n"
            "- Licence: CC BY 4.0. Attribution: Open-Meteo.com (https://open-meteo.com/) and ERA5 / ERA5-Land, "
            "Copernicus Climate Change Service (C3S), Hersbach et al. (2020), doi:10.1002/qj.3803.\n"
            "- Note: reanalysis is a gridded best estimate (~0.25° ERA5 / ~0.1° ERA5-Land), not a station record.\n"
    ))


if __name__ == "__main__":
    main()
