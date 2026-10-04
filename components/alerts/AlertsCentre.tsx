"use client";

import { useRiskData } from "@/lib/data";

/** Phase 1 placeholder: replaced in Phase 4. */
export default function AlertsCentre() {
  const { alerts } = useRiskData();
  if (!alerts) return null;
  return (
    <div className="p-8 anim-fade">
      <h2 className="text-xl font-semibold mb-1">Alerts Centre</h2>
      <p className="text-sm text-muted font-mono tabular-nums">{alerts.pending.length} alerts loaded</p>
    </div>
  );
}
