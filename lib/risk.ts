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

const VULN_STOPS: [number, [number, number, number]][] = [
  [0.2, hexToRgb("#2e1065")],
  [0.55, hexToRgb("#a78bfa")],
  [0.9, hexToRgb("#f5f3ff")],
];
export const VULN_MIN = VULN_STOPS[0][0];
export const VULN_MAX = VULN_STOPS[2][0];
export const VULN_GRADIENT_CSS = `linear-gradient(90deg, ${VULN_STOPS.map(([, c]) => `rgb(${c.join(",")})`).join(", ")})`;

/** Sequential violet ramp across 0.2–0.9. */
export function vulnerabilityColor(v: number): [number, number, number] {
  const x = Math.max(VULN_MIN, Math.min(VULN_MAX, v));
  for (let i = 0; i < VULN_STOPS.length - 1; i++) {
    const [a, ca] = VULN_STOPS[i];
    const [b, cb] = VULN_STOPS[i + 1];
    if (x <= b) {
      const t = (x - a) / (b - a);
      return [0, 1, 2].map((k) => Math.round(ca[k] + (cb[k] - ca[k]) * t)) as [number, number, number];
    }
  }
  return VULN_STOPS[2][1];
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
