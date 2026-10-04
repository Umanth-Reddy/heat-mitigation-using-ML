"""
UshnaRaksha: operations and impact add-on data (demo / prototype only).

Reads  : public/data/risk/wards.json, public/data/risk/meta.json  (from generate_risk_data.py)
Writes : public/data/risk/facilities.json   cooling centres and hospitals, with daily expected load
         public/data/risk/impact.json       deaths and admissions with vs without early action

Standard library only, deterministic, no network. All numbers are SIMULATED scenario estimates.
Facility names are generic placeholders, not real institutions.

Run from the project root, AFTER generate_risk_data.py:
    python scripts/generate_ops_data.py
"""

import json
import math
import os
import random

random.seed(260832)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RISK = os.path.join(ROOT, "public", "data", "risk")

with open(os.path.join(RISK, "wards.json"), encoding="utf-8") as f:
    wards = json.load(f)
with open(os.path.join(RISK, "meta.json"), encoding="utf-8") as f:
    meta = json.load(f)

N_DAYS = len(meta["days"])


def r1(v):
    return round(v, 1)


# --------------------------------------------------------------------------
# Facilities
# --------------------------------------------------------------------------
# Cooling centre position inside each ward: a fixed fraction of the ward bbox,
# chosen so markers don't sit on top of the ward labels drawn at the centroids.
CC_POS = {"W01": (0.35, 0.25), "W02": (0.7, 0.3), "W03": (0.3, 0.7), "W04": (0.75, 0.75), "W05": (0.5, 0.2), "W06": (0.5, 0.8)}
CC_CAPACITY = {"W01": 400, "W02": 300, "W03": 260, "W04": 180, "W05": 200, "W06": 350}

cooling_centres = []
for w in wards:
    x0, y0, x1, y1 = w["bbox"]
    fx, fy = CC_POS[w["ward_id"]]
    cap = CC_CAPACITY[w["ward_id"]]
    daily = []
    for d in range(N_DAYS):
        wd = w["days"][d]
        tier = wd["tier"]
        is_open = tier >= 2
        # expected visitors scale with people in orange+ zones and the vulnerable share
        demand = wd["people_orange_plus"] * (0.0003 + 0.00025 * tier) * (0.8 + w["vulnerability"])
        visitors = round(demand) if is_open else 0
        daily.append({"open": is_open, "hours": "11:00–20:00" if tier == 3 else ("11:00–17:00" if tier == 2 else None),
                      "expected_visitors": visitors, "occupancy_pct": min(140, round(visitors / cap * 100)) if is_open else 0})
    cooling_centres.append({
        "id": f"CC-{w['ward_id'][1:]}", "kind": "cooling_centre",
        "name": w["cooling_centre"].split(" · ")[1], "ward_id": w["ward_id"],
        "position": [round(x0 + fx * (x1 - x0), 6), round(y0 + fy * (y1 - y0), 6)],
        "capacity": cap, "amenities": ["Drinking water", "ORS", "Fans / coolers", "First aid"],
        "days": daily,
    })

# Hospitals at the edges of the pilot area; heat-stroke beds are a reserved subset.
HOSPITALS = [
    {"id": "H1", "name": "Govt. Hospital H1", "type": "Tertiary (Govt.)", "position": [77.2085, 28.6352], "beds_total": 1200, "heat_beds": 50, "share": 0.38},
    {"id": "H2", "name": "Govt. Hospital H2", "type": "Tertiary (Govt.)", "position": [77.2135, 28.6408], "beds_total": 850, "heat_beds": 36, "share": 0.27},
    {"id": "H3", "name": "District Hospital H3", "type": "District", "position": [77.2312, 28.6262], "beds_total": 300, "heat_beds": 18, "share": 0.20},
    {"id": "H4", "name": "Urban Health Centre H4", "type": "Primary (UPHC)", "position": [77.2192, 28.6218], "beds_total": 60, "heat_beds": 10, "share": 0.15},
]
hospitals = []
for h in HOSPITALS:
    daily = []
    for d in range(N_DAYS):
        city = meta["days"][d]
        expected = city["admissions"] * h["share"]
        hi = city["admissions_hi"] * h["share"]
        # admissions stay ~2 days on average -> occupancy builds over consecutive hot days
        prev = daily[-1]["occupied"] if daily else 0
        occupied = round(prev * 0.5 + expected)
        daily.append({"expected_admissions": r1(expected), "admissions_hi": r1(hi), "occupied": occupied,
                      "occupancy_pct": round(occupied / h["heat_beds"] * 100),
                      "status": "surge" if occupied > h["heat_beds"] else ("high" if occupied > 0.75 * h["heat_beds"] else "normal")})
    hospitals.append({k: v for k, v in h.items() if k != "share"} | {"kind": "hospital", "days": daily})

facilities = {"simulated": True, "note": "Facility names are generic placeholders; loads are simulated.",
              "cooling_centres": cooling_centres, "hospitals": hospitals}

