"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RpmReport, type ReportType } from "./RpmReport";
import { motion } from "framer-motion";
import {
  Gauge, AlertTriangle, Check, Wrench, ArrowRight, Thermometer, Zap,
  Activity, ShieldCheck, CircleDot, Radar, ChevronRight, ClipboardCheck, ExternalLink,
  FileText, Download, TrendingUp,
} from "lucide-react";
import { assetById, type Asset } from "@/lib/factory";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { WorkflowBar } from "@/components/os/WorkflowNav";
import { KpiCard } from "@/components/os/KpiCard";
import { series } from "@/lib/telemetry";
import { createWorkOrder, useWorkOrders, WO_STATUS, WO_FLOW, type WorkOrder } from "@/lib/workorders";
import {
  isoZone, ZONE_META, rpmKind, kindTabs, criticality, riskTHB, rpmFleet, FFT,
  diagnoses, diagnosisFor, roiProof, thbCompact, reliability, failurePareto,
  excessKw, excessCostYr, RPM_TARIFF, reportTemplates, recentReports,
  type IsoZone, type RpmKind, type Diagnosis, type LZ,
} from "@/lib/rpm";

type Tr = (o: LZ) => string;

/* ══════════════════════════════ shared bits ══════════════════════════════ */
function ZoneBadge({ z, L }: { z: IsoZone; L: Tr }) {
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ color: ZONE_META[z].text, backgroundColor: `${ZONE_META[z].hex}1f` }}>{z}</span>;
}
/** Live lifecycle status of a raised work order, read from the central store. */
function WoStatus({ wo, L }: { wo: WorkOrder; L: Tr }) {
  const meta = WO_STATUS[wo.status];
  const idx = WO_FLOW.indexOf(wo.status);
  return (
    <Link href="/os/workorders" className="group flex w-44 shrink-0 flex-col gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 transition hover:bg-white/[0.05]">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
        <span className="truncate text-[11px] font-semibold" style={{ color: meta.color }}>{L(meta.label)}</span>
        <ExternalLink size={11} className="ml-auto shrink-0 text-white/30 group-hover:text-white/50" />
      </div>
      <div className="flex gap-0.5">{WO_FLOW.map((s, i) => i <= idx ? <span key={s} className="h-1 flex-1 rounded-full" style={{ backgroundColor: meta.color }} /> : <span key={s} className="h-1 flex-1 rounded-full bg-white/12" />)}</div>
      <span className="text-[9px] text-white/40">{wo.id} · {L({ en: "step", th: "ขั้น" })} {idx + 1}/{WO_FLOW.length}</span>
    </Link>
  );
}
function KpiBand({ L }: { L: Tr }) {
  const alerts = rpmFleet.filter((a) => a.vibration >= 2.8).length;
  const avgVib = Math.round((rpmFleet.reduce((s, a) => s + a.vibration, 0) / rpmFleet.length) * 10) / 10;
  const soonest = [...diagnoses].sort((a, b) => (assetById(a.assetId)!.rulDays ?? 999) - (assetById(b.assetId)!.rulDays ?? 999))[0];
  const sa = assetById(soonest.assetId)!;
  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard label={L({ en: "Monitored assets", th: "เครื่องที่มอนิเตอร์" })} value={`${rpmFleet.length}`} accent="#f472b6" />
      <KpiCard label={L({ en: "Vibration alerts", th: "แจ้งเตือนความสั่น" })} value={`${alerts}`} delta="2 rising" deltaGood={false} accent="#f59e0b" spark={series(61, 16, { base: 50, amp: 10, trend: 6 })} />
      <KpiCard label={L({ en: "Avg vibration", th: "ความสั่นเฉลี่ย" })} value={`${avgVib}`} unit="mm/s" delta={L({ en: "Stable", th: "คงที่" })} deltaGood accent="#22d3ee" spark={series(62, 16, { base: 50, amp: 5 })} />
      <KpiCard label={L({ en: "Soonest failure", th: "จะพังเร็วสุด" })} value={`~${sa.rulDays}d`} delta={`${thbCompact(riskTHB(sa))} ${L({ en: "at risk", th: "เสี่ยง" })}`} deltaGood={false} accent="#f43f5e" />
    </section>
  );
}
function RoiStrip({ L }: { L: Tr }) {
  return (
    <section className="grid grid-cols-2 gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05] p-4 sm:grid-cols-4">
      <div className="flex items-center gap-2 sm:col-span-1"><ShieldCheck size={20} className="shrink-0 text-emerald-300" /><p className="text-[12px] font-semibold text-emerald-200">{L({ en: "This quarter, PdM caught it early", th: "ไตรมาสนี้ PdM จับได้ก่อนพัง" })}</p></div>
      <div><p className="tabular text-xl font-semibold text-white">{roiProof.caughtEarly}</p><p className="text-[11px] text-white/45">{L({ en: "failures prevented", th: "ครั้งที่กันพังได้" })}</p></div>
      <div><p className="tabular text-xl font-semibold text-emerald-300">{thbCompact(roiProof.savedTHB)}</p><p className="text-[11px] text-white/45">{L({ en: "saved vs run-to-failure", th: "ประหยัดเทียบปล่อยจนพัง" })}</p></div>
      <div><p className="tabular text-xl font-semibold text-white">−{roiProof.unplannedReductionPct}%</p><p className="text-[11px] text-white/45">{L({ en: "unplanned downtime", th: "ดาวน์ไทม์ไม่วางแผน" })} · {roiProof.downtimeHoursAvoided}h</p></div>
    </section>
  );
}

