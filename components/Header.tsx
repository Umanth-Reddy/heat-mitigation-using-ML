"use client";

import React from "react";

interface HeaderProps {
  showHeatmapOverlay: boolean;
  onToggleHeatmapOverlay: (show: boolean) => void;
  heatmapMode: "dynamic" | "raster";
  onSetHeatmapMode: (mode: "dynamic" | "raster") => void;
  rasterOpacity: number;
  onSetRasterOpacity: (opacity: number) => void;
  afterInterventions: boolean;
  onToggleAfterInterventions: (after: boolean) => void;
  onOpenInterventions: () => void;
  onStartDemoGuide: () => void;
  summary: any;
}

export default function Header({
  showHeatmapOverlay,
  onToggleHeatmapOverlay,
  heatmapMode,
  onSetHeatmapMode,
  rasterOpacity,
  onSetRasterOpacity,
  afterInterventions,
  onToggleAfterInterventions,
  onOpenInterventions,
  onStartDemoGuide,
  summary,
}: HeaderProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-40 px-6 py-3.5 bg-black/90 border-b border-zinc-800/80 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 text-zinc-100 font-sans">
      {/* Title & Metadata */}
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-7 bg-zinc-100 rounded-full"></div>
        <div>
          <h1 className="text-xs font-light tracking-widest uppercase text-zinc-100 flex items-center gap-2">
            Urban Heat Attribution Platform
            <span className="text-[10px] font-mono text-zinc-400 font-normal px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
              100m LST
            </span>
          </h1>
          <p className="text-[11px] text-zinc-400 font-light mt-0.5">
            {summary?.city_name || "Connaught Place & Central Ward, New Delhi"} • Landsat 8 LST
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">View</span>
          <div className="flex bg-zinc-900 p-0.5 rounded border border-zinc-800">
            <button
              onClick={() => onSetHeatmapMode("dynamic")}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                heatmapMode === "dynamic"
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Dynamic
            </button>
            <button
              onClick={() => onSetHeatmapMode("raster")}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                heatmapMode === "raster"
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Rasterized
            </button>
          </div>
          <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            <span>Opacity</span>
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.05}
              value={rasterOpacity}
              onChange={(e) => onSetRasterOpacity(Number(e.target.value))}
              className="accent-zinc-100 w-20"
            />
          </label>
        </div>

        {/* Heatmap Overlay Toggle */}
        <button
          onClick={() => onToggleHeatmapOverlay(!showHeatmapOverlay)}
          className={`px-3 py-1.5 rounded text-[11px] font-light tracking-wide transition-all border ${
            showHeatmapOverlay
              ? "bg-zinc-100 text-zinc-950 font-normal border-zinc-100"
              : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
          }`}
        >
          Thermal Heatmap Overlay: {showHeatmapOverlay ? "ON" : "OFF"}
        </button>

        {/* Baseline vs After Toggle */}
        <div className="flex bg-zinc-950 p-0.5 rounded border border-zinc-800">
          <button
            onClick={() => onToggleAfterInterventions(false)}
            className={`px-3 py-1.5 rounded text-[11px] font-light tracking-wide transition-colors ${
              !afterInterventions
                ? "bg-zinc-800 text-zinc-100 font-normal border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Baseline LST
          </button>
          <button
            onClick={() => onToggleAfterInterventions(true)}
            className={`px-3 py-1.5 rounded text-[11px] font-light tracking-wide transition-colors ${
              afterInterventions
                ? "bg-zinc-800 text-zinc-100 font-normal border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            After Interventions
          </button>
        </div>

        {/* Action Buttons */}
        <button
          onClick={onOpenInterventions}
          className="btn-black px-3.5 py-1.5 rounded text-[11px] font-light tracking-wide transition-all"
        >
          Optimization Matrix
        </button>

        <button
          onClick={onStartDemoGuide}
          className="btn-black px-3.5 py-1.5 rounded text-[11px] font-light tracking-wide transition-all text-zinc-200 border-zinc-700"
        >
          Demo Guide
        </button>
      </div>
    </header>
  );
}
