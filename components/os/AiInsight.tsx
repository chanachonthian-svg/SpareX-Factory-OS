"use client";

import { Sparkles, Search, Lightbulb, TrendingDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type LZ = { en: string; th: string };

/** The standard voice of every FactoryOS AI briefing —
 *  Summary → what AI found → why it thinks so → cost of doing nothing → do this next.
 *  Confidence <70% must read as uncertain; ≥80% reads confident but is still labelled
 *  as an AI prediction (the footnote). */
export type AiBrief = {
  confidence: number; // %
  summary: LZ;
  findings: LZ[];
  why: LZ;
  impact: LZ;
  recommendation: LZ;
  actionLabel?: LZ;
};

function Row({ icon: Icon, label, tone, children, L }: { icon: typeof Search; label: LZ; tone?: "rose" | "emerald"; children: React.ReactNode; L: (o: LZ) => string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
        <Icon size={11} className={tone === "rose" ? "text-rose-300" : tone === "emerald" ? "text-emerald-300" : "text-brand-300"} /> {L(label)}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export function AiInsight({ brief, L, onAction, className }: { brief: AiBrief; L: (o: LZ) => string; onAction?: () => void; className?: string }) {
  const c = brief.confidence;
  const conf =
    c >= 80
      ? { cls: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300", label: { en: `${c}% confident`, th: `มั่นใจ ${c}%` } }
      : c >= 70
        ? { cls: "border-status-warn/30 bg-status-warn/10 text-amber-300", label: { en: `${c}% confident`, th: `มั่นใจ ${c}%` } }
        : { cls: "border-status-warn/30 bg-status-warn/10 text-amber-300", label: { en: `only ${c}% sure — verify on-site first`, th: `มั่นใจแค่ ${c}% — ควรยืนยันหน้างานก่อน` } };
  return (
    <div className={cn("panel relative overflow-hidden p-5", className)}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/12 blur-3xl" />

      {/* header + confidence */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950"><Sparkles size={16} /></span>
        <h3 className="font-semibold">{L({ en: "AI Briefing", th: "AI สรุปให้ฟัง" })}</h3>
        <span className={cn("ml-auto rounded-full border px-2.5 py-0.5 text-[10px] font-medium", conf.cls)}>{L(conf.label)}</span>
      </div>

      {/* 1 · summary */}
      <p className="mt-3 text-[14px] font-medium leading-relaxed text-white/90">{L(brief.summary)}</p>

      <div className="mt-4 space-y-3.5">
        {/* 2 · what AI found */}
        <Row icon={Search} label={{ en: "What AI found", th: "สิ่งที่ AI เจอ" }} L={L}>
          <ul className="space-y-1">
            {brief.findings.map((f) => (
              <li key={f.en} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-white/70">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-300" /> {L(f)}
              </li>
            ))}
          </ul>
        </Row>

        {/* 3 · why */}
        <Row icon={Lightbulb} label={{ en: "Why AI thinks so", th: "ทำไมถึงคิดแบบนั้น" }} L={L}>
          <p className="text-[12.5px] leading-relaxed text-white/70">{L(brief.why)}</p>
        </Row>

        {/* 4 · if nothing changes */}
        <Row icon={TrendingDown} label={{ en: "If nothing changes", th: "ถ้าไม่ทำอะไร" }} tone="rose" L={L}>
          <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--c-rose)" }}>{L(brief.impact)}</p>
        </Row>

        {/* 5 · do this next */}
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300"><ArrowRight size={11} /> {L({ en: "Do this next", th: "ควรทำต่อ" })}</p>
          <p className="mt-1 text-[13px] font-medium leading-relaxed text-white/85">{L(brief.recommendation)}</p>
          {onAction && brief.actionLabel ? (
            <button onClick={onAction} className="btn-glow mt-2.5 px-3 py-1.5 text-[12px]">{L(brief.actionLabel)} <ArrowRight size={12} /></button>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-[10px] text-white/35">{L({ en: "AI prediction — based on live data in this system", th: "การคาดการณ์โดย AI — จากข้อมูลจริงในระบบ ณ ตอนนี้" })}</p>
    </div>
  );
}
