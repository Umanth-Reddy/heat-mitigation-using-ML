"use client";

import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Bar, BarChart, Legend as RLegend, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useRiskData } from "@/lib/data";
import { axisProps, CHART, gridProps, tooltipProps } from "@/components/charts/theme";
import type { ImpactData, RiskMeta } from "@/lib/types";

const GREY = "#6b7280";
const MUTED_AMBER = "#a8691f";
const SCENARIO_COLORS: Record<string, string> = { none: GREY, conventional: MUTED_AMBER, ushnaraksha: CHART.brand };
const TIER_NAMES = ["Green", "Yellow", "Orange", "Red"];

function Card({ title, caption, children, className = "" }: { title: string; caption?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-5 flex flex-col ${className}`}>
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      <div className="flex-1 min-h-0">{children}</div>
      {caption && <p className="text-xs text-muted mt-3">{caption}</p>}
    </section>
  );
}

function windowLabel(window: string): string {
  const [a, b] = window.split(" to ").map((d) => new Date(d + "T00:00:00"));
  const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric" });
  const mon = (d: Date) => d.toLocaleDateString("en-GB", { month: "short" });
  return `${day(a)} ${a.getMonth() === b.getMonth() ? "" : mon(a) + " "}– ${day(b)} ${mon(b)} ${b.getFullYear()}`.replace("  ", " ");
}

function LeadCurve({ impact }: { impact: ImpactData }) {
  const [lead, setLead] = useState(3);
  const point = impact.lead_curve.find((p) => p.lead_days === lead)!;
  const m1 = impact.lead_curve.find((p) => p.lead_days === 1)!;
  const m3 = impact.lead_curve.find((p) => p.lead_days === 3)!;
  const label = lead === 1 ? "1 day's" : `${lead} days'`;

  return (
    <Card
      title="Earlier warning saves more lives"
      caption="The curve gives every day the full lead time; the 6-day scenario above caps lead at days since issue, so its totals (3.8 and 6.9) are a little lower."
    >
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={impact.lead_curve} margin={{ top: 26, right: 24, left: -8, bottom: 16 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="lead_days" type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} {...axisProps} label={{ value: "Warning lead time (days)", position: "insideBottom", offset: -10, fill: CHART.axis, fontSize: 12 }} />
            <YAxis domain={[0, 10]} {...axisProps} label={{ value: "Deaths averted", angle: -90, position: "insideLeft", offset: 16, fill: CHART.axis, fontSize: 12 }} />
            <Tooltip {...tooltipProps} labelFormatter={(v) => `${v} day lead`} formatter={(v: any, n: any) => [Number(v).toFixed(1), n]} />
            <Area dataKey="deaths_averted" name="Deaths averted" type="monotone" stroke="none" fill={CHART.brand} fillOpacity={0.2} isAnimationActive={false} />
            <Line dataKey="deaths_averted" name="Deaths averted" type="monotone" stroke={CHART.brand} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <ReferenceDot x={1} y={m1.deaths_averted} r={6} fill={MUTED_AMBER} stroke="#07090c" strokeWidth={2} label={{ value: "Conventional", position: "top", fill: CHART.axis, fontSize: 12 }} />
            <ReferenceDot x={3} y={m3.deaths_averted} r={6} fill={CHART.brand} stroke="#07090c" strokeWidth={2} label={{ value: "UshnaRaksha", position: "top", fill: CHART.text, fontSize: 12 }} />
            <ReferenceDot x={lead} y={point.deaths_averted} r={9} fill="none" stroke={CHART.text} strokeWidth={2.5} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-1">
        <span className="text-xs text-muted w-16">Lead time</span>
        <input
          type="range" min={0} max={5} step={1} value={lead}
          onChange={(e) => setLead(Number(e.target.value))}
          aria-label="Warning lead time in days"
          className="flex-1 accent-[#ff7a1a]"
        />
        <span className="font-mono tabular-nums text-sm w-12 text-right">{lead} d</span>
      </div>
      <p className="text-sm mt-3">
        With {label} notice: <span className="font-mono tabular-nums font-semibold">{point.deaths_averted.toFixed(1)}</span> deaths averted{" "}
        <span className="font-mono tabular-nums text-muted">({point.pct_reduction.toFixed(1)}%)</span>
      </p>
    </Card>
  );
}

function ScenarioBars({ impact }: { impact: ImpactData }) {
  const max = Math.max(...impact.scenarios.map((s) => s.deaths));
  return (
    <Card title="Deaths by scenario" caption={`Predicted heat-related deaths over ${windowLabel(impact.window)}.`} className="h-full">
      <div className="flex flex-col gap-4 justify-center h-full">
        {impact.scenarios.map((s) => (
          <div key={s.id}>
            <div className="flex items-baseline justify-between text-sm mb-1.5">
              <span className={s.id === "ushnaraksha" ? "font-semibold" : "text-muted"}>{s.label}</span>
              <span className="font-mono tabular-nums">
                {s.deaths.toFixed(1)} deaths
                {s.id !== "none" && <span className="text-muted"> · {s.deaths_averted.toFixed(1)} averted</span>}
              </span>
            </div>
            <div className="h-5 rounded bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded" style={{ width: `${(s.deaths / max) * 100}%`, background: SCENARIO_COLORS[s.id] }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PerDay({ impact, meta }: { impact: ImpactData; meta: RiskMeta }) {
  const none = impact.scenarios.find((s) => s.id === "none")!;
  const ush = impact.scenarios.find((s) => s.id === "ushnaraksha")!;
  const data = none.per_day.map((d, i) => ({
    day: i === 0 ? "Today" : meta.days[i].weekday,
    none: d.deaths,
    ush: ush.per_day[i].deaths,
  }));
  return (
    <Card title="Deaths per day" caption="Predicted deaths without action vs with UshnaRaksha, by forecast day.">
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -14, bottom: 0 }} barGap={3}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="day" interval={0} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipProps} cursor={{ fill: "rgba(255,255,255,0.05)" }} formatter={(v: any, n: any) => [Number(v).toFixed(1), n]} />
            <RLegend iconType="square" wrapperStyle={{ fontSize: 12, color: CHART.axis }} />
            <Bar dataKey="none" name="Without action" fill={GREY} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="ush" name="With UshnaRaksha" fill={CHART.brand} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function WardTable({ impact }: { impact: ImpactData }) {
  const rows = [...impact.wards].sort((a, b) => b.deaths_averted - a.deaths_averted);
  const max = Math.max(...rows.map((r) => r.deaths_averted));
  return (
    <Card title="Deaths averted by ward" caption="With UshnaRaksha's 3-day lead, over the 6-day window.">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted text-left">
            <th className="font-normal pb-2">Ward</th>
            <th className="font-normal pb-2 text-right">No action</th>
            <th className="font-normal pb-2 text-right">With</th>
            <th className="font-normal pb-2 text-right w-[140px]">Averted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.ward_id} className="border-t border-border">
              <td className="py-2.5">{r.short_name}</td>
              <td className="py-2.5 text-right font-mono tabular-nums text-muted">{r.deaths_no_action.toFixed(1)}</td>
              <td className="py-2.5 text-right font-mono tabular-nums">{r.deaths_with_ushnaraksha.toFixed(1)}</td>
              <td className="py-2.5 pl-3">
                <div className="flex items-center gap-2.5 justify-end">
                  <div className="h-2 w-16 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(r.deaths_averted / max) * 100}%`, background: CHART.brand }} />
                  </div>
                  <span className="font-mono tabular-nums font-semibold w-8 text-right">{r.deaths_averted.toFixed(1)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function Assumptions({ impact }: { impact: ImpactData }) {
  return (
    <Card title="Assumptions" className="relative">
      <span className="absolute top-4 right-5 text-xs px-2.5 py-1 rounded-full border border-border text-muted">Scenario assumptions: illustrative</span>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs text-muted mb-2">Actions and their assumed maximum reduction in deaths</div>
          <ul className="flex flex-col gap-2">
            {impact.actions.map((a) => (
              <li key={a.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span>
                  {a.label} <span className="text-xs text-muted">from {TIER_NAMES[a.min_tier]}</span>
                </span>
                <span className="font-mono tabular-nums">−{a.max_reduction_pct}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs text-muted mb-2">Share of that benefit realised, by warning lead time</div>
          <div className="flex items-end gap-2 h-24">
            {impact.lead_realisation.map((l) => (
              <div key={l.lead_days} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                <span className="text-xs font-mono tabular-nums">{Math.round(l.fraction * 100)}%</span>
                <div className="w-full rounded-t" style={{ height: `${l.fraction * 64}px`, background: CHART.brand, opacity: 0.35 + l.fraction * 0.65 }} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-1">
            {impact.lead_realisation.map((l) => (
              <span key={l.lead_days} className="flex-1 text-center text-xs font-mono tabular-nums text-muted">{l.lead_days} d</span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Benchmark({ impact }: { impact: ImpactData }) {
  const a = impact.annualised;
  return (
    <Card title="Benchmark">
      <p className="text-lg leading-snug">
        {impact.benchmark.name}: <span className="font-semibold">~{impact.benchmark.deaths_avoided_per_year.toLocaleString("en-IN")} deaths avoided per year</span>
      </p>
      <a href={impact.benchmark.source} target="_blank" rel="noreferrer" className="text-sm text-brand underline underline-offset-2 hover:brightness-125">
        Source: ScienceDirect (Ahmedabad heat preparedness study)
      </a>
      <div className="mt-4 rounded-xl border border-border bg-white/[0.03] p-4">
        <div className="text-xs text-muted mb-1">Annualised pilot estimate · {a.heatwave_episodes_per_year} heatwave episodes a year</div>
        <div className="flex gap-8">
          <div><span className="text-3xl font-mono tabular-nums font-medium">~{Math.round(a.deaths_averted_per_year_pilot)}</span> <span className="text-sm text-muted">deaths averted</span></div>
          <div><span className="text-3xl font-mono tabular-nums font-medium">~{a.admissions_averted_per_year_pilot}</span> <span className="text-sm text-muted">admissions averted</span></div>
        </div>
      </div>
    </Card>
  );
}

export default function ImpactView() {
  const { impact, meta } = useRiskData();
  if (!impact || !meta) return null;

  const base = impact.scenarios.find((s) => s.id === "none")!;
  const ush = impact.scenarios.find((s) => s.id === "ushnaraksha")!;
  const pct = Math.round((ush.deaths_averted / base.deaths) * 100);

  return (
    <div className="absolute inset-0 overflow-y-auto p-6 anim-fade">
      <div className="max-w-[1872px] mx-auto flex flex-col gap-4">
        <p className="text-sm text-muted">Scenario estimates on simulated data.</p>

        <div className="grid grid-cols-3 gap-4">
          <section className="card p-6 flex flex-col justify-center">
            <div className="text-xs uppercase tracking-wider text-muted mb-1">{windowLabel(impact.window)}</div>
            <div className="flex items-baseline gap-3">
              <span className="text-8xl font-sans tabular-nums font-semibold leading-none" style={{ color: CHART.brand }}>{ush.deaths_averted.toFixed(1)}</span>
              <span className="text-3xl font-semibold">lives saved</span>
            </div>
            <p className="text-base text-muted mt-3">
              and {Math.round(ush.admissions_averted)} fewer heat admissions this heatwave · −{pct}% vs no warning
            </p>
          </section>
          <div className="col-span-2"><ScenarioBars impact={impact} /></div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <LeadCurve impact={impact} />
          <PerDay impact={impact} meta={meta} />
          <WardTable impact={impact} />
        </div>

        <div className="grid grid-cols-[3fr_2fr] gap-4">
          <Assumptions impact={impact} />
          <Benchmark impact={impact} />
        </div>
      </div>
    </div>
  );
}
