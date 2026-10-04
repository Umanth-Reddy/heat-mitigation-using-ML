"use client";

import { useMemo } from "react";
import { Bar, Cell, ComposedChart, CartesianGrid, ErrorBar, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useRiskData } from "@/lib/data";
import { dayLabel, fmtCompact, fmtInt, TIER_COLORS, worstTier } from "@/lib/risk";
import { axisProps, CHART, gridProps, tooltipProps } from "@/components/charts/theme";
import { useStore } from "@/lib/store";
import type { CityDay, RiskMeta, TierId, Ward } from "@/lib/types";

function headline(meta: RiskMeta, wards: Ward[], dayIndex: number): string {
  const d = meta.days[dayIndex];
  const red = d.wards_by_tier[3];
  const orange = d.wards_by_tier[2];
  const peak = meta.days.reduce<CityDay>((best, x) => (x.wbgt_max > best.wbgt_max ? x : best), meta.days[0]);
  const peakLabel = `${peak.weekday} ${peak.short}`;

  if (red + orange === 0) {
    if (peak.index > dayIndex) return `${dayLabel(d)} · Low risk. Heatwave building, peak expected ${peakLabel}`;
    if (peak.index < dayIndex) return `${dayLabel(d)} · Low risk. Heat stress easing after the ${peakLabel} peak`;
    return `${dayLabel(d)} · Low risk`;
  }
  const hottest = wards.reduce((a, b) => (b.days[dayIndex].wbgt > a.days[dayIndex].wbgt ? b : a), wards[0]);
  const n = red > 0 ? red : orange;
  const word = red > 0 ? "RED" : "ORANGE";
  return `${dayLabel(d)} · ${n} ward${n === 1 ? "" : "s"} at ${word}. Heat stress peaks in ${hottest.short_name}`;
}

