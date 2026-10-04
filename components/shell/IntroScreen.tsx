"use client";

import { useEffect, useState } from "react";
import { Sun } from "lucide-react";
import { useStore } from "@/lib/store";
import type { RiskMeta } from "@/lib/types";

const COUNT_MS = 1200;

/** Counts from 0 to `to` over COUNT_MS (ease-out). */
function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const tick = (t: number) => {
      start ??= t;
      const p = Math.min(1, (t - start) / COUNT_MS);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{v.toLocaleString("en-IN")}</>;
}

/** Full-screen title card for the demo video: ?intro=1 or press I; Enter, Space or a click dismisses it. */
export default function IntroScreen({ meta }: { meta: RiskMeta }) {
  const open = useStore((s) => s.introOpen);
  const closing = useStore((s) => s.introClosing);
  const openIntro = useStore((s) => s.openIntro);
  const dismissIntro = useStore((s) => s.dismissIntro);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("intro") === "1") openIntro();
  }, [openIntro]);

  if (!open) return null;

  const stats = [
    { to: 5, suffix: "-day", label: "forecast" },
    { to: meta.city.n_zones, suffix: "", label: "zones · ~120 m" },
    { to: meta.city.population, suffix: "", label: "people covered" },
  ];

  return (
    <div
      role="dialog"
      aria-label="UshnaRaksha title screen"
      onClick={dismissIntro}
      className={`fixed inset-0 z-[100] bg-bg flex flex-col items-center justify-center text-center px-10 cursor-pointer select-none transition-opacity duration-[400ms] ease-out ${
        closing ? "opacity-0" : "opacity-100 anim-fade"
      }`}
    >
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-gradient-to-br from-[#ffb347] to-brand shadow-[0_0_80px_rgba(255,122,26,0.35)]">
        <Sun className="w-11 h-11 text-black" strokeWidth={2.2} />
      </div>
      <h1 className="text-7xl font-semibold tracking-tight mt-8">UshnaRaksha</h1>
      <div className="text-3xl text-muted mt-3">उष्णरक्षा</div>
      <p className="text-xl text-muted max-w-3xl mt-8 leading-relaxed">{meta.tagline}</p>

      <div className="flex gap-20 mt-14">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-5xl font-mono tabular-nums font-medium text-text">
              <CountUp to={s.to} />
              {s.suffix}
            </div>
            <div className="text-sm text-muted mt-2">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-10 text-sm text-muted">SIH 2026 · SIH26083 · Good Team</div>
    </div>
  );
}
