"""Stage 2a: hourly WBGT/UTCI → daily aggregates, and the Layer A feature/target table.

Forecast set-up (used by every model and baseline):
  issued at the end of day t using observed days t−6 … t (the 7 most recent days, "lags 1–7" counted back from the
  first forecast day), targets = daily max WBGT and daily max UTCI on days t+1 … t+5.
  Evaluation rows: issue days whose five target days all fall in March–June.
Split by target year: train 2015–2022, validate 2023 (early stopping only), test 2024 → latest.

Writes ml/data/daily_obs.csv, ml/data/daily_nwp.csv (committed) and ml/data/raw/features.csv (re-created).
"""
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from common import thermal as th  # noqa: E402
from common.paths import DATA, RAW  # noqa: E402

DAILY_VARS = ["wbgt_max", "utci_max", "tmax", "tmin", "rh_mean", "sw_max", "wind_mean"]
LEADS = [1, 2, 3, 4, 5]
SEASON = [3, 4, 5, 6]
TRAIN_YEARS = range(2015, 2023)
VAL_YEARS = [2023]
TEST_START = 2024


def to_daily(h: pd.DataFrame) -> pd.DataFrame:
    h = h.copy()
    h["wbgt"] = th.wbgt_from_met(h["ta"], h["rh"], h["sw"])
    h["utci"] = th.utci_from_met(h["ta"].to_numpy(), h["rh"].to_numpy(), h["wind"].to_numpy(), h["sw"].to_numpy())
    h["date"] = h["time"].dt.normalize()
    g = h.groupby("date")
    d = pd.DataFrame({
        "wbgt_max": g["wbgt"].max(), "utci_max": g["utci"].max(), "tmax": g["ta"].max(), "tmin": g["ta"].min(),
        "rh_mean": g["rh"].mean(), "sw_max": g["sw"].max(), "wind_mean": g["wind"].mean(), "hours": g.size(),
    })
    return d[d["hours"] == 24].drop(columns="hours")


def split_of(year: int) -> str:
    if year in TRAIN_YEARS:
        return "train"
    if year in VAL_YEARS:
        return "val"
    return "test" if year >= TEST_START else "unused"


def build_features(daily: pd.DataFrame) -> pd.DataFrame:
    daily = daily.asfreq("D")  # explicit calendar so shifts are in days
    f = pd.DataFrame(index=daily.index)
    for v in DAILY_VARS:
        for k in range(7):
            f[f"{v}_lag{k}"] = daily[v].shift(k)
        f[f"{v}_trend3"] = daily[v] - daily[v].shift(2)
        f[f"{v}_trend7"] = daily[v] - daily[v].shift(6)
    doy = f.index.dayofyear
    f["doy_sin"] = np.sin(2 * np.pi * doy / 365.25)
    f["doy_cos"] = np.cos(2 * np.pi * doy / 365.25)
    for h in LEADS:
        f[f"y_wbgt_{h}"] = daily["wbgt_max"].shift(-h)
        f[f"y_utci_{h}"] = daily["utci_max"].shift(-h)
    # common evaluation rows: t+1 … t+5 all in March–June
    targets = [f.index + pd.Timedelta(days=h) for h in LEADS]
    in_season = np.all([t.month.isin(SEASON) for t in targets], axis=0)
    f = f[in_season].dropna()
    f.index.name = "issue_date"
    f["split"] = [split_of((d + pd.Timedelta(days=1)).year) for d in f.index]
    return f[f["split"] != "unused"]


def nwp_daily() -> pd.DataFrame:
    n = pd.read_csv(os.path.join(RAW, "nwp_hourly.csv"), parse_dates=["time"])
    out = []
    for lead, part in n.groupby("lead"):
        d = to_daily(part.drop(columns="lead"))
        d.columns = ["nwp_" + c for c in d.columns]
        d["lead"] = lead
        out.append(d)
    return pd.concat(out).reset_index().rename(columns={"date": "valid_date"})


def main():
    h = pd.read_csv(os.path.join(RAW, "obs_hourly.csv"), parse_dates=["time"])
    daily = to_daily(h)
    daily.round(3).to_csv(os.path.join(DATA, "daily_obs.csv"), index_label="date")
    nwp = nwp_daily()
    nwp.round({c: 3 for c in nwp.columns if c.startswith("nwp_")}).to_csv(os.path.join(DATA, "daily_nwp.csv"), index=False)
    feats = build_features(daily)
    feats.to_csv(os.path.join(RAW, "features.csv"))
    print(f"daily_obs.csv: {len(daily)} days ({daily.index.min():%Y-%m-%d} → {daily.index.max():%Y-%m-%d})")
    print(f"daily_nwp.csv: {len(nwp)} rows (valid day × lead)")
    print("feature rows per split:", feats["split"].value_counts().to_dict(), "| features:",
          sum(not c.startswith("y_") and c != "split" for c in feats.columns))
    season = daily[daily.index.month.isin(SEASON)]
    print("Mar–Jun daily max WBGT: mean %.1f, p95 %.1f, max %.1f °C" % (
        season["wbgt_max"].mean(), season["wbgt_max"].quantile(0.95), season["wbgt_max"].max()))


if __name__ == "__main__":
    main()
