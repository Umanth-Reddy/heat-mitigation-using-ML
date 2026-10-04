"use client";

import { CheckCircle2 } from "lucide-react";
import { channelProgress, CHANNEL_LABELS, effectiveStatus, DISPATCH_MS, REVIEWER, STATUS_LABELS, type AlertOverride } from "@/lib/alerts";
import { fmtInt } from "@/lib/risk";
import { useRiskData } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { PendingAlert, Ward } from "@/lib/types";

interface Props {
  alert: PendingAlert;
  ward: Ward | undefined;
  override: AlertOverride | undefined;
  now: number;
}

export default function ApprovalPanel({ alert, ward, override, now }: Props) {
  const approveSelected = useStore((s) => s.approveSelected);
  const toggles = useStore((s) => s.channelToggles);
  const { alerts } = useRiskData();
  const status = effectiveStatus(alert, override, now);
  const adm = ward?.days[alert.day_index].admissions;
  const enabledChannels = alert.channels.filter((c) => toggles[c] ?? alerts?.settings.channels[c] ?? true);
  const switchedOff = alert.channels.length - enabledChannels.length;
  const showProgress = status === "dispatching" || status === "sent";
  const sentAt = override?.dispatchStartedAt
    ? new Date(override.dispatchStartedAt + DISPATCH_MS).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" })
    : null;

  return (
    <>
      <div className="card p-4 flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Human-in-the-loop review</h2>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted">Model confidence</span>
            <span className="font-mono tabular-nums">{Math.round(alert.confidence * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-brand" style={{ width: `${alert.confidence * 100}%` }} />
          </div>
        </div>

        <div className="text-sm">
          <div className="text-xs text-muted mb-0.5">Triggered rule</div>
          {alert.triggered_by}
        </div>

        {adm && (
          <div className="text-sm">
            <div className="text-xs text-muted mb-0.5">Forecast heat admissions (ward, that day)</div>
            <span className="font-mono tabular-nums text-lg">{adm.mean.toFixed(1)}</span>
            <span className="text-xs text-muted font-mono tabular-nums"> range {adm.lo.toFixed(0)}–{adm.hi.toFixed(0)}</span>
          </div>
        )}

        <label className="text-sm block">
          <span className="text-xs text-muted block mb-1">Reviewer</span>
          <input readOnly value={REVIEWER} className="w-full h-9 rounded-lg border border-border bg-white/[0.03] px-3 text-sm text-text" />
        </label>

        {status === "pending_approval" && (
          <button onClick={() => approveSelected(alert.id)} className="h-11 rounded-xl bg-brand text-black font-semibold text-sm hover:brightness-110 transition">
            Approve &amp; dispatch
          </button>
        )}
        {status === "draft" && (
          <button disabled className="h-11 rounded-xl bg-white/5 text-muted text-sm cursor-not-allowed">
            Draft · opens for review closer to the day
          </button>
        )}
        {status === "dispatching" && (
          <button disabled className="h-11 rounded-xl bg-white/10 text-text text-sm cursor-wait">Dispatching…</button>
        )}
        {status === "sent" && (
          <div className="h-11 rounded-xl border border-border flex items-center justify-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Sent ✓ <span className="font-mono tabular-nums text-xs text-muted font-normal">{sentAt} IST</span>
          </div>
        )}
        <div className="text-xs text-muted -mt-2">Status: {STATUS_LABELS[status]}{override?.approvedBy ? ` · approved by ${override.approvedBy}` : ""}</div>
      </div>

      {showProgress && (
        <div className="card p-4 flex flex-col gap-3 anim-fade">
          <h3 className="text-sm font-semibold">Delivery</h3>
          {enabledChannels.map((c, i) => {
            const p = channelProgress(override, i, now);
            const reach = c === "cap" ? null : alert.reach[c];
            return (
              <div key={c}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span>{CHANNEL_LABELS[c]}</span>
                  <span className="font-mono tabular-nums text-muted">
                    {reach === null ? (p >= 1 ? "pushed" : "…") : `${fmtInt(reach * p)} / ${fmtInt(reach)}`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${p * 100}%` }} />
                </div>
              </div>
            );
          })}
          {switchedOff > 0 && <p className="text-xs text-muted">{switchedOff} channel{switchedOff === 1 ? "" : "s"} switched off in Settings.</p>}
        </div>
      )}
    </>
  );
}
