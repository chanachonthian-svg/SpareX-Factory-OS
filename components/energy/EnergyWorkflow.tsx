"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, BarChart3, Sparkles, Bot, FileText, Zap, Coins, Gauge, Leaf,
  TrendingUp, AlertTriangle, Check, Plus, Play, Pause, Download,
  Target, Wrench, ArrowRight, PlugZap, Moon, Wallet, Power, Rocket, ChevronDown, ChevronUp, Package, Send, Paperclip, X, type LucideIcon,
} from "lucide-react";
import { currentUser, SPAREX_SALES_EMAIL } from "@/lib/user";
import { SingleLineDiagram } from "./SingleLineDiagram";
import { useI18n } from "@/lib/i18n";
import { assets, CATEGORY_LABEL } from "@/lib/factory";
import { idleMachinesCtl, monthlyBills, monthlyUnits, hourlyLoadShape, weekdayEnergy, peakWindow, quickWins, capitalProjects, peakSheddable, shiftableLoads, startupLoads, mvBaselines, mvMetTarget, type ActionPart, type MVBaseline } from "@/lib/energy";
import { WorkflowBar } from "@/components/os/WorkflowNav";
import { Icon3D } from "@/components/os/Icon3D";
import { LiveBadge } from "@/components/os/LiveBadge";
import { KpiCard } from "@/components/os/KpiCard";
import { MultiLine, StackedBars } from "@/components/os/charts";
import {
  Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceDot, ReferenceLine,
  ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis,
} from "recharts";
import { AskCopilot } from "@/components/os/AskCopilot";
import { createWorkOrder, useWorkOrders } from "@/lib/workorders";
import { cn, formatTHB } from "@/lib/utils";
import { useAiAutoQw } from "@/lib/autonomy";
import { AiReasoningTrace } from "@/components/os/AiReasoningTrace";

type LZ = { en: string; th: string };

/* ─────────────────────────────────────────────────────────────── data ── */

