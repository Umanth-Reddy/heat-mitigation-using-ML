"use client";

import { useRiskData } from "@/lib/data";
import { useStore } from "@/lib/store";

/** Phase 1 placeholder: replaced by the map and panels in Phase 2/3. */
export default function EarlyWarning() {
  const { meta } = useRiskData();
  const dayIndex = useStore((s) => s.dayIndex);
  if (!meta) return null;
  const d = meta.days[dayIndex];
  return (
    <div className="p-8 anim-fade">
      <h2 className="text-xl font-semibold mb-1">Early Warning</h2>
      <p className="text-sm text-muted mb-4">Placeholder · {meta.city.pilot_area}</p>
      <div className="card p-5 inline-block">
        <div className="text-sm text-muted">Day {d.index}</div>
        <div className="text-3xl font-mono tabular-nums">{d.label}</div>
        <div className="text-sm mt-2 font-mono tabular-nums">
          Wards G/Y/O/R: {d.wards_by_tier.join(" / ")} · admissions {d.admissions.toFixed(1)}
        </div>
      </div>
    </div>
  );
}
