"""Stage 5b: export everything the app shows to public/data/risk/model_results.json and mark models.json as trained.

scripts/generate_risk_data.py reads model_results.json too, so re-running it keeps results_status = "trained".
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common.paths import APP_RISK, DATA, ML, OUT  # noqa: E402


def load(name):
    with open(os.path.join(OUT, name), encoding="utf-8") as f:
        return json.load(f)


def main():
    A, B, C, R = load("layerA.json"), load("layerB.json"), load("layerC.json"), load("risk_engine.json")
    lit = json.load(open(os.path.join(DATA, "literature_coefficients.json"), encoding="utf-8"))
    req = open(os.path.join(ML, "requirements.txt"), encoding="utf-8").read().split()
    d = A["data"]
    end_year = d["split"]["test"].split("–")[1]
    results = {
        "results_status": "trained",
        "dataset": f"ERA5 via Open-Meteo, New Delhi 2015–{end_year}",
        "evaluated_on": f"{d['split']['test']} (March–June)",
        "data": d,
        "layerA": {
            "target": "daily max WBGT (°C), leads 1–5 days",
            "models": {"persistence": "Persistence", "climatology": "Climatology", "lgbm": "LightGBM quantile",
                       "lstm": "LSTM quantile", "nwp_raw": "NWP raw (as issued)", "nwp_pp": "LightGBM NWP post-processing"},
            "metrics": A["metrics"]["main"]["wbgt"], "metrics_utci": A["metrics"]["main"]["utci"],
            "nwp_subset": A["metrics"]["nwp_subset"]["wbgt"], "events": A["metrics"]["events"]["main"],
            "beats_baselines": A["beats_baselines"], "quantile_crossings": A["quantile_crossings"],
            "backtest": A["backtest"], "shap": A["shap"], "lstm": A["lstm"],
        },
        "layerB": {"label": f"Published coefficients: Hajat et al. 2005 (Epidemiology 16:613–620)",
                   "citation": lit["primary"]["citation"], "doi": lit["primary"]["doi"], "pmid": lit["primary"]["pmid"],
                   "values": B["values"], "mapping": B["mapping"], "curve_by_wbgt": B["curve_by_wbgt"], "note": B["note"],
                   "secondary": {"citation": lit["secondary"]["citation"], "doi": lit["secondary"]["doi"],
                                 "values": lit["secondary"]["values"]}},
        "layerC": {k: C[k] for k in ("level_achieved", "source", "indicators", "not_available", "pca", "units",
                                     "subdistrict_hvi_pop_weighted", "pilot_anchor", "pilot_wards")},
        "risk_engine": R,
        "not_done": lit["not_done"],
        "config": {"seed": 26083, "requirements": req,
                   "split": "time-ordered by target year; never shuffled; 2023 used only for early stopping",
                   "scripts": "ml/run_all.py"},
    }
    with open(os.path.join(APP_RISK, "model_results.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, separators=(",", ":"))
    mpath = os.path.join(APP_RISK, "models.json")
    m = json.load(open(mpath, encoding="utf-8"))
    m["results_status"] = "trained"
    m["dataset"] = results["dataset"]
    m["evaluated_on"] = results["evaluated_on"]
    for s in m["sections"].values():
        s["dataset"], s["evaluated_on"] = results["dataset"], results["evaluated_on"]
    with open(mpath, "w", encoding="utf-8") as f:
        json.dump(m, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {os.path.relpath(os.path.join(APP_RISK, 'model_results.json'))} "
          f"({os.path.getsize(os.path.join(APP_RISK, 'model_results.json')):,} bytes); models.json → trained")


if __name__ == "__main__":
    main()
