"use client";

import React, { useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface InterventionsDrawerProps {
  interventions: any[];
  onClose: () => void;
  onSelectIntervention: (item: any) => void;
}

export default function InterventionsDrawer({
  interventions,
  onClose,
  onSelectIntervention,
}: InterventionsDrawerProps) {
  const [selectedTier, setSelectedTier] = useState<"10L" | "50L" | "1Cr" | "ALL">("ALL");

  if (!interventions) return null;

  const filteredList =
    selectedTier === "ALL"
      ? interventions
      : selectedTier === "10L"
      ? interventions.filter((i) => i.cost_lakhs <= 10)
      : selectedTier === "50L"
      ? interventions.filter((i) => i.cost_lakhs <= 50)
      : interventions;

  const scatterData = filteredList.map((item) => ({
    name: item.title,
    cost: item.cost_lakhs,
    cooling: item.expected_cooling_c,
    population: item.population_impacted,
    raw: item,
  }));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl h-full bg-slate-950 border-l border-slate-800 p-5 flex flex-col gap-4 overflow-y-auto text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Recommended Interventions Matrix
            </h2>
            <p className="text-xs text-slate-400">
              Precomputed Budget & Cost-Cooling Optimization
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors border border-slate-800 text-xs font-mono"
          >
            ✕ Close
          </button>
        </div>

        {/* Budget Tier Selector Slider */}
        <div className="bg-slate-900/80 p-3.5 rounded border border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            <span>Budget Tier Slider</span>
            <span className="font-mono text-amber-400">
              {selectedTier === "ALL" ? "All Scenarios" : `Tier ₹${selectedTier}`}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: "ALL", label: "All Tiers" },
              { id: "10L", label: "₹10 Lakhs" },
              { id: "50L", label: "₹50 Lakhs" },
              { id: "1Cr", label: "₹1 Crore" },
            ].map((tier) => (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id as any)}
                className={`py-1.5 px-2 rounded text-xs font-semibold transition-colors border ${
                  selectedTier === tier.id
                    ? "bg-slate-800 text-sky-400 border-slate-700"
                    : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scatter Chart */}
        <div className="bg-slate-900/80 p-3.5 rounded border border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            <span>Cost vs Cooling Scatter</span>
            <span className="text-[10px] text-slate-400 font-normal">Top-Left = Best Value</span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: -10 }}>
                <XAxis
                  type="number"
                  dataKey="cost"
                  name="Cost (Lakhs)"
                  unit="L"
                  tick={{ fill: "#64748b", fontSize: 9 }}
                />
                <YAxis
                  type="number"
                  dataKey="cooling"
                  name="Cooling (°C)"
                  unit="°C"
                  tick={{ fill: "#64748b", fontSize: 9 }}
                />
                <ZAxis type="number" dataKey="population" range={[60, 300]} name="Population" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    backgroundColor: "#090d16",
                    borderColor: "#1e293b",
                    borderRadius: "4px",
                    fontSize: "11px",
                    color: "#f8fafc",
                  }}
                  formatter={(val: any, name: any) => [
                    name === "Cost (Lakhs)" ? `₹${val} Lakhs` : name === "Cooling (°C)" ? `-${val}°C` : val,
                    name,
                  ]}
                />
                <Scatter data={scatterData} fill="#38bdf8">
                  {scatterData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.cost <= 10 ? "#34d399" : entry.cost <= 50 ? "#38bdf8" : "#c084fc"}
                      onClick={() => onSelectIntervention(entry.raw)}
                      className="cursor-pointer"
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interventions List */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Ranked Interventions ({filteredList.length})
          </div>

          {filteredList.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => onSelectIntervention(item)}
              className="p-3 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-sky-500/20 text-sky-400 font-mono text-[10px] font-bold flex items-center justify-center border border-sky-500/30">
                    {idx + 1}
                  </span>
                  <h4 className="text-xs font-bold text-slate-100">{item.title}</h4>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
                  -{item.expected_cooling_c}°C
                </span>
              </div>

              <p className="text-[11px] text-slate-300">{item.description}</p>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                <span className="font-mono text-amber-400">
                  ₹{(item.cost_inr / 100000).toFixed(1)} Lakhs
                </span>
                <span>{item.population_impacted.toLocaleString()} people</span>
                <span className="text-slate-300">{item.equity_note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
