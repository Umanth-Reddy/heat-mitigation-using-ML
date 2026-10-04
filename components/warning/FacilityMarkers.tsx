"use client";

import { Hospital as HospitalIcon, Snowflake } from "lucide-react";
import { WebMercatorViewport } from "@deck.gl/core";
import { useRiskData } from "@/lib/data";
import { useStore } from "@/lib/store";
import { CC_BLUE } from "@/lib/risk";
import type { CoolingCentre, Hospital } from "@/lib/types";

const AMBER = "#f59e0b";
const RED = "#dc2626";

type Project = (lngLat: [number, number]) => [number, number];

/** A DOM marker placed over the map at a projected position (deck.gl's view container sits above react-map-gl markers). */
function Pinned({ at, project, z, children }: { at: [number, number]; project: Project; z: number; children: React.ReactNode }) {
  const [x, y] = project(at);
  return (
    <div className="absolute pointer-events-auto" style={{ left: x, top: y, transform: "translate(-50%, -50%)", zIndex: z }}>
      {children}
    </div>
  );
}

function OccupancyBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

function Popover({ title, subtitle, rows, pct, barColor, status }: {
  title: string; subtitle: string; rows: [string, string][]; pct: number; barColor: string; status: string;
}) {
  return (
    <div
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 card p-3.5 text-left shadow-2xl cursor-default anim-fade"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-sm font-semibold leading-tight">{title}</div>
      <div className="text-xs text-muted mb-2.5">{subtitle}</div>
      <dl className="flex flex-col gap-1 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-muted">{k}</dt>
            <dd className="font-mono tabular-nums text-text text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center justify-between text-xs mt-3 mb-1.5">
        <span className="text-muted">Occupancy</span>
        <span className="font-mono tabular-nums">{pct}%</span>
      </div>
      <OccupancyBar pct={pct} color={barColor} />
      <div className="text-xs mt-2">
        <span className="text-muted">Status: </span>
        {status}
      </div>
    </div>
  );
}

function CoolingMarker({ c, day, selected, onSelect, project }: { c: CoolingCentre; day: number; selected: boolean; onSelect: () => void; project: Project }) {
  const d = c.days[day];
  const full = d.open && d.occupancy_pct >= 100;
  return (
    <Pinned at={c.position} project={project} z={selected ? 20 : 5}>
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          aria-label={`Cooling centre: ${c.name}${d.open ? "" : " (closed)"}`}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity"
          style={{
            background: d.open ? CC_BLUE : "#6b7280",
            opacity: d.open ? 1 : 0.5,
            boxShadow: full ? `0 0 0 3px ${AMBER}` : "0 1px 6px rgba(0,0,0,0.6)",
          }}
        >
          <Snowflake className="w-[18px] h-[18px] text-[#06202e]" strokeWidth={2.4} />
        </button>
        {selected && (
          <Popover
            title={c.name}
            subtitle={`Cooling centre · ${d.open ? `open ${d.hours}` : "closed this day"}`}
            rows={[["Capacity", `${c.capacity}`], ["Expected visitors", `${d.expected_visitors}`]]}
            pct={d.occupancy_pct}
            barColor={d.occupancy_pct >= 100 ? AMBER : CC_BLUE}
            status={!d.open ? "Closed" : d.occupancy_pct >= 100 ? "Over capacity" : "Open"}
          />
        )}
      </div>
    </Pinned>
  );
}

function HospitalMarker({ h, day, selected, onSelect, project }: { h: Hospital; day: number; selected: boolean; onSelect: () => void; project: Project }) {
  const d = h.days[day];
  const ring = d.status === "surge" ? RED : d.status === "high" ? AMBER : null;
  return (
    <Pinned at={h.position} project={project} z={selected ? 20 : 6}>
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          aria-label={`Hospital: ${h.name} (${d.status})`}
          className={`w-8 h-8 rounded-full bg-white flex items-center justify-center ${d.status === "surge" ? "ur-pulse" : ""}`}
          style={{ boxShadow: ring ? `0 0 0 3px ${ring}` : "0 1px 6px rgba(0,0,0,0.6)", color: ring ?? "#111827" }}
        >
          <HospitalIcon className="w-[18px] h-[18px]" strokeWidth={2.2} />
        </button>
        {selected && (
          <Popover
            title={h.name}
            subtitle={`${h.type} · ${h.beds_total.toLocaleString("en-IN")} beds`}
            rows={[["Heat-stroke beds", `${h.heat_beds}`], ["Expected admissions", `${d.expected_admissions.toFixed(1)}`], ["Beds occupied", `${d.occupied}`]]}
            pct={d.occupancy_pct}
            barColor={d.status === "surge" ? RED : d.status === "high" ? AMBER : "#9ca3af"}
            status={d.status === "surge" ? "Surge: over capacity" : d.status === "high" ? "High load" : "Normal"}
          />
        )}
      </div>
    </Pinned>
  );
}

/** Overlay above the map; `viewState` is the same controlled view state DeckGL renders with. */
export default function FacilityMarkers({ viewState, size }: { viewState: any; size: { width: number; height: number } | null }) {
  const { facilities } = useRiskData();
  const dayIndex = useStore((s) => s.dayIndex);
  const show = useStore((s) => s.showFacilities);
  const selectedId = useStore((s) => s.selectedFacilityId);
  const select = useStore((s) => s.selectFacility);
  if (!facilities || !show || !size) return null;

  const vp = new WebMercatorViewport({
    width: size.width, height: size.height,
    longitude: viewState.longitude, latitude: viewState.latitude, zoom: viewState.zoom,
    pitch: viewState.pitch ?? 0, bearing: viewState.bearing ?? 0,
  });
  const project: Project = (p) => vp.project(p) as [number, number];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {facilities.cooling_centres.map((c) => (
        <CoolingMarker key={c.id} c={c} day={dayIndex} project={project} selected={selectedId === c.id} onSelect={() => select(selectedId === c.id ? null : c.id)} />
      ))}
      {facilities.hospitals.map((h) => (
        <HospitalMarker key={h.id} h={h} day={dayIndex} project={project} selected={selectedId === h.id} onSelect={() => select(selectedId === h.id ? null : h.id)} />
      ))}
    </div>
  );
}
