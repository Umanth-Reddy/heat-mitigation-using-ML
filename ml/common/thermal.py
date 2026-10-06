"""Heat-stress indices for the UshnaRaksha ML pipeline.

Mirrors lib/thermal.ts exactly (same formulas and constants); ml/tests/test_thermal_parity.py checks that the two
agree within 0.1 °C. UTCI uses the reference implementation in pythermalcomfort (MIT).

Radiant term (documented heuristic, not a globe-temperature model):
    sun_fraction = clip(SW / 1000 W/m², 0, 1)
    WBGT radiant term = 1.5 °C × sun_fraction
    Tmrt              = Ta + 18 °C × sun_fraction
so night = shade (no radiant load) and 1000 W/m² = the dashboard calculator's "Sun" setting.
"""

from __future__ import annotations

import numpy as np
from pythermalcomfort.models import utci as _ptc_utci

FULL_SUN_SW = 1000.0  # W/m²
SUN_RADIANT_WBGT = 1.5  # °C
SUN_TMRT_OFFSET = 18.0  # °C
UTCI_WIND_MIN, UTCI_WIND_MAX = 0.5, 17.0


def wet_bulb_stull(ta, rh):
    """Stull (2011) wet-bulb temperature (°C); valid for RH 5–99 % and Ta −20…50 °C."""
    ta = np.asarray(ta, dtype=float)
    rh = np.asarray(rh, dtype=float)
    return (
        ta * np.arctan(0.151977 * np.sqrt(rh + 8.313659))
        + np.arctan(ta + rh)
        - np.arctan(rh - 1.676331)
        + 0.00391838 * rh**1.5 * np.arctan(0.023101 * rh)
        - 4.686035
    )


def _sun_fraction(sw):
    return np.clip(np.asarray(sw, dtype=float) / FULL_SUN_SW, 0.0, 1.0)


def radiant_term_from_shortwave(sw):
    """WBGT radiant term (°C) from shortwave radiation (W/m²)."""
    return SUN_RADIANT_WBGT * _sun_fraction(sw)


def tmrt_from_shortwave(ta, sw):
    """Mean radiant temperature estimate (°C)."""
    return np.asarray(ta, dtype=float) + SUN_TMRT_OFFSET * _sun_fraction(sw)


def wbgt_estimate(ta, rh, radiant=0.0):
    """Outdoor WBGT estimate (°C): 0.7·Tw + 0.3·Ta + radiant term (same formula as lib/thermal.ts)."""
    return 0.7 * wet_bulb_stull(ta, rh) + 0.3 * np.asarray(ta, dtype=float) + radiant


def wbgt_from_met(ta, rh, sw):
    return wbgt_estimate(ta, rh, radiant_term_from_shortwave(sw))


def utci(ta, tr, v, rh):
    """UTCI (°C) via pythermalcomfort; wind clamped to 0.5–17 m/s like the TS port (no NaN for low wind)."""
    v = np.clip(np.asarray(v, dtype=float), UTCI_WIND_MIN, UTCI_WIND_MAX)
    return np.asarray(_ptc_utci(tdb=ta, tr=tr, v=v, rh=rh, limit_inputs=False, round_output=False).utci, dtype=float)


def utci_from_met(ta, rh, wind, sw):
    return utci(ta, tmrt_from_shortwave(ta, sw), wind, rh)
