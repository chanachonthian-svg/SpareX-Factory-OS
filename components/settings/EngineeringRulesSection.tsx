"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, Thermometer, ShieldAlert, Gauge, Zap, Waves, BookOpen, CircleDot, ArrowRight,
  Send, Loader2, Check,
} from "lucide-react";
import {
  ENGINEERING_RULES, evaluateRules, findingsByRule, DEFAULT_CONFIG, DEMO_PLANT,
  type RuleCategory, type RuleConfig, type Severity,
} from "@/lib/rules";
import { dispatchFindings } from "@/lib/rules-dispatch";
import { assets } from "@/lib/factory";
import { useI18n } from "@/lib/i18n";
import { publicAsset } from "@/lib/paths";
import { cn } from "@/lib/utils";

const CAT_ICON: Record<RuleCategory, typeof Activity> = {
  vibration: Activity, thermal: Thermometer, power: Zap,
  "power-quality": Waves, production: Gauge, reliability: ShieldAlert,
};
const SEV_STYLE: Record<Severity, { chip: string; text: string; dot: string }> = {
  critical: { chip: "border-rose-400/30 bg-rose-400/10 text-rose-300", text: "text-rose-300", dot: "bg-rose-400" },
  warning: { chip: "border-amber-400/30 bg-amber-400/10 text-amber-300", text: "text-amber-300", dot: "bg-amber-400" },
  ok: { chip: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300", text: "text-emerald-300", dot: "bg-emerald-400" },
};

export function EngineeringRulesSection() {
  const { locale } = useI18n();
  const L = (o: { en: string; th: string }) => (locale === "th" ? o.th : o.en);

  // thresholds come from Settings (peak % / PF floor) so the engine is tunable
  const [cfg, setCfg] = useState<RuleConfig>(DEFAULT_CONFIG);
  useEffect(() => {
    try {
      const notify = JSON.parse(localStorage.getItem("factoryos:notify") || "{}");
      const auto = JSON.parse(localStorage.getItem("factoryos:automation") || "{}");
      setCfg({
        peakPct: Number(notify.peakPct) || DEFAULT_CONFIG.peakPct,
        pfMin: Number(auto.pfMin) || DEFAULT_CONFIG.pfMin,
        oeeTarget: DEFAULT_CONFIG.oeeTarget,
      });
    } catch { /* defaults */ }
  }, []);

  const findings = useMemo(() => evaluateRules(assets, DEMO_PLANT, cfg), [cfg]);
  const byRule = useMemo(() => findingsByRule(findings), [findings]);
  const totalBaht = findings.reduce((s, f) => s + f.bahtAtRisk, 0);
  const critCount = findings.filter((f) => f.severity === "critical").length;

  // SpareX-triggered: turn firing rules into customer outcomes (WO + alerts +
  // a summary email/LINE). The rule stays backend; only the outcome crosses over.
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState<{ wos: number; alerts: number } | null>(null);
  const runDispatch = async () => {
    if (!findings.length) return;
    setDispatching(true); setDispatched(null);
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const res = dispatchFindings(findings, stamp);
    // one summary email/LINE (not per-finding — avoid spamming the ops team)
    try {
      const notify = JSON.parse(localStorage.getItem("factoryos:notify") || "{}");
      const top = findings.slice(0, 5).map((f) => `• ${f.scope}: ${f.value} (${f.limit})`).join("\n");
      await fetch(publicAsset("/api/notify"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: notify.emailAddr, emailOn: notify.email !== false, lineOn: notify.line !== false,
          subject: `🏭 FactoryOS · ${findings.length} engineering-rule findings · ฿${totalBaht.toLocaleString()} at risk`,
          body: `${res.wos} work orders raised.\n\n${top}`,
        }),
      });
    } catch { /* email is a bonus, WOs/alerts already landed */ }
    setDispatched(res);
    setDispatching(false);
  };

  // firing rules first, worst severity first
  const worstOf = (id: string): number => {
    const fs = byRule.get(id) ?? [];
    if (fs.some((f) => f.severity === "critical")) return 0;
    if (fs.some((f) => f.severity === "warning")) return 1;
    return 2;
  };
  const ordered = [...ENGINEERING_RULES].sort((a, b) => worstOf(a.id) - worstOf(b.id));

  const fmtB = (n: number) => `฿${n.toLocaleString()}`;

  return (
    <div className="space-y-5">
      {/* summary — the executive read in one row */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: L({ en: "Rules active", th: "กฎที่ใช้งาน" }), value: `${ENGINEERING_RULES.length}`, accent: "#22d3ee" },
          { label: L({ en: "Firing now", th: "เข้าเงื่อนไขตอนนี้" }), value: `${byRule.size}`, accent: byRule.size ? "#f59e0b" : "#34d399" },
          { label: L({ en: "Critical findings", th: "รายการวิกฤต" }), value: `${critCount}`, accent: critCount ? "#f43f5e" : "#8b93a7" },
          { label: L({ en: "฿ at risk", th: "฿ ที่เสี่ยง" }), value: fmtB(totalBaht), accent: "#f43f5e" },
        ].map((s) => (
          <div key={s.label} className="panel p-4">
            <p className="text-[11px] uppercase tracking-wider text-white/45">{s.label}</p>
            <p className="mt-1.5 tabular text-xl font-semibold" style={{ color: s.accent }}>{s.value}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <p className="flex flex-1 items-center gap-2 text-[12px] text-white/45">
          <BookOpen size={14} className="text-brand-300" />
          {L({
            en: "Each rule is grounded in an engineering standard or tariff, evaluated live against current readings.",
            th: "ทุกกฎอ้างอิงมาตรฐานวิศวกรรมหรือค่าไฟจริง ประเมินกับค่าปัจจุบันแบบสด",
          })}
        </p>
        {/* SpareX action — push the outcomes (not the rules) to the customer */}
        <button onClick={runDispatch} disabled={dispatching || !findings.length} className="btn-glow shrink-0 px-4 py-2 text-[12.5px] disabled:opacity-50">
          {dispatching ? <><Loader2 size={13} className="animate-spin" /> {L({ en: "Dispatching…", th: "กำลังส่ง…" })}</> : <><Send size={13} /> {L({ en: `Dispatch ${findings.length} findings to customer`, th: `ส่ง ${findings.length} รายการให้ลูกค้า` })}</>}
        </button>
      </div>
      {dispatched ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] px-4 py-2.5 text-[12.5px] text-emerald-200">
          <Check size={14} />
          {L({
            en: `Sent to customer: ${dispatched.wos} work orders + ${dispatched.alerts} alerts (each citing its standard) + summary email/LINE. They appear in Work Order Center & Notification Center.`,
            th: `ส่งให้ลูกค้าแล้ว: ใบสั่งงาน ${dispatched.wos} ใบ + แจ้งเตือน ${dispatched.alerts} รายการ (อ้างมาตรฐานทุกอัน) + สรุป Email/LINE · ไปโผล่ที่ Work Order Center และ Notification Center`,
          })}
        </div>
      ) : null}

      {/* rule catalog */}
      <div className="space-y-3">
        {ordered.map((rule) => {
          const fs = byRule.get(rule.id) ?? [];
          const firing = fs.length > 0;
          const worst: Severity = fs.some((f) => f.severity === "critical") ? "critical" : fs.some((f) => f.severity === "warning") ? "warning" : "ok";
          const st = SEV_STYLE[firing ? worst : "ok"];
          const Icon = CAT_ICON[rule.category];
          const ruleBaht = fs.reduce((s, f) => s + f.bahtAtRisk, 0);
          return (
            <div key={rule.id} className={cn("panel p-5", firing && worst === "critical" && "ring-1 ring-rose-400/25")}>
              <div className="flex flex-wrap items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-brand-300"><Icon size={16} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-white">{L(rule.name)}</h3>
                    <span className="rounded-md border border-brand-400/25 bg-brand-400/[0.08] px-2 py-0.5 font-mono text-[10.5px] text-brand-200">{rule.standard}</span>
                  </div>
                  {/* engineer: WHY it matters */}
                  <p className="mt-1 text-[12px] leading-relaxed text-white/55">{L(rule.basis)}</p>
                </div>
                <span className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium", firing ? st.chip : SEV_STYLE.ok.chip)}>
                  <CircleDot size={11} className={firing && worst === "critical" ? "animate-pulse" : ""} />
                  {firing ? `${fs.length} ${L({ en: "firing", th: "เข้าเงื่อนไข" })}` : L({ en: "all clear", th: "ปกติ" })}
                </span>
              </div>

              {/* executive: plain condition + action */}
              <div className="mt-3 grid gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 sm:grid-cols-2">
                <p className="text-[12px] text-white/70"><span className="text-white/40">{L({ en: "Trigger", th: "เงื่อนไข" })}: </span>{L(rule.check)}</p>
                <p className="flex items-center gap-1.5 text-[12px] text-white/70"><ArrowRight size={12} className="shrink-0 text-brand-300" /><span className="text-white/40">{L({ en: "Action", th: "สิ่งที่ทำ" })}: </span>{L(rule.action)}</p>
              </div>

              {/* live matches */}
              {firing ? (
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">{L({ en: "Matching now", th: "ที่เข้าเงื่อนไขตอนนี้" })}</p>
                    <p className="tabular text-[12px] font-semibold text-rose-300">{fmtB(ruleBaht)} {L({ en: "at risk", th: "เสี่ยง" })}</p>
                  </div>
                  <ul className="space-y-1.5">
                    {fs.map((f, i) => {
                      const s = SEV_STYLE[f.severity];
                      return (
                        <li key={`${f.scope}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/8 bg-white/[0.015] px-3 py-2">
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", s.dot)} />
                          <span className="min-w-[120px] flex-1 text-[12.5px] font-medium text-white/85">{f.scope}</span>
                          <span className="tabular text-[12px]"><b className={s.text}>{f.value}</b> <span className="text-white/35">vs {f.limit}</span></span>
                          <span className="tabular text-[12px] font-semibold text-rose-300">{fmtB(f.bahtAtRisk)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
