"use client";

import { useStore, type RiskLayer } from "@/lib/store";

const LAYERS: { id: RiskLayer; label: string }[] = [
  { id: "wbgt", label: "Heat stress (WBGT)" },
  { id: "utci", label: "UTCI" },
  { id: "vulnerability", label: "Vulnerability" },
  { id: "lst", label: "Surface temp (LST)" },
];

export default function LayerControls() {
  const layer = useStore((s) => s.layer);
  const setLayer = useStore((s) => s.setLayer);
  const is3D = useStore((s) => s.is3D);
  const setIs3D = useStore((s) => s.setIs3D);
  const showFacilities = useStore((s) => s.showFacilities);
  const setShowFacilities = useStore((s) => s.setShowFacilities);
  return (
    <div className="flex gap-2 anim-fade">
      <div className="card p-1 flex gap-1" role="group" aria-label="Map layer">
        {LAYERS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLayer(l.id)}
            aria-pressed={layer === l.id}
            className={`px-3.5 h-8 rounded-lg text-sm transition-colors ${
              layer === l.id ? "bg-brand text-black font-medium" : "text-muted hover:text-text hover:bg-white/5"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <button
        onClick={() => setShowFacilities(!showFacilities)}
        aria-pressed={showFacilities}
        className={`card px-3.5 h-10 text-sm transition-colors ${showFacilities ? "text-text border-brand" : "text-muted hover:text-text"}`}
      >
        Facilities {showFacilities ? "on" : "off"}
      </button>
      <div className="card p-1 flex gap-1" role="group" aria-label="Map dimensions" title="Shortcut: D">
        {([false, true] as const).map((v) => (
          <button
            key={String(v)}
            onClick={() => setIs3D(v)}
            aria-pressed={is3D === v}
            className={`px-3 h-8 rounded-lg text-sm transition-colors ${
              is3D === v ? "bg-white/15 text-text font-medium" : "text-muted hover:text-text hover:bg-white/5"
            }`}
          >
            {v ? "3D" : "2D"}
          </button>
        ))}
      </div>
    </div>
  );
}
