import { create } from "zustand";
import { getRiskDataSync } from "./data";
import { REVIEWER, type AlertOverride } from "./alerts";
import type { Channel } from "./types";

export type TabId = "warning" | "alerts" | "models" | "planning";
export type RiskLayer = "wbgt" | "utci" | "vulnerability";
export type AlertChannelView = "sms" | "whatsapp" | "cap";
export type AlertLang = "en" | "hi";

export const LAST_DAY = 5;

interface UiState {
  activeTab: TabId;
  dayIndex: number;
  layer: RiskLayer;
  is3D: boolean;
  selectedWardId: string | null;
  selectedAlertId: string | null;
  playing: boolean;
  alertOverrides: Record<string, AlertOverride>;
  alertLang: AlertLang;
  alertChannel: AlertChannelView;
  /** Overrides of alerts.settings.channels made in the Alerts settings card. */
  channelToggles: Partial<Record<Channel, boolean>>;

  setTab: (t: TabId) => void;
  setDay: (d: number) => void;
  stepDay: (delta: number) => void;
  setLayer: (l: RiskLayer) => void;
  setIs3D: (v: boolean) => void;
  toggle3D: () => void;
  toggleChannel: (c: Channel, current: boolean) => void;
  selectWard: (id: string | null) => void;
  selectAlert: (id: string | null) => void;
  togglePlay: () => void;
  stopPlay: () => void;
  setAlertLang: (l: AlertLang) => void;
  setAlertChannel: (c: AlertChannelView) => void;
  /** Select the alert for (ward, day) and switch to the Alerts tab. Returns false if none exists. */
  goToAlert: (wardId: string, dayIndex: number) => boolean;
  /** Approve an alert (default: the selected one) if it is awaiting approval. */
  approveSelected: (id?: string) => void;
}

const clampDay = (d: number) => Math.max(0, Math.min(LAST_DAY, d));

export const useStore = create<UiState>()((set, get) => ({
  activeTab: "warning",
  dayIndex: 0,
  layer: "wbgt",
  is3D: false,
  selectedWardId: null,
  selectedAlertId: null,
  playing: false,
  alertOverrides: {},
  alertLang: "en",
  alertChannel: "whatsapp",
  channelToggles: {},

  setTab: (activeTab) => set({ activeTab }),
  setDay: (d) => set({ dayIndex: clampDay(d) }),
  stepDay: (delta) => set((s) => ({ dayIndex: clampDay(s.dayIndex + delta) })),
  setLayer: (layer) => set({ layer }),
  setIs3D: (is3D) => set({ is3D }),
  toggle3D: () => set((s) => ({ is3D: !s.is3D })),
  toggleChannel: (c, current) => set((s) => ({ channelToggles: { ...s.channelToggles, [c]: !current } })),
  selectWard: (selectedWardId) => set({ selectedWardId }),
  selectAlert: (selectedAlertId) => set({ selectedAlertId }),
  togglePlay: () =>
    set((s) => (s.playing ? { playing: false } : { playing: true, dayIndex: s.dayIndex >= LAST_DAY ? 0 : s.dayIndex })),
  stopPlay: () => set({ playing: false }),
  setAlertLang: (alertLang) => set({ alertLang }),
  setAlertChannel: (alertChannel) => set({ alertChannel }),

  goToAlert: (wardId, dayIndex) => {
    const alert = getRiskDataSync()?.alerts.pending.find((a) => a.ward_id === wardId && a.day_index === dayIndex);
    if (!alert) return false;
    set({ activeTab: "alerts", selectedAlertId: alert.id, selectedWardId: wardId, dayIndex, playing: false });
    return true;
  },

  approveSelected: (id) => {
    const { selectedAlertId, alertOverrides } = get();
    const alert = getRiskDataSync()?.alerts.pending.find((a) => a.id === (id ?? selectedAlertId));
    if (!alert || alertOverrides[alert.id] || alert.status !== "pending_approval") return;
    set({
      alertOverrides: {
        ...alertOverrides,
        [alert.id]: { status: "dispatching", approvedBy: REVIEWER, dispatchStartedAt: Date.now() },
      },
    });
  },
}));

/** Number of alerts still awaiting approval (excludes anything approved this session). */
export function selectPendingCount(overrides: Record<string, AlertOverride>): number {
  const pending = getRiskDataSync()?.alerts.pending ?? [];
  return pending.filter((a) => a.status === "pending_approval" && !overrides[a.id]).length;
}