/* ══════════════════════════ FFT · ISO · diagnosis ══════════════════════════ */
function FaultSpectrum({ fftKey }: { fftKey: keyof typeof FFT }) {
  const bars = FFT[fftKey];
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: 64 }}>
        {bars.map((b, i) => (
          <div key={i} className="flex-1 rounded-sm" style={{ height: `${(b.mag / 60) * 100}%`, backgroundColor: b.fault ? "#f43f5e" : undefined }}>
            {!b.fault ? <div className="h-full w-full rounded-sm bg-white/15" /> : null}
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {bars.map((b, i) => <span key={i} className={cn("flex-1 text-center text-[9px]", b.fault ? "font-semibold text-rose-300" : "text-white/30")}>{b.label ?? ""}</span>)}
      </div>
    </div>
  );
}
function IsoBar({ zone, daysToD, L }: { zone: IsoZone; daysToD: number | null; L: Tr }) {
  const zones: IsoZone[] = ["A", "B", "C", "D"];
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] text-white/45">{L({ en: "ISO 10816 severity", th: "ความรุนแรง ISO 10816" })}</span>
        <span className={cn("text-[11px] font-medium", zone === "D" ? "text-rose-300" : "text-amber-300")}>{zone === "D" ? L({ en: "already zone D · act now", th: "อยู่โซน D แล้ว · ต้องทำทันที" }) : <>{L({ en: "reaches zone D in", th: "ถึงโซน D ใน" })} ~{daysToD}{L({ en: "d", th: " วัน" })}</>}</span>
      </div>
      <div className="flex gap-1">
        {zones.map((z) => <div key={z} className="relative h-2.5 flex-1 rounded-full" style={{ backgroundColor: z === zone ? ZONE_META[z].hex : `${ZONE_META[z].hex}33` }}>{z === zone ? <CircleDot size={12} className="absolute -top-1 left-1/2 -translate-x-1/2 text-white" /> : null}</div>)}
      </div>
      <div className="mt-1 flex gap-1 text-[9px] text-white/35">{zones.map((z) => <span key={z} className={cn("flex-1 text-center", z === zone && "font-semibold text-white/70")}>{L(ZONE_META[z].label)}</span>)}</div>
    </div>
  );
}
function DiagnosisCard({ d, a, L, onCreateWO, raised }: { d: Diagnosis; a: Asset; L: Tr; onCreateWO: () => void; raised?: WorkOrder }) {
  const zone = isoZone(a.vibration);
  const saved = d.runToFailure - d.fixNow;
  const kindName = kindTabs.find((k) => k.id === rpmKind(a))?.label;
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/12 text-amber-300"><Gauge size={19} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{a.name}<span className="ml-1.5 text-xs font-normal text-white/40">· {kindName ? L(kindName) : a.type}</span></h3>
          <p className="text-[11px] text-white/45">{d.rpm.toLocaleString()} rpm · {L({ en: "bearing", th: "แบริ่ง" })} {d.bearing} · {L({ en: "confidence", th: "มั่นใจ" })} {d.confidence}%</p>
        </div>
        <ZoneBadge z={zone} L={L} />
      </div>
      <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/[0.08] p-3">
        <p className="flex items-center gap-1.5 text-sm font-medium text-rose-200"><AlertTriangle size={14} className="shrink-0" /> {L({ en: "Detected:", th: "ตรวจพบ:" })} {L(d.fault)}</p>
        <p className="mt-1 text-[12px] text-rose-300/70">{L({ en: "Evidence:", th: "หลักฐาน:" })} {L(d.evidence)}</p>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-[11px] text-white/45">{L({ en: "Vibration spectrum (FFT) — fault peaks highlighted", th: "สเปกตรัมความสั่น (FFT) — พีคผิดปกติถูกไฮไลต์" })}</p>
        <FaultSpectrum fftKey={d.fftKey} />
      </div>
      <div className="mt-4"><IsoBar zone={zone} daysToD={d.daysToZoneD} L={L} /></div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5"><p className="flex items-center gap-1 text-[10px] text-white/45"><Activity size={11} /> {L({ en: "Vibration", th: "ความสั่น" })}</p><p className="mt-1 tabular text-[13px] font-semibold" style={{ color: ZONE_META[zone].text }}>{a.vibration} mm/s</p></div>
        <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5"><p className="flex items-center gap-1 text-[10px] text-white/45"><Thermometer size={11} /> {L({ en: "Bearing temp", th: "อุณหภูมิแบริ่ง" })}</p><p className={cn("mt-1 tabular text-[13px] font-semibold", d.tempDelta >= 5 ? "text-amber-300" : "text-white/75")}>+{d.tempDelta}°C</p></div>
        <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5"><p className="flex items-center gap-1 text-[10px] text-white/45"><Zap size={11} /> {L({ en: "Current · MCSA", th: "กระแส · MCSA" })}</p><p className={cn("mt-1 truncate text-[13px] font-semibold", /sideband|harmonic/.test(d.mcsa.en) ? "text-rose-300" : "text-white/75")}>{L(d.mcsa)}</p></div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3">
        <div className="flex-1"><p className="text-[10px] text-white/45">{L({ en: "Run-to-failure", th: "ปล่อยจนพัง" })}</p><p className="tabular text-base font-semibold text-rose-300">{thbCompact(d.runToFailure)}</p></div>
        <ArrowRight size={15} className="text-white/25" />
        <div className="flex-1"><p className="text-[10px] text-white/45">{L({ en: "Prevent now", th: "กันไว้ตอนนี้" })}</p><p className="tabular text-base font-semibold text-emerald-300">{thbCompact(d.fixNow)}</p></div>
        <div className="flex-1 text-right"><p className="text-[10px] text-white/45">{L({ en: "Saved", th: "ประหยัด" })}</p><p className="tabular text-base font-semibold text-emerald-300">{thbCompact(saved)}</p></div>
      </div>
      <div className="mt-4 border-t border-white/8 pt-3">
        <p className="flex items-start gap-1.5 text-[13px] text-white/85"><Wrench size={14} className="mt-0.5 shrink-0 text-brand-300" /> {L(d.action)}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium", d.partsInStock ? "bg-emerald-500/12 text-emerald-300" : "bg-amber-500/12 text-amber-300")}>{d.partsInStock ? <Check size={12} /> : <AlertTriangle size={12} />}{d.partsInStock ? L({ en: "parts in stock", th: "อะไหล่พร้อมในสต็อก" }) : L({ en: "parts on order", th: "รอสั่งอะไหล่" })}</span>
          <span className="whitespace-nowrap rounded-md bg-brand-400/12 px-2 py-1 text-[11px] font-medium text-brand-200">{L({ en: "window:", th: "ช่วงว่าง:" })} {L(d.window)}</span>
          {raised ? (
            <div className="ml-auto"><WoStatus wo={raised} L={L} /></div>
          ) : (
            <button onClick={onCreateWO} className="btn-glow ml-auto whitespace-nowrap px-3 py-1.5 text-[12px]">{L({ en: "Create work order", th: "สร้าง Work Order" })} <ArrowRight size={13} /></button>
          )}
        </div>
      </div>
    </div>
  );
}
function FleetMatrix({ fleet, onPick, L }: { fleet: Asset[]; onPick: (id: string) => void; L: Tr }) {
  const [hover, setHover] = useState<string | null>(null);
  const W = 520, H = 300, PL = 40, PB = 34, PT = 14, PR = 14;
  const xMax = 6.5, yMax = 100;
  const cx = (v: number) => PL + (Math.min(v, xMax) / xMax) * (W - PL - PR);
  const cy = (c: number) => H - PB - (c / yMax) * (H - PB - PT);
  const rOf = (risk: number) => 5 + Math.min(11, risk / 130000);
  const hv = hover ? fleet.find((a) => a.id === hover) : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <rect x={cx(2.8)} y={PT} width={W - PR - cx(2.8)} height={cy(65) - PT} fill="#f43f5e" opacity="0.09" />
        <line x1={cx(2.8)} x2={cx(2.8)} y1={PT} y2={H - PB} stroke="rgba(120,130,150,0.4)" strokeDasharray="4 4" />
        <line x1={PL} x2={W - PR} y1={cy(65)} y2={cy(65)} stroke="rgba(120,130,150,0.4)" strokeDasharray="4 4" />
        <text x={PL} y={H - 8} style={{ fontSize: 10, fill: "var(--muted)" }}>{L({ en: "condition →", th: "สภาพ →" })}</text>
        <text x={W - PR} y={H - 8} textAnchor="end" style={{ fontSize: 10, fill: "var(--c-rose)" }}>{L({ en: "worse (mm/s)", th: "แย่ลง (mm/s)" })}</text>
        <text x={cx(2.85)} y={PT + 12} style={{ fontSize: 10, fill: "var(--c-rose)" }}>{L({ en: "▲ act this week", th: "▲ แตะสัปดาห์นี้" })}</text>
        <text x={8} y={PT + 10} style={{ fontSize: 10, fill: "var(--muted)" }}>{L({ en: "criticality", th: "ความวิกฤต" })}</text>
        {fleet.map((a) => {
          const z = isoZone(a.vibration); const has = !!diagnosisFor(a.id);
          return (
            <g key={a.id} onMouseEnter={() => setHover(a.id)} onMouseLeave={() => setHover(null)} onClick={() => onPick(a.id)} style={{ cursor: has ? "pointer" : "default" }}>
              <circle cx={cx(a.vibration)} cy={cy(criticality(a))} r={rOf(riskTHB(a))} fill={ZONE_META[z].hex} fillOpacity={hover === a.id ? 0.95 : 0.82} stroke={ZONE_META[z].hex} strokeWidth={has ? 2 : 1} />
            </g>
          );
        })}
      </svg>
      {hv ? (
        <div className="dark-screen pointer-events-none absolute left-3 top-3 rounded-lg border border-white/10 bg-[#0f1420]/95 px-3 py-2 shadow-xl">
          <p className="text-[12px] font-semibold text-white/90">{hv.name}</p>
          <p className="text-[11px] text-white/50">{hv.vibration} mm/s · {L({ en: "risk", th: "เสี่ยง" })} {thbCompact(riskTHB(hv))} · {L({ en: "ISO", th: "ISO" })} {isoZone(hv.vibration)}</p>
          {diagnosisFor(hv.id) ? <p className="text-[10px] text-brand-300">{L({ en: "click to diagnose ▸", th: "คลิกเพื่อวินิจฉัย ▸" })}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

/* ══════════════════════════════ step views ══════════════════════════════ */
/* 02 Insight — fleet triage + ROI proof (former Dashboard, minus the KPI band which now lives on 01 Monitor) */
function InsightView({ fleet, onPick, L }: { fleet: Asset[]; onPick: (id: string) => void; L: Tr }) {
  const priority = [...fleet].filter((a) => ["C", "D"].includes(isoZone(a.vibration))).sort((a, b) => riskTHB(b) - riskTHB(a)).slice(0, 6);
  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="panel p-5">
          <div className="flex items-center justify-between"><h3 className="font-semibold">{L({ en: "Fleet Triage", th: "จัดลำดับทั้งฟลีต" })}</h3><span className="chip whitespace-nowrap text-white/45">{L({ en: "criticality × condition", th: "ความวิกฤต × สภาพ" })}</span></div>
          <p className="mt-1 text-xs text-white/45">{L({ en: "Bubble = machine · size = ฿ at risk · color = ISO zone · click to diagnose", th: "แต่ละวง = เครื่อง · ขนาด = ฿ ที่เสี่ยง · สี = โซน ISO · คลิกเพื่อวินิจฉัย" })}</p>
          <div className="mt-3"><FleetMatrix fleet={fleet} onPick={onPick} L={L} /></div>
          <div className="mt-2 flex flex-wrap gap-3">{(["A", "B", "C", "D"] as IsoZone[]).map((z) => <span key={z} className="flex items-center gap-1.5 text-[11px] text-white/50"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ZONE_META[z].hex }} />{L(ZONE_META[z].label)}</span>)}</div>
        </div>
        <div className="panel p-5">
          <h3 className="font-semibold">{L({ en: "Touch This Week", th: "ต้องแตะสัปดาห์นี้" })}</h3>
          <p className="mt-1 text-xs text-white/45">{L({ en: "worst condition × highest ฿ at risk", th: "สภาพแย่สุด × ฿ ที่เสี่ยงสูงสุด" })}</p>
          <ul className="mt-3 space-y-1.5">
            {priority.map((a) => { const z = isoZone(a.vibration); const has = !!diagnosisFor(a.id); return (
              <li key={a.id} onClick={() => onPick(a.id)} className={cn("flex items-center gap-2.5 rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 transition", has && "cursor-pointer hover:bg-white/[0.04]")}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-semibold" style={{ color: ZONE_META[z].text, backgroundColor: `${ZONE_META[z].hex}1f` }}>{z}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-white/85">{a.name}</p><p className="truncate text-[10px] text-white/40">{a.vibration} mm/s · {a.type}</p></div>
                <span className="shrink-0 tabular text-[12px] font-semibold text-rose-300">{thbCompact(riskTHB(a))}</span>
                {has ? <ChevronRight size={14} className="shrink-0 text-white/30" /> : <span className="w-3.5 shrink-0" />}
              </li>
            ); })}
          </ul>
        </div>
      </section>
      <RoiStrip L={L} />
    </div>
  );
}

/* Monitoring = fleet health + ISO distribution + live condition register (nameplate + sensors) */
function MonitoringView({ fleet, onPick, L }: { fleet: Asset[]; onPick: (id: string) => void; L: Tr }) {
  const ranked = [...fleet].sort((a, b) => b.vibration - a.vibration);
  const avg = Math.round(fleet.reduce((s, a) => s + a.health, 0) / fleet.length);
  const dist: Record<IsoZone, number> = { A: 0, B: 0, C: 0, D: 0 };
  fleet.forEach((a) => (dist[isoZone(a.vibration)] += 1));
  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <div className="panel flex flex-col items-center justify-center p-6">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">{L({ en: "Fleet health", th: "สุขภาพฟลีต" })}</p>
          <p className={cn("mt-2 tabular text-5xl font-bold", avg >= 85 ? "text-emerald-300" : avg >= 70 ? "text-amber-300" : "text-rose-300")}>{avg}</p>
          <p className="text-[11px] text-white/40">/ 100 · {L({ en: "avg across", th: "เฉลี่ยจาก" })} {fleet.length}</p>
        </div>
        <div className="panel p-5">
          <h3 className="font-semibold">{L({ en: "ISO Zone Distribution", th: "การกระจายโซน ISO" })}</h3>
          <p className="mt-1 text-xs text-white/45">{L({ en: "how many machines sit in each severity band", th: "จำนวนเครื่องในแต่ละระดับความรุนแรง" })}</p>
          <div className="mt-4 space-y-2.5">{(["A", "B", "C", "D"] as IsoZone[]).map((z) => { const pct = Math.round((dist[z] / fleet.length) * 100); return (
            <div key={z} className="flex items-center gap-3"><span className="w-24 shrink-0 text-[12px]" style={{ color: ZONE_META[z].text }}>{L(ZONE_META[z].label)}</span><div className="h-3 flex-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: ZONE_META[z].hex }} /></div><span className="w-10 shrink-0 text-right tabular text-[12px] font-semibold text-white/75">{dist[z]}</span></div>
          ); })}</div>
        </div>
      </section>

      <section className="panel overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-white/10 p-5">
          <Gauge size={18} className="text-pink-300" />
          <div><h3 className="font-semibold">{L({ en: "Live Condition Register", th: "ทะเบียนเฝ้าระวังสภาพปัจจุบัน" })}</h3><p className="mt-0.5 text-xs text-white/45">{L({ en: "nameplate · vibration · ISO zone · failure mode · ฿ at risk", th: "ข้อมูลเครื่อง · ความสั่น · โซน ISO · ชนิดความเสียหาย · ฿ ที่เสี่ยง" })}</p></div>
          <span className="ml-auto flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>{fleet.length} {L({ en: "streaming", th: "สตรีม" })}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
              <th className="px-5 py-3 font-medium">{L({ en: "Asset", th: "เครื่อง" })}</th>
              <th className="px-3 py-3 font-medium">{L({ en: "Power", th: "กำลัง" })}</th>
              <th className="px-3 py-3 font-medium">{L({ en: "ISO", th: "ISO" })}</th>
              <th className="px-3 py-3 font-medium">{L({ en: "Vibration", th: "ความสั่น" })}</th>
              <th className="px-3 py-3 font-medium">{L({ en: "Failure mode", th: "ชนิดความเสียหาย" })}</th>
              <th className="px-3 py-3 font-medium">{L({ en: "Temp", th: "อุณหภูมิ" })}</th>
              <th className="px-5 py-3 text-right font-medium">{L({ en: "฿ at risk", th: "฿ ที่เสี่ยง" })}</th>
            </tr></thead>
            <tbody>{ranked.map((a) => { const z = isoZone(a.vibration); const dg = diagnosisFor(a.id); return (
              <tr key={a.id} onClick={() => dg && onPick(a.id)} className={cn("border-t border-white/5 transition hover:bg-white/[0.02]", dg && "cursor-pointer")}>
                <td className="px-5 py-3"><p className="font-medium text-white/90">{a.name}</p><p className="text-xs text-white/40">{a.type}</p></td>
                <td className="px-3 py-3 tabular text-white/60">{a.powerKw} kW</td>
                <td className="px-3 py-3"><ZoneBadge z={z} L={L} /></td>
                <td className="px-3 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (a.vibration / 6) * 100)}%`, backgroundColor: ZONE_META[z].hex }} /></div><span className="tabular text-xs" style={{ color: ZONE_META[z].text }}>{a.vibration} mm/s</span></div></td>
                <td className="px-3 py-3">{dg ? <span className="inline-flex items-center gap-1 text-xs text-rose-300"><AlertTriangle size={11} className="shrink-0 text-rose-300" /> {L(dg.fault)}</span> : <span className="text-xs text-white/30">{L({ en: "no fault signature", th: "ไม่พบสัญญาณผิดปกติ" })}</span>}</td>
                <td className="px-3 py-3 tabular text-white/60">{a.tempC}°C</td>
                <td className="px-5 py-3 text-right tabular"><span className={cn(dg ? "font-semibold text-rose-300" : "text-white/40")}>{thbCompact(riskTHB(a))}</span></td>
              </tr>
            ); })}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AnalyticsView({ diagList, selDiag, selAsset, setSelId, raised, onCreateWO, L }: { diagList: Diagnosis[]; selDiag: Diagnosis; selAsset: Asset; setSelId: (id: string) => void; raised?: WorkOrder; onCreateWO: () => void; L: Tr }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-white/40">{L({ en: "Diagnose", th: "วินิจฉัย" })}</span>
        {diagList.map((d) => { const a = assetById(d.assetId)!; const on = d.assetId === selDiag.assetId; return (
          <button key={d.assetId} onClick={() => setSelId(d.assetId)} className={cn("whitespace-nowrap rounded-lg border px-3 py-1.5 text-[12px] font-medium transition", on ? "border-brand-400/40 bg-brand-400/12 text-brand-200" : "border-white/10 bg-white/[0.02] text-white/55 hover:text-white/80")}>{a.name}</button>
        ); })}
      </div>
      {diagList.length ? (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <motion.div key={selDiag.assetId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><DiagnosisCard d={selDiag} a={selAsset} L={L} onCreateWO={onCreateWO} raised={raised} /></motion.div>
          <div className="panel p-5">
            <h3 className="flex items-center gap-2 font-semibold"><Radar size={16} className="text-brand-300" /> {L({ en: "Predictive Horizon", th: "พยากรณ์ล่วงหน้า" })}</h3>
            <p className="mt-1 text-xs text-white/45">{L({ en: "AI-projected failures, ranked by expected ฿", th: "ความเสียหายที่ AI คาด เรียงตาม ฿ ที่คาด" })}</p>
            <ul className="mt-3 space-y-2">{[...diagList].sort((a, b) => b.runToFailure - a.runToFailure).map((d) => { const a = assetById(d.assetId)!; return (
              <li key={d.assetId} onClick={() => setSelId(d.assetId)} className="cursor-pointer rounded-xl border border-white/8 bg-white/[0.02] p-3 transition hover:bg-white/[0.04]">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[13px] font-medium text-white/90">{a.name}</p><p className="text-[11px] text-white/45">{L(d.fault)} · {d.daysToZoneD ? <>{L({ en: "in", th: "ใน" })} ~{d.daysToZoneD}{L({ en: "d", th: " วัน" })}</> : L({ en: "now", th: "ตอนนี้" })}</p></div><span className="shrink-0 rounded-md bg-white/8 px-2 py-0.5 text-[11px] font-semibold tabular text-white/70">{d.confidence}%</span></div>
                <p className="mt-1.5 text-[12px]">{L({ en: "Impact", th: "กระทบ" })} <span className="font-semibold text-rose-300">{thbCompact(d.runToFailure)}</span></p>
              </li>
            ); })}</ul>
          </div>
        </div>
      ) : <div className="panel p-10 text-center text-sm text-white/40">{L({ en: "No active fault signature in this equipment group.", th: "ไม่พบสัญญาณผิดปกติในกลุ่มเครื่องนี้" })}</div>}
    </div>
  );
}

function MaintenanceView({ queue, pendingCount, raisedFor, raiseWO, gotoAnalysis, L }: { queue: Diagnosis[]; pendingCount: number; raisedFor: (id: string) => WorkOrder | undefined; raiseWO: (d: Diagnosis) => void; gotoAnalysis: (id: string) => void; L: Tr }) {
  return (
    <div className="space-y-6">
      <RoiStrip L={L} />
      <section className="panel overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-white/10 p-5"><Wrench size={18} className="text-brand-300" /><div><h3 className="font-semibold">{L({ en: "Prescriptive Work-Order Queue", th: "คิวงานซ่อมเชิงป้องกัน" })}</h3><p className="mt-0.5 text-xs text-white/45">{L({ en: "ranked by ฿ saved — approve to raise the work order", th: "เรียงตาม ฿ ที่ประหยัด — กดเพื่อออกใบสั่งงาน" })}</p></div><span className="chip ml-auto whitespace-nowrap">{pendingCount} {L({ en: "pending", th: "รอดำเนินการ" })}</span></div>
        <ul>{queue.map((d) => { const a = assetById(d.assetId)!; const z = isoZone(a.vibration); const raised = raisedFor(d.assetId); return (
          <li key={d.assetId} className={cn("flex flex-col gap-3 border-t border-white/5 p-4 transition sm:flex-row sm:items-center", raised && "opacity-60")}>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[11px] font-semibold" style={{ color: ZONE_META[z].text, backgroundColor: `${ZONE_META[z].hex}1f` }}>{z}</span>
            <div className="min-w-0 flex-1"><p className="text-sm font-medium text-white/90">{a.name} <span className="text-white/40">· {L(d.fault)}</span></p><p className="mt-0.5 flex items-start gap-1.5 text-[12px] text-white/55"><Wrench size={12} className="mt-0.5 shrink-0 text-brand-300" /> {L(d.action)}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium", d.partsInStock ? "bg-emerald-500/12 text-emerald-300" : "bg-amber-500/12 text-amber-300")}>{d.partsInStock ? <Check size={10} /> : <AlertTriangle size={10} />}{d.partsInStock ? L({ en: "in stock", th: "มีสต็อก" }) : L({ en: "on order", th: "รอสั่ง" })}</span><span className="whitespace-nowrap rounded-md bg-brand-400/12 px-1.5 py-0.5 text-[10px] font-medium text-brand-200">{L(d.window)}</span></div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="text-right"><p className="text-[10px] uppercase tracking-wider text-white/35">{L({ en: "saves", th: "ประหยัด" })}</p><p className="tabular text-base font-semibold text-emerald-300">{thbCompact(d.runToFailure - d.fixNow)}</p></div>
              {raised ? (
                <WoStatus wo={raised} L={L} />
              ) : (
                <div className="flex items-center gap-1.5"><button onClick={() => gotoAnalysis(d.assetId)} className="whitespace-nowrap rounded-lg border border-white/12 bg-white/5 px-2.5 py-1.5 text-[12px] text-white/70 transition hover:bg-white/10">{L({ en: "Analyse", th: "วิเคราะห์" })}</button><button onClick={() => raiseWO(d)} className="btn-glow whitespace-nowrap px-3 py-1.5 text-[12px]">{L({ en: "Create WO", th: "ออก WO" })}</button></div>
              )}
            </div>
          </li>
        ); })}</ul>
      </section>
    </div>
  );
}

/* Reliability = MTBF/MTTR/availability + failure Pareto + energy cost of poor condition */
function ReliabilityView({ fleet, L }: { fleet: Asset[]; L: Tr }) {
  const totalKw = Math.round(fleet.reduce((s, a) => s + a.powerKw, 0));
  const dailyCost = Math.round(totalKw * 16 * RPM_TARIFF);
  const wasters = [...fleet].filter((a) => excessKw(a) > 0).sort((a, b) => excessCostYr(b) - excessCostYr(a));
  const wasteYr = wasters.reduce((s, a) => s + excessCostYr(a), 0);
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="panel p-5"><p className="text-[11px] uppercase tracking-wider text-white/45">{L({ en: "MTBF", th: "MTBF (เวลาเฉลี่ยระหว่างเสีย)" })}</p><p className="mt-1 tabular text-3xl font-semibold text-white">{reliability.mtbfDays}<span className="text-sm font-normal text-white/40"> {L({ en: "days", th: "วัน" })}</span></p><p className="mt-1 flex items-center gap-1 text-[12px] text-emerald-300"><TrendingUp size={13} /> +{reliability.mtbfDeltaPct}% {L({ en: "with PdM", th: "หลังใช้ PdM" })}</p></div>
        <div className="panel p-5"><p className="text-[11px] uppercase tracking-wider text-white/45">{L({ en: "MTTR", th: "MTTR (เวลาเฉลี่ยซ่อม)" })}</p><p className="mt-1 tabular text-3xl font-semibold text-white">{reliability.mttrHours}<span className="text-sm font-normal text-white/40"> h</span></p><p className="mt-1 flex items-center gap-1 text-[12px] text-emerald-300"><TrendingUp size={13} className="rotate-180" /> {reliability.mttrDeltaPct}% {L({ en: "faster repairs", th: "ซ่อมเร็วขึ้น" })}</p></div>
        <div className="panel p-5"><p className="text-[11px] uppercase tracking-wider text-white/45">{L({ en: "Availability", th: "ความพร้อมใช้งาน" })}</p><p className="mt-1 tabular text-3xl font-semibold text-emerald-300">{reliability.availabilityPct}<span className="text-sm font-normal text-white/40">%</span></p><p className="mt-1 text-[12px] text-white/45">{L({ en: "rotating fleet uptime", th: "เวลาพร้อมใช้ของเครื่องหมุน" })}</p></div>
      </section>

      <section className="panel p-5">
        <h3 className="font-semibold leading-tight text-white">{L({ en: "Failure Pareto", th: "Pareto ความเสียหาย" })}</h3>
        <p className="mt-0.5 truncate text-[11px] leading-tight text-white/40">{L({ en: "what actually breaks", th: "อะไรพังจริง" })}</p>
        <p className="mt-1 text-xs text-white/45">{L({ en: "share of downtime cost by root failure mode", th: "สัดส่วนต้นทุนดาวน์ไทม์ตามต้นเหตุความเสียหาย" })}</p>
        <div className="mt-4 space-y-2.5">{failurePareto.map((f) => (
          <div key={f.mode.en} className="flex items-center gap-3"><span className="w-28 shrink-0 break-words leading-tight text-[12px] text-white/70">{L(f.mode)}</span><div className="h-3 flex-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-rose-400/70" style={{ width: `${f.costShare}%` }} /></div><span className="w-24 shrink-0 text-right text-[11px] text-white/50">{f.count} {L({ en: "events", th: "ครั้ง" })} · {f.costShare}%</span></div>
        ))}</div>
        <p className="mt-3 rounded-lg border border-brand-400/20 bg-brand-400/[0.05] p-2.5 text-[12px] text-brand-200">{L({ en: "Bearings drive 42% of cost — a wireless bearing-temp + vibration kit pays back fastest.", th: "แบริ่งคิดเป็น 42% ของต้นทุน — ชุดเซนเซอร์อุณหภูมิ+ความสั่นแบบไร้สายคืนทุนเร็วสุด" })}</p>
      </section>

      <section className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h3 className="flex items-center gap-2 font-semibold"><Zap size={16} className="text-amber-300" /> {L({ en: "Energy Cost of Poor Condition", th: "ต้นทุนพลังงานจากสภาพเสื่อม" })}</h3><p className="mt-1 text-xs text-white/45">{L({ en: "degraded machines draw extra kW — reliability & energy in one fix", th: "เครื่องที่เสื่อมกินไฟเกิน — แก้ทีเดียวได้ทั้งความน่าเชื่อถือและพลังงาน" })}</p></div>
          <div className="text-right"><p className="tabular text-2xl font-semibold text-rose-300">{thbCompact(wasteYr)}<span className="text-sm font-normal text-white/40">/{L({ en: "yr", th: "ปี" })}</span></p><p className="text-[11px] text-white/40">{L({ en: "of", th: "จาก" })} {totalKw.toLocaleString()} kW · {thbCompact(dailyCost)}/{L({ en: "day", th: "วัน" })}</p></div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">{wasters.slice(0, 6).map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-semibold" style={{ color: ZONE_META[isoZone(a.vibration)].text, backgroundColor: `${ZONE_META[isoZone(a.vibration)].hex}1f` }}>{isoZone(a.vibration)}</span><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-white/85">{a.name}</p><p className="text-[10px] text-white/40">{a.powerKw} kW · +{excessKw(a)} kW {L({ en: "excess", th: "ส่วนเกิน" })}</p></div><span className="shrink-0 tabular text-[12px] font-semibold text-rose-300">{thbCompact(excessCostYr(a))}/{L({ en: "yr", th: "ปี" })}</span></div>
        ))}</div>
      </section>
    </div>
  );
}

