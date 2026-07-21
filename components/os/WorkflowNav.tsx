"use client";

import { Fragment } from "react";
import { Activity, BarChart3, Sparkles, Bot, FileText, Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type LZ = { en: string; th: string };

/** The FactoryOS product spine — every Factory Intelligence module walks the same
 *  5-step decision workflow: Monitor → Insight → AI Analysis → AI Recommendation & Action → Report. */
export const WORKFLOW_STEPS: { key: "monitor" | "insight" | "analysis" | "action" | "report"; label: LZ; icon: LucideIcon; ai?: boolean }[] = [
  { key: "monitor", label: { en: "Monitor", th: "เฝ้าดู" }, icon: Activity },
  { key: "insight", label: { en: "Insight", th: "อินไซต์" }, icon: BarChart3 },
  { key: "analysis", label: { en: "AI Analysis", th: "วิเคราะห์ด้วย AI" }, icon: Sparkles, ai: true },
  { key: "action", label: { en: "AI Recommendation & Action", th: "คำแนะนำ & ลงมือ (AI)" }, icon: Bot, ai: true },
  { key: "report", label: { en: "Report", th: "รายงาน" }, icon: FileText },
];

/** "Conduit" workflow bar — a single compact rail: numbered/checked nodes linked by a
 *  line that energises (green→cyan) as far as the work has travelled. The active stage
 *  keeps its full label (never truncates) and carries a glossy accent token; AI stages
 *  wear an indigo seal. All colours come from theme-aware --wf-* tokens ("Meridian" light
 *  mode). Same API: step / setStep / L. */
export function WorkflowBar({ step, setStep, L }: { step: number; setStep: (i: number) => void; L: (o: LZ) => string }) {
  // per-stage accent group, resolved to CSS custom properties (theme-aware)
  const grp = (ai?: boolean) =>
    ai
      ? { c: "var(--wf-ai)", hi: "var(--wf-ai-hi)", lo: "var(--wf-ai-lo)", ink: "var(--wf-ai-ink)" }
      : { c: "var(--wf-carrier)", hi: "var(--wf-carrier-hi)", lo: "var(--wf-carrier-lo)", ink: "var(--wf-carrier-ink)" };

  return (
    <div className="w-fit max-w-full overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] p-1.5 scrollbar-hide">
      <div className="flex items-center">
        {WORKFLOW_STEPS.map((s, i) => {
          const on = step === i;
          const done = i < step;
          const a = grp(s.ai);
          return (
            <Fragment key={s.key}>
              {/* connector — energised up to the reached node; pulse drifts on the next segment */}
              {i > 0 ? (
                <span className="relative mx-1.5 h-[2px] w-8 shrink-0 rounded-full" style={{ background: i <= step ? "linear-gradient(90deg, var(--wf-done), var(--wf-carrier))" : "var(--wf-rail)" }}>
                  {i === step + 1 ? (
                    <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full" style={{ background: "var(--wf-carrier)" }}>
                      <span className="absolute inset-0 animate-ping rounded-full opacity-70" style={{ background: "var(--wf-carrier)" }} />
                    </span>
                  ) : null}
                </span>
              ) : null}
              <button
                onClick={() => setStep(i)}
                aria-current={on ? "step" : undefined}
                className={cn("group flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition", on ? "shrink-0" : "min-w-0 shrink hover:bg-white/[0.03]")}
                style={on ? { background: `linear-gradient(180deg, color-mix(in srgb, ${a.c} 12%, transparent), transparent 92%)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${a.c} 34%, transparent)` } : undefined}
              >
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold tabular transition"
                  style={
                    on
                      ? { background: `linear-gradient(150deg, ${a.hi} -10%, ${a.c} 50%, ${a.lo} 130%)`, color: a.ink, boxShadow: `0 3px 8px -2px color-mix(in srgb, ${a.c} 55%, transparent), inset 0 1px 0 rgba(255,255,255,0.45)` }
                      : done
                        ? { background: "var(--wf-done-soft)", color: "var(--wf-done)" }
                        : { background: "var(--wf-token)", border: "1px solid var(--wf-token-border)", color: "var(--wf-icon-idle)" }
                  }
                >
                  {done ? <Check size={12} /> : i + 1}
                </span>
                <span className={cn("truncate text-[12px] leading-none", on ? "font-semibold text-white" : done ? "text-white/55" : "text-white/40")}>{L(s.label)}</span>
                {s.ai ? (
                  <span className="shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase leading-none tracking-wide" style={{ backgroundColor: `color-mix(in srgb, var(--wf-ai) ${on ? "24" : "14"}%, transparent)`, color: "var(--wf-ai)" }}>AI</span>
                ) : null}
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
