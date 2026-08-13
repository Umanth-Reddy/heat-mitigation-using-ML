"use client";

import React, { useState, useMemo } from "react";
import DeckGL from "@deck.gl/react";
import { Map } from "react-map-gl/maplibre";
import { setWorkerUrl } from "maplibre-gl";
import { GeoJsonLayer, PolygonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { LightingEffect, AmbientLight, _SunLight as DirectionalLight } from "@deck.gl/core";
import "maplibre-gl/dist/maplibre-gl.css";

// Point maplibre-gl at the static worker file in /public so it doesn't try
// to spawn a worker via dynamic new URL() — which breaks in bundler contexts.
setWorkerUrl("/maplibre-worker.mjs");

// Esri World Imagery — real satellite/aerial photography basemap (free, no API key)
const SATELLITE_STYLE: any = {
  version: 8 as const,
  sources: {
    satellite: {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "© Esri, Maxar, Earthstar Geographics",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "satellite-tiles",
      type: "raster" as const,
      source: "satellite",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

// Thermal Overlay Color Ramp matching user reference image:
// Green -> Yellow -> Orange -> Deep Crimson Red
const THERMAL_COLOR_RANGE: [number, number, number][] = [
  [34, 197, 94],    // Cool Green (low heat)
  [234, 179, 8],    // Warm Yellow
  [249, 115, 22],   // Hot Orange
  [225, 29, 72],    // Intense Red Hotspot
  [180, 0, 40],     // Deep Crimson Peak
];

// Building colors blended with heat contribution
function getBuildingColor(val: number): [number, number, number, number] {
  if (val > 0.8) return [225, 29, 72, 230];   // Deep Red
  if (val > 0.6) return [249, 115, 22, 230];  // Hot Orange
  if (val > 0.4) return [234, 179, 8, 230];   // Yellow
  if (val > 0.2) return [160, 190, 140, 230]; // Sand Stone
  return [140, 170, 160, 230];                // Neutral Stone
}

// 3D Directional Sun Lighting
const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.5,
});
const directionalLight = new DirectionalLight({
  timestamp: 1600000000000,
  color: [255, 255, 255],
  intensity: 2.0,
});
const lightingEffect = new LightingEffect({ ambientLight, directionalLight });

interface MapViewProps {
  showHeatmapOverlay: boolean;
  afterInterventions: boolean;
  gridGeoJson: any;
  allBuildings: any[];
  activeCell: any;
  blockData: any;
  selectedObject: any;
  onSelectCell: (cell: any) => void;
  onSelectObject: (obj: any) => void;
  viewState: any;
  onViewStateChange: (vs: any) => void;
}

export default function MapView({
  showHeatmapOverlay,
  afterInterventions,
  gridGeoJson,
  allBuildings,
  activeCell,
  blockData,
  selectedObject,
  onSelectCell,
  onSelectObject,
  viewState,
  onViewStateChange,
}: MapViewProps) {
  const [hoverInfo, setHoverInfo] = useState<any>(null);

  // Generate sub-point samples for continuous GPU heatmap overlay
  const heatmapPoints = useMemo(() => {
    if (!gridGeoJson || !gridGeoJson.features) return [];
    const points: any[] = [];

    gridGeoJson.features.forEach((feature: any) => {
      const props = feature.properties;
      const lst = afterInterventions ? props.lst_after : props.lst_current;
      const weight = Math.max(0.05, (lst - 37.0) / 11.0);

      const bounds = props.bounds;
      if (bounds && bounds.length === 4) {
        const [min_lon, min_lat, max_lon, max_lat] = bounds;
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 4; j++) {
            const lon = min_lon + (max_lon - min_lon) * ((i + 0.5) / 4);
            const lat = min_lat + (max_lat - min_lat) * ((j + 0.5) / 4);
            points.push({
              position: [lon, lat],
              weight: weight,
              cellProps: props,
            });
          }
        }
      }
    });

    return points;
  }, [gridGeoJson, afterInterventions]);

  const layers = [];

  // 1. Continuous Thermal GPU Heatmap Overlay directly ON TOP of Voyager Street Map
  if (showHeatmapOverlay && heatmapPoints.length > 0) {
    layers.push(
      new HeatmapLayer({
        id: "voyager-thermal-heatmap-overlay",
        data: heatmapPoints,
        getPosition: (d: any) => d.position,
        getWeight: (d: any) => d.weight,
        radiusPixels: 45,
        colorRange: THERMAL_COLOR_RANGE,
        intensity: 1.4,
        threshold: 0.03,
        aggregation: "MEAN",
        opacity: 0.55, // Semi-transparent so streets, roads, and names are 100% visible underneath
      })
    );
  }

  // 2. Interactive Cell Click Overlay (Subtle line borders)
  if (gridGeoJson) {
    layers.push(
      new GeoJsonLayer({
        id: "interactive-grid-layer",
        data: gridGeoJson,
        pickable: true,
        stroked: true,
        filled: true,
        extruded: false,
        getLineWidth: (f: any) => (f.properties.cell_id === activeCell?.cell_id ? 2.5 : 0.5),
        getLineColor: (f: any) =>
          f.properties.cell_id === activeCell?.cell_id ? [0, 0, 0, 240] : [0, 0, 0, 30],
        getFillColor: [0, 0, 0, 0.01],
        updateTriggers: {
          getLineWidth: [activeCell?.cell_id],
          getLineColor: [activeCell?.cell_id],
        },
        onHover: (info: any) => setHoverInfo(info),
        onClick: (info: any) => {
          if (info.object) {
            onSelectCell(info.object.properties);
          }
        },
      })
    );
  }

  // 3. 3D Extruded Buildings Layer across the entire city ward area
  const buildingData = (blockData && blockData.buildings && blockData.buildings.length > 0)
    ? blockData.buildings
    : allBuildings;

  if (buildingData && buildingData.length > 0) {
    layers.push(
      new PolygonLayer({
        id: "extruded-city-buildings-layer",
        data: buildingData,
        pickable: true,
        stroked: true,
        filled: true,
        extruded: true,
        wireframe: false,
        material: {
          ambient: 0.45,
          diffuse: 0.65,
          shininess: 32,
          specularColor: [80, 80, 80],
        },
        getPolygon: (d: any) => d.coordinates,
        getElevation: (d: any) => (d.height || 15) * 1.3,
        getFillColor: (d: any) => {
          if (selectedObject?.id === d.id) {
            return [255, 255, 255, 255];
          }
          return getBuildingColor(d.heat_driver_value || 0.5);
        },
        getLineColor: [30, 30, 30, 140],
        getLineWidth: 1,
        updateTriggers: {
          getFillColor: [selectedObject?.id],
        },
        onHover: (info: any) => setHoverInfo(info),
        onClick: (info: any) => {
          if (info.object) {
            onSelectObject({
              ...info.object,
              object_type: "building",
              cell_id: activeCell?.cell_id || "CELL_07_12",
              ward_name: activeCell?.ward_name || "Connaught Place",
            });
          }
        },
      })
    );
  }

  // 4. 3D Trees Layer
  if (blockData && blockData.trees) {
    layers.push(
      new ScatterplotLayer({
        id: "trees-layer",
        data: blockData.trees,
        pickable: true,
        opacity: 0.95,
        stroked: true,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 6,
        radiusMaxPixels: 20,
        getPosition: (d: any) => d.position,
        getRadius: (d: any) => d.radius,
        getFillColor: (d: any) =>
          selectedObject?.id === d.id ? [255, 255, 255, 255] : [34, 197, 94, 230],
        getLineColor: [20, 80, 40, 200],
        getLineWidth: 1.5,
        updateTriggers: {
          getFillColor: [selectedObject?.id],
        },
        onHover: (info: any) => setHoverInfo(info),
        onClick: (info: any) => {
          if (info.object) {
            onSelectObject({
              ...info.object,
              object_type: "tree",
              cell_id: activeCell?.cell_id || "CELL_07_12",
              ward_name: activeCell?.ward_name || "Connaught Place",
            });
          }
        },
      })
    );
  }

  return (
    <div className="relative w-full h-full bg-zinc-900">
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e: any) => onViewStateChange(e.viewState)}
        controller={{ dragRotate: true, doubleClickZoom: false }}
        layers={layers}
        effects={[lightingEffect]}
        getCursor={({ isHovering }) => (isHovering ? "pointer" : "default")}
      >
        <Map mapStyle={SATELLITE_STYLE} />
      </DeckGL>

      {/* Hover Tooltip */}
      {hoverInfo && hoverInfo.object && (
        <div
          className="absolute pointer-events-none z-50 bg-zinc-950 border border-zinc-700 px-3 py-2 rounded text-xs shadow-2xl transition-all text-zinc-100 font-sans"
          style={{ left: hoverInfo.x + 12, top: hoverInfo.y + 12 }}
        >
          {hoverInfo.layer.id === "interactive-grid-layer" && (
            <div>
              <div className="font-semibold text-zinc-100">
                {hoverInfo.object.properties.ward_name} ({hoverInfo.object.properties.cell_id})
              </div>
              <div className="text-zinc-300 mt-1">
                LST Temp:{" "}
                <span className="font-mono text-red-400 font-bold">
                  {afterInterventions
                    ? hoverInfo.object.properties.lst_after
                    : hoverInfo.object.properties.lst_current}
                  °C
                </span>
              </div>
              <div className="text-zinc-400 text-[11px]">
                Air Temp (Ta):{" "}
                <span className="font-mono text-zinc-200">
                  {afterInterventions
                    ? hoverInfo.object.properties.ta_after
                    : hoverInfo.object.properties.ta_current}
                  °C
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 font-medium mt-1">
                Click block to inspect →
              </div>
            </div>
          )}

          {hoverInfo.layer.id === "extruded-city-buildings-layer" && (
            <div>
              <div className="font-semibold text-zinc-100">{hoverInfo.object.name || "Building Footprint"}</div>
              <div className="text-zinc-400 text-[11px]">Height: {hoverInfo.object.height}m</div>
              <div className="text-amber-400 font-semibold mt-0.5">
                Heat Offset: +{hoverInfo.object.heat_contribution_offset || 0.5}°C
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">Click for driver attribution card</div>
            </div>
          )}

          {hoverInfo.layer.id === "trees-layer" && (
            <div>
              <div className="font-semibold text-emerald-400">{hoverInfo.object.species}</div>
              <div className="text-emerald-300 font-mono font-semibold">
                Cooling Effect: {hoverInfo.object.cooling_contribution}°C
              </div>
              <div className="text-zinc-400 text-[10px]">Canopy Radius: {hoverInfo.object.radius}m</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
