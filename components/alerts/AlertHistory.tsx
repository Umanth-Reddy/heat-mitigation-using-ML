"use client";

import { fmtCompact, TIER_COLORS, TIER_LABELS } from "@/lib/risk";
import type { TierId } from "@/lib/types";

export interface HistoryRow {
  id: string;
  date: string; // ISO yyyy-mm-dd
  ward: string;
  tier: TierId;
  approvedBy: string;
  delivered: number;
  readRate: number | null;
  sentAt: number; // epoch ms, for ordering
  session: boolean;
}

const shortDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** "Dr. A. Mehta (Health Officer)" -> "Dr. A. Mehta"; "R. Sharma — Heat Cell…" -> "R. Sharma". */
const shortName = (s: string) => s.split(/ \(| — /)[0];

export default function AlertHistory({ rows }: { rows: HistoryRow[] }) {
  return (
    <section className="card p-4">
      <h3 className="text-sm font-semibold mb-3">History</h3>
      <table className="w-full table-fixed text-xs border-collapse">
        <thead>
          <tr className="text-muted text-left">
            <th className="font-normal pb-2 w-[54px]">Date</th>
            <th className="font-normal pb-2">Ward</th>
            <th className="font-normal pb-2 w-[70px]">Tier</th>
            <th className="font-normal pb-2 w-[96px]">Approved by</th>
            <th className="font-normal pb-2 w-[64px] text-right">Delivered</th>
            <th className="font-normal pb-2 w-[44px] text-right">Read</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={`border-t border-border align-top ${r.session ? "bg-white/[0.04]" : ""}`}>
              <td className="py-2 pr-1 font-mono tabular-nums text-muted whitespace-nowrap">{shortDate(r.date)}</td>
              <td className="py-2 pr-1">{r.ward}</td>
              <td className="py-2 pr-1 whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TIER_COLORS[r.tier] }} />
                  {TIER_LABELS[r.tier]}
                </span>
              </td>
              <td className="py-2 pr-1 whitespace-nowrap overflow-hidden text-ellipsis" title={r.approvedBy}>{shortName(r.approvedBy)}</td>
              <td className="py-2 font-mono tabular-nums text-right">{fmtCompact(r.delivered)}</td>
              <td className="py-2 font-mono tabular-nums text-right text-muted">{r.readRate === null ? "—" : `${Math.round(r.readRate * 100)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted mt-2.5">Highlighted rows were dispatched in this session.</p>
    </section>
  );
}
