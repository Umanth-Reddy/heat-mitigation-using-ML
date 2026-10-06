"""Stage 5: Layer D risk engine. Combines Layers A–C for a real heatwave window and writes the app's model_results.json.

Window: the 6 consecutive days (all in March–June of the test years) with the highest observed mean daily max WBGT.
Day 0 is the issue date (observed); days 1–5 are Layer A LightGBM forecasts at leads 1–5 issued that day.

Per ward and day, for each forecast quantile (10/50/90 %):
  ward WBGT        = city forecast + ward offset (offset from the dashboard's SIMULATED ward data, since there is one ERA5 point)
  RR               = Layer B (Hajat et al. 2005) applied to mapped daily mean air temperature
  vulnerability    = (Connaught Place census HVI / New Delhi district mean HVI)  [real]  × ward spread [SIMULATED]
  population       = Census 2011 residents of the Connaught Place + Parliament Street sub-districts [real], split across
                     the 6 dashboard wards by their simulated population shares [SIMULATED]
  baseline rate    = 284 deaths/day in Delhi (de Bont et al. 2024, Table 1, 2011–2018) ÷ NCT population 16,787,941 (Census 2011)
  excess deaths    = baseline rate × population × (RR − 1) × vulnerability
  admissions       = excess deaths × ADMISSIONS_PER_DEATH  [ASSUMPTION, not sourced]
"""
import datetime as dt
import json
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from common.paths import APP_RISK, DATA, OUT  # noqa: E402

ADMISSIONS_PER_DEATH = 8.0  # assumption; kept equal to the ratio used by the dashboard's illustrative data
PILOT_SUBDISTRICTS = ["Connaught Place", "Parliament Street"]
Q = ("q10", "q50", "q90")


def rr(tmean, pct, threshold):
    return (1 + pct / 100) ** np.maximum(0.0, tmean - threshold)