function ReportsView({ L }: { L: Tr }) {
  const [open, setOpen] = useState<ReportType | null>(null);
  const [dateStr, setDateStr] = useState("");
  useEffect(() => { setDateStr(new Date().toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })); }, []);
  return (
    <div className="space-y-6">
      {open ? <RpmReport type={open} dateStr={dateStr} onClose={() => setOpen(null)} /> : null}
      <section className="grid gap-4 sm:grid-cols-2">{reportTemplates.map((r) => (
        <div key={r.id} className="panel flex flex-col p-5">
          <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-400/12 text-brand-300"><FileText size={17} /></span><h3 className="font-semibold">{L(r.name)}</h3></div>
          <p className="mt-2 flex-1 text-[13px] leading-relaxed text-white/50">{L(r.desc)}</p>
          <button onClick={() => setOpen(r.id as ReportType)} className="btn-glow mt-3 w-full justify-center py-2 text-[13px]"><Download size={14} /> {L({ en: "Generate PDF", th: "ออกรายงาน PDF" })}</button>
        </div>
      ))}</section>
      <section className="panel p-5">
        <h3 className="font-semibold">{L({ en: "Recent Reports", th: "รายงานล่าสุด" })}</h3>
        <ul className="mt-3 divide-y divide-white/5">{recentReports.map((r) => (
          <li key={r.name} className="flex items-center gap-3 py-2.5"><FileText size={15} className="shrink-0 text-white/40" /><span className="min-w-0 flex-1 truncate text-[13px] text-white/80">{r.name}</span><span className="shrink-0 text-[11px] text-white/40">{r.date} · {L(r.by)}</span><button className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 transition hover:bg-white/10"><Download size={12} /></button></li>
        ))}</ul>
      </section>
    </div>
  );
}

