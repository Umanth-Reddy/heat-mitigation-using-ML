"use client";

import React, { useState, useMemo, useEffect } from "react";
import DeckGL from "@deck.gl/react";
import { Map } from "react-map-gl/maplibre";
import { setWorkerUrl } from "maplibre-gl";
import { GeoJsonLayer, PolygonLayer, ScatterplotLayer, BitmapLayer } from "@deck.gl/layers";
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
    roads: {
      type: "raster",
      // Stamen public tiles are deprecated/unreliable; use OSM tiles for stable road rendering.
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
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
    // subtle roads overlay (low-opacity raster tiles) so streets read over imagery
    {
      id: "roads-overlay",
      type: "raster" as const,
      source: "roads",
      minzoom: 10,
      maxzoom: 20,
      paint: {
        "raster-opacity": 0.2,
        "raster-saturation": -1,
        "raster-contrast": 0.35,
      },
    },
  ],
};

// Premium thermal ramp: cool canopy areas stay readable while hotspots glow.
const THERMAL_COLOR_RANGE: [number, number, number][] = [
  [255, 247, 176],
  [255, 235, 59],
  [255, 193, 7],
  [255, 152, 0],
  [244, 67, 54],
  [183, 28, 28],
];

// Building colors use warmer materials without flattening the 3D geometry.
function getBuildingColor(val: number): [number, number, number, number] {
  // Softer, desaturated palette: subtle warm tint on hotspots, neutral grays otherwise
  if (val > 0.85) return [178, 90, 102, 200]; // soft rose
  if (val > 0.65) return [196, 133, 94, 190]; // warm tan
  if (val > 0.45) return [210, 198, 170, 180]; // beige
  if (val > 0.25) return [180, 185, 190, 170]; // muted blue-gray
  return [160, 170, 175, 160]; // base gray-blue
}

