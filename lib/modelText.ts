/**
 * All status-driven wording for Model Insights lives here, so swapping models.json from
 * "illustrative" to "trained" relabels the page and rewrites every "What this shows" note without touching the UI.
 *
 * Notes are templates over the JSON numbers, so they stay true when the numbers change.
 * Illustrative wording: "we expect … because …". Trained wording: "the model achieves …" / "the fitted curve shows … because …".
 */
import type { ModelResults, ModelSectionId, ModelsData } from "./types";

const isTrained = (m: ModelsData) => m.results_status === "trained";
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const mean = (a: number[]) => (a.length ? sum(a) / a.length : NaN);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const f1 = (x: number) => x.toFixed(1);
const f2 = (x: number) => x.toFixed(2);

// ---- labels ---------------------------------------------------------------------------------------------------

/** Page-level badge (no section) or a card badge (with the section's dataset). */
export function badgeText(m: ModelsData, section?: ModelSectionId): string {
  if (!isTrained(m)) return "Evaluation design · illustrative values";
  return `Trained & tested · ${section ? m.sections[section].dataset : m.dataset}`;
}

export function subtitleText(m: ModelsData, section: ModelSectionId): string {
  if (!isTrained(m)) return "Expected performance";
  const ev = m.sections[section].evaluated_on;
  return ev ? `Test-set results (${ev})` : "Test-set results";
}

export const kpiPrefix = (m: ModelsData) => (isTrained(m) ? "Test-set" : "Expected");

export function introText(m: ModelsData): string {
  return isTrained(m)
    ? `Models trained and tested on ${m.dataset}${m.evaluated_on ? `; evaluated on ${m.evaluated_on}` : ""}.`
    : "Pipeline and evaluation design for the pilot. The values below are illustrative until the models are trained and tested.";
}

/** Status text for the "What is real" table. */
/** Status of the other model results (DLNM, vulnerability model, baselines). */
export const otherModelsStatus = (m: ModelsData) => (isTrained(m) ? "Trained & tested" : "Simulated data");

export const forecastModelStatus = (m: ModelsData) => (isTrained(m) ? "Trained & tested" : "Evaluation design (training in progress)");

// ---- notes ----------------------------------------------------------------------------------------------------

export function dlnmNote(m: ModelsData): string {
  const { mmt, exposure_response: curve, summary } = m.dlnm;
  const cold = curve.filter((p) => p.wbgt < mmt).map((p) => p.rr);
  const coldMax = cold.length ? Math.max(...cold) : 1;
  const body = `close to baseline below ${mmt} °C WBGT (never more than ${f2(coldMax)}× baseline), the minimum-mortality point,`;
  const rise = `reaching ${f2(summary.rr_at_p99)}× at the 99th-percentile WBGT, because heat strain compounds once the body can no longer shed heat. This is why the alert thresholds sit where they do.`;
  return isTrained(m)
    ? `The fitted curve stays ${body} and then rises steeply, ${rise}`
    : `We expect risk to stay ${body} and then to rise steeply, ${rise}`;
}

export function lagNote(m: ModelsData): string {
  const lags = m.dlnm.lag_response;
  const excess = lags.map((p) => Math.max(0, p.rr - 1));
  const share = sum(excess) > 0 ? sum(excess.filter((_, i) => lags[i].lag <= 2)) / sum(excess) : NaN;
  const at = (lag: number) => f2(lags.find((p) => p.lag === lag)?.rr ?? NaN);
  const detail = `(${at(0)}× on the day itself, ${at(2)}× by day 2), because the body's response to a hot spell is fast. A 3–5 day lead therefore lets action happen before the peak.`;
  return isTrained(m)
    ? `The model places ${pct(share)} of the added risk on days 0–2 ${detail}`
    : `We expect ${pct(share)} of the added risk to land on days 0–2 ${detail}`;
}