/* ══════════════════════════════ workspace ══════════════════════════════ */
/* Standard FactoryOS 5-step workflow:
   01 Monitor → 02 Insight → 03 AI Analysis → 04 AI Recommendation & Action → 05 Report */

export function RpmWorkspace() {
  const { locale } = useI18n();
  const L: Tr = (o) => (locale === "th" ? o.th : o.en);
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<RpmKind | "all">("all");
  const [selId, setSelId] = useState<string>(diagnoses[0].assetId);
  const wos = useWorkOrders();

  const fleet = rpmFleet.filter((a) => kind === "all" || rpmKind(a) === kind);
  const diagList = diagnoses.filter((d) => kind === "all" || rpmKind(assetById(d.assetId)!) === kind);
  const selDiag = diagList.find((d) => d.assetId === selId) ?? diagList[0] ?? diagnoses[0];
  const selAsset = assetById(selDiag.assetId)!;

  const raisedFor = (assetId: string) => wos.find((w) => w.findingId === `rpm-${assetId}`);
  const queue = [...diagList].sort((a, b) => {
    const ra = raisedFor(a.assetId) ? 1 : 0, rb = raisedFor(b.assetId) ? 1 : 0;
    if (ra !== rb) return ra - rb;
    return (b.runToFailure - b.fixNow) - (a.runToFailure - a.fixNow);
  });
  const pendingCount = queue.filter((d) => !raisedFor(d.assetId)).length;
  const raiseWO = (d: Diagnosis) => {
    const a = assetById(d.assetId)!;
    createWorkOrder({ id: `rpm-${d.assetId}`, code: `RPM-${d.assetId.toUpperCase()}`, title: d.action, asset: { en: a.name, th: a.name }, severity: isoZone(a.vibration) === "D" ? "critical" : "warning", capex: d.fixNow, annualSaving: d.runToFailure - d.fixNow, partsCount: 1 }, "asset");
  };
  const gotoAnalysis = (id: string) => { if (diagnosisFor(id)) { setSelId(id); setStep(2); } };

  const showFilter = step < 4; // equipment-kind chips apply to every step except 05 Report

  return (
    <main className="p-5 lg:p-8">
      <div className="mb-5">
        <WorkflowBar step={step} setStep={setStep} L={L} />
      </div>

      {showFilter ? (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-white/40">{L({ en: "Equipment", th: "ชนิดเครื่อง" })}</span>
          <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
            {kindTabs.map((k) => { const n = k.id === "all" ? rpmFleet.length : rpmFleet.filter((a) => rpmKind(a) === k.id).length; return (
              <button key={k.id} onClick={() => setKind(k.id)} disabled={n === 0} className={cn("whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition", kind === k.id ? "bg-white/10 text-white/90" : n === 0 ? "cursor-not-allowed text-white/20" : "text-white/45 hover:text-white/70")}>{L(k.label)} <span className="tabular text-white/30">{n}</span></button>
            ); })}
          </div>
        </div>
      ) : null}

      <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {step === 0 ? (
          <div className="space-y-6">
            <KpiBand L={L} />
            <MonitoringView fleet={fleet} onPick={gotoAnalysis} L={L} />
          </div>
        ) : null}
        {step === 1 ? (
          <div className="space-y-6">
            <InsightView fleet={fleet} onPick={gotoAnalysis} L={L} />
            <ReliabilityView fleet={fleet} L={L} />
          </div>
        ) : null}
        {step === 2 ? <AnalyticsView diagList={diagList} selDiag={selDiag} selAsset={selAsset} setSelId={setSelId} raised={raisedFor(selDiag.assetId)} onCreateWO={() => raiseWO(selDiag)} L={L} /> : null}
        {step === 3 ? <MaintenanceView queue={queue} pendingCount={pendingCount} raisedFor={raisedFor} raiseWO={raiseWO} gotoAnalysis={gotoAnalysis} L={L} /> : null}
        {step === 4 ? <ReportsView L={L} /> : null}
      </motion.div>
    </main>
  );
}