function normalizeBuildingCoordinates(coordinates: any): any[][][] {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return [];
  }

  // Some source records are a single closed ring, while Deck.gl expects a polygon
  // shaped as [[[lng, lat], ...]] for a single outer ring.
  if (coordinates[0] && Array.isArray(coordinates[0]) && coordinates[0].length > 0 && typeof coordinates[0][0] === "number") {
    return [coordinates.map((pt: any) => [pt[0], pt[1]])];
  }

  return coordinates;
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
  heatmapMode?: "dynamic" | "raster";
  rasterOpacity?: number;
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
  heatmapMode = "raster",
  rasterOpacity = 0.32,
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
  const [activePulse, setActivePulse] = useState<number>(0);

  useEffect(() => {
    let frameId = 0;

    const animate = (time: number) => {
      setActivePulse((Math.sin(time / 420) + 1) / 2);
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  // Generate sub-point samples for continuous GPU heatmap overlay
  const heatmapPoints = useMemo(() => {
    if (!gridGeoJson || !gridGeoJson.features) return [];
    const points: any[] = [];

    gridGeoJson.features.forEach((feature: any) => {
      const props = feature.properties;
      const lst = afterInterventions ? props.lst_after : props.lst_current;
      const weight = Math.max(0.0, Math.min(1.0, (lst - 40.0) / 8.0));

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

  const layers = useMemo(() => {
    const nextLayers: any[] = [];

    if (showHeatmapOverlay && heatmapMode === "raster" && gridGeoJson && gridGeoJson.features && gridGeoJson.features.length > 0) {
      let minLon = Infinity;
      let minLat = Infinity;
      let maxLon = -Infinity;
      let maxLat = -Infinity;

      gridGeoJson.features.forEach((feature: any) => {
        const bounds = feature.properties?.bounds || feature.bbox;
        if (bounds && bounds.length === 4) {
          minLon = Math.min(minLon, bounds[0]);
          minLat = Math.min(minLat, bounds[1]);
          maxLon = Math.max(maxLon, bounds[2]);
          maxLat = Math.max(maxLat, bounds[3]);
        }
      });

      if (Number.isFinite(minLon)) {
        const imageUrl = afterInterventions ? "/data/heatmap_after.png" : "/data/heatmap_current.png";
        nextLayers.push(
          new BitmapLayer({
            id: "raster-heatmap-image",
            image: imageUrl,
            bounds: [minLon, minLat, maxLon, maxLat],
            opacity: rasterOpacity,
            pickable: false,
            parameters: { depthTest: false },
          })
        );
      }
    }

    // 1. Continuous Thermal GPU Heatmap Overlay directly ON TOP of Voyager Street Map
    if (showHeatmapOverlay && heatmapMode !== "raster" && heatmapPoints.length > 0) {
      nextLayers.push(
        new HeatmapLayer({
          id: "voyager-thermal-heatmap-overlay",
          data: heatmapPoints,
          getPosition: (d: any) => d.position,
          getWeight: (d: any) => d.weight,
          radiusPixels: activeCell ? 58 : 48,
          colorRange: THERMAL_COLOR_RANGE,
          intensity: afterInterventions ? 1.1 : 1.35,
          threshold: 0.025,
          aggregation: "MEAN",
          opacity: activeCell ? 0.38 : 0.46,
        })
      );
    }

    if (gridGeoJson && activeCell) {
      const activeFeatureCollection: any = {
        type: "FeatureCollection",
        features: gridGeoJson.features.filter((feature: any) => feature.properties.cell_id === activeCell.cell_id),
      };
      const activeGlowOpacity = 18 + Math.round(activePulse * 24);

      nextLayers.push(
        new GeoJsonLayer({
          id: "active-cell-glow",
          data: activeFeatureCollection,
          pickable: false,
          stroked: true,
          filled: true,
          extruded: false,
          getFillColor: [160, 188, 214, activeGlowOpacity],
          getLineColor: [238, 247, 255, 190 + Math.round(activePulse * 40)],
          getLineWidth: 2.8 + activePulse * 1.2,
          updateTriggers: {
            getFillColor: [activeCell?.cell_id],
            getLineColor: [activeCell?.cell_id],
            getLineWidth: [activeCell?.cell_id, activePulse],
          },
        })
      );
    }

    // 2. Interactive Cell Click Overlay (Subtle line borders)
    if (gridGeoJson) {
      nextLayers.push(
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
    const buildingData = blockData && blockData.buildings && blockData.buildings.length > 0
      ? blockData.buildings
      : allBuildings;

    const normalizedBuildingData = Array.isArray(buildingData)
      ? buildingData.filter((building: any) => Array.isArray(building?.coordinates) && building.coordinates.length >= 3)
      : [];

    if (normalizedBuildingData.length > 0) {
      nextLayers.push(
        new PolygonLayer({
          id: "extruded-city-buildings-layer",
          data: normalizedBuildingData,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: true,
          wireframe: false,
          material: {
            ambient: 0.28,
            diffuse: 0.82,
            shininess: 56,
            specularColor: [112, 118, 132],
          },
          transitions: {
            getElevation: 700,
            getFillColor: 500,
            getLineColor: 500,
            getLineWidth: 500,
          },
          getPolygon: (d: any) => normalizeBuildingCoordinates(d.coordinates),
          getElevation: (d: any) => {
            const baseHeight = Math.max(10, d.height || 15) * 1.35;
            const isActiveCell = activeCell && d.cell_id === activeCell.cell_id;
            return isActiveCell ? baseHeight * (1.18 + activePulse * 0.12) : baseHeight;
          },
          getFillColor: (d: any) => {
            const isActiveCell = activeCell && d.cell_id === activeCell.cell_id;
            if (selectedObject?.id === d.id) {
              return [215, 234, 246, 220];
            }
            if (isActiveCell) {
              return [203, 211, 199, 182];
            }
            return getBuildingColor(d.heat_driver_value || 0.5);
          },
          getLineColor: (d: any) => {
            const isActiveCell = activeCell && d.cell_id === activeCell.cell_id;
            return selectedObject?.id === d.id || isActiveCell
              ? [255, 255, 255, 220]
              : [18, 24, 34, 180];
          },
          getLineWidth: (d: any) => (selectedObject?.id === d.id ? 2.2 : activeCell && d.cell_id === activeCell.cell_id ? 1.4 : 0.8),
          updateTriggers: {
            getFillColor: [selectedObject?.id, activeCell?.cell_id],
            getElevation: [activeCell?.cell_id],
            getLineColor: [selectedObject?.id, activeCell?.cell_id],
            getLineWidth: [selectedObject?.id, activeCell?.cell_id],
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
      nextLayers.push(
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

    return nextLayers;
  }, [
    activePulse,
    activeCell,
    allBuildings,
    afterInterventions,
    blockData,
    gridGeoJson,
    heatmapMode,
    heatmapPoints,
    onSelectCell,
    onSelectObject,
    rasterOpacity,
    selectedObject?.id,
    showHeatmapOverlay,
  ]);

  return (
    <div
      className="relative w-full h-full bg-zinc-900"
      onContextMenuCapture={(event) => event.preventDefault()}
    >
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
