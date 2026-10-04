"use client";

import { ArrowRight } from "lucide-react";
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, ErrorBar, LabelList, Line, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { useRiskData } from "@/lib/data";
import { axisProps, CHART, gridProps, tooltipProps } from "@/components/charts/theme";
import type { ModelsData } from "@/lib/types";

function Panel({ title, caption, children, className = "" }: { title: string; caption?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-5 flex flex-col ${className}`}>
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      <div className="flex-1 min-h-0">{children}</div>
      {caption && <p className="text-xs text-muted mt-3">{caption}</p>}
    </section>
  );
}

function shortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Neutral sequential palette for years (older = darker). Deliberately not the IMD tier colours. */
function yearColors(years: number[]): Record<number, string> {
  const a = [75, 93, 134];
  const b = [219, 228, 255];
  return Object.fromEntries(
    years.map((y, i) => {
      const t = years.length > 1 ? i / (years.length - 1) : 1;
      return [y, `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(",")})`];
    })
  );
}

function Baselines({ rows }: { rows: ModelsData["baseline_comparison"] }) {
  const metrics = [
    { label: "Hit rate", get: (r: ModelsData["baseline_comparison"][number]) => r.hit_rate * 100, max: 100, fmt: (v: number) => `${Math.round(v)}%` },
    { label: "False alarm ratio (lower is better)", get: (r: ModelsData["baseline_comparison"][number]) => r.false_alarm_ratio * 100, max: 100, fmt: (v: number) => `${Math.round(v)}%` },
    { label: "Lead time", get: (r: ModelsData["baseline_comparison"][number]) => r.lead_days, max: 5, fmt: (v: number) => `${v.toFixed(1)} d` },
  ];
  return (
    <div className="flex flex-col gap-5">
      {metrics.map((m) => (
        <div key={m.label}>
          <div className="text-xs text-muted mb-2">{m.label}</div>
          <div className="flex flex-col gap-1.5">
            {rows.map((r) => {
              const ours = r.system.startsWith("UshnaRaksha");
              const v = m.get(r);
              return (
                <div key={r.system} className="grid grid-cols-[150px_1fr_48px] items-center gap-3">
                  <span className={`text-xs truncate ${ours ? "text-text font-medium" : "text-muted"}`}>{r.system.split(" (")[0]}</span>
                  <div className="h-3.5 rounded bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${(v / m.max) * 100}%`, background: ours ? CHART.brand : CHART.muted }} />
                  </div>
                  <span className={`text-xs font-mono tabular-nums text-right ${ours ? "text-text" : "text-muted"}`}>{m.fmt(v)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ModelInsights() {
  const { models } = useRiskData();
  if (!models) return null;

  const ours = models.baseline_comparison.find((b) => b.system.startsWith("UshnaRaksha"))!;
  const tempOnly = models.baseline_comparison[0];
  const kpis = [
    { label: "Forecast lead time", value: `${ours.lead_days.toFixed(1)} days`, sub: `vs ${tempOnly.lead_days.toFixed(1)} days (temperature-only)` },
    { label: "Hit rate", value: `${Math.round(ours.hit_rate * 100)}%`, sub: `vs ${Math.round(tempOnly.hit_rate * 100)}% (temperature-only)` },
    { label: "False alarm ratio", value: `${Math.round(ours.false_alarm_ratio * 100)}%`, sub: `vs ${Math.round(tempOnly.false_alarm_ratio * 100)}% (temperature-only)` },
    { label: "Vulnerability model AUC", value: models.vulnerability_model.metrics.auc.toFixed(2), sub: models.vulnerability_model.name },
  ];

  const dlnm = models.dlnm.exposure_response.map((p) => ({ wbgt: p.wbgt, rr: p.rr, band: [p.lo, p.hi] as [number, number] }));
  const lag = models.dlnm.lag_response.map((p) => ({ lag: String(p.lag), rr: p.rr, err: [p.rr - p.lo, p.hi - p.rr] as [number, number] }));
  const skill = models.forecast_model.skill_by_lead.map((p) => ({ lead: `${p.lead_days}d`, mae: p.mae, r2: p.r2 }));
  const years = [...new Set(models.historical.map((h) => h.year))].sort();
  const yc = yearColors(years);
  const backtest = models.forecast_model.backtest.map((p) => ({ ...p, band: [p.lo, p.hi] as [number, number], label: shortDate(p.date) }));

  return (
    <div className="absolute inset-0 overflow-y-auto p-6 anim-fade">
      <div className="max-w-[1872px] mx-auto flex flex-col gap-4">
        <p className="text-sm text-muted">Illustrative results on simulated data — pipeline and evaluation design for the pilot.</p>

        <div className="grid grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="card p-5">
              <div className="text-xs text-muted">{k.label}</div>
              <div className="text-4xl font-mono tabular-nums font-medium mt-1.5">{k.value}</div>
              <div className="text-xs text-muted mt-1">{k.sub}</div>
            </div>
          ))}
        </div>

        <Panel title="Pipeline">
          <div className="flex items-stretch gap-2">
            {models.pipeline.map((s, i) => (
              <div key={s.stage} className="contents">
                <div className="flex-1 rounded-xl border border-border bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="w-6 h-6 rounded-full bg-brand text-black text-xs font-bold font-mono flex items-center justify-center">{i + 1}</span>
                    <span className="text-sm font-semibold">{s.stage}</span>
                  </div>
                  <ul className="text-sm text-muted flex flex-col gap-1">
                    {s.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </div>
                {i < models.pipeline.length - 1 && <ArrowRight className="w-5 h-5 text-muted self-center shrink-0" />}
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid grid-cols-3 gap-4">
          <Panel
            title="DLNM · exposure–response"
            caption={`RR at P99 = ${models.dlnm.summary.rr_at_p99} · attributable fraction ${models.dlnm.summary.attributable_fraction_pct}% · ${models.dlnm.summary.calibration_period}`}
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dlnm} margin={{ top: 22, right: 8, left: -8, bottom: 14 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="wbgt" type="number" domain={["dataMin", "dataMax"]} tickCount={7} {...axisProps} label={{ value: "WBGT (°C)", position: "insideBottom", offset: -10, fill: CHART.axis, fontSize: 12 }} />
                  <YAxis domain={[0.6, "auto"]} {...axisProps} label={{ value: "Relative risk", angle: -90, position: "insideLeft", offset: 18, fill: CHART.axis, fontSize: 12 }} />
                  <Tooltip {...tooltipProps} labelFormatter={(v) => `WBGT ${v} °C`} formatter={(v: any, n: any) => [Array.isArray(v) ? `${v[0].toFixed(2)}–${v[1].toFixed(2)}` : Number(v).toFixed(2), n]} />
                  <ReferenceLine y={1} stroke={CHART.axis} strokeDasharray="5 4" />
                  <ReferenceLine x={models.dlnm.mmt} stroke={CHART.brand} strokeDasharray="3 3" label={{ value: "Minimum-mortality WBGT", position: "top", fill: CHART.brand, fontSize: 12 }} />
                  <Area dataKey="band" name="95% CI" stroke="none" fill={CHART.brand} fillOpacity={0.22} />
                  <Line dataKey="rr" name="Relative risk" stroke={CHART.brand} strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title={models.forecast_model.backtest_label} caption={`Actual daily admissions vs TFT forecast · 80% interval coverage ${Math.round(models.forecast_model.coverage_80pct_interval * 100)}%`}>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={backtest} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" interval={9} {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip {...tooltipProps} formatter={(v: any, n: any) => [Array.isArray(v) ? `${v[0].toFixed(0)}–${v[1].toFixed(0)}` : Number(v).toFixed(1), n]} />
                  <Area dataKey="band" name="80% interval" stroke="none" fill={CHART.brand} fillOpacity={0.2} />
                  <Line dataKey="predicted" name="Predicted" stroke={CHART.brand} strokeWidth={2} dot={false} />
                  <Line dataKey="actual" name="Actual" stroke={CHART.text} strokeWidth={0} dot={{ r: 2.2, fill: CHART.text, stroke: "none" }} activeDot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 text-xs text-muted mt-2">
              <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-[-1px]" style={{ background: CHART.brand }} />Predicted</span>
              <span><span className="inline-block w-2 h-2 rounded-full mr-1.5 align-[-1px]" style={{ background: CHART.text }} />Actual</span>
            </div>
          </Panel>

          <Panel title="Versus baselines" caption="Hit rate, false-alarm ratio and lead time against current practice.">
            <Baselines rows={models.baseline_comparison} />
          </Panel>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Panel title="DLNM · lag–response" caption="Most risk arrives within 0–2 days, which is why a 3–5 day lead matters.">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lag} margin={{ top: 10, right: 8, left: -8, bottom: 14 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="lag" {...axisProps} label={{ value: "Lag (days after exposure)", position: "insideBottom", offset: -10, fill: CHART.axis, fontSize: 12 }} />
                  <YAxis domain={[1, 1.5]} {...axisProps} label={{ value: "Relative risk", angle: -90, position: "insideLeft", offset: 18, fill: CHART.axis, fontSize: 12 }} />
                  <Tooltip {...tooltipProps} cursor={{ fill: "rgba(255,255,255,0.05)" }} labelFormatter={(v) => `Lag ${v} d`} formatter={(v: any, n: any) => [Array.isArray(v) ? `−${v[0].toFixed(2)} / +${v[1].toFixed(2)}` : Number(v).toFixed(2), n === "rr" ? "Relative risk" : n]} />
                  <ReferenceLine y={1} stroke={CHART.axis} strokeDasharray="5 4" />
                  <Bar dataKey="rr" name="Relative risk" fill={CHART.brand} radius={[3, 3, 0, 0]} barSize={34}>
                    <ErrorBar dataKey="err" width={6} stroke={CHART.text} strokeWidth={1.5} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Forecast skill by lead day" caption="MAE (bars, admissions/day) grows and R² (line) falls as the lead time lengthens.">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={skill} margin={{ top: 10, right: 0, left: -8, bottom: 14 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="lead" {...axisProps} label={{ value: "Lead time", position: "insideBottom", offset: -10, fill: CHART.axis, fontSize: 12 }} />
                  <YAxis yAxisId="m" {...axisProps} label={{ value: "MAE", angle: -90, position: "insideLeft", offset: 18, fill: CHART.axis, fontSize: 12 }} />
                  <YAxis yAxisId="r" orientation="right" domain={[0.5, 1]} {...axisProps} label={{ value: "R²", angle: 90, position: "insideRight", offset: 8, fill: CHART.axis, fontSize: 12 }} />
                  <Tooltip {...tooltipProps} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                  <Bar yAxisId="m" dataKey="mae" name="MAE" fill={CHART.brand} fillOpacity={0.85} radius={[3, 3, 0, 0]} barSize={34} />
                  <Line yAxisId="r" dataKey="r2" name="R²" stroke={CHART.text} strokeWidth={2} dot={{ r: 3.5, fill: CHART.text, stroke: "none" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <Panel title="Heat &amp; mortality history" caption="Each dot is one day; darker = earlier year. Excess deaths are deaths above the seasonal baseline.">
          <div className="grid grid-cols-[2fr_1fr] gap-6">
            <div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 8, left: -6, bottom: 16 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis type="number" dataKey="wbgt" name="WBGT" unit=" °C" domain={[24, 38]} {...axisProps} label={{ value: "Daily WBGT (°C)", position: "insideBottom", offset: -10, fill: CHART.axis, fontSize: 12 }} />
                    <YAxis type="number" dataKey="deaths" name="Deaths" {...axisProps} label={{ value: "Daily deaths", angle: -90, position: "insideLeft", offset: 16, fill: CHART.axis, fontSize: 12 }} />
                    <ZAxis range={[34, 34]} />
                    <Tooltip {...tooltipProps} cursor={{ strokeDasharray: "3 3", stroke: CHART.grid }} />
                    {years.map((y) => (
                      <Scatter key={y} name={String(y)} data={models.historical.filter((h) => h.year === y)} fill={yc[y]} fillOpacity={0.85} isAnimationActive={false} />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mt-1">
                {years.map((y) => (
                  <span key={y} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: yc[y] }} />
                    <span className="font-mono tabular-nums">{y}</span>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted mb-2">Excess deaths per heat season</div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={models.annual} margin={{ top: 18, right: 4, left: -14, bottom: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="year" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip {...tooltipProps} cursor={{ fill: "rgba(255,255,255,0.05)" }} formatter={(v: any, n: any) => [v, n === "excess_deaths" ? "Excess deaths" : n]} />
                    <Bar dataKey="excess_deaths" name="Excess deaths" radius={[3, 3, 0, 0]}>
                      {models.annual.map((a) => (
                        <Cell key={a.year} fill={yc[a.year] ?? CHART.muted} />
                      ))}
                      <LabelList dataKey="excess_deaths" position="top" fill={CHART.axis} fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
