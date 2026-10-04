import { useEffect } from "react";
import { LAST_DAY, useStore } from "@/lib/store";

const PLAY_INTERVAL_MS = 1600;

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
}

/** Forecast playback timer + keyboard shortcuts. Mount once at the app root. */
export function useShellEffects() {
  const playing = useStore((s) => s.playing);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const { dayIndex, stepDay, stopPlay } = useStore.getState();
      if (dayIndex >= LAST_DAY) return stopPlay();
      stepDay(1);
      if (dayIndex + 1 >= LAST_DAY) stopPlay();
    }, PLAY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      const s = useStore.getState();
      const tabs = ["warning", "alerts", "models", "planning"] as const;
      if (e.key >= "1" && e.key <= "4") return s.setTab(tabs[Number(e.key) - 1]);
      if (s.activeTab !== "warning") return;
      if (e.key === "ArrowLeft") s.stepDay(-1);
      else if (e.key === "ArrowRight") s.stepDay(1);
      else if (e.key === "Escape") s.selectWard(null);
      else if (e.key === " ") {
        e.preventDefault(); // no page scroll, and no click on a focused button
        s.togglePlay();
      }
    };
    // Some browsers fire a focused button's click on Space keyup; swallow that too.
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " " && !isTypingTarget(e.target) && useStore.getState().activeTab === "warning") e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
}
