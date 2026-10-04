"use client";

import { Calculator, Sun } from "lucide-react";
import { selectPendingCount, useStore, type TabId } from "@/lib/store";
import { formatIssued } from "@/lib/format";
import type { RiskMeta } from "@/lib/types";

const TABS: { id: TabId; label: string }[] = [
  { id: "warning", label: "Early Warning" },
  { id: "alerts", label: "Alerts" },
  { id: "impact", label: "Impact" },
  { id: "models", label: "Model Insights" },
  { id: "planning", label: "Urban Planning" },
  { id: "how", label: "How it works" },
];

export default function AppHeader({ meta }: { meta: RiskMeta }) {
  const activeTab = useStore((s) => s.activeTab);
  const setTab = useStore((s) => s.setTab);
  const overrides = useStore((s) => s.alertOverrides);
  const pending = selectPendingCount(overrides);
  const calcOpen = useStore((s) => s.calculatorOpen);
  const setCalcOpen = useStore((s) => s.setCalculatorOpen);

  return (
    <header className="relative z-40 h-14 shrink-0 flex items-center justify-between px-5 border-b border-border bg-bg">
      <div className="flex items-center gap-3 min-w-[300px]">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#ffb347] to-brand">
          <Sun className="w-5 h-5 text-black" strokeWidth={2.4} />
        </div>
        <div className="leading-tight">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-text">UshnaRaksha</span>
            <span className="text-xs text-muted">उष्णरक्षा</span>
          </div>
          <div className="text-xs text-muted">Heat-Health Early Warning</div>
        </div>
      </div>

      <nav className="flex items-center gap-1" aria-label="Main">
        {TABS.map((t, i) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              title={`Shortcut: ${i + 1}`}
              className={`relative flex items-center gap-2 px-4 h-9 rounded-lg text-sm transition-colors ${
                active ? "bg-white/10 text-text font-medium" : "text-muted hover:text-text hover:bg-white/5"
              }`}
            >
              {t.label}
              {t.id === "alerts" && pending > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand text-black text-xs font-semibold font-mono tabular-nums flex items-center justify-center">
                  {pending}
                </span>
              )}
              {active && <span className="absolute left-3 right-3 -bottom-[11px] h-0.5 rounded bg-brand" />}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center justify-end gap-4 min-w-[300px]">
        <button
          onClick={() => setCalcOpen(!calcOpen)}
          aria-pressed={calcOpen}
          title="Shortcut: C"
          className={`flex items-center gap-2 px-3.5 h-9 rounded-lg text-sm border transition-colors ${calcOpen ? "border-brand text-text bg-white/10" : "border-border text-muted hover:text-text hover:bg-white/5"}`}
        >
          <Calculator className="w-4 h-4" /> Calculator
        </button>
        <span className="text-sm text-text">New Delhi · Pilot</span>
        <span className="text-xs font-mono text-muted">Issued {formatIssued(meta.issued_at)}</span>
        <span className="px-2.5 py-1 rounded-full border border-border text-xs text-muted">Simulated data</span>
      </div>
    </header>
  );
}
