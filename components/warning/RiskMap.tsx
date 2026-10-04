"use client";

import { useMemo, useState } from "react";
import DeckGL from "@deck.gl/react";
import { Map } from "react-map-gl/maplibre";
import { setWorkerUrl } from "maplibre-gl";
import { FlyToInterpolator, LinearInterpolator, WebMercatorViewport } from "@deck.gl/core";
import { GeoJsonLayer, TextLayer } from "@deck.gl/layers";
import "maplibre-gl/dist/maplibre-gl.css";
import { useGridGeoJson, useRiskData } from "@/lib/data";
import { useStore } from "@/lib/store";
import { lstColor, TIER_COLORS, TIER_LABELS, TIER_RGB, utciColor, vulnerabilityColor, zoneElevation } from "@/lib/risk";
import FacilityMarkers from "./FacilityMarkers";
import type { TierId } from "@/lib/types";

setWorkerUrl("/maplibre-worker.mjs");

// Esri Dark Gray Canvas: free, no key. (CARTO Dark Matter now serves an "API KEY REQUIRED" watermark tile.)
const BASEMAP: any = {
  version: 8,
  sources: {
    dark: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Tiles © Esri — Esri, DeLorme, NAVTEQ",
      maxzoom: 16,
    },
  },
  layers: [{ id: "dark-gray", type: "raster", source: "dark" }],
};

// Centre sits west/south of the grid so the zones read as centred between the side panels and above the timeline.
const INITIAL_VIEW_STATE: any = {
  longitude: 77.2165,
  latitude: 28.6291,
  zoom: 14.4,
  pitch: 0,
  bearing: -8,
  minZoom: 13,
  maxZoom: 18,
};

const AMBER: [number, number, number, number] = [255, 122, 26, 255];

const PITCH_3D = 50;
const FLY = new FlyToInterpolator();
const TILT = new LinearInterpolator(["pitch"]);
// Room left for the side panels when fitting a ward (panel width + gutters), the timeline and the header.
const FIT_PADDING = { left: 392, right: 452, top: 60, bottom: 210 };

function fitWard(bbox: [number, number, number, number], size: { width: number; height: number } | null, bearing: number) {
  const [w, s, e, n] = bbox;
  const center = { longitude: (w + e) / 2, latitude: (s + n) / 2, zoom: 16 };
  if (!size) return center;
  try {
    const vp = new WebMercatorViewport({ width: size.width, height: size.height }).fitBounds(
      [[w, s], [e, n]],
      { padding: FIT_PADDING, maxZoom: 17 }
    );
    return { longitude: vp.longitude, latitude: vp.latitude, zoom: vp.zoom, bearing };
  } catch {
    return center; // viewport smaller than the padding
  }
}

interface Hover {
  x: number;
  y: number;
  cellId: string;
}

