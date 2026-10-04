"use client";

import dynamic from "next/dynamic";
import ForecastTimeline from "./ForecastTimeline";
import LayerControls from "./LayerControls";
import Legend from "./Legend";
import { useStore } from "@/lib/store";

const RiskMap = dynamic(() => import("./RiskMap"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center text-muted text-sm font-mono">Loading map…</div>,
});

// Space reserved for the side panels added in Phase 3 (panel width + 16px gutter each side).
const LEFT_INSET = 392;
const RIGHT_INSET_WARD = 452;

export default function EarlyWarning() {
  const wardOpen = useStore((s) => s.selectedWardId !== null);
  const right = wardOpen ? RIGHT_INSET_WARD : 16;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <RiskMap />
      <div className="absolute top-4 flex flex-col items-end gap-3 transition-[right] duration-200 ease-out" style={{ right }}>
        <LayerControls />
        <Legend />
      </div>
      <div
        className="absolute bottom-4 flex justify-center transition-[right] duration-200 ease-out"
        style={{ left: LEFT_INSET, right: wardOpen ? RIGHT_INSET_WARD : 0 }}
      >
        <ForecastTimeline />
      </div>
    </div>
  );
}
