"use client";

import React from "react";

interface ObjectPopupProps {
  object: any;
  onClose: () => void;
  onReadMore: () => void;
  /** The detail drawer needs a selected block; without one we show a hint instead of a dead button. */
  canReadMore: boolean;
}

const DRIVER_LABELS: Record<string, string> = {
  low_albedo: "Low rooftop albedo",
  building_height_trap: "Height / sky-view trap",
  impervious_ground: "Impervious ground",
  lack_of_canopy: "Lack of canopy",
};

/** Built from the object's own data: the two largest attribution values for a building; canopy facts for a tree. */
function driversText(object: any, isBuilding: boolean): string {
  if (isBuilding) {
    const top = Object.entries(object.attribution ?? {})
      .filter(([k]) => k in DRIVER_LABELS)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 2)
      .map(([k, v]: any) => `${DRIVER_LABELS[k]} (+${Number(v).toFixed(2)}°C)`);
    return top.length ? top.join(" and ") : "No attribution available for this building.";
  }
  return `Canopy shading (${object.radius} m radius, density ${object.canopy_density}) and evapotranspiration.`;
}

export default function ObjectPopup({ object, onClose, onReadMore, canReadMore }: ObjectPopupProps) {
  if (!object) return null;

  const isBuilding = object.object_type === "building";

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border border-slate-800 rounded-lg p-4 w-80 md:w-90 backdrop-blur-md shadow-2xl animate-in fade-in duration-200 text-slate-200">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
        <div>
          <h4 className="text-xs font-bold text-slate-100">
            {isBuilding ? object.name || "Building Footprint" : object.species}
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">
            {isBuilding ? `Height: ${object.height}m` : `Canopy Radius: ${object.radius}m`}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-100 text-sm px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 mb-3">
        {isBuilding ? (
          <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-300">Heat Contribution</span>
            <span className="text-xs font-bold font-mono text-rose-400">
              +{object.heat_contribution_offset}°C above avg
            </span>
          </div>
        ) : (
          <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
            <span className="text-xs text-emerald-300">Cooling Effect</span>
            <span className="text-xs font-bold font-mono text-emerald-400">
              {object.cooling_contribution}°C cooling
            </span>
          </div>
        )}

        <div className="text-[11px] text-slate-300">
          <span className="text-slate-400">Primary Drivers: </span>
          {driversText(object, isBuilding)}
        </div>
      </div>

      {canReadMore ? (
              <button
                onClick={onReadMore}
                className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold border border-slate-700 transition-colors text-center"
              >
                Read Detailed SHAP Attribution →
              </button>
      ) : (
        <div className="text-[11px] text-slate-400 text-center py-1.5">Click a block on the map to open the detailed attribution.</div>
      )}
    </div>
  );
}
