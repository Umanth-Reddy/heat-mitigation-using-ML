import { BatteryFull, Signal, Wifi } from "lucide-react";

/** Dark-bezel phone frame (320×640) with a status bar. */
export default function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-[320px] h-[640px] shrink-0 rounded-[44px] border-[10px] border-[#1b1e24] bg-black shadow-2xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 pt-2.5 pb-1.5 text-xs font-medium text-white bg-black/60">
        <span className="font-mono tabular-nums">9:41</span>
        <span className="flex items-center gap-1.5">
          <Signal className="w-3.5 h-3.5" />
          <Wifi className="w-3.5 h-3.5" />
          <BatteryFull className="w-4 h-4" />
        </span>
      </div>
      {children}
    </div>
  );
}
