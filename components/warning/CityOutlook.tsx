"use client";

import { useMemo } from "react";
import { useRiskData } from "@/lib/data";
import { dayLabel, fmtCompact, fmtInt, TIER_COLORS } from "@/lib/risk";
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
  const { meta, wards } = useRiskData();
  const dayIndex = useStore((s) => s.dayIndex);
  const selectedWardId = useStore((s) => s.selectedWardId);
  const selectWard = useStore((s) => s.selectWard);

  const ranked = useMemo(
    () => (wards ? [...wards].sort((a, b) => b.days[dayIndex].risk_score - a.days[dayIndex].risk_score) : []),
    [wards, dayIndex]
  );
  if (!meta || !wards) return null;
  const d = meta.days[dayIndex];

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
    </aside>
  );
}
