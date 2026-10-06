"""Reproduce the whole UshnaRaksha ML pipeline end to end.

    ml/.venv/bin/python ml/run_all.py            # uses cached downloads in ml/data/raw/ when present
    ml/.venv/bin/python ml/run_all.py --refresh  # delete the cache first and re-download everything

Stops at the first failing stage.
"""
import glob
import os
import subprocess
import sys
import time

ML = os.path.dirname(os.path.abspath(__file__))
STAGES = [
    ("0  thermal parity (Python vs TypeScript)", "tests/test_thermal_parity.py"),
    ("1  fetch ERA5 observations", "01_fetch_obs.py"),
    ("1b fetch archived NWP forecasts", "01b_fetch_forecasts.py"),
    ("2a daily aggregates and features", "02_features.py"),
    ("2b Layer A models, metrics, SHAP, backtest", "02b_layerA_models.py"),
    ("3  Layer B published coefficients", "03_layer_b.py"),
    ("4  Layer C census vulnerability index", "04_layer_c.py"),
    ("5  Layer D risk engine", "05_risk_engine.py"),
    ("5b export model_results.json", "06_export.py"),
]


def main():
    if "--refresh" in sys.argv:
        for f in glob.glob(os.path.join(ML, "data", "raw", "*")):
            os.remove(f)
        print("cleared ml/data/raw/")
    for label, script in STAGES:
        t = time.time()
        print(f"\n=== Stage {label} ({script}) ===", flush=True)
        r = subprocess.run([sys.executable, os.path.join(ML, script)], cwd=os.path.dirname(ML))
        if r.returncode != 0:
            print(f"FAILED: {script} (exit {r.returncode})")
            sys.exit(r.returncode)
        print(f"--- ok in {time.time() - t:.1f}s")
    print("\nAll stages completed.")


if __name__ == "__main__":
    main()