def main():
    A = json.load(open(os.path.join(OUT, "layerA.json"), encoding="utf-8"))
    B = json.load(open(os.path.join(OUT, "layerB.json"), encoding="utf-8"))
    C = json.load(open(os.path.join(OUT, "layerC.json"), encoding="utf-8"))
    lit = json.load(open(os.path.join(DATA, "literature_coefficients.json"), encoding="utf-8"))
    preds = pd.read_csv(os.path.join(OUT, "layerA_test_predictions.csv"), parse_dates=["issue_date", "target_date"])
    daily = pd.read_csv(os.path.join(DATA, "daily_obs.csv"), parse_dates=["date"]).set_index("date")
    wards = json.load(open(os.path.join(APP_RISK, "wards.json"), encoding="utf-8"))

    # ---- window
    best, best_mean = None, -np.inf
    for issue in sorted(preds["issue_date"].unique()):
        days = pd.date_range(issue, periods=6)
        if not all(d.month in (3, 4, 5, 6) for d in days):
            continue
        m = daily.loc[days, "wbgt_max"].mean()
        if m > best_mean:
            best, best_mean = pd.Timestamp(issue), m
    days = pd.date_range(best, periods=6)
    city = []
    for i, d in enumerate(days):
        obs = float(daily.loc[d, "wbgt_max"])
        if i == 0:
            q = {"q10": obs, "q50": obs, "q90": obs}
        else:
            r = preds[(preds.issue_date == best) & (preds.lead == i)].iloc[0]
            q = {"q10": float(r.wbgt_q10), "q50": float(r.wbgt_q50), "q90": float(r.wbgt_q90)}
        city.append({"date": d.strftime("%Y-%m-%d"), "lead": i, "observed": round(obs, 2), **{k: round(v, 2) for k, v in q.items()}})

    # ---- inputs
    a, b = B["mapping"]["a"], B["mapping"]["b"]
    v = lit["primary"]["values"]
    base_rate = lit["secondary"]["values"]["delhi_mean_daily_deaths"] / C["nct_population_2011"]
    units = pd.DataFrame(C["units"])
    district_mean = float(np.average(units.hvi, weights=units.population))
    anchor = C["subdistrict_hvi_pop_weighted"]["Connaught Place"] / district_mean
    pilot_pop = int(units[units.subdistrict.isin(PILOT_SUBDISTRICTS)].population.sum())
    sim_pop = np.array([w["population"] for w in wards], float)
    sim_vul = np.array([w["vulnerability"] for w in wards], float)
    pop = pilot_pop * sim_pop / sim_pop.sum()
    spread = sim_vul / np.average(sim_vul, weights=sim_pop)
    # simulated ward offsets relative to the ward mean, averaged over the dashboard's 6 days
    offs = np.array([[w["days"][d]["wbgt"] for d in range(len(w["days"]))] for w in wards])
    offset = (offs - offs.mean(axis=0)).mean(axis=1)

    # ---- per ward and day
    rows, totals = [], []
    for c in city:
        tot = {k: 0.0 for k in ("deaths_q10", "deaths_q50", "deaths_q90", "deaths_coef_lo", "deaths_coef_hi", "deaths_observed")}
        for j, w in enumerate(wards):
            out = {"ward_id": w["ward_id"], "date": c["date"], "lead": c["lead"]}
            mult = anchor * spread[j]
            for k in Q:
                wbgt = c[k] + offset[j]
                rrv = rr(a * wbgt + b, v["pct_increase_per_c"], v["threshold_c"])
                out[f"wbgt_{k}"] = round(wbgt, 2)
                out[f"rr_{k}"] = round(float(rrv), 4)
                out[f"deaths_{k}"] = float(base_rate * pop[j] * (rrv - 1) * mult)
            t50 = a * (c["q50"] + offset[j]) + b
            out["deaths_coef_lo"] = float(base_rate * pop[j] * (rr(t50, v["ci95_pct"][0], v["threshold_c"]) - 1) * mult)
            out["deaths_coef_hi"] = float(base_rate * pop[j] * (rr(t50, v["ci95_pct"][1], v["threshold_c"]) - 1) * mult)
            t_obs = a * (c["observed"] + offset[j]) + b
            out["deaths_observed"] = float(base_rate * pop[j] * (rr(t_obs, v["pct_increase_per_c"], v["threshold_c"]) - 1) * mult)
            for k in tot:
                tot[k] += out[k]
            for k in [k for k in out if k.startswith("deaths_")]:
                out[k] = round(out[k], 4)
            out["admissions_q50"] = round(out["deaths_q50"] * ADMISSIONS_PER_DEATH, 3)
            rows.append(out)
        totals.append({"date": c["date"], "lead": c["lead"], **{k: round(x, 4) for k, x in tot.items()},
                       "admissions_q50": round(tot["deaths_q50"] * ADMISSIONS_PER_DEATH, 3)})

    risk = {
        "window": {"start": city[0]["date"], "end": city[-1]["date"], "issue_date": city[0]["date"],
                   "mean_observed_wbgt": round(float(best_mean), 2)},
        "city_wbgt": city, "wards": rows, "city_totals": totals,
        "inputs": {
            "baseline_deaths_per_person_day": base_rate,
            "baseline_source": "284 deaths/day, Delhi 2011–2018 (de Bont et al. 2024, Table 1) ÷ NCT of Delhi population 16,787,941 (Census 2011)",
            "population_total": pilot_pop, "population_source": f"Census 2011 residents of the {' + '.join(PILOT_SUBDISTRICTS)} sub-districts",
            "vulnerability_anchor": round(float(anchor), 3),
            "vulnerability_anchor_source": "Connaught Place sub-district HVI ÷ New Delhi district mean HVI (Census 2011, Layer C)",
            "admissions_per_death": ADMISSIONS_PER_DEATH,
        },
        "labels": {
            "real": ["city WBGT forecast (Layer A)", "observed WBGT (ERA5)", "exposure–response slope (Hajat et al. 2005)",
                     "baseline death rate (de Bont et al. 2024; Census 2011)", "pilot population total and vulnerability anchor (Census 2011)"],
            "simulated": ["ward WBGT offsets", "split of the population across the 6 dashboard wards", "ward-to-ward vulnerability spread"],
            "assumption": [f"{ADMISSIONS_PER_DEATH:g} heat admissions per heat death",
                           "linear scaling of risk with the vulnerability index",
                           "daily mean air temperature mapped from WBGT (residual error not propagated)"],
        },
        "interpretation": "Deaths attributable to each day's heat exposure, cumulated over the following 28 days (the study's lag window), "
                          "relative to days at or below 20 °C. Residents only; the large daytime commuter population is not counted.",
    }
    with open(os.path.join(OUT, "risk_engine.json"), "w", encoding="utf-8") as f:
        json.dump(risk, f, ensure_ascii=False, indent=1)
    print(f"Window {risk['window']['start']} → {risk['window']['end']} (mean observed WBGT {best_mean:.2f} °C), issued {city[0]['date']}")
    print(f"Population {pilot_pop:,}; baseline {base_rate * 1e5:.3f} deaths per 100,000 per day; vulnerability anchor {anchor:.3f}")
    for t, c in zip(totals, city):
        print(f"  {t['date']} lead {t['lead']}: WBGT obs {c['observed']:.2f} | fc {c['q10']:.2f}/{c['q50']:.2f}/{c['q90']:.2f}  "
              f"excess deaths {t['deaths_q10']:.3f}/{t['deaths_q50']:.3f}/{t['deaths_q90']:.3f} (obs-based {t['deaths_observed']:.3f})")


if __name__ == "__main__":
    main()