# --------------------------------------------------------------------------
# Impact: what early action changes (scenario model)
# --------------------------------------------------------------------------
# Assumed reduction in heat-attributable deaths/admissions by action and lead time.
# Presented in the UI as editable scenario assumptions, not measured effects.
ACTIONS = [
    {"id": "alerts", "label": "Targeted SMS / WhatsApp alerts", "max_reduction": 0.10, "min_tier": 1},
    {"id": "cooling", "label": "Cooling centres opened", "max_reduction": 0.12, "min_tier": 2},
    {"id": "work_hours", "label": "Outdoor work hours shifted", "max_reduction": 0.08, "min_tier": 2},
    {"id": "hospital", "label": "Hospital & ambulance readiness", "max_reduction": 0.09, "min_tier": 2},
    {"id": "chw", "label": "CHW door-to-door checks (elderly)", "max_reduction": 0.07, "min_tier": 3},
]
# Fraction of each action's benefit realised for a given warning lead time (days).
LEAD_REALISATION = {0: 0.15, 1: 0.45, 2: 0.70, 3: 0.88, 4: 0.96, 5: 1.0}


def reduction(tier, lead):
    keep = 1.0
    for a in ACTIONS:
        if tier >= a["min_tier"]:
            keep *= 1 - a["max_reduction"] * LEAD_REALISATION[lead]
    return 1 - keep


scenarios = []
for name, label, lead in [("none", "No early warning", None), ("conventional", "Conventional 1-day warning", 1),
                          ("ushnaraksha", "UshnaRaksha (3-day lead)", 3)]:
    deaths = admissions = 0.0
    per_day = []
    for d in range(N_DAYS):
        dd = da = 0.0
        for w in wards:
            wd = w["days"][d]
            red = 0.0 if lead is None else reduction(wd["tier"], min(lead, d) if name == "ushnaraksha" else lead)
            # day 0 cannot have more lead than "today"; conventional warnings only start at tier 2 (orange)
            if name == "conventional" and wd["tier"] < 2:
                red = 0.0
            dd += wd["deaths"]["mean"] * (1 - red)
            da += wd["admissions"]["mean"] * (1 - red)
        per_day.append({"day_index": d, "deaths": r1(dd), "admissions": r1(da)})
        deaths += dd
        admissions += da
    scenarios.append({"id": name, "label": label, "lead_days": lead, "deaths": r1(deaths), "admissions": r1(admissions), "per_day": per_day})

base = scenarios[0]
for s in scenarios:
    s["deaths_averted"] = r1(base["deaths"] - s["deaths"])
    s["admissions_averted"] = r1(base["admissions"] - s["admissions"])

lead_curve = []
for lead in range(0, 6):
    dd = 0.0
    for d in range(N_DAYS):
        for w in wards:
            wd = w["days"][d]
            # same cap as the scenarios: a warning issued today can only have min(lead, d) days of notice on day d
            dd += wd["deaths"]["mean"] * (1 - reduction(wd["tier"], min(lead, d)))
    lead_curve.append({"lead_days": lead, "deaths_averted": r1(base["deaths"] - dd),
                       "pct_reduction": round((base["deaths"] - dd) / base["deaths"] * 100, 1)})

ward_impact = []
for w in wards:
    dn = sum(w["days"][d]["deaths"]["mean"] for d in range(N_DAYS))
    du = sum(w["days"][d]["deaths"]["mean"] * (1 - reduction(w["days"][d]["tier"], min(3, d))) for d in range(N_DAYS))
    ward_impact.append({"ward_id": w["ward_id"], "short_name": w["short_name"], "deaths_no_action": r1(dn),
                        "deaths_with_ushnaraksha": r1(du), "deaths_averted": r1(dn - du)})

impact = {
    "simulated": True,
    "window": f"{meta['days'][0]['date']} to {meta['days'][-1]['date']}",
    "note": "Scenario estimates from assumed action effectiveness. Benchmark: Ahmedabad Heat Action Plan (est. ~1,190 deaths avoided per year).",
    "benchmark": {"name": "Ahmedabad Heat Action Plan", "deaths_avoided_per_year": 1190,
                  "source": "https://www.sciencedirect.com/science/article/pii/S2212420923005605"},
    "actions": [{**a, "max_reduction_pct": round(a["max_reduction"] * 100)} for a in ACTIONS],
    "lead_realisation": [{"lead_days": k, "fraction": v} for k, v in LEAD_REALISATION.items()],
    "scenarios": scenarios,
    "lead_curve": lead_curve,
    "wards": ward_impact,
    "annualised": {"heatwave_episodes_per_year": 4,
                   "deaths_averted_per_year_pilot": r1(scenarios[2]["deaths_averted"] * 4),
                   "admissions_averted_per_year_pilot": round(scenarios[2]["admissions_averted"] * 4)},
}


def dump(name, obj):
    path = os.path.join(RISK, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {os.path.relpath(path, ROOT)}  ({os.path.getsize(path):,} bytes)")


dump("facilities.json", facilities)
dump("impact.json", impact)

print("\nScenario totals over the 6-day window:")
for s in scenarios:
    print(f"  {s['label']:<30} deaths {s['deaths']:>5}  admissions {s['admissions']:>6}  averted deaths {s['deaths_averted']}")
print("  lead curve:", [(x["lead_days"], x["deaths_averted"], x["pct_reduction"]) for x in lead_curve])
print("  cooling centres day 3:", [(c["id"], c["days"][3]["expected_visitors"], c["days"][3]["occupancy_pct"]) for c in cooling_centres])
print("  hospitals day 3:", [(h["id"], h["days"][3]["occupied"], h["heat_beds"], h["days"][3]["status"]) for h in hospitals])
