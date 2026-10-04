"""
UshnaRaksha — synthetic early-warning dataset generator (demo / prototype only).

Reads  : public/data/grid.geojson   (existing 256-cell Connaught Place grid)
Writes : public/data/risk/meta.json
         public/data/risk/cells.json
         public/data/risk/wards.json
         public/data/risk/ward_outlines.geojson
         public/data/risk/alerts.json
         public/data/risk/models.json

Pure standard library, deterministic (seeded), no network access.
It never modifies any existing file. Every number it produces is SIMULATED
to illustrate the UshnaRaksha pipeline; none of it is real observation or model output.

Run from the project root:  python scripts/generate_risk_data.py
"""

import json
import math
import os
import random
from collections import defaultdict
from datetime import date, timedelta

random.seed(26083)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRID_PATH = os.path.join(ROOT, "public", "data", "grid.geojson")
OUT_DIR = os.path.join(ROOT, "public", "data", "risk")
os.makedirs(OUT_DIR, exist_ok=True)

# --------------------------------------------------------------------------
# Scenario settings
# --------------------------------------------------------------------------
ISSUE_DATE = date(2026, 5, 18)          # "today" in the demo (pre-monsoon heatwave)
ISSUE_TIME = "2026-05-18T06:00:00+05:30"
N_DAYS = 6                              # day 0 (today) + 5-day forecast

# City-wide daily forecast driving the heatwave story (peaks on day 3)
CITY_TA_MAX = [42.0, 43.3, 44.6, 45.5, 44.5, 41.9]   # afternoon air temp, °C
CITY_RH = [24, 26, 29, 33, 31, 27]                    # afternoon relative humidity, %
CITY_TMIN = [29.8, 30.9, 32.1, 33.0, 32.2, 30.4]      # night-time minimum, °C
CITY_WIND = [3.2, 2.8, 2.1, 1.7, 2.2, 3.0]            # m/s

# IMD-style 4-tier colour code applied to WBGT (°C).
# Cut-offs are presented as calibrated to Delhi's local 95th-percentile baseline.
TIERS = [
    {"id": 0, "key": "green",  "label": "No action",  "imd": "Green",  "color": "#22c55e", "wbgt_min": None, "wbgt_max": 31.5,
     "meaning": "Normal summer conditions. Routine advisories only."},
    {"id": 1, "key": "yellow", "label": "Be aware",   "imd": "Yellow", "color": "#facc15", "wbgt_min": 31.5, "wbgt_max": 33.5,
     "meaning": "Heat stress likely for vulnerable groups. Public advisories, hydration points."},
    {"id": 2, "key": "orange", "label": "Be prepared", "imd": "Orange", "color": "#f97316", "wbgt_min": 33.5, "wbgt_max": 35.5,
     "meaning": "High heat stress. Open cooling centres, shift outdoor work, hospitals on alert."},
    {"id": 3, "key": "red",    "label": "Take action", "imd": "Red",    "color": "#dc2626", "wbgt_min": 35.5, "wbgt_max": None,
     "meaning": "Extreme heat stress. Full Heat Action Plan activation and targeted alerts."},
]

UTCI_CATEGORIES = [  # standard UTCI assessment scale (heat side)
    {"min": 26, "max": 32, "label": "Moderate heat stress"},
    {"min": 32, "max": 38, "label": "Strong heat stress"},
    {"min": 38, "max": 46, "label": "Very strong heat stress"},
    {"min": 46, "max": 99, "label": "Extreme heat stress"},
]

WARD_META = {
    "Barakhamba Road High-Rise Corridor":           {"id": "W01", "short": "Barakhamba Road",   "slum": 0.10, "elderly": 0.11, "outdoor": 0.21, "cc": "Cooling Centre 1 · Barakhamba Community Hall"},
    "Janpath & Tolstoy Marg Precinct":              {"id": "W02", "short": "Janpath–Tolstoy Marg", "slum": 0.14, "elderly": 0.10, "outdoor": 0.24, "cc": "Cooling Centre 2 · Janpath Market Shelter"},
    "Gole Market & Baba Kharak Singh Marg":         {"id": "W03", "short": "Gole Market",       "slum": 0.24, "elderly": 0.14, "outdoor": 0.19, "cc": "Cooling Centre 3 · Gole Market Dispensary Hall"},
    "Parliament Street Commercial Zone":            {"id": "W04", "short": "Parliament Street", "slum": 0.06, "elderly": 0.08, "outdoor": 0.17, "cc": "Cooling Centre 4 · Parliament St Transit Shelter"},
    "Kasturba Gandhi Marg District":                {"id": "W05", "short": "Kasturba Gandhi Marg", "slum": 0.09, "elderly": 0.12, "outdoor": 0.15, "cc": "Cooling Centre 5 · KG Marg Community Centre"},
    "Connaught Place Inner Circle & Central Park":  {"id": "W06", "short": "CP Inner Circle",   "slum": 0.02, "elderly": 0.07, "outdoor": 0.28, "cc": "Cooling Centre 6 · Central Park Pavilion"},
}

