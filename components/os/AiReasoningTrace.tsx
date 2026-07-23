"use client";

import { useEffect, useState } from "react";
import { Activity, ScrollText, Radar, ListOrdered, Check, Loader2, Sparkles } from "lucide-react";
import { ruleById, type RuleCategory, type Finding } from "@/lib/rules";
import { useLiveReadings } from "@/lib/use-readings";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Glass-box step-3 opener: instead of jumping to finished findings, it plays the
 *  four analysis stages the engine actually runs — read → compare standards →
 *  detect & rank → cost — then reveals the findings that came out of the real
 *  rule engine (each citing the standard it crossed). Same engine everywhere, so
 *  when SpareX Connect feeds live readings this trace is real, not a mock. */

type LZ = { en: string; th: string };

export function AiReasoningTrace({
  categories,
  pointsLabel,
}: {
  categories: RuleCategory[];
  pointsLabel: LZ;
}) {
  const { locale } = useI18n();
  const L = (o: LZ) => (locale === "th" ? o.th : o.en);

  // real engine on LIVE device readings when SpareX Connect has them (demo
  // registry otherwise) — scoped to this module's rule categories
  const readings = useLiveReadings();
  const findings: Finding[] = readings.findings.filter((f) => {
    const r = ruleById(f.ruleId);
    return r ? categories.includes(r.category) : false;
  });
  const standards = [...new Set(findings.map((f) => ruleById(f.ruleId)?.standard).filter(Boolean))] as string[];
  const totalBaht = findings.reduce((s, f) => s + f.bahtAtRisk, 0);

  // staged reveal — each stage lights up in sequence
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const t = [420, 900, 1400, 1900].map((ms, i) => setTimeout(() => setStage(i + 1), ms));
    return () => t.forEach(clearTimeout);
  }, []);

  const steps: { icon: typeof Activity; label: LZ; detail: LZ }[] = [
    {
      icon: Activity,
      label: { en: "Read readings", th: "อ่านค่า" },
      detail: readings.live
        ? { en: `${readings.devices.length} device(s) via SpareX Connect · now`, th: `${readings.devices.length} อุปกรณ์ผ่าน SpareX Connect · ปัจจุบัน` }
        : pointsLabel,
    },
    { icon: ScrollText, label: { en: "Compare against standards", th: "เทียบมาตรฐานวิศวกรรม" }, detail: { en: standards.join(" · ") || "—", th: standards.join(" · ") || "—" } },
    { icon: Radar, label: { en: "Detect deviations", th: "ตรวจจับที่ผิดเกณฑ์" }, detail: { en: `${findings.length} findings`, th: `พบ ${findings.length} เรื่อง` } },
    { icon: ListOrdered, label: { en: "Rank by ฿ at risk", th: "จัดอันดับตามเงินเสี่ยง" }, detail: { en: `฿${totalBaht.toLocaleString()} exposure`, th: `฿${totalBaht.toLocaleString()} ที่เสี่ยง` } },
  ];
  const done = stage >= steps.length;

  const sevColor = (s: Finding["severity"]) => (s === "critical" ? "#f43f5e" : "#f59e0b");

  return (
    <section className="panel p-5" style={{ background: "linear-gradient(180deg, rgba(34,211,238,0.08), transparent 82%)", borderColor: "rgba(34,211,238,0.28)" }}>
      <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
        <Sparkles size={14} /> {L({ en: "How the AI reached this", th: "AI วิเคราะห์ยังไงถึงได้ผลนี้" })}
        {!done ? <Loader2 size={12} className="animate-spin text-white/40" /> : null}
        {/* never let simulated numbers read as measured ones */}
        <span className={cn("rounded-full border px-2 py-0.5 text-[9.5px] font-medium normal-case tracking-normal",
          readings.live ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300" : "border-white/15 bg-white/[0.03] text-white/45")}>
          {readings.live
            ? L({ en: `live · ${readings.devices.length} device(s)`, th: `ข้อมูลจริง · ${readings.devices.length} อุปกรณ์` })
            : L({ en: "simulated data", th: "ข้อมูลจำลอง" })}
        </span>
      </div>

      {/* the reasoning stages */}
      <ol className="mt-4 space-y-0">
        {steps.map((s, i) => {
          const state = stage > i ? "done" : stage === i ? "active" : "pending";
          const Icon = s.icon;
          return (
            <li key={i} className="flex gap-3">
              {/* rail */}
              <div className="flex flex-col items-center">
                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full border transition",
                  state === "done" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                  : state === "active" ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
                  : "border-white/10 bg-white/[0.02] text-white/25")}>
                  {state === "done" ? <Check size={15} /> : state === "active" ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
                </span>
                {i < steps.length - 1 ? <span className={cn("w-px flex-1 transition", stage > i ? "bg-emerald-400/30" : "bg-white/10")} style={{ minHeight: 16 }} /> : null}
              </div>
              {/* content */}
              <div className={cn("pb-4 transition", state === "pending" ? "opacity-40" : "opacity-100")}>
                <p className="text-[13px] font-medium text-white/85">{i + 1}. {L(s.label)}</p>
                <p className="mt-0.5 font-mono text-[11px] text-white/45">{state === "pending" ? "…" : L(s.detail)}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* resulting findings — revealed after the trace completes */}
      {done ? (
        findings.length ? (
          <div className="mt-1 space-y-1.5 border-t border-white/8 pt-4">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-white/40">{L({ en: "Findings — each cites the standard it crossed", th: "ผลวิเคราะห์ — อ้างมาตรฐานที่ผิดเกณฑ์ทุกอัน" })}</p>
            {findings.map((f, i) => {
              const rule = ruleById(f.ruleId);
              return (
                <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sevColor(f.severity) }} />
                  <span className="min-w-[130px] flex-1 text-[12.5px] font-medium text-white/85">{f.scope}</span>
                  <span className="rounded border border-brand-400/25 bg-brand-400/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] text-brand-200">{rule?.standard}</span>
                  <span className="tabular text-[12px]"><b style={{ color: sevColor(f.severity) }}>{f.value}</b> <span className="text-white/35">vs {f.limit}</span></span>
                  <span className="tabular text-[12px] font-semibold text-rose-300">฿{f.bahtAtRisk.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-1 border-t border-white/8 pt-4 text-[12px] text-emerald-300/80">{L({ en: "No standard breached in this area — all clear.", th: "ไม่มีค่าไหนผิดเกณฑ์มาตรฐานในส่วนนี้ — ปกติ" })}</p>
        )
      ) : null}
    </section>
  );
}
