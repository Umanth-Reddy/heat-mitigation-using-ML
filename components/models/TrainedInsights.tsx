"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend as RLegend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { axisProps, CHART, gridProps, tooltipProps } from "@/components/charts/theme";
import {
  backtestTrainedNote, coverageNote, eventsTrainedNote, layerBNote, layerCNote, localShapNote, nwpNote, riskEngineNote,
  shapTrainedNote, skillByLeadNote, trainedBadge, trainedIntro, trainedSubtitle,
} from "@/lib/modelText";
import type { ModelResults } from "@/lib/types";

const LEADS = ["1", "2", "3", "4", "5"];
const RAN = [
  { stage: "Ingest", items: ["ERA5 hourly (Open-Meteo), 2015 →", "Archived NWP forecasts, 2024 →", "Census 2011 ward PCA", "Published Delhi coefficients"] },
  { stage: "Compute", items: ["Hourly WBGT + UTCI", "Daily max / min / mean", "7-day lags, trends, season"] },
  { stage: "Forecast", items: ["LightGBM quantiles (10/50/90 %)", "LSTM comparison", "NWP post-processing (2025 →)"] },
  { stage: "Risk", items: ["Hajat et al. 2005 exposure–response", "Census PCA vulnerability index", "de Bont et al. 2024 baseline deaths"] },
  { stage: "Evaluate", items: ["Time-ordered test 2024 →", "MAE, pinball, coverage, CSI", "SHAP global + local"] },
];
const SERIES: Record<string, string> = { persistence: "#6b7280", climatology: "#9ca3af", lstm: "#60a5fa", lgbm: CHART.brand };

