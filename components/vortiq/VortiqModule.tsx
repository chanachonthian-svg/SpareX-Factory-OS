"use client";

import { useEffect, useRef, useState, forwardRef, type ReactNode, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, BarChart3, Sparkles, Bot, FileText, Wind, Gauge, Droplets, Coins,
  TrendingUp, TrendingDown, AlertTriangle, Check, Plus, Play, Pause,
  Wrench, ArrowRight, CircleDot, Rocket, Wallet, Zap, Package, Send, Paperclip,
  X, ChevronDown, Printer, FileSpreadsheet, SlidersHorizontal, type LucideIcon,
} from "lucide-react";
import { currentUser, SPAREX_SALES_EMAIL } from "@/lib/user";
import { useI18n } from "@/lib/i18n";
import { WorkflowBar } from "@/components/os/WorkflowNav";
import { KpiCard } from "@/components/os/KpiCard";
import { Icon3D } from "@/components/os/Icon3D";
import { AreaTrend, HBars, MultiLine } from "@/components/os/charts";
import { createWorkOrder, useWorkOrders } from "@/lib/workorders";
import { cn, formatTHB } from "@/lib/utils";
import { AirSystem3D } from "@/components/vortiq/AirSystem3D";

type LZ = { en: string; th: string };
const AIR = "#38bdf8";

/* ─────────────────────────────────────────────────────────────── data ── */

/** System nameplate specific power — the target every compressor is benchmarked against. */
const NAMEPLATE_SPEC = 17.5; // kW/100cfm
const SETPOINT_BAR = 6.5; // demand actually needs 6.5 bar; the ring main runs 7.2

// 24-hour pressure & flow off the ring-main meters
const airTrend24h: { t: string; pressure: number; flow: number }[] = [
  { t: "06:00", pressure: 7.1, flow: 1180 }, { t: "08:00", pressure: 7.3, flow: 1290 },
  { t: "10:00", pressure: 7.2, flow: 1310 }, { t: "12:00", pressure: 7.4, flow: 1275 },
  { t: "14:00", pressure: 7.2, flow: 1240 }, { t: "16:00", pressure: 7.0, flow: 1260 },
  { t: "18:00", pressure: 7.3, flow: 1220 }, { t: "20:00", pressure: 7.2, flow: 1150 },
  { t: "22:00", pressure: 7.1, flow: 980 },
];

const compressors: { id: string; name: string; kw: number; type: "VSD" | "fixed"; status: "loaded" | "unloaded" | "off"; loadPct: number; specPower: number; note: LZ }[] = [
  { id: "C-01", name: "C-01", kw: 110, type: "VSD", status: "loaded", loadPct: 88, specPower: 18.2, note: { en: "modulating to demand", th: "ปรับตามดีมานด์" } },
  { id: "C-02", name: "C-02", kw: 90, type: "fixed", status: "loaded", loadPct: 100, specPower: 20.1, note: { en: "base load", th: "เดินฐาน" } },
  { id: "C-03", name: "C-03", kw: 75, type: "fixed", status: "unloaded", loadPct: 0, specPower: 0, note: { en: "short-cycling on standby", th: "สแตนด์บาย รอบสั้นถี่" } },
];

// ultrasonic leak survey — each tagged point, its flow and its yearly cost
const leaks: { location: LZ; cfm: number; thbYr: number }[] = [
  { location: { en: "Line B drop coupling", th: "ข้อต่อจุดจ่าย Line B" }, cfm: 42, thbYr: 180000 },
  { location: { en: "Dryer bypass valve", th: "วาล์วบายพาส Dryer" }, cfm: 28, thbYr: 120000 },
  { location: { en: "Ring-main flange J-12", th: "หน้าแปลนท่อวงแหวน J-12" }, cfm: 22, thbYr: 95000 },
  { location: { en: "Tool station 7 quick-connect", th: "ข้อต่อเร็ว จุดเครื่องมือ 7" }, cfm: 15, thbYr: 64000 },
  { location: { en: "FRL unit leak", th: "ลมรั่วชุด FRL" }, cfm: 11, thbYr: 47000 },
];
const LEAK_TOTAL_YR = leaks.reduce((s, l) => s + l.thbYr, 0); // ≈ ฿506K/yr

// every 0.5-bar the setpoint comes down saves energy across the whole system
const pressureBands: { band: string; saveYr: number }[] = [
  { band: "7.2 → 7.0 bar", saveYr: 95000 },
  { band: "7.0 → 6.8 bar", saveYr: 90000 },
  { band: "6.8 → 6.5 bar", saveYr: 135000 },
];

// where the money leaks out of a poorly-run air system
const poorAirCost: { name: LZ; thbYr: number }[] = [
  { name: { en: "Leaks · ring main", th: "ลมรั่ว · ท่อวงแหวน" }, thbYr: 506000 },
  { name: { en: "Over-pressure · 0.7 bar", th: "จ่ายเกินความดัน · 0.7 bar" }, thbYr: 320000 },
  { name: { en: "C-03 short-cycling", th: "C-03 รอบสั้นถี่" }, thbYr: 180000 },
  { name: { en: "Off-shift baseload", th: "โหลดฐานนอกกะ" }, thbYr: 140000 },
];

// AI compressor-sequencing recommendation vs the live demand
const sequencing = {
  now: { en: "C-01 VSD 88% + C-02 base 100% + C-03 short-cycling on standby", th: "C-01 VSD 88% + C-02 เดินฐาน 100% + C-03 รอบสั้นถี่ตอนสแตนด์บาย" },
  reco: { en: "Run C-01 VSD to demand + C-02 as base · stop C-03", th: "เดิน C-01 VSD ตามดีมานด์ + C-02 เป็นฐาน · หยุด C-03" },
  delta: "-9% energy",
};

// specific-power forecast — actual vs where AI sequencing + pressure trim takes it
const specForecast: { t: string; actual?: number; target?: number }[] = [
  { t: "13:00", actual: 19.6 }, { t: "14:00", actual: 19.4 }, { t: "15:00", actual: 19.4, target: 19.4 },
  { t: "16:00", target: 18.6 }, { t: "17:00", target: 17.9 }, { t: "18:00", target: 17.6 },
];

/* ── Vortiq Action data — Part 1 zero-invest quick wins + Part 2 capital projects (BOM) ── */

/** One BOM line on a capital project — brand + part number an engineer can order. */
type ActionPart = { brand: string; partNo: string; name: LZ; qty: number; unitPrice: number };

/** Part 1 · Quick wins — no hardware, config / discipline only (฿0 capex). */
const vortiqQuickWins: { id: string; title: LZ; asset: LZ; how: LZ; savingYr: number; effort: LZ }[] = [
  {
    id: "qw-pressure",
    title: { en: "Trim system pressure 7.2 → 6.5 bar", th: "ลดความดันระบบ 7.2 → 6.5 bar" },
    asset: { en: "Ring main · compressor room setpoint", th: "ท่อวงแหวน · ตั้งค่าห้องคอมเพรสเซอร์" },
    how: { en: "Bring the setpoint down to the 6.5 bar the plant actually needs. Every 1 bar over spec is ≈7% more energy — this alone is pure setpoint, no hardware.", th: "ลดค่า setpoint ลงมาที่ 6.5 bar ที่โรงงานต้องใช้จริง เกินสเปกทุก 1 bar ≈ พลังงานเพิ่ม 7% — แค่ปรับ setpoint ไม่ต้องมีฮาร์ดแวร์" },
    savingYr: 320000,
    effort: { en: "setpoint change", th: "ปรับ setpoint" },
  },
  {
    id: "qw-leaks",
    title: { en: "Fix the top 3 tagged leaks", th: "อุดลมรั่ว 3 จุดใหญ่ที่แท็กไว้" },
    asset: { en: "Drop coupling · bypass valve · flange J-12", th: "ข้อต่อจุดจ่าย · วาล์วบายพาส · หน้าแปลน J-12" },
    how: { en: "Close the three biggest ultrasonic leaks — Line B drop coupling, dryer bypass valve and ring-main flange J-12 — in one maintenance shift.", th: "อุดลมรั่วสามจุดใหญ่ที่สุดที่อัลตราโซนิกเจอ — ข้อต่อ Line B, วาล์วบายพาส Dryer และหน้าแปลน J-12 — จบในกะซ่อมเดียว" },
    savingYr: 395000,
    effort: { en: "1 maintenance shift", th: "1 กะซ่อมบำรุง" },
  },
  {
    id: "qw-sequence",
    title: { en: "Stop C-03 short-cycling via sequencing", th: "หยุด C-03 รอบสั้นถี่ด้วยการจัดลำดับ" },
    asset: { en: "C-03 · compressor sequencing", th: "C-03 · การจัดลำดับเดินเครื่อง" },
    how: { en: "Set the controller to run the right mix — C-01 VSD to demand plus C-02 as base — so C-03 stops short-cycling on standby.", th: "ตั้งคอนโทรลเลอร์ให้เดินชุดที่พอดี — C-01 VSD ตามดีมานด์ + C-02 เป็นฐาน — เพื่อให้ C-03 เลิกวิ่งรอบสั้นถี่ตอนสแตนด์บาย" },
    savingYr: 180000,
    effort: { en: "controller setting", th: "ตั้งค่าคอนโทรลเลอร์" },
  },
  {
    id: "qw-idle",
    title: { en: "Auto stop-on-idle off-shift", th: "หยุดเครื่องอัตโนมัติตอนนอกกะ" },
    asset: { en: "Compressor room · PLC schedule", th: "ห้องคอมเพรสเซอร์ · ตารางเวลา PLC" },
    how: { en: "Schedule the compressors to stop when the plant is idle at night and weekends — that kills the ~28% baseload flow that is pure leak.", th: "ตั้งตารางให้คอมเพรสเซอร์หยุดตอนโรงงานว่างช่วงกลางคืนและวันหยุด — ตัดโหลดฐาน ~28% ที่เป็นลมรั่วล้วนๆ" },
    savingYr: 140000,
    effort: { en: "PLC schedule", th: "ตั้งตาราง PLC" },
  },
];

