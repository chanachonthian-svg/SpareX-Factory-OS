"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity, LayoutDashboard, ListTree, IdCard, ShieldCheck, Wallet, Sparkles,
  AlertTriangle, ArrowRight, ArrowUpRight, ChevronRight, Wrench, Package, ExternalLink,
  UserCog, PieChart, HeartPulse, Boxes, Clock, TrendingUp, Building2, Recycle, Check,
} from "lucide-react";
import { assets, assetById, predictedFailures, type Asset } from "@/lib/factory";
import { openCopilot, cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { KpiCard } from "@/components/os/KpiCard";
import { series } from "@/lib/telemetry";
import { createWorkOrder, useWorkOrders, WO_STATUS, WO_FLOW, type WorkOrder } from "@/lib/workorders";
import {
  critScore, critClass, CRIT_META, strategyOf, recommendedStrategy, strategyFit, STRATEGY_META, FIT_META,
  healthFactors, rul, pfIntervalDays, mttrHours, mtbfDays, ageYears, lifeYears, nameplate,
  replaceTHB, repairTHB, spareFor, repairVsReplace, riskTHB, maintCostYtd, downtimeCostYr,
  fmeaFor, topFmea, rpn, portfolio, badActors, investmentPriority, replaceCandidates,
  registryByArea, thbCompact, copilotSuggestions,
  type CritClass, type LZ, type Fit,
} from "@/lib/asset";

type Tr = (o: LZ) => string;
type Role = "engineer" | "executive";
const PINK = "#f472b6";
const STATUS_HEX: Record<Asset["status"], string> = { healthy: "#34d399", warning: "#f59e0b", critical: "#f43f5e" };
const healthColor = (v: number) => (v >= 90 ? "#34d399" : v >= 80 ? "#22d3ee" : v >= 70 ? "#f59e0b" : "#f43f5e");
const healthVar = (v: number) => (v >= 90 ? "var(--c-emerald)" : v >= 80 ? "var(--c-cyan)" : v >= 70 ? "var(--c-amber-strong)" : "var(--c-rose)");
const actionFor = (a: Asset): LZ => ({ en: `Service ${a.name} — ${topFmea(a).mode.en.toLowerCase()}`, th: `ซ่อม ${a.name} — ${topFmea(a).mode.th}` });

/* ══════════════════════════ shared bits ══════════════════════════ */
function Panel({ title, sub, extra, children, className }: { title?: string; sub?: string; extra?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("panel p-5", className)}>
      {title ? <div className="mb-3 flex items-start justify-between gap-3"><div><h3 className="font-semibold">{title}</h3>{sub ? <p className="mt-0.5 text-xs text-white/45">{sub}</p> : null}</div>{extra}</div> : null}
      {children}
    </div>
  );
}
function CritBadge({ c, L, full }: { c: CritClass; L: Tr; full?: boolean }) {
  const m = CRIT_META[c];
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ color: m.text, backgroundColor: `${m.hex}1f` }}>{full ? L(m.short) : c}</span>;
}
function FitBadge({ f, L }: { f: Fit; L: Tr }) {
  const m = FIT_META[f];
  return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ color: m.text, backgroundColor: `${m.hex}1a` }}>{f === "good" ? <Check size={10} /> : <AlertTriangle size={10} />}{L(m.label)}</span>;
}
function Ring({ value, size = 76, stroke = 7 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, col = healthColor(value);
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ filter: `drop-shadow(0 0 5px ${col}66)` }} /></svg>
      <div className="absolute text-center"><p className="tabular text-lg font-semibold leading-none" style={{ color: healthVar(value) }}>{value}</p></div>
    </div>
  );
}
/** live lifecycle status of a raised work order, read from the central store */
function WoStatus({ wo, L }: { wo: WorkOrder; L: Tr }) {
  const m = WO_STATUS[wo.status], idx = WO_FLOW.indexOf(wo.status);
  return (
    <Link href="/os/workorders" className="group flex w-full flex-col gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 transition hover:bg-white/[0.05] sm:w-48">
      <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: m.color }} /><span className="truncate text-[11px] font-semibold" style={{ color: m.color }}>{L(m.label)}</span><ExternalLink size={11} className="ml-auto shrink-0 text-white/30 group-hover:text-white/50" /></div>
      <div className="flex gap-0.5">{WO_FLOW.map((s, i) => <span key={s} className="h-1 flex-1 rounded-full" style={{ backgroundColor: i <= idx ? m.color : "rgba(255,255,255,0.12)" }} />)}</div>
      <span className="text-[9px] text-white/40">{wo.id} · {L({ en: "step", th: "ขั้น" })} {idx + 1}/{WO_FLOW.length}</span>
    </Link>
  );
}
function MetricRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-baseline justify-between gap-3 border-t border-white/6 py-2"><span className="text-[12px] text-white/50">{label}</span><span className="text-right text-[13px] font-medium text-white/85">{children}</span></div>;
}

