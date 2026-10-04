"use client";

import { useStore, type RiskLayer } from "@/lib/store";

const LAYERS: { id: RiskLayer; label: string }[] = [
  { id: "wbgt", label: "Heat stress (WBGT)" },
  { id: "vulnerability", label: "Vulnerability" },
];

export default function LayerControls() {
  const layer = useStore((s) => s.layer);
  const setLayer = useStore((s) => s.setLayer);
  return (
    <div className="card p-1 flex gap-1 anim-fade" role="group" aria-label="Map layer">
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
  );
}
