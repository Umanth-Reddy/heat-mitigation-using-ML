/**
 * All status-driven wording for Model Insights lives here, so swapping models.json from
 * "illustrative" to "trained" relabels the page and rewrites every "What this shows" note without touching the UI.
 *
 * Notes are templates over the JSON numbers, so they stay true when the numbers change.
 * Illustrative wording: "we expect … because …". Trained wording: "the model achieves …" / "the fitted curve shows … because …".
 */
import type { ModelSectionId, ModelsData } from "./types";

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
