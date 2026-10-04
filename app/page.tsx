"use client";

import { useSyncExternalStore } from "react";
import AppHeader from "@/components/shell/AppHeader";
import CalculatorDrawer from "@/components/shell/CalculatorDrawer";
import IntroScreen from "@/components/shell/IntroScreen";
import { useShellEffects } from "@/components/shell/useShellEffects";
import EarlyWarning from "@/components/warning/EarlyWarning";
import MobileFallback from "@/components/shell/MobileFallback";
import AlertsCentre from "@/components/alerts/AlertsCentre";
import HowItWorks from "@/components/how/HowItWorks";
import ImpactView from "@/components/impact/ImpactView";
import ModelInsights from "@/components/models/ModelInsights";
import PlanningView from "@/components/planning/PlanningView";
import { useRiskData } from "@/lib/data";
import { useStore } from "@/lib/store";

const NARROW = "(max-width: 1023px)";
function subscribeNarrow(cb: () => void) {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export default function Home() {
  const narrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches, () => false);
  const data = useRiskData();
  const activeTab = useStore((s) => s.activeTab);
  useShellEffects();

  if (data.loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg text-muted text-sm font-mono">
        Loading UshnaRaksha risk data…
      </div>
    );
  }
  if (data.error !== null) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg">
        <div className="card p-6 max-w-md">
          <h1 className="text-lg font-semibold mb-2">Could not load risk data</h1>
          <p className="text-sm text-muted font-mono mb-4">{data.error}</p>
          <p className="text-sm text-muted">
            Run <code className="font-mono">python3 scripts/generate_risk_data.py</code> and reload.
          </p>
        </div>
      </div>
    );
  }

  if (narrow) return <MobileFallback />;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-bg text-text font-sans">
      <AppHeader meta={data.meta} />
      <main className="relative flex-1 min-h-0">
        {activeTab === "warning" && <EarlyWarning />}
        {activeTab === "alerts" && <AlertsCentre />}
        {activeTab === "impact" && <ImpactView />}
        {activeTab === "models" && <ModelInsights />}
        {activeTab === "planning" && <PlanningView />}
        {activeTab === "how" && <HowItWorks />}
      </main>
      <CalculatorDrawer />
      <IntroScreen meta={data.meta} />
    </div>
  );
}