HINDI_WARD = {
    "W01": "बाराखंभा रोड", "W02": "जनपथ–टॉलस्टॉय मार्ग", "W03": "गोल मार्केट",
    "W04": "पार्लियामेंट स्ट्रीट", "W05": "कस्तूरबा गांधी मार्ग", "W06": "कनॉट प्लेस इनर सर्कल",
}
HINDI_TIER = {0: "हरा", 1: "पीला", 2: "नारंगी", 3: "लाल"}
HINDI_SEVERITY = {1: "गर्मी", 2: "तेज़ गर्मी", 3: "अत्यधिक गर्मी"}
HINDI_MONTH = {5: "मई", 6: "जून", 4: "अप्रैल"}


def hindi_date(iso):
    y, m, d = iso.split("-")
    return f"{int(d)} {HINDI_MONTH.get(int(m), m)}"


# Ward-level radiant / ventilation offsets (°C) so wards differ in the story
WARD_OFFSET = {"W01": 0.6, "W02": 0.05, "W03": 0.45, "W04": -0.45, "W05": -0.75, "W06": -0.6}


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def r1(v):
    return round(v, 1)


def r2(v):
    return round(v, 2)


def vapour_pressure(ta, rh):
    return rh / 100.0 * 6.105 * math.exp(17.27 * ta / (237.7 + ta))


def wet_bulb_stull(ta, rh):
    """Stull (2011) wet-bulb temperature approximation."""
    return (ta * math.atan(0.151977 * math.sqrt(rh + 8.313659)) + math.atan(ta + rh) - math.atan(rh - 1.676331)
            + 0.00391838 * rh ** 1.5 * math.atan(0.023101 * rh) - 4.686035)


def wbgt_estimate(ta, rh, radiant=0.0):
    """Outdoor WBGT estimate: 0.7*Tw + 0.3*Ta plus a radiant-load term from downscaled LST."""
    return 0.7 * wet_bulb_stull(ta, rh) + 0.3 * ta + radiant


def tier_of(wbgt):
    for t in reversed(TIERS):
        if t["wbgt_min"] is not None and wbgt >= t["wbgt_min"]:
            return t["id"]
    return 0


def utci_category(utci):
    for c in UTCI_CATEGORIES:
        if c["min"] <= utci < c["max"]:
            return c["label"]
    return "Moderate heat stress"


def day_label(i):
    d = ISSUE_DATE + timedelta(days=i)
    return {"index": i, "date": d.isoformat(), "weekday": d.strftime("%a"),
            "label": "Today" if i == 0 else d.strftime("%a %d %b"), "short": d.strftime("%d %b")}


# --------------------------------------------------------------------------
# Load grid
# --------------------------------------------------------------------------
with open(GRID_PATH, encoding="utf-8") as f:
    grid = json.load(f)

features = grid["features"]
props_by_id = {f["properties"]["cell_id"]: f["properties"] for f in features}
avg_ta = sum(p["ta_current"] for p in props_by_id.values()) / len(props_by_id)
avg_lst = sum(p["lst_current"] for p in props_by_id.values()) / len(props_by_id)

# --------------------------------------------------------------------------
# Cells
# --------------------------------------------------------------------------
cells_out = {}
ward_cells = defaultdict(list)

for cid, p in props_by_id.items():
    wm = WARD_META[p["ward_name"]]
    canopy = p["canopy_pct"] / 100.0
    # demographics (simulated around ward means)
    elderly = clamp(wm["elderly"] + random.uniform(-0.025, 0.025), 0.04, 0.20)
    outdoor = clamp(wm["outdoor"] + random.uniform(-0.04, 0.04), 0.06, 0.35)
    slum = clamp(wm["slum"] + random.uniform(-0.06, 0.08), 0.0, 0.45)
    # composite heat-vulnerability index (0..1), independent of LST
    vuln = clamp(0.32 * (elderly / 0.20) + 0.28 * (outdoor / 0.35) + 0.25 * (slum / 0.45)
                 + 0.15 * (1 - canopy / 0.5) + random.uniform(-0.04, 0.04), 0.05, 0.98)

    local_ta = (p["ta_current"] - avg_ta) * 0.55          # urban-heat-island offset
    local_rad = (p["lst_current"] - avg_lst) * 0.12         # radiant load offset for WBGT
    days = []
    for d in range(N_DAYS):
        ta = CITY_TA_MAX[d] + local_ta + random.uniform(-0.25, 0.25)
        rh = clamp(CITY_RH[d] + random.uniform(-2, 2) + canopy * 6, 12, 60)
        wbgt = wbgt_estimate(ta, rh, local_rad + WARD_OFFSET[wm["id"]]) - 1.2 * canopy + random.uniform(-0.15, 0.15)
        # UTCI approximation for the demo: air temp + radiant & wind adjustments
        utci = ta + 1.6 + 0.35 * (p["lst_current"] - ta) - 0.55 * (CITY_WIND[d] - 2) - 2.0 * canopy
        tmin = CITY_TMIN[d] + local_ta * 0.6
        days.append({
            "ta": r1(ta), "rh": round(rh), "tmin": r1(tmin),
            "wbgt": r1(wbgt), "utci": r1(utci), "tier": tier_of(wbgt),
        })
    cells_out[cid] = {
        "cell_id": cid, "ward_id": wm["id"], "center": p["center"],
        "population": p["population"],
        "elderly_pct": round(elderly * 100, 1), "outdoor_worker_pct": round(outdoor * 100, 1),
        "slum_pct": round(slum * 100, 1), "canopy_pct": p["canopy_pct"],
        "vulnerability": r2(vuln),
        "days": days,
    }
    ward_cells[wm["id"]].append(cid)

