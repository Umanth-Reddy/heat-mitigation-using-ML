"""Stage 4: Layer C, heat-vulnerability index from Census 2011 (PCA-based), at the finest real level available.

Data: Census of India 2011, Primary Census Abstract at town, village and ward level, NCT of Delhi, District New Delhi
(table DDW_PCA0705, Office of the Registrar General & Census Commissioner, India). Units: the 11 ward-parts
(ward × sub-district) of New Delhi district, which includes the Connaught Place sub-district.

Indicators (all available in the PCA): illiteracy among people aged 7+, share of children 0–6, SC/ST share,
marginal-worker share, persons per household. NOT available at ward level in this table: elderly share (age tables
are district-level) and slum households (separate town-level table); they are therefore not in the index.

Method: standardise, PCA, keep components with eigenvalue > 1 (Kaiser), orient each so it correlates positively with the
mean of the standardised indicators (higher = more vulnerable), weight by explained variance, rescale to 0–1.
The pilot's 6 dashboard wards are not census wards and no ward boundaries are available to overlay them, so the index
cannot be assigned to them; their within-pilot variation stays simulated (clearly labelled). The real anchor for the
pilot is the population-weighted index of the Connaught Place sub-district.
Writes ml/outputs/layerC.json and ml/data/census_ward_indicators.csv.
"""
import datetime as dt
import json
import os
import sys

import numpy as np
import pandas as pd
from sklearn.decomposition import PCA

sys.path.insert(0, os.path.dirname(__file__))
from common.paths import DATA, OUT, RAW  # noqa: E402
from common.sources import write_section  # noqa: E402

WARD_URL = "https://censusindia.gov.in/nada/index.php/catalog/6285"
NCT_URL = "https://censusindia.gov.in/nada/index.php/catalog/11310"
INDICATORS = {
    "illiteracy_7plus": "Illiterate share of people aged 7+",
    "children_0_6": "Children aged 0–6 share",
    "sc_st": "Scheduled Caste / Tribe share",
    "marginal_workers": "Marginal-worker share",
    "persons_per_household": "Persons per household",
}


FILES = {
    "DDW_PCA0705_2011_MDDS_with_UI.xlsx": "https://censusindia.gov.in/nada/index.php/catalog/6285/download/9362",
    "PCA_2011_Distt-Sub_Dist_NCT_of_Delhi.xls": "https://censusindia.gov.in/nada/index.php/catalog/11310/download/14422",
}


def fetch_census():
    """Download the two Census tables if they are not cached. The portal's certificate chain does not verify, so TLS
    verification is disabled for these two official URLs only (documented in SOURCES.md)."""
    import requests
    import urllib3

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    for name, url in FILES.items():
        path = os.path.join(RAW, name)
        if os.path.exists(path):
            continue
        r = requests.get(url, timeout=120, verify=False)
        r.raise_for_status()
        with open(path, "wb") as f:
            f.write(r.content)
        print(f"downloaded {name} ({len(r.content):,} bytes)")


