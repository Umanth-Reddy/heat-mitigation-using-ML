"use client";

import { useState } from "react";
import { BadgeCheck, Check, ChevronLeft, Copy } from "lucide-react";
import PhoneMockup from "./PhoneMockup";
import { CHANNEL_LABELS } from "@/lib/alerts";
import { fmtInt } from "@/lib/risk";
import { useStore, type AlertChannelView } from "@/lib/store";
import type { PendingAlert } from "@/lib/types";

const TABS: { id: AlertChannelView; label: string }[] = [
  { id: "sms", label: "SMS" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "cap", label: "CAP XML" },
];

/** Render WhatsApp-style *bold* and keep line breaks and emoji. */
function WhatsAppText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <div key={i} className="min-h-[1.25em]">
          {line.split(/(\*[^*]+\*)/g).map((part, j) =>
            part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
              <strong key={j} className="font-semibold">{part.slice(1, -1)}</strong>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </div>
      ))}
    </>
  );
}

function SmsPhone({ text }: { text: string }) {
  return (
    <PhoneMockup>
      <div className="flex flex-col flex-1 min-h-0 bg-[#0d0d0f]">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10 bg-[#161618]">
          <ChevronLeft className="w-5 h-5 text-sky-400" />
          <div className="w-8 h-8 rounded-full bg-zinc-600 flex items-center justify-center text-xs font-semibold">U</div>
          <div className="leading-tight">
            <div className="text-sm font-medium">UshnaRaksha</div>
            <div className="text-xs text-zinc-400 font-mono">VM-USHNRK</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-center text-xs text-zinc-500 mb-2">Text message · Today 06:00</div>
          <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-[#2b2b2e] px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-100 whitespace-pre-wrap">
            {text}
          </div>
        </div>
      </div>
    </PhoneMockup>
  );
}

function WhatsAppPhone({ text }: { text: string }) {
  return (
    <PhoneMockup>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-[#12332b]">
          <ChevronLeft className="w-5 h-5 text-white" />
          <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-xs font-bold text-black">U</div>
          <div className="leading-tight">
            <div className="text-sm font-medium flex items-center gap-1">
              UshnaRaksha Alerts <BadgeCheck className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xs text-emerald-200/70">official alerts</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 bg-[#0b141a]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)", backgroundSize: "14px 14px" }}>
          <div className="max-w-[94%] rounded-xl rounded-tl-sm bg-[#202c33] px-3 py-2 text-[13px] leading-snug text-[#e9edef]">
            <WhatsAppText text={text} />
            <div className="text-right text-[11px] text-zinc-400 mt-1 font-mono">06:00</div>
          </div>
        </div>
      </div>
    </PhoneMockup>
  );
}

function CapView({ xml }: { xml: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(xml);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (insecure context): ignore */
    }
  };
  return (
    <div className="w-full max-w-2xl">
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-xs text-muted font-mono">cap-1.2.xml</span>
          <button onClick={copy} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-border hover:bg-white/10">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="p-4 text-xs leading-relaxed font-mono text-text overflow-auto max-h-[560px] whitespace-pre">{xml}</pre>
      </div>
      <p className="text-xs text-muted mt-2">CAP 1.2 · compatible with NDMA SACHET</p>
    </div>
  );
}

export default function AlertPreview({ alert }: { alert: PendingAlert }) {
  const channel = useStore((s) => s.alertChannel);
  const lang = useStore((s) => s.alertLang);
  const setChannel = useStore((s) => s.setAlertChannel);
  const setLang = useStore((s) => s.setAlertLang);

  const text = channel === "sms" ? alert.messages[lang === "en" ? "sms_en" : "sms_hi"] : alert.messages[lang === "en" ? "whatsapp_en" : "whatsapp_hi"];

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <div className="card p-1 flex gap-1" role="tablist" aria-label="Channel">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={channel === t.id}
              onClick={() => setChannel(t.id)}
              className={`px-4 h-8 rounded-lg text-sm transition-colors ${channel === t.id ? "bg-white/10 text-text font-medium" : "text-muted hover:text-text"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {channel !== "cap" && (
          <div className="card p-1 flex gap-1" role="group" aria-label="Language">
            {(["en", "hi"] as const).map((l) => (
              <button
                key={l}
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
                className={`px-3.5 h-8 rounded-lg text-sm transition-colors ${lang === l ? "bg-brand text-black font-medium" : "text-muted hover:text-text"}`}
              >
                {l === "en" ? "EN" : "हिंदी"}
              </button>
            ))}
          </div>
        )}
      </div>

      {channel === "sms" && <SmsPhone text={text} />}
      {channel === "whatsapp" && <WhatsAppPhone text={text} />}
      {channel === "cap" && <CapView xml={alert.cap_xml} />}

      <div className="card w-full max-w-2xl p-4 text-sm grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5">
        <span className="text-muted">Triggered by</span>
        <span>{alert.triggered_by}</span>
        <span className="text-muted">Channels</span>
        <span className="flex flex-wrap gap-1.5">
          {alert.channels.map((c) => (
            <span key={c} className="px-2 py-0.5 rounded-md border border-border text-xs">{CHANNEL_LABELS[c]}</span>
          ))}
        </span>
        <span className="text-muted">Reach</span>
        <span className="font-mono tabular-nums text-xs flex flex-wrap gap-x-5 gap-y-1">
          <span>SMS {fmtInt(alert.reach.sms)}</span>
          <span>WhatsApp {fmtInt(alert.reach.whatsapp)}</span>
          <span>CHW relay {fmtInt(alert.reach.chw_relay)}</span>
        </span>
      </div>
    </div>
  );
}
