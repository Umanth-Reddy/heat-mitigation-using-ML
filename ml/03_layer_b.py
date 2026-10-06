"""Stage 3: Layer B, heat → mortality response from PUBLISHED coefficients (nothing is fitted to mortality here).

Uses ml/data/literature_coefficients.json (Hajat et al. 2005, Delhi; values quoted from the PubMed abstract).
The published exposure is air temperature, so forecast WBGT is mapped to daily mean air temperature with a linear fit
on ERA5 training seasons (2015–2022, March–June). The fit quality is reported, not hidden.

  RR(T) = (1 + 0.024) ** max(0, T − 20 °C), lower/upper from the 95 % CI (0.1 %, 4.7 %).
Writes ml/outputs/layerB.json.
"""
import json
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from common.paths import DATA, OUT  # noqa: E402


def main():
    lit = json.load(open(os.path.join(DATA, "literature_coefficients.json"), encoding="utf-8"))
    v = lit["primary"]["values"]
    h = pd.read_csv(os.path.join(DATA, "daily_obs.csv"), parse_dates=["date"]).set_index("date")
    # daily mean air temperature is not in daily_obs (which keeps max/min); use the midrange of Tmax and Tmin,
    # a standard approximation when hourly means are not carried forward
    h["tmean"] = (h["tmax"] + h["tmin"]) / 2
    train = h[(h.index.year <= 2022) & h.index.month.isin([3, 4, 5, 6])]
    a, b = np.polyfit(train["wbgt_max"], train["tmean"], 1)
    resid = train["tmean"] - (a * train["wbgt_max"] + b)
    r2 = 1 - np.sum(resid**2) / np.sum((train["tmean"] - train["tmean"].mean()) ** 2)
    test = h[(h.index.year >= 2024) & h.index.month.isin([3, 4, 5, 6])]
    tresid = test["tmean"] - (a * test["wbgt_max"] + b)

    def rr(t, pct):
        return (1 + pct / 100) ** np.maximum(0.0, np.asarray(t) - v["threshold_c"])

    wbgt_grid = np.round(np.arange(20, 34.01, 0.5), 2)
    t_grid = a * wbgt_grid + b
    curve = [{"wbgt": float(w), "tmean": round(float(t), 2), "rr": round(float(rr(t, v["pct_increase_per_c"])), 4),
              "lo": round(float(rr(t, v["ci95_pct"][0])), 4), "hi": round(float(rr(t, v["ci95_pct"][1])), 4)}
             for w, t in zip(wbgt_grid, t_grid)]
    season = h[h.index.month.isin([3, 4, 5, 6])]
    out = {
        "source": {k: lit["primary"][k] for k in ("citation", "doi", "pmid", "location")},
        "values": v,
        "mapping": {"description": "daily mean air temperature ≈ a × daily max WBGT + b, fitted on ERA5 Mar–Jun 2015–2022; "
                                   "daily mean taken as (Tmax + Tmin) / 2",
                    "a": round(float(a), 4), "b": round(float(b), 4), "r2_train": round(float(r2), 3),
                    "resid_sd_train_c": round(float(resid.std()), 3), "resid_sd_test_c": round(float(tresid.std()), 3)},
        "curve_by_wbgt": curve,
        "season_tmean_range_c": [round(float(season["tmean"].min()), 1), round(float(season["tmean"].max()), 1)],
        "note": "RR is relative to a day at or below the 20 °C threshold and includes the 28-day cumulative effect "
                "(net of mortality displacement) reported by the study.",
    }
    with open(os.path.join(OUT, "layerB.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"Layer B: {lit['primary']['citation']}")
    print(f"  RR per °C above {v['threshold_c']} °C: {1 + v['pct_increase_per_c'] / 100:.3f} (95 % CI {1 + v['ci95_pct'][0] / 100:.3f}–{1 + v['ci95_pct'][1] / 100:.3f}), 28-day cumulative")
    print(f"  WBGT→Tmean mapping: Tmean = {a:.3f}·WBGT + {b:.2f}; R² {r2:.3f}; residual SD {resid.std():.2f} °C train, {tresid.std():.2f} °C test")
    for w in (26, 30, 32, 33):
        c = next(x for x in curve if x["wbgt"] == w)
        print(f"  WBGT {w} °C → Tmean {c['tmean']} °C → RR {c['rr']} ({c['lo']}–{c['hi']})")


if __name__ == "__main__":
    main()
