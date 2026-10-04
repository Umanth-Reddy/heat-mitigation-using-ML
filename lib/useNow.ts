import { useEffect, useState } from "react";

/**
 * Current time in ms. While any timestamp in `startedAts` is younger than `ttlMs`, it refreshes every
 * 100 ms (and stops by itself afterwards), so progress can be derived from a stored start time.
 */
export function useNow(startedAts: number[], ttlMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  const key = startedAts.join(",");

  useEffect(() => {
    if (!key) return;
    const starts = key.split(",").map(Number);
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (starts.every((s) => t - s >= ttlMs)) window.clearInterval(id);
    }, 100);
    return () => window.clearInterval(id);
  }, [key, ttlMs]);

  return now;
}
