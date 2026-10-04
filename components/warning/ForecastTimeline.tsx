"use client";

import { Pause, Play } from "lucide-react";
import { useRiskData } from "@/lib/data";
import { formatIssued } from "@/lib/format";
import { dayTitle, TIER_COLORS, worstTier } from "@/lib/risk";
import { useStore } from "@/lib/store";

export default function ForecastTimeline() {
  const { meta } = useRiskData();
  const dayIndex = useStore((s) => s.dayIndex);
  const setDay = useStore((s) => s.setDay);
  const playing = useStore((s) => s.playing);
  const togglePlay = useStore((s) => s.togglePlay);
  if (!meta) return null;

  return (
    <div className="flex flex-col items-center gap-2 anim-slide-up">
      <div className="card p-2.5 flex items-stretch gap-2">
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause forecast" : "Play forecast"}
          className="w-12 rounded-lg bg-brand text-black flex items-center justify-center hover:brightness-110 transition"
        >
          {playing ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
        </button>
        {meta.days.map((d) => {
          const selected = d.index === dayIndex;
          return (
            <button
              key={d.index}
              onClick={() => setDay(d.index)}
              aria-pressed={selected}
              className={`w-28 px-3 py-2 rounded-lg text-left border transition-all duration-200 ${
                selected
                  ? "border-brand bg-white/10 -translate-y-1 shadow-lg"
                  : "border-transparent bg-white/[0.03] hover:bg-white/[0.07]"
              }`}
            >
              <div className="text-sm font-medium text-text">{dayTitle(d)}</div>
              <div className="text-xs text-muted">{d.short}</div>
              <div className="h-1.5 rounded-full mt-2 mb-1.5" style={{ background: TIER_COLORS[worstTier(d.wards_by_tier)] }} />
              <div className="text-xs font-mono tabular-nums text-text">
                {d.wbgt_max.toFixed(1)} <span className="text-muted">°C WBGT</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-xs text-muted bg-bg/85 rounded-full px-3 py-1">Forecast issued {formatIssued(meta.issued_at)} · 3–5 day lead time</div>
    </div>
  );
}
