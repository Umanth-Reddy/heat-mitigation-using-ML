"use client";

import { Lock } from "lucide-react";
import { CHANNEL_LABELS } from "@/lib/alerts";
import { useStore } from "@/lib/store";
import type { AlertsData, Channel } from "@/lib/types";

function Switch({ on, locked, label, onChange }: { on: boolean; locked?: boolean; label: string; onChange?: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={locked}
      onClick={onChange}
      className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${on ? "bg-brand" : "bg-white/15"} ${locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

const LANGS: Record<string, string> = { en: "English", hi: "हिंदी" };

export default function AlertSettings({ settings }: { settings: AlertsData["settings"] }) {
  const toggles = useStore((s) => s.channelToggles);
  const toggleChannel = useStore((s) => s.toggleChannel);

  return (
    <section className="card p-4">
      <h3 className="text-sm font-semibold mb-3">Settings</h3>
      <dl className="flex flex-col gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Threshold method</dt>
          <dd>
            {settings.threshold_method} · P95 <span className="font-mono tabular-nums">{settings.wbgt_p95} °C</span> WBGT
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-xs text-muted">Minimum consecutive days</dt>
          <dd className="font-mono tabular-nums">{settings.min_consecutive_days}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-muted" /> Human approval required
          </dt>
          <dd><Switch on locked label="Human approval required (locked on)" /></dd>
        </div>
        <div>
          <dt className="text-xs text-muted mb-2">Channels</dt>
          <dd className="flex flex-col gap-2.5">
            {(Object.keys(CHANNEL_LABELS) as Channel[]).map((c) => {
              const on = toggles[c] ?? settings.channels[c];
              return (
                <div key={c} className="flex items-center justify-between">
                  <span>{CHANNEL_LABELS[c]}</span>
                  <Switch on={on} label={`${CHANNEL_LABELS[c]} channel`} onChange={() => toggleChannel(c, on)} />
                </div>
              );
            })}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-xs text-muted">Languages</dt>
          <dd>{settings.languages.map((l) => LANGS[l] ?? l).join(" · ")}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-xs text-muted">Quiet hours</dt>
          <dd className="font-mono tabular-nums">{settings.quiet_hours}</dd>
        </div>
      </dl>
    </section>
  );
}
