"use client";

import { useRiskData } from "@/lib/data";
import { VULN_GRADIENT_CSS, VULN_MAX, VULN_MIN } from "@/lib/risk";
import { useStore } from "@/lib/store";

function range(min: number | null, max: number | null): string {
  if (min === null) return `< ${max}`;
  if (max === null) return `≥ ${min}`;
  return `${min}–${max}`;
}

export default function Legend() {
  const { meta } = useRiskData();
  const layer = useStore((s) => s.layer);
  if (!meta) return null;

  return (
    <div className="card p-4 w-80 anim-fade">
      {layer === "wbgt" ? (
        <>
          <div className="text-sm font-medium mb-2.5">Heat stress · WBGT (°C)</div>
          <ul className="space-y-1.5">
            {meta.tiers.map((t) => (
              <li key={t.id} className="flex items-center gap-2.5 text-sm">
                <span className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ background: t.color }} />
                <span className="font-mono tabular-nums text-text w-24 whitespace-nowrap">{range(t.wbgt_min, t.wbgt_max)}</span>
                <span className="text-muted">
                  {t.imd} · {t.label}
                </span>
              </li>
            ))}
          </ul>
          <div className="text-xs text-muted mt-3">Thresholds: local 95th percentile</div>
        </>
      ) : (
        <>
          <div className="text-sm font-medium mb-2.5">Vulnerability index</div>
          <div className="h-3 rounded-full" style={{ background: VULN_GRADIENT_CSS }} />
          <div className="flex justify-between text-xs font-mono tabular-nums text-muted mt-1.5">
            <span>{VULN_MIN} Low</span>
            <span>High {VULN_MAX}</span>
          </div>
          <div className="text-xs text-muted mt-3">Elderly, outdoor workers, informal settlements, low canopy</div>
        </>
      )}
    </div>
  );
}