# --------------------------------------------------------------------------
# Health model (DLNM-style exposure–response used to derive ward impacts)
# --------------------------------------------------------------------------
MMT = 29.5            # minimum-mortality WBGT
BETA = 0.105          # log-RR per °C above MMT
BASE_DEATHS_PER_100K = 0.9   # baseline all-cause deaths / 100k / day
ADMISSION_RATIO = 7.5         # heat-related admissions per excess death


def rr(wbgt):
    return math.exp(BETA * max(0.0, wbgt - MMT))


# --------------------------------------------------------------------------
# Wards
# --------------------------------------------------------------------------
FEATURE_LABELS = {
    "wbgt": "Peak WBGT", "tmin": "Hot night (Tmin)", "elderly": "Elderly residents",
    "slum": "Informal settlements", "outdoor": "Outdoor workers", "canopy": "Tree canopy",
    "humidity": "Humidity", "streak": "Consecutive hot days",
}

wards_out = []
for wname, wm in WARD_META.items():
    wid = wm["id"]
    cids = ward_cells[wid]
    cs = [cells_out[c] for c in cids]
    pop = sum(c["population"] for c in cs)
    w = lambda key: sum(c[key] * c["population"] for c in cs) / pop
    elderly, outdoor, slum, canopy, vuln = w("elderly_pct"), w("outdoor_worker_pct"), w("slum_pct"), w("canopy_pct"), w("vulnerability")
    lons = [c["center"][0] for c in cs]
    lats = [c["center"][1] for c in cs]

    days = []
    streak = 0
    for d in range(N_DAYS):
        wb = [c["days"][d]["wbgt"] for c in cs]
        wb_mean = sum(c["days"][d]["wbgt"] * c["population"] for c in cs) / pop
        wb_p90 = sorted(wb)[int(0.9 * (len(wb) - 1))]
        ut_max = max(c["days"][d]["utci"] for c in cs)
        tmin = sum(c["days"][d]["tmin"] for c in cs) / len(cs)
        ward_wbgt = 0.5 * wb_mean + 0.5 * wb_p90
        tier = tier_of(ward_wbgt)
        streak = streak + 1 if tier >= 2 else 0
        vuln_mult = 0.75 + 0.6 * vuln
        lag_boost = 1 + 0.08 * min(streak, 4)                 # cumulative (lagged) effect
        excess_deaths = pop / 1e5 * BASE_DEATHS_PER_100K * (rr(ward_wbgt) - 1) * vuln_mult * lag_boost
        admissions = excess_deaths * ADMISSION_RATIO * (1 + 0.15 * (outdoor / 25))
        unc = 0.18 + 0.05 * d                                  # widens with lead time
        risk_score = round(clamp((ward_wbgt - 29) / 7 * 70 + vuln * 30, 0, 100))
        days.append({
            "wbgt_mean": r1(wb_mean), "wbgt_p90": r1(wb_p90), "wbgt": r1(ward_wbgt),
            "utci_max": r1(ut_max), "utci_category": utci_category(ut_max), "tmin": r1(tmin),
            "tier": tier, "risk_score": risk_score,
            "cells_by_tier": [sum(1 for c in cs if c["days"][d]["tier"] == t) for t in range(4)],
            "people_orange_plus": sum(c["population"] for c in cs if c["days"][d]["tier"] >= 2),
            "admissions": {"mean": r1(admissions), "lo": r1(admissions * (1 - unc)), "hi": r1(admissions * (1 + unc * 1.3))},
            "deaths": {"mean": r2(excess_deaths), "lo": r2(excess_deaths * (1 - unc)), "hi": r2(excess_deaths * (1 + unc * 1.5))},
            "beds_needed": math.ceil(admissions * (1 + unc * 1.3) * 1.2),
            "ambulances": max(0, math.ceil(admissions / 5)),
        })

    peak = max(range(N_DAYS), key=lambda i: days[i]["wbgt"])
    pd = days[peak]
    # SHAP-style local explanation for the peak day (contributions to risk score, points)
    shap = [
        {"feature": FEATURE_LABELS["wbgt"], "value": f"{pd['wbgt']} °C", "contribution": r1((pd["wbgt"] - 31.5) * 5.2)},
        {"feature": FEATURE_LABELS["tmin"], "value": f"{pd['tmin']} °C", "contribution": r1((pd["tmin"] - 29.5) * 2.4)},
        {"feature": FEATURE_LABELS["streak"], "value": f"{sum(1 for x in days[:peak+1] if x['tier'] >= 2)} days", "contribution": r1(1.8 * sum(1 for x in days[:peak+1] if x['tier'] >= 2))},
        {"feature": FEATURE_LABELS["elderly"], "value": f"{elderly:.1f}%", "contribution": r1((elderly - 9) * 1.6)},
        {"feature": FEATURE_LABELS["slum"], "value": f"{slum:.1f}%", "contribution": r1((slum - 10) * 0.45)},
        {"feature": FEATURE_LABELS["outdoor"], "value": f"{outdoor:.1f}%", "contribution": r1((outdoor - 18) * 0.5)},
        {"feature": FEATURE_LABELS["canopy"], "value": f"{canopy:.0f}%", "contribution": r1(-(canopy - 8) * 0.35)},
        {"feature": FEATURE_LABELS["humidity"], "value": f"{CITY_RH[peak]}%", "contribution": r1((CITY_RH[peak] - 25) * 0.4)},
    ]
    shap.sort(key=lambda s: -abs(s["contribution"]))

    wards_out.append({
        "ward_id": wid, "name": wname, "short_name": wm["short"], "name_hi": HINDI_WARD[wid],
        "cell_ids": cids, "n_cells": len(cids), "population": pop,
        "centroid": [round(sum(lons) / len(lons), 6), round(sum(lats) / len(lats), 6)],
        "bbox": [min(lons), min(lats), max(lons), max(lats)],
        "vulnerability": r2(vuln),
        "groups": {"elderly_pct": r1(elderly), "outdoor_worker_pct": r1(outdoor), "slum_pct": r1(slum), "canopy_pct": r1(canopy)},
        "groups_people": {"elderly": round(pop * elderly / 100), "outdoor_workers": round(pop * outdoor / 100), "slum_residents": round(pop * slum / 100)},
        "cooling_centre": wm["cc"],
        "peak_day": peak,
        "why_flagged": shap,
        "days": days,
    })