const CHART_AXIS = { stroke: "#3a4255", fontSize: 11 };
const CHART_TOOLTIP = {
  contentStyle: { background: "rgba(10,12,18,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12, color: "#e2e8f0" },
  labelStyle: { color: "#8b93a7", marginBottom: 4 },
  cursor: { stroke: "rgba(255,255,255,0.15)" },
};
const clampKw = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const fmtClock = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** daily energy split into TOU blocks — weekends run lighter */
const genDailyEnergy = (from: Date, to: Date) => {
  const days: { t: string; onPeak: number; offPeak: number }[] = [];
  const d = new Date(from);
  while (d <= to) {
    const dow = d.getDay();
    const wk = dow === 0 ? 0.5 : dow === 6 ? 0.62 : 1;
    const on = +(20 * wk * (1 + Math.sin(d.getDate() / 4.3) * 0.06 + (Math.random() - 0.5) * 0.08)).toFixed(1);
    const off = +(on * 0.47 * (1 + (Math.random() - 0.5) * 0.1)).toFixed(1);
    days.push({ t: `${d.getDate()}/${d.getMonth() + 1}`, onPeak: on, offPeak: off });
    d.setDate(d.getDate() + 1);
  }
  return days;
};

/* consumer hierarchy: Site → Area → Line → Machine — derived straight from the
 * canonical 20-machine fleet in lib/factory (10 Production + 10 Facility & Utility).
 * base = 30-day average kW; degraded machines draw above their base. */
type ConsumerM = { name: string; site: string; area: string; line: string; kw: number; base: number };
const CONSUMER_FLEET: ConsumerM[] = assets
  .filter((a) => a.powerKw > 0)
  .map((a) => ({
    name: a.name,
    site: "Bangkok Plant 1",
    area: CATEGORY_LABEL[a.category],
    line: a.line,
    kw: a.powerKw,
    base: Math.round(a.powerKw / (a.status === "critical" ? 1.15 : a.status === "warning" ? 1.07 : 1)),
  }));
const THB_PER_KW_DAY = 75; // ≈ 18 productive hours × ฿4.19/kWh blended

const peakForecast = [
  { t: "13:00", actual: 1305 }, { t: "14:00", actual: 1462 }, { t: "15:00", actual: 1440, forecast: 1440 },
  { t: "16:00", forecast: 1490 }, { t: "17:00", forecast: 1540 }, { t: "18:00", forecast: 1480 },
];

/** AI Analysis top-3 findings — each a reasoning chain: abnormal signal → likely root
 *  cause → ฿/yr impact + confidence. Ranked by ฿; sum = the ฿890K verdict.
 *  IMPORTANT: Energy Intelligence only reads Power Meters (kW/kWh/demand/PF/load shape)
 *  and PLCs (run·idle status, load %, setpoints) — NO pressure/flow/temp sensors. Every
 *  piece of evidence below must be derivable from those two sources alone. */
const findings: { sig: LZ; cause: LZ; evidence: LZ; bahtYr: number; conf: number }[] = [
  { sig: { en: "On-peak demand shape", th: "รูปแบบดีมานด์ช่วง on-peak" }, cause: { en: "shiftable load in the 13–16h window", th: "โหลดที่ย้ายได้ในช่วง 13–16 น." }, evidence: { en: "78% of the on-peak ฿ falls in a 3-hour window · the same feeders draw normally off-peak", th: "78% ของค่า on-peak กระจุกใน 3 ชม. · ฟีดเดอร์เดียวกันกินไฟปกติช่วง off-peak" }, bahtYr: 434000, conf: 95 },
  { sig: { en: "Chiller B +23 kW drift", th: "Chiller B ดริฟต์ +23 kW" }, cause: { en: "likely efficiency loss (fouling)", th: "น่าจะประสิทธิภาพตก (อุดตัน)" }, evidence: { en: "+23 kW vs same-load baseline · specific power (kW per PLC load%) up 8% · longer runtime to hold setpoint", th: "+23 kW เทียบค่าฐานที่โหลดเท่ากัน · กำลังจำเพาะ (kW ต่อ %โหลดจาก PLC) เพิ่ม 8% · เดินนานขึ้นเพื่อรักษา setpoint" }, bahtYr: 288000, conf: 84 },
  { sig: { en: "Compressed-air night base-load +18 kW", th: "โหลดกลางคืนลม +18 kW" }, cause: { en: "likely air-system leak", th: "น่าจะระบบลมรั่ว" }, evidence: { en: "compressor still draws 18 kW · load/unload cycling every ~3 min at 02:00 with all lines idle (PLC)", th: "คอมเพรสเซอร์ยังกิน 18 kW · โหลด/อันโหลดทุก ~3 นาที ตอน 02:00 ทั้งที่ไลน์หยุด (PLC)" }, bahtYr: 168000, conf: 79 },
];

type Rec = { id: string; code: string; name: LZ; cat: LZ; savingYr: number; capex: number; paybackYr: number };
const recs: Rec[] = [
  { id: "ENG-01", code: "ENG-01", name: { en: "Re-schedule compressors to off-peak", th: "ย้ายเวลาเดินคอมเพรสเซอร์ไปช่วง off-peak" }, cat: { en: "Load shift", th: "ย้ายโหลด" }, savingYr: 380000, capex: 0, paybackYr: 0 },
  { id: "ENG-02", code: "ENG-02", name: { en: "Off-peak pre-cooling for chillers", th: "พรีคูลชิลเลอร์ช่วง off-peak" }, cat: { en: "Load shift", th: "ย้ายโหลด" }, savingYr: 300000, capex: 0, paybackYr: 0 },
  { id: "ENG-03", code: "ENG-03", name: { en: "Auto-standby idle machines >15 min", th: "auto-standby เครื่องเดินเบา >15 นาที" }, cat: { en: "Efficiency", th: "ประสิทธิภาพ" }, savingYr: 170000, capex: 40000, paybackYr: 0.3 },
  { id: "ENG-04", code: "ENG-04", name: { en: "Clean Chiller B condenser", th: "ล้างคอนเดนเซอร์ Chiller B" }, cat: { en: "Maintenance", th: "ซ่อมบำรุง" }, savingYr: 240000, capex: 65000, paybackYr: 0.3 },
];

const autos: { name: LZ; desc: LZ; impact: string; status: "active" | "pending" | "suggested" }[] = [
  { name: { en: "Peak-demand load shed", th: "ปลดโหลดกันพีค" }, desc: { en: "Shed non-critical loads when demand nears the 1,500 kW contract", th: "ปลดโหลดไม่วิกฤตเมื่อดีมานด์ใกล้เพดาน 1,500 kW" }, impact: "-฿12K/mo", status: "active" },
  { name: { en: "Off-peak pre-cooling", th: "พรีคูลช่วง off-peak" }, desc: { en: "Shift chiller runtime into low-tariff hours", th: "ย้ายเวลาเดินชิลเลอร์ไปชั่วโมงค่าไฟถูก" }, impact: "-฿25K/mo", status: "pending" },
  { name: { en: "Idle auto-standby", th: "auto-standby ตอนเดินเบา" }, desc: { en: "Put idle machines to standby automatically", th: "สั่งเครื่องเดินเบาเข้า standby อัตโนมัติ" }, impact: "-฿14K/mo", status: "suggested" },
];

const mv: { action: LZ; planned: number; verified: number }[] = [
  { action: { en: "Off-peak pre-cooling", th: "พรีคูลช่วง off-peak" }, planned: 92000, verified: 98000 },
  { action: { en: "Compressed-air leak repair", th: "ซ่อมลมรั่ว" }, planned: 45000, verified: 41000 },
  { action: { en: "Idle auto-standby", th: "auto-standby ตอนเดินเบา" }, planned: 14000, verified: 15500 },
];

/* ─────────────────────────────────────────────────────────── workflow ── */

export function EnergyWorkflow() {
  const { locale } = useI18n();
  const L = (o: LZ) => (locale === "th" ? o.th : o.en);
  const [step, setStep] = useState(0);

  return (
    <div className="space-y-6">
      <WorkflowBar step={step} setStep={setStep} L={L} />

      {step === 0 && <MonitorStep L={L} />}
      {step === 1 && <InsightStep L={L} onAct={() => setStep(3)} />}
      {step === 2 && <AnalysisStep L={L} onAct={() => setStep(3)} />}
      {step === 3 && <ActionStep L={L} />}
      {step === 4 && <ReportStep L={L} locale={locale} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── 01 monitor ── */

/** rule-based alerts — plain threshold checks on live meter data, no AI involved */
const monitorAlarms: { sev: "warn" | "crit"; text: LZ; rule: LZ }[] = [
  { sev: "crit", text: { en: "15-min demand at 97% of the 1,500 kW contract — close the window under 1,500 to avoid the penalty", th: "Demand 15 นาทีแตะ 97% ของสัญญา 1,500 kW — ต้องจบรอบให้ต่ำกว่า 1,500 เพื่อเลี่ยงค่าปรับ" }, rule: { en: "demand ≥ 95% of contract", th: "demand ≥ 95% ของสัญญา" } },
  { sev: "warn", text: { en: "Power factor on phase L2 at 0.83 — below the 0.85 utility penalty threshold", th: "PF เฟส L2 อยู่ที่ 0.83 — ต่ำกว่าเกณฑ์ค่าปรับ 0.85 ของการไฟฟ้า" }, rule: { en: "PF < 0.85", th: "PF < 0.85" } },
];

function AlarmStrip({ L }: { L: (o: LZ) => string }) {
  if (!monitorAlarms.length) return null;
  return (
    <section className="space-y-2">
      {monitorAlarms.map((a) => {
        const c = a.sev === "crit" ? "#f43f5e" : "#f59e0b";
        return (
          <div key={a.text.en} className="flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-2.5 backdrop-blur" style={{ borderColor: `${c}40`, backgroundColor: `${c}10` }}>
            <Icon3D icon={AlertTriangle} color={c} size={28} rounded={9} />
            <p className={cn("min-w-0 flex-1 text-[12.5px] font-medium", a.sev === "crit" ? "text-rose-200" : "text-amber-200")}>{L(a.text)}</p>
            <span className="chip shrink-0 text-white/45">{L(a.rule)}</span>
          </div>
        );
      })}
    </section>
  );
}

/* ── idle ("Phantom Draw") — energized but not producing ─────────────────── */
const IDLE_MIN = 15;          // standby threshold (minutes)
const RATE_PEAK = 4.19;       // ฿/kWh, on-peak (production hours)
const IDLE_TRACK_MAX = 45;    // minutes that fill the live idle track

/** MONITOR — live state: which machines are awake but idle right now. A slim strip
 *  so it reads as raw signal, not an insight. Filled amber = over the standby line. */
function IdleNowStrip({ L }: { L: (o: LZ) => string }) {
  const over = idleMachinesCtl.filter((m) => m.idleFor >= IDLE_MIN);
  const idleKw = over.reduce((s, m) => s + m.idleKw, 0);
  if (!over.length) return null;
  return (
    <section className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(245,158,11,0.28)", backgroundColor: "rgba(245,158,11,0.06)" }}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {/* live summary */}
        <div className="flex items-center gap-2.5">
          <span className="relative grid h-8 w-8 shrink-0 place-items-center">
            <span className="absolute inset-0 rounded-full bg-orange-400/25 blur-[6px]" />
            <span className="absolute h-2.5 w-2.5 rounded-full bg-orange-400" />
            <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-orange-400/70" />
          </span>
          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/90">{L({ en: "Idle now", th: "Idle ตอนนี้" })}</p>
            <p className="text-[13px] font-medium text-white/85">
              <span className="tabular text-base font-bold text-white">{over.length}</span> {L({ en: "machines", th: "เครื่อง" })} · <span className="tabular text-amber-200">{Math.round(idleKw)} kW</span> · <span className="text-amber-300">~฿{Math.round(idleKw * RATE_PEAK)}/{L({ en: "h", th: "ชม." })}</span>
            </p>
          </div>
        </div>
        {/* per-machine idle chips */}
        <div className="grid min-w-0 flex-1 gap-x-5 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
          {idleMachinesCtl.map((m) => {
            const isOver = m.idleFor >= IDLE_MIN;
            const frac = Math.min(1, m.idleFor / IDLE_TRACK_MAX);
            return (
              <div key={m.id} className="flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", isOver ? "bg-orange-400" : "border border-white/25")} />
                <span className={cn("shrink-0 tabular text-[11.5px] font-semibold", isOver ? "text-white/85" : "text-white/45")}>{m.name}</span>
                <span className={cn("shrink-0 tabular text-[10.5px]", isOver ? "text-amber-300" : "text-white/35")}>{m.idleFor}m</span>
                <span className="relative ml-auto h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-white/[0.07]">
                  <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${frac * 100}%`, background: isOver ? "linear-gradient(90deg,#f59e0b,#fbbf24)" : "rgba(245,158,11,0.28)" }} />
                  <span className="absolute inset-y-0 w-px bg-white/25" style={{ left: `${(IDLE_MIN / IDLE_TRACK_MAX) * 100}%` }} />
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** INSIGHT — quantified: what idle is costing this shift. Hollow amber bars ("presence
 *  without production") + ฿/month, handing off to the Idle-standby manager in step 04. */
function IdleDuringProductionCard({ L, onAct }: { L: (o: LZ) => string; onAct: () => void }) {
  const rows = [...idleMachinesCtl].sort((a, b) => b.idleTodayH * b.idleKw - a.idleTodayH * a.idleKw);
  const kwhDay = rows.reduce((s, m) => s + m.idleKw * m.idleTodayH, 0);
  const bahtMo = Math.round(kwhDay * RATE_PEAK * 26);
  const worst = rows[0];
  const maxKwh = Math.max(...rows.map((m) => m.idleKw * m.idleTodayH));
  return (
    <Panel
      title={L({ en: "Idle During Production", th: "เดินตัวเปล่าระหว่างผลิต" })}
      sub={L({ en: "Power drawn on-shift while producing nothing", th: "กินไฟตอนกะทำงานทั้งที่ไม่ได้ผลิต" })}
      icon={Power}
      color="#f59e0b"
      right={<span className="chip text-amber-300">{L({ en: "pure waste", th: "สูญเปล่า" })}</span>}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        {/* headline waste */}
        <div className="flex flex-col">
          <p className="text-4xl font-bold tabular text-amber-400">{formatTHB(bahtMo)}<span className="ml-1.5 text-sm font-normal text-white/45">/{L({ en: "mo", th: "เดือน" })}</span></p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-white/45">{L({ en: "Wasted on idle draw · on-peak ฿4.19/kWh", th: "ละลายไปกับการเดินตัวเปล่า · on-peak ฿4.19/kWh" })}</p>
          <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/8 bg-white/[0.02]">
            {[
              { k: L({ en: "idle energy", th: "พลังงาน idle" }), v: `${Math.round(kwhDay)}`, u: "kWh/d" },
              { k: L({ en: "machines", th: "เครื่อง" }), v: `${rows.length}`, u: L({ en: "tracked", th: "เฝ้าดู" }) },
              { k: L({ en: "worst", th: "หนักสุด" }), v: worst.name, u: `${worst.idleTodayH}h` },
            ].map((s, i) => (
              <div key={i} className="px-3 py-2.5">
                <p className="text-[9px] uppercase tracking-wider text-white/35">{s.k}</p>
                <p className="mt-0.5 truncate text-[13px] font-semibold text-white/85">{s.v} <span className="text-[10px] font-normal text-white/40">{s.u}</span></p>
              </div>
            ))}
          </div>
          {/* so-what — fills the column so it matches the machine list height */}
          <div className="mt-4 flex flex-1 items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-3 py-3 text-[11.5px] leading-relaxed text-amber-200/90">
            <Moon size={14} className="mt-0.5 shrink-0 text-amber-300" />
            <span>{L({ en: `Not one is on auto-standby yet. Enabling it recovers the full ฿${bahtMo.toLocaleString()}/mo — no capex, fully reversible.`, th: `ยังไม่มีเครื่องไหนตั้ง auto-standby เลย เปิดใช้แล้วได้คืนเต็ม ฿${bahtMo.toLocaleString()}/เดือน — ไม่ต้องลงทุน ย้อนกลับได้` })}</span>
          </div>
          <button onClick={onAct} className="btn-glow mt-3 w-full justify-center px-3 py-2 text-[12.5px]"><ArrowRight size={13} /> {L({ en: "Hand to Idle-standby manager", th: "ส่งให้ตัวจัดการ Idle-standby" })}</button>
        </div>
        {/* per-machine idle hours (hollow = idle) */}
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-white/35">{L({ en: "Idle hours today · ฿ wasted", th: "ชม.เดินตัวเปล่าวันนี้ · ฿ ที่เสีย" })}</p>
          <div className="space-y-2">
            {rows.map((m) => {
              const kwh = m.idleKw * m.idleTodayH;
              const baht = Math.round(kwh * RATE_PEAK * 26);
              const over = m.idleFor >= IDLE_MIN;
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="w-[104px] shrink-0">
                    <p className="tabular text-[11.5px] font-semibold text-white/85">{m.name}</p>
                    <p className="truncate text-[9.5px] text-white/35">{L(m.area)}</p>
                  </div>
                  <div className="relative h-4 flex-1 overflow-hidden rounded-md bg-white/[0.03]">
                    {/* hollow amber = idle: outline + faint inner fill */}
                    <div className="absolute inset-y-0 left-0 rounded-md border" style={{ width: `${(kwh / maxKwh) * 100}%`, borderColor: over ? "#f59e0b" : "rgba(245,158,11,0.5)", backgroundColor: "rgba(245,158,11,0.13)" }} />
                    <span className="absolute inset-y-0 right-2 flex items-center tabular text-[10px] font-semibold text-amber-200">{m.idleTodayH}h</span>
                  </div>
                  <span className="w-[86px] shrink-0 text-right tabular text-[11px] text-white/55">฿{baht.toLocaleString()}/{L({ en: "mo", th: "ด" })}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** live TOU rate — which price block you're paying right now (on-peak vs off-peak) */
function RateNowKpi({ L }: { L: (o: LZ) => string }) {
  const [peak, setPeak] = useState<boolean | null>(null);
  useEffect(() => {
    const f = () => { const h = new Date().getHours(); setPeak(h >= 9 && h < 22); };
    f();
    const id = setInterval(f, 30000);
    return () => clearInterval(id);
  }, []);
  const on = peak ?? true;
  return <KpiCard label={L({ en: "Rate · now", th: "เรตค่าไฟ · ตอนนี้" })} value={on ? "4.19" : "2.60"} unit="฿/kWh" delta={on ? L({ en: "On-peak", th: "ออนพีค" }) : L({ en: "Off-peak", th: "ออฟพีค" })} deltaGood={!on} accent={on ? "#f59e0b" : "#34d399"} icon={Coins} />;
}

/** taxi-meter cost card — today's baht accumulates live at the current TOU rate */
function LiveCostKpi({ L }: { L: (o: LZ) => string }) {
  const [v, setV] = useState<{ cost: number; rate: number } | null>(null);
  useEffect(() => {
    const base = (h: number) => 950 + 260 * Math.exp(-(((h - 10.5) ** 2) / 8)) + 300 * Math.exp(-(((h - 14.2) ** 2) / 5));
    const rateAt = (h: number) => (h >= 9 && h < 22 ? 4.19 : 2.6); // ฿/kWh TOU
    const d = new Date();
    const nowH = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
    let cost = 0;
    for (let h = 0; h < nowH; h += 0.25) cost += base(h) * rateAt(h) * Math.min(0.25, nowH - h);
    let kw = 1255;
    const tick = () => {
      kw = Math.min(1380, Math.max(1140, kw + (Math.random() - 0.5) * 14));
      const t = new Date();
      const r = rateAt(t.getHours() + t.getMinutes() / 60);
      cost += (kw * r * 2) / 3600;
      setV({ cost: Math.round(cost), rate: Math.round(kw * r) });
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <KpiCard
      label={L({ en: "Cost · today", th: "ค่าไฟ · วันนี้" })}
      value={v ? formatTHB(v.cost) : "—"}
      unit={v ? `· ฿${(v.rate / 1000).toFixed(1)}K/${L({ en: "h now", th: "ชม. ตอนนี้" })}` : undefined}
      accent="#f59e0b"
      icon={Coins}
    />
  );
}

/* demand billing constants — the demand charge is billed on the single highest 15-min
 * interval of the month, so MONTH_PEAK is the number that actually costs money.
 * Kept in lockstep with the Bill Breakdown demand line (1,455 kW → ฿172,300). */
const DEMAND_CONTRACT = 1500;
const DEMAND_TARGET = 1400;
const DEMAND_RATE = 118.42;              // ฿/kW/mo demand charge
const MONTH_PEAK_KW = 1455;              // this month's highest 15-min demand (billed)
const MONTH_PEAK_CHARGE = 172300;        // = Bill Breakdown demand line, kept exact
const MONTH_PEAK_WHEN: LZ = { en: "Jun 24 · 13:42", th: "24 มิ.ย. · 13:42" };

/** live 15-minute demand window vs the month's billed peak — the recorded monthly max
 *  is what the demand charge is billed on; the live needle only matters if it beats it. */
function DemandGauge({ L }: { L: (o: LZ) => string }) {
  const contract = DEMAND_CONTRACT, target = DEMAND_TARGET;
  const [live, setLive] = useState<{ avg: number; inst: number; secLeft: number } | null>(null);
  useEffect(() => {
    let avg = 1420;
    const tick = () => {
      const d = new Date();
      const into = (d.getMinutes() % 15) * 60 + d.getSeconds();
      avg = Math.min(1466, Math.max(1382, avg + (Math.random() - 0.5) * 5));
      setLive({ avg: Math.round(avg), inst: Math.round(avg + (Math.random() - 0.5) * 36), secLeft: 900 - into });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const avg = live?.avg ?? 1420;
  const pct = Math.min(100, Math.round((avg / contract) * 100));
  const hot = avg >= target;
  const newPeak = avg > MONTH_PEAK_KW;              // live is forming a new billed peak
  const billedKw = Math.max(MONTH_PEAK_KW, avg);
  const mmss = live ? `${String(Math.floor(live.secLeft / 60)).padStart(2, "0")}:${String(live.secLeft % 60).padStart(2, "0")}` : "--:--";
  return (
    <Panel title={L({ en: "Demand", th: "ดีมานด์" })} sub={L({ en: "What the demand charge is billed on", th: "ค่าที่ใช้คิดค่าดีมานด์" })} icon={Gauge} color="#f59e0b" right={<LiveBadge />}>
      <div className="flex items-baseline gap-2">
        <p className={cn("tabular text-4xl font-semibold", hot ? "text-amber-300" : "text-emerald-300")}>{avg.toLocaleString()}</p>
        <p className="text-sm text-white/45">kW · {L({ en: "current 15-min window", th: "รอบ 15 นาทีปัจจุบัน" })}</p>
      </div>

      {/* billing demand — the month's peak the bill is actually charged on */}
      <div className={cn("mt-3 flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5", newPeak ? "border-rose-400/30 bg-rose-500/[0.08]" : "border-amber-400/25 bg-amber-400/[0.06]")}>
        <div className="min-w-0">
          <p className="text-[9.5px] font-semibold uppercase tracking-wider text-amber-300/85">{L({ en: "Billing demand · month peak", th: "ดีมานด์ที่คิดเงิน · พีคเดือนนี้" })}</p>
          <p className="tabular text-lg font-bold text-white">{billedKw.toLocaleString()} <span className="text-[11px] font-normal text-white/40">kW · {L(MONTH_PEAK_WHEN)}</span></p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[9.5px] uppercase tracking-wider text-white/40">{L({ en: "demand charge", th: "ค่าดีมานด์" })}</p>
          <p className="tabular text-lg font-bold text-amber-200">{formatTHB(newPeak ? Math.round(avg * DEMAND_RATE) : MONTH_PEAK_CHARGE)}</p>
        </div>
      </div>

      <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: hot ? "linear-gradient(90deg, #fbbf24, #f59e0b)" : "linear-gradient(90deg, #6ee7b7, #34d399)", boxShadow: `0 0 12px ${hot ? "#f59e0b" : "#34d399"}66` }} />
        {/* target marker */}
        <span className="absolute inset-y-0 w-px bg-white/50" style={{ left: `${(target / contract) * 100}%` }} />
        {/* month-peak marker — what the bill is charged on */}
        <span className="absolute -top-1 h-5 w-0.5 rounded bg-amber-400" style={{ left: `${(MONTH_PEAK_KW / contract) * 100}%`, boxShadow: "0 0 6px #f59e0b" }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-white/35"><span>0</span><span>{L({ en: "target", th: "เป้า" })} {target.toLocaleString()}</span><span className="text-amber-300/75">{L({ en: "peak", th: "พีค" })} {MONTH_PEAK_KW.toLocaleString()}</span><span>{L({ en: "contract", th: "สัญญา" })} {contract.toLocaleString()}</span></div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5"><p className="text-[10px] text-white/45">{L({ en: "Instantaneous", th: "ค่าขณะนี้" })}</p><p className="mt-1 tabular text-[15px] font-semibold text-white/85">{(live?.inst ?? 1455).toLocaleString()} kW</p></div>
        <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5"><p className="text-[10px] text-white/45">{L({ en: "Window closes in", th: "จบรอบใน" })}</p><p className="mt-1 tabular text-[15px] font-semibold text-white/85">{mmss}</p></div>
        <div className={cn("rounded-lg border p-2.5", newPeak ? "border-rose-400/30 bg-rose-500/[0.07]" : "border-white/8 bg-white/[0.02]")}>
          <p className="text-[10px] text-white/45">{L({ en: "To month peak", th: "เหลือถึงพีคเดือน" })}</p>
          <p className={cn("mt-1 tabular text-[15px] font-semibold", newPeak ? "text-rose-300" : MONTH_PEAK_KW - avg <= 20 ? "text-amber-300" : "text-emerald-300")}>{newPeak ? `+${(avg - MONTH_PEAK_KW).toLocaleString()}` : (MONTH_PEAK_KW - avg).toLocaleString()} kW</p>
        </div>
        <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5"><p className="text-[10px] text-white/45">{L({ en: "Contract headroom", th: "เหลือถึงสัญญา" })}</p><p className={cn("mt-1 tabular text-[15px] font-semibold", avg >= contract ? "text-rose-300" : "text-emerald-300")}>{(contract - avg).toLocaleString()} kW</p></div>
      </div>
      <p className={cn("mt-3 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-medium", newPeak ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : hot ? "border-amber-400/25 bg-amber-400/10 text-amber-200" : "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200")}>
        {newPeak
          ? L({ en: `Live is above this month's peak — closing here rebills demand at ${avg.toLocaleString()} kW (${formatTHB(Math.round(avg * DEMAND_RATE))})`, th: `ค่าขณะนี้เกินพีคเดือนนี้ — ถ้าจบรอบตอนนี้ ดีมานด์ที่คิดเงินขยับเป็น ${avg.toLocaleString()} kW (${formatTHB(Math.round(avg * DEMAND_RATE))})` })
          : hot
            ? L({ en: "Averaging above target — shed or shift load before it sets a new month peak", th: "ค่าเฉลี่ยเกินเป้า — ควรปลด/เลื่อนโหลดก่อนจะกลายเป็นพีคใหม่ของเดือน" })
            : L({ en: "On track — under target and below this month's billed peak", th: "ปกติ — ต่ำกว่าเป้าและต่ำกว่าพีคที่คิดเงินของเดือนนี้" })}
      </p>
    </Panel>
  );
}

/* Power Factor card — the Energy view keeps only what costs money: the plant PF
 * against the 0.85 penalty threshold. Deep electrical analysis lives in Power Quality. */
const PF_PHASES = [
  { id: "L1", color: "#22d3ee", pf: 0.97 },
  { id: "L2", color: "#818cf8", pf: 0.83 },
  { id: "L3", color: "#34d399", pf: 0.96 },
];

function PowerFactorCard({ L }: { L: (o: LZ) => string }) {
  const [pf, setPf] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setPf(+(0.955 + Math.random() * 0.01).toFixed(3));
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, []);
  const val = pf ?? 0.96;
  const from = 0.7;
  return (
    <Panel title="Power Factor" sub={L({ en: "PF vs the 0.85 penalty line", th: "PF เทียบเส้นค่าปรับ 0.85" })} icon={Gauge} color="#34d399" right={<LiveBadge />}>
      <div className="flex items-baseline gap-2">
        <p className="tabular text-5xl font-semibold text-emerald-300">{val.toFixed(2)}</p>
        <p className="text-sm text-white/45">{L({ en: "plant average · now", th: "เฉลี่ยทั้งโรงงาน · ตอนนี้" })}</p>
      </div>
      <div className="relative mt-4 h-3 rounded-full bg-white/8">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, ((val - from) / (1 - from)) * 100)}%`, background: "linear-gradient(90deg, #6ee7b7, #34d399)", boxShadow: "0 0 12px #34d39955" }} />
        <span className="absolute -top-1 h-5 w-0.5 bg-rose-400" style={{ left: `${((0.85 - from) / (1 - from)) * 100}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-white/35">
        <span>0.70</span>
        <span className="text-rose-300">{L({ en: "penalty below 0.85", th: "ต่ำกว่า 0.85 โดนค่าปรับ" })}</span>
        <span>1.00</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {PF_PHASES.map((p) => {
          const warn = p.pf < 0.85;
          return (
            <div key={p.id} className={cn("rounded-lg border p-2.5 text-center", warn ? "border-amber-400/30 bg-amber-500/[0.06]" : "border-white/8 bg-white/[0.02]")}>
              <p className="text-[11px] font-bold" style={{ color: p.color }}>{p.id}</p>
              <p className={cn("mt-1 tabular text-[17px] font-semibold leading-none", warn ? "text-amber-300" : "text-white/85")}>{p.pf.toFixed(2)}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-3">
        <p className="text-[12px] font-medium leading-relaxed text-amber-200">
          {L({
            en: "L2 at 0.83 — below the 0.85 threshold. If it drags the monthly plant PF under 0.85, the kVAR penalty is ≈ ฿3,600/mo. Fix point: DB-CA capacitor bank.",
            th: "เฟส L2 อยู่ที่ 0.83 — ต่ำกว่าเกณฑ์ 0.85 ถ้าลากค่าเฉลี่ยทั้งเดือนหลุดเกณฑ์ จะโดนค่าปรับ kVAR ≈ ฿3,600/เดือน จุดแก้: Capacitor Bank ตู้ DB-CA",
          })}
        </p>
        <Link href="/os/power-quality" className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-brand-400/30 bg-brand-400/10 px-3 py-1.5 text-[12px] font-medium text-brand-200 transition hover:bg-brand-400/20">
          {L({ en: "Analyze in Power Quality", th: "วิเคราะห์เชิงลึกใน Power Quality" })} <ArrowRight size={13} />
        </Link>
      </div>
    </Panel>
  );
}

/** flowing real-time load chart — a new reading every 2 s slides the 15-min window,
 *  with the on-peak block shaded; the day view shows today's profile up to now */
function LiveLoadChart({ L }: { L: (o: LZ) => string }) {
  const [mode, setMode] = useState<"live" | "day" | "week" | "month" | "custom">("live");
  const [pts, setPts] = useState<{ t: number; kw: number }[]>([]);
  const [dayPts, setDayPts] = useState<{ h: number; kw: number | null; plan: number }[]>([]);
  const [nowH, setNowH] = useState<number | null>(null);
  const [cFrom, setCFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 29); return isoDay(d); });
  const [cTo, setCTo] = useState(() => isoDay(new Date()));

  const daily = useMemo(() => {
    if (mode === "week" || mode === "month") {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - (mode === "week" ? 6 : 29));
      return genDailyEnergy(from, to);
    }
    if (mode === "custom") {
      const from = new Date(`${cFrom}T00:00:00`);
      const to = new Date(`${cTo}T00:00:00`);
      if (isNaN(+from) || isNaN(+to) || from > to) return [];
      const capped = new Date(Math.min(+to, +from + 91 * 86400000)); // cap at ~3 months
      return genDailyEnergy(from, capped);
    }
    return [];
  }, [mode, cFrom, cTo]);
  const totOn = daily.reduce((s, d) => s + d.onPeak, 0);
  const totOff = daily.reduce((s, d) => s + d.offPeak, 0);
  const dailyCost = Math.round(totOn * 4190 + totOff * 2600); // ฿/MWh blended TOU rates

  useEffect(() => {
    // seed 15 minutes of history so the window starts full, then append every 2 s
    const now = Date.now();
    let kw = 1262;
    const seed: { t: number; kw: number }[] = [];
    for (let i = 450; i >= 0; i--) {
      kw = clampKw(kw + (Math.random() - 0.5) * 14, 1130, 1380);
      seed.push({ t: now - i * 2000, kw: Math.round(kw) });
    }
    setPts(seed);

    const d = new Date();
    const curH = d.getHours() + d.getMinutes() / 60;
    setNowH(curH);
    const base = (h: number) => 950 + 260 * Math.exp(-(((h - 10.5) ** 2) / 8)) + 300 * Math.exp(-(((h - 14.2) ** 2) / 5));
    const day: { h: number; kw: number | null; plan: number }[] = [];
    for (let h = 6; h <= 22.001; h += 0.5) day.push({ h: Math.round(h * 2) / 2, plan: Math.round(base(h)), kw: h <= curH ? Math.round(base(h) + (Math.random() - 0.5) * 60) : null });
    setDayPts(day);

    const id = setInterval(() => {
      setPts((p) => {
        const lastKw = p[p.length - 1]?.kw ?? 1262;
        const next = clampKw(lastKw + (Math.random() - 0.48) * 18, 1130, 1400);
        return [...p.slice(-450), { t: Date.now(), kw: Math.round(next) }];
      });
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const last = pts[pts.length - 1];
  const peakStart = new Date(); peakStart.setHours(9, 0, 0, 0);
  const peakEnd = new Date(); peakEnd.setHours(22, 0, 0, 0);
  const winStart = pts[0]?.t ?? 0;
  const winEnd = last?.t ?? 1;
  // TOU segments of the visible window — amber = on-peak, emerald = off-peak
  const touSegs: { x1: number; x2: number; peak: boolean }[] = [];
  if (winEnd > winStart) {
    const p1 = Math.max(winStart, peakStart.getTime());
    const p2 = Math.min(winEnd, peakEnd.getTime());
    if (winStart < Math.min(winEnd, peakStart.getTime())) touSegs.push({ x1: winStart, x2: Math.min(winEnd, peakStart.getTime()), peak: false });
    if (p2 > p1) touSegs.push({ x1: p1, x2: p2, peak: true });
    if (winEnd > Math.max(winStart, peakEnd.getTime())) touSegs.push({ x1: Math.max(winStart, peakEnd.getTime()), x2: winEnd, peak: false });
  }
  const contractLabel = { value: L({ en: "contract 1,500 kW", th: "สัญญา 1,500 kW" }), position: "insideTopRight" as const, fill: "#fda4af", fontSize: 10 };
  const touLabel = (peak: boolean, pos: "insideTopLeft" | "insideBottomLeft") => ({
    value: peak ? "On-peak" : "Off-peak",
    position: pos,
    fill: peak ? "#fbbf24" : "#6ee7b7",
    fontSize: 10,
  });

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
          {([
            ["live", { en: "Live · 15 min", th: "ขณะนี้ · 15 นาที" }],
            ["day", { en: "Today", th: "วันนี้" }],
            ["week", { en: "Week", th: "7 วัน" }],
            ["month", { en: "Month", th: "30 วัน" }],
            ["custom", { en: "Custom", th: "กำหนดเอง" }],
          ] as ["live" | "day" | "week" | "month" | "custom", LZ][]).map(([id, lab]) => (
            <button key={id} onClick={() => setMode(id)} className={cn("whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition", mode === id ? "bg-white/10 text-white/90" : "text-white/45 hover:text-white/70")}>{L(lab)}</button>
          ))}
        </div>
        {last ? (
          <span className="ml-auto flex items-center gap-2 text-[12px] text-white/50">
            <LiveBadge size="sm" />
            <b className="tabular text-[15px] text-white">{last.kw.toLocaleString()}</b> kW · {fmtClock(last.t)}
          </span>
        ) : null}
      </div>
      {mode === "custom" ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-white/55">
          <span>{L({ en: "From", th: "จาก" })}</span>
          <input type="date" value={cFrom} max={cTo} onChange={(e) => setCFrom(e.target.value)} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[12px] text-white/80" style={{ colorScheme: "dark" }} />
          <span>{L({ en: "to", th: "ถึง" })}</span>
          <input type="date" value={cTo} min={cFrom} onChange={(e) => setCTo(e.target.value)} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[12px] text-white/80" style={{ colorScheme: "dark" }} />
          <span className="text-[11px] text-white/35">{daily.length} {L({ en: "days", th: "วัน" })}{daily.length >= 92 ? ` · ${L({ en: "capped at 3 months", th: "จำกัด 3 เดือน" })}` : ""}</span>
        </div>
      ) : null}
      <div style={{ width: "100%", height: 248 }}>
        {mode === "live" && pts.length ? (
          <ResponsiveContainer>
            <AreaChart data={pts} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="liveKw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              {touSegs.map((s) => (
                <ReferenceArea key={`${s.x1}-${s.peak}`} x1={s.x1} x2={s.x2} fill={s.peak ? "#f59e0b" : "#34d399"} fillOpacity={s.peak ? 0.08 : 0.05} label={touLabel(s.peak, "insideBottomLeft")} />
              ))}
              <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={fmtClock} tick={CHART_AXIS} tickLine={false} axisLine={false} minTickGap={70} />
              <YAxis domain={[1000, 1600]} ticks={[1000, 1200, 1400, 1600]} tick={CHART_AXIS} tickLine={false} axisLine={false} width={44} />
              <ReTooltip {...CHART_TOOLTIP} labelFormatter={(v) => fmtClock(v as number)} formatter={(v) => [`${Number(v).toLocaleString()} kW`, L({ en: "Power", th: "กำลังไฟ" })]} />
              <Area type="monotone" dataKey="kw" stroke="#22d3ee" strokeWidth={2} fill="url(#liveKw)" isAnimationActive={false} dot={false} />
              <ReferenceLine y={1500} stroke="#f43f5e" strokeDasharray="5 4" label={contractLabel} />
              {last ? <ReferenceDot x={last.t} y={last.kw} r={4} fill="#22d3ee" stroke="#fff" strokeWidth={1.5} isFront /> : null}
            </AreaChart>
          </ResponsiveContainer>
        ) : mode === "day" && dayPts.length ? (
          <ResponsiveContainer>
            <AreaChart data={dayPts} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="dayKw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <ReferenceArea x1={6} x2={9} fill="#34d399" fillOpacity={0.05} label={touLabel(false, "insideTopLeft")} />
              <ReferenceArea x1={9} x2={22} fill="#f59e0b" fillOpacity={0.08} label={touLabel(true, "insideTopLeft")} />
              <XAxis dataKey="h" type="number" domain={[6, 22]} ticks={[6, 8, 10, 12, 14, 16, 18, 20, 22]} tickFormatter={(h) => `${String(h).padStart(2, "0")}:00`} tick={CHART_AXIS} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 1600]} ticks={[0, 500, 1000, 1500]} tick={CHART_AXIS} tickLine={false} axisLine={false} width={44} />
              <ReTooltip {...CHART_TOOLTIP} labelFormatter={(h) => `${String(h).padStart(2, "0")}:${(Number(h) % 1) ? "30" : "00"}`} formatter={(v, name) => [`${Number(v).toLocaleString()} kW`, name === "plan" ? L({ en: "Typical profile", th: "โปรไฟล์คาดการณ์" }) : L({ en: "Actual", th: "ค่าจริง" })]} />
              <Area type="monotone" dataKey="plan" stroke="#64748b" strokeWidth={1.5} strokeDasharray="5 4" fill="none" isAnimationActive={false} dot={false} />
              <Area type="monotone" dataKey="kw" stroke="#22d3ee" strokeWidth={2} fill="url(#dayKw)" isAnimationActive={false} dot={false} connectNulls={false} />
              <ReferenceLine y={1500} stroke="#f43f5e" strokeDasharray="5 4" label={contractLabel} />
              {nowH != null && nowH >= 6 && nowH <= 22 ? (
                <ReferenceLine x={nowH} stroke="#22d3ee" strokeWidth={1.5} label={{ value: L({ en: "now", th: "ตอนนี้" }), position: "insideTop", fill: "#67e8f9", fontSize: 10 }} />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>
        ) : (mode === "week" || mode === "month" || mode === "custom") && daily.length ? (
          <StackedBars
            data={daily}
            height={248}
            bars={[
              { key: "offPeak", color: "#34d399", name: "Off-peak (MWh)" },
              { key: "onPeak", color: "#f59e0b", name: "On-peak (MWh)" },
            ]}
          />
        ) : (
          <div className="grid h-full place-items-center text-[12px] text-white/35">{mode === "custom" ? L({ en: "Pick a valid date range", th: "เลือกช่วงวันที่ให้ถูกต้อง" }) : L({ en: "Connecting to meters…", th: "กำลังเชื่อมต่อมิเตอร์…" })}</div>
        )}
      </div>
      {mode === "day" ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/50">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 rounded-full bg-brand-400" /> {L({ en: "Actual · measured up to now", th: "ค่าจริง · วัดได้ถึงเวลาปัจจุบัน" })}</span>
          <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-white/35" /> {L({ en: "Typical profile · 30-day average (not measured yet)", th: "โปรไฟล์คาดการณ์ · ค่าเฉลี่ย 30 วัน (ยังไม่ได้วัดจริง)" })}</span>
        </div>
      ) : null}
      {(mode === "week" || mode === "month" || mode === "custom") && daily.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/50">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400/80" /> On-peak</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400/80" /> Off-peak</span>
          <span className="ml-auto tabular">
            {L({ en: "Total", th: "รวม" })} <b className="text-white/80">{(totOn + totOff).toFixed(0)} MWh</b> · ≈<b className="text-white/80">{formatTHB(dailyCost)}</b> · On-peak <b className="text-amber-300">{Math.round((totOn / (totOn + totOff)) * 100)}%</b>
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** Top-5 consumers with a 4-level lens (Machine / Line / Area / Site) and
 *  hierarchy drill-down. mode "power" = live kW, mode "cost" = ฿/day vs baseline. */
type ConsumerLens = "machine" | "line" | "area" | "site";
const LENS_CHILD: Record<ConsumerLens, ConsumerLens | null> = { site: "area", area: "line", line: "machine", machine: null };
const LENS_LABEL: Record<ConsumerLens, string> = { machine: "Machine", line: "Line", area: "Area", site: "Site" };

/* cost-by-hour heatmap: each consumer has a duty archetype; cost = load × TOU rate,
 * so on-peak hours (09–22, ฿4.19) naturally read darker than off-peak (฿2.60) */
const HM_HOURS = Array.from({ length: 24 }, (_, h) => h);
const hmArche = (name: string) => {
  const k = name.toLowerCase();
  if (/chiller|cool|tower|pump|utility/.test(k)) return "cooling";
  if (/compress|air/.test(k)) return "compressed";
  if (/press|mold|cnc|palletiz|weld|paint|assembly|imm|robot|stamp|inject|machin|production|line/.test(k)) return "production";
  return "mixed";
};
const hmLoad = (arche: string, h: number) => {
  const day = Math.exp(-((h - 13) ** 2) / 42);
  if (arche === "cooling") return 0.55 + 0.45 * day;
  if (arche === "compressed") return h >= 7 && h <= 19 ? 0.82 + 0.18 * day : 0.44;
  if (arche === "production") return h >= 8 && h <= 17 ? 0.9 + 0.1 * day : 0.12;
  return 0.42 + 0.5 * day;
};
const hmRate = (h: number) => (h >= 9 && h < 22 ? 4.19 : 2.6);
const hmCellBg = (t: number) => {
  const m = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgba(${m(251, 244)},${m(191, 63)},${m(36, 94)},${(0.1 + 0.9 * t).toFixed(2)})`;
};

function TopConsumers({ L, mode, panelTitle, panelSub }: { L: (o: LZ) => string; mode: "power" | "cost"; panelTitle?: string; panelSub?: string }) {
  const [lens, setLens] = useState<ConsumerLens>(mode === "power" ? "machine" : "area");
  const [path, setPath] = useState<{ lens: ConsumerLens; name: string }[]>([]);
  const [jit, setJit] = useState<Record<string, number>>({});

  useEffect(() => {
    if (mode !== "power") return;
    const tick = () => {
      const j: Record<string, number> = {};
      CONSUMER_FLEET.forEach((m) => { j[m.name] = 1 + (Math.random() - 0.5) * 0.06; });
      setJit(j);
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [mode]);

  const fieldOf = (m: ConsumerM, l: ConsumerLens) => (l === "machine" ? m.name : m[l]);
  const scoped = CONSUMER_FLEET.filter((m) => path.every((p) => fieldOf(m, p.lens) === p.name));
  const groups = new Map<string, { kw: number; base: number; sub: string }>();
  scoped.forEach((m) => {
    const k = fieldOf(m, lens);
    const g = groups.get(k) ?? { kw: 0, base: 0, sub: lens === "machine" ? `${m.area} · ${m.line}` : lens === "line" ? m.area : lens === "area" ? m.site : "" };
    g.kw += m.kw * (mode === "power" ? (jit[m.name] ?? 1) : 1);
    g.base += m.base;
    groups.set(k, g);
  });
  const totalKw = scoped.reduce((s, m) => s + m.kw * (mode === "power" ? (jit[m.name] ?? 1) : 1), 0);
  const rows = [...groups.entries()]
    .map(([name, g]) => ({ name, ...g, delta: Math.round(((g.kw - g.base) / g.base) * 100) }))
    .sort((a, b) => b.kw - a.kw)
    .slice(0, 5);
  const top5Share = totalKw ? Math.round((rows.reduce((s, r) => s + r.kw, 0) / totalKw) * 100) : 0;
  const maxKw = rows[0]?.kw ?? 1;
  const canDrill = LENS_CHILD[lens] != null;

  // per-row cost-by-hour cells for the heatmap (cost mode only)
  const hmRows = rows.map((r) => {
    const arche = hmArche(`${r.name} ${r.sub}`);
    return { name: r.name, cells: HM_HOURS.map((h) => r.kw * hmLoad(arche, h) * hmRate(h)) };
  });
  const hmMax = Math.max(1, ...hmRows.flatMap((r) => r.cells));

  const drill = (name: string) => {
    const child = LENS_CHILD[lens];
    if (!child) return;
    setPath((p) => [...p, { lens, name }]);
    setLens(child);
  };

  const lensToggle = (
    <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
      {(["machine", "line", "area", "site"] as ConsumerLens[]).map((l) => (
        <button key={l} onClick={() => { setLens(l); setPath([]); }} className={cn("whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition", lens === l && !path.length ? "bg-white/10 text-white/90" : "text-white/45 hover:text-white/70")}>{LENS_LABEL[l]}</button>
      ))}
    </div>
  );
  const breadcrumb = path.length ? (
    <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-white/55">
      {path.map((p) => <span key={p.name} className="truncate rounded-md bg-brand-400/12 px-2 py-0.5 text-brand-200">{p.name}</span>)}
      <button onClick={() => { setPath([]); setLens(mode === "power" ? "machine" : "area"); }} className="rounded-md border border-white/12 px-1.5 py-0.5 text-[11px] text-white/50 transition hover:text-white/80">✕ {L({ en: "reset", th: "ล้าง" })}</button>
    </span>
  ) : null;

  const body = (
    <div>
      {mode === "power" || breadcrumb ? (
        <div className="mb-3 flex min-h-[30px] items-center gap-2 overflow-x-auto scrollbar-hide">
          {mode === "power" ? lensToggle : null}
          {breadcrumb}
          {mode === "power" ? (
            <span className="ml-auto flex items-center gap-1.5 whitespace-nowrap text-[10.5px] text-white/40"><LiveBadge size="sm" /> {L({ en: "moves with live load", th: "ขยับตามโหลดขณะนี้" })}</span>
          ) : null}
        </div>
      ) : null}

      {(() => {
        // reserve a full 5-row height so lens/drill clicks never resize the card
        const list = (
          <div className="min-h-[236px] space-y-2.5">
            {rows.map((r, i) => (
              <div key={r.name} onClick={() => canDrill && drill(r.name)} className={cn("group rounded-lg px-1 py-1 transition", canDrill && "cursor-pointer hover:bg-white/[0.03]")} title={canDrill ? L({ en: "Click to drill down", th: "คลิกเพื่อเจาะลงระดับถัดไป" }) : undefined}>
                {/* one line — rank + machine name · metrics (name shown in full) */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white/[0.06] text-[10px] font-semibold text-white/60">{i + 1}</span>
                    <span className="min-w-0 font-medium text-white/85">{r.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2.5 tabular">
                    {mode === "cost" ? (
                      <>
                        <span className="text-right font-semibold text-white/85">{formatTHB(Math.round(r.kw * THB_PER_KW_DAY))}<span className="text-[10px] font-normal text-white/40">/{L({ en: "d", th: "วัน" })}</span></span>
                        <span className="w-9 text-right text-[11px] text-white/45">{Math.round((r.kw / totalKw) * 100)}%</span>
                        <span className={cn("w-12 rounded-md px-1 py-0.5 text-center text-[10.5px] font-semibold", r.delta >= 5 ? "bg-rose-500/12 text-rose-300" : r.delta <= -5 ? "bg-emerald-500/12 text-emerald-300" : "bg-white/6 text-white/45")}>{r.delta > 0 ? "+" : ""}{r.delta}%</span>
                      </>
                    ) : (
                      <span className="text-right font-semibold text-white/85">{Math.round(r.kw)} <span className="text-[10px] font-normal text-white/40">kW</span></span>
                    )}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(r.kw / maxKw) * 100}%`, background: mode === "cost" ? "linear-gradient(90deg, #f59e0b, #f43f5e)" : "linear-gradient(90deg, #22d3ee, #6366f1)" }} />
                </div>
              </div>
            ))}
          </div>
        );
        if (mode !== "cost") return list;
        return (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.12fr)]">
            {list}
            {/* cost-by-hour heatmap — when the money burns */}
            <div className="min-h-[236px]">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="font-medium text-white/60">{L({ en: "When the money burns · ฿ by hour", th: "เงินไหม้ตอนไหน · ฿ รายชั่วโมง" })}</span>
                <span className="flex items-center gap-1 text-white/35">{L({ en: "less", th: "น้อย" })}<span className="h-2.5 w-14 rounded-sm" style={{ background: "linear-gradient(90deg, rgba(251,191,36,0.18), rgba(244,63,94,0.95))" }} />{L({ en: "more", th: "มาก" })}</span>
              </div>
              <div className="space-y-1">
                {hmRows.map((r) => (
                  <div key={r.name} className="flex items-center gap-2">
                    <span className="w-[112px] shrink-0 truncate text-[10.5px] text-white/60" title={r.name}>{r.name}</span>
                    <div className="grid flex-1 gap-[2px]" style={{ gridTemplateColumns: "repeat(24, 1fr)" }}>
                      {r.cells.map((c, h) => {
                        const t = Math.min(1, c / hmMax);
                        return <div key={h} className="h-3.5 rounded-[2px]" title={`${r.name} · ${String(h).padStart(2, "0")}:00 · ฿${Math.round(c).toLocaleString()}/${L({ en: "h", th: "ชม." })}`} style={{ background: hmCellBg(t) }} />;
                      })}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <span className="w-[112px] shrink-0" />
                  <div className="grid flex-1 text-[8px] text-white/30" style={{ gridTemplateColumns: "repeat(24, 1fr)" }}>
                    {HM_HOURS.map((h) => (h % 6 === 0 ? <span key={h} className="whitespace-nowrap" style={{ gridColumnStart: h + 1 }}>{String(h).padStart(2, "0")}:00</span> : null))}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-white/40">
                {L({
                  en: "Darker 09:00–22:00 = on-peak ฿4.19/kWh. Cooling burns all day; presses spike on-shift — shift what you can to off-peak.",
                  th: "ช่วง 09:00–22:00 เข้มกว่า = on-peak ฿4.19/kWh. ระบบทำความเย็นกินทั้งวัน เครื่องเพรสพุ่งช่วงกะ — ย้ายที่ย้ายได้ไป off-peak",
                })}
              </p>
            </div>
          </div>
        );
      })()}

      <p className={cn("mt-3 rounded-lg border px-2.5 py-1.5 text-[11px]", mode === "cost" ? "border-amber-400/20 bg-amber-400/[0.06] text-amber-200" : "border-white/8 bg-white/[0.02] text-white/45")}>
        {mode === "cost"
          ? `Top 5 = ${top5Share}% ${L({ en: "of the bill in this scope — control these and most of the cost is under control", th: "ของบิลในขอบเขตนี้ — คุมแค่นี้ก็คุมต้นทุนได้เกือบหมด" })}`
          : L({ en: "Live ranking — bars move with the actual load · click a row to drill down", th: "อันดับปัจจุบัน — แถบขยับตามโหลดจริง · คลิกแถวเพื่อเจาะลง" })}
      </p>
    </div>
  );

  if (mode === "cost") {
    return (
      <Panel title={panelTitle ?? "Top 5 Cost Drivers"} sub={panelSub} icon={BarChart3} color="#f59e0b" right={lensToggle} py="py-[18px]">
        {body}
      </Panel>
    );
  }
  return body;
}

