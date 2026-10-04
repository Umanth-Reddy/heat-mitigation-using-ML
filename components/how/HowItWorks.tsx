"use client";

import { ArrowRight } from "lucide-react";
import { useRiskData } from "@/lib/data";
import { forecastModelStatus, otherModelsStatus } from "@/lib/modelText";
import { TIER_COLORS } from "@/lib/risk";
import type { TierId } from "@/lib/types";

const SECTIONS = [
  { id: "indices", label: "Heat-stress indices" },
  { id: "sources", label: "Data sources" },
  { id: "models", label: "Model cards" },
  { id: "flow", label: "Decision & alert flow" },
  { id: "real", label: "What is real" },
  { id: "refs", label: "References" },
];

function Section({ id, letter, title, children }: { id: string; letter: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card p-6 scroll-mt-6">
      <h2 className="text-lg font-semibold mb-4">
        <span className="text-brand font-mono mr-2">({letter})</span>
        {title}
      </h2>
      <div className="flex flex-col gap-4 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return <pre className="rounded-lg border border-border bg-white/[0.03] px-4 py-3 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">{children}</pre>;
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-xs text-muted text-left">
            {head.map((h) => (
              <th key={h} className="font-normal pb-2 pr-4">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border align-top">
              {r.map((c, j) => (
                <td key={j} className={`py-2.5 pr-4 ${j === 0 ? "font-medium whitespace-nowrap" : "text-muted"}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusChip({ s }: { s: string }) {
  const tone =
    s === "Working in browser" || s === "Trained & tested"
      ? "border-white/40 text-text"
      : s === "Planned backend"
        ? "border-border text-muted border-dashed"
        : "border-brand/60 text-brand";
  return <span className={`inline-block px-2 py-0.5 rounded-full border text-xs whitespace-nowrap ${tone}`}>{s}</span>;
}

const MODEL_CARDS = [
  {
    name: "DLNM · Distributed Lag Non-Linear Model",
    purpose: "Quantify how daily WBGT raises mortality risk, including the delay over the following 0–5 days.",
    inputs: "Daily WBGT series, daily mortality counts, seasonal and long-term trend terms, day of week.",
    outputs: "Exposure–response curve (relative risk by WBGT), lag–response, minimum-mortality WBGT, attributable fraction.",
    validation: "Leave-one-summer-out cross-validation, information criterion to choose the spline degrees of freedom, residual and autocorrelation checks.",
    limits: "Needs several summers of reliable mortality data (sparse in India); ecological, not individual-level; unreliable beyond the observed WBGT range.",
    prototype: "The curve in Model Insights is generated from a simple parametric formula, not fitted to data.",
  },
  {
    name: "LightGBM · vulnerability model",
    purpose: "Score how vulnerable each zone's population is to heat, so alerts can be targeted.",
    inputs: "Share of elderly residents, outdoor workers and informal settlements, tree canopy, surface temperature, building density.",
    outputs: "Vulnerability score (0–1) per zone, and global feature importance via SHAP.",
    validation: "Spatial cross-validation by ward (so neighbouring zones never sit in both train and test), AUC, precision, recall and F1 against outcome labels.",
    limits: "Heat-illness labels are scarce so proxies are needed; census data is dated; neighbouring zones are correlated.",
    prototype: "Scores and the reported AUC (0.87) are simulated.",
  },
  {
    name: "TFT + SHAP · Temporal Fusion Transformer",
    purpose: "Forecast heat-related hospital admissions 3–5 days ahead, with uncertainty, and explain each flag.",
    inputs: "NWP forecast covariates, WBGT/UTCI, calendar features, lagged admissions, static ward attributes.",
    outputs: "Quantile forecasts (80% interval) per ward and day, plus SHAP attributions for the 'why flagged' view.",
    validation: "Rolling-origin backtest over past heat seasons; MAE, MAPE and R² by lead day; coverage of the 80% interval.",
    limits: "Admission data arrives late and incompletely; error grows with lead time; extreme heatwaves are rare, so few examples; needs retraining every season.",
    prototype: "The backtest, skill by lead day and intervals are simulated.",
  },
];

const FLOW = [
  { t: "Ingest", d: "IMD forecast, satellite LST, census, hospital admissions" },
  { t: "Compute", d: "WBGT and UTCI per ~120 m zone; vulnerability index" },
  { t: "Model", d: "DLNM, LightGBM and TFT+SHAP produce risk, admissions and reasons" },
  { t: "Human review", d: "A nodal officer approves, edits or rejects each alert", emphasis: true },
  { t: "Dispatch", d: "SMS, WhatsApp, CAP and CHW relay; cooling centres and hospitals" },
];

const REFS: [string, string][] = [
  ["Brimicombe et al. — Wet Bulb Globe Temperature: indicating extreme heat risk on a global grid", "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9941479/"],
  ["Bröde et al. (2012) — Deriving the operational procedure for the Universal Thermal Climate Index (UTCI)", "https://doi.org/10.1007/s00484-011-0454-1"],
  ["UTCI approximation methods (polynomial / look-up table approach)", "https://arxiv.org/pdf/2508.11307"],
  ["Stull (2011) — Wet-bulb temperature from relative humidity and air temperature", "https://doi.org/10.1175/JAMC-D-11-0143.1"],
  ["pythermalcomfort (MIT) — reference implementation of UTCI used for our port", "https://github.com/CenterForTheBuiltEnvironment/pythermalcomfort"],
  ["NDMA — official heatwave criteria", "https://ndma.gov.in/Natural-Hazards/Heat-Wave"],
  ["PIB — NDMA and IMD develop Heat Action Plans with states", "https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1885718"],
  ["Heat wave vulnerability mapping for India (PCA, 640 districts)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC5409558/"],
  ["Heat health risk index for Indian cities (Otsu-based weighted overlay)", "https://www.sciencedirect.com/science/article/pii/S2772655X24000582"],
  ["Machine-learning analysis and prediction of heatstroke using DLNM", "https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2024.1420608/full"],
  ["Machine and deep learning for modelling heat-health relationships (DLNM vs GBM/RF)", "https://pubmed.ncbi.nlm.nih.gov/37285991/"],
  ["Development and implementation of South Asia's first heat-health action plan, Ahmedabad", "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4024996/"],
  ["Extreme heat, gender and access to preparedness measures in Ahmedabad (≈1,190 deaths/year avoided)", "https://www.sciencedirect.com/science/article/pii/S2212420923005605"],
  ["NASA ARSET — overview and access of land surface temperature (LST) for UHI mapping", "https://appliedsciences.nasa.gov/sites/default/files/2023-05/Day2_P5_Eng.pdf"],
  ["Downscaling MODIS LST using Landsat for urban heat risk assessment (NASA NTRS)", "https://ntrs.nasa.gov/api/citations/20140006517/downloads/20140006517.pdf"],
];

export default function HowItWorks() {
  const { meta, models } = useRiskData();
  if (!meta || !models) return null;
  const range = (min: number | null, max: number | null) => (min === null ? `< ${max}` : max === null ? `≥ ${min}` : `${min}–${max}`);
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="absolute inset-0 overflow-y-auto anim-fade">
      <div className="max-w-[1280px] mx-auto px-6 py-6 grid grid-cols-[200px_1fr] gap-6 items-start">
        <nav aria-label="Sections" className="sticky top-6 flex flex-col gap-1">
          <div className="text-xs uppercase tracking-wider text-muted mb-1.5">How it works</div>
          {SECTIONS.map((s, i) => (
            <button key={s.id} onClick={() => go(s.id)} className="text-left text-sm px-3 py-2 rounded-lg text-muted hover:text-text hover:bg-white/5">
              <span className="font-mono text-xs mr-2">{String.fromCharCode(97 + i)}</span>
              {s.label}
            </button>
          ))}
        </nav>

        <div className="flex flex-col gap-5">
          <Section id="indices" letter="a" title="Heat-stress indices">
            <p>
              Air temperature alone misses what the body feels. <b>WBGT</b> (wet-bulb globe temperature) combines humidity and radiant heat; it is the basis of occupational heat limits (ISO 7243).{" "}
              <b>UTCI</b> (Universal Thermal Climate Index) is the air temperature of a reference environment that would put the same physiological strain on a person as the real one, using temperature, humidity, wind and radiation.
              A 38 °C day with 20% humidity and a 38 °C day with 60% humidity are very different risks; a thermometer reads them the same.
            </p>
            <div>
              <div className="text-xs text-muted mb-1.5">Formulas used in this prototype</div>
              <Formula>{`Wet bulb (Stull 2011):
  Tw = Ta·atan(0.151977·√(RH + 8.313659)) + atan(Ta + RH) − atan(RH − 1.676331)
       + 0.00391838·RH^1.5·atan(0.023101·RH) − 4.686035

WBGT estimate (°C):
  WBGT = 0.7·Tw + 0.3·Ta + radiant        (radiant = local radiant-load term from surface temperature)

UTCI (Bröde et al. 2012):
  UTCI = Ta + f(Ta, v, Tmrt − Ta, pa)     (6th-order polynomial approximation of the full thermo-physiological model;
                                           v = 10 m wind clamped to 0.5–17 m/s, pa = vapour pressure, kPa)`}</Formula>
              <p className="text-muted mt-2">
                The calculator (header, key <kbd className="font-mono">C</kbd>) runs exactly these formulas in your browser. The UTCI port is checked against the pythermalcomfort reference values with <code className="font-mono">npm run test:thermal</code>.
                The map&apos;s forecast UTCI is simulated with a simpler approximation in the data generator.
              </p>
            </div>
            <div>
              <div className="text-xs text-muted mb-1.5">IMD-style 4-tier colour code on WBGT</div>
              <Table
                head={["Tier", "WBGT (°C)", "Meaning"]}
                rows={meta.tiers.map((t) => [
                  <span key="t" className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: TIER_COLORS[t.id as TierId] }} />{t.imd} · {t.label}</span>,
                  <span key="r" className="font-mono tabular-nums">{range(t.wbgt_min, t.wbgt_max)}</span>,
                  t.meaning,
                ])}
              />
            </div>
            <p>
              <b>Local 95th-percentile rule.</b> A fixed national cut-off over-triggers in cool places and under-triggers in hot ones, which causes alert fatigue. Alerts are therefore anchored to each place&apos;s own history: the 95th-percentile WBGT of {meta.threshold.method.replace("Local 95th-percentile WBGT baseline ", "")} is{" "}
              <span className="font-mono">{meta.threshold.wbgt_p95} °C</span>, and an alert needs at least <span className="font-mono">{meta.threshold.min_consecutive_days}</span> consecutive days at or above it. In the prototype the tier bands are fixed and the P95 value is illustrative.
            </p>
          </Section>

          <Section id="sources" letter="b" title="Data sources">
            <Table
              head={["Source", "What we use", "Update frequency", "Prototype status"]}
              rows={[
                ["IMD NWP forecast", "Air temperature, humidity and wind for the next 5 days", "Daily forecast cycle", <StatusChip key="a" s="Simulated data" />],
                ["Landsat 8/9 + MODIS LST", "Land surface temperature, downscaled to ~120 m, as the radiant-load term", "MODIS daily; Landsat every ~8–16 days", <StatusChip key="b" s="Simulated data" />],
                ["Census 2011 / SECC", "Population, elderly share, outdoor workers, informal settlements", "Decennial, with periodic updates", <StatusChip key="c" s="Simulated data" />],
                ["IDSP + hospital admissions", "Heat-illness counts to calibrate and validate the models", "Daily to weekly", <StatusChip key="d" s="Planned backend" />],
                ["OpenStreetMap", "Building footprints for the Urban Planning view; context basemap", "Continuous", <StatusChip key="e" s="Partly real" />],
              ]}
            />
            <p className="text-muted">
              Partly real: the 856 building footprints in Urban Planning are real OSM data; heights, heat attribution and everything else about them are simulated.
            </p>
          </Section>

          <Section id="models" letter="c" title="Model cards">
            <div className="grid grid-cols-3 gap-4">
              {MODEL_CARDS.map((m) => (
                <article key={m.name} className="rounded-xl border border-border bg-white/[0.02] p-4 flex flex-col gap-3">
                  <h3 className="font-semibold">{m.name}</h3>
                  {([["Purpose", m.purpose], ["Inputs", m.inputs], ["Outputs", m.outputs], ["Validation", m.validation], ["Known limitations", m.limits]] as const).map(([k, v]) => (
                    <div key={k}>
                      <div className="text-xs text-muted">{k}</div>
                      <div>{v}</div>
                    </div>
                  ))}
                  {models.results_status === "illustrative" && (
                    <div className="text-xs rounded-md border border-brand/40 bg-brand/10 px-2.5 py-2">In this prototype: {m.prototype}</div>
                  )}
                </article>
              ))}
            </div>
          </Section>

          <Section id="flow" letter="d" title="Decision & alert flow">
            <div className="flex items-stretch gap-2">
              {FLOW.map((f, i) => (
                <div key={f.t} className="contents">
                  <div className={`flex-1 rounded-xl border p-4 ${f.emphasis ? "border-brand bg-brand/10" : "border-border bg-white/[0.03]"}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-6 h-6 rounded-full bg-brand text-black text-xs font-bold font-mono flex items-center justify-center">{i + 1}</span>
                      <span className="font-semibold">{f.t}</span>
                    </div>
                    <div className="text-muted">{f.d}</div>
                  </div>
                  {i < FLOW.length - 1 && <ArrowRight className="w-5 h-5 text-muted self-center shrink-0" />}
                </div>
              ))}
            </div>
            <p className="text-muted">No alert is dispatched without human approval. The Alerts tab demonstrates this step; nothing is actually sent.</p>
          </Section>

          <Section id="real" letter="e" title="What is real in this prototype">
            <p>
              Short version: the <b>heat-stress calculator is real</b>. Forecasts, health numbers, model metrics and impact estimates are <b>simulated</b> by seeded scripts so the demo tells a consistent story.
            </p>
            <Table
              head={["Feature", "Status", "Notes"]}
              rows={[
                ["Heat-stress calculator (WBGT, UTCI)", <StatusChip key="1" s="Working in browser" />, "Real formulas, tested against pythermalcomfort reference values."],
                ["Ward map, tiers, 6-day timeline", <StatusChip key="2" s="Simulated data" />, "Generated by scripts/generate_risk_data.py; deterministic."],
                ["Vulnerability, population, satellite LST layers", <StatusChip key="3" s="Simulated data" />, "Formula-generated; not real census or satellite values."],
                ["Admission and death predictions, SHAP reasons", <StatusChip key="4" s="Simulated data" />, "Derived from the simulated WBGT; not model output."],
                ["Alert queue, previews and approval flow", <StatusChip key="5" s="Working in browser" />, "The interface and state flow work; messages are templates."],
                ["Sending SMS / WhatsApp / CAP", <StatusChip key="6" s="Planned backend" />, "Needs gateway integrations and an approvals database."],
                ["Cooling centres and hospitals", <StatusChip key="7" s="Simulated data" />, "Placeholder names and simulated loads."],
                ["Impact tab (lives saved)", <StatusChip key="8" s="Simulated data" />, "Scenario estimates from assumed action effectiveness."],
                [
                  "Forecast model (TFT)",
                  <StatusChip key="9" s={forecastModelStatus(models)} />,
                  models.results_status === "illustrative"
                    ? "The evaluation design (backtest, skill by lead day, intervals) is ready; the values shown are illustrative until training finishes."
                    : "Test-set results; see Model Insights.",
                ],
                [
                  "DLNM, vulnerability model, baselines",
                  <StatusChip key="9b" s={otherModelsStatus(models)} />,
                  models.results_status === "illustrative" ? "Illustrative values; no model has been trained yet." : "Test-set results; see Model Insights.",
                ],
                ["Urban Planning 3D tool", <StatusChip key="10" s="Partly real" />, "Real OSM footprints; simulated heat attribution."],
                ["Live forecast ingestion, model training, PostGIS, scheduling", <StatusChip key="11" s="Planned backend" />, "FastAPI, PostGIS, Airflow and the ML stack in the proposal."],
              ]}
            />
          </Section>

          <Section id="refs" letter="f" title="References">
            <ul className="flex flex-col gap-2">
              {REFS.map(([title, url]) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer" className="text-text hover:text-brand underline underline-offset-2 decoration-border">{title}</a>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