wards_out.sort(key=lambda w: w["ward_id"])
ward_by_id = {w["ward_id"]: w for w in wards_out}

# --------------------------------------------------------------------------
# Ward outlines (dissolve grid edges between different wards)
# --------------------------------------------------------------------------
cell_rc = {p["cell_id"]: (p["row"], p["col"], p["bounds"]) for p in props_by_id.values()}
rc_ward = {(r, c): cells_out[cid]["ward_id"] for cid, (r, c, _) in cell_rc.items()}
edges = defaultdict(list)
for cid, (r, c, b) in cell_rc.items():
    wid = rc_ward[(r, c)]
    minx, miny, maxx, maxy = b
    for (nr, nc), seg in [((r - 1, c), [[minx, miny], [maxx, miny]]), ((r + 1, c), [[minx, maxy], [maxx, maxy]]),
                          ((r, c - 1), [[minx, miny], [minx, maxy]]), ((r, c + 1), [[maxx, miny], [maxx, maxy]])]:
        if rc_ward.get((nr, nc)) != wid:
            edges[wid].append(seg)
outline_features = [{
    "type": "Feature",
    "properties": {"ward_id": wid, "name": ward_by_id[wid]["name"], "short_name": ward_by_id[wid]["short_name"]},
    "geometry": {"type": "MultiLineString", "coordinates": segs},
} for wid, segs in sorted(edges.items())]

