import type { AlertStatus, PendingAlert } from "./types";

export interface AlertOverride {
  status: AlertStatus;
  approvedBy?: string;
  /** epoch ms when "Approve & dispatch" was pressed; progress is derived from this. */
  dispatchStartedAt?: number;
}

export const DISPATCH_MS = 2500;
const CHANNEL_STAGGER_MS = 300;
const CHANNEL_RUN_MS = DISPATCH_MS - 3 * CHANNEL_STAGGER_MS;

export const REVIEWER = "R. Sharma — Heat Cell Nodal Officer";

/** Effective status: a "dispatching" override turns into "sent" once DISPATCH_MS has elapsed. */
export function effectiveStatus(alert: PendingAlert, override: AlertOverride | undefined, now: number): AlertStatus {
  if (!override) return alert.status;
  if (override.status === "dispatching" && override.dispatchStartedAt !== undefined && now - override.dispatchStartedAt >= DISPATCH_MS) {
    return "sent";
  }
  return override.status;
}

/** 0..1 progress of the i-th channel row, staggered. */
export function channelProgress(override: AlertOverride | undefined, channelIndex: number, now: number): number {
  if (!override || override.dispatchStartedAt === undefined) return 0;
  const t = now - override.dispatchStartedAt - channelIndex * CHANNEL_STAGGER_MS;
  return Math.max(0, Math.min(1, t / CHANNEL_RUN_MS));
}

export const STATUS_LABELS: Record<AlertStatus, string> = {
  pending_approval: "Awaiting approval",
  draft: "Draft",
  approved: "Approved",
  dispatching: "Dispatching…",
  sent: "Sent ✓",
  rejected: "Rejected",
};
