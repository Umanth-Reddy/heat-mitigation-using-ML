import type { TierId } from "./types";

export const TIER_COLORS: Record<TierId, string> = { 0: "#22c55e", 1: "#facc15", 2: "#f97316", 3: "#dc2626" };
export const TIER_LABELS: Record<TierId, string> = { 0: "Green", 1: "Yellow", 2: "Orange", 3: "Red" };

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const TIER_RGB: Record<TierId, [number, number, number]> = {
  0: hexToRgb(TIER_COLORS[0]),
  1: hexToRgb(TIER_COLORS[1]),
  2: hexToRgb(TIER_COLORS[2]),
  3: hexToRgb(TIER_COLORS[3]),
};

/** Highest tier index that has at least one ward/cell in it. */
export function worstTier(byTier: number[]): TierId {
  for (let t = 3; t >= 0; t--) if (byTier[t] > 0) return t as TierId;
  return 0;
}

type RampStop = [number, [number, number, number]];

function rampColor(stops: RampStop[], v: number): [number, number, number] {
  const x = Math.max(stops[0][0], Math.min(stops[stops.length - 1][0], v));
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i];
    const [b, cb] = stops[i + 1];
    if (x <= b) {
      const t = (x - a) / (b - a);
      return [0, 1, 2].map((k) => Math.round(ca[k] + (cb[k] - ca[k]) * t)) as [number, number, number];
    }
  }
  return stops[stops.length - 1][1];
}

const rampCss = (stops: RampStop[]) => `linear-gradient(90deg, ${stops.map(([, c]) => `rgb(${c.join(",")})`).join(", ")})`;

const VULN_STOPS: RampStop[] = [
  [0.2, hexToRgb("#2e1065")],
  [0.55, hexToRgb("#a78bfa")],
  [0.9, hexToRgb("#f5f3ff")],
];
export const VULN_MIN = VULN_STOPS[0][0];
export const VULN_MAX = VULN_STOPS[2][0];
export const VULN_GRADIENT_CSS = rampCss(VULN_STOPS);

/** Sequential violet ramp across 0.2–0.9. */
export const vulnerabilityColor = (v: number) => rampColor(VULN_STOPS, v);

const UTCI_STOPS: RampStop[] = [
  [36, hexToRgb("#f59e0b")],
  [43, hexToRgb("#dc2626")],
  [50, hexToRgb("#7f1d1d")],
];
export const UTCI_MIN = UTCI_STOPS[0][0];
export const UTCI_MAX = UTCI_STOPS[2][0];
export const UTCI_GRADIENT_CSS = rampCss(UTCI_STOPS);

/** Sequential amber -> red -> deep-red ramp across 36–50 °C. */
export const utciColor = (v: number) => rampColor(UTCI_STOPS, v);

/** Thermal ramp shared with the Urban Planning heatmap. */
export const THERMAL_COLOR_RANGE: [number, number, number][] = [
  [255, 247, 176],
  [255, 235, 59],
  [255, 193, 7],
  [255, 152, 0],
  [244, 67, 54],
  [183, 28, 28],
];

export const LST_MIN = 38;
export const LST_MAX = 48;
const LST_STOPS: RampStop[] = THERMAL_COLOR_RANGE.map((c, i) => [LST_MIN + (i * (LST_MAX - LST_MIN)) / (THERMAL_COLOR_RANGE.length - 1), c]);
export const LST_GRADIENT_CSS = rampCss(LST_STOPS);

/** Land surface temperature (static, from grid.geojson `lst_current`) on the thermal ramp across 38–48 °C. */
export const lstColor = (v: number) => rampColor(LST_STOPS, v);

/** 3D extrusion height (m) of a zone for the active layer. */
export function zoneElevation(
  layer: "wbgt" | "utci" | "vulnerability" | "lst",
  cell: { vulnerability: number },
  day: { wbgt: number; utci: number },
  lst: number
): number {
  if (layer === "wbgt") return Math.max(0, day.wbgt - 26) * 60;
  if (layer === "utci") return Math.max(0, day.utci - 36) * 40;
  if (layer === "lst") return Math.max(0, lst - 36) * 40;
  return cell.vulnerability * 400;
}

/** "Today" for day 0, otherwise "Tue 19". */
export function dayTitle(d: { index: number; weekday: string; short: string }): string {
  return d.index === 0 ? "Today" : `${d.weekday} ${d.short.split(" ")[0]}`;
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

/** "Thu 21 May" (day 0 -> "Today"). */
export function dayLabel(d: { index: number; weekday: string; short: string }): string {
  return d.index === 0 ? "Today" : `${d.weekday} ${d.short}`;
}

/** 765,464 -> "765K" for tight KPI tiles. */
export function fmtCompact(n: number): string {
  return n >= 100_000 ? `${Math.round(n / 1000)}K` : fmtInt(n);
}

export const CC_BLUE = "#38bdf8";
