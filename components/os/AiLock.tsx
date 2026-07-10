"use client";

import { motion } from "framer-motion";
import { Lock, Gauge, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTr } from "@/lib/autotranslate";
import { useAiMode, setAiMode } from "@/lib/aimode";

/** The mode switch — "Meter only" vs "AI on". Drop it in a module header. */
export function AiModeToggle({ className }: { className?: string }) {
  const tr = useTr();
  const mode = useAiMode();
  const opt = (id: "meter" | "ai", Icon: typeof Gauge, label: string) => {
    const on = mode === id;
    return (
      <button
        onClick={() => setAiMode(id)}
        className={cn(
          "relative flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
          on ? (id === "ai" ? "text-white" : "text-white/90") : "text-white/45 hover:text-white/70",
        )}
      >
        {on ? (
          <motion.span
            layoutId="aimode-pill"
            className={cn("absolute inset-0 rounded-md", id === "ai" ? "bg-gradient-to-r from-brand-500/80 to-accent-500/80" : "bg-white/10")}
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
          />
        ) : null}
        <Icon size={13} className="relative z-10" />
        <span className="relative z-10 whitespace-nowrap">{label}</span>
      </button>
    );
  };
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="hidden text-[10px] font-medium uppercase tracking-wider text-white/35 sm:block">{tr("Mode")}</span>
      <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
        {opt("meter", Gauge, tr("Meters only"))}
        {opt("ai", Sparkles, tr("AI on"))}
      </div>
    </div>
  );
}

/** Wrap any AI-driven panel. In "meter" mode the content is blurred and a lock
 *  card explains what the AI layer would add here (a real upsell teaser). */
export function AiLock({
  title,
  adds,
  className,
  children,
}: {
  /** what is locked — usually the panel's own name */
  title: string;
  /** one line: what the AI actually contributes here */
  adds: string;
  className?: string;
  children: React.ReactNode;
}) {
  const tr = useTr();
  const mode = useAiMode();
  if (mode === "ai") return <>{children}</>;
  return (
    <div className={cn("relative", className)}>
      <div aria-hidden className="pointer-events-none select-none blur-[3px] saturate-[0.6] opacity-40">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl border border-brand-400/20 bg-ink-950/55 p-5 text-center backdrop-blur-[1px]">
        <span className="grid h-10 w-10 place-items-center rounded-full border border-brand-400/30 bg-brand-400/10 text-brand-300">
          <Lock size={17} />
        </span>
        <p className="text-[13px] font-semibold text-white/90">{tr(title)}</p>
        <p className="max-w-[300px] text-[11.5px] leading-snug text-white/55">
          <span className="font-medium text-brand-200">{tr("AI adds:")}</span> {tr(adds)}
        </p>
        <button onClick={() => setAiMode("ai")} className="btn-glow mt-1 px-3 py-1.5 text-[11.5px]">
          <Sparkles size={12} /> {tr("Unlock with AI")}
        </button>
      </div>
    </div>
  );
}

/** Full-tab lock — used when an entire view is AI-only (e.g. AI Optimization). */
export function AiLockScreen({ title, blurb, features }: { title: string; blurb: string; features: string[] }) {
  const tr = useTr();
  return (
    <div className="panel flex flex-col items-center gap-4 px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/20 to-accent-500/20 text-brand-300">
        <Lock size={24} />
      </span>
      <div>
        <h3 className="text-lg font-semibold text-white/90">{tr(title)}</h3>
        <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-white/50">{tr(blurb)}</p>
      </div>
      <ul className="mx-auto grid max-w-xl gap-2 sm:grid-cols-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-left text-[12px] text-white/65">
            <Sparkles size={13} className="mt-0.5 shrink-0 text-brand-300" /> {tr(f)}
          </li>
        ))}
      </ul>
      <button onClick={() => setAiMode("ai")} className="btn-glow mt-1 px-4 py-2 text-[13px]">
        <Sparkles size={14} /> {tr("Unlock with AI")}
      </button>
    </div>
  );
}
