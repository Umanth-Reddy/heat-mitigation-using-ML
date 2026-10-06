"use client";

import { Code, Play, Sun } from "lucide-react";
import { useRiskData } from "@/lib/data";
import { GITHUB_URL, YOUTUBE_URL } from "@/lib/constants";

/** Single clean screen for viewports under 1024 px wide (the dashboard needs a desktop). No map. */
export default function MobileFallback() {
  const { meta, impact, models } = useRiskData();
  if (!meta || !impact || !models) return null;

  const saved = impact.scenarios.find((s) => s.id === "ushnaraksha")?.deaths_averted ?? 0;
  const stats = [
    { value: String(Math.max(...meta.days.map((d) => d.wards_by_tier[3]))), label: "wards at RED on the peak day" },
    { value: saved.toFixed(1), label: "lives saved in the simulated heatwave" },
    { value: "1–5 d", label: "heat-stress forecast horizon" },
    { value: String(meta.city.n_zones), label: "zones covered (~120 m)" },
  ];

  return (
    <main className="min-h-screen bg-bg text-text font-sans px-6 py-10 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col gap-8">
        <header className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#ffb347] to-brand">
            <Sun className="w-7 h-7 text-black" strokeWidth={2.3} />
          </div>
          <div className="leading-tight">
            <div className="text-2xl font-semibold">UshnaRaksha</div>
            <div className="text-sm text-muted">उष्णरक्षा · Heat-Health Early Warning</div>
          </div>
        </header>

        <p className="text-base leading-relaxed text-muted">
          UshnaRaksha turns weather and vulnerability data into ward-level human thermal stress (WBGT and UTCI) risk, a 3–5 day forecast, predicted heat
          admissions and deaths, and human-approved alerts, so that cities can act before a heatwave peaks. SIH 2026 · SIH26083 · Good Team.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="card p-4">
              <div className="text-3xl font-mono tabular-nums font-medium">{s.value}</div>
              <div className="text-sm text-muted mt-1 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <a href={YOUTUBE_URL} target="_blank" rel="noreferrer" className="h-12 rounded-xl bg-brand text-black font-semibold flex items-center justify-center gap-2">
            <Play className="w-4 h-4" fill="currentColor" /> Watch the demo video
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="h-12 rounded-xl border border-border flex items-center justify-center gap-2 text-sm hover:bg-white/5">
            <Code className="w-4 h-4" /> View the code on GitHub
          </a>
        </div>

        <p className="text-sm text-muted text-center">Open on a desktop for the full dashboard.</p>
        <p className="text-xs text-muted text-center">All numbers are simulated for this prototype.</p>
      </div>
    </main>
  );
}
