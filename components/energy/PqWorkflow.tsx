"use client";

import { useEffect, useRef, useState, forwardRef, type ReactNode, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Waves, BarChart3, Sparkles, Bot, FileText, Zap, Gauge,
  AlertTriangle, Check, Plus, Download, ArrowRight, Target, Wrench,
  ShieldCheck, Triangle, Cpu, ChevronDown, TrendingUp, Clock, Coins,
  Rocket, Wallet, Package, Send, Paperclip, X, Printer, FileSpreadsheet,
  SlidersHorizontal, type LucideIcon,
} from "lucide-react";
import { currentUser, SPAREX_SALES_EMAIL } from "@/lib/user";
import { useI18n } from "@/lib/i18n";
import { WorkflowBar } from "@/components/os/WorkflowNav";
import { PqSingleLineDiagram } from "./PqSingleLineDiagram";
import { KpiCard } from "@/components/os/KpiCard";
import { Icon3D } from "@/components/os/Icon3D";
import { AskCopilot } from "@/components/os/AskCopilot";
import { createWorkOrder, useWorkOrders } from "@/lib/workorders";
import { cn, formatTHB } from "@/lib/utils";
import {
  powerQuality, harmonics, pqStandards, voltageEvents, transientSummary,
  PQ_EVENT_META, pqTally, pqSources, pqEventProfile, pqNotableEvents,
  type PqEventType, type LZ,
} from "@/lib/energy";
import { type HSeverity } from "@/lib/harmonics";

type Lf = (o: LZ) => string;

/* ─────────────────────────────────────────────────────────────── data ── */

const PF_ANGLE = (Math.acos(powerQuality.pfTrue) * 180) / Math.PI; // ≈16.3°

/** AI-consolidated root causes — many symptoms grouped to a few causes, ranked by risk.
 *  `minRank` = the meter tier needed to CONFIRM it; below that it reads "suspected". */
const ROOT_CAUSES: {
  id: string; rank: number; minRank: number; hidden?: boolean; severity: HSeverity; confidence: number;
  problem: LZ; cause: LZ; evidence: LZ; impact: LZ; fix: LZ; source: string;
  evidenceSuspect?: LZ; confSuspect?: number;
}[] = [
  {
    id: "rc-resonance", rank: 1, minRank: 4, hidden: true, severity: "critical", confidence: 82,
    problem: { en: "Capacitor bank is amplifying H7", th: "คาปาซิเตอร์แบงก์กำลังขยาย H7" },
    cause: { en: "The 500 kVAR fixed bank's parallel resonance lands exactly on the 7th harmonic", th: "จุดเรโซแนนซ์ขนานของแบงก์ fixed 500 kVAR ตรงกับ Harmonic ที่ 7 พอดี" },
    evidence: { en: "H7 is present and 1.9 kV switching transients coincide with cap-step changes — strongest at the MDB", th: "H7 ปรากฏ + transient สลับ 1.9 kV ตรงจังหวะคาปาซิเตอร์สลับสเต็ป — แรงสุดที่ MDB" },
    evidenceSuspect: { en: "H7 shows in the spectrum — consistent with resonance. But the 1.9 kV transient that would confirm it can't be captured by this meter.", th: "เห็น H7 ในสเปกตรัม — เข้าได้กับเรโซแนนซ์ แต่ transient 1.9 kV ที่ยืนยันได้ มิเตอร์รุ่นนี้จับไม่ได้" },
    confSuspect: 55,
    impact: { en: "Capacitor failure → unplanned line stop", th: "คาปาซิเตอร์พัง → ไลน์หยุดไม่ทันตั้งตัว" },
    fix: { en: "7% detuned reactor on the bank", th: "detuned reactor 7% ที่แบงก์" },
    source: "Capacitor Bank · MDB",
  },
  {
    id: "rc-sag", rank: 2, minRank: 1, severity: "critical", confidence: 88,
    problem: { en: "Sags trip CNC / PLC at shift start", th: "ไฟตกทำ CNC/PLC ทริปตอนเปิดกะ" },
    cause: { en: "Chiller B starts direct-on-line — inrush ~6× rated current", th: "Chiller B สตาร์ทแบบ DOL — กระแสพุ่ง ~6 เท่าของพิกัด" },
    evidence: { en: "Sags cluster on L2 at 08:00, only while Chiller B cycles; 76% residual, outside ITIC. Utility ruled out — not a balanced 3φ dip", th: "ไฟตกกระจุก L2 ตอน 08:00 เฉพาะตอน Chiller B ทำงาน; เหลือ 76% หลุด ITIC ตัดฝั่งการไฟฟ้าออก — ไม่ตกพร้อม 3 เฟส" },
    impact: { en: "CNC / PLC trips → lost production", th: "CNC/PLC ทริป → เสียการผลิต" },
    fix: { en: "Soft-starter / VFD on Chiller B", th: "soft-starter / VFD ที่ Chiller B" },
    source: "Chiller B · DB-COOL",
  },
  {
    id: "rc-h5", rank: 3, minRank: 1, severity: "warning", confidence: 85,
    problem: { en: "H5 current harmonic over the limit", th: "ฮาร์มอนิกกระแส H5 เกินลิมิต" },
    cause: { en: "6-pulse VFDs inject H5 — measured 5.1% vs the 4% individual limit", th: "VFD 6 พัลส์ฉีด H5 — วัดได้ 5.1% เทียบลิมิตรายอันดับ 4%" },
    evidence: { en: "H5 rises with VFD loading (chillers, air compressors); flicker adds through the welding shift", th: "H5 ขึ้นตามโหลด VFD (chiller, คอมเพรสเซอร์ลม); flicker เพิ่มช่วงกะเชื่อม" },
    impact: { en: "Extra heating, neutral loading, PF distortion", th: "ความร้อนส่วนเกิน โหลดนิวทรัล PF เพี้ยน" },
    fix: { en: "Active harmonic filter (AHF) at the MDB", th: "Active Harmonic Filter (AHF) ที่ MDB" },
    source: "6-pulse VFDs · MDB",
  },
];