# --------------------------------------------------------------------------
# City summary per day + resources
# --------------------------------------------------------------------------
total_pop = sum(w["population"] for w in wards_out)
city_days = []
for d in range(N_DAYS):
    ad = sum(w["days"][d]["admissions"]["mean"] for w in wards_out)
    de = sum(w["days"][d]["deaths"]["mean"] for w in wards_out)
    city_days.append({
        **day_label(d),
        "ta_max": CITY_TA_MAX[d], "rh": CITY_RH[d], "tmin": CITY_TMIN[d], "wind": CITY_WIND[d],
        "wbgt_max": max(c["days"][d]["wbgt"] for c in cells_out.values()),
        "utci_max": max(c["days"][d]["utci"] for c in cells_out.values()),
        "wards_by_tier": [sum(1 for w in wards_out if w["days"][d]["tier"] == t) for t in range(4)],
        "cells_by_tier": [sum(1 for c in cells_out.values() if c["days"][d]["tier"] == t) for t in range(4)],
        "people_orange_plus": sum(w["days"][d]["people_orange_plus"] for w in wards_out),
        "admissions": r1(ad), "admissions_lo": r1(sum(w["days"][d]["admissions"]["lo"] for w in wards_out)),
        "admissions_hi": r1(sum(w["days"][d]["admissions"]["hi"] for w in wards_out)),
        "deaths": r1(de), "deaths_lo": r1(sum(w["days"][d]["deaths"]["lo"] for w in wards_out)),
        "deaths_hi": r1(sum(w["days"][d]["deaths"]["hi"] for w in wards_out)),
        "beds_needed": sum(w["days"][d]["beds_needed"] for w in wards_out),
        "ambulances": sum(w["days"][d]["ambulances"] for w in wards_out),
        "cooling_centres_active": sum(1 for w in wards_out if w["days"][d]["tier"] >= 2),
        "grid_peak_mw": [312, 327, 343, 361, 347, 318][d],
    })

ACTIONS = {
    0: ["Routine summer advisories on municipal channels"],
    1: ["Public heat advisories (SMS + WhatsApp)", "Hydration points at markets & bus stops", "ASHA / CHW check-lists issued"],
    2: ["Open ward cooling centres 11:00–17:00", "Shift outdoor work before 11:00 / after 16:00", "Hospitals on heat-stroke readiness, ice-pack protocol",
        "Targeted alerts to elderly & outdoor workers"],
    3: ["Activate all cooling centres, extend to 20:00", "Halt non-essential outdoor work 12:00–16:00", "Pre-position ambulances; reserve heat-stroke beds",
        "Door-to-door CHW checks for elderly living alone", "Notify power utility of peak-load risk"],
}

meta = {
    "product": "UshnaRaksha",
    "tagline": "AI-Powered Human Thermal Stress & Mortality Early Warning System",
    "simulated": True,
    "simulated_note": "Prototype data generated for demonstration. Not real observations or model output.",
    "city": {"id": "delhi", "name": "New Delhi", "pilot_area": "Connaught Place & Central Zone", "population": total_pop,
             "n_wards": len(wards_out), "n_zones": len(cells_out), "zone_size_m": 120},
    "cities": [
        {"id": "delhi", "name": "New Delhi", "status": "pilot"},
        {"id": "ahmedabad", "name": "Ahmedabad", "status": "phase2"},
        {"id": "chennai", "name": "Chennai", "status": "phase2"},
    ],
    "issued_at": ISSUE_TIME,
    "next_update": "2026-05-18T18:00:00+05:30",
    "days": city_days,
    "tiers": TIERS,
    "utci_categories": UTCI_CATEGORIES,
    "threshold": {"method": "Local 95th-percentile WBGT baseline (2015–2025)", "wbgt_p95": 33.5, "min_consecutive_days": 2},
    "actions_by_tier": ACTIONS,
    "grid_capacity_mw": 365,
    "sources": ["IMD NWP forecast (Ta, RH, wind)", "Landsat 8/9 + MODIS LST (downscaled to ~120 m)", "Census 2011 / SECC demographics",
                "IDSP surveillance + hospital admissions", "OpenStreetMap buildings"],
}

# --------------------------------------------------------------------------
# Alerts
# --------------------------------------------------------------------------
TIER_EN = {1: "YELLOW", 2: "ORANGE", 3: "RED"}
SEVERITY = {1: "Moderate", 2: "Severe", 3: "Extreme"}


def msg_sms_en(w, d, day):
    return (f"UshnaRaksha HEAT ALERT ({TIER_EN[d['tier']]}): {SEVERITY[d['tier']].lower()} heat stress expected in {w['short_name']} on "
            f"{day['label'] if day['index'] else 'today'} (WBGT {d['wbgt']}°C). Avoid going out 12–4 PM, drink water often, check on elderly & children. "
            f"Nearest cooling centre: {w['cooling_centre'].split(' · ')[1]}. Emergency: 108")


def msg_sms_hi(w, d, day):
    return (f"उष्णरक्षा लू चेतावनी ({HINDI_TIER[d['tier']]}): {w['name_hi']} में {hindi_date(day['date'])} को {HINDI_SEVERITY[d['tier']]} का खतरा (WBGT {d['wbgt']}°C)। "
            f"दोपहर 12–4 बजे बाहर न निकलें, बार-बार पानी पिएँ, बुज़ुर्गों और बच्चों का ध्यान रखें। "
            f"निकटतम कूलिंग सेंटर: {w['cooling_centre'].split(' · ')[1]}। आपातकाल: 108")