export function backtestNote(m: ModelsData): string {
  const b = m.forecast_model.backtest;
  const mae = mean(b.map((p) => Math.abs(p.predicted - p.actual)));
  const mp = mean(b.map((p) => p.predicted));
  const ma = mean(b.map((p) => p.actual));
  const cov = sum(b.map((p) => (p.predicted - mp) * (p.actual - ma)));
  const r = cov / Math.sqrt(sum(b.map((p) => (p.predicted - mp) ** 2)) * sum(b.map((p) => (p.actual - ma) ** 2)));
  const sorted = [...b].sort((x, y) => x.predicted - y.predicted);
  const cut = sorted[Math.floor(sorted.length * 0.75)]?.predicted ?? 0;
  const peakW = mean(b.filter((p) => p.predicted >= cut).map((p) => p.hi - p.lo));
  const restW = mean(b.filter((p) => p.predicted < cut).map((p) => p.hi - p.lo));
  const track = `forecasts that track the build-up of the heatwave (correlation ${f2(r)}, mean error ${f1(mae)} admissions/day) because they are driven by the WBGT outlook.`;
  const band = `The 80% interval (coverage ${pct(m.forecast_model.coverage_80pct_interval)}) widens at the peaks, about ${f1(peakW / restW)}× wider than on quieter days, where forecasts are least certain.`;
  return `${isTrained(m) ? "The model achieves" : "We expect"} ${track} ${band}`;
}

export function skillNote(m: ModelsData): string {
  const s = [...m.forecast_model.skill_by_lead].sort((a, b) => a.lead_days - b.lead_days);
  const first = s[0];
  const last = s[s.length - 1];
  const usable = s.filter((p) => p.r2 >= 0.8).map((p) => p.lead_days);
  const lastUsable = usable.length ? Math.max(...usable) : null;
  const main =
    `R² of ${f2(first.r2)} at ${first.lead_days} day falling to ${f2(last.r2)} at ${last.lead_days} days, as error grows with lead time ` +
    `(MAE ${f1(first.mae)} → ${f1(last.mae)} admissions/day) because weather uncertainty compounds day by day.`;
  const tail = lastUsable
    ? ` Days 1–${lastUsable} keep R² at 0.80 or better, which is enough time to open cooling centres and brief hospitals.`
    : " The shorter leads remain the most reliable for action.";
  return `${isTrained(m) ? "The model achieves" : "We expect"} ${main}${tail}`;
}

export function baselinesNote(m: ModelsData): string {
  const ours = m.baseline_comparison.find((b) => b.system.startsWith("UshnaRaksha"));
  const temp = m.baseline_comparison.find((b) => /temperature/i.test(b.system));
  if (!ours || !temp) return "";
  const lead = isTrained(m) ? "The model achieves" : "We expect";
  return (
    `${lead} a hit rate of ${pct(ours.hit_rate)} against ${pct(temp.hit_rate)} for a temperature threshold, with ${pct(ours.false_alarm_ratio)} false alarms against ${pct(temp.false_alarm_ratio)} ` +
    `and ${f1(ours.lead_days)} days of lead against ${f1(temp.lead_days)}, because humidity, radiation and vulnerability are included, not air temperature alone.`
  );
}

export function shapNote(m: ModelsData): string {
  const g = [...m.vulnerability_model.shap_global].sort((a, b) => b.importance - a.importance);
  const total = sum(g.map((x) => x.importance));
  const [a, b] = g;
  if (!a || !b) return "";
  const share = pct((a.importance + b.importance) / total);
  const night = g.slice(0, 2).some((x) => /night|tmin/i.test(x.feature));
  const why = night ? ", which is physiologically plausible: when nights stay hot the body gets no overnight recovery." : ".";
  return isTrained(m)
    ? `The model relies mostly on ${a.feature} and ${b.feature} (${share} of total importance)${why}`
    : `We expect ${a.feature} and ${b.feature} to dominate (${share} of total importance)${why}`;
}

export function historyNote(m: ModelsData): string {
  const h = m.historical;
  const low = mean(h.filter((d) => d.wbgt < m.dlnm.mmt).map((d) => d.deaths));
  const hotDays = h.filter((d) => d.wbgt >= 35);
  const hot = mean(hotDays.map((d) => d.deaths));
  // first 1 °C WBGT bin whose mean deaths exceed the low-WBGT average by 25 %
  let knee: number | null = null;
  for (let t = Math.ceil(m.dlnm.mmt); t <= 38 && knee === null; t++) {
    const bin = h.filter((d) => d.wbgt >= t && d.wbgt < t + 1).map((d) => d.deaths);
    if (bin.length >= 3 && mean(bin) > low * 1.25) knee = t;
  }
  const lead = isTrained(m) ? "In the observed record," : "We expect, and the illustrative data show, that";
  return (
    `${lead} daily deaths rise non-linearly with WBGT: they average ${Math.round(low)} below ${m.dlnm.mmt} °C` +
    (hotDays.length ? ` but ${Math.round(hot)} at 35 °C and above` : "") +
    (knee !== null ? `, with the climb starting around ${knee} °C. This is why the alert thresholds sit near there.` : ".")
  );
}

