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

interface ReadMoreDrawerProps {
  object: any;
  blockData: any;
  onClose: () => void;
}

export default function ReadMoreDrawer({ object, blockData, onClose }: ReadMoreDrawerProps) {
  if (!object || !blockData) return null;

  const isBuilding = object.object_type === "building";
  const cell = blockData.cell;
  const attr = object.attribution || {
    low_albedo: 0.65,
    building_height_trap: 0.48,
    impervious_ground: 0.38,
    lack_of_canopy: 0.32,
  };

  const shapData = [
    { factor: "Low Rooftop Albedo", contribution: attr.low_albedo, color: "#e11d48" },
    { factor: "Height Trap (SVF)", contribution: attr.building_height_trap, color: "#f97316" },
    { factor: "Impervious Ground", contribution: attr.impervious_ground, color: "#f59e0b" },
    { factor: "Vegetation Deficit", contribution: attr.lack_of_canopy, color: "#eab308" },
  ];

  const energy = cell.energy_balance;
  const energyData = [
    { name: "H (Sensible)", value: energy.H, fill: "#e11d48" },
    { name: "G (Ground)", value: energy.G, fill: "#f59e0b" },
    { name: "QF (Traffic/HVAC)", value: energy.QF, fill: "#8b5cf6" },
    { name: "LE (Latent)", value: energy.LE, fill: "#10b981" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-full bg-slate-950 border-l border-slate-800 p-5 flex flex-col gap-4 overflow-y-auto text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              {isBuilding ? object.name || "Building Footprint Attribution" : object.species}
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Cell {cell.cell_id} • {cell.ward_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors border border-slate-800 text-xs font-mono"
          >
            ✕ Close
          </button>
        </div>

        {/* SHAP Driver Attribution */}
        <div className="bg-slate-900/80 p-4 rounded border border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">
            <span>SHAP Driver Attribution</span>
            <span className="text-[10px] font-mono text-slate-400">°C Offset</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={shapData} margin={{ top: 5, right: 15, left: 35, bottom: 5 }}>
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 9 }} />
                <YAxis type="category" dataKey="factor" tick={{ fill: "#cbd5e1", fontSize: 9 }} width={110} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#090d16",
                    borderColor: "#1e293b",
                    borderRadius: "4px",
                    fontSize: "11px",
                    color: "#f8fafc",
                  }}
                  formatter={(val: any) => [`+${val}°C`, "Contribution"]}
                />
                <Bar dataKey="contribution" radius={[0, 2, 2, 0]}>
                  {shapData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Energy Balance */}
        <div className="bg-slate-900/80 p-4 rounded border border-slate-800">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
            Surface Energy Balance (W/m²)
          </div>

          <div className="flex items-center gap-3">
            <div className="w-1/2 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={energyData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
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

            <div className="w-1/2 space-y-1.5 text-xs">
              <div className="flex justify-between items-center p-1 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Sensible (H):</span>
                <span className="font-mono font-bold text-rose-400">{energy.H} W</span>
              </div>
              <div className="flex justify-between items-center p-1 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Ground (G):</span>
                <span className="font-mono font-bold text-amber-400">{energy.G} W</span>
              </div>
              <div className="flex justify-between items-center p-1 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Latent (LE):</span>
                <span className="font-mono font-bold text-emerald-400">{energy.LE} W</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Intervention */}
        <div className="bg-slate-900/90 p-4 rounded border border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-sky-400 mb-1">
            <span>Recommended Intervention</span>
            <span className="text-emerald-400 font-mono">-3.8°C Drop</span>
          </div>

          <h4 className="text-xs font-bold text-slate-100 mt-1">
            Solar Reflective Roof Coating (SRI &gt; 104)
          </h4>
          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
            Apply solar reflective elastomeric coating on building rooftops to increase surface reflectance, reducing sensible heat flux.
          </p>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-800 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Estimated Cost</span>
              <span className="font-mono font-bold text-slate-100">₹8.5 Lakhs</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Equity Flag</span>
              <span className="text-slate-200">High Density Transit Corridor</span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded bg-slate-900/50 border border-slate-800 text-[10px] text-slate-400 mt-auto">
          <span className="font-semibold text-slate-300">Model Note:</span> Predicted from Landsat 8 / ECOSTRESS LST + ground station microclimate calibration.
        </div>
      </div>
    </div>
  );
}