def msg_wa_en(w, d, day):
    return (f"🔴 *UshnaRaksha Heat Alert — {TIER_EN[d['tier']]}*\n"
            f"📍 {w['name']}\n📅 {day['label']} ({day['date']})\n🌡️ Feels-like stress: WBGT {d['wbgt']}°C · UTCI {d['utci_max']}°C ({d['utci_category']})\n\n"
            f"*Do:*\n• Stay indoors 12–4 PM\n• Drink water every 30 min, even if not thirsty\n• Check on elderly neighbours\n• Outdoor workers: rest in shade every hour\n\n"
            f"*Watch for:* dizziness, confusion, no sweating, vomiting → call 108\n\n"
            f"❄️ Cooling centre: {w['cooling_centre'].split(' · ')[1]} (open 11 AM–8 PM)").replace("🔴", "🔴" if d["tier"] == 3 else "🟠")


def msg_wa_hi(w, d, day):
    return (f"{'🔴' if d['tier'] == 3 else '🟠'} *उष्णरक्षा लू चेतावनी — {HINDI_TIER[d['tier']]}*\n"
            f"📍 {w['name_hi']}\n📅 {hindi_date(day['date'])}\n🌡️ गर्मी का तनाव: WBGT {d['wbgt']}°C\n\n"
            f"*क्या करें:*\n• दोपहर 12–4 बजे घर के अंदर रहें\n• हर 30 मिनट में पानी पिएँ\n• बुज़ुर्ग पड़ोसियों का हालचाल लें\n• बाहर काम करने वाले हर घंटे छाँव में आराम करें\n\n"
            f"*खतरे के लक्षण:* चक्कर, बेहोशी, पसीना न आना, उल्टी → 108 पर कॉल करें\n\n"
            f"❄️ कूलिंग सेंटर: {w['cooling_centre'].split(' · ')[1]}")


def cap_xml(alert_id, w, d, day):
    sev = {1: "Moderate", 2: "Severe", 3: "Extreme"}[d["tier"]]
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>{alert_id}</identifier>
  <sender>ushnaraksha-pilot@heatcell.example.in</sender>
  <sent>{ISSUE_TIME}</sent>
  <status>Exercise</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <info>
    <language>en-IN</language>
    <category>Met</category>
    <category>Health</category>
    <event>Heat Wave — Human Thermal Stress</event>
    <responseType>Prepare</responseType>
    <responseType>Avoid</responseType>
    <urgency>{'Immediate' if day['index'] <= 1 else 'Expected'}</urgency>
    <severity>{sev}</severity>
    <certainty>Likely</certainty>
    <onset>{day['date']}T11:00:00+05:30</onset>
    <expires>{day['date']}T20:00:00+05:30</expires>
    <senderName>UshnaRaksha Heat Early Warning (Pilot)</senderName>
    <headline>{TIER_EN[d['tier']]} heat-stress alert for {w['short_name']}</headline>
    <description>Forecast peak WBGT {d['wbgt']} °C, UTCI {d['utci_max']} °C ({d['utci_category']}). Predicted heat-related hospital admissions: {d['admissions']['mean']} (range {d['admissions']['lo']}–{d['admissions']['hi']}).</description>
    <instruction>Avoid outdoor activity 12:00–16:00. Hydrate frequently. Check on elderly and children. Cooling centre: {w['cooling_centre'].split(' · ')[1]}.</instruction>
    <parameter><valueName>WBGT_C</valueName><value>{d['wbgt']}</value></parameter>
    <parameter><valueName>IMD_COLOUR</valueName><value>{TIER_EN[d['tier']]}</value></parameter>
    <area>
      <areaDesc>{w['name']}, New Delhi</areaDesc>
      <polygon>{w['bbox'][1]:.4f},{w['bbox'][0]:.4f} {w['bbox'][1]:.4f},{w['bbox'][2]:.4f} {w['bbox'][3]:.4f},{w['bbox'][2]:.4f} {w['bbox'][3]:.4f},{w['bbox'][0]:.4f} {w['bbox'][1]:.4f},{w['bbox'][0]:.4f}</polygon>
    </area>
  </info>