// ==== Trained results (public/data/risk/model_results.json) ====================================================
// Every sentence below is computed from the real pipeline output and states plainly where a model loses.


const LEADS = ["1", "2", "3", "4", "5"];
const r1 = (x: number) => x.toFixed(1);
const r2 = (x: number) => x.toFixed(2);
const pctOf = (x: number) => `${Math.round(x * 100)}%`;
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export const trainedBadge = (r: ModelResults) => `Trained & tested · ${r.dataset}`;
export const trainedSubtitle = (r: ModelResults) => `Test-set results (${r.evaluated_on})`;

export function trainedIntro(r: ModelResults): string {
  const s = r.data.split;
  return `Forecasts of daily maximum WBGT for New Delhi, trained on ${s.train} (${s.n_train} days), early-stopped on ${s.validation} and tested on ${s.test} (${s.n_test} days), March–June. Split by time, never shuffled.`;
}

export function skillByLeadNote(r: ModelResults): string {
  const m = r.layerA.metrics;
  const lg = m.lgbm;
  const pers = m.persistence;
  const clim = m.climatology;
  const losesClim = LEADS.filter((l) => lg[l].pinball! >= clim[l].pinball!);
  const beatsPersAll = LEADS.every((l) => lg[l].mae < pers[l].mae);
  const lstmLoses = LEADS.filter((l) => m.lstm && m.lstm[l].mae >= clim[l].mae);
  return (
    `The LightGBM model's error grows from ${r2(lg["1"].mae)} °C at 1 day to ${r2(lg["5"].mae)} °C at 5 days, as weather uncertainty compounds. ` +
    (beatsPersAll ? `It beats persistence at every lead (${r2(pers["5"].mae)} °C at 5 days). ` : "") +
    `By day 5 it is barely better than climatology on MAE (${r2(lg["5"].mae)} vs ${r2(clim["5"].mae)} °C)` +
    (losesClim.length ? `, and it loses to climatology on pinball loss at lead${losesClim.length > 1 ? "s" : ""} ${list(losesClim)}.` : ".") +
    (lstmLoses.length ? ` The LSTM is worse than climatology on MAE at lead${lstmLoses.length > 1 ? "s" : ""} ${list(lstmLoses)}.` : "")
  );
}

export function coverageNote(r: ModelResults): string {
  const m = r.layerA.metrics;
  const avg = (k: string) => LEADS.reduce((a, l) => a + (m[k]?.[l]?.cov80 ?? 0), 0) / LEADS.length;
  const rng = (k: string) => {
    const v = LEADS.map((l) => m[k][l].cov80 ?? NaN);
    return `${pctOf(Math.min(...v))}–${pctOf(Math.max(...v))}`;
  };
  const lstmGain = avg("lstm_cal") - avg("lstm");
  return (
    `The 10–90 % band should contain the outcome 80 % of the time. Raw LightGBM bands managed ${pctOf(avg("lgbm"))} on the test years; ` +
    `after a per-lead conformal adjustment learned on the 2023 validation season only, they reach ${pctOf(avg("lgbm_cal"))} (${rng("lgbm_cal")} by lead). ` +
    (Math.abs(lstmGain) < 0.03
      ? `The same adjustment barely moves the LSTM (${pctOf(avg("lstm"))} → ${pctOf(avg("lstm_cal"))}): 2023 was not representative of its errors. `
      : `The LSTM moves from ${pctOf(avg("lstm"))} to ${pctOf(avg("lstm_cal"))}. `) +
    `Both models were also early-stopped on 2023, so that season is not a fully independent calibration set.`
  );
}

export function backtestTrainedNote(r: ModelResults, lead: string): string {
  const s = r.layerA.backtest.leads[lead] ?? [];
  if (!s.length) return "";
  const inside = s.filter((p) => p.actual >= p.lo && p.actual <= p.hi).length / s.length;
  const peak = s.reduce((a, b) => (b.actual > a.actual ? b : a));
  const maxMed = Math.max(...s.map((p) => p.median));
  return `Over ${r.layerA.backtest.window}, the lead-${lead} band contains ${pctOf(inside)} of observed days. The forecast follows the seasonal build-up but smooths the extremes: the hottest observed day (${peak.date}, ${r1(peak.actual)} °C) was forecast at ${r1(peak.median)} °C, and no median forecast in the window exceeded ${r1(maxMed)} °C.`;
}

