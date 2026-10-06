"use client";

import { X, ArrowRight, Square } from "lucide-react";
import {
  Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useRiskData } from "@/lib/data";
import { dayLabel, fmtInt, TIER_COLORS } from "@/lib/risk";
import { useStore } from "@/lib/store";
import { axisProps, CHART, gridProps, tooltipProps } from "@/components/charts/theme";
import type { TierId } from "@/lib/types";

function Section({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-white/[0.02] p-4">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      {children}
      {caption && <p className="text-xs text-muted mt-2">{caption}</p>}
    </section>
  );
}

export default function WardDetail() {
  const { meta, wards, alerts } = useRiskData();
  const wardId = useStore((s) => s.selectedWardId);
  const dayIndex = useStore((s) => s.dayIndex);
  const selectWard = useStore((s) => s.selectWard);
  const goToAlert = useStore((s) => s.goToAlert);

  const ward = wards?.find((w) => w.ward_id === wardId);
  if (!meta || !alerts || !ward) return null;

  const wd = ward.days[dayIndex];
  const tier = wd.tier as TierId;
  const tierInfo = meta.tiers[tier];
  const color = TIER_COLORS[tier];
  const axisDay = (i: number) => (i === 0 ? "Today" : meta.days[i].weekday);
  const selectedTitle = axisDay(dayIndex);
  const hasAlert = alerts.pending.some((a) => a.ward_id === ward.ward_id && a.day_index === dayIndex);

  const series = ward.days.map((d, i) => ({
    day: axisDay(i),
    wbgt: d.wbgt,
    utci: d.utci_max,
    adm_mean: d.admissions.mean,
    adm_range: [d.admissions.lo, d.admissions.hi] as [number, number],
    deaths: d.deaths.mean,
  }));
  const shapMax = Math.max(...ward.why_flagged.map((s) => Math.abs(s.contribution)), 1);
  // Axis spans the ward's values and every tier cut-off, so the tier bands always show (cut-offs come from meta.tiers).
  const cuts = meta.tiers.flatMap((t) => (t.wbgt_min === null ? [] : [t.wbgt_min]));
  const vals = ward.days.map((d) => d.wbgt);
  const yMin = Math.floor(Math.min(...vals, ...cuts) - 1);
  const yMax = Math.ceil(Math.max(...vals, ...cuts) + 1);
  const bands = meta.tiers.map((t) => ({ y1: t.wbgt_min ?? yMin, y2: t.wbgt_max ?? yMax, color: t.color }));
  const risk = [
    { label: "Elderly", n: ward.groups_people.elderly, pct: ward.groups.elderly_pct },
    { label: "Outdoor workers", n: ward.groups_people.outdoor_workers, pct: ward.groups.outdoor_worker_pct },
    { label: "Informal settlements", n: ward.groups_people.slum_residents, pct: ward.groups.slum_pct },
  ];

  return (
    <aside className="card absolute right-4 top-4 bottom-4 w-[420px] flex flex-col overflow-hidden anim-slide-right" aria-label="Ward detail">
      <div data-scroll className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight">{ward.name}</h2>
          <div className="text-sm text-muted">{ward.name_hi}</div>
          <div className="flex items-center gap-2 mt-2.5">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold text-black" style={{ background: color }}>
              {tierInfo.imd.toUpperCase()} · {tierInfo.label}
            </span>
            <span className="text-xs text-muted">{dayLabel(meta.days[dayIndex])}</span>
          </div>
        </div>
        <div className="flex items-start gap-3 shrink-0">
          <div className="text-right">
            <div className="text-4xl font-mono tabular-nums font-medium leading-none" style={{ color }}>{wd.risk_score}</div>
            <div className="text-xs text-muted mt-1">risk score / 100</div>
          </div>
          <button onClick={() => selectWard(null)} aria-label="Close ward panel" className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <Section title="Heat-stress forecast" caption="Solid: WBGT (°C, left). Dashed: UTCI (°C, right). Bands: IMD tiers.">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 6, right: 4, left: -14, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              {bands.map((b, i) => (
                <ReferenceArea key={i} yAxisId="w" y1={b.y1} y2={b.y2} fill={b.color} fillOpacity={0.13} ifOverflow="hidden" />
              ))}
              <XAxis dataKey="day" interval={0} {...axisProps} />
              <YAxis yAxisId="w" domain={[yMin, yMax]} ticks={[yMin, ...cuts, yMax]} {...axisProps} />
              <YAxis yAxisId="u" orientation="right" domain={[36, 54]} {...axisProps} />
              <Tooltip {...tooltipProps} formatter={(v: any, n: any) => [`${Number(v).toFixed(1)} °C`, n]} />
              <ReferenceLine yAxisId="w" x={selectedTitle} stroke={CHART.brand} strokeWidth={2} />
              <Line yAxisId="u" dataKey="utci" name="UTCI max" stroke={CHART.axis} strokeDasharray="5 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line
                yAxisId="w" dataKey="wbgt" name="WBGT" stroke="#ededef" strokeWidth={2} isAnimationActive={false}
                dot={(p: any) => (
                  <circle key={p.index} cx={p.cx} cy={p.cy} r={4.5} fill={TIER_COLORS[ward.days[p.index].tier as TierId]} stroke="#07090c" strokeWidth={1.5} />
                )}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="Health impact" caption="TFT forecast · 80% interval">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 6, right: 4, left: -14, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="day" interval={0} {...axisProps} />
              <YAxis yAxisId="a" {...axisProps} />
              <YAxis yAxisId="d" orientation="right" domain={[0, (m: number) => Math.max(4, Math.ceil(m * 3))]} {...axisProps} />
              <Tooltip
                {...tooltipProps}
                formatter={(v: any, n: any) => [Array.isArray(v) ? `${v[0].toFixed(0)}–${v[1].toFixed(0)}` : Number(v).toFixed(1), n]}
              />
              <ReferenceLine yAxisId="a" x={selectedTitle} stroke={CHART.brand} strokeWidth={2} />
              <Bar yAxisId="d" dataKey="deaths" name="Deaths (mean)" fill={CHART.axis} fillOpacity={0.5} barSize={12} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Area yAxisId="a" dataKey="adm_range" name="Admissions (80% range)" stroke="none" fill={CHART.brand} fillOpacity={0.25} isAnimationActive={false} />
              <Line yAxisId="a" dataKey="adm_mean" name="Admissions (mean)" stroke={CHART.brand} strokeWidth={2} dot={{ r: 3, fill: CHART.brand, stroke: "none" }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 text-xs text-muted mt-2">
          <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-[-1px]" style={{ background: CHART.brand }} />Admissions</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-[-1px] bg-muted/60" />Deaths (right axis)</span>
        </div>
      </Section>

      <Section title="Why is this ward flagged?" caption="SHAP attribution · peak day">
        <ul className="flex flex-col gap-2.5">
          {ward.why_flagged.map((s) => {
            const positive = s.contribution >= 0;
            return (
              <li key={s.feature}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-text">{s.feature}</span>
                  <span className="text-xs text-muted font-mono tabular-nums">{s.value}</span>
                </div>
                <div className="flex items-center gap-2.5 mt-1">
                  <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(Math.abs(s.contribution) / shapMax) * 100}%`, background: positive ? "#dc2626" : "#22c55e" }} />
                  </div>
                  <span className="text-xs font-mono tabular-nums w-12 text-right" style={{ color: positive ? "#f87171" : "#4ade80" }}>
                    {positive ? "+" : "−"}{Math.abs(s.contribution).toFixed(1)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Who’s at risk">
        <div className="grid grid-cols-3 gap-2.5">
          {risk.map((r) => (
            <div key={r.label} className="rounded-lg border border-border bg-white/[0.03] p-3">
              <div className="text-xs text-muted leading-tight min-h-8">{r.label}</div>
              <div className="text-xl font-mono tabular-nums font-medium mt-1">{fmtInt(r.n)}</div>
              <div className="text-xs font-mono tabular-nums text-muted">{r.pct.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Actions for ${dayLabel(meta.days[dayIndex])}`}>
        <ul className="flex flex-col gap-2">
          {(meta.actions_by_tier[String(tier)] ?? meta.actions_by_tier[tierInfo.key] ?? []).map((a) => (
            <li key={a} className="flex items-start gap-2.5 text-sm">
              <Square className="w-4 h-4 mt-0.5 shrink-0 text-muted" />
              <span>{a}</span>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2.5 mt-3.5 text-sm">
          <div className="rounded-lg border border-border bg-white/[0.03] p-3">
            <div className="text-xs text-muted">Beds needed</div>
            <div className="font-mono tabular-nums text-lg">{wd.beds_needed}</div>
          </div>
          <div className="rounded-lg border border-border bg-white/[0.03] p-3">
            <div className="text-xs text-muted">Ambulances</div>
            <div className="font-mono tabular-nums text-lg">{wd.ambulances}</div>
          </div>
        </div>
        <div className="text-xs text-muted mt-3">
          Cooling centre: <span className="text-text">{ward.cooling_centre}</span>
        </div>
      </Section>

      </div>
      <div className="p-4 border-t border-border">
      <button
        onClick={() => goToAlert(ward.ward_id, dayIndex)}
        disabled={!hasAlert}
        className={`w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition ${
          hasAlert ? "bg-brand text-black hover:brightness-110" : "bg-white/5 text-muted cursor-not-allowed"
        }`}
      >
        {hasAlert ? (
          <>Review alert <ArrowRight className="w-4 h-4" /></>
        ) : (
          "No alert needed (below threshold)"
        )}
      </button>
      </div>
    </aside>
  );
}