def main():
    fetch_census()
    d = pd.read_excel(os.path.join(RAW, "DDW_PCA0705_2011_MDDS_with_UI.xlsx"))
    sub_names = d[(d.Level == "SUB-DISTRICT") & (d.TRU == "Total")].set_index("Subdistt")["Name"].to_dict()
    w = d[d.Level == "WARD"].copy()
    w["unit"] = [f"{n.split(' WARD')[0]} ward {int(k)} · {sub_names[s]}" for n, k, s in zip(w.Name, w.Ward, w.Subdistt)]
    w["subdistrict"] = w.Subdistt.map(sub_names)
    x = pd.DataFrame(index=w.index)
    x["illiteracy_7plus"] = w.P_ILL / (w.TOT_P - w.P_06)
    x["children_0_6"] = w.P_06 / w.TOT_P
    x["sc_st"] = (w.P_SC + w.P_ST) / w.TOT_P
    x["marginal_workers"] = w.MARGWORK_P / w.TOT_P
    x["persons_per_household"] = w.TOT_P / w.No_HH
    z = (x - x.mean()) / x.std(ddof=0)
    pca = PCA().fit(z)
    eig = pca.explained_variance_
    keep = np.where(eig > 1)[0]
    if len(keep) == 0:
        keep = np.array([0])
    scores = pca.transform(z)[:, keep]
    ref = z.mean(axis=1).to_numpy()
    signs = np.array([1 if np.corrcoef(scores[:, j], ref)[0, 1] >= 0 else -1 for j in range(len(keep))])
    scores = scores * signs
    weights = pca.explained_variance_ratio_[keep] / pca.explained_variance_ratio_[keep].sum()
    raw = scores @ weights
    hvi = (raw - raw.min()) / (raw.max() - raw.min())
    w["hvi"] = hvi
    table = pd.concat([w[["unit", "subdistrict", "TOT_P", "No_HH"]].rename(columns={"TOT_P": "population", "No_HH": "households"}),
                       x.round(4), w[["hvi"]].round(3)], axis=1)
    table.to_csv(os.path.join(DATA, "census_ward_indicators.csv"), index=False)
    by_sub = table.groupby("subdistrict").apply(lambda g: float(np.average(g.hvi, weights=g.population)), include_groups=False)
    nct = pd.read_excel(os.path.join(RAW, "PCA_2011_Distt-Sub_Dist_NCT_of_Delhi.xls"), header=None)
    nct_pop = int(nct.iloc[6, 3])  # column 3 = total persons (column 4 = males)
    assert str(nct.iloc[4, 3]).strip() == "Persons"
    assert str(nct.iloc[6, 0]).strip() == "NCT of Delhi" and str(nct.iloc[6, 1]).strip() == "Total"
    out = {
        "level_achieved": "ward (11 ward-parts of New Delhi district, Census 2011)",
        "source": {"table": "DDW_PCA0705 Primary Census Abstract, town/village/ward level, NCT of Delhi, District New Delhi, 2011",
                   "publisher": "Office of the Registrar General & Census Commissioner, India", "url": WARD_URL},
        "indicators": INDICATORS,
        "not_available": ["elderly share (age tables are district-level only)", "slum households (town-level slum PCA)"],
        "pca": {"eigenvalues": [round(float(e), 3) for e in eig], "explained_variance_ratio": [round(float(r), 3) for r in pca.explained_variance_ratio_],
                "kept_components": [int(k) + 1 for k in keep], "weights": [round(float(v), 3) for v in weights],
                "loadings": {f"PC{int(k) + 1}": {c: round(float(v) * int(s), 3) for c, v in zip(x.columns, pca.components_[k])}
                             for k, s in zip(keep, signs)}},
        "units": json.loads(table.to_json(orient="records")),
        "subdistrict_hvi_pop_weighted": {k: round(v, 3) for k, v in by_sub.items()},
        "pilot_anchor": {"subdistrict": "Connaught Place", "hvi": round(float(by_sub["Connaught Place"]), 3),
                         "population_2011": int(table[table.subdistrict == "Connaught Place"].population.sum())},
        "pilot_wards": "The dashboard's 6 pilot wards are not census wards; no boundaries are available to overlay them, "
                       "so their relative vulnerability stays simulated.",
        "nct_population_2011": nct_pop,
        "nct_source": {"table": "PCA 2011, Districts & Sub-districts, NCT of Delhi", "url": NCT_URL},
    }
    with open(os.path.join(OUT, "layerC.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    write_section("census", f"""## Census of India 2011 (Layer C and population)

- Ward-level PCA, District New Delhi: table DDW_PCA0705, {WARD_URL} (download 9362).
- District and sub-district PCA, NCT of Delhi (for the NCT population, {nct_pop:,}): {NCT_URL} (download 14422).
- Publisher: Office of the Registrar General & Census Commissioner, India. Fetched {dt.date.today().isoformat()}.
  The portal's TLS certificate chain could not be verified by the fetching client, so the files were downloaded with
  certificate verification disabled; they are cached in ml/data/raw/ and the derived indicators are committed.
""")
    print(f"Layer C: {len(table)} ward-parts; PCA eigenvalues {np.round(eig, 2).tolist()}; kept {len(keep)} component(s), "
          f"explained {pca.explained_variance_ratio_[keep].sum():.0%}")
    print(table[["unit", "population", "hvi"]].to_string(index=False))
    print("Sub-district (population-weighted):", {k: round(v, 3) for k, v in by_sub.items()})
    print(f"NCT of Delhi population 2011: {nct_pop:,}")


if __name__ == "__main__":
    main()