function MonitorStep({ L }: { L: (o: LZ) => string }) {
  return (
    <div className="space-y-6">
      <AlarmStrip L={L} />
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={L({ en: "Current power", th: "กำลังไฟปัจจุบัน" })} value="1,255" unit="kW" delta="Live" deltaGood accent="#22d3ee" icon={Zap} />
        <LiveCostKpi L={L} />
        <RateNowKpi L={L} />
        <KpiCard label={L({ en: "Carbon · now", th: "คาร์บอน · ตอนนี้" })} value="555" unit="kg/h" delta="1.5%" deltaGood accent="#4ade80" icon={Leaf} />
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]">
        <Panel title={L({ en: "Live Load Profile", th: "โหลดขณะนี้" })} sub={L({ en: "Live draw vs the contract limit", th: "กำลังไฟขณะนี้เทียบเพดานสัญญา" })} icon={Activity} right={<span className="chip text-amber-300">● {L({ en: "On-peak 09:00–22:00", th: "On-peak 09:00–22:00" })}</span>}>
          <LiveLoadChart L={L} />
        </Panel>
        <DemandGauge L={L} />
      </div>
      <Panel title="Single Line Diagram" sub={L({ en: "Live power & ฿ flow through the boards", th: "ไฟและเงินไหลผ่านตู้แบบเรียลไทม์" })} icon={PlugZap} right={<LiveBadge />}>
        <SingleLineDiagram />
      </Panel>
      <IdleNowStrip L={L} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]">
        <Panel title={L({ en: "Top 5 Consumers", th: "Top 5 เครื่องกินไฟ" })} sub={L({ en: "Who's drawing the most right now", th: "ใครกินไฟมากสุดตอนนี้" })} icon={BarChart3} right={<LiveBadge />}>
          <TopConsumers L={L} mode="power" />
        </Panel>
        <PowerFactorCard L={L} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── 02 insight ── */