/* ══════════════════════════ fleet matrix (criticality × condition) ══════════════════════════ */
function FleetMatrix({ onPick, L }: { onPick: (id: string) => void; L: Tr }) {
  const [hover, setHover] = useState<string | null>(null);
  const W = 520, H = 300, PL = 40, PB = 34, PT = 14, PR = 16;
  const xMax = 46, yMax = 100; // x = poor-health (100-health), worse to the right
  const cx = (poor: number) => PL + (Math.min(poor, xMax) / xMax) * (W - PL - PR);
  const cy = (c: number) => H - PB - (c / yMax) * (H - PB - PT);
  const rOf = (risk: number) => 5 + Math.min(12, risk / 220000);
  const hv = hover ? assetById(hover) : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <rect x={cx(30)} y={PT} width={W - PR - cx(30)} height={cy(65) - PT} fill="#f43f5e" opacity="0.09" />
        <line x1={cx(30)} x2={cx(30)} y1={PT} y2={H - PB} stroke="rgba(120,130,150,0.4)" strokeDasharray="4 4" />
        <line x1={PL} x2={W - PR} y1={cy(65)} y2={cy(65)} stroke="rgba(120,130,150,0.4)" strokeDasharray="4 4" />
        <text x={PL} y={H - 8} style={{ fontSize: 10, fill: "var(--muted)" }}>{L({ en: "healthier", th: "สภาพดี" })}</text>
        <text x={W - PR} y={H - 8} textAnchor="end" style={{ fontSize: 10, fill: "var(--c-rose)" }}>{L({ en: "worse condition →", th: "สภาพแย่ลง →" })}</text>
        <text x={cx(31)} y={PT + 12} style={{ fontSize: 10, fill: "var(--c-rose)" }}>{L({ en: "▲ act now", th: "▲ ทำเดี๋ยวนี้" })}</text>
        <text x={8} y={PT + 10} style={{ fontSize: 10, fill: "var(--muted)" }}>{L({ en: "criticality", th: "ความวิกฤต" })}</text>
        {assets.map((a) => {
          const flagged = a.rulDays != null;
          return (
            <g key={a.id} onMouseEnter={() => setHover(a.id)} onMouseLeave={() => setHover(null)} onClick={() => onPick(a.id)} style={{ cursor: "pointer" }}>
              <circle cx={cx(100 - a.health)} cy={cy(critScore(a))} r={rOf(riskTHB(a))} fill={STATUS_HEX[a.status]} fillOpacity={hover === a.id ? 0.95 : 0.78} stroke={STATUS_HEX[a.status]} strokeWidth={flagged ? 2 : 1} />
            </g>
          );
        })}
      </svg>
      {hv ? (
        <div className="dark-screen pointer-events-none absolute left-3 top-3 rounded-lg border border-white/10 bg-[#0f1420]/95 px-3 py-2 shadow-xl">
          <p className="text-[12px] font-semibold text-white/90">{hv.name}</p>
          <p className="text-[11px] text-white/50">{L({ en: "health", th: "สุขภาพ" })} {hv.health} · {L(CRIT_META[critClass(hv)].short)} · {L({ en: "risk", th: "เสี่ยง" })} {thbCompact(riskTHB(hv))}</p>
          <p className="text-[10px] text-brand-300">{L({ en: "click for asset passport ▸", th: "คลิกดู Asset Passport ▸" })}</p>
        </div>
      ) : null}
    </div>
  );
}

