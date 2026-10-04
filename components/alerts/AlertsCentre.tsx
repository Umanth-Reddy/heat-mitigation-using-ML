"use client";

import { DISPATCH_MS } from "@/lib/alerts";
import { useRiskData } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import AlertPreview from "./AlertPreview";
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
      <ApprovalPanel alert={selected} ward={ward} override={overrides[selected.id]} now={now} />
    </div>
  );
}