/** Part 2 · Capital projects — with investment; each carries a full BOM (brand + part no.). */
const vortiqCapitalProjects: {
  id: string; code: string; title: LZ; asset: LZ; severity: "critical" | "warning" | "recommend";
  capex: number; savingYr: number; paybackMo: number; roi: number;
  why: LZ; evidence: LZ; outcome: LZ; parts: ActionPart[];
}[] = [
  {
    id: "vrq-vsd", code: "VRQ-01",
    title: { en: "VSD retrofit on C-02", th: "ติดตั้ง VSD ให้ C-02" },
    asset: { en: "Compressor C-02 · 90 kW fixed", th: "คอมเพรสเซอร์ C-02 · 90 kW แบบ fixed" },
    severity: "warning", capex: 480000, savingYr: 620000, paybackMo: 9, roi: 129,
    why: { en: "C-02 runs fixed-speed at 20.1 kW/100cfm — well above the 17.5 nameplate — and cannot modulate to demand.", th: "C-02 เดินความเร็วคงที่ที่ 20.1 kW/100cfm — สูงกว่าค่าป้าย 17.5 มาก — และปรับตามดีมานด์ไม่ได้" },
    evidence: { en: "Its specific power is the worst in the room and it holds full load even when demand drops.", th: "กำลังจำเพาะแย่ที่สุดในห้อง และยังเดินเต็มโหลดแม้ดีมานด์ลดลง" },
    outcome: { en: "C-02 modulates to the live demand — specific power falls toward nameplate and part-load energy drops sharply.", th: "C-02 ปรับตามดีมานด์ขณะนี้ — กำลังจำเพาะเข้าใกล้ค่าป้าย และพลังงานช่วงโหลดต่ำลดลงชัดเจน" },
    parts: [
      { brand: "Danfoss", partNo: "VLT AQUA FC-202 90kW", name: { en: "VLT AQUA 90 kW VSD drive", th: "ชุดขับ VLT AQUA 90 kW (VSD)" }, qty: 1, unitPrice: 320000 },
      { brand: "Danfoss", partNo: "MCC 107 EMC filter", name: { en: "EMC line filter", th: "ตัวกรอง EMC" }, qty: 1, unitPrice: 40000 },
    ],
  },
  {
    id: "vrq-seq", code: "VRQ-02",
    title: { en: "Master sequencing controller for the compressor room", th: "ติดตั้งคอนโทรลเลอร์จัดลำดับหลักในห้องคอมเพรสเซอร์" },
    asset: { en: "Compressor room · 3-machine control", th: "ห้องคอมเพรสเซอร์ · ควบคุม 3 เครื่อง" },
    severity: "warning", capex: 220000, savingYr: 340000, paybackMo: 8, roi: 155,
    why: { en: "The three compressors run on local pressure switches with no coordination, so the mix never matches live demand.", th: "คอมเพรสเซอร์ทั้งสามเดินด้วยสวิตช์ความดันแยกกัน ไม่มีการประสาน ทำให้ชุดที่เดินไม่ตรงดีมานด์ขณะนั้น" },
    evidence: { en: "Overlapping pressure bands cause C-03 to short-cycle and hold the ring main above setpoint.", th: "แบนด์ความดันซ้อนกันทำให้ C-03 วิ่งรอบสั้นถี่ และดันความดันท่อวงแหวนสูงกว่า setpoint" },
    outcome: { en: "One controller runs the optimal mix against demand — short-cycling stops and pressure holds at 6.5 bar.", th: "คอนโทรลเลอร์ตัวเดียวเดินชุดที่พอดีกับดีมานด์ — รอบสั้นถี่หยุด และความดันนิ่งที่ 6.5 bar" },
    parts: [
      { brand: "Atlas Copco", partNo: "ES 360 sequencer", name: { en: "ES central sequencing controller", th: "คอนโทรลเลอร์จัดลำดับกลาง ES" }, qty: 1, unitPrice: 160000 },
      { brand: "Danfoss", partNo: "MBS 3000 transmitter", name: { en: "Ring-main pressure transmitters", th: "ทรานสมิตเตอร์ความดันท่อวงแหวน" }, qty: 3, unitPrice: 20000 },
    ],
  },
  {
    id: "vrq-heat", code: "VRQ-03",
    title: { en: "Heat-recovery on C-01 · hot air → process-water preheat", th: "นำความร้อนทิ้ง C-01 กลับมาใช้ · อุ่นน้ำกระบวนการ" },
    asset: { en: "Compressor C-01 · 110 kW VSD", th: "คอมเพรสเซอร์ C-01 · 110 kW VSD" },
    severity: "recommend", capex: 260000, savingYr: 210000, paybackMo: 15, roi: 81,
    why: { en: "Up to 90% of a compressor's electrical energy leaves as heat — on C-01 that heat is dumped to atmosphere.", th: "พลังงานไฟฟ้าของคอมเพรสเซอร์ออกมาเป็นความร้อนได้ถึง 90% — ของ C-01 ระบายทิ้งสู่บรรยากาศเปล่าๆ" },
    evidence: { en: "C-01 is the base VSD machine and runs the most hours, so its recoverable heat is the largest and steadiest.", th: "C-01 เป็นเครื่อง VSD หลักและเดินชั่วโมงมากที่สุด ความร้อนที่กู้คืนได้จึงมากและสม่ำเสมอที่สุด" },
    outcome: { en: "Recovered heat preheats process water — cutting the boiler's gas load with no impact on air output.", th: "ความร้อนที่กู้คืนมาอุ่นน้ำกระบวนการ — ลดภาระแก๊สของหม้อไอน้ำโดยไม่กระทบการจ่ายลม" },
    parts: [
      { brand: "Alfa Laval", partNo: "CB60 plate exchanger", name: { en: "Heat-recovery plate heat exchanger", th: "เครื่องแลกเปลี่ยนความร้อนแบบแผ่น" }, qty: 1, unitPrice: 150000 },
      { brand: "Grundfos", partNo: "TPE 65 circulator", name: { en: "Recovery circulation pump", th: "ปั๊มหมุนเวียนระบบกู้ความร้อน" }, qty: 1, unitPrice: 70000 },
    ],
  },
  {
    id: "vrq-dryer", code: "VRQ-04",
    title: { en: "Low-dewpoint desiccant dryer + flow meters", th: "อัปเกรด Dryer แบบ desiccant ดิวพอยต์ต่ำ + มิเตอร์ไหล" },
    asset: { en: "Dryer · ring-main metering", th: "Dryer · จุดวัดท่อวงแหวน" },
    severity: "recommend", capex: 180000, savingYr: 120000, paybackMo: 18, roi: 67,
    why: { en: "The refrigerant dryer can't reach a low enough dewpoint, and there are no flow meters to see demand per line.", th: "Dryer แบบ refrigerant ทำดิวพอยต์ต่ำพอไม่ได้ และไม่มีมิเตอร์ไหลให้เห็นดีมานด์รายไลน์" },
    evidence: { en: "Damp air drives the dryer bypass valve open — one of the top-3 leaks — and demand can't be split per line.", th: "ลมชื้นทำให้วาล์วบายพาส Dryer เปิด — เป็น 1 ใน 3 จุดรั่วใหญ่ — และแบ่งดีมานด์รายไลน์ไม่ได้" },
    outcome: { en: "Stable low dewpoint ends the bypass leak; flow meters expose demand per line for continuous tuning.", th: "ดิวพอยต์ต่ำที่นิ่งทำให้ลมรั่ววาล์วบายพาสหมดไป; มิเตอร์ไหลเผยดีมานด์รายไลน์เพื่อจูนต่อเนื่อง" },
    parts: [
      { brand: "Atlas Copco", partNo: "CD 250+ desiccant", name: { en: "Low-dewpoint desiccant dryer", th: "Dryer แบบ desiccant ดิวพอยต์ต่ำ" }, qty: 1, unitPrice: 120000 },
      { brand: "SICK", partNo: "FTMg thermal-mass", name: { en: "Thermal-mass flow meters + dewpoint sensor", th: "มิเตอร์ไหลแบบ thermal-mass + เซนเซอร์ดิวพอยต์" }, qty: 1, unitPrice: 60000 },
    ],
  },
];

const autos: { name: LZ; desc: LZ; impact: string; status: "active" | "pending" | "suggested" }[] = [
  { name: { en: "Pressure-band auto-trim", th: "ลดแบนด์ความดันอัตโนมัติ" }, desc: { en: "Nudge the setpoint toward 6.5 bar whenever demand and the lowest tool leave headroom", th: "ค่อยๆ ลด setpoint เข้าหา 6.5 bar เมื่อดีมานด์และเครื่องมือที่กินลมต่ำสุดยังมีเผื่อ" }, impact: "-5% energy", status: "active" },
  { name: { en: "AI compressor sequencing", th: "จัดลำดับเดินเครื่องด้วย AI" }, desc: { en: "Run the optimal mix against live demand — C-01 VSD to demand, C-02 base, C-03 stopped", th: "เดินชุดที่พอดีกับดีมานด์ขณะนี้ — C-01 VSD ตามดีมานด์, C-02 ฐาน, หยุด C-03" }, impact: "-9% energy", status: "pending" },
  { name: { en: "Auto stop-on-idle off-shift", th: "หยุดเครื่องอัตโนมัติตอนนอกกะ" }, desc: { en: "Stop the compressors when the plant is idle at night and weekends", th: "หยุดคอมเพรสเซอร์เมื่อโรงงานว่างตอนกลางคืนและวันหยุด" }, impact: "-฿140K/yr", status: "suggested" },
];

const mv: { action: LZ; planned: number; verified: number }[] = [
  { action: { en: "Pressure trim 7.2 → 7.0 bar", th: "ลดความดัน 7.2 → 7.0 bar" }, planned: 95000, verified: 102000 },
  { action: { en: "Line B drop-coupling leak fix", th: "อุดลมรั่วข้อต่อ Line B" }, planned: 180000, verified: 171000 },
];

/* ─────────────────────────────────────────────────────────── workflow ── */