export function nwpNote(r: ModelResults): string {
  const n = r.layerA.nwp_subset;
  if (!n.nwp_raw || !n.lgbm) return "";
  const rawWins = LEADS.filter((l) => n.nwp_raw[l].mae < n.lgbm[l].mae);
  const pp = n.nwp_pp;
  const ppCov = pp ? LEADS.map((l) => pp[l].cov80 ?? NaN) : [];
  return (
    `On the ${r.data.split.n_nwp_subset} test days from 2025 that have archived weather-model forecasts, the raw forecast converted to WBGT beats the observation-only LightGBM at lead${rawWins.length > 1 ? "s" : ""} ${list(rawWins)} ` +
    `(e.g. ${r2(n.nwp_raw["3"].mae)} vs ${r2(n.lgbm["3"].mae)} °C at 3 days): the weather model knows what is coming, observations do not. ` +
    (pp ? `Post-processing the NWP forecast gives the lowest error (${r2(pp["3"].mae)} °C at 3 days) but was trained on a single season (2024), and its 80 % bands cover only ${pctOf(Math.min(...ppCov))}–${pctOf(Math.max(...ppCov))}. This is the most promising route, and it needs more seasons of archived forecasts.` : "")
  );
}

export function eventsTrainedNote(r: ModelResults): string {
  const e = r.layerA.events;
  const p95 = r.data.p95.wbgt;
  const c = (x: number | null | undefined) => (x === null || x === undefined ? "–" : r2(x));
  const med1 = e.lgbm_cal?.["1"]?.p95;
  const cal1 = e.lgbm_cal?.["1"]?.p95_q90_trigger;
  const cal3 = e.lgbm_cal?.["3"]?.p95_q90_trigger;
  const pp = r.layerA.events_nwp_subset.nwp_pp_cal?.["3"]?.p95_q90_trigger;
  return (
    `Heat days are days at or above the local 95th percentile (${r2(p95)} °C WBGT). Median forecasts almost never reach it (LightGBM CSI ${c(med1?.csi)} at 1 day), because they smooth the extremes. ` +
    `Warning on the calibrated 90 % quantile instead gives CSI ${c(cal1?.csi)} at 1 day and ${c(cal3?.csi)} at 3 days, catching ${pctOf(cal3?.hit_rate ?? 0)} of 3-day-ahead heat days at the cost of many false alarms (FAR ${c(cal3?.far)})` +
    (pp ? `; with weather-model inputs (2025 →) CSI is ${c(pp.csi)} at 3 days. ` : ". ") +
    `This trigger rule was chosen after inspecting results (it was first adopted after the median results were seen on the test set); its calibration uses the 2023 validation season only.`
  );
}

export function improvementNote(r: ModelResults): string {
  const im = r.layerA.improvement.main.lgbm;
  const lstm = r.layerA.improvement.main.lstm;
  const pp = r.layerA.improvement.nwp_subset?.nwp_pp;
  const p = (x: number) => `${x >= 0 ? "+" : ""}${x.toFixed(0)}%`;
  const lstmLose = LEADS.filter((l) => lstm[l].vs_climatology_pct < 0);
  return (
    `Against persistence, LightGBM's error improvement grows with lead time, from ${p(im["1"].vs_persistence_pct)} at 1 day to ${p(im["5"].vs_persistence_pct)} at 5 days, because tomorrow's weather rarely equals today's. ` +
    `Against climatology the gain shrinks from ${p(im["1"].vs_climatology_pct)} to ${p(im["5"].vs_climatology_pct)}: five days out, the season explains most of what the model knows.` +
    (lstmLose.length ? ` The LSTM is worse than climatology at lead${lstmLose.length > 1 ? "s" : ""} ${list(lstmLose)}.` : "") +
    (pp ? ` With archived weather-model forecasts (2025 →), post-processing improves on climatology by ${p(pp["3"].vs_climatology_pct)} at 3 days.` : "")
  );
}

