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
