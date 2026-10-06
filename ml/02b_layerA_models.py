"""Stage 2b: Layer A heat-stress forecaster. Trains, evaluates and explains every model and baseline.

Models (WBGT = primary target; UTCI = second target for LightGBM and the baselines):
  persistence   today's value carried forward; 10–90 % band from training-year error quantiles per lead
  climatology   training-year values for the same day of year (±7 days): mean as the point, empirical 10/50/90 %
  nwp_raw       archived NWP forecast (as issued, per lead) converted to WBGT/UTCI with ml/common/thermal.py (2024-03 →)
  lgbm          LightGBM, one model per lead and quantile (0.1, 0.5, 0.9), early-stopped on 2023
  nwp_pp        LightGBM post-processing of the NWP forecast + recent observations. NWP inputs exist only from 2024, so it is
                trained on the 2024 season and evaluated on 2025 → latest ("NWP subset"); never on the rows it trained on
  lstm          small PyTorch LSTM, 14-day input window, 5 leads × 3 quantiles, early-stopped on 2023 (WBGT only)
Outputs: ml/outputs/layerA.json and ml/reports/layerA_metrics.md (the stdout table, verbatim).
"""
import json
import os
import sys

import lightgbm as lgb
import numpy as np
import pandas as pd
import shap
import torch

sys.path.insert(0, os.path.dirname(__file__))
from common.metrics import QUANTILES, coverage, event_scores, pinball, point_metrics  # noqa: E402
from common.paths import DATA, OUT, RAW, REPORTS, SEED  # noqa: E402

LEADS = [1, 2, 3, 4, 5]
TARGETS = ["wbgt", "utci"]
np.random.seed(SEED)
torch.manual_seed(SEED)
torch.set_num_threads(4)

LGB_PARAMS = dict(n_estimators=2000, learning_rate=0.03, num_leaves=15, min_child_samples=20, subsample=0.8,
                  subsample_freq=1, colsample_bytree=0.8, reg_lambda=1.0, random_state=SEED, verbose=-1, n_jobs=4)


# ---------------------------------------------------------------- data
def load():
    f = pd.read_csv(os.path.join(RAW, "features.csv"), parse_dates=["issue_date"]).set_index("issue_date")
    daily = pd.read_csv(os.path.join(DATA, "daily_obs.csv"), parse_dates=["date"]).set_index("date").asfreq("D")
    nwp = pd.read_csv(os.path.join(DATA, "daily_nwp.csv"), parse_dates=["valid_date"])
    xcols = [c for c in f.columns if not c.startswith("y_") and c != "split"]
    return f, daily, nwp, xcols


def sort_quantiles(q):
    """Return (sorted predictions, number of rows where the raw quantiles crossed)."""
    stacked = np.vstack([q[a] for a in QUANTILES])
    crossed = int(np.sum(np.any(np.diff(stacked, axis=0) < 0, axis=0)))
    stacked = np.sort(stacked, axis=0)
    return {a: stacked[i] for i, a in enumerate(QUANTILES)}, crossed


# ---------------------------------------------------------------- baselines
def persistence(f, target, lead, tr):
    p = f[f"{target}_max_lag0"].to_numpy()
    err = (f.loc[tr, f"y_{target}_{lead}"] - f.loc[tr, f"{target}_max_lag0"]).to_numpy()
    lo, hi = np.quantile(err, [0.1, 0.9])
    return {0.1: p + lo, 0.5: p + np.median(err), 0.9: p + hi}, p


def climatology(f, daily, target, lead, train_years):
    col = f"{target}_max"
    hist = daily[daily.index.year.isin(train_years)][col].dropna()
    hdoy = hist.index.dayofyear.to_numpy()
    out = {a: [] for a in QUANTILES}
    point = []
    for d in f.index + pd.Timedelta(days=lead):
        dist = np.abs(((hdoy - d.dayofyear) + 182) % 365 - 182)
        vals = hist.to_numpy()[dist <= 7]
        point.append(vals.mean())
        for a in QUANTILES:
            out[a].append(np.quantile(vals, a))
    return {a: np.array(v) for a, v in out.items()}, np.array(point)


# ---------------------------------------------------------------- LightGBM
def fit_lgbm(Xtr, ytr, Xva, yva, alpha):
    m = lgb.LGBMRegressor(objective="quantile", alpha=alpha, **LGB_PARAMS)
    m.fit(Xtr, ytr, eval_set=[(Xva, yva)], eval_metric="quantile",
          callbacks=[lgb.early_stopping(100, verbose=False)])
    return m