/* Nocturne Ledger — bill stratigraphy: where the month's money settles.
 * Pure tariff arithmetic from the meters; no models involved. */
const billStrata: { name: LZ; thb: number; pct: number; color: string; note: LZ; armed?: boolean }[] = [
  { name: { en: "On-peak energy", th: "ค่าพลังงาน On-peak" }, thb: 700400, pct: 61, color: "#f59e0b", note: { en: "09:00–22:00 · ฿4.19/kWh", th: "09:00–22:00 · ฿4.19/kWh" } },
  { name: { en: "Off-peak energy", th: "ค่าพลังงาน Off-peak" }, thb: 218100, pct: 19, color: "#34d399", note: { en: "22:00–09:00 · ฿2.60/kWh", th: "22:00–09:00 · ฿2.60/kWh" } },
  { name: { en: "Demand charge", th: "ค่าดีมานด์" }, thb: 172300, pct: 15, color: "#fb923c", note: { en: "peak 15-min · 1,455 kW", th: "พีค 15 นาที · 1,455 kW" } },
  { name: { en: "Ft + service", th: "Ft + ค่าบริการ" }, thb: 46400, pct: 4, color: "#64748b", note: { en: "pass-through", th: "ส่งผ่านตามการไฟฟ้า" } },
  { name: { en: "PF penalty", th: "ค่าปรับ PF" }, thb: 0, pct: 1, color: "#f43f5e", note: { en: "armed — ≈฿3,600 if PF drops below 0.85", th: "จ่อปลดล็อก — ≈฿3,600 ถ้า PF หลุด 0.85" }, armed: true },
];

function BillBreakdownCard({ L }: { L: (o: LZ) => string }) {
  return (
    <Panel title={L({ en: "Bill Breakdown", th: "แยกส่วนบิลค่าไฟ" })} sub={L({ en: "Where this month's ฿ actually go", th: "เงินค่าไฟเดือนนี้ไปอยู่ไหน" })} icon={Wallet} color="#f59e0b" right={<span className="chip text-white/45">{L({ en: "meters + tariff math only", th: "มิเตอร์ + สูตรค่าไฟล้วน ๆ" })}</span>}>
      <div className="flex items-baseline gap-2">
        <p className="tabular text-4xl font-semibold text-white">{formatTHB(1150000)}</p>
        <p className="text-sm text-white/45">{L({ en: "where the month settles", th: "เงินเดือนนี้ตกไปอยู่ประเภทไหน" })}</p>
      </div>

      {/* the strata bar — layers deposit left to right */}
      <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-white/6">
        {billStrata.filter((s) => !s.armed).map((s, i) => (
          <motion.div
            key={s.name.en}
            initial={{ width: 0 }}
            animate={{ width: `${s.pct}%` }}
            transition={{ duration: 0.9, delay: 0.15 + i * 0.14, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: `linear-gradient(180deg, ${s.color}, ${s.color}99)`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25)` }}
          />
        ))}
      </div>

      <div className="mt-4 space-y-1.5">
        {billStrata.map((s, i) => (
          <motion.div
            key={s.name.en}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.12 }}
            className={cn("flex items-center gap-3 rounded-lg border px-3 py-2", s.armed ? "border-dashed border-rose-400/40 bg-rose-500/[0.04]" : "border-white/6 bg-white/[0.02]")}
          >
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", s.armed && "border border-rose-400 bg-transparent")} style={s.armed ? undefined : { backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}66` }} />
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate text-[12.5px] font-medium", s.armed ? "text-rose-300" : "text-white/85")}>{L(s.name)}</span>
              <span className="block truncate text-[10px] text-white/35">{L(s.note)}</span>
            </span>
            <span className={cn("w-[104px] shrink-0 text-right tabular text-[13.5px] font-semibold", s.armed ? "text-rose-300" : "text-white/85")}>{formatTHB(s.thb)}</span>
            <span className="w-9 shrink-0 text-right tabular text-[11px] text-white/40">{s.armed ? "—" : `${s.pct}%`}</span>
          </motion.div>
        ))}
      </div>
    </Panel>
  );
}

/* Night baseload — the plant sleeps 22:00–06:00 but the meters don't. */
const nightHours = [22, 23, 0, 1, 2, 3, 4, 5, 6];
const nightLoad = [418, 406, 399, 402, 447, 409, 401, 396, 424];
const NIGHT_TARGET = 300;