export default function CityOutlook() {
  const { meta, wards, facilities } = useRiskData();
  const dayIndex = useStore((s) => s.dayIndex);
  const selectedWardId = useStore((s) => s.selectedWardId);
  const selectWard = useStore((s) => s.selectWard);
  const setDay = useStore((s) => s.setDay);

  const ranked = useMemo(
    () => (wards ? [...wards].sort((a, b) => b.days[dayIndex].risk_score - a.days[dayIndex].risk_score) : []),
    [wards, dayIndex]
  );
  if (!meta || !wards || !facilities) return null;
  const d = meta.days[dayIndex];

  // Hospitals over their heat-stroke bed capacity today, and where the overflow can go.
  const surge = facilities.hospitals.filter((h) => h.days[dayIndex].status === "surge");
  const spareOf = (h: (typeof facilities.hospitals)[number]) => h.heat_beds - h.days[dayIndex].occupied;
  const redirectTo = facilities.hospitals
    .filter((h) => h.days[dayIndex].status !== "surge" && spareOf(h) > 0)
    .sort((a, b) => spareOf(b) - spareOf(a))[0];

  const series = meta.days.map((x) => ({
    day: x.index === 0 ? "Today" : x.weekday,
    adm: x.admissions,
    err: [x.admissions - x.admissions_lo, x.admissions_hi - x.admissions] as [number, number],
    wbgt: x.wbgt_max,
    color: TIER_COLORS[worstTier(x.wards_by_tier)],
  }));
  const gridPct = (d.grid_peak_mw / meta.grid_capacity_mw) * 100;

  const kpis = [
    { label: "Wards at orange or red", value: String(d.wards_by_tier[2] + d.wards_by_tier[3]), sub: `of ${meta.city.n_wards} wards` },
    { label: "People in orange+ zones", value: fmtCompact(d.people_orange_plus), sub: `of ${fmtInt(meta.city.population)}` },
    { label: "Predicted heat admissions", value: d.admissions.toFixed(1), sub: `range ${d.admissions_lo.toFixed(0)}–${d.admissions_hi.toFixed(0)} / day` },
    { label: "Predicted excess deaths", value: d.deaths.toFixed(1), sub: `range ${d.deaths_lo.toFixed(1)}–${d.deaths_hi.toFixed(1)} / day` },
  ];

  return (
    <aside className="card absolute left-4 top-4 bottom-4 w-[360px] overflow-y-auto p-5 flex flex-col gap-5 anim-slide-left">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted mb-1.5">City outlook</div>
        <p className="text-base font-medium leading-snug text-text">{headline(meta, wards, dayIndex)}</p>
        <p className="text-xs text-muted mt-2">
          {meta.city.pilot_area} · {meta.city.n_wards} wards · {meta.city.n_zones} zones (~120 m)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-white/[0.03] p-3.5">
            <div className="text-xs text-muted leading-tight min-h-8">{k.label}</div>
            <div className="text-3xl font-mono tabular-nums font-medium mt-1">{k.value}</div>
            <div className="text-xs text-muted font-mono tabular-nums mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-muted mb-2.5">6-day outlook</div>
        <div className="h-44 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 6, right: 0, left: -18, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="day" interval={0} {...axisProps} />
              <YAxis yAxisId="a" {...axisProps} />
              <YAxis yAxisId="w" orientation="right" domain={[28, 40]} {...axisProps} />
              <Tooltip
                {...tooltipProps}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                formatter={(v: any, n: any) => [n === "WBGT max" ? `${Number(v).toFixed(1)} °C` : Array.isArray(v) ? `−${v[0].toFixed(1)} / +${v[1].toFixed(1)}` : Number(v).toFixed(1), n]}
              />
              <Bar yAxisId="a" dataKey="adm" name="Admissions" barSize={22} radius={[3, 3, 0, 0]} cursor="pointer" onClick={(_: any, i: number) => setDay(i)}>
                {series.map((x, i) => (
                  <Cell key={i} fill={x.color} fillOpacity={i === dayIndex ? 1 : 0.45} stroke={i === dayIndex ? CHART.text : "none"} strokeWidth={2} />
                ))}
                <ErrorBar dataKey="err" width={5} stroke={CHART.text} strokeWidth={1.5} />
              </Bar>
              <Line yAxisId="w" dataKey="wbgt" name="WBGT max" stroke={CHART.text} strokeWidth={2} dot={{ r: 3, fill: CHART.text, stroke: "none" }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted mt-1.5">Bars: predicted admissions with 80% range, coloured by the day&apos;s worst ward tier. Line: max WBGT (right axis). Click a bar to pick the day.</p>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-muted mb-2.5">Wards by risk · {dayLabel(d)}</div>
        <ul className="flex flex-col gap-1.5">
          {ranked.map((w, i) => {
            const wd = w.days[dayIndex];
            const color = TIER_COLORS[wd.tier as TierId];
            const selected = w.ward_id === selectedWardId;
            return (
              <li key={w.ward_id}>
                <button
                  onClick={() => selectWard(w.ward_id)}
                  aria-pressed={selected}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                    selected ? "border-brand bg-white/10" : "border-transparent bg-white/[0.03] hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono tabular-nums text-muted w-3">{i + 1}</span>
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-sm font-medium flex-1 truncate">{w.short_name}</span>
                    <span className="text-sm font-mono tabular-nums">{wd.wbgt.toFixed(1)}°</span>
                  </div>
                  <div className="flex items-center gap-2.5 mt-2 pl-[22px]">
                    <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${wd.risk_score}%`, background: color }} />
                    </div>
                    <span className="text-xs font-mono tabular-nums text-muted w-6 text-right">{wd.risk_score}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-muted mb-2.5">Resources needed · {dayLabel(d)}</div>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Beds", value: d.beds_needed },
            { label: "Ambulances", value: d.ambulances },
            { label: "Cooling centres", value: d.cooling_centres_active },
          ].map((r) => (
            <div key={r.label} className="rounded-xl border border-border bg-white/[0.03] p-3">
              <div className="text-xs text-muted">{r.label}</div>
              <div className="text-2xl font-mono tabular-nums font-medium mt-0.5">{r.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-border bg-white/[0.03] p-3">
          <div className="flex items-baseline justify-between text-xs mb-1.5">
            <span className="text-muted">Grid peak load</span>
            <span className="font-mono tabular-nums">
              {d.grid_peak_mw} / {meta.grid_capacity_mw} MW · {gridPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={Math.round(gridPct)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, gridPct)}%`, background: gridPct > 95 ? TIER_COLORS[3] : CHART.brand }} />
          </div>
          {gridPct > 95 && <div className="text-xs mt-1.5" style={{ color: "#f87171" }}>Above 95% of capacity: plan load shifting</div>}
        </div>
        {surge.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {surge.map((h) => (
              <li key={h.id} className="text-xs leading-snug text-text">
                <span style={{ color: "#f87171" }}>⚠</span> {h.name} over capacity:{" "}
                {redirectTo ? `redirect overflow to ${redirectTo.id}` : "no spare heat-stroke beds in the pilot area"}
              </li>
            ))}
          </ul>
          )}
      </div>
    </aside>
  );
}