export function VortiqModule() {
  const { locale } = useI18n();
  const L = (o: LZ) => (locale === "th" ? o.th : o.en);
  const [step, setStep] = useState(0);

  return (
    <div className="space-y-6">
      <WorkflowBar step={step} setStep={setStep} L={L} />

      {step === 0 && <MonitorStep L={L} />}
      {step === 1 && <InsightStep L={L} onAct={() => setStep(2)} />}
      {step === 2 && <AnalysisStep L={L} onAct={() => setStep(3)} />}
      {step === 3 && <ActionStep L={L} />}
      {step === 4 && <ReportStep L={L} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── 01 monitor ── */

const COMP_STYLE: Record<"loaded" | "unloaded" | "off", { color: string; label: LZ }> = {
  loaded: { color: "#34d399", label: { en: "Loaded", th: "โหลด" } },
  unloaded: { color: "#f59e0b", label: { en: "Unloaded", th: "อันโหลด" } },
  off: { color: "#8b93a7", label: { en: "Off", th: "ปิด" } },
};

function MonitorStep({ L }: { L: (o: LZ) => string }) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard label={L({ en: "System pressure", th: "ความดันระบบ" })} value="7.2" unit="bar" delta="+0.7 vs 6.5" accent={AIR} icon={Gauge} />
        <KpiCard label={L({ en: "Flow", th: "อัตราไหล" })} value="1,240" unit="cfm" delta="Live" deltaGood accent="#818cf8" icon={Wind} />
        <KpiCard label={L({ en: "Specific power", th: "กำลังจำเพาะ" })} value="19.4" unit="kW/100cfm" delta="+1.9 vs 17.5" accent="#f59e0b" icon={TrendingDown} />
        <KpiCard label={L({ en: "Leak", th: "ลมรั่ว" })} value="32" unit="% of air" delta="of generated air" accent="#f43f5e" icon={Droplets} />
        <KpiCard label={L({ en: "Air cost", th: "ต้นทุนลม" })} value="฿480" unit="/hr" delta="Live" accent="#fbbf24" icon={Coins} />
      </section>

      <Panel
        title={L({ en: "Air System Twin · 3D", th: "ดิจิทัลทวินระบบลม · 3D" })}
        sub={L({ en: "Where air flows · where pressure drops", th: "ลมวิ่งจากไหนไปไหน แรงดันตกตรงไหน" })}
        icon={Wind}
      >
        <AirSystem3D />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <Panel title={L({ en: "System Pressure", th: "ความดันระบบ" })} sub={L({ en: "Live bar vs the 6.5 setpoint", th: "ความดันขณะนี้เทียบ setpoint 6.5" })} icon={Activity} right={<span className="chip text-sky-300">● {L({ en: "setpoint 6.5 bar", th: "setpoint 6.5 bar" })}</span>}>
          <AreaTrend data={airTrend24h} dataKey="pressure" color={AIR} height={260} unit=" bar" baseline={SETPOINT_BAR} baselineLabel={L({ en: "setpoint 6.5", th: "setpoint 6.5" })} />
        </Panel>
        <Panel title={L({ en: "Compressor Status", th: "สถานะคอมเพรสเซอร์" })} sub={L({ en: "Which machines carry the load", th: "เครื่องไหนแบกโหลดอยู่" })} icon={Wind}>
          <div className="space-y-2.5">
            {compressors.map((c) => {
              const s = COMP_STYLE[c.status];
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                  <CircleDot size={14} style={{ color: s.color }} className={c.status === "unloaded" ? "animate-pulse" : ""} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium">{c.name}</p>
                      <span className="rounded-full border border-white/12 bg-white/[0.04] px-1.5 py-0.5 text-[9.5px] font-semibold text-white/55">{c.kw} kW · {c.type}</span>
                      <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium" style={{ color: s.color, borderColor: `${s.color}44`, backgroundColor: `${s.color}14` }}>{L(s.label)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-white/45">{L(c.note)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-[13px] font-semibold" style={{ color: s.color }}>{c.loadPct}%</p>
                    <p className="tabular text-[10px] text-white/40">{c.specPower > 0 ? `${c.specPower} kW/100cfm` : "—"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel title={L({ en: "Air Flow Demand", th: "ดีมานด์อัตราไหล" })} sub={L({ en: "Live cfm vs the plant's real need", th: "cfm ขณะนี้เทียบความต้องการจริง" })} icon={BarChart3}>
        <AreaTrend data={airTrend24h} dataKey="flow" color="#818cf8" height={220} unit=" cfm" />
      </Panel>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat label={L({ en: "Cost per Nm³", th: "ต้นทุนต่อ Nm³" })} value="฿0.23" unit="/Nm³" accent="#fbbf24" />
        <MiniStat label={L({ en: "Air cost · shift", th: "ต้นทุนลม · กะ" })} value="฿3,840" unit="/shift" accent="#22d3ee" />
        <MiniStat label={L({ en: "Power drawn", th: "กำลังไฟที่ดึง" })} value="187" unit="kW" accent="#818cf8" />
        <MiniStat label={L({ en: "Dewpoint", th: "จุดน้ำค้าง" })} value="3" unit="°C PDP" accent="#34d399" />
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── 02 insight ── */

function InsightStep({ L, onAct }: { L: (o: LZ) => string; onAct: () => void }) {
  const maxLeak = Math.max(...leaks.map((l) => l.thbYr));
  const maxBand = Math.max(...pressureBands.map((b) => b.saveYr));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Callout tone="crit" icon={Droplets} big="32%" label={L({ en: "air lost to leaks", th: "ลมที่หายไปกับรอยรั่ว" })} note={L({ en: "≈ ฿506K/yr leaking out the ring main", th: "≈ ฿506K/ปี รั่วออกท่อวงแหวน" })} />
        <Callout tone="warn" icon={Gauge} big="+0.7 bar" label={L({ en: "pressure over setpoint", th: "ความดันเกิน setpoint" })} note={L({ en: "every 1 bar over spec ≈ 7% more energy", th: "เกินสเปกทุก 1 bar ≈ พลังงานเพิ่ม 7%" })} />
        <Callout tone="warn" icon={TrendingDown} big="28%" label={L({ en: "night baseload flow", th: "โหลดฐานตอนกลางคืน" })} note={L({ en: "flow while the plant sleeps = pure leak", th: "ลมที่ไหลตอนโรงงานหลับ = รั่วล้วนๆ" })} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel title={L({ en: "Leak Survey", th: "สำรวจจุดรั่ว" })} sub={L({ en: "Where the ฿ leaks out the ring main", th: "เงินรั่วออกท่อวงแหวนตรงไหน" })} icon={Droplets}>
          <div className="space-y-2.5">
            {leaks.map((l, i) => (
              <div key={l.location.en}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="flex items-center gap-1.5 text-white/70"><span className="tabular text-[11px] text-white/35">{i + 1}.</span>{L(l.location)}</span>
                  <span className="flex items-center gap-2"><span className="tabular text-[11px] text-white/45">{l.cfm} cfm</span><span className="tabular font-semibold text-rose-300">{formatTHB(l.thbYr)}</span></span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${(l.thbYr / maxLeak) * 100}%`, background: "linear-gradient(90deg,#f43f5e,#fb7185)" }} /></div>
              </div>
            ))}
          </div>
          <p className="mt-3.5 rounded-lg border border-rose-400/15 bg-rose-400/[0.05] px-2.5 py-2 text-[11px] leading-relaxed text-white/60">{L({ en: "118 cfm of tagged leaks ≈ ฿506K/yr — the fastest ฿ to reclaim.", th: "ลมรั่วที่แท็กไว้ 118 cfm ≈ ฿506K/ปี — เงินที่ดึงกลับได้เร็วที่สุด" })}</p>
        </Panel>

        <Panel title={L({ en: "Pressure-band Savings", th: "ประหยัดจากการลดความดัน" })} sub={L({ en: "What each 0.5-bar trim saves", th: "ลดทีละ 0.5 bar ประหยัดเท่าไร" })} icon={Gauge}>
          <div className="space-y-3">
            {pressureBands.map((b) => (
              <div key={b.band}>
                <div className="flex items-center justify-between text-[12.5px]"><span className="tabular text-white/70">{b.band}</span><span className="tabular font-semibold text-emerald-300">{formatTHB(b.saveYr)}</span></div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${(b.saveYr / maxBand) * 100}%`, background: "linear-gradient(90deg,#34d399,#059669)" }} /></div>
              </div>
            ))}
          </div>
          <p className="mt-3.5 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.05] px-2.5 py-2 text-[11px] leading-relaxed text-white/60">{L({ en: "Trimming all the way to 6.5 bar recovers ≈ ฿320K/yr — zero hardware.", th: "ลดลงถึง 6.5 bar กู้คืนได้ ≈ ฿320K/ปี — ไม่ต้องมีฮาร์ดแวร์" })}</p>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Panel title={L({ en: "Specific Power vs Nameplate", th: "กำลังจำเพาะเทียบค่าป้าย" })} sub={L({ en: "Which compressor wastes the most", th: "คอมเพรสเซอร์ตัวไหนเปลืองสุด" })} icon={TrendingDown}>
          <div className="space-y-3">
            {compressors.map((c) => {
              const over = c.specPower > NAMEPLATE_SPEC;
              const col = c.status === "off" ? "#8b93a7" : over ? "#f59e0b" : "#34d399";
              const pct = c.specPower > 0 ? Math.min((c.specPower / 24) * 100, 100) : 0;
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="text-white/70">{c.name} · {c.type}</span>
                    <span className="tabular font-semibold" style={{ color: col }}>{c.specPower > 0 ? `${c.specPower} kW/100cfm` : L({ en: "off", th: "ปิด" })}</span>
                  </div>
                  <div className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: col }} />
                    <span className="absolute top-0 h-full w-px bg-white/50" style={{ left: `${(NAMEPLATE_SPEC / 24) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3.5 rounded-lg border border-amber-400/15 bg-amber-400/[0.05] px-2.5 py-2 text-[11px] leading-relaxed text-white/60">{L({ en: "The white line is the 17.5 nameplate — C-02 runs furthest over it.", th: "เส้นขาวคือค่าป้าย 17.5 — C-02 เกินไปไกลที่สุด" })}</p>
        </Panel>

        <Panel title={L({ en: "Cost of Poor Compressed Air", th: "ต้นทุนของลมอัดที่จัดการไม่ดี" })} sub={L({ en: "Where the air budget bleeds", th: "งบค่าลมรั่วไหลไปไหน" })} icon={Coins}>
          <HBars data={poorAirCost.map((p) => ({ name: L(p.name), value: Math.round(p.thbYr / 1000) }))} color="#f59e0b" />
          <p className="mt-3.5 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2 text-[11px] leading-relaxed text-white/55">{L({ en: "Values in ฿ thousand/yr · ≈ ฿1.15M/yr of addressable air cost in total.", th: "หน่วยพันบาท/ปี · รวมต้นทุนลมที่แก้ได้ ≈ ฿1.15M/ปี" })}</p>
        </Panel>
      </div>

      <Panel title={L({ en: "Addressable Air Cost", th: "ต้นทุนลมที่แก้ไขได้" })} sub={L({ en: "How much of the air bill is recoverable", th: "ค่าลมกู้คืนได้แค่ไหน" })} icon={Wind}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">{L({ en: "≈ ฿1.15M/yr identified across leaks, pressure & sequencing", th: "≈ ฿1.15M/ปี ที่ระบุได้ จากลมรั่ว ความดัน และการจัดลำดับ" })}</span>
          <span className="font-semibold text-sky-300">{L({ en: "45% needs zero investment", th: "45% ไม่ต้องลงทุน" })}</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: "45%", background: `linear-gradient(90deg,#34d399,${AIR})` }} /></div>
        <button onClick={onAct} className="btn-glow mt-4 px-4 py-2 text-sm">{L({ en: "See the savings breakdown", th: "ดูรายละเอียดที่ประหยัดได้" })} <ArrowRight size={14} /></button>
      </Panel>
    </div>
  );
}

/* ─────────────────────────────────────────────────── 03 ai analysis ── */

function AnalysisStep({ L, onAct }: { L: (o: LZ) => string; onAct: () => void }) {
  const ranked = [...leaks].sort((a, b) => b.thbYr - a.thbYr);
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Panel title={L({ en: "AI Leak-Source Ranking", th: "AI จัดอันดับจุดรั่ว" })} sub={L({ en: "Fix order by ฿ per labour-hour", th: "ลำดับการแก้ตาม ฿ ต่อชั่วโมงแรง" })} icon={Sparkles}>
          <div className="space-y-3">
            {ranked.map((l, i) => (
              <div key={l.location.en} className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-[13px] font-medium"><span className="grid h-5 w-5 place-items-center rounded-full bg-sky-400/15 text-[10px] font-bold tabular text-sky-300">{i + 1}</span>{L(l.location)}</p>
                  <span className="tabular text-sm font-semibold text-rose-300">{formatTHB(l.thbYr)}</span>
                </div>
                <p className="mt-1 text-[11.5px] text-white/55">{l.cfm} cfm · {L({ en: "wasted air", th: "ลมที่เสียเปล่า" })}</p>
                <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-sky-400/[0.07] px-2.5 py-1.5 text-[11.5px] text-sky-200"><Sparkles size={12} className="mt-0.5 shrink-0" /> {i < 3 ? L({ en: "Fix first — inside the ฿395K one-shift quick win", th: "แก้ก่อน — อยู่ในควิกวิน ฿395K จบในกะเดียว" }) : L({ en: "Schedule with the next maintenance round", th: "จัดเข้ารอบซ่อมบำรุงถัดไป" })}</p>
              </div>
            ))}
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title={L({ en: "AI Compressor Sequencing", th: "AI จัดลำดับเดินเครื่อง" })} sub={L({ en: "Run the right mix for live demand", th: "เดินชุดที่พอดีกับดีมานด์ขณะนี้" })} icon={Sparkles} right={<span className="chip text-emerald-300">{sequencing.delta}</span>}>
            <div className="space-y-2.5">
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{L({ en: "Running now", th: "ที่เดินอยู่ตอนนี้" })}</p>
                <p className="mt-1 text-[12px] text-white/70">{L(sequencing.now)}</p>
              </div>
              <div className="flex justify-center"><ArrowRight size={16} className="rotate-90 text-sky-300" /></div>
              <div className="rounded-xl border border-sky-400/25 bg-sky-400/[0.06] p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300"><Sparkles size={11} /> {L({ en: "AI recommends", th: "AI แนะนำ" })}</p>
                <p className="mt-1 text-[12px] font-medium text-white/85">{L(sequencing.reco)}</p>
                <p className="mt-1.5 tabular text-[12px] font-semibold text-emerald-300">−9% {L({ en: "energy · stops C-03 short-cycling", th: "พลังงาน · หยุด C-03 รอบสั้นถี่" })}</p>
              </div>
            </div>
          </Panel>
          <Panel title={L({ en: "Specific-Power Forecast", th: "พยากรณ์กำลังจำเพาะ" })} sub={L({ en: "Where trim + sequencing takes it", th: "ลดความดัน+จัดลำดับแล้วไปถึงไหน" })} icon={TrendingUp}>
            <MultiLine data={specForecast} height={200} lines={[{ key: "actual", color: "#f59e0b", name: L({ en: "Actual", th: "จริง" }) }, { key: "target", color: AIR, name: L({ en: "AI target", th: "AI เป้าหมาย" }), dashed: true }]} />
            <p className="mt-2 flex items-center gap-1.5 rounded-lg border border-sky-400/25 bg-sky-400/10 px-2.5 py-1.5 text-[12px] text-sky-200"><Sparkles size={13} /> {L({ en: "AI projects specific power from 19.4 down to 17.6 kW/100cfm", th: "AI คาดว่ากำลังจำเพาะจะลดจาก 19.4 เหลือ 17.6 kW/100cfm" })}</p>
          </Panel>
          <div className="panel border-sky-400/25 bg-sky-400/[0.05] p-5">
            <p className="text-[13px] font-semibold text-sky-200">{L({ en: "AI verdict", th: "ข้อสรุปจาก AI" })}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/65">{L({ en: "≈฿1.03M/yr is recoverable at ฿0 capex: ~38% from fixing the tagged leaks, ~31% from trimming pressure to 6.5 bar, the rest from sequencing & off-shift stops. Move to actions to execute.", th: "กู้คืนได้ ≈฿1.03M/ปี โดยไม่ต้องลงทุน: ~38% จากอุดจุดรั่วที่แท็กไว้, ~31% จากลดความดันเหลือ 6.5 bar, ที่เหลือจากการจัดลำดับ & หยุดนอกกะ ไปหน้าลงมือเพื่อสั่งทำ" })}</p>
            <button onClick={onAct} className="btn-glow mt-3 px-4 py-2 text-sm"><ArrowRight size={14} /> {L({ en: "Go to recommendations", th: "ไปหน้าคำแนะนำ" })}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────── 04 recommend & act ── */

/** small on/off switch (local copy of the shared Energy Toggle). */
function Toggle({ on, onChange, color = "#818cf8" }: { on: boolean; onChange: () => void; color?: string }) {
  return (
    <button onClick={onChange} role="switch" aria-checked={on} className="relative h-5 w-9 shrink-0 rounded-full transition-colors" style={{ background: on ? color : "rgba(255,255,255,0.16)" }}>
      <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all" style={{ left: on ? "18px" : "2px" }} />
    </button>
  );
}

const CP_SEV: Record<"critical" | "warning" | "recommend", { label: LZ; cls: string }> = {
  critical: { label: { en: "Critical", th: "วิกฤต" }, cls: "border-rose-400/40 bg-rose-500/12 text-rose-300" },
  warning: { label: { en: "Warning", th: "เตือน" }, cls: "border-amber-400/40 bg-amber-500/12 text-amber-300" },
  recommend: { label: { en: "Recommend", th: "แนะนำ" }, cls: "border-emerald-400/40 bg-emerald-500/12 text-emerald-300" },
};

/** Outlook-style compose window — a Request-for-Quotation email to SpareX with the
 *  project's BOM pre-filled and the signed-in user's signature. Send is simulated. */
function QuoteEmailModal({ project, L, onClose, onSent }: { project: (typeof vortiqCapitalProjects)[number]; L: (o: LZ) => string; onClose: () => void; onSent: () => void }) {
  const title = L(project.title);
  const bom = project.parts.map((p, i) => `${i + 1}. ${L(p.name)} · ${p.brand} · ${p.partNo} · ${p.qty} × ${formatTHB(p.unitPrice)} · ${formatTHB(p.qty * p.unitPrice)}`).join("\n");
  const sig = L({
    en: `—\n${currentUser.name}\n${currentUser.title} · ${currentUser.plant}\n${currentUser.company}\n${currentUser.email} · ${currentUser.phone}`,
    th: `—\n${currentUser.name}\n${currentUser.titleTh} · ${currentUser.plant}\n${currentUser.company}\n${currentUser.email} · ${currentUser.phone}`,
  });
  const [subject, setSubject] = useState(L({ en: `Request for Quotation · ${title}`, th: `ขอใบเสนอราคา · ${title}` }));
  const [body, setBody] = useState(L({
    en: `Dear SpareX Sales team,\n\nWe would like to request a formal quotation for the following compressed-air improvement project:\n\nProject: ${title}\nLocation: ${L(project.asset)}\nEstimated budget: ${formatTHB(project.capex)}\nReturn: saves ${formatTHB(project.savingYr)}/yr · payback ${project.paybackMo} months\n\nBill of materials:\n${bom}\n\nPlease include unit prices, lead time, warranty and installation. Equivalent brands are welcome if the specs are met.\n\nThank you,\n\n${sig}`,
    th: `เรียน ทีมขาย SpareX,\n\nทางเราขอใบเสนอราคาอย่างเป็นทางการสำหรับโครงการปรับปรุงระบบลมอัดดังนี้:\n\nโครงการ: ${title}\nจุดติดตั้ง: ${L(project.asset)}\nงบประมาณโดยประมาณ: ${formatTHB(project.capex)}\nผลตอบแทน: ประหยัด ${formatTHB(project.savingYr)}/ปี · คืนทุน ${project.paybackMo} เดือน\n\nรายการอะไหล่ (BOM):\n${bom}\n\nรบกวนเสนอราคาต่อหน่วย ระยะเวลาส่งมอบ การรับประกัน และค่าติดตั้ง (เสนอรุ่นเทียบเท่าได้หากสเปคตรง)\n\nขอบคุณครับ/ค่ะ\n\n${sig}`,
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
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2">
              <button onClick={send} disabled={sending} className="flex items-center gap-1.5 rounded bg-[#0f6cbd] px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#0c5aa0] disabled:opacity-60"><Send size={13} /> {sending ? L({ en: "Sending…", th: "กำลังส่ง…" }) : L({ en: "Send", th: "ส่ง" })}</button>
              <span className="grid h-8 w-8 place-items-center rounded text-slate-400"><Paperclip size={15} /></span>
            </div>
            <div className="border-b border-slate-100 px-4 py-2 text-[13px]">
              <div className="flex items-center gap-2 border-b border-slate-100 py-1.5"><span className="w-14 shrink-0 text-slate-400">{L({ en: "To", th: "ถึง" })}</span><span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[12px] font-medium text-[#0f6cbd]">SpareX Sales &lt;{SPAREX_SALES_EMAIL}&gt;</span></div>
              <div className="flex items-center gap-2 py-1.5"><span className="w-14 shrink-0 text-slate-400">{L({ en: "Subject", th: "เรื่อง" })}</span><input value={subject} onChange={(e) => setSubject(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-slate-800 outline-none" /></div>
            </div>
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
              <span className="flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11.5px] text-slate-600"><Paperclip size={12} /> BOM-{project.id}.pdf <span className="text-slate-400">· {(project.parts.length * 12 + 40)} KB</span></span>
            </div>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[240px] flex-1 resize-none px-4 py-3 text-[12.5px] leading-relaxed text-slate-700 outline-none" spellCheck={false} />
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function ActionStep({ L }: { L: (o: LZ) => string }) {
  const [lit, setLit] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLit(true), 90); return () => clearTimeout(t); }, []);
  const [openId, setOpenId] = useState<string | null>(vortiqCapitalProjects[0]?.id ?? null);
  const [doneQw, setDoneQw] = useState<Set<string>>(new Set());
  const [poDone, setPoDone] = useState<Set<string>>(new Set());
  const [quoteFor, setQuoteFor] = useState<(typeof vortiqCapitalProjects)[number] | null>(null);
  const [focus, setFocus] = useState<"all" | "quick" | "capex">("all");
  const [capSev, setCapSev] = useState<"all" | "critical" | "warning" | "recommend">("all");
  const [qwFilter, setQwFilter] = useState<"all" | "pending" | "done">("all");
  const [qwSel, setQwSel] = useState<string | null>(vortiqQuickWins[0]?.id ?? null);
  const [qwAuto, setQwAuto] = useState<Record<string, boolean>>(() => Object.fromEntries(vortiqQuickWins.map((q) => [q.id, true])));
  const [quoteSent, setQuoteSent] = useState<Set<string>>(new Set());
  const [acts, setActs] = useState(autos);
  const orders = useWorkOrders();

  const noCapex = vortiqQuickWins.reduce((s, q) => s + q.savingYr, 0);
  const capexSaving = vortiqCapitalProjects.reduce((s, c) => s + c.savingYr, 0);
  const capexTotal = vortiqCapitalProjects.reduce((s, c) => s + c.capex, 0);
  const grand = noCapex + capexSaving;
  const blended = Math.round((capexTotal / capexSaving) * 12);
  const ncPct = Math.round((noCapex / grand) * 100);
  const woFor = (id: string) => orders.find((w) => w.findingId === id);
  const hasWO = (id: string) => poDone.has(id) || !!woFor(id);

  // capital project → single Work Order for installation & commissioning (raised on budget approval)
  const raisePO = (c: (typeof vortiqCapitalProjects)[number]) => {
    createWorkOrder({ id: c.id, code: c.code, title: { en: `Install & commission · ${L(c.title)}`, th: `ติดตั้ง & Commissioning · ${L(c.title)}` }, asset: c.asset, severity: c.severity === "recommend" ? "advisory" : c.severity, capex: c.capex, annualSaving: c.savingYr, partsCount: c.parts.length }, "energy");
    setPoDone((s) => new Set(s).add(c.id));
  };
  // quick win → one-time setup/enable Work Order (config task, no parts → goes straight to "scheduled")
  const commitQuickWin = (q: (typeof vortiqQuickWins)[number]) => {
    const auto = qwAuto[q.id];
    createWorkOrder({ id: q.id, code: q.id.toUpperCase(), title: { en: `${auto ? "Set up & enable AI-auto" : "Configure"} · ${L(q.title)}`, th: `${auto ? "ตั้งค่า & เปิด AI-auto" : "ตั้งค่า"} · ${L(q.title)}` }, asset: q.asset, severity: "advisory", capex: 0, annualSaving: q.savingYr, partsCount: 0 }, "energy");
    setDoneQw((s) => new Set(s).add(q.id));
  };
  const setStatus = (name: string, status: "active" | "pending" | "suggested") => setActs((p) => p.map((a) => (a.name.en === name ? { ...a, status } : a)));

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
              <p className="text-[10.5px] text-white/45">{vortiqQuickWins.length} {L({ en: "actions · ฿0 capex", th: "รายการ · ลงทุน ฿0" })}</p>
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
              const n = id === "all" ? vortiqQuickWins.length : vortiqQuickWins.filter((q) => (doneQw.has(q.id) || hasWO(q.id)) === (id === "done")).length;
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
          {vortiqQuickWins.filter((q) => qwFilter === "all" || (doneQw.has(q.id) || hasWO(q.id)) === (qwFilter === "done")).map((q) => {
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
                <span className="mt-2 flex items-center justify-center gap-1 text-[10.5px] font-medium text-emerald-300">{on ? L({ en: "Hide detail", th: "ซ่อนรายละเอียด" }) : L({ en: "How to do it", th: "ดูวิธีทำ" })} <ChevronDown size={12} className={cn("transition-transform", on && "rotate-180")} /></span>
              </div>
            );
          })}
        </div>
        <AnimatePresence initial={false}>
          {qwSel ? (() => {
            const q = vortiqQuickWins.find((x) => x.id === qwSel)!;
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
                    <p className="mb-3 flex items-center gap-1.5 rounded-lg border border-indigo-400/25 bg-indigo-400/[0.06] px-2.5 py-1.5 text-[11px] text-indigo-200"><Bot size={12} className="shrink-0" /> {L({ en: "AI will apply and hold this configuration automatically under guardrails — override anytime.", th: "AI จะตั้งค่าและคุมให้อัตโนมัติภายใต้ guardrail — ปรับเองได้ทุกเมื่อ" })}</p>
                  ) : null}
                  {/* how to do it — a simple checklist */}
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300"><Rocket size={12} /> {L({ en: "How to do it", th: "วิธีทำ" })}</p>
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-2 text-[12px] leading-relaxed text-white/75"><ArrowRight size={12} className="mt-0.5 shrink-0 text-emerald-400" /> {L(q.how)}</li>
                      <li className="flex items-start gap-2 text-[12px] leading-relaxed text-white/75"><ArrowRight size={12} className="mt-0.5 shrink-0 text-emerald-400" /> {L({ en: "No hardware — configuration only", th: "ไม่ต้องมีฮาร์ดแวร์ — ตั้งค่าอย่างเดียว" })} · {L(q.effort)}</li>
                      <li className="flex items-start gap-2 text-[12px] leading-relaxed text-white/75"><ArrowRight size={12} className="mt-0.5 shrink-0 text-emerald-400" /> {L({ en: "Recovers", th: "กู้คืนได้" })} <b className="tabular text-emerald-300">{formatTHB(q.savingYr)}/{L({ en: "yr", th: "ปี" })}</b> {L({ en: "at ฿0 capex", th: "โดยไม่ต้องลงทุน" })}</li>
                    </ul>
                  </div>
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
              const n = id === "all" ? vortiqCapitalProjects.length : vortiqCapitalProjects.filter((c) => c.severity === id).length;
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
          {vortiqCapitalProjects.filter((c) => capSev === "all" || c.severity === capSev).map((c) => {
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
                      <span className="shrink-0 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9.5px] font-semibold tabular text-white/55">{c.code}</span>
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
                            <span><span className="font-medium text-white/55">{L({ en: "Evidence", th: "หลักฐานที่เจอ" })}</span> · {L(c.evidence)} <span className="text-white/30">· {L({ en: "from the flow/pressure meters + air-audit", th: "จากมิเตอร์ไหล/ความดัน + ผลออดิทลม" })}</span></span>
                          </div>
                        </div>
                        {/* expected result if the project is done */}
                        <div className="mb-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3">
                          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300"><TrendingUp size={12} /> {L({ en: "If you do it — the result", th: "ถ้าทำ — ผลลัพธ์" })}</div>
                          <ul className="space-y-1">
                            <li className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-white/75"><ArrowRight size={11} className="mt-0.5 shrink-0 text-emerald-400" /> {L(c.outcome)}</li>
                          </ul>
                        </div>
                        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300"><Package size={12} /> {L({ en: "Bill of materials", th: "รายการอะไหล่ (BOM)" })}</div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[520px] text-left text-[11.5px]">
                            <thead><tr className="border-b border-white/10 text-[9.5px] uppercase tracking-wide text-white/40">
                              <th className="py-1.5 pr-2 font-medium">{L({ en: "Part", th: "อะไหล่" })}</th>
                              <th className="px-2 py-1.5 font-medium">{L({ en: "Brand", th: "แบรนด์" })}</th>
                              <th className="px-2 py-1.5 font-medium">{L({ en: "Part No.", th: "Part No." })}</th>
                              <th className="px-2 py-1.5 text-center font-medium">{L({ en: "Qty", th: "จำนวน" })}</th>
                              <th className="px-2 py-1.5 text-right font-medium">{L({ en: "Total", th: "รวม" })}</th>
                            </tr></thead>
                            <tbody className="tabular">
                              {c.parts.map((p, i) => (
                                <tr key={i} className="border-b border-white/5">
                                  <td className="py-2 pr-2 font-medium text-white/85">{L(p.name)}</td>
                                  <td className="px-2 py-2 text-white/60">{p.brand}</td>
                                  <td className="whitespace-nowrap px-2 py-2 font-mono text-[10.5px] text-brand-200">{p.partNo}</td>
                                  <td className="px-2 py-2 text-center text-white/60">{p.qty}</td>
                                  <td className="px-2 py-2 text-right text-white/80">{formatTHB(p.qty * p.unitPrice)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="tabular text-[11px]">
                              <tr><td colSpan={4} className="py-1.5 pr-2 text-right text-white/45">{L({ en: "Parts subtotal", th: "รวมค่าอะไหล่" })}</td><td className="px-2 py-1.5 text-right text-white/70">{formatTHB(partsSum)}</td></tr>
                              {install > 0 ? <tr><td colSpan={4} className="py-1.5 pr-2 text-right text-white/45">{L({ en: "Install & commissioning", th: "ติดตั้ง & คอมมิชชัน" })}</td><td className="px-2 py-1.5 text-right text-white/70">{formatTHB(install)}</td></tr> : null}
                              <tr><td colSpan={4} className="py-1.5 pr-2 text-right text-[12px] font-semibold text-white/70">{L({ en: "Total budget", th: "งบรวม" })}</td><td className="px-2 py-1.5 text-right text-[12px] font-bold text-amber-300">{formatTHB(c.capex)}</td></tr>
                            </tfoot>
                          </table>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span className="chip text-white/50"><Package size={11} /> {c.parts.length} {L({ en: "line items", th: "รายการ" })}</span>
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

      {/* Autonomous Actions — AI runs these guardrailed loops on the air system */}
      <Panel title={L({ en: "Autonomous Actions", th: "การสั่งงานอัตโนมัติ" })} icon={Bot} right={<span className="chip"><Wrench size={11} /> {L({ en: "guardrailed", th: "มี guardrail" })}</span>}>
        <ul className="space-y-2.5">
          {acts.map((a) => {
            const m = A_STYLE[a.status];
            return (
              <li key={a.name.en} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{L(a.name)}</p>
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium", m.cls)}><span className={cn("h-1.5 w-1.5 rounded-full", m.dot, a.status === "active" && "animate-pulse")} />{L(m.label)}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-white/55">{L(a.desc)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold tabular text-emerald-300">{a.impact}</span>
                  {a.status === "active" ? (
                    <button onClick={() => setStatus(a.name.en, "pending")} className="btn border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"><Pause size={13} /> {L({ en: "Pause", th: "พัก" })}</button>
                  ) : (
                    <motion.button whileTap={{ scale: 0.96 }} onClick={() => setStatus(a.name.en, "active")} className="btn-glow px-3 py-1.5 text-xs">{a.status === "pending" ? <Check size={13} /> : <Play size={13} />}{a.status === "pending" ? L({ en: "Approve", th: "อนุมัติ" }) : L({ en: "Enable", th: "เปิดใช้" })}</motion.button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      {quoteFor ? <QuoteEmailModal project={quoteFor} L={L} onClose={() => setQuoteFor(null)} onSent={() => setQuoteSent((s) => new Set(s).add(quoteFor.id))} /> : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── 05 report ── */

const REPORT_PERIOD: Record<"today" | "month", LZ> = {
  today: { en: "12 July 2026", th: "12 กรกฎาคม 2026" },
  month: { en: "July 2026", th: "กรกฎาคม 2026" },
};

const SECTION_DEFS: { key: "air" | "leaks" | "cost" | "actions" | "mv"; title: LZ; sub: LZ }[] = [
  { key: "air", title: { en: "Air KPIs", th: "ตัวชี้วัดลมอัด" }, sub: { en: "pressure · flow · specific power", th: "ความดัน · ไหล · กำลังจำเพาะ" } },
  { key: "leaks", title: { en: "Leak Survey", th: "สำรวจจุดรั่ว" }, sub: { en: "ranked ฿ leak points", th: "จุดรั่วเรียงตาม ฿" } },
  { key: "cost", title: { en: "Cost of Poor Air", th: "ต้นทุนลมที่จัดการไม่ดี" }, sub: { en: "where the budget bleeds", th: "งบรั่วไหลไปไหน" } },
  { key: "actions", title: { en: "Recommended Actions", th: "แนวทางแก้ไข" }, sub: { en: "zero-invest + capital", th: "แก้ฟรี + โครงการลงทุน" } },
  { key: "mv", title: { en: "Measurement & Verification", th: "การวัดและพิสูจน์ผล" }, sub: { en: "planned vs verified", th: "แผนเทียบผลจริง" } },
];

/** The five air KPIs shown on the report's summary (matches the Monitor step band). */
const AIR_KPIS: { label: LZ; value: string; unit: string }[] = [
  { label: { en: "Pressure", th: "ความดัน" }, value: "7.2", unit: "bar" },
  { label: { en: "Flow", th: "อัตราไหล" }, value: "1,240", unit: "cfm" },
  { label: { en: "Specific power", th: "กำลังจำเพาะ" }, value: "19.4", unit: "kW/100cfm" },
  { label: { en: "Leak", th: "ลมรั่ว" }, value: "32", unit: "% of air" },
];

/** The report renders as a light "printed page" in BOTH app themes — the document looks the
 *  same on screen as on paper — so it uses explicit colors, not the theme-remapped utility
 *  classes. The very same inline styles ride into the PDF via the node's outerHTML. */
const PAPER = { bg: "#ffffff", ink: "#0f172a", body: "#334155", muted: "#64748b", faint: "#94a3b8", line: "#e2e8f0", soft: "#f1f5f9", brand: "#0e7490" };
const RPT_SEV_HEX: Record<string, string> = { critical: "#e11d48", warning: "#d97706", recommend: "#0891b2" };

type ReportPaperProps = { L: (o: LZ) => string; range: "today" | "month"; sec: Record<string, boolean>; genAt: string };

/** The document itself — a self-contained light page. All styling is inline so the exact
 *  rendered DOM (`node.outerHTML`) prints faithfully to PDF without any external CSS. */
const ReportPaper = forwardRef<HTMLDivElement, ReportPaperProps>(function ReportPaper({ L, range, sec, genAt }, ref) {
  const period = L(REPORT_PERIOD[range]);
  const verified = mv.reduce((s, m) => s + m.verified, 0);
  const qwTotal = vortiqQuickWins.reduce((s, q) => s + q.savingYr, 0);

  const thS: CSSProperties = { textAlign: "left", padding: "7px 8px", background: PAPER.soft, color: PAPER.muted, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${PAPER.line}`, whiteSpace: "nowrap" };
  const tdS: CSSProperties = { padding: "7px 8px", color: PAPER.body, borderBottom: `1px solid ${PAPER.soft}`, verticalAlign: "top" };
  const tdNum: CSSProperties = { ...tdS, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700 };
  const tableS: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 11.5 };
  const wrapS: CSSProperties = { padding: "16px 26px", borderTop: `1px solid ${PAPER.line}` };

  const meta = (k: string, v: string) => <div style={{ marginBottom: 3 }}><span style={{ color: PAPER.faint }}>{k}: </span><span style={{ color: PAPER.ink, fontWeight: 600 }}>{v}</span></div>;
  const kpi = (label: string, value: string, unit: string, color: string) => (
    <div style={{ border: `1px solid ${PAPER.line}`, borderRadius: 9, padding: "9px 11px", background: "#fff" }}>
      <div style={{ fontSize: 9.5, color: PAPER.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span style={{ fontSize: 21, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{value}</span>
        <span style={{ fontSize: 10.5, color: PAPER.faint, fontWeight: 600 }}>{unit}</span>
      </div>
    </div>
  );
  let n = 0;
  const secHead = (title: string, sub: string) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 10 }}>
      <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: PAPER.brand }}>{String(++n).padStart(2, "0")}</span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: PAPER.ink }}>{title}</span>
      <span style={{ fontSize: 10.5, color: PAPER.muted }}>· {sub}</span>
    </div>
  );

  return (
    <div ref={ref} style={{ width: "100%", background: PAPER.bg, color: PAPER.body, fontFamily: "'Sarabun','Segoe UI',system-ui,-apple-system,sans-serif", fontSize: 12 }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, padding: "20px 26px", borderBottom: `2px solid ${PAPER.brand}` }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-grid", placeItems: "center", width: 26, height: 26, borderRadius: 7, background: PAPER.brand, color: "#fff", fontWeight: 800, fontSize: 13 }}>S</span>
            <span style={{ fontWeight: 800, color: PAPER.ink, fontSize: 14 }}>SpareX <span style={{ color: PAPER.brand }}>FactoryOS</span></span>
          </div>
          <h1 style={{ margin: "12px 0 2px", fontSize: 20, fontWeight: 800, color: PAPER.ink }}>{L({ en: "Compressed-Air System Report", th: "รายงานระบบลมอัด" })}</h1>
          <div style={{ color: PAPER.muted, fontSize: 11.5 }}>{L({ en: "leaks · pressure · specific power — plant air", th: "ลมรั่ว · ความดัน · กำลังจำเพาะ — ระบบลมทั้งโรงงาน" })}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11 }}>
          {meta(L({ en: "Period", th: "ช่วงเวลา" }), period)}
          {meta(L({ en: "Plant", th: "โรงงาน" }), "SpareX Demo Plant")}
          {meta(L({ en: "Generated", th: "ออกรายงาน" }), genAt || period)}
          {meta(L({ en: "Standards", th: "มาตรฐาน" }), "ISO 11011 · air-system assessment")}
        </div>
      </div>

      {/* exec summary */}
      <div style={{ padding: "16px 26px", background: "#fbfdff" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: PAPER.brand, marginBottom: 9 }}>{L({ en: "Executive summary", th: "บทสรุปผู้บริหาร" })}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 9 }}>
          {kpi(L({ en: "Specific power · MTD", th: "กำลังจำเพาะ · เดือนนี้" }), "19.4", "kW/100cfm", "#d97706")}
          {kpi(L({ en: "Air cost · MTD", th: "ค่าลม · เดือนนี้" }), "฿346K", "", PAPER.brand)}
          {kpi(L({ en: "Leak loss · MTD", th: "ลมรั่ว · เดือนนี้" }), "฿42K", "", "#e11d48")}
          {kpi(L({ en: "Energy · MTD", th: "พลังงาน · เดือนนี้" }), "135,000", "kWh", "#059669")}
        </div>
        <p style={{ margin: "11px 0 0", color: PAPER.body, fontSize: 12, lineHeight: 1.55 }}>
          {L({
            en: "The ring main ran at 7.2 bar — 0.7 bar over the 6.5 setpoint — at 19.4 kW/100cfm against a 17.5 nameplate. Leaks account for 32% of generated air (≈฿506K/yr); the fastest zero-invest relief is trimming pressure and closing the top three tagged leaks.",
            th: "ท่อวงแหวนเดินที่ 7.2 bar — เกิน setpoint 6.5 อยู่ 0.7 bar — ที่ 19.4 kW/100cfm เทียบค่าป้าย 17.5 ลมรั่วคิดเป็น 32% ของลมที่ผลิต (≈฿506K/ปี) แก้เร็วสุดแบบไม่ลงทุนคือลดความดันและอุดลมรั่ว 3 จุดใหญ่",
          })}
        </p>
      </div>

      {/* 01 · air KPIs */}
      {sec.air && (
        <div style={wrapS}>
          {secHead(L({ en: "Air KPIs", th: "ตัวชี้วัดลมอัด" }), L({ en: "the system band & every compressor", th: "ค่าระบบ + คอมเพรสเซอร์ทุกตัว" }))}
          <table style={{ ...tableS, marginBottom: 14 }}>
            <thead><tr>{AIR_KPIS.map((p, i) => <th key={i} style={{ ...thS, textAlign: "center" }}>{L(p.label)}</th>)}</tr></thead>
            <tbody><tr>{AIR_KPIS.map((p, i) => <td key={i} style={{ ...tdS, textAlign: "center", fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: 15, color: PAPER.ink }}>{p.value}<span style={{ fontSize: 9.5, color: PAPER.faint, fontWeight: 600 }}> {p.unit}</span></td>)}</tr></tbody>
          </table>
          <table style={tableS}>
            <thead><tr>{[L({ en: "Compressor", th: "คอมเพรสเซอร์" }), L({ en: "Type", th: "ชนิด" }), L({ en: "Status", th: "สถานะ" }), L({ en: "Load", th: "โหลด" }), L({ en: "kW/100cfm", th: "kW/100cfm" })].map((h, i) => <th key={i} style={{ ...thS, textAlign: i >= 3 ? "right" : "left" }}>{h}</th>)}</tr></thead>
            <tbody>
              {compressors.map((c) => (
                <tr key={c.id}>
                  <td style={{ ...tdS, fontWeight: 700, color: PAPER.ink }}>{c.name} · {c.kw} kW</td>
                  <td style={tdS}>{c.type}</td>
                  <td style={tdS}>{L(COMP_STYLE[c.status].label)}</td>
                  <td style={{ ...tdNum, color: PAPER.muted, fontWeight: 600 }}>{c.loadPct}%</td>
                  <td style={{ ...tdNum, color: c.specPower === 0 ? PAPER.faint : c.specPower > NAMEPLATE_SPEC ? "#d97706" : "#059669" }}>{c.specPower > 0 ? c.specPower : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 02 · leak survey */}
      {sec.leaks && (
        <div style={wrapS}>
          {secHead(L({ en: "Leak Survey", th: "สำรวจจุดรั่ว" }), L({ en: "where the ฿ leaks out the ring main", th: "เงินรั่วออกท่อวงแหวนตรงไหน" }))}
          <table style={tableS}>
            <thead><tr>{[L({ en: "Location", th: "จุด" }), L({ en: "Flow", th: "อัตราไหล" }), L({ en: "Cost/yr", th: "ต้นทุน/ปี" })].map((h, i) => <th key={i} style={{ ...thS, textAlign: i >= 1 ? "right" : "left" }}>{h}</th>)}</tr></thead>
            <tbody>
              {leaks.map((l) => (
                <tr key={l.location.en}>
                  <td style={{ ...tdS, color: PAPER.ink }}>{L(l.location)}</td>
                  <td style={{ ...tdNum, color: PAPER.muted }}>{l.cfm} cfm</td>
                  <td style={{ ...tdNum, color: "#e11d48" }}>{formatTHB(l.thbYr)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...tdS, fontWeight: 700, color: PAPER.ink }}>{L({ en: "Total tagged leaks", th: "รวมจุดรั่วที่แท็กไว้" })}</td>
                <td style={{ ...tdNum, color: PAPER.muted }}>{leaks.reduce((s, l) => s + l.cfm, 0)} cfm</td>
                <td style={{ ...tdNum, color: "#e11d48" }}>{formatTHB(LEAK_TOTAL_YR)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 03 · cost of poor air */}
      {sec.cost && (
        <div style={wrapS}>
          {secHead(L({ en: "Cost of Poor Compressed Air", th: "ต้นทุนของลมอัดที่จัดการไม่ดี" }), L({ en: "where the air budget bleeds", th: "งบค่าลมรั่วไหลไปไหน" }))}
          <table style={tableS}>
            <thead><tr>{[L({ en: "Source", th: "ที่มา" }), L({ en: "Cost/yr", th: "ต้นทุน/ปี" })].map((h, i) => <th key={i} style={{ ...thS, textAlign: i >= 1 ? "right" : "left" }}>{h}</th>)}</tr></thead>
            <tbody>
              {poorAirCost.map((p) => (
                <tr key={p.name.en}>
                  <td style={{ ...tdS, color: PAPER.ink }}>{L(p.name)}</td>
                  <td style={{ ...tdNum, color: "#d97706" }}>{formatTHB(p.thbYr)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...tdS, fontWeight: 700, color: PAPER.ink }}>{L({ en: "Total addressable", th: "รวมที่แก้ไขได้" })}</td>
                <td style={{ ...tdNum, color: "#e11d48" }}>{formatTHB(poorAirCost.reduce((s, p) => s + p.thbYr, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 04 · recommended actions */}
      {sec.actions && (
        <div style={wrapS}>
          {secHead(L({ en: "Recommended Actions", th: "แนวทางแก้ไข" }), L({ en: "fix free first, then invest", th: "แก้ฟรีก่อน แล้วค่อยลงทุน" }))}
          <div style={{ fontWeight: 700, color: PAPER.ink, fontSize: 12, margin: "0 0 6px" }}>{L({ en: "Part 1 · Zero-invest quick wins", th: "ส่วนที่ 1 · แก้ฟรี ไม่ต้องลงทุน" })} <span style={{ color: "#059669" }}>· {formatTHB(qwTotal)}/{L({ en: "yr", th: "ปี" })}</span></div>
          <table style={{ ...tableS, marginBottom: 14 }}>
            <thead><tr>{[L({ en: "Action", th: "สิ่งที่ทำ" }), L({ en: "Asset", th: "จุด" }), L({ en: "Saving/yr", th: "ประหยัด/ปี" }), L({ en: "Effort", th: "แรงที่ใช้" })].map((h, i) => <th key={i} style={{ ...thS, textAlign: i === 2 ? "right" : "left" }}>{h}</th>)}</tr></thead>
            <tbody>{vortiqQuickWins.map((q) => (
              <tr key={q.id}>
                <td style={{ ...tdS, fontWeight: 600, color: PAPER.ink }}>{L(q.title)}</td>
                <td style={{ ...tdS, color: PAPER.muted }}>{L(q.asset)}</td>
                <td style={{ ...tdNum, color: "#059669" }}>{formatTHB(q.savingYr)}</td>
                <td style={{ ...tdS, color: PAPER.muted }}>{L(q.effort)}</td>
              </tr>
            ))}</tbody>
          </table>
          <div style={{ fontWeight: 700, color: PAPER.ink, fontSize: 12, margin: "0 0 6px" }}>{L({ en: "Part 2 · Capital projects", th: "ส่วนที่ 2 · โครงการลงทุน" })}</div>
          <table style={tableS}>
            <thead><tr>{[L({ en: "Code", th: "รหัส" }), L({ en: "Project", th: "โครงการ" }), L({ en: "Capex", th: "เงินลงทุน" }), L({ en: "Saving/yr", th: "ประหยัด/ปี" }), L({ en: "Payback", th: "คืนทุน" })].map((h, i) => <th key={i} style={{ ...thS, textAlign: i >= 2 ? "right" : "left" }}>{h}</th>)}</tr></thead>
            <tbody>{vortiqCapitalProjects.map((c) => {
              const sc = RPT_SEV_HEX[c.severity] ?? PAPER.brand;
              return (
                <tr key={c.id}>
                  <td style={{ ...tdS, fontFamily: "monospace", fontWeight: 700, color: sc }}>{c.code}</td>
                  <td style={{ ...tdS, color: PAPER.ink }}>{L(c.title)}</td>
                  <td style={tdNum}>{formatTHB(c.capex)}</td>
                  <td style={{ ...tdNum, color: "#059669" }}>{formatTHB(c.savingYr)}</td>
                  <td style={{ ...tdNum, color: PAPER.muted }}>{c.paybackMo} {L({ en: "mo", th: "ด." })}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      {/* 05 · M&V */}
      {sec.mv && (
        <div style={wrapS}>
          {secHead(L({ en: "Measurement & Verification", th: "การวัดและพิสูจน์ผล (M&V)" }), L({ en: "planned savings vs verified", th: "ที่วางแผนเทียบที่ยืนยันแล้ว" }))}
          <table style={tableS}>
            <thead><tr>{[L({ en: "Action", th: "การดำเนินการ" }), L({ en: "Planned", th: "แผน" }), L({ en: "Verified", th: "ยืนยันแล้ว" }), "Δ%"].map((h, i) => <th key={i} style={{ ...thS, textAlign: i >= 1 ? "right" : "left" }}>{h}</th>)}</tr></thead>
            <tbody>
              {mv.map((m) => {
                const delta = Math.round((m.verified / m.planned - 1) * 100);
                return (
                  <tr key={m.action.en}>
                    <td style={{ ...tdS, color: PAPER.ink }}>{L(m.action)}</td>
                    <td style={{ ...tdNum, color: PAPER.muted }}>{formatTHB(m.planned)}</td>
                    <td style={{ ...tdNum, color: "#059669" }}>{formatTHB(m.verified)}</td>
                    <td style={{ ...tdNum, color: delta >= 0 ? "#059669" : "#d97706" }}>{delta >= 0 ? "+" : ""}{delta}%</td>
                  </tr>
                );
              })}
              <tr>
                <td style={{ ...tdS, fontWeight: 700, color: PAPER.ink }}>{L({ en: "Total verified", th: "รวมที่ยืนยันแล้ว" })}</td>
                <td style={tdS}></td>
                <td style={{ ...tdNum, color: "#059669" }}>{formatTHB(verified)}</td>
                <td style={tdS}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* footer */}
      <div style={{ padding: "12px 26px", borderTop: `1px solid ${PAPER.line}`, color: PAPER.faint, fontSize: 10, display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span>{L({ en: "Every figure traces to the flow/pressure meters & the air audit — no estimates.", th: "ทุกตัวเลขตรวจย้อนถึงมิเตอร์ไหล/ความดัน & ผลออดิทลม — ไม่มีการประมาณ" })}</span>
        <span style={{ whiteSpace: "nowrap" }}>SpareX FactoryOS · Vortiq</span>
      </div>
    </div>
  );
});

function ReportStep({ L }: { L: (o: LZ) => string }) {
  const { locale } = useI18n();
  const [range, setRange] = useState<"today" | "month">("month");
  const [sec, setSec] = useState<Record<string, boolean>>({ air: true, leaks: true, cost: true, actions: true, mv: true });
  const [genAt, setGenAt] = useState("");
  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // client-only stamp so it never trips hydration; a real "generated at" time for the report
    const d = new Date();
    setGenAt(d.toLocaleString(locale === "th" ? "th-TH" : "en-GB", { dateStyle: "medium", timeStyle: "short" }));
  }, [locale]);

  /** PDF export — the preview's own DOM is dropped into a hidden iframe and printed, so what
   *  you see is exactly what saves. Inline paper styles mean no stylesheet needs to travel. */
  const printReport = () => {
    const node = reportRef.current;
    if (!node) return;
    // print via a hidden iframe — reliable even when pop-ups are blocked (window.open usually is)
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) { iframe.remove(); return; }
    doc.open();
    doc.write(
      `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>SpareX · Compressed-Air System Report</title>` +
      `<style>@page{size:A4;margin:11mm}html,body{margin:0;background:#fff;font-family:'Sarabun','Segoe UI',system-ui,-apple-system,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}*{box-sizing:border-box}table{page-break-inside:auto}tr{page-break-inside:avoid}</style>` +
      `</head><body>${node.outerHTML}</body></html>`,
    );
    doc.close();
    // give the iframe a tick to lay out its content, then open the print dialog
    setTimeout(() => {
      const win = iframe.contentWindow;
      if (!win) { iframe.remove(); return; }
      win.focus();
      win.print();
      setTimeout(() => iframe.remove(), 1000);
    }, 350);
  };

  /** Excel export — an .xls (SpreadsheetML-flavoured HTML) so Thai text and real cell tables
   *  open straight in Excel. Only the tabular sections the user kept switched on are written. */
  const downloadExcel = () => {
    const esc = (s: unknown) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const th = (t: string) => `<th style="background:#0e7490;color:#fff;padding:6px 9px;text-align:left;border:1px solid #0b5566">${esc(t)}</th>`;
    const td = (t: unknown) => `<td style="padding:5px 9px;border:1px solid #d8dee6">${esc(t)}</td>`;
    const period = L(REPORT_PERIOD[range]);
    const tbl = "border-collapse:collapse;font-family:Tahoma,sans-serif;font-size:12px";
    let body = `<h2 style="font-family:Tahoma;margin:0 0 4px">${esc(L({ en: "Compressed-Air System Report", th: "รายงานระบบลมอัด" }))}</h2>`;
    body += `<p style="font-family:Tahoma;font-size:12px;color:#475569;margin:0 0 12px">${esc(L({ en: "Plant", th: "โรงงาน" }))}: SpareX Demo Plant &nbsp;|&nbsp; ${esc(L({ en: "Period", th: "ช่วงเวลา" }))}: ${esc(period)} &nbsp;|&nbsp; ISO 11011</p>`;

    if (sec.air) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "Air KPIs", th: "ตัวชี้วัดลมอัด" }))}</h3><table style="${tbl}"><tr>${AIR_KPIS.map((p) => th(L(p.label))).join("")}</tr><tr>${AIR_KPIS.map((p) => td(p.value + " " + p.unit)).join("")}</tr></table><br/>`;
      body += `<table style="${tbl}"><tr>${[L({ en: "Compressor", th: "คอมเพรสเซอร์" }), L({ en: "Type", th: "ชนิด" }), L({ en: "Status", th: "สถานะ" }), L({ en: "Load", th: "โหลด" }), "kW/100cfm"].map(th).join("")}</tr>`;
      compressors.forEach((c) => { body += `<tr>${td(c.name + " · " + c.kw + " kW")}${td(c.type)}${td(L(COMP_STYLE[c.status].label))}${td(c.loadPct + "%")}${td(c.specPower > 0 ? c.specPower : "—")}</tr>`; });
      body += `</table><br/>`;
    }
    if (sec.leaks) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "Leak Survey", th: "สำรวจจุดรั่ว" }))}</h3><table style="${tbl}"><tr>${[L({ en: "Location", th: "จุด" }), L({ en: "Flow (cfm)", th: "อัตราไหล (cfm)" }), L({ en: "Cost/yr", th: "ต้นทุน/ปี" })].map(th).join("")}</tr>`;
      leaks.forEach((l) => { body += `<tr>${td(L(l.location))}${td(l.cfm)}${td(formatTHB(l.thbYr))}</tr>`; });
      body += `<tr>${td(L({ en: "Total", th: "รวม" }))}${td(leaks.reduce((s, l) => s + l.cfm, 0))}${td(formatTHB(LEAK_TOTAL_YR))}</tr></table><br/>`;
    }
    if (sec.cost) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "Cost of Poor Compressed Air", th: "ต้นทุนของลมอัดที่จัดการไม่ดี" }))}</h3><table style="${tbl}"><tr>${[L({ en: "Source", th: "ที่มา" }), L({ en: "Cost/yr", th: "ต้นทุน/ปี" })].map(th).join("")}</tr>`;
      poorAirCost.forEach((p) => { body += `<tr>${td(L(p.name))}${td(formatTHB(p.thbYr))}</tr>`; });
      body += `<tr>${td(L({ en: "Total addressable", th: "รวมที่แก้ไขได้" }))}${td(formatTHB(poorAirCost.reduce((s, p) => s + p.thbYr, 0)))}</tr></table><br/>`;
    }
    if (sec.actions) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "Recommended Actions — zero-invest", th: "แนวทางแก้ไข — แก้ฟรี" }))}</h3><table style="${tbl}"><tr>${[L({ en: "Action", th: "สิ่งที่ทำ" }), L({ en: "Asset", th: "จุด" }), L({ en: "Saving/yr", th: "ประหยัด/ปี" }), L({ en: "Effort", th: "แรงที่ใช้" })].map(th).join("")}</tr>`;
      vortiqQuickWins.forEach((q) => { body += `<tr>${td(L(q.title))}${td(L(q.asset))}${td(formatTHB(q.savingYr))}${td(L(q.effort))}</tr>`; });
      body += `</table><br/><h3 style="font-family:Tahoma">${esc(L({ en: "Recommended Actions — capital", th: "แนวทางแก้ไข — โครงการลงทุน" }))}</h3><table style="${tbl}"><tr>${[L({ en: "Code", th: "รหัส" }), L({ en: "Project", th: "โครงการ" }), L({ en: "Capex", th: "เงินลงทุน" }), L({ en: "Saving/yr", th: "ประหยัด/ปี" }), L({ en: "Payback (mo)", th: "คืนทุน (เดือน)" })].map(th).join("")}</tr>`;
      vortiqCapitalProjects.forEach((c) => { body += `<tr>${td(c.code)}${td(L(c.title))}${td(formatTHB(c.capex))}${td(formatTHB(c.savingYr))}${td(c.paybackMo)}</tr>`; });
      body += `</table><br/>`;
    }
    if (sec.mv) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "Measurement & Verification", th: "การวัดและพิสูจน์ผล (M&V)" }))}</h3><table style="${tbl}"><tr>${[L({ en: "Action", th: "การดำเนินการ" }), L({ en: "Planned", th: "แผน" }), L({ en: "Verified", th: "ยืนยันแล้ว" }), "Delta %"].map(th).join("")}</tr>`;
      mv.forEach((m) => { const delta = Math.round((m.verified / m.planned - 1) * 100); body += `<tr>${td(L(m.action))}${td(formatTHB(m.planned))}${td(formatTHB(m.verified))}${td((delta >= 0 ? "+" : "") + delta + "%")}</tr>`; });
      body += `</table>`;
    }
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Compressed Air Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>${body}</body></html>`;
    const blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `SpareX-CompressedAir-Report-${range}.xls`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[300px_1fr]">
      {/* report builder */}
      <div className="panel space-y-5 p-5 xl:sticky xl:top-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-brand-400/30 bg-brand-400/10 text-brand-300"><SlidersHorizontal size={16} /></span>
          <div><h3 className="text-sm font-semibold text-white">{L({ en: "Build report", th: "สร้างรายงาน" })}</h3><p className="text-[11px] text-white/45">{L({ en: "pick range & sections", th: "เลือกช่วงเวลาและหัวข้อ" })}</p></div>
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-white/40">{L({ en: "Time range", th: "ช่วงเวลา" })}</label>
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
            {(["today", "month"] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)} className={cn("rounded-md px-2 py-1.5 text-[12px] font-medium transition", range === r ? "bg-brand-400/20 text-brand-100" : "text-white/50 hover:text-white/80")}>
                {r === "today" ? L({ en: "Today", th: "วันนี้" }) : L({ en: "This month", th: "เดือนนี้" })}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-white/40">{L({ en: "Sections", th: "หัวข้อในรายงาน" })}</label>
          <div className="mt-2 space-y-1.5">
            {SECTION_DEFS.map((s) => (
              <button key={s.key} onClick={() => setSec((v) => ({ ...v, [s.key]: !v[s.key] }))} className="flex w-full items-center gap-2.5 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2 text-left transition hover:bg-white/[0.04]">
                <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", sec[s.key] ? "bg-brand-400/70" : "bg-white/15")}>
                  <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", sec[s.key] ? "left-[18px]" : "left-0.5")} />
                </span>
                <span className="min-w-0"><span className="block text-[12px] font-medium text-white/80">{L(s.title)}</span><span className="block text-[10.5px] text-white/40">{L(s.sub)}</span></span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-white/10 pt-4">
          <button onClick={printReport} className="btn-glow w-full justify-center py-2.5 text-[13px]"><Printer size={15} /> {L({ en: "Download PDF", th: "ดาวน์โหลด PDF" })}</button>
          <button onClick={downloadExcel} className="btn-ghost w-full justify-center py-2 text-[13px]"><FileSpreadsheet size={15} /> {L({ en: "Download Excel", th: "ดาวน์โหลด Excel" })}</button>
          <p className="text-center text-[10.5px] leading-relaxed text-white/35">{L({ en: "PDF opens your print dialog · Excel is an .xls file", th: "PDF เปิดหน้าต่างพิมพ์ · Excel เป็นไฟล์ .xls" })}</p>
        </div>
      </div>

      {/* live paper preview — identical to the exported PDF */}
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-white/40"><FileText size={13} /> {L({ en: "Live preview — exactly what downloads", th: "ตัวอย่างจริง — ตรงกับไฟล์ที่ดาวน์โหลด" })}</div>
        <div className="overflow-hidden rounded-2xl border border-white/10" style={{ boxShadow: "0 24px 70px rgba(0,0,0,0.45)" }}>
          <ReportPaper ref={reportRef} L={L} range={range} sec={sec} genAt={genAt} />
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── small parts ── */

const A_STYLE: Record<"active" | "pending" | "suggested", { cls: string; dot: string; label: LZ }> = {
  active: { cls: "border-status-ok/30 bg-status-ok/10 text-emerald-300", dot: "bg-status-ok", label: { en: "Running", th: "ทำงานอยู่" } },
  pending: { cls: "border-status-warn/30 bg-status-warn/10 text-amber-300", dot: "bg-status-warn", label: { en: "Pending approval", th: "รออนุมัติ" } },
  suggested: { cls: "border-white/15 bg-white/5 text-white/60", dot: "bg-white/40", label: { en: "Suggested", th: "แนะนำ" } },
};

function Panel({ title, sub, icon: Icon, right, children }: { title: string; sub?: string; icon: LucideIcon; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-brand-400/25 bg-brand-400/10 text-brand-300"><Icon size={17} /></span>
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

function Callout({ tone, icon: Icon, big, label, note }: { tone: "warn" | "crit" | "ok"; icon: LucideIcon; big: string; label: string; note: string }) {
  const c = tone === "crit" ? "#f43f5e" : tone === "warn" ? "#f59e0b" : "#34d399";
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: `${c}33`, backgroundColor: `${c}0d` }}>
      <span className="grid h-9 w-9 place-items-center rounded-xl border" style={{ color: c, borderColor: `${c}44`, backgroundColor: `${c}14` }}><Icon size={17} /></span>
      <p className="mt-3 text-2xl font-semibold tabular" style={{ color: c }}>{big}</p>
      <p className="text-[12px] font-medium text-white/75">{label}</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-white/50">{note}</p>
    </div>
  );
}
