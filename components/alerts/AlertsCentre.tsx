"use client";

import { DISPATCH_MS, effectiveStatus } from "@/lib/alerts";
import { useRiskData } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import AlertHistory, { type HistoryRow } from "./AlertHistory";
import AlertPreview from "./AlertPreview";
import AlertSettings from "./AlertSettings";
import AlertQueue from "./AlertQueue";
import ApprovalPanel from "./ApprovalPanel";

export default function AlertsCentre() {
  const { meta, wards, alerts } = useRiskData();
  const overrides = useStore((s) => s.alertOverrides);
  const selectedAlertId = useStore((s) => s.selectedAlertId);
  const selectAlert = useStore((s) => s.selectAlert);

  // Progress is derived from each alert's stored start time; tick only while a dispatch is in flight.
  const startedAts = Object.values(overrides).flatMap((o) => (o.status === "dispatching" && o.dispatchStartedAt ? [o.dispatchStartedAt] : []));
  const now = useNow(startedAts, DISPATCH_MS + 300);

  if (!meta || !wards || !alerts) return null;
  const list = [...alerts.pending].sort((a, b) => a.day_index - b.day_index || a.ward_id.localeCompare(b.ward_id));
  const selected = list.find((a) => a.id === selectedAlertId) ?? list[0];
  const ward = wards.find((w) => w.ward_id === selected.ward_id);

  // Seed history plus alerts dispatched in this session, newest first.
  const sessionRows: HistoryRow[] = list.flatMap((a) => {
    const o = overrides[a.id];
    if (!o || o.dispatchStartedAt === undefined || effectiveStatus(a, o, now) !== "sent") return [];
    return [{
      id: a.id,
      date: a.date,
      ward: wards.find((w) => w.ward_id === a.ward_id)?.short_name ?? a.ward_name,
      tier: a.tier,
      approvedBy: o.approvedBy ?? "",
      delivered: a.reach.sms + a.reach.whatsapp + a.reach.chw_relay,
      readRate: null,
      sentAt: o.dispatchStartedAt + DISPATCH_MS,
      session: true,
    }];
  });
  const history: HistoryRow[] = [
    ...sessionRows,
    ...alerts.history.map((h) => ({
      id: h.id, date: h.date, ward: h.ward_name, tier: h.tier, approvedBy: h.approved_by,
      delivered: h.delivered, readRate: h.read_rate, sentAt: Date.parse(h.sent_at), session: false,
    })),
  ].sort((a, b) => b.sentAt - a.sentAt);

  return (
    <div className="absolute inset-0 flex anim-fade">
      <AlertQueue alerts={list} meta={meta} wards={wards} overrides={overrides} now={now} selectedId={selected.id} onSelect={selectAlert} />
      <section className="flex-1 min-w-0 overflow-y-auto p-6">
        <div className="mb-5 max-w-2xl mx-auto">
          <h1 className="text-lg font-semibold">{selected.ward_name}</h1>
          <p className="text-sm text-muted">
            {meta.days[selected.day_index].weekday} {meta.days[selected.day_index].short} · <span className="font-mono">{selected.id}</span>
          </p>
        </div>
        <AlertPreview alert={selected} />
      </section>
      <aside className="w-[520px] shrink-0 border-l border-border overflow-y-auto p-5 flex flex-col gap-4">
        <ApprovalPanel alert={selected} ward={ward} override={overrides[selected.id]} now={now} />
        <AlertHistory rows={history} />
        <AlertSettings settings={alerts.settings} />
      </aside>
    </div>
  );
}
