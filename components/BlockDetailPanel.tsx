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
  PieChart,
  Pie,
} from "recharts";

interface BlockDetailPanelProps {
  blockData: any;
  onBackToCity: () => void;
  selectedObject: any;
}

export default function BlockDetailPanel({
  blockData,
  onBackToCity,
  selectedObject,
}: BlockDetailPanelProps) {
  if (!blockData) return null;

  const cell = blockData.cell;
  const drivers = cell.drivers;
  const energy = cell.energy_balance;

  const driverChartData = [
    { name: "Bldg Density", value: Math.round(drivers.building_density * 100), color: "#e11d48" },
    { name: "Impervious", value: Math.round(drivers.imperviousness * 100), color: "#f97316" },
    { name: "Traffic", value: Math.round(drivers.traffic_density * 100), color: "#f59e0b" },
    { name: "Albedo Deficit", value: Math.round((1 - drivers.albedo) * 100), color: "#eab308" },
    { name: "Sky View Trap", value: Math.round((1 - drivers.sky_view_factor) * 100), color: "#84cc16" },
    { name: "Vegetation", value: Math.round(drivers.ndvi * 100), color: "#10b981" },
  ];

  const energyData = [
    { name: "Sensible (H)", value: energy.H, fill: "#e11d48" },
    { name: "Ground (G)", value: energy.G, fill: "#f59e0b" },
    { name: "Anthropogenic (QF)", value: energy.QF, fill: "#8b5cf6" },
    { name: "Latent (LE)", value: energy.LE, fill: "#10b981" },
  ];

  return (
    <aside className="w-80 md:w-84 bg-slate-950/90 border border-slate-800 rounded-lg p-4 flex flex-col gap-4 backdrop-blur-md max-h-[calc(100vh-5.5rem)] overflow-y-auto shadow-2xl text-slate-200">
      {/* Back Button */}
      <button
        onClick={onBackToCity}
        className="self-start px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
      >
        ← Back to City Overview
      </button>

      {/* Block Header */}
      <div className="bg-slate-900/80 p-3.5 rounded border border-slate-800">
        <div className="text-[10px] text-sky-400 font-mono mb-0.5">
          CELL {cell.cell_id} • 3D Block View
        </div>
        <h2 className="text-sm font-bold text-slate-100">{cell.ward_name}</h2>

        <div className="grid grid-cols-2 gap-2 mt-3 text-slate-100">
          <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">LST Temp</span>
            <span className="text-lg font-bold font-mono text-amber-400">
              {cell.lst_current}°C
            </span>
          </div>
          <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Air Temp (Ta)</span>
            <span className="text-lg font-bold font-mono text-sky-400">
              {cell.ta_current}°C
            </span>
          </div>
        </div>

        <div className="mt-2.5 p-2 rounded bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-300">Cooling Potential</span>
          <span className="text-sm font-bold font-mono text-emerald-400">
            -{cell.cooling_potential}°C
          </span>
        </div>
      </div>

      {/* Drivers Breakdown */}
      <div className="bg-slate-900/80 p-3.5 rounded border border-slate-800">
        <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Aggregated Block Drivers
        </div>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={driverChartData}
              margin={{ top: 0, right: 10, left: 30, bottom: 0 }}
            >
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 9 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 9 }} width={75} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#090d16",
                  borderColor: "#1e293b",
                  borderRadius: "4px",
                  fontSize: "11px",
                  color: "#f8fafc",
                }}
                formatter={(val: any) => [`${val}%`, "Impact Score"]}
              />
              <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                {driverChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Energy Balance */}
      <div className="bg-slate-900/80 p-3.5 rounded border border-slate-800">
        <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Surface Energy Balance (W/m²)
        </div>
        <div className="h-32 w-full flex items-center justify-between">
          <div className="h-full w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={energyData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={20}
                  outerRadius={40}
                  paddingAngle={3}
                >
                  {energyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#090d16",
                    borderColor: "#1e293b",
                    borderRadius: "4px",
                    fontSize: "10px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 text-[10px] space-y-1">
            {energyData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.fill }}></span>
                  {item.name.split(" ")[0]}
                </span>
                <span className="font-mono font-semibold text-slate-100">{item.value} W</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-2.5 rounded bg-slate-900/50 border border-slate-800 text-[10px] text-slate-400">
        <span className="text-emerald-400 font-semibold">Note:</span> Tree placement is illustrative based on canopy cover percentage ({cell.canopy_pct}%).
      </div>
    </aside>
  );
}