def fit_pp(Xpp, y, mask, has_nwp):
    """NWP post-processing quantile models trained on `mask` rows; returns sorted quantile predictions (NaN where no NWP)."""
    q = {}
    for a in QUANTILES:
        m = lgb.LGBMRegressor(objective="quantile", alpha=a, n_estimators=300, learning_rate=0.03, num_leaves=7,
                              min_child_samples=10, random_state=SEED, verbose=-1, n_jobs=4)
        m.fit(Xpp[mask], y[mask])
        q[a] = np.where(has_nwp, m.predict(Xpp.fillna(0)), np.nan)
    return sort_quantiles(q)


def cqr_adjustment(y, lo, hi, level=0.8):
    """Split-conformal (CQR) adjustment Q: the ⌈(n+1)·level⌉-th smallest score max(lo − y, y − hi). Band = [lo − Q, hi + Q]."""
    e = np.maximum(lo - y, y - hi)
    e = np.sort(e[~np.isnan(e)])
    n = len(e)
    k = int(np.ceil((n + 1) * level))
    return float(e[min(k, n) - 1]), n


# ---------------------------------------------------------------- LSTM
LSTM_VARS = ["wbgt_max", "utci_max", "tmax", "tmin", "rh_mean", "sw_max", "wind_mean"]
WINDOW = 14


class QuantileLSTM(torch.nn.Module):
    def __init__(self, n_in, hidden=32):
        super().__init__()
        self.lstm = torch.nn.LSTM(n_in, hidden, batch_first=True)
        self.drop = torch.nn.Dropout(0.1)
        self.head = torch.nn.Linear(hidden, len(LEADS) * len(QUANTILES))

    def forward(self, x):
        h, _ = self.lstm(x)
        return self.head(self.drop(h[:, -1])).view(-1, len(LEADS), len(QUANTILES))


def lstm_tensors(f, daily, mu, sd):
    seq = daily[LSTM_VARS].copy()
    doy = seq.index.dayofyear
    seq["doy_sin"], seq["doy_cos"] = np.sin(2 * np.pi * doy / 365.25), np.cos(2 * np.pi * doy / 365.25)
    seq = (seq - mu) / sd
    X, keep = [], []
    for i, d in enumerate(f.index):
        win = seq.loc[d - pd.Timedelta(days=WINDOW - 1): d]
        if len(win) == WINDOW and not win.isna().any().any():
            X.append(win.to_numpy())
            keep.append(i)
    y = f[[f"y_wbgt_{h}" for h in LEADS]].to_numpy()[keep]
    return torch.tensor(np.array(X), dtype=torch.float32), torch.tensor(y, dtype=torch.float32), np.array(keep)


def run_lstm(f, daily, tr, va):
    train_days = daily[daily.index.year.isin(range(2015, 2023))]
    base = train_days[LSTM_VARS].copy()
    doy = base.index.dayofyear
    base["doy_sin"], base["doy_cos"] = np.sin(2 * np.pi * doy / 365.25), np.cos(2 * np.pi * doy / 365.25)
    mu, sd = base.mean(), base.std()
    y_mu, y_sd = float(base["wbgt_max"].mean()), float(base["wbgt_max"].std())
    Xall, yall, keep = lstm_tensors(f, daily, mu, sd)
    split = f["split"].to_numpy()[keep]
    yn = (yall - y_mu) / y_sd
    q = torch.tensor(QUANTILES).view(1, 1, -1)

    def loss_fn(pred, y):
        d = y.unsqueeze(-1) - pred
        return torch.mean(torch.maximum(q * d, (q - 1) * d))

    model = QuantileLSTM(Xall.shape[-1])
    opt = torch.optim.Adam(model.parameters(), lr=3e-3, weight_decay=1e-4)
    itr, iva = np.where(split == "train")[0], np.where(split == "val")[0]
    gen = torch.Generator().manual_seed(SEED)
    best, best_state, bad, epochs = np.inf, None, 0, 0
    for epoch in range(400):
        model.train()
        perm = itr[torch.randperm(len(itr), generator=gen).numpy()]  # minibatch order only; the split stays time-ordered
        for b in range(0, len(perm), 64):
            idx = perm[b:b + 64]
            opt.zero_grad()
            loss = loss_fn(model(Xall[idx]), yn[idx])
            loss.backward()
            opt.step()
        model.eval()
        with torch.no_grad():
            v = loss_fn(model(Xall[iva]), yn[iva]).item()
        if v < best - 1e-5:
            best, best_state, bad, epochs = v, {k: t.clone() for k, t in model.state_dict().items()}, 0, epoch + 1
        else:
            bad += 1
            if bad >= 30:
                break
    model.load_state_dict(best_state)
    model.eval()
    with torch.no_grad():
        pred = model(Xall).numpy() * y_sd + y_mu
    out = {h: {a: np.full(len(f), np.nan) for a in QUANTILES} for h in LEADS}
    for j, h in enumerate(LEADS):
        for k, a in enumerate(QUANTILES):
            out[h][a][keep] = pred[:, j, k]
    return out, {"epochs_trained": epochs, "best_val_pinball_std_units": round(best, 4),
                 "hidden": 32, "window_days": WINDOW, "params": sum(p.numel() for p in model.parameters())}


