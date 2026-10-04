"use client";

import { effectiveStatus, STATUS_LABELS, type AlertOverride } from "@/lib/alerts";
import { TIER_COLORS } from "@/lib/risk";
import type { PendingAlert, RiskMeta, TierId, Ward } from "@/lib/types";

interface Props {
  alerts: PendingAlert[];
  meta: RiskMeta;
  wards: Ward[];
  overrides: Record<string, AlertOverride>;
  now: number;
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function AlertQueue({ alerts, meta, wards, overrides, now, selectedId, onSelect }: Props) {
  const statusOf = (a: PendingAlert) => effectiveStatus(a, overrides[a.id], now);
  const awaiting = alerts.filter((a) => statusOf(a) === "pending_approval").length;
  const sent = alerts.filter((a) => statusOf(a) === "sent").length;

  const days = [...new Set(alerts.map((a) => a.day_index))].sort((a, b) => a - b);

  return (
    <aside className="w-[320px] shrink-0 border-r border-border flex flex-col min-h-0">
      <div className="grid grid-cols-2 gap-2.5 p-4 border-b border-border">
        <div className="rounded-xl border border-border bg-white/[0.03] p-3">
          <div className="text-xs text-muted">Awaiting</div>
          <div className="text-2xl font-mono tabular-nums font-medium">{awaiting}</div>
        </div>
        <div className="rounded-xl border border-border bg-white/[0.03] p-3">
          <div className="text-xs text-muted">Sent today</div>
          <div className="text-2xl font-mono tabular-nums font-medium">{sent}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {days.map((di) => {
          const d = meta.days[di];
          return (
            <section key={di}>
              <h3 className="text-xs uppercase tracking-wider text-muted mb-2">{`${d.weekday} ${d.short}`}</h3>
              <ul className="flex flex-col gap-1.5">
                {alerts.filter((a) => a.day_index === di).map((a) => {
                  const status = statusOf(a);
                  const selected = a.id === selectedId;
                  const ward = wards.find((w) => w.ward_id === a.ward_id);
                  return (
                    <li key={a.id}>
                      <button
                        onClick={() => onSelect(a.id)}
                        aria-pressed={selected}
                        className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                          selected ? "border-brand bg-white/10" : "border-transparent bg-white/[0.03] hover:bg-white/[0.07]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[11px] font-bold text-black uppercase" style={{ background: TIER_COLORS[a.tier as TierId] }}>
                            {meta.tiers[a.tier].key}
                          </span>
                          <span className="text-sm font-medium flex-1 truncate">{ward?.short_name ?? a.ward_name}</span>
                          <span className="text-xs font-mono tabular-nums">{a.wbgt.toFixed(1)}°</span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            status === "pending_approval" ? "border-brand/60 text-brand" : "border-border text-muted"
                          }`}>
                            {STATUS_LABELS[status]}
                          </span>
                          <span className="text-xs text-muted font-mono tabular-nums">conf {Math.round(a.confidence * 100)}%</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