function Badge({ text, small = false }: { text: string; small?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-border text-muted whitespace-nowrap ${small ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-muted/70" />
      {text}
    </span>
  );
}

function Card({ title, subtitle, badge, caption, note, children, className = "" }: {
  title: string; subtitle?: string; badge?: string; caption?: string; note?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`card p-5 flex flex-col ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <div className="text-xs text-muted mt-0.5">{subtitle}</div>}
        </div>
        {badge && <Badge small text={badge} />}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
      {caption && <p className="text-xs text-muted mt-3">{caption}</p>}
      {note && (
        <p className="text-xs text-muted leading-relaxed mt-3 pt-3 border-t border-border">
          <span className="text-text font-medium">What this shows. </span>
          {note}
        </p>
      )}
    </section>
  );
}

const shortDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const fmt = (x: number | null | undefined, d = 2) => (x === null || x === undefined ? "–" : x.toFixed(d));

export default function TrainedInsights({ r }: { r: ModelResults }) {
  const [lead, setLead] = useState("3");
  const A = r.layerA;
  const m = A.metrics;
  const badge = trainedBadge(r);
  const sub = trainedSubtitle(r);
  const names = A.models;

  const lg = m.lgbm;
  const pers = m.persistence;
  const gain3 = 1 - lg["3"].mae / pers["3"].mae;
  const cov = LEADS.reduce((a, l) => a + (lg[l].cov80 ?? 0), 0) / LEADS.length;
  const ev1 = A.events.lgbm["1"].p95_q90_trigger;
  const kpis = [
    { label: "Test-set MAE, 1 / 3 / 5 days", value: `${lg["1"].mae.toFixed(2)} / ${lg["3"].mae.toFixed(2)} / ${lg["5"].mae.toFixed(2)}`, sub: "°C, LightGBM median, daily max WBGT" },
    { label: "Test-set error vs persistence (3 days)", value: `−${Math.round(gain3 * 100)}%`, sub: `${lg["3"].mae.toFixed(2)} vs ${pers["3"].mae.toFixed(2)} °C MAE` },
    { label: "Test-set 80 % band coverage", value: `${Math.round(cov * 100)}%`, sub: "target 80 %: bands are too narrow" },
    { label: "Test-set heat-day CSI (1 day)", value: fmt(ev1?.csi), sub: `≥ ${r.data.p95.wbgt.toFixed(1)} °C, 90 % quantile trigger · hit ${fmt(ev1?.hit_rate)}, FAR ${fmt(ev1?.far)}` },
  ];

  const errByLead = LEADS.map((l) => ({
    lead: `${l}d`,
    ...Object.fromEntries(["persistence", "climatology", "lstm", "lgbm"].filter((k) => m[k]).map((k) => [k, m[k][l].mae])),
  }));
  const bt = (A.backtest.leads[lead] ?? []).map((p) => ({ ...p, band: [p.lo, p.hi] as [number, number], label: shortDate(p.date) }));
  const nwp = A.nwp_subset;
  const nwpRows = LEADS.map((l) => ({
    lead: `${l}d`,
    ...Object.fromEntries(["persistence", "lgbm", "nwp_raw", "nwp_pp"].filter((k) => nwp[k]).map((k) => [k, nwp[k][l].mae])),
  }));
  const shapG = A.shap.global.slice(0, 10);
  const local = A.shap.local;
  const B = r.layerB;
  const C = r.layerC;
  const units = [...C.units].sort((a, b) => b.hvi - a.hvi);
  const R = r.risk_engine;
  const risk = R.city_totals.map((d) => ({ ...d, band: [d.deaths_q10, d.deaths_q90] as [number, number], label: d.lead === 0 ? `${shortDate(d.date)} (obs)` : shortDate(d.date) }));
  const beats = A.beats_baselines;

  return (
    <div className="absolute inset-0 overflow-y-auto p-6 anim-fade">
      <div className="max-w-[1872px] mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge text={badge} />
          <p className="text-sm text-muted">{trainedIntro(r)}</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="card p-5">
              <div className="text-xs text-muted">{k.label}</div>
              <div className="text-3xl font-mono tabular-nums font-medium mt-1.5">{k.value}</div>
              <div className="text-xs text-muted mt-1">{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card title="Error by lead day" subtitle={sub} badge={badge} note={skillByLeadNote(r)}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={errByLead} margin={{ top: 8, right: 12, left: -6, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="lead" {...axisProps} />
                  <YAxis {...axisProps} domain={[0.5, "auto"]} label={{ value: "MAE (°C)", angle: -90, position: "insideLeft", offset: 16, fill: CHART.axis, fontSize: 12 }} />
                  <Tooltip {...tooltipProps} formatter={(v: any, n: any) => [`${Number(v).toFixed(3)} °C`, names[n] ?? n]} />
                  <RLegend formatter={(v: string) => names[v] ?? v} wrapperStyle={{ fontSize: 12, color: CHART.axis }} />
                  {Object.keys(SERIES).filter((k) => m[k]).map((k) => (
                    <Line key={k} dataKey={k} stroke={SERIES[k]} strokeWidth={k === "lgbm" ? 2.5 : 1.5} dot={{ r: 3 }} isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title={`Backtest · ${A.backtest.window}`} subtitle={sub} badge={badge} note={backtestTrainedNote(r, lead)}>
            <div className="flex gap-1 mb-2" role="group" aria-label="Lead time">
              {["1", "3", "5"].map((l) => (
                <button key={l} onClick={() => setLead(l)} aria-pressed={lead === l}
                  className={`px-3 h-7 rounded-md text-xs ${lead === l ? "bg-brand text-black font-medium" : "text-muted border border-border hover:text-text"}`}>
                  {l}-day lead
                </button>
              ))}
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={bt} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" interval={9} {...axisProps} />
                  <YAxis domain={["auto", "auto"]} {...axisProps} />
                  <Tooltip {...tooltipProps} formatter={(v: any, n: any) => [Array.isArray(v) ? `${v[0].toFixed(1)}–${v[1].toFixed(1)} °C` : `${Number(v).toFixed(2)} °C`, n]} />
                  <Area dataKey="band" name="10–90 % band" stroke="none" fill={CHART.brand} fillOpacity={0.2} isAnimationActive={false} />
                  <Line dataKey="median" name="Forecast (median)" stroke={CHART.brand} strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line dataKey="actual" name="Observed (ERA5)" stroke={CHART.text} strokeWidth={0} dot={{ r: 2.2, fill: CHART.text, stroke: "none" }} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="80 % interval coverage" subtitle={sub} badge={badge} note={coverageNote(r)}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={LEADS.map((l) => ({ lead: `${l}d`, ...Object.fromEntries(["persistence", "climatology", "lstm", "lgbm"].filter((k) => m[k]).map((k) => [k, m[k][l].cov80 ?? null])) }))} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="lead" {...axisProps} />
                  <YAxis domain={[0.4, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} {...axisProps} />
                  <Tooltip {...tooltipProps} cursor={{ fill: "rgba(255,255,255,0.05)" }} formatter={(v: any, n: any) => [`${Math.round(Number(v) * 100)}%`, names[n] ?? n]} />
                  <ReferenceLine y={0.8} stroke={CHART.text} strokeDasharray="4 4" label={{ value: "target 80 %", position: "insideTopRight", fill: CHART.axis, fontSize: 12 }} />
                  {Object.keys(SERIES).filter((k) => m[k]).map((k) => (
                    <Bar key={k} dataKey={k} fill={SERIES[k]} isAnimationActive={false} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card title="Versus baselines" subtitle={sub} badge={badge} caption="✓ better than the baseline, ✗ worse. Lower MAE and pinball loss are better.">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted text-left">
                  <th className="font-normal pb-2">Model</th><th className="font-normal pb-2">Lead</th>
                  <th className="font-normal pb-2">MAE vs pers.</th><th className="font-normal pb-2">MAE vs clim.</th>
                  <th className="font-normal pb-2">Pinball vs pers.</th><th className="font-normal pb-2">Pinball vs clim.</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(beats).flatMap(([model, perLead]) => LEADS.map((l) => (
                  <tr key={model + l} className="border-t border-border">
                    <td className="py-1.5">{names[model] ?? model}</td>
                    <td className="py-1.5 font-mono">{l}</td>
                    {["mae_vs_persistence", "mae_vs_climatology", "pinball_vs_persistence", "pinball_vs_climatology"].map((k) => (
                      <td key={k} className={`py-1.5 font-mono ${perLead[l][k] ? "text-text" : "text-[#f87171]"}`}>{perLead[l][k] ? "✓" : "✗"}</td>
                    ))}
                  </tr>
                )))}
              </tbody>
            </table>
          </Card>

          <Card title="With weather-model forecasts (2025 →)" subtitle={`Test-set results (${r.data.split.n_nwp_subset} days with archived NWP forecasts)`} badge={badge} note={nwpNote(r)}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nwpRows} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="lead" {...axisProps} />
                  <YAxis {...axisProps} label={{ value: "MAE (°C)", angle: -90, position: "insideLeft", offset: 16, fill: CHART.axis, fontSize: 12 }} />
                  <Tooltip {...tooltipProps} cursor={{ fill: "rgba(255,255,255,0.05)" }} formatter={(v: any, n: any) => [`${Number(v).toFixed(3)} °C`, names[n] ?? n]} />
                  <RLegend formatter={(v: string) => names[v] ?? v} wrapperStyle={{ fontSize: 12, color: CHART.axis }} />
                  <Bar dataKey="persistence" fill="#6b7280" isAnimationActive={false} />
                  <Bar dataKey="lgbm" fill={CHART.brand} isAnimationActive={false} />
                  <Bar dataKey="nwp_raw" fill="#60a5fa" isAnimationActive={false} />
                  <Bar dataKey="nwp_pp" fill="#a78bfa" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title={`Heat-day warnings (WBGT ≥ ${r.data.p95.wbgt.toFixed(2)} °C)`} subtitle={sub} badge={badge} note={eventsTrainedNote(r)}>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted text-left">
                  <th className="font-normal pb-2">Model · trigger</th><th className="font-normal pb-2">Lead</th>
                  <th className="font-normal pb-2 text-right">Hit rate</th><th className="font-normal pb-2 text-right">FAR</th><th className="font-normal pb-2 text-right">CSI</th>
                </tr>
              </thead>
              <tbody>
                {["persistence", "lgbm", "lstm"].filter((k) => A.events[k]).flatMap((k) => ["1", "3", "5"].map((l) => {
                  const e = A.events[k][l].p95_q90_trigger ?? A.events[k][l].p95;
                  return (
                    <tr key={k + l} className="border-t border-border">
                      <td className="py-1.5">{names[k] ?? k} · 90 %</td>
                      <td className="py-1.5 font-mono">{l}</td>
                      <td className="py-1.5 font-mono text-right">{fmt(e.hit_rate)}</td>
                      <td className="py-1.5 font-mono text-right">{fmt(e.far)}</td>
                      <td className="py-1.5 font-mono text-right">{fmt(e.csi)}</td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card title="What drives the 3-day forecast (global SHAP)" subtitle={sub} badge={badge} caption="Mean |SHAP| in °C on the test set, LightGBM median model, lead 3." note={shapTrainedNote(r)}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={shapG} margin={{ top: 4, right: 44, left: 4, bottom: 0 }}>
                  <CartesianGrid {...gridProps} horizontal={false} vertical />
                  <XAxis type="number" {...axisProps} />
                  <YAxis type="category" dataKey="feature" width={140} {...axisProps} />
                  <Tooltip {...tooltipProps} cursor={{ fill: "rgba(255,255,255,0.05)" }} formatter={(v: any) => [`${Number(v).toFixed(3)} °C`, "Mean |SHAP|"]} />
                  <Bar dataKey="mean_abs_shap" isAnimationActive={false}>
                    {shapG.map((g) => <Cell key={g.feature} fill={g.feature.startsWith("doy_") ? CHART.muted : CHART.brand} />)}
                    <LabelList dataKey="mean_abs_shap" position="right" formatter={(v: any) => Number(v).toFixed(2)} fill={CHART.axis} fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title={`Hottest test day · ${shortDate(local.target_date)} (issued ${shortDate(local.issue_date)})`} subtitle={sub} badge={badge} note={localShapNote(r)}>
            <ul className="flex flex-col gap-2">
              {local.contributions.slice(0, 8).map((c) => {
                const maxAbs = Math.max(...local.contributions.map((x) => Math.abs(x.shap)));
                return (
                  <li key={c.feature}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span>{c.feature} <span className="text-xs text-muted font-mono">= {c.value}</span></span>
                      <span className="font-mono tabular-nums text-xs" style={{ color: c.shap >= 0 ? "#f87171" : "#4ade80" }}>{c.shap >= 0 ? "+" : "−"}{Math.abs(c.shap).toFixed(2)} °C</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden mt-1">
                      <div className="h-full rounded-full" style={{ width: `${(Math.abs(c.shap) / maxAbs) * 100}%`, background: c.shap >= 0 ? "#dc2626" : "#22c55e" }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card title="Heat → mortality (Layer B)" subtitle={B.label} badge="Published coefficients" note={layerBNote(r)}>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={B.curve_by_wbgt.map((p) => ({ ...p, band: [p.lo, p.hi] as [number, number] }))} margin={{ top: 8, right: 8, left: -8, bottom: 14 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="wbgt" type="number" domain={["dataMin", "dataMax"]} {...axisProps} label={{ value: "Daily max WBGT (°C)", position: "insideBottom", offset: -10, fill: CHART.axis, fontSize: 12 }} />
                  <YAxis {...axisProps} domain={[0.9, "auto"]} label={{ value: "Relative risk", angle: -90, position: "insideLeft", offset: 18, fill: CHART.axis, fontSize: 12 }} />
                  <Tooltip {...tooltipProps} labelFormatter={(v) => `WBGT ${v} °C`} formatter={(v: any, n: any) => [Array.isArray(v) ? `${v[0].toFixed(2)}–${v[1].toFixed(2)}` : Number(v).toFixed(3), n]} />
                  <ReferenceLine y={1} stroke={CHART.axis} strokeDasharray="5 4" />
                  <Area dataKey="band" name="95 % CI" stroke="none" fill={CHART.brand} fillOpacity={0.2} isAnimationActive={false} />
                  <Line dataKey="rr" name="Relative risk" stroke={CHART.brand} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Vulnerability index (Layer C)" subtitle={`Census 2011 · ${C.level_achieved}`} badge="Census 2011, real" note={layerCNote(r)}>
            <ul className="flex flex-col gap-1.5">
              {units.map((u) => (
                <li key={u.unit} className="grid grid-cols-[1fr_120px_40px] items-center gap-2 text-xs">
                  <span className={`truncate ${u.subdistrict === C.pilot_anchor.subdistrict ? "text-text" : "text-muted"}`} title={u.unit}>{u.unit}</span>
                  <div className="h-2.5 rounded bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${u.hvi * 100}%`, background: u.subdistrict === C.pilot_anchor.subdistrict ? CHART.brand : CHART.muted }} />
                  </div>
                  <span className="font-mono tabular-nums text-right">{u.hvi.toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted mt-2">Highlighted: {C.pilot_anchor.subdistrict} sub-district (the pilot area). Index 0 = least, 1 = most vulnerable within New Delhi district.</p>
          </Card>

          <Card title={`Risk engine · ${shortDate(R.window.start)} – ${shortDate(R.window.end)}`} subtitle="Real forecast and coefficients, with labelled assumptions" badge="Real inputs · assumptions labelled" note={riskEngineNote(r)}>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={risk} margin={{ top: 8, right: 22, left: -14, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" interval={0} {...axisProps} tick={{ ...axisProps.tick, fontSize: 12 }} />
                  <YAxis {...axisProps} />
                  <Tooltip {...tooltipProps} formatter={(v: any, n: any) => [Array.isArray(v) ? `${v[0].toFixed(2)}–${v[1].toFixed(2)}` : Number(v).toFixed(3), n]} />
                  <Area dataKey="band" name="Forecast 10–90 %" stroke="none" fill={CHART.brand} fillOpacity={0.2} isAnimationActive={false} />
                  <Line dataKey="deaths_q50" name="Forecast (median)" stroke={CHART.brand} strokeWidth={2} isAnimationActive={false} />
                  <Line dataKey="deaths_observed" name="With observed heat" stroke={CHART.text} strokeDasharray="5 4" strokeWidth={1.5} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-muted mt-2 flex flex-col gap-1">
              <div>Excess resident deaths per day (attributable over the following 28 days).</div>
              <div><span className="text-text">Simulated:</span> {R.labels.simulated.join("; ")}.</div>
              <div><span className="text-text">Assumptions:</span> {R.labels.assumption.join("; ")}.</div>
            </div>
          </Card>
        </div>

        <Card title="What actually ran" subtitle="Reproduce with python ml/run_all.py; every stage is committed in ml/">
          <div className="flex items-stretch gap-2">
            {RAN.map((st, i) => (
              <div key={st.stage} className="contents">
                <div className="flex-1 rounded-xl border border-border bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="w-6 h-6 rounded-full bg-brand text-black text-xs font-bold font-mono flex items-center justify-center">{i + 1}</span>
                    <span className="text-sm font-semibold">{st.stage}</span>
                  </div>
                  <ul className="text-sm text-muted flex flex-col gap-1">{st.items.map((it) => <li key={it}>{it}</li>)}</ul>
                </div>
                {i < RAN.length - 1 && <ArrowRight className="w-5 h-5 text-muted self-center shrink-0" />}
              </div>
            ))}
          </div>
        </Card>

        <p className="text-xs text-muted">
          Not done: {Object.values(r.not_done).join(" ")} Reproduce everything with <code className="font-mono">python ml/run_all.py</code>.
        </p>
      </div>
    </div>
  );
}