</alert>"""


alerts = []
n = 1
for w in wards_out:
    for d_i in range(N_DAYS):
        d = w["days"][d_i]
        if d["tier"] < 2:
            continue
        day = city_days[d_i]
        aid = f"UR-DEL-{day['date'].replace('-', '')}-{w['ward_id']}"
        reach = {"sms": round(w["population"] * 0.58), "whatsapp": round(w["population"] * 0.36),
                 "chw_relay": round(w["groups_people"]["elderly"] * 0.4 + w["groups_people"]["slum_residents"] * 0.3)}
        alerts.append({
            "id": aid, "ward_id": w["ward_id"], "ward_name": w["name"], "day_index": d_i, "date": day["date"],
            "tier": d["tier"], "wbgt": d["wbgt"], "utci": d["utci_max"],
            "status": "pending_approval" if d_i <= 3 else "draft",
            "confidence": round(clamp(0.93 - 0.06 * d_i + random.uniform(-0.02, 0.02), 0.55, 0.97), 2),
            "channels": ["sms", "whatsapp", "cap"] + (["chw_relay"] if d["tier"] == 3 else []),
            "reach": reach,
            "triggered_by": f"Ward WBGT {d['wbgt']} °C ≥ local P95 threshold for {'2+ days' if d_i else 'today'}",
            "messages": {"sms_en": msg_sms_en(w, d, day), "sms_hi": msg_sms_hi(w, d, day),
                         "whatsapp_en": msg_wa_en(w, d, day), "whatsapp_hi": msg_wa_hi(w, d, day)},
            "cap_xml": cap_xml(aid, w, d, day),
        })
        n += 1

alerts.sort(key=lambda a: (a["day_index"], -a["tier"], a["ward_id"]))

history = []
hist_days = [(ISSUE_DATE - timedelta(days=k)) for k in range(4, 0, -1)]
for i, hd in enumerate(hist_days):
    for w in wards_out[:3 if i < 2 else 5]:
        sent = round(w["population"] * random.uniform(0.82, 0.9))
        history.append({
            "id": f"UR-DEL-{hd.strftime('%Y%m%d')}-{w['ward_id']}", "ward_id": w["ward_id"], "ward_name": w["short_name"],
            "date": hd.isoformat(), "tier": 1 if i < 2 else 2, "approved_by": random.choice(["Dr. A. Mehta (Health Officer)", "R. Sharma (Heat Cell Nodal Officer)"]),
            "sent_at": f"{hd.isoformat()}T07:{random.randint(5, 40):02d}:00+05:30",
            "delivered": sent, "read_rate": round(random.uniform(0.61, 0.78), 2), "channels": ["sms", "whatsapp", "cap"],
        })

alerts_out = {"generated_at": ISSUE_TIME, "pending": alerts, "history": history,
              "settings": {"threshold_method": "Local 95th percentile", "wbgt_p95": 33.5, "min_consecutive_days": 2,
                           "require_human_approval": True, "languages": ["en", "hi"], "quiet_hours": "22:00–06:00",
                           "channels": {"sms": True, "whatsapp": True, "cap": True, "chw_relay": True}}}

# --------------------------------------------------------------------------
# Models (all simulated)
# --------------------------------------------------------------------------
exposure_response = []
for i in range(0, 25):
    x = 24 + i * 0.5
    v = rr(x) if x >= MMT else math.exp(0.02 * (MMT - x) ** 1.3 * 0.6)
    se = 0.015 + 0.012 * abs(x - MMT)
    exposure_response.append({"wbgt": r1(x), "rr": round(v, 3), "lo": round(v * math.exp(-1.96 * se), 3), "hi": round(v * math.exp(1.96 * se), 3)})

lag_weights = [0.46, 0.27, 0.13, 0.07, 0.04, 0.03]
lag_response = []
for lag, wgt in enumerate(lag_weights):
    v = math.exp(BETA * 5 * wgt)   # RR at WBGT = MMT + 5 °C distributed over lags
    lag_response.append({"lag": lag, "rr": round(v, 3), "lo": round(1 + (v - 1) * 0.55, 3), "hi": round(1 + (v - 1) * 1.5, 3)})

shap_global = [
    {"feature": "Peak WBGT (forecast)", "importance": 0.31}, {"feature": "Night-time minimum temp", "importance": 0.17},
    {"feature": "Consecutive hot days", "importance": 0.13}, {"feature": "Elderly population share", "importance": 0.11},
    {"feature": "Informal settlement share", "importance": 0.08}, {"feature": "Outdoor worker share", "importance": 0.07},
    {"feature": "Downscaled LST (~120 m)", "importance": 0.06}, {"feature": "Tree canopy cover", "importance": 0.04},
    {"feature": "Relative humidity", "importance": 0.03},
]

# Backtest over a simulated heat season (daily admissions, pilot area)
backtest = []
start = date(2025, 4, 20)
level = 18.0
for k in range(70):
    dd = start + timedelta(days=k)
    seasonal = 22 + 30 * math.exp(-((k - 38) / 13.0) ** 2) + 14 * math.exp(-((k - 22) / 4.0) ** 2)
    level = 0.6 * level + 0.4 * seasonal
    actual = max(4, level + random.gauss(0, 3.2))
    pred = max(4, level + random.gauss(0, 2.4) + 0.8)
    backtest.append({"date": dd.isoformat(), "actual": round(actual), "predicted": r1(pred), "lo": r1(pred * 0.8), "hi": r1(pred * 1.24),
                     "wbgt": r1(29.5 + (seasonal - 22) / 6.5 + random.uniform(-0.6, 0.6))})

skill_by_lead = [
    {"lead_days": 1, "mae": 2.6, "mape": 9.8, "r2": 0.89}, {"lead_days": 2, "mae": 3.1, "mape": 11.9, "r2": 0.85},
    {"lead_days": 3, "mae": 3.8, "mape": 14.6, "r2": 0.80}, {"lead_days": 4, "mae": 4.6, "mape": 17.8, "r2": 0.73},
    {"lead_days": 5, "mae": 5.5, "mape": 21.4, "r2": 0.66},
]

baseline_comparison = [
    {"system": "Temperature threshold (Ta ≥ 40 °C)", "hit_rate": 0.69, "false_alarm_ratio": 0.41, "lead_days": 1.2, "ward_level": False},
    {"system": "Heat index only", "hit_rate": 0.76, "false_alarm_ratio": 0.33, "lead_days": 1.5, "ward_level": False},
    {"system": "UshnaRaksha (WBGT/UTCI + vulnerability + TFT)", "hit_rate": 0.88, "false_alarm_ratio": 0.18, "lead_days": 3.6, "ward_level": True},
]

# Historical daily deaths vs heat (summer days, simulated) for the correlation chart
historical = []
for yr in range(2019, 2026):
    for k in range(0, 92, 3):
        dd = date(yr, 4, 1) + timedelta(days=k)
        x = 26.5 + 7.5 * math.sin(math.pi * k / 110) + random.gauss(0, 1.3) + (0.6 if yr in (2022, 2024) else 0)
        deaths = 38 * rr(x) * (1 + random.gauss(0, 0.07))
        historical.append({"date": dd.isoformat(), "year": yr, "wbgt": r1(x), "deaths": round(deaths)})

annual = []
for yr in range(2019, 2026):
    ys = [h for h in historical if h["year"] == yr]
    hot_days = sum(1 for h in ys if h["wbgt"] >= 33) * 3
    annual.append({"year": yr, "heat_days": hot_days,
                   "excess_deaths": round(sum(max(0, h["deaths"] - 38) for h in ys) * 3 * 0.18)})

models = {
    "simulated": True,
    "dlnm": {
        "name": "Distributed Lag Non-Linear Model (DLNM)", "purpose": "Exposure–response between WBGT and daily mortality, lags 0–5 days",
        "mmt": MMT, "exposure_response": exposure_response, "lag_response": lag_response,
        "summary": {"rr_at_p99": round(rr(35.5), 2), "attributable_fraction_pct": 6.4, "calibration_period": "2015–2025 summers"},
    },
    "vulnerability_model": {
        "name": "LightGBM (gradient-boosted trees)", "purpose": "Ward-level heat-health vulnerability & interaction effects",
        "metrics": {"auc": 0.87, "precision": 0.81, "recall": 0.84, "f1": 0.82}, "shap_global": shap_global,
    },
    "forecast_model": {
        "name": "Temporal Fusion Transformer (TFT)", "purpose": "3–5 day forecast of heat-related admissions with quantile bands",
        "backtest_label": "Backtest · 2025 heat season (simulated)", "backtest": backtest, "skill_by_lead": skill_by_lead,
        "coverage_80pct_interval": 0.83,
    },
    "baseline_comparison": baseline_comparison,
    "historical": historical,
    "annual": annual,
    "pipeline": [
        {"stage": "Ingest", "items": ["IMD NWP", "Landsat / MODIS LST", "Census / SECC", "IDSP + hospital admissions"]},
        {"stage": "Compute", "items": ["WBGT + UTCI per ~120 m zone", "LST downscaling", "Vulnerability index"]},
        {"stage": "Model", "items": ["DLNM", "LightGBM", "TFT + SHAP"]},
        {"stage": "Decide", "items": ["IMD 4-tier risk", "Local P95 thresholds", "Human approval"]},
        {"stage": "Act", "items": ["SMS / WhatsApp / CAP", "Cooling centres", "Hospital & grid planning"]},
    ],
}

# --------------------------------------------------------------------------
# Write
# --------------------------------------------------------------------------
def dump(name, obj):
    path = os.path.join(OUT_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {os.path.relpath(path, ROOT)}  ({os.path.getsize(path):,} bytes)")


dump("meta.json", meta)
dump("cells.json", cells_out)
dump("wards.json", wards_out)
dump("ward_outlines.geojson", {"type": "FeatureCollection", "features": outline_features})
dump("alerts.json", alerts_out)
dump("models.json", models)

print("\nStory check (ward tiers by day, 0=green … 3=red):")
for w in wards_out:
    print(f"  {w['ward_id']} {w['short_name']:<22}", [d["tier"] for d in w["days"]], " WBGT", [d["wbgt"] for d in w["days"]])
for d in city_days:
    print(f"  {d['label']:<11} wards/tier {d['wards_by_tier']}  cells/tier {d['cells_by_tier']}  admissions {d['admissions']}  deaths {d['deaths']}")
print(f"  pending alerts: {len(alerts)}")
