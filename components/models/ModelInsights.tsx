"use client";

import { useRiskData } from "@/lib/data";

/** Phase 1 placeholder: replaced in Phase 5. */
export default function ModelInsights() {
  const { models } = useRiskData();
  if (!models) return null;
  return (
    <div className="p-8 anim-fade">
      <h2 className="text-xl font-semibold mb-1">Model Insights</h2>
      <p className="text-sm text-muted font-mono tabular-nums">Vulnerability AUC {models.vulnerability_model.metrics.auc}</p>
    </div>
  );
}