/** Lowest test-set MAE at a lead among the main-test models (raw and calibrated share the same median). */
export function bestModelAt(r: ModelResults, lead: string): { key: string; mae: number } {
  const m = r.layerA.metrics;
  return Object.entries(m)
    .filter(([k]) => !k.endsWith("_cal"))
    .map(([key, v]) => ({ key, mae: v[lead].mae }))
    .reduce((a, b) => (b.mae < a.mae ? b : a));
}

export function shapTrainedNote(r: ModelResults): string {
  const g = r.layerA.shap.global;
  const total = g.reduce((a, b) => a + b.mean_abs_shap, 0);
  const season = g.filter((x) => x.feature.startsWith("doy_")).reduce((a, b) => a + b.mean_abs_shap, 0);
  const firstWeather = g.find((x) => !x.feature.startsWith("doy_"));
  return `At 3 days ahead the model leans mostly on the time of year (${pctOf(season / total)} of the attribution among the top features), then on ${firstWeather?.feature ?? "recent WBGT"}. Humidity and radiation add little on their own. With observations only, the seasonal cycle is the strongest signal three days out, which is why adding weather-model forecasts helps.`;
}

export function localShapNote(r: ModelResults): string {
  const l = r.layerA.shap.local;
  const top = l.contributions.slice(0, 3).map((c) => `${c.feature} (${c.shap >= 0 ? "+" : ""}${r2(c.shap)} °C)`);
  return `For the hottest test day, ${l.target_date}, the model predicted ${r1(l.predicted)} °C against an observed ${r1(l.actual)} °C, under-forecasting by ${r1(l.actual - l.predicted)} °C. Starting from the average of ${r1(l.base_value)} °C, the largest pushes came from ${list(top)}.`;
}

export function layerBNote(r: ModelResults): string {
  const b = r.layerB;
  const v = b.values;
  const at30 = b.curve_by_wbgt.find((p) => p.wbgt === 30);
  return `Mortality rises ${r1(v.pct_increase_per_c)} % (95 % CI ${r1(v.ci95_pct[0])}–${r1(v.ci95_pct[1])} %) for each °C of ${v.exposure_metric_as_stated.split(" (")[0]} above ${v.threshold_c} °C, summed over ${v.lag_window_days} days, as published for Delhi. It is applied on its own air-temperature scale: forecast WBGT is mapped to daily mean temperature (R² ${r2(b.mapping.r2_train)}, error SD ${r1(b.mapping.resid_sd_test_c)} °C on test). ` +
    (at30 ? `At a WBGT of 30 °C this gives a relative risk of ${r2(at30.rr)} (${r2(at30.lo)}–${r2(at30.hi)}). ` : "") +
    "The wide interval and the early-1990s data are real limitations; this curve was not fitted by us.";
}

export function layerCNote(r: ModelResults): string {
  const c = r.layerC;
  const kept = c.pca.kept_components.length;
  const expl = c.pca.kept_components.reduce((a, k) => a + c.pca.explained_variance_ratio[k - 1], 0);
  const sub = Object.entries(c.subdistrict_hvi_pop_weighted).map(([k, v]) => `${k} ${r2(v)}`);
  return `A vulnerability index from Census 2011 at ${c.level_achieved.split(" (")[0]} level: ${Object.keys(c.indicators).length} indicators, ${kept} principal component${kept > 1 ? "s" : ""} explaining ${pctOf(expl)} of the variance. Population-weighted by sub-district: ${list(sub)}. The table has no elderly share or slum counts, and the dashboard's 6 pilot wards are not census wards, so the ward-to-ward spread on the map stays simulated.`;
}

export function riskEngineNote(r: ModelResults): string {
  const e = r.risk_engine;
  const fc = e.city_totals.slice(1);
  const sum = (k: "deaths_q50" | "deaths_q10" | "deaths_q90" | "deaths_observed") => fc.reduce((a, d) => a + d[k], 0);
  return `For the hottest real 6-day window in the test years (${e.window.start} to ${e.window.end}), the forecasts imply ${r1(sum("deaths_q50"))} excess resident deaths over days 1–5 (10–90 %: ${r1(sum("deaths_q10"))}–${r1(sum("deaths_q90"))}). Using the observed heat instead gives ${r1(sum("deaths_observed"))}, higher than even the upper forecast, because the forecasts under-predicted this heatwave's peak. Population ${e.inputs.population_total.toLocaleString("en-IN")} residents (Census 2011); the daytime commuter population is not counted.`;
}