# ---------------------------------------------------------------- evaluation
def evaluate(y, q, point=None):
    point = q[0.5] if point is None else point
    m = point_metrics(y, point)
    if q is not None and 0.1 in q:
        m["pinball"] = pinball(y, q)
        m["cov80"] = coverage(y, q[0.1], q[0.9])
    return m


def main():
    f, daily, nwp, xcols = load()
    tr, va, te = (f["split"] == s for s in ("train", "val", "test"))
    train_years = list(range(2015, 2023))
    season_train = daily[daily.index.year.isin(train_years) & daily.index.month.isin([3, 4, 5, 6])]
    p95 = {t: float(season_train[f"{t}_max"].quantile(0.95)) for t in TARGETS}
    tiers = json.load(open(os.path.join(OUT, "tiers.json"), encoding="utf-8"))  # single source of truth (02_features.py)
    tier_cuts = [{"tier": k.capitalize(), "wbgt_min": v} for k, v in tiers["cutoffs"].items()]

    # NWP per lead, aligned to issue date
    nwp_by_lead = {}
    for h in LEADS:
        n = nwp[nwp["lead"] == h].set_index("valid_date")
        n.index = n.index - pd.Timedelta(days=h)  # issue date = valid date − lead
        nwp_by_lead[h] = n.reindex(f.index)
    has_nwp = ~nwp_by_lead[1]["nwp_wbgt_max"].isna()
    nwp_test = te & has_nwp & (f.index + pd.Timedelta(days=1) >= pd.Timestamp("2025-01-01"))  # out-of-sample for nwp_pp
    nwp_train = has_nwp & (f.index + pd.Timedelta(days=1) < pd.Timestamp("2025-01-01"))

    preds = {t: {h: {} for h in LEADS} for t in TARGETS}  # preds[target][lead][model] = {q: array} (full length)
    points = {t: {h: {} for h in LEADS} for t in TARGETS}
    crossings = {}
    models = {}
    best_iters = {}
    Xpp_by = {}
    for t in TARGETS:
        for h in LEADS:
            y = f[f"y_{t}_{h}"].to_numpy()
            preds[t][h]["persistence"], points[t][h]["persistence"] = persistence(f, t, h, tr)
            preds[t][h]["climatology"], points[t][h]["climatology"] = climatology(f, daily, t, h, train_years)
            nv = nwp_by_lead[h][f"nwp_{t}_max"].to_numpy()
            preds[t][h]["nwp_raw"], points[t][h]["nwp_raw"] = None, nv
            q = {}
            for a in QUANTILES:
                m = fit_lgbm(f.loc[tr, xcols], y[tr], f.loc[va, xcols], y[va], a)
                q[a] = m.predict(f[xcols])
                models[(t, h, a)] = m
                best_iters[f"{t}_lead{h}_q{a}"] = int(m.best_iteration_ or LGB_PARAMS["n_estimators"])
            preds[t][h]["lgbm"], crossings[f"lgbm_{t}_lead{h}"] = sort_quantiles(q)
            points[t][h]["lgbm"] = preds[t][h]["lgbm"][0.5]
            # NWP post-processing: NWP forecast for this lead + latest observations, trained on 2024 only
            pp_cols = [f"nwp_{c}" for c in ["wbgt_max", "utci_max", "tmax", "tmin", "rh_mean", "sw_max", "wind_mean"]]
            Xpp = pd.concat([nwp_by_lead[h][pp_cols], f[[f"{t}_max_lag0", f"{t}_max_lag1", "tmin_lag0", "doy_sin", "doy_cos"]]], axis=1)
            Xpp_by[(t, h)] = Xpp
            preds[t][h]["nwp_pp"], crossings[f"nwp_pp_{t}_lead{h}"] = fit_pp(Xpp, y, nwp_train, has_nwp)
            points[t][h]["nwp_pp"] = preds[t][h]["nwp_pp"][0.5]

    lstm_q, lstm_info = run_lstm(f, daily, tr, va)
    for h in LEADS:
        preds["wbgt"][h]["lstm"], crossings[f"lstm_wbgt_lead{h}"] = sort_quantiles(lstm_q[h])
        points["wbgt"][h]["lstm"] = preds["wbgt"][h]["lstm"][0.5]

    # ------------------------------------------------ conformal calibration (CQR)
    # LightGBM and LSTM: per-lead adjustment from the 2023 validation season ONLY (test years never touched).
    # Caveat: both models were also early-stopped on 2023, so the calibration set is not independent of model selection.
    # NWP post-processing: only the 2024 season exists, so out-of-fold predictions from leave-one-month-out within 2024.
    calibration = {}
    for t in TARGETS:
        for h in LEADS:
            y = f[f"y_{t}_{h}"].to_numpy()
            target_month = (f.index + pd.Timedelta(days=h)).month.to_numpy()
            for name in ("lgbm", "lstm"):
                if name not in preds[t][h]:
                    continue
                q = preds[t][h][name]
                Q, n = cqr_adjustment(y[va.to_numpy()], q[0.1][va.to_numpy()], q[0.9][va.to_numpy()])
                calibration.setdefault(t, {}).setdefault(name, {})[h] = {"Q": Q, "n_cal": n, "method": "CQR on the 2023 validation season"}
                preds[t][h][f"{name}_cal"] = {0.1: q[0.1] - Q, 0.5: q[0.5], 0.9: q[0.9] + Q}
                points[t][h][f"{name}_cal"] = q[0.5]
            oof = {a: np.full(len(f), np.nan) for a in QUANTILES}
            months = sorted(set(target_month[nwp_train.to_numpy()]))
            for mth in months:
                fit_mask = nwp_train & (target_month != mth)
                hold = (nwp_train & (target_month == mth)).to_numpy()
                qq, _ = fit_pp(Xpp_by[(t, h)], y, fit_mask, has_nwp)
                for a in QUANTILES:
                    oof[a][hold] = qq[a][hold]
            ntr = nwp_train.to_numpy()
            Q, n = cqr_adjustment(y[ntr], oof[0.1][ntr], oof[0.9][ntr])
            calibration.setdefault(t, {}).setdefault("nwp_pp", {})[h] = {
                "Q": Q, "n_cal": n, "months_held_out": [int(m) for m in months],
                "method": "CQR on leave-one-month-out predictions within the 2024 training season"}
            qp = preds[t][h]["nwp_pp"]
            preds[t][h]["nwp_pp_cal"] = {0.1: qp[0.1] - Q, 0.5: qp[0.5], 0.9: qp[0.9] + Q}
            points[t][h]["nwp_pp_cal"] = qp[0.5]

    # ------------------------------------------------ metrics
    results = {"main": {}, "nwp_subset": {}, "events": {}}
    for t in TARGETS:
        for h in LEADS:
            y = f[f"y_{t}_{h}"].to_numpy()
            for name in points[t][h]:
                for subset, mask in (("main", te.to_numpy()), ("nwp_subset", nwp_test.to_numpy())):
                    if name.startswith("nwp") and subset == "main":
                        continue
                    pm = points[t][h][name][mask]
                    if np.isnan(pm).any():
                        continue
                    q = preds[t][h][name]
                    qm = {a: v[mask] for a, v in q.items()} if q is not None else None
                    results[subset].setdefault(t, {}).setdefault(name, {})[h] = evaluate(y[mask], qm, pm)
                    if t == "wbgt":
                        ev = {"p95": event_scores(y[mask], pm, p95[t])}
                        if q is not None and 0.9 in q:
                            # warning issued when the upper (90 %) quantile reaches the threshold; fixed rule, not tuned
                            ev["p95_q90_trigger"] = event_scores(y[mask], q[0.9][mask], p95[t])
                        for c in tier_cuts:
                            ev[c["tier"]] = event_scores(y[mask], pm, c["wbgt_min"])
                        results["events"].setdefault(subset, {}).setdefault(name, {})[h] = ev

    # ------------------------------------------------ SHAP (median WBGT model, lead 3)
    m3 = models[("wbgt", 3, 0.5)]
    Xte = f.loc[te, xcols]
    sv = shap.TreeExplainer(m3).shap_values(Xte)
    gl = sorted(zip(xcols, np.abs(sv).mean(axis=0)), key=lambda x: -x[1])
    y3 = f.loc[te, "y_wbgt_3"]
    i_hot = int(np.argmax(y3.to_numpy()))
    hot_issue = Xte.index[i_hot]
    expl = shap.TreeExplainer(m3)
    local = sorted(zip(xcols, sv[i_hot], Xte.iloc[i_hot].to_numpy()), key=lambda x: -abs(x[1]))[:10]
    shap_out = {
        "model": "LightGBM median (q=0.5), WBGT, lead 3 days", "evaluated_on": "test rows",
        "global": [{"feature": k, "mean_abs_shap": round(float(v), 4)} for k, v in gl[:15]],
        "local": {"issue_date": hot_issue.strftime("%Y-%m-%d"),
                  "target_date": (hot_issue + pd.Timedelta(days=3)).strftime("%Y-%m-%d"),
                  "actual": round(float(y3.iloc[i_hot]), 2),
                  "predicted": round(float(m3.predict(Xte.iloc[[i_hot]])[0]), 2),
                  "base_value": round(float(np.ravel(expl.expected_value)[0]), 3),
                  "contributions": [{"feature": k, "shap": round(float(s), 3), "value": round(float(v), 2)} for k, s, v in local]},
    }

    # ------------------------------------------------ backtest series: hottest two consecutive test-season months
    test_days = daily[(daily.index.year >= 2024) & daily.index.month.isin([3, 4, 5, 6])]["wbgt_max"]
    best = max(((y, m) for y in sorted(set(test_days.index.year)) for m in (3, 4, 5)),
               key=lambda ym: test_days[(test_days.index.year == ym[0]) & test_days.index.month.isin([ym[1], ym[1] + 1])].mean())
    by, bm = best
    backtest = {"window": f"{by}-{bm:02d} to {by}-{bm + 1:02d}", "model": "lgbm", "leads": {}}
    for h in (1, 3, 5):
        q = preds["wbgt"][h]["lgbm"]
        valid = f.index + pd.Timedelta(days=h)
        sel = te.to_numpy() & (valid.year == by) & valid.month.isin([bm, bm + 1])
        rows = []
        for i in np.where(sel)[0]:
            rows.append({"date": valid[i].strftime("%Y-%m-%d"), "actual": round(float(f[f"y_wbgt_{h}"].iloc[i]), 2),
                         "median": round(float(q[0.5][i]), 2), "lo": round(float(q[0.1][i]), 2), "hi": round(float(q[0.9][i]), 2)})
        backtest["leads"][str(h)] = rows

    # ------------------------------------------------ report
    names = {"persistence": "Persistence", "climatology": "Climatology", "nwp_raw": "NWP raw (as issued)",
             "lgbm": "LightGBM quantile", "nwp_pp": "LightGBM NWP post-proc.", "lstm": "LSTM quantile",
             "lgbm_cal": "LightGBM quantile (calibrated)", "lstm_cal": "LSTM quantile (calibrated)",
             "nwp_pp_cal": "LightGBM NWP post-proc. (calibrated)"}
    lines = []
    n_main = int(te.sum())
    n_nwp = int(nwp_test.sum())
    lines.append("# Layer A: heat-stress forecaster, test-set metrics\n")
    lines.append(f"Data: ERA5 via Open-Meteo, New Delhi, daily max WBGT/UTCI, March–June. Train 2015–2022 "
                 f"({int(tr.sum())} issue days), validate 2023 ({int(va.sum())}), test 2024–{f.index.max().year} ({n_main}).")
    lines.append(f"NWP subset: test issue days from 2025 with archived NWP forecasts ({n_nwp}); NWP post-processing is trained on 2024 only.")
    lines.append(f"Local P95 (training years, Mar–Jun daily max): WBGT {p95['wbgt']:.2f} °C, UTCI {p95['utci']:.2f} °C.\n")
    for t in TARGETS:
        for subset, label in (("main", f"Test 2024–{f.index.max().year}"), ("nwp_subset", "NWP subset (2025 →)")):
            block = results[subset].get(t, {})
            if not block:
                continue
            lines.append(f"## {t.upper()} · {label}\n")
            lines.append("| Model | Lead | MAE | RMSE | R² | Pinball | 80% cov. |")
            lines.append("|---|---|---|---|---|---|---|")
            for name, per in block.items():
                for h, m in per.items():
                    pb = f"{m['pinball']:.3f}" if "pinball" in m else "–"
                    cv = f"{m['cov80']:.2f}" if "cov80" in m else "–"
                    lines.append(f"| {names[name]} | {h} | {m['mae']:.3f} | {m['rmse']:.3f} | {m['r2']:.3f} | {pb} | {cv} |")
            lines.append("")
    lines.append(f"## Event skill · WBGT ≥ local P95 ({p95['wbgt']:.2f} °C) · Test 2024–{f.index.max().year}\n")
    lines.append("| Model | Lead | Events | Hits | Misses | False alarms | Hit rate | FAR | CSI |")
    lines.append("|---|---|---|---|---|---|---|---|---|")
    for name, per in results["events"]["main"].items():
        for h, ev in per.items():
            e = ev["p95"]
            fmt = lambda x: "–" if x != x else f"{x:.2f}"  # noqa: E731
            lines.append(f"| {names[name]} | {h} | {e['events']} | {e['hits']} | {e['misses']} | {e['false_alarms']} | "
                         f"{fmt(e['hit_rate'])} | {fmt(e['far'])} | {fmt(e['csi'])} |")
    lines.append("")
    lines.append(f"## Event skill · WBGT ≥ local P95 · warning when the 90 % quantile reaches it · Test 2024–{f.index.max().year}\n")
    lines.append("Added after the median-trigger results above showed that median forecasts rarely reach the threshold. "
                 "The rule (q = 0.9) is fixed, not tuned on any data.\n")
    lines.append("| Model | Lead | Events | Hits | Misses | False alarms | Hit rate | FAR | CSI |")
    lines.append("|---|---|---|---|---|---|---|---|---|")
    for name, per in results["events"]["main"].items():
        for h, ev in per.items():
            if "p95_q90_trigger" not in ev:
                continue
            e = ev["p95_q90_trigger"]
            fmt = lambda x: "–" if x != x else f"{x:.2f}"  # noqa: E731
            lines.append(f"| {names[name]} | {h} | {e['events']} | {e['hits']} | {e['misses']} | {e['false_alarms']} | "
                         f"{fmt(e['hit_rate'])} | {fmt(e['far'])} | {fmt(e['csi'])} |")
    lines.append("")
    # does each model beat the baselines? (lower MAE / pinball is better)
    beats = {}
    lines.append(f"## Versus baselines · WBGT · Test 2024–{f.index.max().year} (✓ = better than the baseline, ✗ = worse)\n")
    lines.append("| Model | Lead | MAE vs persistence | MAE vs climatology | Pinball vs persistence | Pinball vs climatology |")
    lines.append("|---|---|---|---|---|---|")
    mw = results["main"]["wbgt"]
    for name in ("lgbm", "lstm"):
        for h in LEADS:
            m = mw[name][h]
            row = {}
            for base in ("persistence", "climatology"):
                b = mw[base][h]
                row[f"mae_vs_{base}"] = bool(m["mae"] < b["mae"])
                row[f"pinball_vs_{base}"] = bool(m["pinball"] < b["pinball"])
            beats.setdefault(name, {})[h] = row
            mark = lambda v: "✓" if v else "✗"  # noqa: E731
            lines.append(f"| {names[name]} | {h} | {mark(row['mae_vs_persistence'])} {m['mae']:.3f} vs {mw['persistence'][h]['mae']:.3f} | "
                         f"{mark(row['mae_vs_climatology'])} {m['mae']:.3f} vs {mw['climatology'][h]['mae']:.3f} | "
                         f"{mark(row['pinball_vs_persistence'])} {m['pinball']:.4f} vs {mw['persistence'][h]['pinball']:.4f} | "
                         f"{mark(row['pinball_vs_climatology'])} {m['pinball']:.4f} vs {mw['climatology'][h]['pinball']:.4f} |")
    lines.append("")
    pred_rows = []
    for h in LEADS:
        q = preds["wbgt"][h]["lgbm"]
        qu = preds["utci"][h]["lgbm"]
        for i in np.where(te.to_numpy())[0]:
            pred_rows.append({"issue_date": f.index[i].strftime("%Y-%m-%d"),
                              "target_date": (f.index[i] + pd.Timedelta(days=h)).strftime("%Y-%m-%d"), "lead": h,
                              "wbgt_actual": round(float(f[f"y_wbgt_{h}"].iloc[i]), 3),
                              "wbgt_q10": round(float(q[0.1][i]), 3), "wbgt_q50": round(float(q[0.5][i]), 3),
                              "wbgt_q90": round(float(q[0.9][i]), 3),
                              "utci_actual": round(float(f[f"y_utci_{h}"].iloc[i]), 3), "utci_q50": round(float(qu[0.5][i]), 3)})
    pd.DataFrame(pred_rows).to_csv(os.path.join(OUT, "layerA_test_predictions.csv"), index=False)
    # ---- calibration report
    lines.append("## Conformal calibration of the 80 % bands (CQR)\n")
    lines.append("Per-lead adjustment Q (°C) added to both band edges: [q10 − Q, q90 + Q]. LightGBM and LSTM: Q from the 2023 "
                 "validation season only (both models were also early-stopped on 2023, so it is not a fully independent calibration set). "
                 "NWP post-processing: only the 2024 season exists, so Q comes from leave-one-month-out predictions within 2024. "
                 "Test years are never used. Raw results above are kept unchanged.\n")
    lines.append("| Model | Subset | Lead | Q (°C) | Cal. n | 80% cov. raw | 80% cov. calibrated | Pinball raw | Pinball calibrated |")
    lines.append("|---|---|---|---|---|---|---|---|---|")
    for name, subset in (("lgbm", "main"), ("lstm", "main"), ("nwp_pp", "nwp_subset")):
        raw_m, cal_m = results[subset]["wbgt"][name], results[subset]["wbgt"][f"{name}_cal"]
        for h in LEADS:
            c = calibration["wbgt"][name][h]
            lines.append(f"| {names[name]} | {'test 2024 →' if subset == 'main' else 'NWP subset 2025 →'} | {h} | {c['Q']:+.3f} | {c['n_cal']} | "
                         f"{raw_m[h]['cov80']:.2f} | {cal_m[h]['cov80']:.2f} | {raw_m[h]['pinball']:.3f} | {cal_m[h]['pinball']:.3f} |")
    lines.append("")
    # ---- event skill with calibrated triggers
    lines.append(f"## Event skill · WBGT ≥ local P95 ({p95['wbgt']:.2f} °C) · median vs calibrated 90 % quantile trigger\n")
    lines.append("(a) warning when the median reaches the threshold; (b) warning when the CALIBRATED 90 % quantile reaches it. "
                 "Trigger rule (b) was chosen after inspecting results: the 90 % trigger was first adopted after the median-trigger "
                 "results were seen on the test set in an earlier run. Its calibration uses the 2023 validation season only "
                 "(2024 leave-one-month-out for NWP post-processing).\n")
    lines.append("| Model | Subset | Lead | Events | (a) Hit | (a) FAR | (a) CSI | (b) Hit | (b) FAR | (b) CSI |")
    lines.append("|---|---|---|---|---|---|---|---|---|---|")
    fmt2 = lambda x: "–" if x != x else f"{x:.2f}"  # noqa: E731
    for name, subset in (("lgbm_cal", "main"), ("lstm_cal", "main"), ("nwp_pp_cal", "nwp_subset"), ("lgbm_cal", "nwp_subset"), ("lstm_cal", "nwp_subset")):
        for h in LEADS:
            ev = results["events"][subset][name][h]
            a_, b_ = ev["p95"], ev["p95_q90_trigger"]
            lines.append(f"| {names[name.replace('_cal', '')]} | {'test 2024 →' if subset == 'main' else 'NWP subset 2025 →'} | {h} | {a_['events']} | "
                         f"{fmt2(a_['hit_rate'])} | {fmt2(a_['far'])} | {fmt2(a_['csi'])} | {fmt2(b_['hit_rate'])} | {fmt2(b_['far'])} | {fmt2(b_['csi'])} |")
    lines.append("")
    # ---- improvement vs baselines in %
    lines.append(f"## MAE improvement vs baselines (%, positive = better) · WBGT\n")
    lines.append("| Model | Subset | Lead | vs persistence | vs climatology |")
    lines.append("|---|---|---|---|---|")
    improvement = {}
    for name, subset in (("lgbm", "main"), ("lstm", "main"), ("nwp_pp", "nwp_subset"), ("nwp_raw", "nwp_subset")):
        blk = results[subset]["wbgt"]
        for h in LEADS:
            ip = 100 * (1 - blk[name][h]["mae"] / blk["persistence"][h]["mae"])
            ic = 100 * (1 - blk[name][h]["mae"] / blk["climatology"][h]["mae"])
            improvement.setdefault(subset, {}).setdefault(name, {})[h] = {"vs_persistence_pct": ip, "vs_climatology_pct": ic}
            lines.append(f"| {names[name]} | {'test 2024 →' if subset == 'main' else 'NWP subset 2025 →'} | {h} | {ip:+.1f}% | {ic:+.1f}% |")
    lines.append("")
    tier_events = {c["tier"]: int(results["events"]["main"]["persistence"][1][c["tier"]]["events"]) for c in tier_cuts}
    lines.append(f"## Event skill at the warning-tier cut-offs (calibrated to real WBGT: {tiers['rule']})\n")
    lines.append("Observed test-set days at or above each cut-off (lead 1 rows): " +
                 ", ".join(f"{k} ≥ {c['wbgt_min']} °C: {tier_events[k]}" for k, c in zip(tier_events, tier_cuts)) + ".")
    lines.append("Median forecast as the trigger. Per-model scores for every cut-off and lead are in ml/outputs/layerA.json.\n")
    lines.append("| Model | Tier | Lead | Events | Hit rate | FAR | CSI |")
    lines.append("|---|---|---|---|---|---|---|")
    for name in ("persistence", "lgbm", "lstm"):
        for c in tier_cuts:
            for h in (1, 3, 5):
                e = results["events"]["main"][name][h][c["tier"]]
                fmtt = lambda x: "–" if x != x else f"{x:.2f}"  # noqa: E731
                lines.append(f"| {names[name]} | {c['tier']} ≥ {c['wbgt_min']} | {h} | {e['events']} | {fmtt(e['hit_rate'])} | {fmtt(e['far'])} | {fmtt(e['csi'])} |")
    lines.append("")
    lines.append("## Quantile crossing (rows where raw 10/50/90 % predictions crossed, before sorting)\n")
    lines.append(", ".join(f"{k}: {v}" for k, v in crossings.items()) + "\n")
    lines.append(f"LSTM: {lstm_info}\n")
    lines.append(f"## SHAP · {shap_out['model']}\n")
    lines.append("Top global features (mean |SHAP|, °C): " + ", ".join(f"{g['feature']} {g['mean_abs_shap']:.3f}" for g in shap_out["global"][:8]))
    lo = shap_out["local"]
    lines.append(f"\nHottest test target day {lo['target_date']} (issued {lo['issue_date']}): actual {lo['actual']} °C, "
                 f"predicted {lo['predicted']} °C, base {lo['base_value']} °C. Top contributions: " +
                 ", ".join(f"{c['feature']}={c['value']} ({c['shap']:+.2f})" for c in lo["contributions"][:5]))
    report = "\n".join(lines)
    print(report)
    with open(os.path.join(REPORTS, "layerA_metrics.md"), "w", encoding="utf-8") as fh:
        fh.write(report + "\n")

    def clean(o):
        if isinstance(o, dict):
            return {str(k): clean(v) for k, v in o.items()}
        if isinstance(o, list):
            return [clean(v) for v in o]
        if isinstance(o, float):
            return None if o != o else round(o, 4)
        return o

    out = {
        "data": {"source": "ERA5 via Open-Meteo archive API", "location": "New Delhi (28.63, 77.22)",
                 "season_months": [3, 4, 5, 6], "first_issue": f.index.min().strftime("%Y-%m-%d"),
                 "last_issue": f.index.max().strftime("%Y-%m-%d"),
                 "split": {"train": "2015–2022", "validation": "2023", "test": f"2024–{f.index.max().year}",
                           "n_train": int(tr.sum()), "n_val": int(va.sum()), "n_test": n_main, "n_nwp_subset": n_nwp},
                 "p95": p95, "tier_cutoffs": tier_cuts, "test_tier_events": tier_events},
        "metrics": results, "calibration": calibration, "improvement": improvement, "tiers": tiers, "beats_baselines": beats, "quantile_crossings": crossings, "lstm": lstm_info, "lgbm_params": LGB_PARAMS,
        "lgbm_best_iterations": best_iters, "shap": shap_out, "backtest": backtest,
    }
    with open(os.path.join(OUT, "layerA.json"), "w", encoding="utf-8") as fh:
        json.dump(clean(out), fh, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