const SEV_META: Record<HSeverity, { label: LZ; cls: string }> = {
  critical: { label: { en: "Critical", th: "วิกฤต" }, cls: "border-rose-400/30 bg-rose-400/10 text-rose-300" },
  warning: { label: { en: "Warning", th: "เตือน" }, cls: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
  watch: { label: { en: "Watch", th: "เฝ้าระวัง" }, cls: "border-white/15 bg-white/5 text-white/60" },
};

/** Schneider PowerLogic ladder — each tier unlocks more of the PQ picture. `rank` gates
 *  every capability below; `spc` = waveform samples/cycle (0 = no waveform buffer at all).
 *  Selecting a meter shows exactly what that hardware can and cannot surface. */
type MeterId = "PM5340" | "PM5560" | "PM5760" | "PM8240" | "ION9000";
const METERS: { id: MeterId; series: LZ; rank: number; spc: number; maxH: number }[] = [
  { id: "PM5340", series: { en: "PowerLogic PM5300", th: "PowerLogic PM5300" }, rank: 1, spc: 0, maxH: 15 },
  { id: "PM5560", series: { en: "PowerLogic PM5500", th: "PowerLogic PM5500" }, rank: 2, spc: 64, maxH: 31 },
  { id: "PM5760", series: { en: "PowerLogic PM5700", th: "PowerLogic PM5700" }, rank: 3, spc: 128, maxH: 40 },
  { id: "PM8240", series: { en: "PowerLogic PM8000", th: "PowerLogic PM8000" }, rank: 4, spc: 512, maxH: 50 },
  { id: "ION9000", series: { en: "PowerLogic ION9000", th: "PowerLogic ION9000" }, rank: 5, spc: 1024, maxH: 63 },
];

/** Detection coverage — every disturbance, plus the minimum meter rank that truly captures
 *  it. PM5340 owns the RMS-domain events (sag / swell); flicker needs a PM5760, and
 *  sub-cycle transients a PM8240 — so `live` is computed against the selected meter. */
const DETECTION_COVERAGE: {
  key: PqEventType; label: LZ; desc: LZ; standard: string; color: string; minRank: number;
}[] = [
  {
    key: "sag", label: { en: "Voltage Sag / Dip", th: "ไฟตก" },
    desc: { en: "Voltage drops below 90% for a moment", th: "แรงดันตกต่ำกว่า 90% ชั่วขณะ" },
    standard: "IEEE 1159 · ITIC", color: "#22d3ee", minRank: 1,
  },
  {
    key: "overvoltage", label: { en: "Overvoltage / Swell", th: "แรงดันเกิน" },
    desc: { en: "Voltage rises above 110%", th: "แรงดันพุ่งเกิน 110%" },
    standard: "EN 50160", color: "#818cf8", minRank: 1,
  },
  {
    key: "flicker", label: { en: "Flicker · Pst / Plt", th: "ไฟกระพริบ" },
    desc: { en: "Fast voltage swing that makes lights flicker", th: "แรงดันแกว่งเร็วจนไฟกระพริบ" },
    standard: "IEC 61000-4-15", color: "#f59e0b", minRank: 3,
  },
  {
    key: "transient", label: { en: "Transient / Surge", th: "ไฟกระชาก" },
    desc: { en: "Sub-cycle voltage spike (microseconds)", th: "ไฟกระชากเร็วกว่า 1 ไซเคิล (µs)" },
    standard: "IEEE C62.41", color: "#f43f5e", minRank: 4,
  },
];

/* ── PQ Action data — Part 1 zero-invest quick wins + Part 2 capital projects (BOM) ── */

/** One BOM line on a capital project — brand + part number an engineer can order. */
type ActionPart = { brand: string; partNo: string; name: LZ; qty: number; unitPrice: number };

/** Part 1 · Quick wins — no hardware, config / scheduling only (฿0 capex). */
const pqQuickWins: { id: string; title: LZ; asset: LZ; how: LZ; savingYr: number; effort: LZ }[] = [
  {
    id: "qw-sequence",
    title: { en: "Sequence Chiller B's start off the shift peak", th: "จัดคิว Chiller B ให้พ้นพีคเปิดกะ" },
    asset: { en: "Chiller B · DB-COOL", th: "Chiller B · DB-COOL" },
    how: { en: "Delay and stagger Chiller B's DOL start through the PLC schedule so its inrush no longer lands on the shift-start load — the big L2 sags that violate ITIC stop happening.", th: "หน่วงและเลื่อนการสตาร์ต DOL ของ Chiller B ผ่านตาราง PLC ให้กระแสกระชากไม่ไปตรงกับโหลดตอนเปิดกะ — ไฟตกก้อนใหญ่ที่ L2 ที่หลุด ITIC ก็จะหายไป" },
    savingYr: 180000,
    effort: { en: "PLC schedule · minutes", th: "ตั้งค่า PLC · ไม่กี่นาที" },
  },
  {
    id: "qw-capshed",
    title: { en: "Shed cap-bank steps at low load", th: "ตั้งคาปาซิเตอร์ตัดสเต็ปช่วงโหลดต่ำ" },
    asset: { en: "Capacitor Bank · MDB", th: "Capacitor Bank · MDB" },
    how: { en: "Set the existing Capacitor Bank controller to drop steps off-shift so the bank stops pushing the voltage over 110% while the plant runs light.", th: "ตั้งคอนโทรลเลอร์ของ Capacitor Bank เดิมให้ตัดสเต็ปช่วงนอกกะ แบงก์จะได้เลิกดันแรงดันเกิน 110% ตอนโรงงานโหลดเบา" },
    savingYr: 60000,
    effort: { en: "Controller setting", th: "ตั้งค่าคอนโทรลเลอร์" },
  },
  {
    id: "qw-balance",
    title: { en: "Rebalance single-phase loads across phases", th: "เกลี่ยโหลดสามเฟสใหม่" },
    asset: { en: "MDB feeders", th: "MDB feeders" },
    how: { en: "Move a few single-phase loads off the heaviest phase (I-unbalance is 3.2%) to even the three phases — that cuts the neutral current and the heating that comes with it.", th: "ย้ายโหลดเฟสเดียวบางตัวออกจากเฟสที่หนักสุด (I-unbalance 3.2%) ให้สามเฟสเท่ากันขึ้น — กระแสนิวทรัลและความร้อนที่ตามมาก็ลดลง" },
    savingYr: 45000,
    effort: { en: "Recircuit · 1 shift", th: "สลับวงจร · 1 กะ" },
  },
  {
    id: "qw-weldstagger",
    title: { en: "Stagger the welders' duty cycles", th: "กระจายเวลาเดินเครื่องเชื่อม" },
    asset: { en: "Weld Robot 04 · DB-B", th: "Weld Robot 04 · DB-B" },
    how: { en: "Offset the arc-welders so they don't strike together — that lowers the peak flicker (Pst) during the welding shift.", th: "เหลื่อมจังหวะเครื่องเชื่อมไม่ให้อาร์กพร้อมกัน — ช่วยลด flicker (Pst) ช่วงพีคของกะเชื่อม" },
    savingYr: 30000,
    effort: { en: "Duty scheduling", th: "จัดตารางเดินเครื่อง" },
  },
];

/** Part 2 · Capital projects — with investment; each carries a full BOM (brand + part no.).
 *  capex ≈ Σ(qty × unitPrice) + install; paybackMo = round(capex/savingYr×12); roi = round(savingYr/capex×100). */
const pqCapitalProjects: {
  id: string; code: string; title: LZ; asset: LZ; severity: "critical" | "warning" | "recommend";
  capex: number; savingYr: number; paybackMo: number; roi: number;
  why: LZ; evidence: LZ; outcome: LZ; parts: ActionPart[];
}[] = [
  {
    id: "pq-reactor", code: "PQ-01",
    title: { en: "Fit a 7% detuned reactor on the Capacitor Bank", th: "ใส่ detuned reactor 7% ที่ Capacitor Bank" },
    asset: { en: "Capacitor Bank 500 kVAR · MDB", th: "Capacitor Bank 500 kVAR · MDB" },
    severity: "critical", capex: 160000, savingYr: 90000, paybackMo: 21, roi: 56,
    why: { en: "The bank's H7 parallel resonance sits right on the 7th harmonic — it keeps amplifying H7 until the capacitors fail.", th: "จุดเรโซแนนซ์ขนาน H7 ของแบงก์ตรงกับ Harmonic ที่ 7 พอดี — มันจะขยาย H7 ไปเรื่อยๆ จนคาปาซิเตอร์พัง" },
    evidence: { en: "Measured H7 lands on the bank's resonance point, with 1.9 kV switching transients at each cap-step change.", th: "H7 ที่วัดได้ตรงกับจุดเรโซแนนซ์ของแบงก์ พร้อม transient สลับ 1.9 kV ทุกครั้งที่คาปาซิเตอร์สลับสเต็ป" },
    outcome: { en: "Resonance eliminated, capacitor life restored, and the switching transients clamped.", th: "หมดปัญหาเรโซแนนซ์ คาปาซิเตอร์อายุกลับมาปกติ และ transient สลับถูกกดลง" },
    parts: [
      { brand: "Schneider Electric", partNo: "VarplusLogic detuned 7% 480V 25kVAR", name: { en: "Detuned reactor 7% · matched to bank", th: "Detuned reactor 7% · แมตช์กับแบงก์" }, qty: 6, unitPrice: 22000 },
    ],
  },
  {
    id: "pq-ahf", code: "PQ-02",
    title: { en: "Install an Active Harmonic Filter (AHF) at the MDB", th: "ติดตั้ง Active Harmonic Filter (AHF) ที่ MDB" },
    asset: { en: "MDB incomer · VFD group", th: "MDB incomer · VFD group" },
    severity: "warning", capex: 950000, savingYr: 260000, paybackMo: 44, roi: 27,
    why: { en: "The 6-pulse VFDs push H5 to 5.1% against the 4% limit — an AHF cancels H5/H7 right at the source.", th: "VFD แบบ 6 พัลส์ดัน H5 ขึ้นไป 5.1% เทียบลิมิต 4% — AHF จะหักล้าง H5/H7 ตั้งแต่ต้นทาง" },
    evidence: { en: "I-THD is 6.4% and H5 sits over its individual limit, rising with VFD loading.", th: "I-THD 6.4% และ H5 เกินลิมิตรายอันดับ สูงขึ้นตามโหลด VFD" },
    outcome: { en: "I-THD drops to about 4.5% and H5 falls back under 4%.", th: "I-THD ลดเหลือราว 4.5% และ H5 กลับลงมาต่ำกว่า 4%" },
    parts: [
      { brand: "Schneider Electric", partNo: "AccuSine PCS+ 300A 400V", name: { en: "Active Harmonic Filter 300 A", th: "Active Harmonic Filter 300 A" }, qty: 1, unitPrice: 820000 },
    ],
  },
  {
    id: "pq-softstart", code: "PQ-03",
    title: { en: "Add a soft-starter / VFD on Chiller B", th: "ติด soft-starter / VFD ที่ Chiller B" },
    asset: { en: "Chiller B · DB-COOL", th: "Chiller B · DB-COOL" },
    severity: "critical", capex: 420000, savingYr: 320000, paybackMo: 16, roi: 76,
    why: { en: "Chiller B's DOL inrush is ~6× rated and it's what causes the L2 sag that trips the CNC/PLC.", th: "กระแสกระชากตอนสตาร์ต DOL ของ Chiller B แรง ~6 เท่าพิกัด และเป็นตัวทำไฟตกที่ L2 จน CNC/PLC ทริป" },
    evidence: { en: "Sags cluster on L2 at shift start only while Chiller B cycles, dropping to 76% residual — outside ITIC.", th: "ไฟตกกระจุกที่ L2 ตอนเปิดกะเฉพาะช่วง Chiller B ทำงาน เหลือ 76% หลุด ITIC" },
    outcome: { en: "The sag recovers above 90% (inside ITIC) and the CNC/PLC stop tripping.", th: "ไฟตกฟื้นเหนือ 90% (อยู่ในเส้น ITIC) และ CNC/PLC เลิกทริป" },
    parts: [
      { brand: "Schneider Electric", partNo: "Altivar ATV630 90kW 400V", name: { en: "VFD 90 kW · IP54 + EMC filter", th: "VFD 90 kW · IP54 + EMC filter" }, qty: 1, unitPrice: 360000 },
    ],
  },
  {
    id: "pq-spd", code: "PQ-04",
    title: { en: "Add a Type-2 SPD at the MDB + RC snubbers on the contactors", th: "ติด SPD Type-2 ที่ MDB + RC snubber ที่คอนแทกเตอร์" },
    asset: { en: "Main Distribution", th: "Main Distribution" },
    severity: "warning", capex: 180000, savingYr: 180000, paybackMo: 12, roi: 100,
    why: { en: "Cap-bank switching produces 1.9 kV transients that stress the equipment insulation.", th: "การสลับ Capacitor Bank ทำให้เกิด transient 1.9 kV ที่ไปกดดันฉนวนอุปกรณ์" },
    evidence: { en: "The 1.9 kV impulses line up exactly with cap-step changes.", th: "อิมพัลส์ 1.9 kV เกิดตรงจังหวะที่คาปาซิเตอร์สลับสเต็ปพอดี" },
    outcome: { en: "Transients are clamped below the equipment's insulation limits.", th: "transient ถูกกดให้ต่ำกว่าพิกัดฉนวนของอุปกรณ์" },
    parts: [
      { brand: "ABB", partNo: "OVR T2 3N 40-275", name: { en: "SPD Type-2 · 3-phase + N", th: "SPD Type-2 · 3-phase + N" }, qty: 1, unitPrice: 42000 },
      { brand: "EPCOS/TDK", partNo: "B32656 RC snubber 0.1µF+100Ω", name: { en: "RC snubber on the contactors", th: "RC snubber ที่คอนแทกเตอร์" }, qty: 8, unitPrice: 8000 },
    ],
  },
  {
    id: "pq-svc", code: "PQ-05",
    title: { en: "Add an SVC / STATCOM on the welding feeder", th: "ติด SVC / STATCOM ที่ฟีดเดอร์งานเชื่อม" },
    asset: { en: "Weld Robot 04 · DB-B", th: "Weld Robot 04 · DB-B" },
    severity: "recommend", capex: 850000, savingYr: 140000, paybackMo: 73, roi: 16,
    why: { en: "The arc welders throw flicker (Pst) across the welding shift.", th: "เครื่องเชื่อมอาร์กทำให้เกิด flicker (Pst) ตลอดกะเชื่อม" },
    evidence: { en: "Pst climbs through 09:00–17:00, tracking the weld duty.", th: "Pst ไต่ขึ้นช่วง 09:00–17:00 ตามรอบงานเชื่อม" },
    outcome: { en: "Flicker Pst comes back under the IEC limit.", th: "flicker Pst กลับลงมาต่ำกว่าลิมิต IEC" },
    parts: [
      { brand: "Schneider Electric", partNo: "AccuSine SWP STATCOM 100kVAR", name: { en: "STATCOM 100 kVAR · flicker compensation", th: "STATCOM 100 kVAR · flicker compensation" }, qty: 1, unitPrice: 780000 },
    ],
  },
  {
    id: "pq-capauto", code: "PQ-06",
    title: { en: "Swap to a 450 kVAR detuned automatic Capacitor Bank", th: "เปลี่ยนเป็น Capacitor Bank แบบสลับอัตโนมัติ 450 kVAR detuned" },
    asset: { en: "Capacitor Bank · MDB", th: "Capacitor Bank · MDB" },
    severity: "recommend", capex: 380000, savingYr: 90000, paybackMo: 51, roi: 24,
    why: { en: "The fixed 500 kVAR bank is oversized, so it drives overvoltage off-shift.", th: "แบงก์ fixed 500 kVAR ใหญ่เกินไป จึงดันแรงดันเกินช่วงนอกกะ" },
    evidence: { en: "Voltage rises above 110% off-shift whenever the fixed bank stays switched in.", th: "แรงดันขึ้นเกิน 110% ช่วงนอกกะทุกครั้งที่แบงก์ fixed ยังต่ออยู่" },
    outcome: { en: "PF is held near 0.99 without any off-shift overvoltage.", th: "คุม PF ไว้ราว 0.99 โดยไม่มีแรงดันเกินช่วงนอกกะ" },
    parts: [
      { brand: "Schneider Electric", partNo: "VarSet Automatic 450kVAR detuned", name: { en: "Automatic PFC bank 450 kVAR · 6 steps detuned", th: "Automatic PFC bank 450 kVAR · 6 steps detuned" }, qty: 1, unitPrice: 300000 },
    ],
  },
];

/* ─────────────────────────────────────────────────────────── workflow ── */

export function PqWorkflow() {
  const { locale } = useI18n();
  const L: Lf = (o) => (locale === "th" ? o.th : o.en);
  const [step, setStep] = useState(0);
  const [meterId, setMeterId] = useState<MeterId>("PM5340");

  return (
    <div className="space-y-6">
      <WorkflowBar step={step} setStep={setStep} L={L} />

      {step === 0 && <MonitorStep L={L} meterId={meterId} setMeterId={setMeterId} />}
      {step === 1 && <InsightStep L={L} meterId={meterId} setMeterId={setMeterId} onNext={() => setStep(2)} />}
      {step === 2 && <AnalysisStep L={L} meterId={meterId} onAct={() => setStep(3)} />}
      {step === 3 && <ActionStep L={L} />}
      {step === 4 && <ReportStep L={L} locale={locale} meterId={meterId} setMeterId={setMeterId} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── 01 monitor ── */

function MonitorStep({ L, meterId, setMeterId }: { L: Lf; meterId: MeterId; setMeterId: (id: MeterId) => void }) {
  const pq = powerQuality;
  const meter = METERS.find((m) => m.id === meterId)!;
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label={L({ en: "PQ score", th: "คะแนนคุณภาพไฟ" })} value={String(pq.score)} unit="/100" delta="Live" deltaGood accent="#34d399" icon={ShieldCheck} />
        <KpiCard label="Voltage THD" value={pq.vthd.toFixed(1)} unit="%" delta={L({ en: "limit 5%", th: "ลิมิต 5%" })} deltaGood accent="#22d3ee" icon={Waves} />
        <KpiCard label="Current THD" value={pq.ithd.toFixed(1)} unit="%" delta={L({ en: "limit 8%", th: "ลิมิต 8%" })} deltaGood accent="#818cf8" icon={Activity} />
        <KpiCard label={L({ en: "Power factor · true", th: "Power Factor · true" })} value={pq.pfTrue.toFixed(2)} accent="#f59e0b" icon={Gauge} />
        <KpiCard label={L({ en: "Frequency", th: "ความถี่" })} value={pq.freq.toFixed(2)} unit="Hz" accent="#a78bfa" icon={Zap} />
      </section>

      <Panel title={L({ en: "Power Quality Single-Line", th: "ไดอะแกรมเส้นเดียว · คุณภาพไฟ" })} sub={L({ en: "Where each disturbance comes from — trace it to the source cabinet", th: "แต่ละปัญหามาจากตู้ไหน — ไล่หาต้นตอได้เลย" })} icon={Waves}>
        <PqSingleLineDiagram meterId={meterId} meterRank={meter.rank} setMeterId={setMeterId as (id: string) => void} meters={METERS} />
      </Panel>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── 02 insight ── */

/* ── PQ Trend (30 days) — is it getting better or worse? deterministic, meter+PLC logs ── */
const trendSeries = (start: number, end: number, wobble: number, round0 = false) =>
  Array.from({ length: 30 }, (_, i) => {
    const v = start + (end - start) * (i / 29) + wobble * Math.sin(i * 1.7);
    return round0 ? Math.round(v) : +v.toFixed(2);
  });
const PQ_TREND = {
  thd: { data: trendSeries(5.3, 6.4, 0.18), unit: "%", limit: 8 as number | null, label: { en: "Current THD", th: "Current THD" }, color: "#22d3ee", good: "down" as const },
  score: { data: trendSeries(97, 94, 0.6), unit: "/100", limit: null as number | null, label: { en: "PQ score", th: "คะแนน PQ" }, color: "#34d399", good: "up" as const },
  events: { data: trendSeries(16, 26, 3.5, true), unit: "/day", limit: null as number | null, label: { en: "Events / day", th: "เหตุการณ์ / วัน" }, color: "#f59e0b", good: "down" as const },
};
type TrendKey = keyof typeof PQ_TREND;

function PqTrend({ L }: { L: Lf }) {
  const [key, setKey] = useState<TrendKey>("thd");
  const s = PQ_TREND[key];
  const data = s.data;
  const last = data[data.length - 1], delta = +(last - data[0]).toFixed(key === "events" ? 0 : 2);
  const improving = s.good === "down" ? delta < 0 : delta > 0;
  const W = 520, H = 120, pad = 8;
  const max = Math.max(...data, s.limit ?? 0) * 1.06, min = Math.min(...data) * 0.94;
  const x = (i: number) => pad + (i / (data.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <Panel
      title={L({ en: "PQ Trend · 30 days", th: "แนวโน้มคุณภาพไฟ · 30 วัน" })}
      sub={L({ en: "Getting better or worse", th: "ดีขึ้นหรือแย่ลง" })}
      icon={TrendingUp}
      right={
        <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
          {(Object.keys(PQ_TREND) as TrendKey[]).map((k) => (
            <button key={k} onClick={() => setKey(k)} className={cn("rounded-md px-2 py-1 text-[11px] font-medium transition", key === k ? "bg-brand-400/15 text-brand-200" : "text-white/45 hover:text-white/75")}>{L(PQ_TREND[k].label)}</button>
          ))}
        </div>
      }
    >
      <div className="mb-2 flex items-baseline gap-3">
        <span className="tabular text-2xl font-semibold" style={{ color: s.color }}>{last}<span className="ml-0.5 text-sm font-normal text-white/45">{s.unit}</span></span>
        <span className={cn("inline-flex items-center gap-1 text-[12px] font-medium", improving ? "text-emerald-300" : "text-rose-300")}>
          {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}{key === "thd" ? "%" : ""} {L({ en: "vs 30 days ago", th: "เทียบ 30 วันก่อน" })}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs><linearGradient id="pqtrend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.color} stopOpacity="0.28" /><stop offset="100%" stopColor={s.color} stopOpacity="0" /></linearGradient></defs>
        {s.limit ? <line x1={pad} y1={y(s.limit)} x2={W - pad} y2={y(s.limit)} stroke="#f43f5e" strokeWidth="1" strokeDasharray="4 4" opacity="0.55" /> : null}
        <path d={`${line} L${x(data.length - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`} fill="url(#pqtrend)" />
        <path d={line} fill="none" stroke={s.color} strokeWidth="2" />
        <circle cx={x(data.length - 1)} cy={y(last)} r="3.5" fill={s.color} />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-white/35"><span>{L({ en: "30 days ago", th: "30 วันก่อน" })}</span><span>{L({ en: "today", th: "วันนี้" })}</span></div>
    </Panel>
  );
}

/* ── Disturbance timing — when in the day do problems cluster (from event timestamps) ── */
const PQ_TIMING = [1, 0, 1, 0, 1, 2, 4, 5, 12, 8, 7, 6, 6, 9, 7, 6, 5, 4, 3, 2, 2, 1, 1, 0];

function DisturbanceTiming({ L }: { L: Lf }) {
  const max = Math.max(...PQ_TIMING), peakH = PQ_TIMING.indexOf(max);
  const shifts = [
    { label: { en: "Morning 06–14", th: "กะเช้า 06–14" }, sum: PQ_TIMING.slice(6, 14).reduce((a, b) => a + b, 0) },
    { label: { en: "Afternoon 14–22", th: "กะบ่าย 14–22" }, sum: PQ_TIMING.slice(14, 22).reduce((a, b) => a + b, 0) },
    { label: { en: "Night 22–06", th: "กะดึก 22–06" }, sum: [...PQ_TIMING.slice(22), ...PQ_TIMING.slice(0, 6)].reduce((a, b) => a + b, 0) },
  ];
  return (
    <Panel title={L({ en: "When Disturbances Happen", th: "เหตุการณ์เกิดตอนไหน" })} sub={L({ en: "Events by hour of day", th: "เหตุการณ์รายชั่วโมง" })} icon={Clock} right={<span className="chip text-rose-300">{L({ en: "peak", th: "พีค" })} {String(peakH).padStart(2, "0")}:00</span>}>
      <div className="flex h-28 items-end gap-0.5">
        {PQ_TIMING.map((v, h) => (
          <div key={h} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-end" style={{ height: 90 }}>
              <div className="w-full rounded-t" style={{ height: `${Math.max(3, (v / max) * 100)}%`, background: h === peakH ? "#f43f5e" : h >= 9 && h < 18 ? "#f59e0b" : "#818cf8", opacity: v ? 0.9 : 0.18 }} title={`${h}:00 — ${v}`} />
            </div>
            <span className="flex h-3 items-center text-[8px] tabular text-white/35">{h % 3 === 0 ? String(h).padStart(2, "0") : ""}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 py-1.5 text-[11.5px] text-amber-200">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
        {L({ en: "Disturbances spike at 08:00 shift start (Chiller B DOL inrush); flicker builds through the welding shift 09:00–17:00.", th: "เหตุการณ์พุ่งตอนเปิดกะ 08:00 (กระแสพุ่งจาก Chiller B DOL); ไฟกระพริบสะสมช่วงกะเชื่อม 09:00–17:00" })}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {shifts.map((sh) => (
          <div key={sh.label.en} className="rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5 text-center">
            <p className="text-[10px] text-white/45">{L(sh.label)}</p>
            <p className="tabular text-[15px] font-semibold text-white/85">{sh.sum}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── Cost of poor PQ — the money leak, bridges to the Action plan ── */
const PQ_COST = [
  { label: { en: "Sag-induced downtime", th: "ดาวน์ไทม์จากไฟตก" }, note: { en: "CNC / PLC trips on ITIC-violating sags", th: "CNC/PLC ทริปจากไฟตกที่หลุด ITIC" }, month: 45000 },
  { label: { en: "Harmonic losses (I²R)", th: "การสูญเสียจากฮาร์มอนิก (I²R)" }, note: { en: "extra heating in transformer, cables, motors", th: "ความร้อนส่วนเกินในหม้อแปลง สายไฟ มอเตอร์" }, month: 22000 },
  { label: { en: "Cap-bank resonance risk", th: "ความเสี่ยงเรโซแนนซ์คาปาซิเตอร์" }, note: { en: "H7 amplification → shortened capacitor life", th: "H7 ขยายสัญญาณ → คาปาซิเตอร์อายุสั้นลง" }, month: 10000 },
  { label: { en: "Low-PF reactive charge", th: "ค่าปรับ PF ต่ำ" }, note: { en: "DB-CA compressed air at PF 0.83", th: "DB-CA สถานีลม ที่ PF 0.83" }, month: 5500 },
];

function PqCost({ L }: { L: Lf }) {
  const total = PQ_COST.reduce((s, c) => s + c.month, 0), maxC = Math.max(...PQ_COST.map((c) => c.month));
  return (
    <Panel title={L({ en: "Cost of Poor Power Quality", th: "ต้นทุนจากคุณภาพไฟที่ไม่ดี" })} sub={L({ en: "What it's costing per month", th: "เสียเงินเท่าไหร่ต่อเดือน" })} icon={Coins} right={<span className="chip text-rose-300">{formatTHB(total)}/{L({ en: "mo", th: "เดือน" })}</span>}>
      <div className="space-y-2.5">
        {PQ_COST.map((c) => (
          <div key={c.label.en} className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[12.5px] font-medium">{L(c.label)}</p>
              <span className="shrink-0 tabular text-[12.5px] font-semibold text-rose-300">{formatTHB(c.month)}</span>
            </div>
            <p className="mt-0.5 truncate text-[10.5px] text-white/40">{L(c.note)}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-rose-400/60" style={{ width: `${(c.month / maxC) * 100}%` }} /></div>
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-[12px] text-emerald-200">
        ≈ {formatTHB(total * 12)}/{L({ en: "yr", th: "ปี" })} — {L({ en: "most of it recoverable through the mitigation plan (Action step).", th: "ส่วนใหญ่กู้คืนได้ผ่านแผนแก้ไข (ขั้น Action)" })}
      </p>
    </Panel>
  );
}

function InsightStep({ L, meterId, setMeterId, onNext }: { L: Lf; meterId: MeterId; setMeterId: (id: MeterId) => void; onNext: () => void }) {
  const meter = METERS.find((m) => m.id === meterId)!;
  return (
    <div className="space-y-6">
      <EventsSection L={L} meterRank={meter.rank} />

      <div className="grid gap-6 lg:grid-cols-2">
        <PqTrend L={L} />
        <DisturbanceTiming L={L} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <Panel
          title={L({ en: "Harmonic Spectrum", th: "สเปกตรัม Harmonic" })}
          sub={L({ en: "Which harmonics break the limit", th: "Harmonic ตัวไหนเกินลิมิต" })}
          icon={BarChart3}
          right={
            <div className="flex items-center gap-2">
              <span className="chip text-amber-300">IEEE-519</span>
              <MeterDropdown L={L} meterId={meterId} setMeterId={setMeterId} badge={(m) => `→ H${m.maxH}`} />
            </div>
          }
        >
          <HarmonicSpectrum L={L} meterId={meterId} maxH={meter.maxH} />
          <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 py-1.5 text-[12px] text-amber-200">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            {L({
              en: "Total THD is inside IEEE-519 (V 3.0%/5%, I 6.4%/8%) — but H5 at 5.1% breaks the 4% individual current limit, and H3 (4.2%) is stacking on the neutral.",
              th: "THD รวมยังอยู่ในเกณฑ์ IEEE-519 (V 3.0%/5%, I 6.4%/8%) — แต่ H5 อยู่ที่ 5.1% เกินลิมิตรายอันดับ 4% และ H3 (4.2%) กำลังไปกองที่สายนิวทรัล",
            })}
          </p>
        </Panel>
        <Panel title={L({ en: "Power Triangle", th: "สามเหลี่ยมกำลังไฟ" })} sub={L({ en: "Where the PF gap comes from · incomer", th: "ส่วนต่าง PF มาจากไหน · จุดรับไฟ" })} icon={Triangle}>
          <PowerTriangle L={L} />
          <p className="mt-2 text-[12px] text-white/50">
            {L({
              en: "True PF 0.96 vs displacement PF 0.98 — the 0.02 gap is distortion power from harmonics, not reactive load.",
              th: "PF จริง 0.96 เทียบ displacement 0.98 — ส่วนต่าง 0.02 มาจากกำลังเพี้ยนของ Harmonic ไม่ใช่โหลดรีแอกทีฟ",
            })}
          </p>
        </Panel>
      </div>

      <PqCost L={L} />

      <Panel title={L({ en: "Standards Compliance", th: "การผ่านเกณฑ์มาตรฐาน" })} sub={L({ en: "How close each metric is to its limit", th: "แต่ละค่าใกล้ชนลิมิตแค่ไหน" })} icon={ShieldCheck} right={<span className="chip text-emerald-300">IEEE-519 · EN 50160 · IEC 61000</span>}>
        <div className="space-y-2.5">
          {pqStandards.map((s) => {
            const pct = Math.min(100, Math.round((s.value / s.limit) * 100));
            const color = pct >= 100 ? "#f43f5e" : pct >= 70 ? "#f59e0b" : "#34d399";
            return (
              <div key={s.metric} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
                <span className="chip w-20 justify-center text-[10px]">{s.code}</span>
                <span className="min-w-[140px] flex-1 text-[13px] font-medium">{s.metric}</span>
                <div className="h-2 w-40 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="tabular w-28 text-right text-[12px] text-white/60">
                  <b style={{ color }}>{s.value}{s.unit}</b> / {s.limit}{s.unit}
                </span>
              </div>
            );
          })}
        </div>
        <button onClick={onNext} className="btn-glow mt-4 px-4 py-2 text-sm">
          {L({ en: "Next step · AI Analysis — find the root cause", th: "ขั้นถัดไป · AI Analysis — หาต้นตอ" })} <ArrowRight size={14} />
        </button>
      </Panel>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── 03 ai analysis ── */

function AnalysisStep({ L, meterId, onAct }: { L: Lf; meterId: MeterId; onAct: () => void }) {
  const meter = METERS.find((m) => m.id === meterId)!;
  const meterRank = meter.rank;
  // the verdict only commits to what THIS meter can confirm; the rest is "suspected"
  const confirmed = ROOT_CAUSES.filter((rc) => meterRank >= rc.minRank);
  const suspected = ROOT_CAUSES.filter((rc) => meterRank < rc.minRank);
  const needMeter = suspected.length ? METERS.find((m) => m.rank === Math.max(...suspected.map((s) => s.minRank)))! : null;
  const resonanceConfirmed = meterRank >= 4;
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_1fr]">
        {/* AI root-cause — symptoms consolidated to a few causes, ranked, decision-first */}
        <Panel
          title={L({ en: "AI Root-Cause · Top 3", th: "AI หาต้นตอ · 3 อันดับ" })}
          sub={L({ en: "Fix the cause, not each symptom", th: "แก้ที่ต้นตอ ไม่ใช่ตามอาการ" })}
          icon={Sparkles}
          right={<span className="chip text-brand-200"><Sparkles size={11} /> AI</span>}
        >
          <div className="space-y-3">
            {ROOT_CAUSES.map((rc) => {
              const sev = SEV_META[rc.severity];
              const confirmed = meterRank >= rc.minRank;
              const minMeter = METERS.find((m) => m.rank === rc.minRank)!;
              const conf = confirmed ? rc.confidence : rc.confSuspect ?? rc.confidence;
              const evidence = confirmed ? rc.evidence : rc.evidenceSuspect ?? rc.evidence;
              return (
                <div key={rc.id} className={cn("rounded-xl border p-3.5", !confirmed ? "border-amber-400/30 bg-amber-400/[0.05]" : rc.hidden ? "border-rose-400/35 bg-rose-400/[0.07]" : rc.severity === "critical" ? "border-rose-400/20 bg-rose-400/[0.03]" : "border-white/8 bg-white/[0.02]")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-[12px] font-bold text-white/70">{rc.rank}</span>
                    <p className="text-[13.5px] font-semibold">{L(rc.problem)}</p>
                    {rc.hidden ? <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-400/15 px-2 py-0.5 text-[9.5px] font-bold text-rose-200">🔍 {L({ en: "hidden risk AI caught", th: "ความเสี่ยงซ่อนที่ AI จับได้" })}</span> : null}
                    {confirmed
                      ? <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", sev.cls)}>{L(sev.label)}</span>
                      : <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">{L({ en: "suspected", th: "สงสัย" })}</span>}
                    <span className="ml-auto text-[10.5px] text-white/40">{conf}% {L({ en: "confidence", th: "มั่นใจ" })}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8"><div className={cn("h-full rounded-full", confirmed ? "bg-brand-400/70" : "bg-amber-400/70")} style={{ width: `${conf}%` }} /></div>
                  <div className="mt-2 space-y-1 text-[11.5px] leading-relaxed">
                    <p><b className="text-white/45">{L({ en: "Cause", th: "สาเหตุ" })}:</b> <span className="text-white/70">{L(rc.cause)}</span></p>
                    <p><b className="text-white/45">{L({ en: "Evidence", th: "หลักฐาน" })}:</b> <span className="text-white/60">{L(evidence)}</span></p>
                    <p><b className="text-white/45">{L({ en: "If ignored", th: "ถ้าไม่แก้" })}:</b> <span className="text-rose-200/80">{L(rc.impact)}</span></p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="min-w-[180px] flex-1 rounded-lg bg-brand-400/[0.08] px-2.5 py-1.5 text-[11.5px] text-brand-200"><Wrench size={11} className="mr-1 inline" /> {L(rc.fix)}</p>
                    {!confirmed ? <span className="inline-flex items-center gap-1 rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-300"><TrendingUp size={9} /> {L({ en: `upgrade to ${minMeter.id} to confirm`, th: `อัปเกรด ${minMeter.id} เพื่อยืนยัน` })}</span> : null}
                    <span className="text-[10px] text-white/35">{rc.source}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-6">
        <Panel title={L({ en: "ITIC Ride-Through", th: "เส้นโค้ง ITIC (ทนไฟตก)" })} sub={L({ en: "Which dips will trip your machines", th: "ไฟตกแบบไหนทำเครื่องทริป" })} icon={Waves} right={<span className="chip">ITI / CBEMA</span>}>
          <IticChart L={L} />
          <p className="mt-2 flex items-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-400/10 px-2.5 py-1.5 text-[12px] text-rose-200">
            <AlertTriangle size={13} />
            {L({ en: "2 of 5 events fall outside the ITIC envelope — sensitive CNC / PLC loads will trip on these.", th: "2 จาก 5 เหตุการณ์หลุดนอกเส้น ITIC — เครื่อง CNC / PLC ที่ไวต่อไฟตกจะทริป" })}
          </p>
        </Panel>

        {/* AI verdict + prediction → decision to Action */}
        <div className="panel border-brand-400/25 bg-brand-400/[0.05] p-5">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-brand-300" />
          <p className="text-[13.5px] font-semibold text-brand-200">{L({ en: "AI verdict — do this first", th: "ข้อสรุป AI — เริ่มที่นี่ก่อน" })}</p>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-brand-400/25 bg-brand-400/[0.08] px-2 py-0.5 text-[10px] text-brand-200"><Cpu size={10} /> {meterId}</span>
        </div>
        {confirmed.length ? (
          <p className="mt-2 text-[12px] leading-relaxed text-white/70">
            {L({ en: "Start with", th: "เริ่มที่" })} <b className="text-white/90">{L(confirmed[0].fix)}</b> — {L(confirmed[0].problem)}{confirmed[1] ? <>{L({ en: ", then", th: " จากนั้น" })} <b className="text-white/85">{L(confirmed[1].fix)}</b></> : null}. {L({ en: "Confirmed by", th: "ยืนยันได้ด้วย" })} {meterId}.
          </p>
        ) : (
          <p className="mt-2 text-[12px] text-white/70">{L({ en: "No root cause is fully confirmable with this meter — upgrade to diagnose.", th: "มิเตอร์รุ่นนี้ยังยืนยันต้นตอไม่ได้ — อัปเกรดเพื่อวินิจฉัย" })}</p>
        )}
        {suspected.length && needMeter ? (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 py-1.5 text-[11.5px] text-amber-200">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>{L({ en: "Suspected but not confirmable with", th: "ยังแค่สงสัย ยืนยันไม่ได้ด้วย" })} {meterId}: {suspected.map((s) => L(s.problem)).join(" · ")} — {L({ en: `add a ${needMeter.id} before committing the capex`, th: `ควรมี ${needMeter.id} ยืนยันก่อนตัดสินใจลงทุน` })}</span>
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          {resonanceConfirmed ? <span className="rounded-lg border border-rose-400/25 bg-rose-400/10 px-2.5 py-1 text-rose-200">⏱ {L({ en: "cap failure in ~6 mo", th: "คาปาซิเตอร์พัง ~6 เดือน" })}</span> : null}
          <span className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-amber-200">↯ {L({ en: "~5 CNC trips / day", th: "CNC ทริป ~5 ครั้ง/วัน" })}</span>
          <span className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-emerald-200">฿ {L({ en: "≈฿990K/yr recoverable", th: "กู้คืน ≈฿990K/ปี" })}</span>
        </div>
        <button onClick={onAct} className="btn-glow mt-3 px-4 py-2 text-sm">
          <ArrowRight size={14} /> {L({ en: "Go to the mitigation plan", th: "ไปดูแผนแก้ไข" })}
        </button>
        </div>
        </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────── 04 recommend & act ── */

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
function QuoteEmailModal({ project, L, onClose, onSent }: { project: (typeof pqCapitalProjects)[number]; L: Lf; onClose: () => void; onSent: () => void }) {
  const title = L(project.title);
  const bom = project.parts.map((p, i) => `${i + 1}. ${L(p.name)} · ${p.brand} · ${p.partNo} · ${p.qty} × ${formatTHB(p.unitPrice)} · ${formatTHB(p.qty * p.unitPrice)}`).join("\n");
  const sig = L({
    en: `—\n${currentUser.name}\n${currentUser.title} · ${currentUser.plant}\n${currentUser.company}\n${currentUser.email} · ${currentUser.phone}`,
    th: `—\n${currentUser.name}\n${currentUser.titleTh} · ${currentUser.plant}\n${currentUser.company}\n${currentUser.email} · ${currentUser.phone}`,
  });
  const [subject, setSubject] = useState(L({ en: `Request for Quotation · ${title}`, th: `ขอใบเสนอราคา · ${title}` }));
  const [body, setBody] = useState(L({
    en: `Dear SpareX Sales team,\n\nWe would like to request a formal quotation for the following power-quality improvement project:\n\nProject: ${title}\nLocation: ${L(project.asset)}\nEstimated budget: ${formatTHB(project.capex)}\nReturn: saves ${formatTHB(project.savingYr)}/yr · payback ${project.paybackMo} months\n\nBill of materials:\n${bom}\n\nPlease include unit prices, lead time, warranty and installation. Equivalent brands are welcome if the specs are met.\n\nThank you,\n\n${sig}`,
    th: `เรียน ทีมขาย SpareX,\n\nทางเราขอใบเสนอราคาอย่างเป็นทางการสำหรับโครงการปรับปรุงคุณภาพไฟดังนี้:\n\nโครงการ: ${title}\nจุดติดตั้ง: ${L(project.asset)}\nงบประมาณโดยประมาณ: ${formatTHB(project.capex)}\nผลตอบแทน: ประหยัด ${formatTHB(project.savingYr)}/ปี · คืนทุน ${project.paybackMo} เดือน\n\nรายการอะไหล่ (BOM):\n${bom}\n\nรบกวนเสนอราคาต่อหน่วย ระยะเวลาส่งมอบ การรับประกัน และค่าติดตั้ง (เสนอรุ่นเทียบเท่าได้หากสเปคตรง)\n\nขอบคุณครับ/ค่ะ\n\n${sig}`,
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

function ActionStep({ L }: { L: Lf }) {
  const [lit, setLit] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLit(true), 90); return () => clearTimeout(t); }, []);
  const [openId, setOpenId] = useState<string | null>(pqCapitalProjects[0]?.id ?? null);
  const [doneQw, setDoneQw] = useState<Set<string>>(new Set());
  const [poDone, setPoDone] = useState<Set<string>>(new Set());
  const [quoteFor, setQuoteFor] = useState<(typeof pqCapitalProjects)[number] | null>(null);
  const [focus, setFocus] = useState<"all" | "quick" | "capex">("all");
  const [capSev, setCapSev] = useState<"all" | "critical" | "warning" | "recommend">("all");
  const [qwFilter, setQwFilter] = useState<"all" | "pending" | "done">("all");
  const [qwSel, setQwSel] = useState<string | null>(pqQuickWins[0]?.id ?? null);
  const [qwAuto, setQwAuto] = useState<Record<string, boolean>>(() => Object.fromEntries(pqQuickWins.map((q) => [q.id, true])));
  const [quoteSent, setQuoteSent] = useState<Set<string>>(new Set());
  const orders = useWorkOrders();

  const noCapex = pqQuickWins.reduce((s, q) => s + q.savingYr, 0);
  const capexSaving = pqCapitalProjects.reduce((s, c) => s + c.savingYr, 0);
  const capexTotal = pqCapitalProjects.reduce((s, c) => s + c.capex, 0);
  const grand = noCapex + capexSaving;
  const blended = Math.round((capexTotal / capexSaving) * 12);
  const ncPct = Math.round((noCapex / grand) * 100);
  const woFor = (id: string) => orders.find((w) => w.findingId === id);
  const hasWO = (id: string) => poDone.has(id) || !!woFor(id);

  // capital project → single Work Order for installation & commissioning (raised on budget approval)
  const raisePO = (c: (typeof pqCapitalProjects)[number]) => {
    createWorkOrder({ id: c.id, code: c.code, title: { en: `Install & commission · ${L(c.title)}`, th: `ติดตั้ง & Commissioning · ${L(c.title)}` }, asset: c.asset, severity: c.severity === "recommend" ? "advisory" : c.severity, capex: c.capex, annualSaving: c.savingYr, partsCount: c.parts.length }, "energy");
    setPoDone((s) => new Set(s).add(c.id));
  };
  // quick win → one-time setup/enable Work Order (config task, no parts → goes straight to "scheduled")
  const commitQuickWin = (q: (typeof pqQuickWins)[number]) => {
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
              <p className="text-[10.5px] text-white/45">{pqQuickWins.length} {L({ en: "actions · ฿0 capex", th: "รายการ · ลงทุน ฿0" })}</p>
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
              const n = id === "all" ? pqQuickWins.length : pqQuickWins.filter((q) => (doneQw.has(q.id) || hasWO(q.id)) === (id === "done")).length;
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
          {pqQuickWins.filter((q) => qwFilter === "all" || (doneQw.has(q.id) || hasWO(q.id)) === (qwFilter === "done")).map((q) => {
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
            const q = pqQuickWins.find((x) => x.id === qwSel)!;
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
              const n = id === "all" ? pqCapitalProjects.length : pqCapitalProjects.filter((c) => c.severity === id).length;
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
          {pqCapitalProjects.filter((c) => capSev === "all" || c.severity === capSev).map((c) => {
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
                            <span><span className="font-medium text-white/55">{L({ en: "Evidence", th: "หลักฐานที่เจอ" })}</span> · {L(c.evidence)} <span className="text-white/30">· {L({ en: "from the PQ meter + PLC", th: "จากมิเตอร์ PQ + PLC" })}</span></span>
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
      {quoteFor ? <QuoteEmailModal project={quoteFor} L={L} onClose={() => setQuoteFor(null)} onSent={() => setQuoteSent((s) => new Set(s).add(quoteFor.id))} /> : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── 05 report ── */

/** A disturbance type is only "seen" if the selected meter's rank clears its detection floor —
 *  the report stays honest about what the chosen hardware can and cannot evidence. */
function pqCanSee(rank: number, t: PqEventType) {
  return rank >= (DETECTION_COVERAGE.find((d) => d.key === t)?.minRank ?? 1);
}

const REPORT_PERIOD: Record<"today" | "month", LZ> = {
  today: { en: "12 July 2026", th: "12 กรกฎาคม 2026" },
  month: { en: "July 2026", th: "กรกฎาคม 2026" },
};

const SECTION_DEFS: { key: "summary" | "log" | "analysis" | "actions"; title: LZ; sub: LZ }[] = [
  { key: "summary", title: { en: "Disturbance summary", th: "สรุปเหตุการณ์" }, sub: { en: "counts by type & standard", th: "จำนวนแยกตามชนิด" } },
  { key: "log", title: { en: "Event log", th: "บันทึกเหตุการณ์" }, sub: { en: "every event with a timestamp", th: "ทุกเหตุการณ์พร้อมเวลา" } },
  { key: "analysis", title: { en: "AI root-cause analysis", th: "การวิเคราะห์ต้นตอ (AI)" }, sub: { en: "top causes & confidence", th: "ต้นตอหลัก + ความมั่นใจ" } },
  { key: "actions", title: { en: "Recommended actions", th: "แนวทางแก้ไข" }, sub: { en: "zero-invest + capital", th: "แก้ฟรี + โครงการลงทุน" } },
];

/** The report renders as a light "printed page" in BOTH app themes — a document looks the
 *  same on screen as on paper — so it uses explicit colors, not the theme-remapped utility
 *  classes. The very same inline styles ride into the PDF via the node's outerHTML. */
const PAPER = { bg: "#ffffff", ink: "#0f172a", body: "#334155", muted: "#64748b", faint: "#94a3b8", line: "#e2e8f0", soft: "#f1f5f9", brand: "#0e7490" };
const SEV_HEX: Record<string, string> = { critical: "#e11d48", warning: "#d97706", recommend: "#0891b2" };

type ReportPaperProps = { L: Lf; meterId: MeterId; rank: number; range: "today" | "month"; sec: Record<string, boolean>; genAt: string };

/** The document itself — a self-contained light page. All styling is inline so the exact
 *  rendered DOM (`node.outerHTML`) prints faithfully to PDF without any external CSS. */
const ReportPaper = forwardRef<HTMLDivElement, ReportPaperProps>(function ReportPaper({ L, meterId, rank, range, sec, genAt }, ref) {
  const period = L(REPORT_PERIOD[range]);
  const see = (t: PqEventType) => pqCanSee(rank, t);
  const totalEvents = PQ_EVENT_META.reduce((s, m) => s + (see(m.type) ? (pqTally[range][m.type] ?? 0) : 0), 0);
  const logRows = pqNotableEvents.filter((e) => see(e.type));
  const violations = logRows.filter((e) => e.itic === "violation").length;
  const canTransient = rank >= 4;
  const qwTotal = pqQuickWins.reduce((s, q) => s + q.savingYr, 0);

  const thS: CSSProperties = { textAlign: "left", padding: "7px 8px", background: PAPER.soft, color: PAPER.muted, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${PAPER.line}`, whiteSpace: "nowrap" };
  const tdS: CSSProperties = { padding: "7px 8px", color: PAPER.body, borderBottom: `1px solid ${PAPER.soft}`, verticalAlign: "top" };
  const tdNum: CSSProperties = { ...tdS, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700 };
  const tableS: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 11.5 };
  const wrapS: CSSProperties = { padding: "16px 26px", borderTop: `1px solid ${PAPER.line}` };

  const chip = (text: string, c: string) => <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, color: c, background: `${c}18`, border: `1px solid ${c}45`, whiteSpace: "nowrap" }}>{text}</span>;
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
          <h1 style={{ margin: "12px 0 2px", fontSize: 20, fontWeight: 800, color: PAPER.ink }}>{L({ en: "Power Quality Report", th: "รายงานคุณภาพไฟฟ้า" })}</h1>
          <div style={{ color: PAPER.muted, fontSize: 11.5 }}>{L({ en: "Main Distribution · SpareX Demo Plant", th: "ตู้เมนจ่ายไฟหลัก · โรงงานสาธิต SpareX" })}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11 }}>
          {meta(L({ en: "Period", th: "ช่วงเวลา" }), period)}
          {meta(L({ en: "Meter", th: "มิเตอร์" }), meterId)}
          {meta(L({ en: "Generated", th: "ออกรายงาน" }), genAt || period)}
          {meta(L({ en: "Standards", th: "มาตรฐาน" }), "IEEE 1159 · ITIC")}
        </div>
      </div>

      {/* exec summary */}
      <div style={{ padding: "16px 26px", background: "#fbfdff" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: PAPER.brand, marginBottom: 9 }}>{L({ en: "Executive summary", th: "บทสรุปผู้บริหาร" })}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 9 }}>
          {kpi(L({ en: "PQ score", th: "คะแนนคุณภาพไฟ" }), String(powerQuality.score), "/100", "#059669")}
          {kpi(`${L({ en: "Events", th: "เหตุการณ์" })} · ${period}`, String(totalEvents), "", PAPER.brand)}
          {kpi(L({ en: "ITIC violations", th: "หลุดเส้น ITIC" }), String(violations), "", "#e11d48")}
          {kpi(L({ en: "Worst transient", th: "ไฟกระชากหนักสุด" }), canTransient ? transientSummary.worstKv.toFixed(1) : "—", canTransient ? "kV" : L({ en: "needs PM8240", th: "ต้องใช้ PM8240" }), "#d97706")}
        </div>
        <p style={{ margin: "11px 0 0", color: PAPER.body, fontSize: 12, lineHeight: 1.55 }}>
          {L({
            en: `Over ${period} the plant logged ${totalEvents} disturbances, ${violations} of them outside the ITIC ride-through envelope. The dominant risk is the capacitor bank's H7 resonance; the fastest relief is scheduling Chiller B's start and shedding cap-steps off-shift — both zero-invest.`,
            th: `ช่วง ${period} โรงงานบันทึกเหตุการณ์ ${totalEvents} ครั้ง หลุดเส้น ITIC ${violations} ครั้ง ความเสี่ยงหลักคือเรโซแนนซ์ H7 ของคาปาซิเตอร์แบงก์ — แก้ได้เร็วสุดโดยจัดคิวสตาร์ต Chiller B และตัดสเต็ปคาปาซิเตอร์นอกกะ ทั้งคู่ไม่ต้องลงทุน`,
          })}
        </p>
      </div>

      {/* 01 · disturbance summary */}
      {sec.summary && (
        <div style={wrapS}>
          {secHead(L({ en: "Disturbance Summary", th: "สรุปเหตุการณ์" }), L({ en: "how often each type hits", th: "แต่ละแบบเกิดบ่อยแค่ไหน" }))}
          <table style={tableS}>
            <thead><tr>
              {[L({ en: "Type", th: "ประเภท" }), L({ en: "Today", th: "วันนี้" }), L({ en: "Month", th: "เดือนนี้" }), L({ en: "Worst", th: "หนักสุด" }), L({ en: "Main source", th: "ต้นทางหลัก" }), L({ en: "Standard", th: "มาตรฐาน" }), L({ en: "Meter", th: "มิเตอร์" })].map((h, i) => <th key={i} style={{ ...thS, textAlign: i === 1 || i === 2 ? "right" : "left" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {PQ_EVENT_META.map((m) => {
                const p = pqEventProfile[m.type]; const ok = see(m.type);
                return (
                  <tr key={m.type}>
                    <td style={tdS}><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 99, background: m.color, marginRight: 6 }} />{L(m.label)}</td>
                    <td style={{ ...tdNum, color: ok ? m.color : PAPER.faint }}>{ok ? pqTally.today[m.type] : "—"}</td>
                    <td style={tdNum}>{ok ? pqTally.month[m.type] : "—"}</td>
                    <td style={tdS}>{ok ? L(p.worst) : "—"}</td>
                    <td style={tdS}>{p.source}</td>
                    <td style={{ ...tdS, color: PAPER.faint, fontSize: 10.5 }}>{p.standard}</td>
                    <td style={tdS}>{ok ? chip(L({ en: "detected", th: "ตรวจจับได้" }), "#059669") : chip(L({ en: "upgrade", th: "อัปเกรด" }), "#d97706")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 02 · event log */}
      {sec.log && (
        <div style={wrapS}>
          {secHead(L({ en: "Event Log", th: "บันทึกเหตุการณ์" }), `${L({ en: "every event as it happened", th: "ทุกเหตุการณ์ตามเวลา" })} · ${period}`)}
          <table style={tableS}>
            <thead><tr>
              {[L({ en: "Time", th: "เวลา" }), L({ en: "Type", th: "ประเภท" }), L({ en: "Detail", th: "รายละเอียด" }), L({ en: "Phase", th: "เฟส" }), L({ en: "Source", th: "แหล่ง" }), "ITIC"].map((h, i) => <th key={i} style={thS}>{h}</th>)}
            </tr></thead>
            <tbody>
              {logRows.map((e) => {
                const m = PQ_EVENT_META.find((x) => x.type === e.type)!;
                return (
                  <tr key={`${e.at}-${e.type}`}>
                    <td style={{ ...tdS, fontVariantNumeric: "tabular-nums", color: PAPER.muted, whiteSpace: "nowrap" }}>{e.at}</td>
                    <td style={tdS}>{chip(L(m.label), m.color)}</td>
                    <td style={tdS}>{L(e.detail)}</td>
                    <td style={{ ...tdS, color: PAPER.muted }}>{e.phase}</td>
                    <td style={{ ...tdS, color: PAPER.muted }}>{e.source}</td>
                    <td style={tdS}>{e.itic === "violation" ? chip("✗", "#e11d48") : chip("✓", "#059669")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 03 · AI root-cause */}
      {sec.analysis && (
        <div style={wrapS}>
          {secHead(L({ en: "AI Root-Cause Analysis", th: "การวิเคราะห์ต้นตอ (AI)" }), L({ en: "many symptoms, a few real causes", th: "อาการเยอะ แต่ต้นตอไม่กี่อย่าง" }))}
          {ROOT_CAUSES.map((rc) => {
            const ok = rank >= rc.minRank; const conf = ok ? rc.confidence : (rc.confSuspect ?? rc.confidence); const sc = SEV_HEX[rc.severity] ?? PAPER.brand;
            return (
              <div key={rc.id} style={{ border: `1px solid ${PAPER.line}`, borderLeft: `3px solid ${sc}`, borderRadius: 8, padding: "9px 12px", marginBottom: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 700, color: PAPER.ink, fontSize: 12.5 }}>{rc.rank}. {L(rc.problem)}</div>
                  <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>{chip(L(SEV_META[rc.severity].label), sc)}{chip(ok ? L({ en: "confirmed", th: "ยืนยัน" }) : L({ en: "suspected", th: "สงสัย" }), ok ? "#059669" : "#d97706")}<span style={{ fontSize: 11, fontWeight: 800, color: sc }}>{conf}%</span></div>
                </div>
                <div style={{ marginTop: 5, fontSize: 11.5 }}><b style={{ color: PAPER.muted }}>{L({ en: "Cause", th: "ต้นตอ" })}: </b>{L(rc.cause)}</div>
                <div style={{ marginTop: 3, fontSize: 11.5 }}><b style={{ color: PAPER.muted }}>{L({ en: "Fix", th: "แก้ที่" })}: </b>{L(rc.fix)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* 04 · recommended actions */}
      {sec.actions && (
        <div style={wrapS}>
          {secHead(L({ en: "Recommended Actions", th: "แนวทางแก้ไข" }), L({ en: "fix free first, then invest", th: "แก้ฟรีก่อน แล้วค่อยลงทุน" }))}
          <div style={{ fontWeight: 700, color: PAPER.ink, fontSize: 12, margin: "0 0 6px" }}>{L({ en: "Part 1 · Zero-invest quick wins", th: "ส่วนที่ 1 · แก้ฟรี ไม่ต้องลงทุน" })} <span style={{ color: "#059669" }}>· {formatTHB(qwTotal)}/{L({ en: "yr", th: "ปี" })}</span></div>
          <table style={{ ...tableS, marginBottom: 14 }}>
            <thead><tr>{[L({ en: "Action", th: "สิ่งที่ทำ" }), L({ en: "Asset", th: "จุด" }), L({ en: "Saving/yr", th: "ประหยัด/ปี" }), L({ en: "Effort", th: "แรงที่ใช้" })].map((h, i) => <th key={i} style={{ ...thS, textAlign: i === 2 ? "right" : "left" }}>{h}</th>)}</tr></thead>
            <tbody>{pqQuickWins.map((q) => (
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
            <tbody>{pqCapitalProjects.map((c) => {
              const sc = SEV_HEX[c.severity] ?? PAPER.brand;
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

      {/* footer */}
      <div style={{ padding: "12px 26px", borderTop: `1px solid ${PAPER.line}`, color: PAPER.faint, fontSize: 10, display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span>{L({ en: "Every figure comes from the incomer PQ meter & MDB analyzers — waveform-level evidence, no estimates.", th: "ทุกตัวเลขมาจากมิเตอร์ PQ จุดรับไฟ & เครื่องวิเคราะห์ที่ MDB — หลักฐานระดับรูปคลื่น ไม่มีการประมาณ" })}</span>
        <span style={{ whiteSpace: "nowrap" }}>SpareX FactoryOS · {meterId}</span>
      </div>
    </div>
  );
});

function ReportStep({ L, locale, meterId, setMeterId }: { L: Lf; locale: string; meterId: MeterId; setMeterId: (id: MeterId) => void }) {
  const rank = METERS.find((m) => m.id === meterId)!.rank;
  const [range, setRange] = useState<"today" | "month">("today");
  const [sec, setSec] = useState<Record<string, boolean>>({ summary: true, log: true, analysis: true, actions: true });
  const [genAt, setGenAt] = useState("");
  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // client-only stamp so it never trips hydration; a real "generated at" time for the report
    const d = new Date();
    setGenAt(d.toLocaleString(locale === "th" ? "th-TH" : "en-GB", { dateStyle: "medium", timeStyle: "short" }));
  }, [locale]);

  /** PDF export — the preview's own DOM is dropped into a fresh window and printed, so what
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
      `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>SpareX · Power Quality Report</title>` +
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
    const see = (t: PqEventType) => pqCanSee(rank, t);
    const period = L(REPORT_PERIOD[range]);
    const tbl = "border-collapse:collapse;font-family:Tahoma,sans-serif;font-size:12px";
    let body = `<h2 style="font-family:Tahoma;margin:0 0 4px">${esc(L({ en: "Power Quality Report", th: "รายงานคุณภาพไฟฟ้า" }))}</h2>`;
    body += `<p style="font-family:Tahoma;font-size:12px;color:#475569;margin:0 0 12px">${esc(L({ en: "Plant", th: "โรงงาน" }))}: SpareX Demo Plant &nbsp;|&nbsp; ${esc(L({ en: "Period", th: "ช่วงเวลา" }))}: ${esc(period)} &nbsp;|&nbsp; ${esc(L({ en: "Meter", th: "มิเตอร์" }))}: ${esc(meterId)}</p>`;

    if (sec.summary) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "Disturbance Summary", th: "สรุปเหตุการณ์" }))}</h3><table style="${tbl}"><tr>${[L({ en: "Type", th: "ประเภท" }), L({ en: "Today", th: "วันนี้" }), L({ en: "Month", th: "เดือนนี้" }), L({ en: "Worst", th: "หนักสุด" }), L({ en: "Main source", th: "ต้นทางหลัก" }), L({ en: "Standard", th: "มาตรฐาน" }), L({ en: "Meter", th: "มิเตอร์" })].map(th).join("")}</tr>`;
      PQ_EVENT_META.forEach((m) => { const p = pqEventProfile[m.type]; const ok = see(m.type); body += `<tr>${td(L(m.label))}${td(ok ? pqTally.today[m.type] : "-")}${td(ok ? pqTally.month[m.type] : "-")}${td(ok ? L(p.worst) : "-")}${td(p.source)}${td(p.standard)}${td(ok ? L({ en: "detected", th: "ตรวจจับได้" }) : L({ en: "needs upgrade", th: "ต้องอัปเกรด" }))}</tr>`; });
      body += `</table><br/>`;
    }
    if (sec.log) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "Event Log", th: "บันทึกเหตุการณ์" }))} — ${esc(period)}</h3><table style="${tbl}"><tr>${[L({ en: "Time", th: "เวลา" }), L({ en: "Type", th: "ประเภท" }), L({ en: "Detail", th: "รายละเอียด" }), L({ en: "Phase", th: "เฟส" }), L({ en: "Source", th: "แหล่ง" }), "ITIC"].map(th).join("")}</tr>`;
      pqNotableEvents.filter((e) => see(e.type)).forEach((e) => { const m = PQ_EVENT_META.find((x) => x.type === e.type)!; body += `<tr>${td(e.at)}${td(L(m.label))}${td(L(e.detail))}${td(e.phase)}${td(e.source)}${td(e.itic === "violation" ? "FAIL" : "PASS")}</tr>`; });
      body += `</table><br/>`;
    }
    if (sec.analysis) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "AI Root-Cause Analysis", th: "การวิเคราะห์ต้นตอ (AI)" }))}</h3><table style="${tbl}"><tr>${["#", L({ en: "Problem", th: "ปัญหา" }), L({ en: "Root cause", th: "ต้นตอ" }), L({ en: "Fix", th: "แนวทางแก้" }), L({ en: "Confidence", th: "ความมั่นใจ" }), L({ en: "Status", th: "สถานะ" })].map(th).join("")}</tr>`;
      ROOT_CAUSES.forEach((rc) => { const ok = rank >= rc.minRank; const conf = ok ? rc.confidence : (rc.confSuspect ?? rc.confidence); body += `<tr>${td(rc.rank)}${td(L(rc.problem))}${td(L(rc.cause))}${td(L(rc.fix))}${td(conf + "%")}${td(ok ? L({ en: "confirmed", th: "ยืนยัน" }) : L({ en: "suspected", th: "สงสัย" }))}</tr>`; });
      body += `</table><br/>`;
    }
    if (sec.actions) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "Recommended Actions — zero-invest", th: "แนวทางแก้ไข — แก้ฟรี" }))}</h3><table style="${tbl}"><tr>${[L({ en: "Action", th: "สิ่งที่ทำ" }), L({ en: "Asset", th: "จุด" }), L({ en: "Saving/yr", th: "ประหยัด/ปี" }), L({ en: "Effort", th: "แรงที่ใช้" })].map(th).join("")}</tr>`;
      pqQuickWins.forEach((q) => { body += `<tr>${td(L(q.title))}${td(L(q.asset))}${td(formatTHB(q.savingYr))}${td(L(q.effort))}</tr>`; });
      body += `</table><br/><h3 style="font-family:Tahoma">${esc(L({ en: "Recommended Actions — capital", th: "แนวทางแก้ไข — โครงการลงทุน" }))}</h3><table style="${tbl}"><tr>${[L({ en: "Code", th: "รหัส" }), L({ en: "Project", th: "โครงการ" }), L({ en: "Capex", th: "เงินลงทุน" }), L({ en: "Saving/yr", th: "ประหยัด/ปี" }), L({ en: "Payback (mo)", th: "คืนทุน (เดือน)" })].map(th).join("")}</tr>`;
      pqCapitalProjects.forEach((c) => { body += `<tr>${td(c.code)}${td(L(c.title))}${td(formatTHB(c.capex))}${td(formatTHB(c.savingYr))}${td(c.paybackMo)}</tr>`; });
      body += `</table>`;
    }
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>PQ Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>${body}</body></html>`;
    const blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `SpareX-PQ-Report-${range}-${meterId}.xls`;
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

        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium uppercase tracking-wide text-white/40">{L({ en: "Meter", th: "มิเตอร์" })}</label>
          <MeterDropdown L={L} meterId={meterId} setMeterId={setMeterId} badge={(m) => `H${m.maxH}`} />
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
          <ReportPaper ref={reportRef} L={L} meterId={meterId} rank={rank} range={range} sec={sec} genAt={genAt} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── visuals ── */

function polar(cx: number, cy: number, deg: number, len: number) {
  const r = (deg * Math.PI) / 180;
  return { x: cx + len * Math.cos(r), y: cy - len * Math.sin(r) };
}

/** Build the spectrum up to a meter's resolvable order. Orders 3–15 use the measured
 *  values; higher orders are synthesised with the 6-pulse (6k±1) signature decaying with
 *  order — so a higher-tier meter reveals the smaller high-order harmonics too. */
function harmonicBars(maxOrder: number): { order: number; v: number; i: number }[] {
  const bars: { order: number; v: number; i: number }[] = [];
  for (let o = 3; o <= maxOrder; o += 2) {
    const known = harmonics.find((h) => h.order === o);
    if (known) { bars.push({ order: o, v: known.v, i: known.i }); continue; }
    const char = o % 6 === 1 || o % 6 === 5; // characteristic of 6-pulse rectifiers
    const iVal = +((char ? 2.4 : 0.5) * (5 / o)).toFixed(1);
    bars.push({ order: o, v: +(iVal * 0.35).toFixed(1), i: iVal });
  }
  return bars;
}

/** Grouped V / I harmonic bars vs the IEEE-519 individual limits — extends to the
 *  selected meter's resolvable order (PM5340 → H15, ION9000 → H63). */
function HarmonicSpectrum({ L, meterId, maxH }: { L: Lf; meterId: string; maxH: number }) {
  const V_LIM = 3, I_LIM = 4, MAX = 6, BAR_H = 150;
  const px = (pct: number) => Math.max(2, (pct / MAX) * BAR_H);
  const bars = harmonicBars(maxH);
  const dense = bars.length > 14;
  return (
    <div>
      <div className="relative" style={{ height: BAR_H + 24 }}>
        <div className="absolute inset-x-0 border-t border-dashed border-rose-400/40" style={{ bottom: 24 + (I_LIM / MAX) * BAR_H }}>
          <span className="absolute -top-2 right-0 rounded bg-[#0b1526] px-1 text-[9px] text-rose-300">I-limit {I_LIM}%</span>
        </div>
        <div className="flex h-full items-end justify-between gap-1 overflow-x-auto px-1 scrollbar-hide">
          {bars.map((h, idx) => {
            const over = h.i > I_LIM || h.v > V_LIM;
            const showLabel = !dense || over || idx % 2 === 0;
            return (
              <div key={h.order} className="flex flex-1 flex-col items-center gap-1" style={{ minWidth: dense ? 14 : undefined }}>
                <div className="flex w-full items-end justify-center gap-0.5" style={{ height: BAR_H }}>
                  <div className={cn("rounded-t", dense ? "w-1.5" : "w-2.5 sm:w-3.5")} style={{ height: px(h.v), background: h.v > V_LIM ? "#f43f5e" : "#818cf8" }} title={`V ${h.v}%`} />
                  <div className={cn("rounded-t", dense ? "w-1.5" : "w-2.5 sm:w-3.5")} style={{ height: px(h.i), background: h.i > I_LIM ? "#f43f5e" : "#22d3ee" }} title={`I ${h.i}%`} />
                </div>
                <span className={cn("flex h-4 items-center justify-center text-[9.5px] tabular leading-none", over ? "font-semibold text-rose-300" : "text-white/40")}>{showLabel ? `H${h.order}` : ""}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/50">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#818cf8]" /> {L({ en: "Voltage (limit 3%)", th: "แรงดัน (ลิมิต 3%)" })}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#22d3ee]" /> {L({ en: "Current (limit 4%)", th: "กระแส (ลิมิต 4%)" })}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#f43f5e]" /> {L({ en: "over limit", th: "เกินลิมิต" })}</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-brand-200"><Cpu size={11} /> {meterId} · {L({ en: `resolves to H${maxH}`, th: `วัดถึง H${maxH}` })}</span>
      </div>
    </div>
  );
}

/** Reusable meter dropdown — shared selection, badge shows a per-meter capability string. */
function MeterDropdown({ L, meterId, setMeterId, badge }: { L: Lf; meterId: MeterId; setMeterId: (id: MeterId) => void; badge: (m: (typeof METERS)[number]) => string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} className="flex items-center gap-1.5 rounded-md border border-brand-400/30 bg-brand-400/[0.08] px-2 py-1 text-[11px] text-white/65 transition hover:bg-brand-400/[0.14]">
        <Cpu size={12} className="text-brand-300" /> <b className="text-brand-200">{meterId}</b>
        <ChevronDown size={12} className={cn("text-white/45 transition", open && "rotate-180")} />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-60 overflow-hidden rounded-lg border border-white/12 bg-ink-900 p-1 shadow-2xl" role="listbox">
            {METERS.map((m) => {
              const on = m.id === meterId;
              return (
                <button key={m.id} role="option" aria-selected={on} onClick={() => { setMeterId(m.id); setOpen(false); }} className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition", on ? "bg-brand-400/15 text-brand-200" : "text-white/70 hover:bg-white/[0.06]")}>
                  <span className="w-3.5 shrink-0">{on ? <Check size={12} /> : null}</span>
                  <span className="flex-1 truncate"><b className="tabular">{m.id}</b> <span className="text-[10px] text-white/40">{L(m.series)}</span></span>
                  <span className="shrink-0 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9.5px] font-medium text-white/60">{badge(m)}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

/** kW / kVAR / kVA right triangle from the live incomer snapshot. */
function PowerTriangle({ L }: { L: Lf }) {
  const { kw, kvar, kva } = powerQuality;
  const x0 = 30, y0 = 158, baseLen = 290;
  const scale = baseLen / kw;
  const vertY = y0 - kvar * scale;
  return (
    <svg viewBox="0 0 360 190" className="w-full">
      <polygon points={`${x0},${y0} ${x0 + baseLen},${y0} ${x0 + baseLen},${vertY}`} fill="rgba(34,211,238,0.06)" stroke="none" />
      <line x1={x0} y1={y0} x2={x0 + baseLen} y2={y0} stroke="#22d3ee" strokeWidth={2.4} />
      <line x1={x0 + baseLen} y1={y0} x2={x0 + baseLen} y2={vertY} stroke="#f59e0b" strokeWidth={2.4} />
      <line x1={x0} y1={y0} x2={x0 + baseLen} y2={vertY} stroke="#a78bfa" strokeWidth={2.4} />
      <path d={`M ${x0 + 46} ${y0} A 46 46 0 0 0 ${polar(x0, y0, PF_ANGLE, 46).x} ${polar(x0, y0, PF_ANGLE, 46).y}`} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.2} />
      <text x={x0 + 58} y={y0 - 8} fill="rgba(255,255,255,0.6)" fontSize={10}>φ {PF_ANGLE.toFixed(1)}°</text>
      <text x={x0 + baseLen / 2} y={y0 + 16} textAnchor="middle" fill="#22d3ee" fontSize={11} fontWeight={600}>P {kw.toLocaleString()} kW</text>
      <text x={x0 + baseLen + 23} y={(y0 + vertY) / 2 + 4} fill="#f59e0b" fontSize={11} fontWeight={600} transform={`rotate(-90 ${x0 + baseLen + 23} ${(y0 + vertY) / 2 + 4})`} textAnchor="middle">Q {kvar} kVAR</text>
      <text x={x0 + baseLen / 2 - 16} y={(y0 + vertY) / 2 - 14} textAnchor="middle" fill="#a78bfa" fontSize={11} fontWeight={600}>S {kva.toLocaleString()} kVA</text>
      <text x={x0} y={182} fill="rgba(255,255,255,0.35)" fontSize={9.5}>{L({ en: "true PF", th: "PF จริง" })} {powerQuality.pfTrue.toFixed(2)} · displacement {powerQuality.pfDisplacement.toFixed(2)}</text>
    </svg>
  );
}

/** ITIC / CBEMA envelope with today's disturbances plotted (log-time axis). */
function IticChart({ L }: { L: Lf }) {
  const lx = (ms: number) => 46 + ((Math.log10(ms) + 1) / 5) * 296;
  const ly = (pct: number) => 190 - (Math.min(pct, 200) / 200) * 164;
  const line = (pts: [number, number][]) => pts.map(([ms, pct], i) => `${i === 0 ? "M" : "L"}${lx(ms).toFixed(1)},${ly(pct).toFixed(1)}`).join(" ");
  const upper: [number, number][] = [[1, 200], [3, 140], [3, 120], [500, 120], [500, 110], [10000, 110]];
  const lower: [number, number][] = [[20, 0], [20, 70], [500, 70], [500, 80], [10000, 80]];
  const ticks: [number, string][] = [[1, "1ms"], [10, "10ms"], [100, "100ms"], [1000, "1s"], [10000, "10s"]];
  return (
    <svg viewBox="0 0 360 214" className="w-full text-white">
      {ticks.map(([ms, lb]) => (
        <g key={lb}>
          <line x1={lx(ms)} y1={26} x2={lx(ms)} y2={190} stroke="currentColor" strokeOpacity={0.1} />
          <text x={lx(ms)} y={202} textAnchor="middle" fill="currentColor" fillOpacity={0.42} fontSize={9}>{lb}</text>
        </g>
      ))}
      {[0, 50, 100, 150, 200].map((p) => (
        <g key={p}>
          <line x1={46} y1={ly(p)} x2={342} y2={ly(p)} stroke="currentColor" strokeOpacity={0.1} />
          <text x={40} y={ly(p) + 3} textAnchor="end" fill="currentColor" fillOpacity={0.42} fontSize={9}>{p}%</text>
        </g>
      ))}
      <line x1={46} y1={ly(100)} x2={342} y2={ly(100)} stroke="currentColor" strokeOpacity={0.3} strokeDasharray="4 4" />
      <path d={line(upper)} fill="none" stroke="#f59e0b" strokeWidth={1.6} />
      <path d={line(lower)} fill="none" stroke="#f59e0b" strokeWidth={1.6} />
      {voltageEvents.map((e) => (
        <g key={`${e.at}-${e.phase}`}>
          <circle cx={lx(e.durationMs)} cy={ly(e.magPct)} r={5} fill={e.itic === "violation" ? "#f43f5e" : "#34d399"} opacity={0.9} />
          {e.itic === "violation" ? <circle cx={lx(e.durationMs)} cy={ly(e.magPct)} r={8.5} fill="none" stroke="#f43f5e" strokeWidth={1} opacity={0.5} /> : null}
        </g>
      ))}
      <text x={342} y={ly(112) - 4} textAnchor="end" fill="#f59e0b" fontSize={8.5}>{L({ en: "ITIC envelope", th: "ขอบเขต ITIC" })}</text>
      <text x={342} y={ly(100) - 4} textAnchor="end" fill="currentColor" fillOpacity={0.45} fontSize={8.5}>{L({ en: "nominal 100%", th: "แรงดันปกติ 100%" })}</text>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────── small parts ── */

function Panel({ title, sub, icon: Icon, right, children }: { title: string; sub?: string; icon: LucideIcon; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brand-400/25 bg-brand-400/10 text-brand-300"><Icon size={17} /></span>
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

/** Event counts + today's timestamped log. Both are gated by the selected meter — a
 *  disturbance the hardware can't capture shows "needs PMxxxx" instead of a fake count,
 *  and its rows drop out of the log with a footnote, so the numbers never overstate. */
function EventsSection({ L, meterRank }: { L: Lf; meterRank: number }) {
  const minRankOf = (t: PqEventType) => DETECTION_COVERAGE.find((d) => d.key === t)?.minRank ?? 1;
  const canDetect = (t: PqEventType) => meterRank >= minRankOf(t);
  const [range, setRange] = useState<"today" | "month">("today");
  const other = range === "today" ? "month" : "today";
  const RANGE_LABEL = { today: { en: "Today", th: "วันนี้" }, month: { en: "This month", th: "เดือนนี้" } } as const;
  const rangeTotal = PQ_EVENT_META.filter((m) => canDetect(m.type)).reduce((s, m) => s + pqTally[range][m.type], 0);

  // rank the equipment causing the most disturbances in the selected range (meter-gated)
  const ranked = (() => {
    const agg = new Map<string, { name: string; feeder: string; count: number }>();
    pqSources.forEach((s) => {
      if (!canDetect(s.type)) return;
      const cur = agg.get(s.name) ?? { name: s.name, feeder: s.feeder, count: 0 };
      cur.count += s[range];
      agg.set(s.name, cur);
    });
    return [...agg.values()].sort((a, b) => b.count - a.count);
  })();
  const maxSrc = ranked[0]?.count ?? 1;

  return (
      <Panel
        title={L({ en: "Disturbance Events", th: "เหตุการณ์คุณภาพไฟ" })}
        sub={L({ en: "What happened, how often, and which machine most", th: "เกิดอะไร กี่ครั้ง และเครื่องไหนบ่อยสุด" })}
        icon={AlertTriangle}
        right={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
              {(["today", "month"] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)} className={cn("rounded-md px-2.5 py-1 text-[12px] font-medium transition", range === r ? "bg-brand-400/15 text-brand-200" : "text-white/45 hover:text-white/75")}>{L(RANGE_LABEL[r])}</button>
              ))}
            </div>
            <span className="chip text-amber-300">{rangeTotal} {L({ en: "events", th: "ครั้ง" })}</span>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PQ_EVENT_META.map((m) => {
            const live = canDetect(m.type);
            const minMeter = METERS.find((x) => x.rank === minRankOf(m.type))!;
            return (
              <div key={m.type} className={cn("rounded-xl border p-3.5", live ? "border-white/10 bg-white/[0.02]" : "border-white/8 bg-white/[0.01] opacity-70")}>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: m.color, opacity: live ? 1 : 0.4 }} />
                  <p className="text-[12.5px] font-semibold">{L(m.label)}</p>
                </div>
                {live ? (
                  <>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="tabular text-2xl font-semibold" style={{ color: m.color }}>{pqTally[range][m.type]}</span>
                      <span className="text-[11px] text-white/45">{L(RANGE_LABEL[range])}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-white/45">{L(RANGE_LABEL[other])} <b className="tabular text-white/70">{pqTally[other][m.type]}</b></p>
                  </>
                ) : (
                  <div className="mt-2">
                    <p className="tabular text-2xl font-semibold text-white/25">—</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-amber-300/80"><Cpu size={9} /> {L({ en: `needs ${minMeter.id}+`, th: `ต้องใช้ ${minMeter.id} ขึ้นไป` })}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* which equipment causes the most — ranked for the selected range */}
        <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
            {L({ en: "Most frequent sources", th: "เกิดที่เครื่องไหนบ่อยสุด" })} · {L(RANGE_LABEL[range])}
          </p>
          <div className="space-y-2.5">
            {ranked.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-md text-[11px] font-bold", i === 0 ? "bg-amber-400/20 text-amber-300" : "bg-white/[0.06] text-white/45")}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[12.5px] font-medium text-white/85">{s.name} <span className="text-[10.5px] font-normal text-white/40">· {s.feeder}</span></p>
                    <span className="shrink-0 tabular text-[12.5px] font-semibold text-amber-300">{s.count} <span className="text-[10px] font-normal text-white/40">{L({ en: "events", th: "ครั้ง" })}</span></span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full" style={{ width: `${(s.count / maxSrc) * 100}%`, backgroundColor: i === 0 ? "#f59e0b" : "rgba(245,158,11,0.55)" }} />
                  </div>
                </div>
              </div>
            ))}
            {ranked.length === 0 ? <p className="text-[12px] text-white/45">{L({ en: "No disturbances the selected meter can capture.", th: "ไม่มีเหตุการณ์ที่มิเตอร์รุ่นนี้จับได้" })}</p> : null}
          </div>
        </div>
      </Panel>
  );
}

