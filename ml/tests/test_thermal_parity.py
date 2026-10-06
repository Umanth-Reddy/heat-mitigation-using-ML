"""Python (ml/common/thermal.py) vs TypeScript (lib/thermal.ts) parity on 20 random input sets. Pass: |Δ| ≤ 0.1 °C."""
import json
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from common import thermal as th  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TOL = 0.1


def main() -> int:
    rng = np.random.default_rng(26083)
    sets = np.column_stack([
        rng.uniform(20, 48, 20),   # air temperature °C
        rng.uniform(8, 90, 20),    # RH %
        rng.uniform(0.5, 8, 20),   # wind m/s
        rng.uniform(0, 1050, 20),  # shortwave W/m²
    ]).round(2)
    ts = json.loads(subprocess.run(
        ["node", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "ml/tests/thermal_ts_values.mjs"],
        input=json.dumps(sets.tolist()), capture_output=True, text=True, check=True, cwd=ROOT).stdout)

    worst = {"tw": 0.0, "wbgt": 0.0, "utci": 0.0}
    failed = 0
    print(f"{'Ta':>6} {'RH':>6} {'v':>5} {'SW':>7} | {'WBGT py':>8} {'WBGT ts':>8} | {'UTCI py':>8} {'UTCI ts':>8}")
    for (ta, rh, v, sw), t in zip(sets, ts):
        py = {
            "tw": float(th.wet_bulb_stull(ta, rh)),
            "wbgt": float(th.wbgt_from_met(ta, rh, sw)),
            "utci": float(th.utci_from_met(ta, rh, v, sw)),
        }
        for k in worst:
            d = abs(py[k] - t[k])
            worst[k] = max(worst[k], d)
            failed += d > TOL
        print(f"{ta:6.2f} {rh:6.2f} {v:5.2f} {sw:7.1f} | {py['wbgt']:8.3f} {t['wbgt']:8.3f} | {py['utci']:8.3f} {t['utci']:8.3f}")
    print("max |Δ|: " + ", ".join(f"{k} {v:.4f} °C" for k, v in worst.items()))
    print("PASS: Python and TypeScript agree within 0.1 °C" if failed == 0 else f"FAIL: {failed} value(s) differ by more than 0.1 °C")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