export default function RiskMap() {
  const { meta, cells, wards, outlines } = useRiskData();
  const grid = useGridGeoJson();
  const dayIndex = useStore((s) => s.dayIndex);
  const layer = useStore((s) => s.layer);
  const selectedWardId = useStore((s) => s.selectedWardId);
  const selectWard = useStore((s) => s.selectWard);
  const is3D = useStore((s) => s.is3D);
  const selectFacility = useStore((s) => s.selectFacility);
  const [viewState, setViewState] = useState<any>(() => ({ ...INITIAL_VIEW_STATE, pitch: is3D ? PITCH_3D : 0 }));
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  // Camera: fly to the selected ward / back to the overview, and tilt when 3D is toggled.
  // (State adjusted during render when the store values change: no effect needed.)
  const [seen, setSeen] = useState({ wardId: selectedWardId, is3D });
  if (seen.wardId !== selectedWardId || seen.is3D !== is3D) {
    setSeen({ wardId: selectedWardId, is3D });
    const pitch = is3D ? PITCH_3D : 0;
    if (seen.wardId !== selectedWardId) {
      const ward = selectedWardId ? wards?.find((w) => w.ward_id === selectedWardId) : null;
      const target = ward ? fitWard(ward.bbox, size, viewState.bearing) : INITIAL_VIEW_STATE;
      setViewState({ ...viewState, ...target, pitch, transitionDuration: 1200, transitionInterpolator: FLY });
    } else {
      setViewState({ ...viewState, pitch, transitionDuration: 800, transitionInterpolator: TILT });
    }
  }

  const layers = useMemo(() => {
    if (!grid || !cells || !wards || !outlines) return [];
    const selectedOutline = selectedWardId
      ? { ...outlines, features: outlines.features.filter((f) => f.properties?.ward_id === selectedWardId) }
      : null;

    return [
      new GeoJsonLayer({
        id: "risk-zones",
        data: grid as any,
        pickable: true,
        filled: true,
        stroked: false,
        // Always extruded: in 2D the elevation is 0 and unlit, so heights can animate when 3D toggles or the day changes.
        extruded: true,
        wireframe: false,
        material: is3D ? { ambient: 0.6, diffuse: 0.55, shininess: 16, specularColor: [40, 40, 40] } : false,
        getElevation: (f: any) => {
          const cell = cells[f.properties.cell_id];
          return is3D && cell ? zoneElevation(layer, cell, cell.days[dayIndex], f.properties.lst_current) : 0;
        },
        getFillColor: (f: any) => {
          const cell = cells[f.properties.cell_id];
          if (!cell) return [0, 0, 0, 0];
          const dim = selectedWardId !== null && cell.ward_id !== selectedWardId;
          if (layer === "wbgt") {
            const rgb = TIER_RGB[cell.days[dayIndex].tier];
            return [...rgb, dim ? 60 : 190] as [number, number, number, number];
          }
          if (layer === "lst") {
            return [...lstColor(f.properties.lst_current), dim ? 60 : 200] as [number, number, number, number];
          }
          if (layer === "utci") {
            return [...utciColor(cell.days[dayIndex].utci), dim ? 60 : 200] as [number, number, number, number];
          }
          const rgb = vulnerabilityColor(cell.vulnerability);
          return [...rgb, dim ? 60 : 200] as [number, number, number, number];
        },
        transitions: { getFillColor: 600, getElevation: 600 },
        updateTriggers: { getFillColor: [dayIndex, layer, selectedWardId], getElevation: [dayIndex, layer, is3D] },
        onHover: (info: any) =>
          setHover(info.object ? { x: info.x, y: info.y, cellId: info.object.properties.cell_id } : null),
        onClick: (info: any) => {
          const cell = info.object && cells[info.object.properties.cell_id];
          if (cell) selectWard(cell.ward_id);
        },
      }),
      new GeoJsonLayer({
        id: "ward-outlines",
        data: outlines as any,
        pickable: false,
        filled: false,
        stroked: true,
        lineWidthUnits: "pixels",
        getLineWidth: 1.5,
        getLineColor: [255, 255, 255, 230],
        parameters: { depthTest: false },
      }),
      new GeoJsonLayer({
        id: "ward-outline-selected",
        data: (selectedOutline ?? { type: "FeatureCollection", features: [] }) as any,
        pickable: false,
        filled: false,
        stroked: true,
        lineWidthUnits: "pixels",
        getLineWidth: 3,
        getLineColor: AMBER,
        parameters: { depthTest: false },
      }),
      new TextLayer({
        id: "ward-labels",
        data: wards,
        pickable: false,
        getPosition: (w: any) => w.centroid,
        getText: (w: any) => w.short_name,
        getSize: 13,
        sizeUnits: "pixels",
        getColor: [255, 255, 255, 255],
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontWeight: 600,
        fontSettings: { sdf: true },
        outlineWidth: 3,
        outlineColor: [7, 9, 12, 240],
        characterSet: "auto",
        parameters: { depthTest: false },
      }),
    ];
  }, [grid, cells, wards, outlines, dayIndex, layer, is3D, selectedWardId, selectWard]);

  const lstById = useMemo(
    () => Object.fromEntries((grid?.features ?? []).map((f: any) => [f.properties.cell_id, f.properties.lst_current as number])),
    [grid]
  );
  const tip = hover && cells && meta && wards ? cells[hover.cellId] : null;
  const tipDay = tip && meta ? tip.days[dayIndex] : null;
  const tipWard = tip && wards ? wards.find((w) => w.ward_id === tip.ward_id) : null;
  const utciCat = tipDay && meta ? meta.utci_categories.find((c) => tipDay.utci >= c.min && tipDay.utci < c.max) : null;

  return (
    <div className="absolute inset-0 bg-bg" onContextMenuCapture={(e) => e.preventDefault()}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        onResize={({ width, height }) => setSize({ width, height })}
        onClick={() => selectFacility(null)}
        controller={{ doubleClickZoom: false }}
        layers={layers}
        getCursor={({ isHovering }) => (isHovering ? "pointer" : "grab")}
      >
        <Map mapStyle={BASEMAP} />
      </DeckGL>
      <FacilityMarkers viewState={viewState} size={size} />

      {hover && tip && tipDay && (
        <div
          className="absolute pointer-events-none z-30 card px-3.5 py-3 text-sm min-w-56 shadow-2xl"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <div className="font-semibold text-text">{tipWard?.short_name}</div>
          <div className="text-xs text-muted font-mono mb-2">{tip.cell_id}</div>
          <Row label="WBGT">
            <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ background: TIER_COLORS[tipDay.tier as TierId] }} />
            {tipDay.wbgt.toFixed(1)} °C · {TIER_LABELS[tipDay.tier as TierId]}
          </Row>
          <Row label="UTCI">
            {tipDay.utci.toFixed(1)} °C{utciCat ? ` · ${utciCat.label}` : ""}
          </Row>
          <Row label="Surface temp (LST)">{lstById[hover.cellId]?.toFixed(1)} °C</Row>
          <Row label="Air temp / RH">
            {tipDay.ta.toFixed(1)} °C · {tipDay.rh}%
          </Row>
          <Row label="Population">{tip.population.toLocaleString("en-IN")}</Row>
          <Row label="Vulnerability">{tip.vulnerability.toFixed(2)}</Row>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs py-0.5">
      <span className="text-muted">{label}</span>
      <span className="font-mono tabular-nums text-text">{children}</span>
    </div>
  );
}