function NightBaseloadCard({ L, onAct }: { L: (o: LZ) => string; onAct: () => void }) {
  const CW = 620, CHT = 236, top = 16, bottom = 200;
  const xOf = (i: number) => 36 + (i / (nightHours.length - 1)) * (CW - 50);
  const yOf = (kw: number) => bottom - (kw / 500) * (bottom - top);
  const linePath = nightLoad.map((kw, i) => `${i ? "L" : "M"}${xOf(i)},${yOf(kw)}`).join(" ");
  const wastePath = `M${xOf(0)},${yOf(NIGHT_TARGET)} ${nightLoad.map((kw, i) => `L${xOf(i)},${yOf(kw)}`).join(" ")} L${xOf(nightLoad.length - 1)},${yOf(NIGHT_TARGET)} Z`;
  return (
    <Panel title={L({ en: "Night Baseload", th: "ไฟรั่วยามวิกาล" })} sub={L({ en: "Power burned while the plant sleeps", th: "ไฟที่เผาทิ้งตอนโรงงานหลับ" })} icon={Moon} color="#818cf8" right={<span className="chip text-amber-300">{L({ en: "pure waste", th: "สูญเปล่าล้วน" })}</span>}>
      <div className="flex items-baseline gap-2">
        <p className="tabular text-4xl font-semibold text-amber-300">412 <span className="text-base font-normal text-white/45">kW</span></p>
        <p className="text-sm text-white/45">{L({ en: "avg while the plant sleeps · target ≤ 300 kW", th: "เฉลี่ยช่วงโรงงานหลับ · เป้า ≤ 300 kW" })}</p>
      </div>

      <svg viewBox={`0 0 ${CW} ${CHT}`} className="mt-2 w-full">
        {[100, 200, 300, 400, 500].map((kw) => (
          <g key={kw}>
            <line x1={36} y1={yOf(kw)} x2={CW - 14} y2={yOf(kw)} stroke={kw === NIGHT_TARGET ? "rgba(103,232,249,0.5)" : "rgba(255,255,255,0.06)"} strokeWidth={kw === NIGHT_TARGET ? 1.2 : 1} strokeDasharray={kw === NIGHT_TARGET ? "6 5" : undefined} />
            <text x={30} y={yOf(kw) + 3.5} textAnchor="end" fontSize="8.5" fill={kw === NIGHT_TARGET ? "#67e8f9" : "rgba(255,255,255,0.25)"} fontFamily="var(--font-mono, monospace)">{kw}</text>
          </g>
        ))}
        <text x={CW - 14} y={yOf(NIGHT_TARGET) - 6} textAnchor="end" fontSize="8.5" fill="#67e8f9" letterSpacing="1.5">{L({ en: "TARGET 300", th: "เป้า 300" })}</text>
        <rect x={36} y={yOf(NIGHT_TARGET)} width={CW - 50} height={bottom - yOf(NIGHT_TARGET)} fill="#22d3ee" opacity="0.04" />
        <motion.path d={wastePath} fill="#f59e0b" initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} transition={{ duration: 0.8, delay: 0.9 }} />
        <motion.path d={linePath} fill="none" stroke="#fbbf24" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.3, delay: 0.2, ease: "easeOut" }} />
        {nightLoad.map((kw, i) => (
          <motion.circle key={i} cx={xOf(i)} cy={yOf(kw)} r="2.6" fill="#fbbf24" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + (i / nightLoad.length) * 1.3 }} />
        ))}
        {/* the 02:00 anomaly — one rose fault line */}
        <line x1={xOf(4)} y1={yOf(nightLoad[4]) - 8} x2={xOf(4)} y2={12} stroke="#f43f5e" strokeDasharray="3 3" opacity="0.85" />
        <motion.circle cx={xOf(4)} cy={yOf(nightLoad[4])} r="5" fill="none" stroke="#f43f5e" strokeWidth="1.4" animate={{ opacity: [1, 0.35, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} />
        <text x={xOf(4) - 8} y={20} textAnchor="end" fontSize="9" fill="#fb7185" fontFamily="var(--font-mono, monospace)" letterSpacing="0.5">{L({ en: "02:00 — ring-main leak · Air Compressor 10", th: "02:00 — ลมรั่วท่อเมน · Air Compressor 10" })}</text>
        {/* moon */}
        <motion.g animate={{ opacity: [0.65, 1, 0.65] }} transition={{ repeat: Infinity, duration: 4.5 }}>
          <circle cx={CW - 60} cy={26} r="11" fill="#e6edf7" opacity="0.8" />
          <circle cx={CW - 65} cy={22} r="9.5" fill="#10151f" />
        </motion.g>
        {nightHours.map((h, i) => (
          <g key={h}>
            <line x1={xOf(i)} y1={bottom} x2={xOf(i)} y2={bottom + 5} stroke="rgba(255,255,255,0.15)" />
            <text x={xOf(i)} y={bottom + 18} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.3)" fontFamily="var(--font-mono, monospace)">{String(h).padStart(2, "0")}:00</text>
          </g>
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-3.5 py-2.5">
        <span className="tabular text-[15px] font-semibold text-white">112 kW</span>
        <span className="tabular text-[12px] text-white/50">× 8 {L({ en: "h", th: "ชม." })} × 26 {L({ en: "d", th: "วัน" })} × ฿2.60</span>
        <span className="text-white/35">=</span>
        <span className="ml-auto tabular text-xl font-bold text-amber-300">{formatTHB(60570)}<span className="text-[11px] font-normal text-white/45">/{L({ en: "mo", th: "เดือน" })}</span></span>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <p className="text-[11.5px] text-white/40">{L({ en: "Energy spent while nothing was produced — arithmetic, not a model", th: "ไฟที่จ่ายไปโดยไม่มีการผลิตเลย — เลขคูณหารตรง ๆ ไม่ใช่โมเดล" })}</p>
        <button onClick={onAct} className="btn-glow shrink-0 px-3 py-1.5 text-[12px]"><Sparkles size={13} /> {L({ en: "Get AI fixes", th: "ให้ AI เสนอวิธีแก้" })}</button>
      </div>
    </Panel>
  );
}

/* Bill trend — 12 months of deposits, same strata colours as the breakdown.
 * Current month = solid MTD + dashed projection; rose rings mark penalty months. */
const billTrend: { m: LZ; total: number; penalty?: boolean; mtd?: number }[] = [
  { m: { en: "Aug", th: "ส.ค." }, total: 3.05 },
  { m: { en: "Sep", th: "ก.ย." }, total: 2.98 },
  { m: { en: "Oct", th: "ต.ค." }, total: 3.02 },
  { m: { en: "Nov", th: "พ.ย." }, total: 2.88 },
  { m: { en: "Dec", th: "ธ.ค." }, total: 2.72 },
  { m: { en: "Jan", th: "ม.ค." }, total: 2.85 },
  { m: { en: "Feb", th: "ก.พ." }, total: 2.95 },
  { m: { en: "Mar", th: "มี.ค." }, total: 3.28 },
  { m: { en: "Apr", th: "เม.ย." }, total: 3.42, penalty: true },
  { m: { en: "May", th: "พ.ค." }, total: 3.35, penalty: true },
  { m: { en: "Jun", th: "มิ.ย." }, total: 3.18 },
  { m: { en: "Jul", th: "ก.ค." }, total: 3.22, mtd: 1.15 },
];
const BILL_SHARES = [
  { key: "on", pct: 0.61, color: "#f59e0b" },
  { key: "off", pct: 0.19, color: "#34d399" },
  { key: "dm", pct: 0.15, color: "#fb923c" },
  { key: "ft", pct: 0.05, color: "#64748b" },
];

function BillTrendCard({ L }: { L: (o: LZ) => string }) {
  const W = 1180, HT = 268, base = 218, maxM = 3.6, barW = 66;
  const xOf = (i: number) => 46 + i * ((W - 60) / billTrend.length);
  const yOf = (m: number) => base - (m / maxM) * 180;
  const projected = billTrend[billTrend.length - 1].total;
  const mom = Math.round(((projected - billTrend[10].total) / billTrend[10].total) * 1000) / 10;
  const yoyBase = 3.35; // Jul last year
  const yoy = Math.round(((projected - yoyBase) / yoyBase) * 1000) / 10;
  const budget = 3.2, spentMTD = billTrend[billTrend.length - 1].mtd ?? 0;
  const spentPct = Math.round((spentMTD / budget) * 100);
  const overPct = Math.round(((projected - budget) / budget) * 1000) / 10;
  return (
    <Panel
      title={L({ en: "Bill Trend", th: "เทรนด์ค่าไฟ" })}
      sub={L({ en: "12-month spend vs budget", th: "ค่าไฟ 12 เดือนเทียบงบ" })}
      icon={TrendingUp}
      color="#22d3ee"
      right={
        <span className="flex items-center gap-1.5">
          <span className={cn("rounded-md px-2 py-0.5 text-[10.5px] font-semibold", mom > 0 ? "bg-rose-500/12 text-rose-300" : "bg-emerald-500/12 text-emerald-300")}>MoM {mom > 0 ? "+" : ""}{mom}%</span>
          <span className={cn("rounded-md px-2 py-0.5 text-[10.5px] font-semibold", yoy > 0 ? "bg-rose-500/12 text-rose-300" : "bg-emerald-500/12 text-emerald-300")}>YoY {yoy > 0 ? "+" : ""}{yoy}%</span>
        </span>
      }
    >
      <svg viewBox={`0 0 ${W} ${HT}`} className="w-full">
        {[1, 2, 3].map((m) => (
          <g key={m}>
            <line x1={40} y1={yOf(m)} x2={W - 12} y2={yOf(m)} stroke="rgba(255,255,255,0.06)" />
            <text x={34} y={yOf(m) + 3.5} textAnchor="end" fontSize="8.5" fill="rgba(255,255,255,0.28)" fontFamily="var(--font-mono, monospace)">{m}M</text>
          </g>
        ))}
        {/* annual budget datum — value is spelled out in the pacing strip + legend, so the line stays label-free */}
        <line x1={40} y1={yOf(budget)} x2={W - 12} y2={yOf(budget)} stroke="#67e8f9" strokeWidth="1.3" strokeDasharray="7 5" opacity="0.75" />
        {billTrend.map((b, i) => {
          const x = xOf(i);
          const isCur = b.mtd != null;
          const solidTotal = isCur ? b.mtd! : b.total;
          let cum = 0;
          return (
            <motion.g key={b.m.en} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}>
              <title>{`${L(b.m)} · ฿${b.total.toFixed(2)}M${b.penalty ? " · demand penalty" : ""}`}</title>
              {BILL_SHARES.map((s) => {
                const h = (solidTotal * s.pct / maxM) * 180;
                const y = base - ((cum + solidTotal * s.pct) / maxM) * 180;
                cum += solidTotal * s.pct;
                return <rect key={s.key} x={x} y={y} width={barW} height={Math.max(0.5, h)} fill={s.color} opacity={0.82} />;
              })}
              {isCur ? (
                <>
                  <rect x={x} y={yOf(b.total)} width={barW} height={yOf(b.mtd!) - yOf(b.total)} fill="none" stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.8" />
                  <text x={x + barW / 2} y={yOf(b.total) - 8} textAnchor="middle" fontSize="8.5" fill="#fbbf24" fontFamily="var(--font-mono, monospace)">{L({ en: "proj", th: "คาด" })} ฿{b.total.toFixed(2)}M</text>
                </>
              ) : (
                <text x={x + barW / 2} y={yOf(b.total) - (b.penalty ? 20 : 6)} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.35)" fontFamily="var(--font-mono, monospace)">{b.total.toFixed(2)}</text>
              )}
              {b.penalty ? <circle cx={x + barW / 2} cy={yOf(b.total) - 10} r="3.5" fill="none" stroke="#f43f5e" strokeWidth="1.4" /> : null}
              <text x={x + barW / 2} y={base + 16} textAnchor="middle" fontSize="9" fill={isCur ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)"} fontWeight={isCur ? 600 : 400}>{L(b.m)}</text>
              <text x={x + barW / 2} y={base + 28} textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.22)" fontFamily="var(--font-mono, monospace)">{i < 5 ? "'25" : "'26"}</text>
            </motion.g>
          );
        })}
      </svg>

      {/* budget pacing — folded in from the old standalone card */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-[12px]">
        <span className="flex items-center gap-1.5 font-medium text-white/70"><Target size={13} className="text-brand-300" /> {L({ en: "Budget pacing", th: "การใช้งบ" })}</span>
        <span className="text-white/50">{L({ en: "Spent", th: "ใช้ไป" })} <b className="tabular text-white/85">฿{spentMTD.toFixed(2)}M</b> {L({ en: "of", th: "จาก" })} <b className="tabular text-white/85">฿{budget.toFixed(2)}M</b> · <b className="tabular text-amber-300">{spentPct}%</b></span>
        <span className="ml-auto text-white/50">{L({ en: "Projected", th: "คาดสิ้นเดือน" })} <b className="tabular text-white/85">฿{projected.toFixed(2)}M</b> · <b className={cn("tabular", overPct > 0 ? "text-rose-300" : "text-emerald-300")}>{overPct > 0 ? L({ en: `over ${overPct}%`, th: `เกินงบ ${overPct}%` }) : L({ en: `under ${Math.abs(overPct)}%`, th: `ต่ำกว่างบ ${Math.abs(overPct)}%` })}</b></span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/50">
        {[["On-peak", "#f59e0b"], ["Off-peak", "#34d399"], ["Demand", "#fb923c"], ["Ft", "#64748b"]].map(([n, c]) => (
          <span key={n} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: c as string }} /> {n}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 border-t border-dashed border-cyan-300" /> {L({ en: "annual budget", th: "งบทั้งปี" })}</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-rose-400" /> {L({ en: "month with a demand penalty", th: "เดือนที่โดนค่าปรับ demand" })}</span>
        <span className="ml-auto text-white/35">{L({ en: "hot season (Mar–May) drives the chiller load — compare YoY, not MoM", th: "หน้าร้อน (มี.ค.–พ.ค.) Chiller กินหนัก — เทียบ YoY ยุติธรรมกว่า MoM" })}</span>
      </div>
    </Panel>
  );
}

/** INSIGHT — the efficiency question: energy spent per unit produced. Derived straight
 *  from the metered bill ÷ MES output, so it reconciles with the bill exactly. */
function EnergyIntensityCard({ L }: { L: (o: LZ) => string }) {
  const rows = monthlyBills.map((b, i) => {
    const units = monthlyUnits[i];
    const kwh = b.onPeak / RATE_PEAK + b.offPeak / 2.6;
    const total = b.onPeak + b.offPeak + b.demand + b.penalty;
    return { label: b.label, mtd: b.mtd, kwhU: kwh / units, bahtU: total / units };
  });
  const cur = rows[rows.length - 1], prev = rows[rows.length - 2];
  const momPct = ((cur.bahtU - prev.bahtU) / prev.bahtU) * 100;
  const worse = momPct > 0;
  const best = rows.reduce((m, r) => (r.bahtU < m.bahtU ? r : m), rows[0]);
  const maxU = Math.max(...rows.map((r) => r.bahtU)), minU = Math.min(...rows.map((r) => r.bahtU));
  const floor = minU - (maxU - minU) * 0.55;
  return (
    <Panel
      title={L({ en: "Energy Intensity", th: "ความเข้มพลังงาน" })}
      sub={L({ en: "Energy cost per unit produced", th: "ต้นทุนพลังงานต่อหน่วยที่ผลิต" })}
      icon={Gauge} color="#22d3ee"
      right={<span className={cn("chip", worse ? "text-rose-300" : "text-emerald-300")}>{worse ? "▲" : "▼"} {Math.abs(momPct).toFixed(1)}% MoM</span>}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <div>
          <div className="flex items-baseline gap-2">
            <p className="tabular text-4xl font-bold text-white">฿{cur.bahtU.toFixed(2)}</p>
            <p className="text-sm text-white/45">THB/{L({ en: "unit", th: "หน่วย" })}</p>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-white/45">
            {worse
              ? L({ en: `Up ${Math.abs(momPct).toFixed(1)}% vs last month — above the ${best.label} low of ฿${best.bahtU.toFixed(2)}. Each unit costs more to make.`, th: `เพิ่ม ${Math.abs(momPct).toFixed(1)}% จากเดือนก่อน — เหนือจุดต่ำสุดเดือน ${best.label} ที่ ฿${best.bahtU.toFixed(2)} ต้นทุนต่อหน่วยแพงขึ้น` })
              : L({ en: `Down ${Math.abs(momPct).toFixed(1)}% vs last month — each unit costs less to make.`, th: `ลด ${Math.abs(momPct).toFixed(1)}% จากเดือนก่อน — ต้นทุนต่อหน่วยถูกลง` })}
          </p>
          <div className="mt-4 grid grid-cols-2 divide-x divide-white/10 rounded-xl border border-white/8 bg-white/[0.02]">
            <div className="px-3 py-2.5"><p className="text-[9px] uppercase tracking-wider text-white/35">{L({ en: "energy / unit", th: "พลังงาน/หน่วย" })}</p><p className="mt-0.5 tabular text-[15px] font-semibold text-cyan-200">{cur.kwhU.toFixed(2)} <span className="text-[10px] font-normal text-white/40">kWh</span></p></div>
            <div className="px-3 py-2.5"><p className="text-[9px] uppercase tracking-wider text-white/35">{L({ en: "best month", th: "เดือนดีสุด" })}</p><p className="mt-0.5 tabular text-[15px] font-semibold text-emerald-300">฿{best.bahtU.toFixed(2)} <span className="text-[10px] font-normal text-white/40">{best.label}</span></p></div>
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-white/35">{L({ en: "THB per unit · last 6 months", th: "฿ ต่อหน่วย · 6 เดือนล่าสุด" })}</p>
          <div className="flex h-[150px] items-end gap-2">
            {rows.map((r) => {
              const h = Math.max(6, ((r.bahtU - floor) / (maxU - floor)) * 100);
              const isCur = r.mtd, isBest = r.bahtU === best.bahtU;
              return (
                <div key={r.label} className="flex h-full flex-1 flex-col items-center gap-1.5">
                  <span className={cn("tabular text-[10px]", isCur ? "font-semibold text-cyan-300" : isBest ? "font-semibold text-emerald-300" : "text-white/60")}>฿{r.bahtU.toFixed(2)}</span>
                  <div className="flex w-full flex-1 items-end">
                    <div className={cn("w-full rounded-t transition-all", !isCur && !isBest && "bg-white/15")} style={{ height: `${h}%`, ...(isCur ? { background: "linear-gradient(180deg,#22d3ee,#0e7490)" } : isBest ? { background: "linear-gradient(180deg,#34d399,#059669)" } : {}) }} />
                  </div>
                  <span className={cn("text-[10px]", isCur ? "font-semibold text-cyan-300" : "text-white/40")}>{r.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** INSIGHT — the timing question: which hours and days carry the load, so load-shifting
 *  has a target. Pure pre-AI reading of the metered load shape. */
function WhenWeUseEnergyCard({ L }: { L: (o: LZ) => string }) {
  const maxWd = Math.max(...weekdayEnergy.map((w) => w.mwh));
  const heat = (v: number) => {
    const t = v / 100;
    return `rgba(${Math.round(251 - 7 * t)}, ${Math.round(191 - 128 * t)}, ${Math.round(36 + 58 * t)}, ${(0.15 + 0.8 * t).toFixed(2)})`;
  };
  return (
    <Panel title={L({ en: "When We Use Energy", th: "ใช้ไฟตอนไหน" })} sub={L({ en: "The hours and days to target for load-shifting", th: "ชั่วโมง/วันที่ควรเล็งย้ายโหลด" })} icon={Activity} color="#818cf8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.9fr)]">
        <div>
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/35">
            <span>{L({ en: "Load by hour · % of peak", th: "โหลดรายชั่วโมง · % ของพีค" })}</span>
            <span className="flex items-center gap-1 normal-case text-white/30">{L({ en: "low", th: "ต่ำ" })}<span className="h-2.5 w-16 rounded-sm" style={{ background: "linear-gradient(90deg, rgba(251,191,36,0.18), rgba(244,63,94,0.95))" }} />{L({ en: "high", th: "สูง" })}</span>
          </div>
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(24,1fr)" }}>
            {hourlyLoadShape.map((v, h) => {
              const inPeak = h >= peakWindow.from && h <= peakWindow.to;
              return <div key={h} className="h-9 rounded-[3px]" title={`${String(h).padStart(2, "0")}:00 · ${v}%`} style={{ background: heat(v), outline: inPeak ? "1.5px solid #f59e0b" : "none", outlineOffset: "-1.5px" }} />;
            })}
          </div>
          <div className="mt-1 grid text-[8px] text-white/30" style={{ gridTemplateColumns: "repeat(24,1fr)" }}>
            {hourlyLoadShape.map((_, h) => (h % 6 === 0 ? <span key={h} style={{ gridColumnStart: h + 1 }}>{String(h).padStart(2, "0")}:00</span> : null))}
          </div>
          <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-2.5 py-1.5 text-[11.5px] leading-relaxed text-amber-200">{L({ en: `The ${peakWindow.from}:00–${peakWindow.to + 1}:00 window carries ${peakWindow.share}% of the on-peak charge — the hours to shave or shift first.`, th: `ช่วง ${peakWindow.from}:00–${peakWindow.to + 1}:00 กินค่าไฟ on-peak ${peakWindow.share}% — ชั่วโมงที่ควรลด/ย้ายก่อน` })}</p>
        </div>
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-white/35">{L({ en: "Avg by weekday · MWh", th: "เฉลี่ยรายวัน · MWh" })}</p>
          <div className="space-y-1.5">
            {weekdayEnergy.map((w) => {
              const isMax = w.mwh === maxWd, wknd = w.d === "Sat" || w.d === "Sun";
              return (
                <div key={w.d} className="flex items-center gap-2 text-[11px]">
                  <span className={cn("w-9 shrink-0 tabular", isMax ? "font-semibold text-white/85" : "text-white/50")}>{w.d}</span>
                  <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                    <div className="h-full rounded-full" style={{ width: `${(w.mwh / maxWd) * 100}%`, background: isMax ? "linear-gradient(90deg,#818cf8,#6366f1)" : wknd ? "rgba(255,255,255,0.18)" : "rgba(129,140,248,0.4)" }} />
                  </div>
                  <span className={cn("w-10 shrink-0 text-right tabular", isMax ? "font-semibold text-indigo-200" : "text-white/50")}>{w.mwh}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2.5 text-[10.5px] leading-relaxed text-white/40">{L({ en: "Wed runs heaviest; weekends drop ~35%. Move energy-heavy batches to off-peak hours and lighter days.", th: "วันพุธหนักสุด เสาร์-อาทิตย์ลด ~35% ย้ายงานกินไฟหนักไปช่วงออฟพีคและวันที่เบากว่า" })}</p>
        </div>
      </div>
    </Panel>
  );
}

function InsightStep({ L, onAct }: { L: (o: LZ) => string; onAct: () => void }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <BillBreakdownCard L={L} />
        <NightBaseloadCard L={L} onAct={onAct} />
      </div>
      <EnergyIntensityCard L={L} />
      <IdleDuringProductionCard L={L} onAct={onAct} />
      <WhenWeUseEnergyCard L={L} />
      <TopConsumers L={L} mode="cost" panelTitle={L({ en: "Top 5 Cost Drivers", th: "Top 5 ตัวกินเงิน" })} panelSub={L({ en: "Who costs the most vs normal", th: "ใครกินเงินเกินปกติ" })} />
      <BillTrendCard L={L} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────── 03 ai analysis ── */

function AnalysisStep({ L, onAct }: { L: (o: LZ) => string; onAct: () => void }) {
  const [lit, setLit] = useState(false); // drives the fill/animation on mount
  useEffect(() => { const t = setTimeout(() => setLit(true), 90); return () => clearTimeout(t); }, []);
  // round-2: verified fixes whose post-fix M&V missed target loop back here as re-check findings
  const orders = useWorkOrders();
  const recheck = orders
    .filter((w) => w.source === "energy" && w.status === "verified")
    .map((w) => ({ w, b: mvBaselines.find((x) => x.id === w.findingId) }))
    .filter((r): r is { w: (typeof orders)[number]; b: MVBaseline } => !!r.b && !mvMetTarget(r.b));
  const total = findings.reduce((s, f) => s + f.bahtYr, 0);
  const loadShift = 434000, equip = total - loadShift;
  const lsPct = Math.round((loadShift / total) * 100);
  const contract = 1500, breachKw = 1540, over = breachKw - contract;
  const penaltyMo = Math.round(over * 199.06);

  const pill = (label: string, value: string, bar?: number) => (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/55">
      {label}
      {bar != null ? <span className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full" style={{ width: lit ? `${bar}%` : "0%", background: "#818cf8", transition: "width 900ms ease" }} /></span> : null}
      <b className="tabular font-semibold text-indigo-300">{value}</b>
    </span>
  );

  return (
    <div className="space-y-6">
      {/* glass-box: show the engine's reasoning (read → standards → detect → rank)
          driven by the real rule engine, before the curated verdict below */}
      <AiReasoningTrace
        categories={["power", "power-quality"]}
        pointsLabel={{ en: "Main loads · meters · PLC · now", th: "โหลดหลัก · มิเตอร์ · PLC · ปัจจุบัน" }}
      />

      {/* Round-2 — verified fixes the M&V looped back for a re-check */}
      {recheck.length ? (
        <Panel title={L({ en: "Re-check — post-fix results below target", th: "ตรวจซ้ำ — ผลหลังแก้ไม่ถึงเป้า" })} sub={L({ en: "Verified work whose M&V flagged it back for another look", th: "งานที่ยืนยันแล้วแต่ M&V ตีกลับให้ดูซ้ำ" })} icon={AlertTriangle} color="#f59e0b" right={<span className="chip text-amber-300">{recheck.length} {L({ en: "looped back", th: "ตีกลับ" })}</span>}>
          <div className="space-y-2.5">
            {recheck.map(({ w, b }) => (
              <div key={w.id} className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3.5">
                <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
                  <span className="font-medium text-cyan-300">{L(b.machine)} · {L(b.metric)}</span>
                  <ArrowRight size={12} className="shrink-0 text-white/30" />
                  <span className="font-semibold text-amber-300">{L({ en: "fix incomplete — residual remains", th: "แก้ยังไม่สมบูรณ์ — ยังมี residual เหลือ" })}</span>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-white/45">{L({ en: "evidence", th: "หลักฐาน" })} · {L({ en: "after", th: "หลัง" })} {b.after}{b.unit} {L({ en: "vs target", th: "เทียบเป้า" })} {b.target}{b.unit} · {L({ en: "from power meter + PLC", th: "จาก power meter + PLC" })}</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-amber-200/80"><ArrowRight size={11} className="shrink-0" /> {L({ en: `Re-opened from ${w.id} — raise a follow-up work order to close the gap`, th: `เปิดใหม่จาก ${w.id} — ควรออก WO ตามงานเพื่อปิดส่วนที่เหลือ` })}</p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {/* A — AI Verdict (hero, answer-first) */}
      <section className="panel p-5" style={{ background: "linear-gradient(180deg, rgba(129,140,248,0.10), transparent 82%)", borderColor: "rgba(129,140,248,0.30)" }}>
        <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
          <Icon3D icon={Sparkles} color="#818cf8" size={28} rounded={9} /> {L({ en: "AI Verdict · this month", th: "ข้อสรุปจาก AI · เดือนนี้" })}
        </div>
        <p className="mt-3 tabular text-4xl font-bold text-white">{formatTHB(total)}<span className="ml-2 text-sm font-normal text-white/45">/{L({ en: "yr recoverable", th: "ปี กู้คืนได้" })}</span></p>
        <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-white/60">{L({ en: "Three root causes account for nearly all of it — about half from load-shifting to off-peak, half from fixing the chiller & air leaks. No new capital needed.", th: "ต้นเหตุ 3 อย่างคิดเป็นเกือบทั้งหมด — ราวครึ่งจากย้ายโหลดไป off-peak อีกครึ่งจากแก้ชิลเลอร์ & ลมรั่ว ไม่ต้องลงทุนเพิ่ม" })}</p>
        <div className="mt-3 max-w-md">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-white/8">
            <div style={{ width: lit ? `${lsPct}%` : "0%", background: "linear-gradient(90deg,#818cf8,#6366f1)", transition: "width 1000ms ease" }} />
            <div style={{ width: lit ? `${100 - lsPct}%` : "0%", background: "linear-gradient(90deg,#22d3ee,#0e7490)", transition: "width 1000ms ease" }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[10.5px]">
            <span className="flex items-center gap-1.5 text-indigo-300"><span className="h-2 w-2 rounded-full bg-indigo-400" />{L({ en: "Load-shift", th: "ย้ายโหลด" })} {formatTHB(loadShift)}</span>
            <span className="flex items-center gap-1.5 text-cyan-300"><span className="h-2 w-2 rounded-full bg-cyan-400" />{L({ en: "Equipment fix", th: "แก้อุปกรณ์" })} {formatTHB(equip)}</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {pill(L({ en: "confidence", th: "ความมั่นใจ" }), "92%", 92)}
          {pill(L({ en: "signals correlated", th: "สัญญาณที่โยง" }), "6")}
          {pill(L({ en: "blended payback", th: "คืนทุนเฉลี่ย" }), L({ en: "< 4 mo", th: "< 4 เดือน" }))}
        </div>
      </section>

      {/* B — Top 3 root causes (the reasoning) */}
      <Panel title={L({ en: "Top 3 Root Causes", th: "3 ต้นเหตุหลัก" })} sub={L({ en: "What's abnormal → why → what it costs", th: "อะไรผิดปกติ → เพราะอะไร → เสียเท่าไหร่" })} icon={Sparkles} color="#818cf8" right={<span className="chip text-white/45"><Gauge size={11} /> {L({ en: "from power meters + PLC", th: "จาก power meter + PLC" })}</span>}>
        <div className="space-y-2.5">
          {findings.map((f, i) => (
            <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/8 bg-white/[0.02] p-3.5 sm:flex-nowrap">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-400/15 text-[12px] font-bold text-indigo-300">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
                  <span className="font-medium text-cyan-300">{L(f.sig)}</span>
                  <ArrowRight size={12} className="shrink-0 text-white/30" />
                  <span className="font-semibold text-indigo-300">{L(f.cause)}</span>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-white/40">{L({ en: "evidence", th: "หลักฐาน" })} · {L(f.evidence)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="tabular text-[14px] font-bold text-amber-300">{formatTHB(f.bahtYr)}<span className="text-[9px] font-normal text-white/35">/{L({ en: "yr", th: "ปี" })}</span></p>
                <div className="mt-1 flex items-center justify-end gap-1.5 text-[9.5px] text-white/40">
                  {L({ en: "conf", th: "มั่นใจ" })}
                  <span className="h-1 w-9 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-emerald-400" style={{ width: lit ? `${f.conf}%` : "0%", transition: "width 900ms ease" }} /></span>
                  {f.conf}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* C — If nothing changes: forecast + the money hook */}
      <Panel title={L({ en: "If Nothing Changes", th: "ถ้าไม่ทำอะไร" })} sub={L({ en: "AI forecast — today's demand vs the contract", th: "AI พยากรณ์ — ดีมานด์วันนี้เทียบสัญญา" })} icon={TrendingUp} color="#f59e0b" right={<LiveBadge />}>
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <MultiLine data={peakForecast} height={210} lines={[{ key: "actual", color: "#22d3ee", name: L({ en: "Actual", th: "จริง" }) }, { key: "forecast", color: "#f59e0b", name: L({ en: "AI forecast", th: "AI คาดการณ์" }), dashed: true }]} />
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/[0.08] p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-rose-300">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" /></span>
                {L({ en: "Predicted breach", th: "คาดว่าจะทะลุ" })}
              </div>
              <p className="mt-2 tabular text-2xl font-bold text-white">1,540 kW <span className="text-[12px] font-normal text-white/45">@ 17:00</span></p>
              <p className="mt-0.5 text-[11.5px] text-white/55">{L({ en: "+40 kW over the 1,500 kW contract", th: "เกินสัญญา 1,500 kW อยู่ +40 kW" })}</p>
            </div>
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.08] p-4">
              <div className="flex items-center gap-2.5">
                <Icon3D icon={Coins} color="#f59e0b" size={32} rounded={10} />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">{L({ en: "Cost if it stands", th: "ค่าไฟที่เพิ่มถ้าปล่อยไว้" })}</p>
                  <p className="tabular text-xl font-bold text-amber-200">{formatTHB(penaltyMo)}<span className="text-[11px] font-normal text-white/45">/{L({ en: "mo", th: "เดือน" })}</span></p>
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-white/55">{L({ en: `This peak becomes the month's billed demand — an extra ${formatTHB(penaltyMo * 12)}/yr in demand charge unless load is shed before 17:00.`, th: `พีคนี้จะกลายเป็นดีมานด์ที่คิดเงินของเดือน — ค่าดีมานด์เพิ่มอีก ${formatTHB(penaltyMo * 12)}/ปี ถ้าไม่ปลดโหลดก่อน 17:00` })}</p>
            </div>
          </div>
        </div>
      </Panel>

      {/* hand-off */}
      <section className="panel flex flex-wrap items-center gap-4 p-5" style={{ borderColor: "rgba(129,140,248,0.25)", background: "rgba(129,140,248,0.05)" }}>
        <button onClick={onAct} className="btn-glow px-4 py-2 text-sm"><ArrowRight size={14} /> {L({ en: "Hand to Recommend & Act", th: "ส่งไปหน้าคำแนะนำ & ลงมือ" })}</button>
        <span className="text-[12px] text-white/60">{L({ en: `Carries the ${formatTHB(total)} and its three causes straight into ranked, executable actions.`, th: `พา ${formatTHB(total)} พร้อม 3 ต้นเหตุ เข้าสู่คำแนะนำที่จัดอันดับและสั่งทำได้ทันที` })}</span>
      </section>
    </div>
  );
}

/* ──────────────────────────────────────────────────── 04 recommend & act ── */

/** small on/off switch */
function Toggle({ on, onChange, color = "#818cf8" }: { on: boolean; onChange: () => void; color?: string }) {
  return (
    <button onClick={onChange} role="switch" aria-checked={on} className="relative h-5 w-9 shrink-0 rounded-full transition-colors" style={{ background: on ? color : "rgba(255,255,255,0.16)" }}>
      <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all" style={{ left: on ? "18px" : "2px" }} />
    </button>
  );
}

const IDLE_MIN_CTL = 15;
const CHK = ({ on }: { on: boolean }) => (
  <span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded border transition", on ? "border-emerald-400 bg-emerald-400/90 text-[#04150d]" : "border-white/25 bg-white/[0.03]")}>{on ? <Check size={11} /> : null}</span>
);

/** The "how to manage it" panel for a selected quick win — one interactive body per type. */
function QuickWinDetail({ id, L, auto, pick, onPick, interval, setInterval, stagOrder, moveStag }: { id: string; L: (o: LZ) => string; auto: boolean; pick: Set<string>; onPick: (itemId: string) => void; interval: number; setInterval: (n: number) => void; stagOrder: string[]; moveStag: (idx: number, dir: -1 | 1) => void }) {
  const R_ON = 4.19, R_OFF = 2.6;

  if (id === "qw-peak") {
    const cap = 1500, forecastPeak = 1540;
    const shedOf = (p: (typeof peakSheddable)[number]) => (p.ctrl === "shed" ? p.kw : p.kw - p.minKw);
    const shed = peakSheddable.filter((p) => pick.has(p.id)).reduce((s, p) => s + shedOf(p), 0);
    const newPeak = forecastPeak - shed;
    const safe = newPeak <= cap;
    return (
      <div>
        {/* demand heading up */}
        <div className="rounded-xl border border-rose-400/20 bg-rose-500/[0.05] p-3">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 font-medium text-rose-200"><TrendingUp size={13} /> {L({ en: "Demand climbing toward the cap", th: "ดีมานด์กำลังไต่ขึ้นใกล้เพดาน" })}</span>
            <span className="tabular text-rose-300">{L({ en: "AI: 1,540 kW @ 17:00", th: "AI: 1,540 kW ตอน 17:00" })}</span>
          </div>
          <MultiLine data={peakForecast} height={120} lines={[{ key: "actual", color: "#22d3ee", name: L({ en: "Actual", th: "จริง" }) }, { key: "forecast", color: "#f43f5e", name: L({ en: "Forecast", th: "คาดการณ์" }), dashed: true }]} />
        </div>
        <p className="mt-3 mb-1.5 text-[11px] font-medium text-white/60">{L({ en: "Loads that can be shed / dimmed before the peak", th: "โหลดที่ปลด / หรี่ได้ก่อนถึงพีค" })}</p>
        <div className="space-y-1.5">
          {peakSheddable.map((p) => (
            <button key={p.id} onClick={() => onPick(p.id)} className="flex w-full items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-left transition hover:bg-white/[0.04]">
              <CHK on={pick.has(p.id)} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-white/85">{L(p.name)}</p>
                <p className="text-[10px] text-white/40">{L(p.how)} · {p.equipReady ? L({ en: "ready", th: "พร้อม" }) : L({ en: "needs " + p.equip.en, th: "ต้องมี " + p.equip.th })}</p>
              </div>
              <span className="shrink-0 tabular text-[12px] font-semibold text-amber-300">-{shedOf(p)} kW</span>
            </button>
          ))}
        </div>
        <div className={cn("mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[12px]", safe ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200" : "border-amber-400/25 bg-amber-400/[0.06] text-amber-200")}>
          <span>{L({ en: "Shed total", th: "ปลดได้รวม" })} <b className="tabular">{shed} kW</b> → {L({ en: "new peak", th: "พีคใหม่" })} <b className="tabular">{newPeak.toLocaleString()} kW</b></span>
          <span className="font-semibold">{safe ? L({ en: "✓ under the 1,500 kW contract", th: "✓ ต่ำกว่าสัญญา 1,500 kW" }) : L({ en: "still over — pick more", th: "ยังเกิน — เลือกเพิ่ม" })}</span>
        </div>
      </div>
    );
  }

  if (id === "qw-idle") {
    const sel = idleMachinesCtl.filter((m) => pick.has(m.id));
    const selKw = sel.reduce((s, m) => s + m.idleKw, 0);
    const saveMo = Math.round(selKw * 7 * 26 * R_ON);
    return (
      <div>
        <p className="mb-1.5 text-[11px] font-medium text-white/60">{L({ en: "Idle machines — tick the ones to stand by / switch off", th: "เครื่องที่เดินตัวเปล่า — ติ๊กเครื่องที่จะพัก / ปิด" })}</p>
        <div className="space-y-1.5">
          {idleMachinesCtl.map((m) => {
            const canOff = m.idleFor >= IDLE_MIN_CTL;
            return (
              <button key={m.id} onClick={() => onPick(m.id)} className="flex w-full items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-left transition hover:bg-white/[0.04]">
                <CHK on={pick.has(m.id)} />
                <div className="min-w-0 flex-1">
                  <p className="tabular text-[12px] font-medium text-white/85">{m.name} <span className="text-[10px] font-normal text-white/40">· {L(m.area)}</span></p>
                  <p className="text-[10px] text-white/40">{L({ en: "idle", th: "เดินเบา" })} {m.idleFor} {L({ en: "min", th: "นาที" })}</p>
                </div>
                <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold", canOff ? "bg-amber-500/15 text-amber-300" : "bg-white/6 text-white/45")}>{canOff ? L({ en: "switch off now", th: "ปิดได้เลย" }) : L({ en: "watch", th: "เฝ้าดู" })}</span>
                <span className="w-14 shrink-0 text-right tabular text-[12px] font-semibold text-emerald-300">{m.idleKw} kW</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-2 text-[12px] text-emerald-200">
          <span>{L({ en: "Switch off", th: "ปิด" })} <b>{sel.length}</b> {L({ en: "machines", th: "เครื่อง" })} → {L({ en: "cut", th: "ลด" })} <b className="tabular">{Math.round(selKw)} kW</b></span>
          <span className="font-semibold tabular">~{formatTHB(saveMo)}/{L({ en: "mo saved", th: "เดือน" })}</span>
        </div>
      </div>
    );
  }

  if (id === "qw-stagger") {
    const ordered = stagOrder.map((mid) => startupLoads.find((m) => m.id === mid)).filter(Boolean) as typeof startupLoads;
    const simSurge = Math.round(startupLoads.reduce((s, m) => s + m.kw * m.inrushX, 0));
    const maxInrush = Math.round(Math.max(...startupLoads.map((m) => m.kw * m.inrushX)));
    return (
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-medium text-white/60">{L({ en: "Start interval", th: "เว้นช่วงเปิด" })}</span>
          {[2, 3, 5].map((n) => (
            <button key={n} onClick={() => setInterval(n)} className={cn("rounded-md px-2.5 py-1 text-[11px] font-medium transition", interval === n ? "bg-emerald-400/20 text-emerald-200" : "bg-white/[0.04] text-white/45 hover:text-white/70")}>{n} {L({ en: "min", th: "นาที" })}</button>
          ))}
          <span className="ml-auto text-[10px] text-white/35">{L({ en: "reorder with ▲▼ — top starts first", th: "จัดลำดับด้วย ▲▼ — บนสุดเปิดก่อน" })}</span>
        </div>
        <div className="space-y-1.5">
          {ordered.map((m, i) => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-emerald-400/12 text-[10px] font-bold text-emerald-300">{i + 1}</span>
              <span className="w-12 shrink-0 tabular text-[11px] font-semibold text-emerald-300">+{i * interval} {L({ en: "min", th: "น." })}</span>
              <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-white/85">{L(m.name)}</p>
              <span className="hidden shrink-0 tabular text-[10.5px] text-white/40 sm:inline">×{m.inrushX} {L({ en: "inrush", th: "กระชาก" })}</span>
              <span className="w-14 shrink-0 text-right tabular text-[12px] text-white/70">{m.kw} kW</span>
              <span className="flex shrink-0 flex-col">
                <button onClick={() => moveStag(i, -1)} disabled={i === 0} className="grid h-4 w-5 place-items-center rounded text-white/50 transition hover:bg-white/10 hover:text-white/85 disabled:opacity-20" aria-label="move up"><ChevronUp size={12} /></button>
                <button onClick={() => moveStag(i, 1)} disabled={i === ordered.length - 1} className="grid h-4 w-5 place-items-center rounded text-white/50 transition hover:bg-white/10 hover:text-white/85 disabled:opacity-20" aria-label="move down"><ChevronDown size={12} /></button>
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-2 text-[12px] text-emerald-200">
          <span>{L({ en: "All at once", th: "เปิดพร้อมกัน" })} <b className="tabular text-rose-300">~{simSurge.toLocaleString()} kW</b> → {L({ en: "staggered peak", th: "ไล่เปิด พีค" })} <b className="tabular">~{maxInrush.toLocaleString()} kW</b></span>
          <span className="font-semibold">{L({ en: "✓ surge stays under contract", th: "✓ กระชากไม่ทะลุสัญญา" })}</span>
        </div>
      </div>
    );
  }

  // qw-shift
  const sel = shiftableLoads.filter((l) => pick.has(l.id));
  const selKw = sel.reduce((s, l) => s + l.kw, 0);
  const saveMo = sel.reduce((s, l) => s + l.save, 0);
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium text-white/60">{L({ en: "Deferrable loads — tick the ones to move to off-peak", th: "โหลดที่เลื่อนได้ — ติ๊กที่จะย้ายไป off-peak" })}</p>
      <div className="space-y-1.5">
        {shiftableLoads.map((l) => (
          <button key={l.id} onClick={() => onPick(l.id)} className="flex w-full items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-left transition hover:bg-white/[0.04]">
            <CHK on={pick.has(l.id)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-white/85">{l.name}</p>
              <p className="text-[10px] text-white/40">{L(l.why)}</p>
            </div>
            <span className="w-14 shrink-0 text-right tabular text-[11px] text-white/60">{l.kw} kW</span>
            <span className="w-20 shrink-0 text-right tabular text-[12px] font-semibold text-emerald-300">{formatTHB(l.save)}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-2 text-[12px] text-emerald-200">
        <span>{L({ en: "Shift", th: "เลื่อน" })} <b>{sel.length}</b> {L({ en: "loads", th: "โหลด" })} · <b className="tabular">{Math.round(selKw)} kW</b></span>
        <span className="font-semibold tabular">~{formatTHB(saveMo)}/{L({ en: "mo saved", th: "เดือน" })}</span>
      </div>
    </div>
  );
}

/** Outlook-style compose window — a Request-for-Quotation email to SpareX with the
 *  project's BOM pre-filled and the signed-in user's signature. Send is simulated.
 *  (Recipient inquiry@sparexth.com · Cc the requester · attachment = the BOM.) */
function QuoteEmailModal({ project, L, onClose, onSent }: { project: (typeof capitalProjects)[number]; L: (o: LZ) => string; onClose: () => void; onSent: () => void }) {
  const title = L(project.title);
  const bom = project.parts.map((p, i) => `${i + 1}. ${L(p.name)} · ${p.brand} · ${p.partNo} · ${p.spec} · ${p.qty} ${L(p.unit)} · ${formatTHB(p.qty * p.unitPrice)}`).join("\n");
  const sig = L({
    en: `—\n${currentUser.name}\n${currentUser.title} · ${currentUser.plant}\n${currentUser.company}\n${currentUser.email} · ${currentUser.phone}`,
    th: `—\n${currentUser.name}\n${currentUser.titleTh} · ${currentUser.plant}\n${currentUser.company}\n${currentUser.email} · ${currentUser.phone}`,
  });
  const [subject, setSubject] = useState(L({ en: `Request for Quotation · ${title}`, th: `ขอใบเสนอราคา · ${title}` }));
  const [body, setBody] = useState(L({
    en: `Dear SpareX Sales team,\n\nWe would like to request a formal quotation for the following energy-improvement project:\n\nProject: ${title}\nLocation: ${L(project.asset)}\nEstimated budget: ${formatTHB(project.capex)}\nReturn: saves ${formatTHB(project.savingYr)}/yr · payback ${project.paybackMo} months\n\nBill of materials:\n${bom}\n\nPlease include unit prices, lead time, warranty and installation. Equivalent brands are welcome if specs are met.\n\nThank you,\n\n${sig}`,
    th: `เรียน ทีมขาย SpareX,\n\nทางเราขอใบเสนอราคาอย่างเป็นทางการสำหรับโครงการปรับปรุงพลังงานดังนี้:\n\nโครงการ: ${title}\nจุดติดตั้ง: ${L(project.asset)}\nงบประมาณโดยประมาณ: ${formatTHB(project.capex)}\nผลตอบแทน: ประหยัด ${formatTHB(project.savingYr)}/ปี · คืนทุน ${project.paybackMo} เดือน\n\nรายการอะไหล่ (BOM):\n${bom}\n\nรบกวนเสนอราคาต่อหน่วย ระยะเวลาส่งมอบ การรับประกัน และค่าติดตั้ง (เสนอรุ่นเทียบเท่าได้หากสเปคตรง)\n\nขอบคุณครับ/ค่ะ\n\n${sig}`,
  }));
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = () => {
    setSending(true);
    setTimeout(() => { setSending(false); setSent("SPX-Q-" + Date.now().toString(36).slice(-6).toUpperCase()); onSent(); }, 900);
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white text-slate-800 shadow-2xl">
        {/* title bar */}
        <div className="flex items-center justify-between bg-[#0f6cbd] px-4 py-2.5 text-white">
          <span className="flex items-center gap-2 text-[13px] font-semibold"><Send size={14} /> {L({ en: "New message · Request for Quotation", th: "ข้อความใหม่ · ขอใบเสนอราคา" })}</span>
          <button onClick={onClose} className="grid h-6 w-6 place-items-center rounded transition hover:bg-white/20"><X size={15} /></button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check size={28} /></span>
            <p className="text-[15px] font-semibold text-slate-800">{L({ en: "Quotation request sent", th: "ส่งคำขอใบเสนอราคาแล้ว" })}</p>
            <p className="text-[12.5px] text-slate-500">{L({ en: "Sent to", th: "ส่งถึง" })} <b className="text-slate-700">{SPAREX_SALES_EMAIL}</b><br />{L({ en: "Ref", th: "เลขอ้างอิง" })}: <b className="font-mono text-slate-700">{sent}</b></p>
            <p className="max-w-sm text-[12px] text-slate-400">{L({ en: "The SpareX sales team will reply within 1 business day.", th: "ทีมขาย SpareX จะติดต่อกลับภายใน 1 วันทำการ" })}</p>
            <button onClick={onClose} className="mt-2 rounded-lg bg-[#0f6cbd] px-5 py-2 text-[13px] font-medium text-white transition hover:bg-[#0c5aa0]">{L({ en: "Close", th: "ปิด" })}</button>
          </div>
        ) : (
          <>
            {/* send toolbar */}
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2">
              <button onClick={send} disabled={sending} className="flex items-center gap-1.5 rounded bg-[#0f6cbd] px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#0c5aa0] disabled:opacity-60"><Send size={13} /> {sending ? L({ en: "Sending…", th: "กำลังส่ง…" }) : L({ en: "Send", th: "ส่ง" })}</button>
              <span className="grid h-8 w-8 place-items-center rounded text-slate-400"><Paperclip size={15} /></span>
            </div>
            {/* fields */}
            <div className="border-b border-slate-100 px-4 py-2 text-[13px]">
              <div className="flex items-center gap-2 border-b border-slate-100 py-1.5"><span className="w-14 shrink-0 text-slate-400">{L({ en: "To", th: "ถึง" })}</span><span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[12px] font-medium text-[#0f6cbd]">SpareX Sales &lt;{SPAREX_SALES_EMAIL}&gt;</span></div>
              <div className="flex items-center gap-2 py-1.5"><span className="w-14 shrink-0 text-slate-400">{L({ en: "Subject", th: "เรื่อง" })}</span><input value={subject} onChange={(e) => setSubject(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-slate-800 outline-none" /></div>
            </div>
            {/* attachment */}
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
              <span className="flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11.5px] text-slate-600"><Paperclip size={12} /> BOM-{project.id}.pdf <span className="text-slate-400">· {(project.parts.length * 12 + 40)} KB</span></span>
            </div>
            {/* body */}
            <textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[240px] flex-1 resize-none px-4 py-3 text-[12.5px] leading-relaxed text-slate-700 outline-none" spellCheck={false} />
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

const CP_SEV: Record<"critical" | "warning" | "recommend", { label: LZ; cls: string }> = {
  critical: { label: { en: "Critical", th: "วิกฤต" }, cls: "border-rose-400/40 bg-rose-500/12 text-rose-300" },
  warning: { label: { en: "Warning", th: "เตือน" }, cls: "border-amber-400/40 bg-amber-500/12 text-amber-300" },
  recommend: { label: { en: "Recommend", th: "แนะนำ" }, cls: "border-emerald-400/40 bg-emerald-500/12 text-emerald-300" },
};

function ActionStep({ L }: { L: (o: LZ) => string }) {
  const [lit, setLit] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLit(true), 90); return () => clearTimeout(t); }, []);
  const [openId, setOpenId] = useState<string | null>(capitalProjects[0]?.id ?? null);
  const [doneQw, setDoneQw] = useState<Set<string>>(new Set());
  const [poDone, setPoDone] = useState<Set<string>>(new Set());
  const [quoteFor, setQuoteFor] = useState<(typeof capitalProjects)[number] | null>(null);
  const [focus, setFocus] = useState<"all" | "quick" | "capex">("all");
  const [capSev, setCapSev] = useState<"all" | "critical" | "warning" | "recommend">("all");
  const [qwFilter, setQwFilter] = useState<"all" | "pending" | "done">("all");
  const [qwSel, setQwSel] = useState<string | null>("qw-peak");
  const [qwAuto, setQwAuto] = useAiAutoQw("energy", { "qw-peak": true, "qw-idle": true, "qw-stagger": true, "qw-shift": true });
  const [stagInterval, setStagInterval] = useState(3);
  const [stagOrder, setStagOrder] = useState<string[]>(startupLoads.map((m) => m.id));
  const moveStag = (idx: number, dir: -1 | 1) => setStagOrder((o) => { const n = [...o]; const j = idx + dir; if (j < 0 || j >= n.length) return o; [n[idx], n[j]] = [n[j], n[idx]]; return n; });
  const [qwPick, setQwPick] = useState<Record<string, Set<string>>>(() => ({
    "qw-peak": new Set(peakSheddable.filter((p) => p.equipReady).map((p) => p.id)),
    "qw-idle": new Set(idleMachinesCtl.filter((m) => m.idleFor >= 15).map((m) => m.id)),
    "qw-stagger": new Set(),
    "qw-shift": new Set(shiftableLoads.filter((l) => l.recommended).map((l) => l.id)),
  }));
  const togglePick = (qwId: string, itemId: string) => setQwPick((p) => { const n = new Set(p[qwId]); if (n.has(itemId)) n.delete(itemId); else n.add(itemId); return { ...p, [qwId]: n }; });
  const orders = useWorkOrders();

  const noCapex = quickWins.reduce((s, q) => s + q.savingYr, 0);
  const capexSaving = capitalProjects.reduce((s, c) => s + c.savingYr, 0);
  const capexTotal = capitalProjects.reduce((s, c) => s + c.capex, 0);
  const grand = noCapex + capexSaving;
  const blended = Math.round((capexTotal / capexSaving) * 12);
  const ncPct = Math.round((noCapex / grand) * 100);
  const [quoteSent, setQuoteSent] = useState<Set<string>>(new Set());
  const woFor = (id: string) => orders.find((w) => w.findingId === id);
  const hasWO = (id: string) => poDone.has(id) || !!woFor(id);
  // capital project → single Work Order for installation & commissioning (raised on budget approval)
  const raisePO = (c: (typeof capitalProjects)[number]) => {
    createWorkOrder({ id: c.id, code: c.id.toUpperCase(), title: { en: `Install & commission · ${L(c.title)}`, th: `ติดตั้ง & Commissioning · ${L(c.title)}` }, asset: c.asset, severity: c.severity === "recommend" ? "advisory" : c.severity, capex: c.capex, annualSaving: c.savingYr, partsCount: c.parts.length }, "energy");
    setPoDone((s) => new Set(s).add(c.id));
  };
  // quick win → one-time setup/enable Work Order (config task, no parts → goes straight to "scheduled")
  const commitQuickWin = (q: (typeof quickWins)[number]) => {
    const auto = qwAuto[q.id];
    createWorkOrder({ id: q.id, code: q.id.toUpperCase(), title: { en: `${auto ? "Set up & enable AI-auto" : "Configure"} · ${L(q.title)}`, th: `${auto ? "ตั้งค่า & เปิด AI-auto" : "ตั้งค่า"} · ${L(q.title)}` }, asset: q.asset, severity: "advisory", capex: 0, annualSaving: q.savingYr, partsCount: 0 }, "energy");
    setDoneQw((s) => new Set(s).add(q.id));
  };

  return (
    <div className="space-y-6">
      {/* Executive summary — the ฿ decision in one glance */}
      <section className="panel p-5" style={{ background: "linear-gradient(180deg, rgba(52,211,153,0.06), transparent 82%)" }}>
        <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
          <Icon3D icon={Sparkles} color="#34d399" size={28} rounded={9} /> {L({ en: "Action plan · recoverable this year", th: "แผนลงมือ · กู้คืนได้ปีนี้" })}
        </div>
        <p className="mt-3 tabular text-4xl font-bold text-white">{formatTHB(grand)}<span className="ml-2 text-sm font-normal text-white/45">/{L({ en: "yr", th: "ปี" })}</span></p>
        <div className="mt-3 max-w-lg">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-white/8">
            <div style={{ width: lit ? `${ncPct}%` : "0%", background: "linear-gradient(90deg,#34d399,#059669)", transition: "width 1000ms ease" }} />
            <div style={{ width: lit ? `${100 - ncPct}%` : "0%", background: "linear-gradient(90deg,#818cf8,#4f46e5)", transition: "width 1000ms ease" }} />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setFocus((f) => (f === "quick" ? "all" : "quick"))}
            className={cn("flex items-center gap-3 rounded-xl border p-3.5 text-left transition", focus === "quick" ? "border-emerald-400/60 bg-emerald-400/[0.11] ring-1 ring-emerald-400/40" : "border-emerald-400/25 bg-emerald-400/[0.06] hover:bg-emerald-400/[0.09]")}
          >
            <Icon3D icon={Zap} color="#34d399" size={34} rounded={10} />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">{L({ en: "No investment · do it now", th: "ไม่ต้องลงทุน · ทำได้เลย" })}</p>
              <p className="tabular text-xl font-bold text-emerald-200">{formatTHB(noCapex)}<span className="text-[11px] font-normal text-white/45">/{L({ en: "yr", th: "ปี" })}</span></p>
              <p className="text-[10.5px] text-white/45">{quickWins.length} {L({ en: "actions · ฿0 capex", th: "รายการ · ลงทุน ฿0" })}</p>
            </div>
            <span className="ml-auto flex shrink-0 items-center gap-1 self-center text-[10px] font-medium text-emerald-300">
              {focus === "quick" ? <><Check size={12} /> {L({ en: "showing", th: "กำลังดู" })}</> : <>{L({ en: "see actions", th: "ดูสิ่งที่ต้องทำ" })} <ArrowRight size={12} /></>}
            </span>
          </button>
          <button
            onClick={() => setFocus((f) => (f === "capex" ? "all" : "capex"))}
            className={cn("flex items-center gap-3 rounded-xl border p-3.5 text-left transition", focus === "capex" ? "border-indigo-400/60 bg-indigo-400/[0.11] ring-1 ring-indigo-400/40" : "border-indigo-400/25 bg-indigo-400/[0.06] hover:bg-indigo-400/[0.09]")}
          >
            <Icon3D icon={Wallet} color="#818cf8" size={34} rounded={10} />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300">{L({ en: "With investment", th: "ต้องลงทุน" })}</p>
              <p className="tabular text-xl font-bold text-indigo-200">+{formatTHB(capexSaving)}<span className="text-[11px] font-normal text-white/45">/{L({ en: "yr", th: "ปี" })}</span></p>
              <p className="text-[10.5px] text-white/45">{L({ en: "budget", th: "งบ" })} {formatTHB(capexTotal)} · {L({ en: "payback", th: "คืนทุน" })} {blended} {L({ en: "mo", th: "เดือน" })}</p>
            </div>
            <span className="ml-auto flex shrink-0 items-center gap-1 self-center text-[10px] font-medium text-indigo-300">
              {focus === "capex" ? <><Check size={12} /> {L({ en: "showing", th: "กำลังดู" })}</> : <>{L({ en: "see actions", th: "ดูสิ่งที่ต้องทำ" })} <ArrowRight size={12} /></>}
            </span>
          </button>
        </div>
        {focus !== "all" ? (
          <button onClick={() => setFocus("all")} className="mt-2 text-[11px] text-white/45 underline-offset-2 transition hover:text-white/70 hover:underline">{L({ en: "← Show both parts", th: "← ดูทั้งสองส่วน" })}</button>
        ) : null}
      </section>

      {/* Part 1 · Quick wins (no capex) */}
      {focus !== "capex" ? (
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <Icon3D icon={Rocket} color="#34d399" size={30} rounded={9} />
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-white">{L({ en: "1 · Quick wins — no investment", th: "1 · ทำได้เลย — ไม่ต้องลงทุน" })}</h3>
            <p className="text-[11px] text-white/45">{L({ en: "Approve on the spot · the AI can run these automatically", th: "อนุมัติได้ทันที · AI สั่งทำเองได้" })}</p>
          </div>
          {/* status filter */}
          <div className="ml-auto flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
            {([
              ["all", { en: "All", th: "ทั้งหมด" }, null],
              ["pending", { en: "To do", th: "รอทำ" }, "#818cf8"],
              ["done", { en: "Scheduled", th: "จัดแล้ว" }, "#34d399"],
            ] as ["all" | "pending" | "done", LZ, string | null][]).map(([id, lab, dot]) => {
              const n = id === "all" ? quickWins.length : quickWins.filter((q) => (doneQw.has(q.id) || hasWO(q.id)) === (id === "done")).length;
              const sel = qwFilter === id;
              return (
                <button key={id} onClick={() => setQwFilter(id)} className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium transition", sel ? "bg-white/10 text-white/90" : "text-white/45 hover:text-white/70")}>
                  {dot ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} /> : null}
                  {L(lab)} <span className="tabular text-white/40">{n}</span>
                </button>
              );
            })}
          </div>
          <span className="chip text-emerald-300">{formatTHB(noCapex)}/{L({ en: "yr", th: "ปี" })} · ฿0</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickWins.filter((q) => qwFilter === "all" || (doneQw.has(q.id) || hasWO(q.id)) === (qwFilter === "done")).map((q) => {
            const on = qwSel === q.id;
            const done = doneQw.has(q.id) || hasWO(q.id);
            return (
              <div key={q.id} onClick={() => setQwSel(on ? null : q.id)} className={cn("flex cursor-pointer flex-col rounded-2xl border p-4 transition", on ? "border-emerald-400/50 bg-emerald-400/[0.07] ring-1 ring-emerald-400/30" : done ? "border-emerald-400/20 bg-emerald-400/[0.03]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]")}>
                <p className="text-[13px] font-medium leading-snug text-white">{L(q.title)}</p>
                <p className="mt-1 text-[10.5px] text-white/40">{L(q.asset)}</p>
                <p className="mt-2 flex-1 text-[11px] leading-relaxed text-white/55">{L(q.how)}</p>
                <div className="mt-2.5">
                  <p className="tabular text-lg font-bold text-emerald-300">{formatTHB(q.savingYr)}</p>
                  <p className="text-[9.5px] text-white/35">/{L({ en: "yr", th: "ปี" })} · {L(q.effort)}</p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-2.5">
                  <span className="flex items-center gap-1.5 text-[10.5px] text-white/55"><Bot size={12} style={{ color: qwAuto[q.id] ? "#818cf8" : "rgba(255,255,255,0.4)" }} /> AI Auto</span>
                  <span onClick={(e) => { e.stopPropagation(); setQwAuto((a) => ({ ...a, [q.id]: !a[q.id] })); }}><Toggle on={qwAuto[q.id]} onChange={() => {}} /></span>
                </div>
                <span className="mt-2 flex items-center justify-center gap-1 text-[10.5px] font-medium text-emerald-300">{on ? L({ en: "Hide detail", th: "ซ่อนรายละเอียด" }) : L({ en: "How to manage", th: "ดูวิธีจัดการ" })} <ChevronDown size={12} className={cn("transition-transform", on && "rotate-180")} /></span>
              </div>
            );
          })}
        </div>
        <AnimatePresence initial={false}>
          {qwSel ? (() => {
            const q = quickWins.find((x) => x.id === qwSel)!;
            const qwo = woFor(q.id);
            const done = doneQw.has(q.id) || !!qwo;
            return (
              <motion.div key={qwSel} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: "hidden" }}>
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <Icon3D icon={Rocket} color="#34d399" size={26} rounded={8} />
                    <p className="text-[13.5px] font-semibold text-white">{L(q.title)}</p>
                    <span className="ml-auto flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
                      <span className="flex items-center gap-1.5 text-[11px] text-white/60"><Bot size={12} style={{ color: qwAuto[q.id] ? "#818cf8" : "rgba(255,255,255,0.4)" }} /> AI Auto</span>
                      <Toggle on={qwAuto[q.id]} onChange={() => setQwAuto((a) => ({ ...a, [q.id]: !a[q.id] }))} />
                    </span>
                  </div>
                  {qwAuto[q.id] ? (
                    <p className="mb-3 flex items-center gap-1.5 rounded-lg border border-indigo-400/25 bg-indigo-400/[0.06] px-2.5 py-1.5 text-[11px] text-indigo-200"><Bot size={12} className="shrink-0" /> {L({ en: "AI is managing this automatically under guardrails — its picks are ticked; override anytime.", th: "AI จัดการให้อัตโนมัติภายใต้ guardrail — ติ๊กที่ AI เลือกไว้แล้ว ปรับเองได้ทุกเมื่อ" })}</p>
                  ) : null}
                  <QuickWinDetail id={q.id} L={L} auto={qwAuto[q.id]} pick={qwPick[q.id]} onPick={(itemId) => togglePick(q.id, itemId)} interval={stagInterval} setInterval={setStagInterval} stagOrder={stagOrder} moveStag={moveStag} />
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[10.5px] text-white/40">
                      {done && qwAuto[q.id] ? <span className="flex items-center gap-1 text-indigo-300"><Bot size={12} /> {L({ en: "AI is running this automatically", th: "AI กำลังรันอัตโนมัติ" })}</span> : null}
                    </span>
                    {done ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[12px] font-medium text-emerald-300"><Check size={13} /> {L({ en: "Work Order raised", th: "สร้าง WO แล้ว" })}{qwo ? ` · ${qwo.id}` : ""}</span>
                    ) : (
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => commitQuickWin(q)} className="btn-glow px-4 py-2 text-[12px]">{qwAuto[q.id] ? <><Bot size={13} /> {L({ en: "Enable · AI runs it", th: "เปิดใช้งาน · ให้ AI รัน" })}</> : <><Check size={13} /> {L({ en: "Confirm & schedule", th: "ยืนยัน & จัดตาราง" })}</>}</motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })() : null}
        </AnimatePresence>
      </div>

      ) : null}

      {/* Part 2 · Capital projects (capex + BOM) */}
      {focus !== "quick" ? (
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <Icon3D icon={Wrench} color="#818cf8" size={30} rounded={9} />
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-white">{L({ en: "2 · Capital projects — with spec & part numbers", th: "2 · ต้องลงทุน — พร้อมสเปค & Part Number" })}</h3>
            <p className="text-[11px] text-white/45">{L({ en: "Expand for the full BOM an engineer can order", th: "กางดู BOM ที่วิศวกรสั่งซื้อได้ทันที" })}</p>
          </div>
          {/* severity filter */}
          <div className="ml-auto flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
            {([
              ["all", { en: "All", th: "ทั้งหมด" }, null],
              ["critical", CP_SEV.critical.label, "#f43f5e"],
              ["warning", CP_SEV.warning.label, "#f59e0b"],
              ["recommend", CP_SEV.recommend.label, "#34d399"],
            ] as ["all" | "critical" | "warning" | "recommend", LZ, string | null][]).map(([id, lab, dot]) => {
              const n = id === "all" ? capitalProjects.length : capitalProjects.filter((c) => c.severity === id).length;
              const sel = capSev === id;
              return (
                <button key={id} onClick={() => setCapSev(id)} className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium transition", sel ? "bg-white/10 text-white/90" : "text-white/45 hover:text-white/70")}>
                  {dot ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} /> : null}
                  {L(lab)} <span className="tabular text-white/40">{n}</span>
                </button>
              );
            })}
          </div>
          <span className="chip text-indigo-300">+{formatTHB(capexSaving)}/{L({ en: "yr", th: "ปี" })} · {L({ en: "budget", th: "งบ" })} {formatTHB(capexTotal)}</span>
        </div>
        <div className="space-y-3">
          {capitalProjects.filter((c) => capSev === "all" || c.severity === capSev).map((c) => {
            const open = openId === c.id;
            const partsSum = c.parts.reduce((s, p) => s + p.qty * p.unitPrice, 0);
            const install = c.capex - partsSum;
            const done = hasWO(c.id);
            return (
              <div key={c.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                <button onClick={() => setOpenId(open ? null : c.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left transition hover:bg-white/[0.02]">
                  <div className="min-w-[160px] flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide", CP_SEV[c.severity].cls)}>{L(CP_SEV[c.severity].label)}</span>
                      <p className="text-[13.5px] font-medium text-white">{L(c.title)}</p>
                    </div>
                    <p className="mt-0.5 text-[10.5px] text-white/40">{L(c.asset)} · {c.parts.length} {L({ en: "parts", th: "รายการอะไหล่" })}</p>
                  </div>
                  <div className="text-right"><p className="tabular text-[13px] font-bold text-emerald-300">+{formatTHB(c.savingYr)}</p><p className="text-[9px] uppercase text-white/35">/{L({ en: "yr saving", th: "ปี ประหยัด" })}</p></div>
                  <div className="text-right"><p className="tabular text-[13px] font-bold text-amber-300">{formatTHB(c.capex)}</p><p className="text-[9px] uppercase text-white/35">{L({ en: "budget", th: "งบ" })}</p></div>
                  <span className="rounded-lg bg-white/[0.06] px-2 py-1 text-center text-[11px] tabular text-white/70">{c.paybackMo}{L({ en: "mo", th: "ด" })} · ROI {c.roi}%</span>
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.06]"><ChevronDown size={15} className={cn("text-white/60 transition-transform", open && "rotate-180")} /></span>
                </button>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div key="bom" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: "hidden" }}>
                      <div className="border-t border-white/8 px-4 pb-4 pt-3">
                        {/* why + evidence — the diagnosis that justifies the spend */}
                        <div className="mb-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3">
                          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300"><AlertTriangle size={12} /> {L({ en: "Why this is needed", th: "ทำไมต้องทำ" })}</div>
                          <p className="text-[12px] leading-relaxed text-white/75">{L(c.why)}</p>
                          <div className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-white/45">
                            <Gauge size={12} className="mt-0.5 shrink-0" />
                            <span><span className="font-medium text-white/55">{L({ en: "Evidence", th: "หลักฐานที่เจอ" })}</span> · {c.evidence.map((e) => L(e)).join(" · ")} <span className="text-white/30">· {L({ en: "from power meter + PLC", th: "จาก power meter + PLC" })}</span></span>
                          </div>
                        </div>
                        {/* expected result if the project is done */}
                        <div className="mb-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3">
                          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300"><TrendingUp size={12} /> {L({ en: "If you do it — the result", th: "ถ้าทำ — ผลลัพธ์" })}</div>
                          <ul className="space-y-1">
                            {c.outcome.map((o, oi) => (
                              <li key={oi} className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-white/75"><ArrowRight size={11} className="mt-0.5 shrink-0 text-emerald-400" /> {L(o)}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300"><Package size={12} /> {L({ en: "Bill of materials", th: "รายการอะไหล่ (BOM)" })}</div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[560px] text-left text-[11.5px]">
                            <thead><tr className="border-b border-white/10 text-[9.5px] uppercase tracking-wide text-white/40">
                              <th className="py-1.5 pr-2 font-medium">{L({ en: "Part", th: "อะไหล่" })}</th>
                              <th className="px-2 py-1.5 font-medium">{L({ en: "Brand", th: "แบรนด์" })}</th>
                              <th className="px-2 py-1.5 font-medium">{L({ en: "Part No.", th: "Part No." })}</th>
                              <th className="px-2 py-1.5 font-medium">{L({ en: "Spec", th: "สเปค" })}</th>
                              <th className="px-2 py-1.5 text-center font-medium">{L({ en: "Qty", th: "จำนวน" })}</th>
                              <th className="px-2 py-1.5 text-right font-medium">{L({ en: "Total", th: "รวม" })}</th>
                            </tr></thead>
                            <tbody className="tabular">
                              {c.parts.map((p, i) => (
                                <tr key={i} className="border-b border-white/5">
                                  <td className="py-2 pr-2 font-medium text-white/85">{L(p.name)}</td>
                                  <td className="px-2 py-2 text-white/60">{p.brand}</td>
                                  <td className="whitespace-nowrap px-2 py-2 font-mono text-[10.5px] text-brand-200">{p.partNo}</td>
                                  <td className="px-2 py-2 text-[10.5px] text-white/45">{p.spec}</td>
                                  <td className="px-2 py-2 text-center text-white/60">{p.qty} {L(p.unit)}</td>
                                  <td className="px-2 py-2 text-right text-white/80">{formatTHB(p.qty * p.unitPrice)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="tabular text-[11px]">
                              <tr><td colSpan={5} className="py-1.5 pr-2 text-right text-white/45">{L({ en: "Parts subtotal", th: "รวมค่าอะไหล่" })}</td><td className="px-2 py-1.5 text-right text-white/70">{formatTHB(partsSum)}</td></tr>
                              {install > 0 ? <tr><td colSpan={5} className="py-1.5 pr-2 text-right text-white/45">{L({ en: "Install & commissioning", th: "ติดตั้ง & คอมมิชชัน" })}</td><td className="px-2 py-1.5 text-right text-white/70">{formatTHB(install)}</td></tr> : null}
                              <tr><td colSpan={5} className="py-1.5 pr-2 text-right text-[12px] font-semibold text-white/70">{L({ en: "Total budget", th: "งบรวม" })}</td><td className="px-2 py-1.5 text-right text-[12px] font-bold text-amber-300">{formatTHB(c.capex)}</td></tr>
                            </tfoot>
                          </table>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span className="chip text-white/50"><Wrench size={11} /> {L({ en: "downtime", th: "หยุดเครื่อง" })} {L(c.downtime)}</span>
                          <div className="ml-auto flex items-center gap-2">
                            {/* quote → SpareX — always available (procurement runs alongside the WO) */}
                            {quoteSent.has(c.id) ? (
                              <button onClick={() => setQuoteFor(c)} className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[12px] font-medium text-amber-200 transition hover:bg-amber-400/15"><Check size={13} /> {L({ en: "RFQ sent · awaiting quote", th: "ส่งขอราคาแล้ว · รอใบเสนอราคา" })}</button>
                            ) : (
                              <button onClick={() => setQuoteFor(c)} className="inline-flex items-center gap-1 rounded-lg border border-brand-400/30 bg-brand-400/10 px-2.5 py-1.5 text-[12px] font-medium text-brand-200 transition hover:bg-brand-400/20"><FileText size={13} /> {L({ en: "Request quote → SpareX", th: "ขอใบเสนอราคา → SpareX" })}</button>
                            )}
                            {/* approve budget → install WO */}
                            {done ? (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-[12px] font-medium text-emerald-300"><Check size={13} /> {L({ en: "Install WO raised", th: "สร้าง WO ติดตั้งแล้ว" })}{woFor(c.id) ? ` · ${woFor(c.id)!.id}` : ""}</span>
                            ) : (
                              <motion.button whileTap={{ scale: 0.97 }} onClick={() => raisePO(c)} className="btn-glow px-3 py-1.5 text-[12px]"><Plus size={13} /> {L({ en: "Approve → install WO", th: "อนุมัติงบ → WO ติดตั้ง" })}</motion.button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
      ) : null}
      {quoteFor ? <QuoteEmailModal project={quoteFor} L={L} onClose={() => setQuoteFor(null)} onSent={() => setQuoteSent((s) => new Set(s).add(quoteFor.id))} /> : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── 05 report ── */

/** live post-fix monitoring — the metric eased from before → after, then held with live
 *  jitter around the reading; dashed baseline (before) + dotted target line for context. */
function MVLiveTrend({ b, good }: { b: MVBaseline; good: boolean }) {
  const [pts, setPts] = useState<number[]>([]);
  useEffect(() => {
    const N = 26;
    const seed: number[] = [];
    for (let i = 0; i < N; i++) { const t = i / (N - 1); seed.push(t < 0.55 ? b.before + (b.after - b.before) * (t / 0.55) : b.after); }
    setPts(seed);
    const id = setInterval(() => setPts((p) => [...p.slice(1), b.after + (Math.random() - 0.5) * Math.max(0.02, Math.abs(b.after) * 0.05)]), 1500);
    return () => clearInterval(id);
  }, [b]);
  if (!pts.length) return null;
  const lo = Math.min(b.after, b.before, b.target) * 0.96, hi = Math.max(b.after, b.before, b.target) * 1.04;
  const W = 320, H = 52;
  const x = (i: number) => (i / (pts.length - 1)) * W;
  const y = (v: number) => H - ((v - lo) / (hi - lo || 1)) * H;
  const path = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const col = good ? "#34d399" : "#f59e0b";
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none">
      <line x1="0" y1={y(b.before).toFixed(1)} x2={W} y2={y(b.before).toFixed(1)} stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="0" y1={y(b.target).toFixed(1)} x2={W} y2={y(b.target).toFixed(1)} stroke={col} strokeWidth="1" strokeDasharray="2 3" opacity="0.55" />
      <path d={path} fill="none" stroke={col} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={x(pts.length - 1).toFixed(1)} cy={y(last).toFixed(1)} r="3" fill={col} />
    </svg>
  );
}

function ReportStep({ L, locale }: { L: (o: LZ) => string; locale: string }) {
  const orders = useWorkOrders();
  const verifiedWOs = orders.filter((w) => w.source === "energy" && w.status === "verified");
  const verifiedSaving = verifiedWOs.reduce((s, w) => s + w.annualSaving, 0);
  const baseOf = (id?: string) => (id ? mvBaselines.find((b) => b.id === id) : undefined);
  return (
    <div className="space-y-6">
      {/* loop closed — verified WOs report back from the Work Order Center */}
      {verifiedWOs.length ? (
        <section className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] px-4 py-3">
          <Icon3D icon={Check} color="#34d399" size={30} rounded={9} />
          <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-emerald-100">
            <b className="tabular">{verifiedWOs.length}</b> {L({ en: "work orders verified from the Work Order Center", th: "งานยืนยันผลแล้วจาก Work Order Center" })} — {L({ en: "real saving", th: "ประหยัดจริงรวม" })} <b className="tabular">{formatTHB(verifiedSaving)}/{L({ en: "yr", th: "ปี" })}</b> · {L({ en: "the machines are now monitored before vs after", th: "เครื่องเข้าสู่การเฝ้าดูเทียบก่อน/หลัง" })}
          </p>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat label={L({ en: "Energy · MTD", th: "พลังงาน · เดือนนี้" })} value="320" unit="MWh" accent="#22d3ee" />
        <MiniStat label={L({ en: "Cost · MTD", th: "ค่าไฟ · เดือนนี้" })} value={formatTHB(1150000)} accent="#f59e0b" />
        <MiniStat label={L({ en: "Verified savings", th: "ประหยัดที่ยืนยันแล้ว" })} value={formatTHB(verifiedSaving)} unit={`/${L({ en: "yr", th: "ปี" })}`} accent="#34d399" />
        <MiniStat label={L({ en: "Carbon · MTD", th: "คาร์บอน · เดือนนี้" })} value="146" unit="tCO₂e" accent="#4ade80" />
      </section>

      <Panel title={L({ en: "M&V — Post-fix verification", th: "M&V — พิสูจน์ผลหลังแก้" })} sub={L({ en: "Verified work orders, monitored before vs after", th: "งานที่ยืนยันผล เฝ้าดูเทียบก่อน/หลัง" })} icon={Target} color="#34d399" right={<span className="chip text-emerald-300">IPMVP</span>}>
        {verifiedWOs.length ? (
          <div className="space-y-2.5">
            {verifiedWOs.map((w) => {
              const b = baseOf(w.findingId);
              const imp = b ? (b.betterLower ? (b.before - b.after) / b.before : (b.after - b.before) / b.before) * 100 : 0;
              const good = b ? mvMetTarget(b) : imp > 0;
              return (
                <div key={w.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white">{L(w.title)} <span className="tabular text-[10px] font-normal text-white/35">· {w.id}</span></p>
                      <p className="mt-0.5 text-[10.5px] text-white/40">{b ? L(b.machine) : L(w.asset)} · {L({ en: "monitored", th: "เฝ้าดู" })} {b?.monitorDays ?? 30} {L({ en: "days post-fix", th: "วันหลังแก้" })}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300"><Check size={11} /> {L({ en: "Verified", th: "ยืนยันแล้ว" })}</span>
                  </div>
                  {b ? (
                    <>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div className="min-w-0">
                          <p className="text-[9px] uppercase tracking-wider text-white/35">{L(b.metric)}</p>
                          <div className="mt-0.5 flex items-center gap-2 tabular">
                            <span className="text-[10px] uppercase text-white/35">{L({ en: "before", th: "ก่อน" })}</span>
                            <span className="text-[14px] text-white/45 line-through">{b.before}{b.unit}</span>
                            <ArrowRight size={13} className="text-emerald-400" />
                            <span className={cn("text-[10px] uppercase", good ? "text-emerald-300/70" : "text-amber-300/70")}>{L({ en: "after", th: "หลัง" })}</span>
                            <span className={cn("text-[18px] font-bold", good ? "text-emerald-300" : "text-amber-300")}>{b.after}{b.unit}</span>
                            <span className="text-[10px] text-white/30">· {L({ en: "target", th: "เป้า" })} {b.target}{b.unit}</span>
                          </div>
                        </div>
                        <span className={cn("rounded-md px-2 py-1 text-[12px] font-semibold", good ? "bg-emerald-500/12 text-emerald-300" : "bg-amber-500/12 text-amber-300")}>{b.betterLower ? "↓" : "↑"}{Math.abs(Math.round(imp))}% · {good ? L({ en: "on target", th: "ถึงเป้า" }) : L({ en: "below target", th: "ไม่ถึงเป้า" })}</span>
                        <div className="ml-auto text-right">
                          <p className="text-[9px] uppercase tracking-wider text-white/35">{L({ en: "verified saving", th: "ประหยัดจริง" })}</p>
                          <p className="tabular text-[15px] font-bold text-emerald-300">{formatTHB(w.annualSaving)}<span className="text-[9px] font-normal text-white/40">/{L({ en: "yr", th: "ปี" })}</span></p>
                        </div>
                      </div>
                      <div className="mt-2.5">
                        <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-wider text-white/30"><span>{L({ en: "live post-fix monitoring", th: "เฝ้าดูต่อเนื่องหลังแก้" })}</span><span className="normal-case">{L({ en: "— baseline · ·· target", th: "— ค่าฐาน · ·· เป้า" })}</span></div>
                        <MVLiveTrend b={b} good={good} />
                      </div>
                      <p className={cn("mt-2.5 flex items-start gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] leading-relaxed", good ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200" : "border-amber-400/20 bg-amber-400/[0.06] text-amber-200")}>
                        {good ? <><Check size={12} className="mt-0.5 shrink-0" /> {L({ en: "Post-fix meters confirm the improvement held — measure closed.", th: "มิเตอร์หลังแก้ยืนยันว่าดีขึ้นจริงและคงที่ — ปิดมาตรการ" })}</> : <><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {L({ en: "Below target — flagged back to AI Analysis for a re-check.", th: "ต่ำกว่าเป้า — ส่งกลับ AI Analysis ตรวจซ้ำ" })}</>}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-[11.5px] text-white/50">{L({ en: "Verified saving", th: "ประหยัดจริง" })} <b className="tabular text-emerald-300">{formatTHB(w.annualSaving)}/{L({ en: "yr", th: "ปี" })}</b> · {L({ en: "monitoring against baseline", th: "กำลังเฝ้าดูเทียบค่าฐาน" })}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid place-items-center gap-1.5 py-8 text-center">
            <Target size={22} className="text-white/25" />
            <p className="text-[12px] text-white/40">{L({ en: "No verified measures yet — verify a work order in the Work Order Center to start proving results here.", th: "ยังไม่มีมาตรการที่ยืนยันผล — ยืนยัน WO ใน Work Order Center เพื่อเริ่มพิสูจน์ผลที่นี่" })}</p>
          </div>
        )}
      </Panel>
      <section className="panel relative overflow-hidden p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-brand-400/30 bg-brand-400/10 text-brand-300"><FileText size={24} /></span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{L({ en: "Energy report", th: "รายงานพลังงาน" })}</h3>
            <p className="mt-1 text-sm text-white/60">{L({ en: "Every figure comes from the incomer & MDB power meters — traceable, no estimates.", th: "ทุกตัวเลขมาจากมิเตอร์จุดรับไฟ & MDB — ตรวจสอบได้ ไม่มีการประมาณ" })}</p>
          </div>
          <button className="btn-glow px-4 py-2.5 text-sm"><Download size={15} /> {L({ en: "Export report", th: "ดาวน์โหลดรายงาน" })}</button>
        </div>
        <AskCopilot prompt={locale === "th" ? "สรุปพลังงานเดือนนี้และสิ่งที่ควรทำก่อน" : "Summarize this month's energy and what to do first"} className="btn-ghost mt-4 w-full justify-center py-2 text-sm">{L({ en: "Ask AI to summarize the month", th: "ให้ AI สรุปเดือนนี้" })}</AskCopilot>
      </section>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── small parts ── */

const A_STYLE: Record<"active" | "pending" | "suggested", { cls: string; dot: string; label: LZ }> = {
  active: { cls: "border-status-ok/30 bg-status-ok/10 text-emerald-300", dot: "bg-status-ok", label: { en: "Running", th: "ทำงานอยู่" } },
  pending: { cls: "border-status-warn/30 bg-status-warn/10 text-amber-300", dot: "bg-status-warn", label: { en: "Pending approval", th: "รออนุมัติ" } },
  suggested: { cls: "border-white/15 bg-white/5 text-white/60", dot: "bg-white/40", label: { en: "Suggested", th: "แนะนำ" } },
};

function Panel({ title, sub, icon: Icon, right, children, color = "#22d3ee", py = "py-5" }: { title: string; sub?: string; icon: LucideIcon; right?: ReactNode; children: ReactNode; color?: string; py?: string }) {
  return (
    <section className={cn("panel px-5", py)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon3D icon={Icon} color={color} size={34} />
          <div className="min-w-0">
            <h2 className="truncate font-semibold leading-tight text-white">{title}</h2>
            {sub ? <p className="mt-0.5 truncate text-[11px] leading-tight text-white/40">{sub}</p> : null}
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function MiniStat({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent: string }) {
  return (
    <div className="panel p-4">
      <p className="text-[11px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tabular" style={{ color: accent }}>{value}{unit ? <span className="ml-1 text-xs font-normal text-white/45">{unit}</span> : null}</p>
    </div>
  );
}

