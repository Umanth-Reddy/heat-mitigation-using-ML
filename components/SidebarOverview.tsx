"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface SidebarOverviewProps {
  summary: any;
  afterInterventions: boolean;
  onSelectCell: (cell: any) => void;
}

export default function SidebarOverview({
  summary,
  afterInterventions,
  onSelectCell,
}: SidebarOverviewProps) {
  if (!summary) return null;

  const currentAvgLST = summary.avg_lst_current;
  const afterAvgLST = summary.avg_lst_after;
  const diffLST = (currentAvgLST - afterAvgLST).toFixed(1);

  const currentAvgTa = summary.avg_ta_current;
  const afterAvgTa = summary.avg_ta_after;
  const diffTa = (currentAvgTa - afterAvgTa).toFixed(1);

  const getBinColor = (rangeMin: number) => {
    if (rangeMin >= 46) return "#e11d48";
    if (rangeMin >= 44) return "#f97316";
    if (rangeMin >= 42) return "#eab308";
    if (rangeMin >= 40) return "#22c55e";
    return "#008cfc";
  };

  return (
    <aside className="w-80 md:w-84 panel-black rounded p-4 flex flex-col gap-4 max-h-[calc(100vh-5.5rem)] overflow-y-auto text-zinc-100 font-sans">
      {/* City Overview */}
      <div className="bg-zinc-900/60 p-3.5 rounded border border-zinc-800">
        <div className="flex items-center justify-between text-[11px] font-light uppercase tracking-widest text-zinc-400 mb-2">
          <span>Ward Summary</span>
          <span className="font-mono text-zinc-400">256 Cells</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-zinc-100">
          <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 block font-light">Surface LST</span>
            <span className="text-xl font-normal font-mono text-zinc-100">
              {afterInterventions ? afterAvgLST : currentAvgLST}°C
            </span>
            {afterInterventions && (
              <span className="text-[10px] text-zinc-300 block mt-0.5 font-light">
                -{diffLST}°C Cooling
              </span>
            )}
          </div>

          <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 block font-light">Air Temp (Ta)</span>
            <span className="text-xl font-normal font-mono text-zinc-100">
              {afterInterventions ? afterAvgTa : currentAvgTa}°C
            </span>
            {afterInterventions && (
              <span className="text-[10px] text-zinc-300 block mt-0.5 font-light">
                -{diffTa}°C Ambient
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid LST Histogram */}
      <div className="bg-zinc-900/60 p-3.5 rounded border border-zinc-800">
        <div className="flex items-center justify-between text-[11px] font-light uppercase tracking-widest text-zinc-300 mb-2">
          <span>LST Distribution</span>
          <span className="text-[10px] font-mono text-zinc-400">Grid Bins (°C)</span>
        </div>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.histogram} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
              <XAxis dataKey="bin" tick={{ fill: "#71717a", fontSize: 9 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 9 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#09090b",
                  borderColor: "#27272a",
                  borderRadius: "4px",
                  fontSize: "11px",
                  color: "#f4f4f5",
                }}
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {summary.histogram.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={getBinColor(entry.range[0])} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 5 Hotspot Blocks */}
      <div className="bg-zinc-900/60 p-3.5 rounded border border-zinc-800">
        <div className="flex items-center justify-between text-[11px] font-light uppercase tracking-widest text-zinc-200 mb-2">
          <span>Top 5 Hotspot Blocks</span>
          <span className="text-[10px] font-mono text-zinc-400">Click to Inspect</span>
        </div>

        <div className="space-y-2">
          {summary.top_5_hottest.map((block: any, idx: number) => (
            <div
              key={block.cell_id}
              onClick={() => onSelectCell(block)}
              className="p-2 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px] font-normal flex items-center justify-center border border-zinc-700">
                  {idx + 1}
                </span>
                <div>
                  <div className="text-xs font-normal text-zinc-200">
                    {block.ward_name}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    {block.cell_id}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-normal font-mono text-zinc-100 block">
                  {block.lst}°C
                </span>
                <span className="text-[10px] text-zinc-400 font-light block">
                  -{block.cooling_potential}°C Pot.
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap Legend */}
      <div className="bg-zinc-900/60 p-3 rounded border border-zinc-800 text-xs">
        <div className="flex items-center justify-between text-zinc-300 font-light text-[11px] mb-2">
          <span>Thermal Ramp</span>
          <span className="text-[10px] font-mono text-zinc-400">38°C – 48°C</span>
        </div>
        <div className="h-2 w-full rounded bg-gradient-to-r from-sky-500 via-teal-400 via-green-400 via-yellow-400 via-orange-500 to-red-600 mb-1"></div>
        <div className="flex justify-between text-[10px] font-mono text-zinc-400">
          <span>Cool (38°C)</span>
          <span>Moderate (42°C)</span>
          <span>Hotspot (47°C+)</span>
        </div>
      </div>
    </aside>
  );
}