/* ══════════════════════════ ASSET PASSPORT — the 2-lens centrepiece ══════════════════════════ */
function Passport({ a, role, L, raised, onRaise }: { a: Asset; role: Role; L: Tr; raised?: WorkOrder; onRaise: () => void }) {
  const c = critClass(a), fit = strategyFit(a), rr = repairVsReplace(a), fm = topFmea(a);
  const np = nameplate(a), age = ageYears(a), life = lifeYears(a);
  const flagged = a.rulDays != null;
  const engHi = role === "engineer", exeHi = role === "executive";
  return (
    <div className="panel overflow-hidden p-0">
      {/* header */}
      <div className="flex items-center gap-4 border-b border-white/10 p-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${STATUS_HEX[a.status]}1f`, color: STATUS_HEX[a.status] }}><HeartPulse size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-lg font-semibold">{a.name}</h3><CritBadge c={c} L={L} full /></div>
          <p className="mt-0.5 truncate text-xs text-white/45">{np.mfr} {np.model} · {a.type} · {a.line} · {L({ en: "installed", th: "ติดตั้ง" })} {np.installed}</p>
        </div>
        <Ring value={a.health} />
      </div>

      <div className="grid sm:grid-cols-2">
        {/* ── engineer lens ── */}
        <div className={cn("p-5 transition", engHi && "ring-1 ring-inset ring-brand-400/30")}>
          <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold text-white/60"><UserCog size={14} className="text-brand-300" /> {L({ en: "For the engineer", th: "สำหรับวิศวกร" })}</p>
          <div className="space-y-2">
            {healthFactors(a).map((f) => (
              <div key={f.label.en} className="flex items-center gap-2.5"><span className="w-20 shrink-0 text-[11px] text-white/50">{L(f.label)}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${f.value}%`, backgroundColor: healthColor(f.value) }} /></div><span className="w-7 shrink-0 text-right tabular text-[11px]" style={{ color: healthVar(f.value) }}>{f.value}</span></div>
            ))}
          </div>
          <div className="mt-2">
            <MetricRow label={L({ en: "Criticality", th: "ความวิกฤต" })}><CritBadge c={c} L={L} full /> <span className="text-white/40">· {critScore(a)}</span></MetricRow>
            <MetricRow label={L({ en: "RUL · remaining life", th: "RUL · อายุคงเหลือ" })}>{flagged ? <span style={{ color: healthVar(a.health) }}>~{rul(a)} {L({ en: "days", th: "วัน" })}</span> : <span className="text-white/40">{L({ en: "no active prediction", th: "ยังไม่พบสัญญาณ" })}</span>} <span className="text-white/35">· P-F {pfIntervalDays(a)}d</span></MetricRow>
            <MetricRow label={L({ en: "Dominant failure mode", th: "โหมดเสียหลัก" })}>{L(fm.mode)} <span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] tabular text-white/60">RPN {rpn(fm)}</span></MetricRow>
            <MetricRow label={L({ en: "Strategy", th: "กลยุทธ์ดูแล" })}><span className="block">{L(STRATEGY_META[strategyOf(a)].label)}</span><span className="mt-0.5 inline-block"><FitBadge f={fit} L={L} /></span></MetricRow>
            <MetricRow label={L({ en: "MTBF · MTTR", th: "MTBF · MTTR" })}>{mtbfDays(a)}d · {mttrHours(a)}h</MetricRow>
            <MetricRow label={L({ en: "Critical spare", th: "อะไหล่สำคัญ" })}><span className="block max-w-[150px] truncate text-white/75">{L(spareFor(a).part)}</span><span className={cn("text-[11px]", spareFor(a).inStock ? "text-emerald-300" : "text-amber-300")}>{spareFor(a).inStock ? L({ en: "in stock", th: "มีในสต็อก" }) : `${L({ en: "lead", th: "รอ" })} ${spareFor(a).leadDays}d`}</span></MetricRow>
          </div>
        </div>

        {/* ── executive lens ── */}
        <div className={cn("border-t border-white/8 p-5 transition sm:border-l sm:border-t-0", exeHi && "ring-1 ring-inset ring-brand-400/30")}>
          <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold text-white/60"><PieChart size={14} className="text-brand-300" /> {L({ en: "For the executive", th: "สำหรับผู้บริหาร" })}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5"><p className="text-[10px] text-white/45">{L({ en: "฿ at risk", th: "฿ ที่เสี่ยง" })}</p><p className="tabular text-base font-semibold text-rose-300">{thbCompact(riskTHB(a))}</p></div>
            <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5"><p className="text-[10px] text-white/45">{L({ en: "Maint. cost YTD", th: "ค่าซ่อมสะสมปีนี้" })}</p><p className="tabular text-base font-semibold text-white/85">{thbCompact(maintCostYtd(a))}</p></div>
            <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5"><p className="text-[10px] text-white/45">{L({ en: "Downtime exposure/yr", th: "ต้นทุนหยุดเครื่อง/ปี" })}</p><p className="tabular text-base font-semibold text-amber-300">{thbCompact(downtimeCostYr(a))}</p></div>
            <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5"><p className="text-[10px] text-white/45">{L({ en: "Replacement value", th: "มูลค่าเปลี่ยนใหม่" })}</p><p className="tabular text-base font-semibold text-white/85">{thbCompact(replaceTHB(a))}</p></div>
          </div>
          <div className="mt-2.5">
            <div className="mb-1 flex items-center justify-between text-[11px]"><span className="text-white/50">{L({ en: "Lifecycle", th: "อายุการใช้งาน" })}</span><span className="text-white/60">{age}y / {life}y</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (age / life) * 100)}%`, backgroundColor: age / life >= 0.8 ? "#f43f5e" : age / life >= 0.6 ? "#f59e0b" : "#34d399" }} /></div>
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-md bg-brand-400/12 text-brand-300"><Recycle size={13} /></span><span className="text-[12px] font-semibold text-white/80">{L({ en: "Repair vs replace", th: "ซ่อม vs เปลี่ยน" })}</span><span className={cn("ml-auto rounded-md px-2 py-0.5 text-[11px] font-semibold", rr.rec === "replace" ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300")}>{rr.rec === "replace" ? L({ en: "→ Replace", th: "→ เปลี่ยน" }) : L({ en: "→ Repair", th: "→ ซ่อม" })}</span></div>
            <div className="mt-2 flex items-center gap-2 text-[13px]"><span className="tabular font-semibold text-emerald-300">{thbCompact(rr.repair)}</span><span className="text-[10px] text-white/40">{L({ en: "repair", th: "ซ่อม" })}</span><span className="text-white/45">vs</span><span className="tabular font-semibold text-white/70">{thbCompact(rr.replace)}</span><span className="text-[10px] text-white/40">{L({ en: "replace", th: "เปลี่ยน" })}</span></div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/50">{L(rr.note)}</p>
          </div>
        </div>
      </div>

      {/* action bar */}
      {flagged ? (
        <div className="flex flex-col gap-2 border-t border-white/10 p-4 sm:flex-row sm:items-center">
          <p className="flex items-start gap-1.5 text-[12px] text-white/70 sm:flex-1"><Wrench size={13} className="mt-0.5 shrink-0 text-brand-300" /> {L(actionFor(a))}</p>
          {raised ? <WoStatus wo={raised} L={L} /> : (
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-right text-[11px] text-white/45">{L({ en: "prevents", th: "กันเสียหาย" })} <span className="font-semibold text-emerald-300">{thbCompact(riskTHB(a) - repairTHB(a))}</span></span>
              <button onClick={onRaise} className="btn-glow whitespace-nowrap px-3 py-1.5 text-[12px]">{L({ en: "Create work order", th: "ออก Work Order" })} <ArrowRight size={13} /></button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 border-t border-white/10 p-4 text-[12px] text-white/45"><ShieldCheck size={14} className="text-emerald-300" /> {L({ en: "No active fault — asset within condition & strategy targets.", th: "ไม่พบความผิดปกติ — เครื่องอยู่ในเกณฑ์สภาพและกลยุทธ์ที่กำหนด" })}</div>
      )}
    </div>
  );
}

/* ══════════════════════════ tab · OVERVIEW (role-aware) ══════════════════════════ */
function OverviewView({ role, onPick, L }: { role: Role; onPick: (id: string) => void; L: Tr }) {
  const p = portfolio, actors = badActors(6);
  const spend = Math.round((p.maintSpentYtd / p.maintBudgetYr) * 100);
  return (
    <div className="space-y-6">
      {role === "engineer" ? (
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label={L({ en: "Managed assets", th: "สินทรัพย์ที่ดูแล" })} value={`${p.count}`} accent={PINK} />
          <KpiCard label={L({ en: "Fleet health", th: "สุขภาพฟลีต" })} value={`${p.avgHealth}`} unit="/100" delta={L({ en: "1 critical", th: "วิกฤต 1" })} deltaGood={false} accent="#22d3ee" spark={series(63, 16, { base: 55, amp: 6 })} />
          <KpiCard label={L({ en: "Under-maintained", th: "ดูแลน้อยไป" })} value={`${p.underMaintained}`} delta={L({ en: "strategy gap", th: "ช่องว่างกลยุทธ์" })} deltaGood={false} accent="#f59e0b" />
          <KpiCard label={L({ en: "Predicted failures", th: "พยากรณ์จะเสีย" })} value={`${p.atRisk}`} unit="/30d" accent="#f43f5e" />
        </section>
      ) : (
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label={L({ en: "฿ at risk (flagged)", th: "฿ ที่เสี่ยง (ที่เฝ้า)" })} value={thbCompact(p.flaggedRiskTHB)} delta={`${p.atRisk} ${L({ en: "assets", th: "เครื่อง" })}`} deltaGood={false} accent="#f43f5e" />
          <KpiCard label={L({ en: "Maint. spend YTD", th: "ค่าซ่อมสะสมปีนี้" })} value={thbCompact(p.maintSpentYtd)} delta={`${spend}% ${L({ en: "of budget", th: "ของงบ" })}`} deltaGood accent={PINK} />
          <KpiCard label={L({ en: "Fleet availability", th: "ความพร้อมใช้ฟลีต" })} value={`${p.availabilityPct}`} unit="%" delta={L({ en: "Stable", th: "คงที่" })} deltaGood accent="#34d399" spark={series(64, 16, { base: 60, amp: 4 })} />
          <KpiCard label={L({ en: "Replace candidates", th: "ควรเปลี่ยน" })} value={`${replaceCandidates().length}`} delta={L({ en: "end-of-life", th: "หมดอายุ" })} deltaGood={false} accent="#818cf8" />
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Panel title={L({ en: "Fleet map · criticality × condition", th: "แผนที่ฟลีต · ความวิกฤต × สภาพ" })} sub={L({ en: "bubble = asset · size = ฿ at risk · colour = condition · click for passport", th: "แต่ละวง = เครื่อง · ขนาด = ฿ ที่เสี่ยง · สี = สภาพ · คลิกดู passport" })}>
          <FleetMatrix onPick={onPick} L={L} />
          <div className="mt-2 flex flex-wrap gap-3">{(["healthy", "warning", "critical"] as Asset["status"][]).map((s) => <span key={s} className="flex items-center gap-1.5 text-[11px] text-white/50"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_HEX[s] }} />{L(s === "healthy" ? { en: "healthy", th: "ปกติ" } : s === "warning" ? { en: "watch", th: "เฝ้าระวัง" } : { en: "critical", th: "วิกฤต" })}</span>)}</div>
        </Panel>
        <Panel title={L({ en: "Act this week", th: "ต้องจัดการสัปดาห์นี้" })} sub={L({ en: "bad actors — highest ฿ at risk first", th: "ตัวปัญหา — เรียงตาม ฿ ที่เสี่ยงสูงสุด" })}>
          <ul className="space-y-1.5">
            {actors.map((a) => (
              <li key={a.id} onClick={() => onPick(a.id)} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 transition hover:bg-white/[0.04]">
                <CritBadge c={critClass(a)} L={L} />
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-white/85">{a.name}</p><p className="truncate text-[10px] text-white/40">{L(topFmea(a).mode)} · {a.rulDays != null ? `~${a.rulDays}d RUL` : a.type}</p></div>
                <span className="shrink-0 tabular text-[12px] font-semibold text-rose-300">{thbCompact(riskTHB(a))}</span>
                <ChevronRight size={14} className="shrink-0 text-white/30" />
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <Panel className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/12 blur-3xl" />
        <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950"><Sparkles size={16} /></span><h3 className="font-semibold">{role === "engineer" ? L({ en: "AI reliability summary", th: "สรุปความน่าเชื่อถือโดย AI" }) : L({ en: "AI portfolio summary", th: "สรุปพอร์ตสินทรัพย์โดย AI" })}</h3></div>
        {role === "engineer" ? (
          <p className="mt-3 text-sm leading-relaxed text-white/70"><span className="text-rose-300">Chiller B</span> {L({ en: "leads risk — condenser fouling, ~3d RUL. ", th: "เสี่ยงสูงสุด — คอนเดนเซอร์อุดตัน, RUL ~3 วัน " })}<span className="text-amber-300">{p.underMaintained} {L({ en: "assets are under-maintained for their criticality", th: "เครื่องได้รับการดูแลน้อ·ว่าความวิกฤต" })}</span>{L({ en: " (e.g. Air Compressor 10). Fleet health ", th: " (เช่น Air Compressor 10) สุขภาพฟลีต " })}<span style={{ color: healthVar(p.avgHealth) }}>{p.avgHealth}/100</span>.</p>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-white/70">{L({ en: "Total exposure ", th: "ความเสี่ยงรวม " })}<span className="font-semibold text-rose-300">{thbCompact(p.flaggedRiskTHB)}</span>{L({ en: " across ", th: " จาก " })}{p.atRisk}{L({ en: " flagged assets. Maintenance spend is ", th: " เครื่องที่เฝ้า ค่าซ่อมอยู่ที่ " })}<span className="text-emerald-300">{spend}%</span>{L({ en: " of budget. ", th: " ของงบ " })}<span className="text-amber-300">{replaceCandidates().length} {L({ en: "assets warrant replacement over repeat repair", th: "เครื่องควรเปลี่ยนแทนซ่อมซ้ำ" })}</span>.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">{copilotSuggestions.slice(0, 2).map((s) => <button key={s.en} onClick={() => openCopilot(L(s))} className="btn-ghost px-3.5 py-2 text-[13px]"><Sparkles size={13} /> {L(s)}</button>)}</div>
      </Panel>
    </div>
  );
}

/* ══════════════════════════ tab · REGISTRY ══════════════════════════ */
function RegistryView({ onPick, wos, L }: { onPick: (id: string) => void; wos: WorkOrder[]; L: Tr }) {
  const [cls, setCls] = useState<CritClass | "all">("all");
  const counts: Record<string, number> = { all: assets.length };
  (["A", "B", "C", "D"] as CritClass[]).forEach((c) => (counts[c] = assets.filter((a) => critClass(a) === c).length));
  const groups = registryByArea().map((g) => ({ ...g, items: g.items.filter((a) => cls === "all" || critClass(a) === cls) }));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-white/40">{L({ en: "Criticality", th: "ความวิกฤต" })}</span>
        <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
          {(["all", "A", "B", "C", "D"] as (CritClass | "all")[]).map((c) => (
            <button key={c} onClick={() => setCls(c)} className={cn("whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition", cls === c ? "bg-white/10 text-white/90" : "text-white/45 hover:text-white/70")}>{c === "all" ? L({ en: "All", th: "ทั้งหมด" }) : c} <span className="tabular text-white/30">{counts[c]}</span></button>
          ))}
        </div>
      </div>
      {groups.map((g) => g.items.length ? (
        <section key={g.id} className="panel overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3"><Building2 size={16} className="text-brand-300" /><h3 className="text-sm font-semibold">{L(g.label)}</h3><span className="ml-auto text-[11px] text-white/40">{g.items.length}</span></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
                <th className="px-5 py-2.5 font-medium">{L({ en: "Asset", th: "เครื่อง" })}</th>
                <th className="px-3 py-2.5 font-medium">{L({ en: "Class", th: "ระดับ" })}</th>
                <th className="px-3 py-2.5 font-medium">{L({ en: "Health", th: "สุขภาพ" })}</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell">{L({ en: "Strategy", th: "กลยุทธ์" })}</th>
                <th className="px-3 py-2.5 font-medium">{L({ en: "RUL", th: "RUL" })}</th>
                <th className="px-5 py-2.5 text-right font-medium">{L({ en: "฿ at risk", th: "฿ ที่เสี่ยง" })}</th>
              </tr></thead>
              <tbody>{g.items.map((a) => { const raised = wos.find((w) => w.findingId === `asset-${a.id}`); return (
                <tr key={a.id} onClick={() => onPick(a.id)} className="cursor-pointer border-t border-white/5 transition hover:bg-white/[0.03]">
                  <td className="px-5 py-2.5"><p className="flex items-center gap-2 font-medium text-white/90"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_HEX[a.status] }} />{a.name}{raised ? <span className="rounded bg-brand-400/12 px-1.5 py-0.5 text-[9px] font-semibold text-brand-200">WO</span> : null}</p><p className="text-xs text-white/40">{a.type}</p></td>
                  <td className="px-3 py-2.5"><CritBadge c={critClass(a)} L={L} /></td>
                  <td className="px-3 py-2.5"><div className="flex items-center gap-2"><div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${a.health}%`, backgroundColor: healthColor(a.health) }} /></div><span className="tabular text-xs" style={{ color: healthVar(a.health) }}>{a.health}</span></div></td>
                  <td className="hidden px-3 py-2.5 md:table-cell"><span className="text-xs text-white/60">{L(STRATEGY_META[strategyOf(a)].label)}</span>{strategyFit(a) !== "good" ? <span className="ml-1.5 inline-block"><FitBadge f={strategyFit(a)} L={L} /></span> : null}</td>
                  <td className="px-3 py-2.5 tabular text-xs">{a.rulDays != null ? <span className="text-rose-300">~{a.rulDays}d</span> : <span className="text-white/30">—</span>}</td>
                  <td className="px-5 py-2.5 text-right tabular"><span className={a.rulDays != null ? "font-semibold text-rose-300" : "text-white/40"}>{thbCompact(riskTHB(a))}</span></td>
                </tr>
              ); })}</tbody>
            </table>
          </div>
        </section>
      ) : null)}
    </div>
  );
}

/* ══════════════════════════ tab · PASSPORT (master-detail) ══════════════════════════ */
function PassportView({ selId, setSel, role, wos, onRaise, L }: { selId: string; setSel: (id: string) => void; role: Role; wos: WorkOrder[]; onRaise: (a: Asset) => void; L: Tr }) {
  const sel = assetById(selId) ?? assets[0];
  const ranked = [...assets].sort((x, y) => riskTHB(y) - riskTHB(x));
  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <div className="panel max-h-[560px] overflow-y-auto p-2">
        {ranked.map((a) => { const on = a.id === sel.id; return (
          <button key={a.id} onClick={() => setSel(a.id)} className={cn("mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition", on ? "bg-brand-400/12 ring-1 ring-inset ring-brand-400/30" : "hover:bg-white/[0.04]")}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_HEX[a.status] }} />
            <div className="min-w-0 flex-1"><p className={cn("truncate text-[13px] font-medium", on ? "text-white" : "text-white/80")}>{a.name}</p><p className="truncate text-[10px] text-white/40">{L(CRIT_META[critClass(a)].short)}</p></div>
            <span className="shrink-0 tabular text-[11px] text-white/45">{thbCompact(riskTHB(a))}</span>
          </button>
        ); })}
      </div>
      <motion.div key={sel.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Passport a={sel} role={role} L={L} raised={wos.find((w) => w.findingId === `asset-${sel.id}`)} onRaise={() => onRaise(sel)} />
      </motion.div>
    </div>
  );
}

/* ══════════════════════════ tab · RELIABILITY & FMEA ══════════════════════════ */
function ReliabilityView({ onPick, L }: { onPick: (id: string) => void; L: Tr }) {
  const p = portfolio;
  const fmeaRows = assets.flatMap((a) => fmeaFor(a).map((r) => ({ a, r }))).sort((x, y) => rpn(y.r) - rpn(x.r)).slice(0, 8);
  const stratMax = Math.max(...Object.values(p.strat));
  const under = assets.filter((a) => strategyFit(a) === "under");
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Panel><p className="text-[11px] uppercase tracking-wider text-white/45">{L({ en: "MTBF", th: "MTBF (เฉลี่ยระหว่างเสีย)" })}</p><p className="mt-1 tabular text-3xl font-semibold text-white">{p.mtbfDays}<span className="text-sm font-normal text-white/40"> {L({ en: "days", th: "วัน" })}</span></p><p className="mt-1 flex items-center gap-1 text-[12px] text-emerald-300"><TrendingUp size={13} /> +12% {L({ en: "with PdM", th: "หลังใช้ PdM" })}</p></Panel>
        <Panel><p className="text-[11px] uppercase tracking-wider text-white/45">{L({ en: "MTTR", th: "MTTR (เฉลี่ยเวลาซ่อม)" })}</p><p className="mt-1 tabular text-3xl font-semibold text-white">{p.mttrHours}<span className="text-sm font-normal text-white/40"> h</span></p><p className="mt-1 text-[12px] text-white/45">{L({ en: "mean time to repair", th: "เวลาเฉลี่ยในการซ่อม" })}</p></Panel>
        <Panel><p className="text-[11px] uppercase tracking-wider text-white/45">{L({ en: "Availability", th: "ความพร้อมใช้งาน" })}</p><p className="mt-1 tabular text-3xl font-semibold text-emerald-300">{p.availabilityPct}<span className="text-sm font-normal text-white/40">%</span></p><p className="mt-1 text-[12px] text-white/45">{L({ en: "fleet uptime", th: "เวลาพร้อมใช้ของฟลีต" })}</p></Panel>
      </section>

      <Panel title={L({ en: "FMEA · highest-RPN failure modes", th: "FMEA · โหมดเสี·ี่ RPN สูงสุด" })} sub={L({ en: "risk priority number = severity × occurrence × detection", th: "RPN = ความรุนแรง × โอกาสเกิด × ความยากตรวจจับ" })}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
              <th className="px-2 py-2.5 font-medium">{L({ en: "Asset", th: "เครื่อง" })}</th>
              <th className="px-2 py-2.5 font-medium">{L({ en: "Failure mode", th: "โหมดเสีย" })}</th>
              <th className="hidden px-2 py-2.5 font-medium sm:table-cell">{L({ en: "Effect", th: "ผลกระทบ" })}</th>
              <th className="px-2 py-2.5 text-center font-medium">S</th><th className="px-2 py-2.5 text-center font-medium">O</th><th className="px-2 py-2.5 text-center font-medium">D</th>
              <th className="px-2 py-2.5 text-right font-medium">RPN</th>
            </tr></thead>
            <tbody>{fmeaRows.map(({ a, r }, i) => { const v = rpn(r); return (
              <tr key={`${a.id}-${i}`} onClick={() => onPick(a.id)} className="cursor-pointer border-t border-white/5 transition hover:bg-white/[0.02]">
                <td className="px-2 py-2.5 font-medium text-white/85">{a.name}</td>
                <td className="px-2 py-2.5 text-white/70">{L(r.mode)}</td>
                <td className="hidden px-2 py-2.5 text-xs text-white/45 sm:table-cell">{L(r.effect)}</td>
                <td className="px-2 py-2.5 text-center tabular text-white/60">{r.sev}</td><td className="px-2 py-2.5 text-center tabular text-white/60">{r.occ}</td><td className="px-2 py-2.5 text-center tabular text-white/60">{r.det}</td>
                <td className="px-2 py-2.5 text-right"><span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold tabular", v >= 200 ? "bg-rose-500/15 text-rose-300" : v >= 120 ? "bg-amber-500/15 text-amber-300" : "bg-white/8 text-white/60")}>{v}</span></td>
              </tr>
            ); })}</tbody>
          </table>
        </div>
      </Panel>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title={L({ en: "Maintenance strategy mix", th: "สัดส่วนกลยุทธ์ดูแล" })} sub={L({ en: "how the fleet is currently maintained", th: "ปัจจุบันฟลีตถูกดูแลด้วยวิธีใด" })}>
          <div className="space-y-2.5">{(Object.keys(p.strat) as (keyof typeof p.strat)[]).filter((k) => p.strat[k] > 0).map((k) => (
            <div key={k} className="flex items-center gap-3"><span className="w-32 shrink-0 text-[12px] text-white/70">{L(STRATEGY_META[k].label)}</span><div className="h-3 flex-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-brand-400/70" style={{ width: `${(p.strat[k] / stratMax) * 100}%` }} /></div><span className="w-6 shrink-0 text-right tabular text-[12px] font-semibold text-white/75">{p.strat[k]}</span></div>
          ))}</div>
        </Panel>
        <Panel title={L({ en: "Strategy-fit gaps", th: "ช่องว่างความเหมาะสมกลยุทธ์" })} sub={L({ en: "critical assets maintained too lightly — raise the strategy", th: "เครื่องวิกฤตที่ดูแลเบาไป — ควร·ระดับกลยุทธ์" })} extra={<span className="chip text-rose-200">{under.length}</span>}>
          <ul className="space-y-1.5">{under.length ? under.map((a) => (
            <li key={a.id} onClick={() => onPick(a.id)} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 transition hover:bg-white/[0.04]">
              <CritBadge c={critClass(a)} L={L} />
              <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-white/85">{a.name}</p><p className="truncate text-[10px] text-white/40">{L(STRATEGY_META[strategyOf(a)].label)} → <span className="text-amber-300">{L(STRATEGY_META[recommendedStrategy(a)].label)}</span></p></div>
              <ChevronRight size={14} className="shrink-0 text-white/30" />
            </li>
          )) : <p className="py-6 text-center text-sm text-white/40">{L({ en: "Every asset's strategy fits its criticality.", th: "ทุกเครื่องมีกลยุทธ์เหมาะกับความวิกฤตแล้ว" })}</p>}</ul>
        </Panel>
      </section>
    </div>
  );
}

/* ══════════════════════════ tab · ECONOMICS ══════════════════════════ */
function EconomicsView({ onPick, L }: { onPick: (id: string) => void; L: Tr }) {
  const p = portfolio;
  const spendPct = Math.round((p.maintSpentYtd / p.maintBudgetYr) * 100);
  const riskByClass = (["A", "B", "C", "D"] as CritClass[]).map((c) => ({ c, thb: assets.filter((a) => critClass(a) === c).reduce((s, a) => s + riskTHB(a), 0) }));
  const riskMax = Math.max(...riskByClass.map((r) => r.thb), 1);
  const priority = investmentPriority().slice(0, 6);
  const replace = replaceCandidates();
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={L({ en: "Total ฿ at risk", th: "฿ ที่เสี่ยงรวม" })} value={thbCompact(p.totalRiskTHB)} accent="#f43f5e" />
        <KpiCard label={L({ en: "Maint. spend YTD", th: "ค่าซ่อมสะสมปีนี้" })} value={thbCompact(p.maintSpentYtd)} delta={`${spendPct}% ${L({ en: "of budget", th: "ของงบ" })}`} deltaGood accent={PINK} />
        <KpiCard label={L({ en: "Reactive work", th: "งานฉุกเฉิน" })} value={`${p.reactivePct}`} unit="%" delta={L({ en: "target < 20%", th: "เป้า < 20%" })} deltaGood={false} accent="#f59e0b" />
        <KpiCard label={L({ en: "Replacement value", th: "มูลค่าสินทรัพย์รวม" })} value={thbCompact(assets.reduce((s, a) => s + replaceTHB(a), 0))} delta={L({ en: "insured base", th: "ฐานทรัพย์สิน" })} deltaGood accent="#818cf8" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title={L({ en: "฿ at risk by criticality", th: "฿ ที่เสี่ยงตามความวิกฤต" })} sub={L({ en: "where consequence concentrates", th: "ความเสี่ยงกระจุกอยู่ที่ระดับใด" })}>
          <div className="space-y-2.5">{riskByClass.map(({ c, thb }) => (
            <div key={c} className="flex items-center gap-3"><span className="w-28 shrink-0 text-[12px]" style={{ color: CRIT_META[c].text }}>{L(CRIT_META[c].short)}</span><div className="h-3 flex-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${(thb / riskMax) * 100}%`, backgroundColor: CRIT_META[c].hex }} /></div><span className="w-14 shrink-0 text-right tabular text-[12px] font-semibold text-white/75">{thbCompact(thb)}</span></div>
          ))}</div>
          <div className="mt-4 border-t border-white/8 pt-3">
            <div className="mb-1 flex items-center justify-between text-[12px]"><span className="text-white/55">{L({ en: "Reactive vs planned", th: "ฉุกเฉิน vs วางแผน" })}</span><span className="text-white/60">{p.reactivePct}% · {p.plannedPct}%</span></div>
            <div className="flex h-3 overflow-hidden rounded-full bg-white/8"><div className="h-full bg-rose-400/70" style={{ width: `${p.reactivePct}%` }} /><div className="h-full bg-emerald-400/70" style={{ width: `${p.plannedPct}%` }} /></div>
          </div>
        </Panel>
        <Panel title={L({ en: "Maintenance budget", th: "งบซ่อมบำรุง" })} sub={L({ en: "spend vs annual budget", th: "ที่ใช้ไป vs งบทั้งปี" })}>
          <div className="flex items-end justify-between"><p className="tabular text-3xl font-semibold text-white">{thbCompact(p.maintSpentYtd)}</p><p className="text-[12px] text-white/45">{L({ en: "of", th: "จาก" })} {thbCompact(p.maintBudgetYr)}</p></div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-accent-500" style={{ width: `${spendPct}%` }} /></div>
          <p className="mt-2 text-[12px] text-white/50">{spendPct}% {L({ en: "used · pace on track for full year", th: "ถูกใช้ · อัตราการใช้อยู่ในแผนทั้งปี" })}</p>
          <div className="mt-4 rounded-xl border border-brand-400/20 bg-brand-400/[0.05] p-3 text-[12px] text-brand-200">{L({ en: "Shifting Air Compressor 10 from repeat repair to replacement frees ~฿0.4M/yr of reactive spend.", th: "เปลี่ยน Air Compressor 10 จากซ่อมซ้ำเป็นเปลี่ยนใหม่ ช่วยลดค่าซ่อมฉุกเฉิน ~฿0.4M/ปี" })}</div>
        </Panel>
      </section>

      <Panel title={L({ en: "Where capital works hardest", th: "ลงทุนตรงไหนคุ้มสุด" })} sub={L({ en: "฿ risk removed per ฿ spent — fund top-down", th: "฿ ความเสี่ยงที่ลดได้ต่อ ฿ ที่จ่าย — จัดงบจากบนลงล่าง" })}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
              <th className="px-2 py-2.5 font-medium">{L({ en: "Asset", th: "เครื่อง" })}</th>
              <th className="px-2 py-2.5 font-medium">{L({ en: "Fix cost", th: "ค่าซ่อม" })}</th>
              <th className="px-2 py-2.5 font-medium">{L({ en: "฿ at risk", th: "฿ ที่เสี่ยง" })}</th>
              <th className="px-2 py-2.5 text-right font-medium">{L({ en: "Leverage", th: "ความคุ้ม" })}</th>
            </tr></thead>
            <tbody>{priority.map(({ a, leverage }) => (
              <tr key={a.id} onClick={() => onPick(a.id)} className="cursor-pointer border-t border-white/5 transition hover:bg-white/[0.02]">
                <td className="px-2 py-2.5"><p className="flex items-center gap-2 font-medium text-white/85"><CritBadge c={critClass(a)} L={L} />{a.name}</p></td>
                <td className="px-2 py-2.5 tabular text-emerald-300">{thbCompact(repairTHB(a))}</td>
                <td className="px-2 py-2.5 tabular text-rose-300">{thbCompact(riskTHB(a))}</td>
                <td className="px-2 py-2.5 text-right"><span className="inline-flex items-center gap-1 tabular text-[13px] font-semibold text-white/85"><ArrowUpRight size={13} className="text-emerald-300" />{leverage}×</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Panel>

      <Panel title={L({ en: "Repair-vs-replace · end-of-life assets", th: "ซ่อม vs เปลี่ยน · เครื่องหมดอายุ" })} sub={L({ en: "past economic life & still failing — replace to stop the bleed", th: "เกินอายุคุ้มค่า & ยังเสียซ้ำ — เปลี่ยนเพื่อหยุดต้นทุนบานปลาย" })} extra={<span className="chip text-rose-200">{replace.length}</span>}>
        {replace.length ? <div className="grid gap-2.5 sm:grid-cols-2">{replace.map((a) => { const rr = repairVsReplace(a); return (
          <div key={a.id} onClick={() => onPick(a.id)} className="cursor-pointer rounded-xl border border-white/8 bg-white/[0.02] p-3 transition hover:bg-white/[0.04]">
            <div className="flex items-center gap-2"><CritBadge c={critClass(a)} L={L} /><p className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/85">{a.name}</p><span className="shrink-0 rounded-md bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">{L({ en: "replace", th: "เปลี่ยน" })}</span></div>
            <p className="mt-1.5 text-[11px] text-white/50">{ageYears(a)}y / {lifeYears(a)}y · {L({ en: "replace", th: "เปลี่ยน" })} {thbCompact(rr.replace)}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/45">{L(rr.note)}</p>
          </div>
        ); })}</div> : <p className="py-6 text-center text-sm text-white/40">{L({ en: "No asset is past its economic life yet.", th: "ยังไม่มีเครื่องที่เกินอายุคุ้มค่า" })}</p>}
      </Panel>
    </div>
  );
}

/* ══════════════════════════ workspace ══════════════════════════ */
type TabId = "overview" | "registry" | "passport" | "reliability" | "economics";

export function AssetWorkspace() {
  const { locale } = useI18n();
  const L: Tr = (o) => (locale === "th" ? o.th : o.en);
  const [tab, setTab] = useState<TabId>("overview");
  const [role, setRole] = useState<Role>("engineer");
  const [selId, setSelId] = useState<string>("chiller-09");
  const wos = useWorkOrders();

  const openPassport = (id: string) => { setSelId(id); setTab("passport"); };
  const raiseWO = (a: Asset) => {
    createWorkOrder({ id: `asset-${a.id}`, code: `AIQ-${a.id.toUpperCase()}`, title: actionFor(a), asset: { en: a.name, th: a.name }, severity: a.status === "critical" ? "critical" : "warning", capex: repairTHB(a), annualSaving: riskTHB(a) - repairTHB(a), partsCount: spareFor(a).inStock ? 1 : 1 }, "asset");
  };

  const TABS: { id: TabId; icon: typeof Activity; label: LZ }[] = [
    { id: "overview", icon: LayoutDashboard, label: { en: "Overview", th: "ภาพรวม" } },
    { id: "registry", icon: ListTree, label: { en: "Registry", th: "ทะเบียนสินทรัพย์" } },
    { id: "passport", icon: IdCard, label: { en: "Asset passport", th: "โปรไฟล์สินทรัพย์" } },
    { id: "reliability", icon: ShieldCheck, label: { en: "Reliability & FMEA", th: "ความน่าเชื่อถือ & FMEA" } },
    { id: "economics", icon: Wallet, label: { en: "Economics", th: "เศรษฐศาสตร์สินทรัพย์" } },
  ];
  const showRole = tab === "overview" || tab === "passport";

  return (
    <main className="p-5 lg:p-8">
      <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-white/10">
        <div className="flex flex-1 gap-0.5 overflow-x-auto scrollbar-hide">
          {TABS.map((it) => { const on = tab === it.id; return (
            <button key={it.id} onClick={() => setTab(it.id)} className={cn("relative flex shrink-0 items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition", on ? "text-white" : "text-white/50 hover:text-white/80")}>
              <it.icon size={15} className={on ? "text-brand-300" : "text-white/40"} /><span className="whitespace-nowrap">{L(it.label)}</span>
              {on ? <motion.span layoutId="asset-tab-underline" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-400" transition={{ type: "spring", stiffness: 500, damping: 38 }} /> : null}
            </button>
          ); })}
        </div>
        {showRole ? (
          <div className="mb-1 flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
            {([["engineer", UserCog, { en: "Engineer", th: "วิศวกร" }], ["executive", PieChart, { en: "Executive", th: "ผู้บริหาร" }]] as [Role, typeof UserCog, LZ][]).map(([r, Icon, lab]) => (
              <button key={r} onClick={() => setRole(r)} className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition", role === r ? "bg-white/10 text-white/90" : "text-white/45 hover:text-white/70")}><Icon size={13} /> {L(lab)}</button>
            ))}
          </div>
        ) : null}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {tab === "overview" ? <OverviewView role={role} onPick={openPassport} L={L} /> : null}
        {tab === "registry" ? <RegistryView onPick={openPassport} wos={wos} L={L} /> : null}
        {tab === "passport" ? <PassportView selId={selId} setSel={setSelId} role={role} wos={wos} onRaise={raiseWO} L={L} /> : null}
        {tab === "reliability" ? <ReliabilityView onPick={openPassport} L={L} /> : null}
        {tab === "economics" ? <EconomicsView onPick={openPassport} L={L} /> : null}
      </motion.div>
    </main>
  );
}
