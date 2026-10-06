import numpy as np

QUANTILES = (0.1, 0.5, 0.9)


def point_metrics(y, p):
    y, p = np.asarray(y, float), np.asarray(p, float)
    err = p - y
    ss_res = float(np.sum(err**2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    return {"mae": float(np.mean(np.abs(err))), "rmse": float(np.sqrt(np.mean(err**2))),
            "r2": 1 - ss_res / ss_tot if ss_tot > 0 else float("nan"), "bias": float(np.mean(err))}


def pinball(y, q_pred: dict):
    """Mean pinball loss over the quantiles provided ({0.1: array, 0.5: array, 0.9: array})."""
    y = np.asarray(y, float)
    losses = []
    for q, p in q_pred.items():
        d = y - np.asarray(p, float)
        losses.append(np.mean(np.maximum(q * d, (q - 1) * d)))
    return float(np.mean(losses))


def coverage(y, lo, hi):
    y = np.asarray(y, float)
    return float(np.mean((y >= np.asarray(lo)) & (y <= np.asarray(hi))))


def event_scores(y, p, threshold):
    y, p = np.asarray(y) >= threshold, np.asarray(p) >= threshold
    hits = int(np.sum(y & p))
    misses = int(np.sum(y & ~p))
    fa = int(np.sum(~y & p))
    nan = float("nan")
    return {"events": int(y.sum()), "hits": hits, "misses": misses, "false_alarms": fa,
            "hit_rate": hits / (hits + misses) if hits + misses else nan,
            "far": fa / (hits + fa) if hits + fa else nan,
            "csi": hits / (hits + misses + fa) if hits + misses + fa else nan}
