"use client";

import { useState } from "react";
import { Sun, Cloud, X } from "lucide-react";
import { useRiskData } from "@/lib/data";
import { TIER_COLORS, tierOfWbgt } from "@/lib/risk";
import { useStore } from "@/lib/store";
import { SUN_RADIANT_WBGT, SUN_TMRT_OFFSET, utci, utciCategory, utciWarnings, wbgtEstimate, wetBulbStull } from "@/lib/thermal";

interface Inputs {
  ta: number;
  rh: number;
  wind: number;
  sun: boolean;
}

const DEFAULT: Inputs = { ta: 40, rh: 30, wind: 2, sun: true };

function Slider({ label, unit, value, min, max, step, onChange }: {
  label: string; unit: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm">{label}</span>
        <span className="font-mono tabular-nums text-sm">{value.toFixed(step < 1 ? 1 : 0)} {unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#ff7a1a]"
      />
      <div className="flex justify-between text-xs text-muted font-mono tabular-nums">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </label>
  );
}

export default function CalculatorDrawer() {
  const open = useStore((s) => s.calculatorOpen);
  const setOpen = useStore((s) => s.setCalculatorOpen);
  const setTab = useStore((s) => s.setTab);
  const { meta, cells } = useRiskData();
  const [v, setV] = useState<Inputs>(DEFAULT);

  if (!open || !meta || !cells) return null;

  const tmrt = v.sun ? v.ta + SUN_TMRT_OFFSET : v.ta;
  const radiant = v.sun ? SUN_RADIANT_WBGT : 0;
  const wbgt = wbgtEstimate(v.ta, v.rh, radiant);
  const u = utci(v.ta, tmrt, v.wind, v.rh);
  const tier = tierOfWbgt(meta.tiers, wbgt);
  const tierInfo = meta.tiers[tier];
  const warnings = utciWarnings(v.ta, tmrt, v.wind, v.rh);

  const usePreset = () => {
    // Thu 21 May (day 3), Barakhamba Road (W01): cell-average air temperature and humidity, city wind speed, in sun.
    const w01 = Object.values(cells).filter((c) => c.ward_id === "W01");
    const mean = (f: (c: (typeof w01)[number]) => number) => w01.reduce((a, c) => a + f(c), 0) / w01.length;
    setV({
      ta: Math.round(mean((c) => c.days[3].ta) * 2) / 2,
      rh: Math.round(mean((c) => c.days[3].rh)),
      wind: Math.max(0.5, Math.round(meta.days[3].wind * 10) / 10),
      sun: true,
    });
  };

  return (
    <aside
      role="dialog"
      aria-label="Heat-stress calculator"
      className="fixed right-0 top-14 bottom-0 w-[440px] z-[45] card rounded-r-none rounded-b-none border-r-0 flex flex-col anim-slide-right"
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-base font-semibold">Heat-stress calculator</h2>
        <button onClick={() => setOpen(false)} aria-label="Close calculator" className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-white/10">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-white/[0.03] p-4">
            <div className="text-xs text-muted">WBGT (estimate)</div>
            <div className="text-5xl font-mono tabular-nums font-medium mt-1" style={{ color: TIER_COLORS[tier] }}>{wbgt.toFixed(1)}</div>
            <div className="text-xs text-muted mt-0.5">°C · Tw {wetBulbStull(v.ta, v.rh).toFixed(1)} °C</div>
          </div>
          <div className="rounded-xl border border-border bg-white/[0.03] p-4">
            <div className="text-xs text-muted">UTCI</div>
            <div className="text-5xl font-mono tabular-nums font-medium mt-1">{u.toFixed(1)}</div>
            <div className="text-xs text-muted mt-0.5">°C · Tmrt {tmrt.toFixed(1)} °C</div>
          </div>
        </div>

        <div className="rounded-xl border border-border p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold text-black" style={{ background: TIER_COLORS[tier] }}>
              {tierInfo.imd.toUpperCase()} · {tierInfo.label}
            </span>
            <span className="text-sm">{utciCategory(u)}</span>
          </div>
          <p className="text-sm text-muted leading-snug">{tierInfo.meaning}</p>
        </div>

        {warnings.length > 0 && (
          <ul className="text-xs rounded-lg border border-brand/50 bg-brand/10 px-3 py-2 flex flex-col gap-1">
            {warnings.map((w) => (
              <li key={w}>⚠ {w}</li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-4">
          <Slider label="Air temperature" unit="°C" value={v.ta} min={25} max={50} step={0.5} onChange={(ta) => setV({ ...v, ta })} />
          <Slider label="Relative humidity" unit="%" value={v.rh} min={5} max={90} step={1} onChange={(rh) => setV({ ...v, rh })} />
          <Slider label="Wind speed" unit="m/s" value={v.wind} min={0.5} max={8} step={0.1} onChange={(wind) => setV({ ...v, wind })} />
          <div>
            <div className="text-sm mb-1.5">Exposure</div>
            <div className="card p-1 flex gap-1 w-fit" role="group" aria-label="Sun or shade">
              {([true, false] as const).map((sun) => (
                <button
                  key={String(sun)}
                  onClick={() => setV({ ...v, sun })}
                  aria-pressed={v.sun === sun}
                  className={`flex items-center gap-2 px-4 h-9 rounded-lg text-sm transition-colors ${v.sun === sun ? "bg-brand text-black font-medium" : "text-muted hover:text-text"}`}
                >
                  {sun ? <Sun className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
                  {sun ? "Sun" : "Shade"}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-2">
              Shade: Tmrt = Ta. Sun: Tmrt = Ta + {SUN_TMRT_OFFSET} °C, and +{SUN_RADIANT_WBGT} °C radiant term in WBGT.
            </p>
          </div>
        </div>

        <button onClick={usePreset} className="h-10 rounded-xl border border-border text-sm hover:bg-white/10 transition-colors">
          Use Thu 21 May Barakhamba values
        </button>

        <p className="text-xs text-muted">
          Computed live in your browser ·{" "}
          <button onClick={() => { setOpen(false); setTab("how"); }} className="underline underline-offset-2 hover:text-text">
            formulas in How it works
          </button>
          . The map&apos;s ward WBGT also includes a local radiant offset and a canopy correction, so it differs slightly from this estimate.
        </p>
      </div>
    </aside>
  );
}
