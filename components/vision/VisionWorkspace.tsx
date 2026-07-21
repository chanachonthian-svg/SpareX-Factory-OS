"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ScanEye, Brain, Zap, FileText, Sparkles, AlertTriangle,
  ArrowRight, ChevronRight, ExternalLink, TrendingUp, Radar,
  Wrench, Check, Eye, Activity, Download, Beaker, Building2, Cpu,
  GraduationCap, RefreshCw, Tag, Plus, UploadCloud, X, LayoutGrid, LayoutPanelLeft, Lock, Pencil,
  Clock, Package, Factory, Banknote, Settings2, RotateCcw, ScanSearch, History,
  Mail, MessageCircle, Trash2, Bell, Send, Save,
  Rocket, Wallet, Bot, Gauge, Paperclip, ChevronDown,
} from "lucide-react";
import { currentUser, SPAREX_SALES_EMAIL } from "@/lib/user";
import { Icon3D } from "@/components/os/Icon3D";
import { openCopilot, cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { WorkflowBar } from "@/components/os/WorkflowNav";
import { KpiCard } from "@/components/os/KpiCard";
import { useCostOverrides, paramsFor, setCostParam, resetCostParams, type CostParams } from "@/lib/visioncost";
import { useRuleOverrides, ruleFor, setRule, resetRule, ruleMetaFor, type DispositionRule } from "@/lib/visionrules";
import { useRecipients, addRecipient, updateRecipient, removeRecipient, toggleRecipientEvent, NOTIFY_EVENTS, type Recipient } from "@/lib/visionnotify";
import { useScheduleOverrides, setReportSchedule } from "@/lib/visionreport";
import { series } from "@/lib/telemetry";
import { createWorkOrder, useWorkOrders, WO_STATUS, WO_FLOW, type WorkOrder } from "@/lib/workorders";
import {
  defects, defectCost, scrapUnits, reworkUnits, copq, copqBreakdown, inspectedToday, defectsToday,
  fpy, defectRatePpm, modelConfidence, escapes, daysClean, qualityHealthScore, revenueAtRisk,
  stations, detections, defectByMachine, defectByShift, defectByProduct, defectByLine,
  cameraRig, CAMERA_SPEC, inspectionHealth, lineHealth,
  rootCauses, correlations, chainNodeTitles, processInsights, predictions, similarCases,
  defectClasses, classById, learningQueue,
  actions, actionFor, simScenarios, reportTemplates, copilotSuggestions, thbCompact,
  type LZ, type Correlation, type Action, type Glyph, type LearnItem, type DefectClass, type RigCam, type ReportSchedule, type ReportTemplate,
} from "@/lib/vision";

type Tr = (o: LZ) => string;
const PURPLE = "#c084fc";
const scoreColor = (v: number) => (v >= 90 ? "#34d399" : v >= 80 ? "#22d3ee" : v >= 70 ? "#f59e0b" : "#f43f5e");
const scoreVar = (v: number) => (v >= 90 ? "var(--c-emerald)" : v >= 80 ? "var(--c-cyan)" : v >= 70 ? "var(--c-amber-strong)" : "var(--c-rose)");

/* live process-pulse data — deterministic (no Math.random at module scope, keeps SSR stable):
   reject rate in 5-min windows over the last ~2 h, drifting up into a control-limit breach. */
const RR_WINDOWS = [0.9, 1.1, 0.8, 1.0, 1.2, 0.9, 1.1, 1.3, 1.0, 1.2, 1.4, 1.1, 1.3, 1.5, 1.2, 1.4, 1.6, 1.8, 1.9, 2.2, 2.5, 2.9, 3.2, 3.1];
const RR_BASELINE = 1.15; // process mean
const RR_UCL = 2.0;       // upper control limit (mean + 3σ)
const INSPECT_PACE = { partsMin: 39, capacityMin: 41, cycleS: 1.42, taktS: 1.5 }; // is the QC gate keeping up with line takt?

/* quality goals (what "good" looks like) + today's defects by hour — both deterministic. */
const QUALITY_TARGETS = { fpy: 99.5, defectPpm: 5000, copqDay: 35_000 };
// defects cluster at shift-start warm-up (08), a mid-shift changeover (14) and the night-shift start (22)
const DEFECT_BY_HOUR = [5, 4, 4, 3, 3, 4, 6, 10, 16, 12, 9, 8, 9, 13, 17, 12, 9, 8, 7, 7, 9, 12, 15, 10];

/* ── Vision Action data — Part 1 zero-invest quick wins + Part 2 capital projects (BOM) ── */

/** One BOM line on a capital project — brand + part number an engineer can order. */
type ActionPart = { brand: string; partNo: string; name: LZ; qty: number; unitPrice: number };

/** Part 1 · Quick wins — no hardware, config / scheduling only (฿0 capex). */
const visionQuickWins: { id: string; title: LZ; asset: LZ; how: LZ; savingYr: number; effort: LZ }[] = [
  {
    id: "qw-firstoff",
    title: { en: "Enforce first-off approval after every changeover", th: "บังคับอนุมัติชิ้นแรกทุกครั้งหลังเปลี่ยนรุ่น" },
    asset: { en: "All lines · setup", th: "ทุกไลน์ · เซ็ตอัพ" },
    how: { en: "Gate the line via PLC so production can't start until QC approves the first part after a changeover or shift start — kills the 30-minute post-changeover defect spike.", th: "ล็อกไลน์ผ่าน PLC ไม่ให้เดินเครื่องจนกว่า QC อนุมัติชิ้นแรกหลังเปลี่ยนรุ่น/เปิดกะ — ดับพีคดีเฟกต์ 30 นาทีแรกหลังเปลี่ยนรุ่น" },
    savingYr: 1_200_000,
    effort: { en: "SOP + PLC interlock", th: "SOP + อินเตอร์ล็อก PLC" },
  },
  {
    id: "qw-nightcert",
    title: { en: "Certify & retrain the Shift-B setup crew", th: "อบรม & รับรองทีมเซ็ตอัพกะดึก B" },
    asset: { en: "Shift B", th: "กะดึก B" },
    how: { en: "Shift B's defect rate runs 2.1× the day shift — a one-cycle setup certification closes the gap with no hardware.", th: "อัตราของเสียกะ B สูงเป็น 2.1 เท่าของกะเช้า — อบรมรับรองการเซ็ตอัพรอบเดียวก็ปิดช่องว่างได้โดยไม่ต้องมีฮาร์ดแวร์" },
    savingYr: 900_000,
    effort: { en: "1 training cycle", th: "อบรม 1 รอบ" },
  },
  {
    id: "qw-diecheck",
    title: { en: "Add an 8,000-stroke die-wear check to the SOP", th: "เพิ่มเช็คระยะดายทุก 8,000 สโตรกใน SOP" },
    asset: { en: "Stamping Press 03", th: "Stamping Press 03" },
    how: { en: "Schedule a quick die-clearance check every 8,000 strokes so drift is caught before parts creep over spec — buys time to plan the regrind.", th: "ตั้งเช็คระยะดายทุก 8,000 สโตรก จับการดริฟต์ก่อนชิ้นงานเกินสเปก — มีเวลาวางแผนเจียรดายล่วงหน้า" },
    savingYr: 700_000,
    effort: { en: "SOP update", th: "อัปเดต SOP" },
  },
  {
    id: "qw-coilqc",
    title: { en: "Gauge & quarantine suspect incoming coil lots", th: "วัดความหนา & กักล็อตคอยล์ต้องสงสัยขาเข้า" },
    asset: { en: "Incoming QC", th: "ตรวจรับเข้า" },
    how: { en: "Add a coil-thickness check at goods-in and hold any lot outside spec — stops out-of-spec coil from ever reaching the press.", th: "เพิ่มการวัดความหนาคอยล์ตอนรับเข้า และกักล็อตที่หลุดสเปก — กันคอยล์นอกสเปกไม่ให้ถึงเครื่องปั๊ม" },
    savingYr: 500_000,
    effort: { en: "incoming inspection step", th: "เพิ่มขั้นตรวจรับเข้า" },
  },
  {
    id: "qw-boothdp",
    title: { en: "Weekly ΔP check on the Paint Booth 14 exhaust filter", th: "เช็ค ΔP กรองไอเสีย Paint Booth 14 รายสัปดาห์" },
    asset: { en: "Paint Booth 14", th: "Paint Booth 14" },
    how: { en: "A weekly differential-pressure check flags a clogging exhaust filter before airflow drops and color runs/sags appear.", th: "เช็คความต่างความดัน (ΔP) รายสัปดาห์ จับไส้กรองตันก่อนลมตกและเกิดสีย้อย/สีไหล" },
    savingYr: 400_000,
    effort: { en: "weekly PM", th: "PM รายสัปดาห์" },
  },
];

/** Part 2 · Capital projects — with investment; each carries a full BOM (brand + part no.). */
const visionCapitalProjects: {
  id: string; code: string; title: LZ; asset: LZ; severity: "critical" | "warning" | "recommend";
  capex: number; savingYr: number; paybackMo: number; roi: number;
  why: LZ; evidence: LZ; outcome: LZ; parts: ActionPart[];
}[] = [
  {
    id: "vis-die", code: "VIS-01",
    title: { en: "Regrind the die + fit a new shim set · Stamping Press 03", th: "เจียรดาย + เปลี่ยนชุดชิม · Stamping Press 03" },
    asset: { en: "Stamping Press 03", th: "Stamping Press 03" },
    severity: "critical", capex: 85_000, savingYr: 2_400_000, paybackMo: 1, roi: 2824,
    why: { en: "The worn Press 03 die is the single biggest defect source — parts creep oversize until they're rejected.", th: "ดายที่สึกของ Press 03 เป็นต้นตอดีเฟกต์ที่ใหญ่สุด — ชิ้นงานค่อยๆ ใหญ่เกินจนถูกคัดออก" },
    evidence: { en: "Measured part size climbs steadily with strokes since the last die service, crossing the +0.25mm limit.", th: "ขนาดชิ้นงานที่วัดได้ไต่ขึ้นตามจำนวนสโตรกตั้งแต่ซ่อมดายครั้งล่าสุด จนเกินลิมิต +0.25mm" },
    outcome: { en: "Part size returns within spec and the dimensional defect disappears at its source.", th: "ขนาดชิ้นงานกลับเข้าสเปกและดีเฟกต์เรื่องขนาดหายที่ต้นตอ" },
    parts: [
      { brand: "Precision Tooling", partNo: "DIE-REGRIND-SP03", name: { en: "Die regrind & polish service", th: "บริการเจียร & ขัดดาย" }, qty: 1, unitPrice: 55000 },
      { brand: "Misumi", partNo: "SHIM-SET-0.05-0.5", name: { en: "Precision shim set 0.05–0.5mm", th: "ชุดชิมความละเอียด 0.05–0.5mm" }, qty: 1, unitPrice: 8000 },
      { brand: "Mitutoyo", partNo: "543-390B ABS Digimatic", name: { en: "Digital indicator for die-clearance", th: "ไดอัลเกจดิจิทัลวัดระยะดาย" }, qty: 1, unitPrice: 12000 },
    ],
  },
  {
    id: "vis-coil", code: "VIS-02",
    title: { en: "Inline coil-thickness gauge + auto lot reject", th: "ติดเกจวัดความหนาคอยล์อินไลน์ + คัดล็อตอัตโนมัติ" },
    asset: { en: "Coil feed · press line", th: "ชุดป้อนคอยล์ · ไลน์ปั๊ม" },
    severity: "warning", capex: 320_000, savingYr: 1_400_000, paybackMo: 3, roi: 438,
    why: { en: "Out-of-spec coil lots slip through and cause weld pinholes and assembly misfits.", th: "ล็อตคอยล์นอกสเปกหลุดเข้ามา ทำให้เกิดรูพรุนแนวเชื่อมและประกอบไม่เข้า" },
    evidence: { en: "Defects cluster on Model B right after a coil-lot change.", th: "ดีเฟกต์กระจุกที่ Model B ทันทีหลังเปลี่ยนล็อตคอยล์" },
    outcome: { en: "Bad coil is caught and diverted before the press — pinhole & misfit defects drop.", th: "คอยล์เสียถูกจับและคัดออกก่อนถึงเครื่องปั๊ม — รูพรุน & ประกอบไม่เข้าลดลง" },
    parts: [
      { brand: "Micro-Epsilon", partNo: "thicknessSENSOR 2301", name: { en: "Inline thickness sensor pair", th: "เซนเซอร์วัดความหนาอินไลน์ (คู่)" }, qty: 1, unitPrice: 210000 },
      { brand: "SMC", partNo: "Reject diverter kit", name: { en: "Pneumatic lot-reject diverter", th: "ชุดคัดล็อตแบบนิวเมติก" }, qty: 1, unitPrice: 70000 },
    ],
  },
  {
    id: "vis-booth", code: "VIS-03",
    title: { en: "Upgrade the Paint Booth 14 exhaust + swap the filter bank", th: "อัปเกรดระบบดูดไอเสีย + เปลี่ยนชุดกรอง Paint Booth 14" },
    asset: { en: "Paint Booth 14", th: "Paint Booth 14" },
    severity: "warning", capex: 280_000, savingYr: 900_000, paybackMo: 4, roi: 321,
    why: { en: "Weak/uneven exhaust lets overspray settle, causing color runs & sags.", th: "ลมดูดอ่อน/ไม่สม่ำเสมอทำให้ละอองสีเกาะ เกิดสีย้อย & สีไหล" },
    evidence: { en: "Color defects rise as the exhaust ΔP drifts up between filter changes.", th: "ดีเฟกต์เรื่องสีเพิ่มขึ้นเมื่อ ΔP ไอเสียไต่สูงระหว่างรอบเปลี่ยนกรอง" },
    outcome: { en: "Stable airflow and clean extraction — color runs/sags come back under control.", th: "ลมนิ่งและดูดสะอาด — สีย้อย/สีไหลกลับมาคุมได้" },
    parts: [
      { brand: "Camfil", partNo: "Paint-stop filter bank", name: { en: "Exhaust filter bank", th: "ชุดไส้กรองไอเสีย" }, qty: 1, unitPrice: 120000 },
      { brand: "Schneider Electric", partNo: "Altivar ATV320 5.5kW", name: { en: "Exhaust-fan VFD", th: "VFD พัดลมดูดไอเสีย" }, qty: 1, unitPrice: 65000 },
      { brand: "Endress+Hauser", partNo: "Deltabar PMD75", name: { en: "ΔP transmitter", th: "ทรานสมิตเตอร์วัด ΔP" }, qty: 1, unitPrice: 45000 },
    ],
  },
  {
    id: "vis-cam", code: "VIS-04",
    title: { en: "Add a 4th inspection camera + ring light for the blind spot", th: "เพิ่มกล้องตรวจตัวที่ 4 + ไฟวงแหวนที่จุดบอด" },
    asset: { en: "V-B1 AI QC cell", th: "เซลล์ตรวจ AI V-B1" },
    severity: "recommend", capex: 240_000, savingYr: 600_000, paybackMo: 5, roi: 250,
    why: { en: "One face of the part is under-covered, so a fraction of surface defects escape the current 3-camera rig.", th: "ชิ้นงานด้านหนึ่งครอบคลุมไม่พอ ดีเฟกต์ผิวบางส่วนจึงหลุดจากชุดกล้อง 3 ตัวปัจจุบัน" },
    evidence: { en: "Escapes trace back to the same unlit face on the fixture.", th: "ของหลุดสืบกลับไปที่หน้าที่ไม่มีไฟส่องเดิมบนฟิกซ์เจอร์" },
    outcome: { en: "Full 4-angle coverage — the surface-defect escape rate drops toward zero.", th: "ครอบคลุมครบ 4 มุม — อัตราของหลุดจากดีเฟกต์ผิวลดเข้าใกล้ศูนย์" },
    parts: [
      { brand: "OMRON", partNo: "STC-HD213DV", name: { en: "Industrial camera 2.1MP", th: "กล้องอุตสาหกรรม 2.1MP" }, qty: 1, unitPrice: 95000 },
      { brand: "OMRON", partNo: "FLV-RL ring light", name: { en: "High-intensity ring light", th: "ไฟวงแหวนความเข้มสูง" }, qty: 1, unitPrice: 35000 },
      { brand: "Computar", partNo: "M118FM50 lens", name: { en: "Machine-vision lens 50mm", th: "เลนส์แมชชีนวิชัน 50mm" }, qty: 1, unitPrice: 28000 },
      { brand: "Basler", partNo: "GigE interface card", name: { en: "GigE capture card", th: "การ์ดจับภาพ GigE" }, qty: 1, unitPrice: 22000 },
    ],
  },
];

/* ══════════════════════════ shared bits ══════════════════════════ */
function Panel({ title, sub, extra, children, className }: { title?: string; sub?: string; extra?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("panel p-5", className)}>
      {title ? <div className="mb-3 flex items-start justify-between gap-3"><div><h3 className="font-semibold">{title}</h3>{sub ? <p className="mt-0.5 text-xs text-white/45">{sub}</p> : null}</div>{extra}</div> : null}
      {children}
    </div>
  );
}
function Ring({ value, size = 130, stroke = 10 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, col = scoreColor(value);
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} /><motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - value / 100) }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} style={{ filter: `drop-shadow(0 0 6px ${col}66)` }} /></svg>
      <div className="absolute text-center"><p className="tabular text-4xl font-semibold" style={{ color: scoreVar(value) }}>{value}</p><p className="text-xs text-white/40">/ 100</p></div>
    </div>
  );
}
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
function AreaTrend({ data, color = PURPLE, data2, color2 = "#f43f5e" }: { data: number[]; color?: string; data2?: number[]; color2?: string }) {
  const W = 300, H = 70;
  const toPath = (arr: number[]) => {
    const max = Math.max(...arr), min = Math.min(...arr);
    return arr.map((v, i) => [(i / (arr.length - 1)) * W, H - ((v - min) / (max - min || 1)) * (H - 8) - 4] as const)
      .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  };
  const line = toPath(data);
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 70 }}>
      <defs><linearGradient id="vTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.28" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill="url(#vTrend)" /><path d={line} fill="none" stroke={color} strokeWidth="2" />
      {data2 ? <path d={toPath(data2)} fill="none" stroke={color2} strokeWidth="2" strokeDasharray="1 0" opacity="0.9" /> : null}
    </svg>
  );
}

/* ══════════════════ signature: 3-camera AI inspection cell (OMRON STC-HD213DV) ══════════════════ */
const WHITE = "rgba(255,255,255,0.88)";
/** part silhouette + AI overlay drawn from each camera's viewpoint (viewBox 340×210) */
function PartView({ cam }: { cam: RigCam }) {
  if (cam.angle === "top") {
    return (
      <>
        {/* plan view of the stamped part */}
        <rect x="96" y="52" width="150" height="104" rx="10" fill="#161d2a" stroke="#33465f" strokeWidth="1.5" />
        <circle cx="128" cy="104" r="11" fill="#0c1119" stroke="#33465f" />
        <line x1="188" y1="60" x2="188" y2="148" stroke="#26374d" strokeDasharray="3 3" />
        <rect x="202" y="70" width="30" height="26" rx="3" fill="#0c1119" stroke="#33465f" />
        {/* dimensional caliper along the flagged width */}
        <line x1="176" y1="168" x2="246" y2="168" stroke="#f43f5e" strokeWidth="1" />
        <path d="M176,164 v8 M246,164 v8" stroke="#f43f5e" strokeWidth="1" />
        {/* defect box */}
        <rect x="176" y="78" width="70" height="52" fill="none" stroke="#f43f5e" strokeWidth="2" />
        <rect x="158" y="62" width="140" height="15" fill="#f43f5e" /><text x="163" y="73" style={{ fontSize: 10, fill: "#fff", fontWeight: 600 }}>DIM +0.31mm · 99.1%</text>
        {[[176, 78], [246, 78], [176, 130], [246, 130]].map(([x, y], i) => <path key={i} d={`M${x - 5},${y} h10 M${x},${y - 5} v10`} stroke="#f43f5e" strokeWidth="1.6" />)}
      </>
    );
  }
  const mirror = cam.angle === "right";
  const flangeX = mirror ? 118 : 200;
  const passX = mirror ? 104 : 196;
  return (
    <>
      {/* side profile of the stamped bracket */}
      <rect x="86" y="120" width="168" height="16" rx="2" fill="#161d2a" stroke="#33465f" strokeWidth="1.5" />
      <rect x={flangeX} y="82" width="22" height="40" rx="2" fill="#161d2a" stroke="#33465f" strokeWidth="1.5" />
      {/* edge-inspection ticks along the top surface */}
      {[100, 118, 136, 154, 172, 190, 208, 226].map((x) => <line key={x} x1={x} y1="116" x2={x} y2="120" stroke="#3a5170" strokeWidth="1" />)}
      {/* pass box on the inspected edge */}
      <rect x={passX} y="74" width="52" height="52" fill="none" stroke="#34d399" strokeWidth="2" strokeDasharray="5 3" />
      <text x={passX} y="68" style={{ fontSize: 10, fill: "#34d399" }}>PASS · {cam.acc}%</text>
    </>
  );
}
function CamTile({ cam, index, L, compact, onClick }: { cam: RigCam; index: number; L: Tr; compact?: boolean; onClick?: () => void }) {
  const bad = !!cam.finding;
  const accent = bad ? "#f43f5e" : "#34d399";
  const body = (
    <>
      <div className="h-0.5 w-full shrink-0" style={{ backgroundColor: accent }} />
      <div className={cn("relative bg-black", compact && "min-h-[150px] flex-1")}>
        <svg viewBox="0 0 340 210" className={compact ? "absolute inset-0 h-full w-full" : "block w-full"} preserveAspectRatio={compact ? "xMidYMid slice" : "xMidYMid meet"}>
          <rect width="340" height="210" fill="#0a0e16" />
          {[85, 170, 255].map((x) => <line key={`x${x}`} x1={x} y1="0" x2={x} y2="210" stroke="#141b27" strokeWidth="1" />)}
          {[70, 140].map((y) => <line key={`y${y}`} x1="0" y1={y} x2="340" y2={y} stroke="#141b27" strokeWidth="1" />)}
          <PartView cam={cam} />
          {/* centre reticle */}
          <path d="M170,98 v14 M163,105 h14" stroke={PURPLE} strokeWidth="1" opacity="0.5" />
          {/* scan line — staggered per camera */}
          <motion.line x1="0" x2="340" y1="0" y2="0" stroke={PURPLE} strokeWidth="1.5" strokeOpacity="0.5" initial={{ y1: 16, y2: 16 }} animate={{ y1: 196, y2: 196 }} transition={{ duration: 2.4, repeat: Infinity, ease: "linear", delay: index * 0.8 }} />
          {/* HUD corners */}
          {[[14, 14, 1, 1], [326, 14, -1, 1], [14, 196, 1, -1], [326, 196, -1, -1]].map(([x, y, dx, dy], i) => <path key={i} d={`M${x},${y + dy * 12} v${-dy * 12} h${dx * 12}`} stroke={PURPLE} strokeWidth="2" fill="none" opacity="0.7" />)}
        </svg>
        <div className={cn("absolute left-2 top-2 flex items-center gap-1.5 rounded bg-black/55 px-1.5 py-0.5 font-medium backdrop-blur", compact ? "text-[8px]" : "text-[9px]")} style={{ color: WHITE }}>
          <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-70" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" /></span>REC · {cam.id}
        </div>
        <div className={cn("absolute right-2 top-2 rounded bg-black/55 px-1.5 py-0.5 font-semibold backdrop-blur", compact ? "text-[8px]" : "text-[9px]")} style={{ color: WHITE }}>{L(cam.pos).toUpperCase()}</div>
        {!compact ? <div className="absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[8.5px] backdrop-blur" style={{ color: WHITE }}>OMRON STC-HD213DV</div> : null}
        {!compact ? <div className="absolute bottom-2 right-2 rounded bg-black/55 px-1.5 py-0.5 text-[8.5px] tabular backdrop-blur" style={{ color: WHITE }}>{CAMERA_SPEC.res} · {cam.fps}fps</div> : null}
      </div>
      <div className={cn("flex shrink-0 items-center justify-between gap-2 bg-white/[0.02]", compact ? "px-2 py-1" : "px-2.5 py-1.5")}>
        <span className={cn("truncate text-white/60", compact ? "text-[10px]" : "text-[11px]")}>{L(cam.check)}</span>
        <span className={cn("shrink-0 rounded px-1.5 py-0.5 font-semibold", compact ? "text-[9px]" : "text-[10px]")} style={{ color: bad ? "var(--c-rose)" : "var(--c-emerald)", backgroundColor: `${accent}1f` }}>{bad ? cam.finding!.label : L({ en: "PASS", th: "ผ่าน" })}</span>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button onClick={onClick} className={cn("group block w-full overflow-hidden rounded-xl border border-white/10 text-left transition hover:border-brand-400/50 hover:shadow-[0_0_0_1px_rgba(96,165,250,0.25)]", compact && "flex h-full flex-col")} title={L({ en: "Click to enlarge this view", th: "คลิกเพื่อขยายมุมนี้" })}>
        {body}
      </button>
    );
  }
  return <div className="overflow-hidden rounded-xl border border-brand-400/35 ring-1 ring-brand-400/20">{body}</div>;
}
function MultiCameraInspection({ L }: { L: Tr }) {
  const [selId, setSelId] = useState(cameraRig[0].id);
  const [layout, setLayout] = useState<"focus" | "grid">("focus");
  const main = cameraRig.find((c) => c.id === selId) ?? cameraRig[0];
  const rest = cameraRig.filter((c) => c.id !== main.id);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
        <ScanEye size={15} className="text-purple-300" />
        <span className="text-[12px] font-medium text-white/80">{L({ en: "3-camera inspection cell", th: "เซลล์ตรวจ  3 กล้อง" })}</span>
        <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-white/70">OMRON STC-HD213DV ×3</span>
        <span className="text-[10px] text-white/40">{CAMERA_SPEC.sensor} · {CAMERA_SPEC.res} ({CAMERA_SPEC.mp}MP) · {CAMERA_SPEC.fps}fps · {CAMERA_SPEC.iface}</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
            {([["focus", LayoutPanelLeft, { en: "Main + side", th: "จอหลัก + ย่อ" }], ["grid", LayoutGrid, { en: "3 equal", th: "3 จอเท่ากัน" }]] as ["focus" | "grid", typeof LayoutGrid, LZ][]).map(([id, Icon, lab]) => (
              <button key={id} onClick={() => setLayout(id)} title={L(lab)} className={cn("flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium transition", layout === id ? "bg-white/10 text-white/90" : "text-white/45 hover:text-white/70")}><Icon size={13} /> <span className="max-sm:hidden">{L(lab)}</span></button>
            ))}
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{L({ en: "synchronized", th: "ซิงก์ตรงกัน" })}</span>
        </div>
      </div>
      {layout === "focus" ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_250px]">
          <motion.div key={main.id} initial={{ opacity: 0.4, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
            <CamTile cam={main} index={cameraRig.indexOf(main)} L={L} />
          </motion.div>
          <div className="flex min-w-0 gap-3 max-lg:grid max-lg:grid-cols-2 lg:flex-col">
            {rest.map((cam) => <div key={cam.id} className="min-h-0 lg:flex-1"><CamTile cam={cam} index={cameraRig.indexOf(cam)} L={L} compact onClick={() => setSelId(cam.id)} /></div>)}
          </div>
        </div>
      ) : (
        <div>
          <div className="grid gap-3 md:grid-cols-3">
            {cameraRig.map((cam, i) => <CamTile key={cam.id} cam={cam} index={i} L={L} onClick={() => { setSelId(cam.id); setLayout("focus"); }} />)}
          </div>
          <p className="mt-2 text-center text-[10px] text-white/35">{L({ en: "click a view to focus on it", th: "คลิกมุมใดก็ได้เพื่อขยายเป็นจอหลัก" })}</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════ live process pulse — SPC + throughput (statistical, not AI) ══════════════ */
/** Reject-rate control chart with real axes — Y = reject rate %, X = time (last 2 h).
 *  Mean + UCL are labelled reference lines; points above the limit go red, latest ringed.
 *  Keeps its aspect ratio (no stretch) so labels stay crisp in both themes. */
function RejectRateSPC({ data, baseline, ucl, L }: { data: number[]; baseline: number; ucl: number; L: Tr }) {
  const VW = 620, VH = 210, mL = 30, mR = 48, mT = 10, mB = 26;
  const pw = VW - mL - mR, ph = VH - mT - mB;
  const peak = Math.max(ucl, ...data);
  const yMax = peak <= 3.5 ? 4 : Math.ceil(peak + 0.5);
  const x = (i: number) => mL + (i / (data.length - 1)) * pw;
  const y = (v: number) => mT + ph - (v / yMax) * ph;
  const line = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${mT + ph} L${x(0).toFixed(1)},${mT + ph} Z`;
  const yTicks = Array.from({ length: yMax + 1 }, (_, t) => t);
  const xTicks = [
    { i: 0, lab: L({ en: "2h ago", th: "2 ชม.ก่อน" }), a: "start" as const },
    { i: Math.round((data.length - 1) / 2), lab: L({ en: "1h ago", th: "1 ชม.ก่อน" }), a: "middle" as const },
    { i: data.length - 1, lab: L({ en: "now", th: "ตอนนี้" }), a: "end" as const },
  ];
  const AX = "#94a3b8";
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ aspectRatio: `${VW} / ${VH}` }}>
      <defs><linearGradient id="rrArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={PURPLE} stopOpacity="0.22" /><stop offset="1" stopColor={PURPLE} stopOpacity="0" /></linearGradient></defs>
      {/* out-of-control band (above UCL) */}
      <rect x={mL} y={mT} width={pw} height={y(ucl) - mT} fill="rgba(244,63,94,0.06)" />
      {/* Y grid + % labels */}
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={mL} x2={mL + pw} y1={y(t)} y2={y(t)} stroke={AX} strokeOpacity="0.14" strokeWidth="1" />
          <text x={mL - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10.5" fill={AX}>{t}{t === yMax ? "%" : ""}</text>
        </g>
      ))}
      {/* baseline + UCL reference lines, labelled at the right edge */}
      <line x1={mL} x2={mL + pw} y1={y(baseline)} y2={y(baseline)} stroke={AX} strokeOpacity="0.85" strokeWidth="1" strokeDasharray="2 3" />
      <text x={mL + pw + 5} y={y(baseline) + 3.5} fontSize="10" fill={AX}>{L({ en: "base", th: "ฐาน" })} {baseline}</text>
      <line x1={mL} x2={mL + pw} y1={y(ucl)} y2={y(ucl)} stroke="#f43f5e" strokeOpacity="0.7" strokeWidth="1" strokeDasharray="5 3" />
      <text x={mL + pw + 5} y={y(ucl) + 3.5} fontSize="10" fill="#f43f5e" fontWeight="600">UCL {ucl}</text>
      {/* X axis + time labels */}
      <line x1={mL} x2={mL + pw} y1={mT + ph} y2={mT + ph} stroke={AX} strokeOpacity="0.35" strokeWidth="1" />
      {xTicks.map((t) => <text key={t.i} x={x(t.i)} y={VH - 8} textAnchor={t.a} fontSize="10.5" fill={AX}>{t.lab}</text>)}
      {/* series */}
      <path d={area} fill="url(#rrArea)" />
      <path d={line} fill="none" stroke={PURPLE} strokeWidth="2" strokeLinejoin="round" />
      {data.map((v, i) => { const over = v > ucl; const last = i === data.length - 1; return <circle key={i} cx={x(i)} cy={y(v)} r={last ? 4 : over ? 3 : 1.8} fill={over ? "#f43f5e" : PURPLE} stroke={last ? "#fff" : "none"} strokeWidth={last ? 1.5 : 0} />; })}
    </svg>
  );
}
function PaceStat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2">
      <p className="text-[10px] text-white/45">{label}</p>
      <p className="tabular text-[15px] font-semibold" style={{ color }}>{value} <span className="text-[10px] font-normal text-white/45">{unit}</span></p>
    </div>
  );
}
/** The act-now heartbeat of Monitor: a live reject-rate control chart that trips a run-rule
 *  alert the moment a line drifts out of control, plus whether the gate is keeping up with the
 *  line. It states the statistical fact and hands the "why" to AI Analysis — no diagnosis here. */
function ProcessPulse({ L, onInvestigate }: { L: Tr; onInvestigate: () => void }) {
  const latest = RR_WINDOWS[RR_WINDOWS.length - 1];
  const breach = latest > RR_UCL;
  const ratio = (latest / RR_BASELINE).toFixed(1);
  let over = 0; for (let i = RR_WINDOWS.length - 1; i >= 0 && RR_WINDOWS[i] > RR_UCL; i--) over++;
  const critLine = lineHealth.find((l) => l.tone === "crit") ?? [...lineHealth].sort((a, b) => b.count - a.count)[0];
  const topMachine = defectByMachine[0];
  const util = Math.round((INSPECT_PACE.cycleS / INSPECT_PACE.taktS) * 100);
  return (
    <Panel title={L({ en: "Process Pulse", th: "สัญญาณกระบวนการปัจจุบัน" })} sub={L({ en: "catch a line drifting before scrap escapes — statistical, not AI", th: "จับไลน์ที่กำลังเพี้ยนก่อนของเสียหลุด — สัญญาณเชิงสถิติ ไม่ใช่ AI" })} extra={<span className="chip text-emerald-300"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" />{L({ en: "live", th: "ขณะนี้" })}</span>}>
      {breach ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-rose-400/30 bg-rose-500/[0.08] px-3.5 py-2.5">
          <AlertTriangle size={16} className="shrink-0 text-rose-300" />
          <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-white/80">
            <b className="text-rose-300">{critLine.line}</b> · {L({ en: `reject rate ${latest}% (${ratio}× baseline) — ${over} windows in a row above UCL ${RR_UCL}%`, th: `อัตราคัดออกล่าสุด ${latest}% (${ratio}× ของฐาน) — ${over} ช่วงติดกันเกินเส้นควบคุม UCL ${RR_UCL}%` })} · <span className="text-white/55">{L({ en: `hotspot ${topMachine.machine} (${topMachine.count} pcs today)`, th: `จุดร้อน ${topMachine.machine} (${topMachine.count} ชิ้นวันนี้)` })}</span>
          </p>
          <button onClick={onInvestigate} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-brand-400/40 bg-brand-400/10 px-2.5 py-1 text-[11.5px] font-medium text-brand-200 transition hover:bg-brand-400/20">{L({ en: "Find the cause in AI Analysis", th: "ดูต้นตอใน AI Analysis" })} <ArrowRight size={12} /></button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] px-3.5 py-2.5 text-[12.5px] text-emerald-200"><Check size={15} /> {L({ en: "All lines within control limits", th: "ทุกไลน์อยู่ในเส้นควบคุม" })}</div>
      )}

      <div className="mt-3.5 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-white/45">
            <span>{L({ en: "Reject rate · 5-min windows · last 2 h", th: "อัตราคัดออก · จุดละ 5 นาที · 2 ชม.ล่าสุด" })}</span>
            <span>{L({ en: "latest", th: "ล่าสุด" })} <b className="tabular" style={{ color: breach ? "var(--c-rose)" : PURPLE }}>{latest}%</b></span>
          </div>
          <RejectRateSPC data={RR_WINDOWS} baseline={RR_BASELINE} ucl={RR_UCL} L={L} />
          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-white/40"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> {L({ en: "red points = out of control (above UCL)", th: "จุดแดง = หลุดควบคุม (เกินเส้น UCL)" })}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-2.5">
          <PaceStat label={L({ en: "Throughput", th: "อัตราการตรวจ" })} value={`${INSPECT_PACE.partsMin}`} unit={L({ en: `pcs/min · of ${INSPECT_PACE.capacityMin}`, th: `ชิ้น/นาที · จาก ${INSPECT_PACE.capacityMin}` })} color="#22d3ee" />
          <PaceStat label={L({ en: "Cycle time", th: "รอบต่อชิ้น" })} value={`${INSPECT_PACE.cycleS}`} unit={L({ en: "s/pc", th: "วิ/ชิ้น" })} color={PURPLE} />
          <div className="rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2">
            <p className="text-[10px] text-white/45">{L({ en: "QC gate vs line takt", th: "ด่าน QC เทียบจังหวะสาย" })}</p>
            <p className="tabular text-[15px] font-semibold" style={{ color: util <= 100 ? "var(--c-emerald)" : "var(--c-amber-strong)" }}>{util}% <span className="text-[10px] font-normal text-white/45">{util <= 100 ? L({ en: "keeping up", th: "ตามทัน" }) : L({ en: "behind", th: "ตามไม่ทัน" })}</span></p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${Math.min(util, 100)}%`, background: util <= 100 ? "#34d399" : "#f59e0b" }} /></div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ══════════════ shared defect analytics — aggregated views (Insight, not live) ══════════════ */
/** Type × line concentration — where defects cluster over the shift. Aggregated → belongs in Insight. */
function DefectHeatmapPanel({ L }: { L: Tr }) {
  return (
    <Panel title={L({ en: "Defect Heatmap", th: "ฮีทแมปดีเฟกต์" })} sub={L({ en: "type × line · darker = more concentrated — see where problems cluster at a glance", th: "ชนิด × ไลน์ · สีเข้ม = หนาแน่น — เห็นทันทีว่าปัญหากระจุกอยู่ที่ไหน" })}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
            <th className="px-2 py-2 font-medium">{L({ en: "Defect", th: "ดีเฟกต์" })}</th>
            {["Line A", "Line B", "Line C"].map((ln) => <th key={ln} className="px-2 py-2 text-center font-medium">{ln}</th>)}
            <th className="px-2 py-2 text-right font-medium">{L({ en: "Total", th: "รวม" })}</th>
          </tr></thead>
          <tbody>
            {[...defects].sort((a, b) => b.count - a.count).map((d) => {
              const maxC = Math.max(...defects.map((x) => x.count));
              return (
                <tr key={d.id} className="border-t border-white/5">
                  <td className="max-w-[130px] truncate px-2 py-1.5 text-[12px] text-white/75">{L(d.name)}</td>
                  {["Line A", "Line B", "Line C"].map((ln) => {
                    const c = d.line === ln ? d.count : 0;
                    return <td key={ln} className="px-1 py-1"><div className="rounded-md py-1 text-center tabular text-[12px]" style={c ? { backgroundColor: `rgba(244,63,94,${0.12 + (c / maxC) * 0.5})` } : undefined}>{c ? <span className="font-semibold text-white/90">{c}</span> : <span className="text-white/20">–</span>}</div></td>;
                  })}
                  <td className="px-2 py-1.5 text-right tabular text-[12px] font-semibold text-white/70">{d.count}</td>
                </tr>
              );
            })}
            <tr className="border-t border-white/10">
              <td className="px-2 py-2 text-[11px] font-semibold text-white/50">{L({ en: "Total / line", th: "รวมต่อไลน์" })}</td>
              {["Line A", "Line B", "Line C"].map((ln) => <td key={ln} className="px-2 py-2 text-center tabular text-[12px] font-semibold text-white/80">{defectByLine.find((x) => x.line === ln)?.count ?? 0}</td>)}
              <td className="px-2 py-2 text-right tabular text-[12px] font-bold text-white/90">{defectsToday}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
/** One card, four lenses (machine / shift / model / line) read as a Pareto. Aggregated → Insight. */
function DefectBreakdownPanel({ L }: { L: Tr }) {
  const [lens, setLens] = useState<"machine" | "shift" | "product" | "line">("machine");
  const lensRows: Record<"machine" | "shift" | "product" | "line", { label: string; count: number; extra?: string }[]> = {
    machine: defectByMachine.map((m) => ({ label: m.machine, count: m.count })),
    shift: [...defectByShift].sort((a, b) => b.count - a.count).map((s) => ({ label: L(s.shift), count: s.count })),
    product: defectByProduct.map((p) => ({ label: p.product, count: p.count })),
    line: defectByLine.map((l) => ({ label: l.line, count: l.count, extra: thbCompact(lineHealth.find((x) => x.line === l.line)?.costTHB ?? 0) })),
  };
  const LENSES: { id: keyof typeof lensRows; name: LZ }[] = [
    { id: "machine", name: { en: "Machine", th: "เครื่อง" } },
    { id: "shift", name: { en: "Shift", th: "กะ" } },
    { id: "product", name: { en: "Model", th: "รุ่น" } },
    { id: "line", name: { en: "Line", th: "ไลน์" } },
  ];
  const lensTotal = lensRows[lens].reduce((s, r) => s + r.count, 0);
  let cumAcc = 0;
  const pareto = lensRows[lens].map((r) => { cumAcc += r.count; return { ...r, cum: Math.round((cumAcc / lensTotal) * 100) }; });
  const n80 = pareto.findIndex((r) => r.cum >= 80) + 1;
  return (
    <Panel title={L({ en: "Defect Breakdown", th: "เจาะดีเฟกต์ตามมุมมอง" })} sub={L({ en: "pick a lens · the top offender of every dimension at a glance — tap one to see its Pareto", th: "ตัวการอันดับหนึ่งของทุกมิติ — กดเพื่อดู Pareto ของมิตินั้น" })}>
      <div className="grid grid-cols-2 gap-2">
        {LENSES.map((dm) => { const on = lens === dm.id; const top = lensRows[dm.id][0]; return (
          <button key={dm.id} onClick={() => setLens(dm.id)} className={cn("rounded-lg border px-2.5 py-2 text-left transition", on ? "border-brand-400/50 bg-brand-400/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]")}>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">{L(dm.name)}</p>
            <p className={cn("truncate text-[12px] font-semibold", on ? "text-brand-200" : "text-white/80")}>{top.label}</p>
            <p className="tabular text-[10px] text-white/45">{top.count} {L({ en: "pcs", th: "ชิ้น" })}</p>
          </button>
        ); })}
      </div>
      <motion.div key={lens} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mt-3.5 space-y-2">
        {pareto.map((r, i) => { const inCore = i < n80; return (
          <div key={r.label} className="flex items-center gap-2.5">
            <span className="w-24 shrink-0 break-words leading-tight text-[12px] text-white/70">{r.label}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${(r.count / pareto[0].count) * 100}%`, backgroundColor: inCore ? "#f43f5e" : "#64748b" }} /></div>
            <span className="w-8 shrink-0 text-right tabular text-[12px] font-semibold text-white/75">{r.count}</span>
            <span className="w-10 shrink-0 text-right tabular text-[10px] text-white/40">{r.cum}%</span>
            {lens === "line" ? <span className="w-11 shrink-0 text-right tabular text-[10px] text-white/40">{r.extra}</span> : null}
          </div>
        ); })}
      </motion.div>
      <p className="mt-3 rounded-lg border border-rose-400/15 bg-rose-500/[0.05] px-2.5 py-2 text-[11px] leading-relaxed text-white/60">
        {L({ en: `Fix the top ${n80} (red) → covers ${pareto[n80 - 1]?.cum ?? 100}% of all defects — the 80/20 rule at work`, th: `แก้ ${n80} อันดับแรก (สีแดง) = ครอบ ${pareto[n80 - 1]?.cum ?? 100}% ของดีเฟกต์ทั้งหมด — กฎ 80/20 ทำงานตรงนี้` })}
      </p>
    </Panel>
  );
}

/** KPIs read against their quality goals — is this good, and how big is the gap? Descriptive. */
function QualityScorecard({ L }: { L: Tr }) {
  const rows = [
    {
      label: L({ en: "First pass yield", th: "ผ่านครั้งแรก (FPY)" }), cur: fpy, target: QUALITY_TARGETS.fpy, hi: true,
      fmt: (v: number) => `${v}%`, gap: L({ en: `${(QUALITY_TARGETS.fpy - fpy).toFixed(1)}pp below`, th: `ต่ำกว่าเป้า ${(QUALITY_TARGETS.fpy - fpy).toFixed(1)}pp` }),
    },
    {
      label: L({ en: "Defect rate", th: "อัตราดีเฟกต์" }), cur: defectRatePpm, target: QUALITY_TARGETS.defectPpm, hi: false,
      fmt: (v: number) => `${v.toLocaleString()} ppm`, gap: L({ en: `${(defectRatePpm - QUALITY_TARGETS.defectPpm).toLocaleString()} over`, th: `เกินเป้า ${(defectRatePpm - QUALITY_TARGETS.defectPpm).toLocaleString()}` }),
    },
    {
      label: L({ en: "COPQ / day", th: "ต้นทุนคุณภาพ/วัน" }), cur: copq.today, target: QUALITY_TARGETS.copqDay, hi: false,
      fmt: (v: number) => thbCompact(v), gap: L({ en: `${thbCompact(copq.today - QUALITY_TARGETS.copqDay)} over`, th: `เกินเป้า ${thbCompact(copq.today - QUALITY_TARGETS.copqDay)}` }),
    },
  ];
  return (
    <Panel title={L({ en: "Scorecard vs Target", th: "สกอร์การ์ดเทียบเป้า" })} sub={L({ en: "how far each metric sits from its quality goal", th: "แต่ละตัวห่างเป้าคุณภาพแค่ไหน" })}>
      <div className="grid gap-3 sm:grid-cols-3">
        {rows.map((r, i) => { const ok = r.hi ? r.cur >= r.target : r.cur <= r.target; return (
          <div key={i} className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
            <p className="text-[11px] text-white/50">{r.label}</p>
            <p className="tabular mt-1 text-[22px] font-semibold" style={{ color: ok ? "var(--c-emerald)" : "var(--c-rose)" }}>{r.fmt(r.cur)}</p>
            <p className="text-[10.5px] text-white/40">{L({ en: "target", th: "เป้า" })} {r.fmt(r.target)}</p>
            <span className={cn("mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium", ok ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-rose-400/30 bg-rose-400/10 text-rose-300")}>{ok ? L({ en: "on target", th: "ถึงเป้า" }) : r.gap}</span>
          </div>
        ); })}
      </div>
    </Panel>
  );
}
/** Where today's quality cost actually goes — most of it hidden from finance. Data-driven. */
function CopqBreakdownPanel({ L }: { L: Tr }) {
  const max = Math.max(...copqBreakdown.map((c) => c.value));
  const hiddenPct = Math.round((copq.invisible / copq.today) * 100);
  return (
    <Panel title={L({ en: "Cost of Poor Quality", th: "ต้นทุนคุณภาพที่รั่วไหล" })} sub={L({ en: "where today's quality cost goes — most of it hidden from finance", th: "เงินคุณภาพวันนี้รั่วไปไหน — ส่วนใหญ่ไม่โผล่ในบัญชี" })}>
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-white/55">{L({ en: "Total today", th: "รวมวันนี้" })} <b className="tabular text-[15px] text-white/90">{thbCompact(copq.today)}</b></span>
        <span className="text-[11px] text-white/45">{L({ en: "visible", th: "เห็นในบัญชี" })} {thbCompact(copq.visible)} · {L({ en: "hidden", th: "ซ่อน" })} <b className="text-rose-300">{thbCompact(copq.invisible)}</b></span>
      </div>
      <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-white/8">
        <div style={{ width: `${(copq.visible / copq.today) * 100}%`, background: "#64748b" }} title="visible" />
        <div style={{ width: `${(copq.invisible / copq.today) * 100}%`, background: "#f43f5e" }} title="hidden" />
      </div>
      <div className="mt-4 space-y-2.5">
        {copqBreakdown.map((c) => (
          <div key={L(c.label)} className="flex items-center gap-2.5">
            <span className="w-28 shrink-0 break-words leading-tight text-[12px] text-white/70">{L(c.label)}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${(c.value / max) * 100}%`, background: c.visible ? "#64748b" : "#f43f5e" }} /></div>
            <span className="w-12 shrink-0 text-right tabular text-[12px] font-semibold text-white/80">{thbCompact(c.value)}</span>
            <span className={cn("w-10 shrink-0 text-right text-[10px]", c.visible ? "text-white/40" : "text-rose-300/70")}>{c.visible ? L({ en: "seen", th: "เห็น" }) : L({ en: "hidden", th: "ซ่อน" })}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-lg border border-rose-400/15 bg-rose-500/[0.05] px-2.5 py-2 text-[11px] leading-relaxed text-white/60">
        {L({ en: `Only ${thbCompact(copq.visible)} shows on the books — the other ${hiddenPct}% is rework, downtime & claims that stay hidden`, th: `มีแค่ ${thbCompact(copq.visible)} ที่โผล่ในบัญชี — อีก ${hiddenPct}% เป็นงานแก้/หยุดสาย/เคลม ที่ซ่อนอยู่` })}
      </p>
    </Panel>
  );
}
/** When defects happen across the day — spikes cluster on shift edges / changeovers. */
function DefectTimingPanel({ L }: { L: Tr }) {
  const max = Math.max(...DEFECT_BY_HOUR);
  const peak = DEFECT_BY_HOUR.indexOf(max);
  return (
    <Panel title={L({ en: "When Defects Happen", th: "ดีเฟกต์เกิดตอนไหน" })} sub={L({ en: "defects by hour today — spikes cluster on shift changes", th: "ดีเฟกต์รายชั่วโมงวันนี้ — พีคเกาะช่วงเปลี่ยนกะ/เปลี่ยนรุ่น" })}>
      <div className="flex h-32 items-end gap-[3px]">
        {DEFECT_BY_HOUR.map((v, h) => { const hot = v >= max * 0.85; const shiftEdge = h === 6 || h === 14 || h === 22; return (
          <div key={h} className="flex h-full flex-1 items-end">
            <div className="w-full rounded-t" style={{ height: `${Math.max((v / max) * 100, 3)}%`, background: hot ? "#f43f5e" : shiftEdge ? "#f59e0b" : PURPLE, opacity: hot ? 0.95 : 0.8 }} title={`${String(h).padStart(2, "0")}:00 · ${v}`} />
          </div>
        ); })}
      </div>
      <div className="mt-1.5 flex justify-between text-[9px] text-white/35">
        {["00:00", "06:00", "12:00", "18:00", "23:00"].map((t) => <span key={t}>{t}</span>)}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/45">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-400" /> {L({ en: "peak", th: "พีค" })}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400" /> {L({ en: "shift change", th: "เปลี่ยนกะ" })}</span>
      </div>
      <p className="mt-2.5 rounded-lg border border-amber-400/15 bg-amber-500/[0.05] px-2.5 py-2 text-[11px] leading-relaxed text-white/60">
        {L({ en: `Worst at ${String(peak).padStart(2, "0")}:00 — right on a shift change. Tighten first-off inspection at shift start and after every changeover.`, th: `หนักสุด ${String(peak).padStart(2, "0")}:00 — ตรงช่วงเปลี่ยนกะ/เปลี่ยนรุ่น ควรคุมตรวจชิ้นแรกให้แน่นตอนเปิดกะและหลังเปลี่ยนรุ่นทุกครั้ง` })}
      </p>
    </Panel>
  );
}

/* ══════════════════════════ tab · OVERVIEW ══════════════════════════ */
function OverviewView({ L, onAnalyze, onMonitor }: { L: Tr; onAnalyze: () => void; onMonitor: () => void }) {
  const ranked = [...defects].sort((a, b) => defectCost(b) - defectCost(a)).slice(0, 5);
  const maxCost = Math.max(...ranked.map(defectCost));
  // trend pair — one coherent story: defects creeping up (die wear) pulls FPY down
  const fpyTrend = series(70, 16, { base: 60, amp: 6, trend: -4 });
  const defTrend = fpyTrend.map((v) => 120 - v);
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={L({ en: "Quality health score", th: "คะแนนคุณภาพรวม" })} value={`${qualityHealthScore}`} unit="/100" delta={L({ en: "watch", th: "เฝ้าระวัง" })} deltaGood={false} accent={PURPLE} />
        <KpiCard label={L({ en: "First pass yield", th: "ผ่านครั้งแรก (FPY)" })} value={`${fpy}`} unit="%" delta={`-0.3pp · ${L({ en: "slipping", th: "กำลังย่อ" })}`} deltaGood={false} accent="#34d399" spark={series(71, 16, { base: 55, amp: 5, trend: -3 })} />
        <KpiCard label={L({ en: "Defect rate", th: "อัตราดีเฟกต์" })} value={defectRatePpm.toLocaleString()} unit="ppm" delta={L({ en: "rising", th: "กำลังเพิ่ม" })} deltaGood={false} accent="#f59e0b" spark={series(72, 16, { base: 48, amp: 6, trend: 6 })} />
        <KpiCard label={L({ en: "COPQ · today", th: "ต้นทุนคุณภาพ · วันนี้" })} value={thbCompact(copq.today)} delta={`${thbCompact(copq.invisible)} ${L({ en: "hidden", th: "ซ่อนอยู่" })}`} deltaGood={false} accent="#f43f5e" />
      </section>

      <QualityScorecard L={L} />

      <section className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-6">
          {/* how trustworthy the inspection system itself is */}
          <Panel className="flex flex-col items-center text-center">
            <p className="text-[11px] uppercase tracking-wider text-white/45">{L({ en: "Inspection health", th: "สุขภาพระบบตรวจ" })}</p>
            <div className="mt-2"><Ring value={inspectionHealth.score} size={96} /></div>
            <div className="mt-2.5 w-full space-y-1 text-left">
              <div className="flex items-center justify-between text-[11px]"><span className="text-white/50">{L({ en: "Cameras healthy", th: "กล้องปกติ" })}</span><span className={cn("tabular font-semibold", inspectionHealth.okCams < inspectionHealth.totalCams ? "text-amber-300" : "text-emerald-300")}>{inspectionHealth.okCams}/{inspectionHealth.totalCams}</span></div>
              <div className="flex items-center justify-between text-[11px]"><span className="text-white/50">{L({ en: "Avg camera accuracy", th: "ความแม่นกล้องเฉลี่ย" })}</span><span className="tabular font-semibold text-white/80">{inspectionHealth.avgAcc}%</span></div>
              <div className="flex items-center justify-between text-[11px]"><span className="text-white/50">{L({ en: "AI confidence", th: "ความมั่นใจ AI" })}</span><span className="tabular font-semibold text-white/80">{modelConfidence}%</span></div>
            </div>
            <button onClick={onMonitor} className="btn-ghost mt-2.5 w-full justify-center py-1.5 text-[11px]">{L({ en: "See each camera", th: "ดูรายกล้อง" })} <ArrowRight size={11} /></button>
          </Panel>

          {/* line-by-line health from today's ledger */}
          <Panel>
            <p className="text-[11px] uppercase tracking-wider text-white/45">{L({ en: "Line health · today", th: "สุขภาพรายไลน์ · วันนี้" })}</p>
            <div className="mt-2.5 space-y-2">
              {lineHealth.map((l) => { const hex = l.tone === "crit" ? "#f43f5e" : l.tone === "warn" ? "#f59e0b" : "#34d399"; const txt = l.tone === "crit" ? "var(--c-rose)" : l.tone === "warn" ? "var(--c-amber-strong)" : "var(--c-emerald)"; const lbl: LZ = l.tone === "crit" ? { en: "act now", th: "ต้องจัดการ" } : l.tone === "warn" ? { en: "watch", th: "เฝ้าระวัง" } : { en: "good", th: "ดี" }; return (
                <div key={l.line} className="rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2">
                  <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[12px] font-medium text-white/85"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: hex }} />{l.line}</span><span className="text-[10px] font-semibold" style={{ color: txt }}>{L(lbl)}</span></div>
                  <p className="mt-0.5 tabular text-[10px] text-white/45">{thbCompact(l.costTHB)}/{L({ en: "d", th: "วัน" })} · {l.count} {L({ en: "pcs", th: "ชิ้น" })}</p>
                </div>
              ); })}
            </div>
          </Panel>
        </div>
        <Panel title={L({ en: "Top Critical Defects", th: "ดีเฟกต์วิกฤตสูงสุด" })} sub={L({ en: "ranked by how much money each one is costing today", th: "เรียงตามเงินที่ทำให้เสียไปวันนี้" })}>
          <ul className="space-y-2.5">
            {ranked.map((d) => (
              <li key={d.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1"><div className="flex items-center justify-between text-[13px]"><span className="truncate font-medium text-white/85">{L(d.name)}</span><span className="shrink-0 tabular text-white/50">{d.count} · {L({ en: "on", th: "ที่" })} {d.machine}</span></div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${(defectCost(d) / maxCost) * 100}%`, backgroundColor: PURPLE }} /></div>
                </div>
                <span className="w-16 shrink-0 text-right tabular text-[13px] font-semibold text-rose-300">{thbCompact(defectCost(d))}</span>
              </li>
            ))}
          </ul>

          {/* quality trend — fills the space under the list, same story continued */}
          <div className="mt-5 border-t border-white/8 pt-4">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-[13px] font-semibold">{L({ en: "Production Quality Trend", th: "เทรนด์คุณภาพการผลิต" })}</h4>
                <p className="text-[10px] text-white/40">{L({ en: "FPY vs defect rate · last 16 shifts", th: "FPY เทียบอัตราดีเฟกต์ · 16 กะล่าสุด" })}</p>
              </div>
              <span className="flex items-center gap-3 text-[10px] text-white/50">
                <span className="flex items-center gap-1"><span className="h-0.5 w-4 rounded-full bg-emerald-400" /> FPY</span>
                <span className="flex items-center gap-1"><span className="h-0.5 w-4 rounded-full bg-rose-400" /> {L({ en: "defect rate", th: "อัตราดีเฟกต์" })}</span>
              </span>
            </div>
            <AreaTrend data={fpyTrend} color="#34d399" data2={defTrend} color2="#f43f5e" />
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-white/40"><span className="shrink-0">{L({ en: "16 shifts ago", th: "16 กะก่อน" })}</span><span className="min-w-0 truncate text-center" style={{ color: "var(--c-rose)" }}>{L({ en: "defects creeping up lately — the die-wear signature", th: "ดีเฟกต์ไต่ขึ้นช่วงหลัง — ลายเซ็นดายสึก" })}</span><span className="shrink-0">{L({ en: "now", th: "ตอนนี้" })}</span></div>
          </div>
        </Panel>
      </section>

      {/* where defects concentrate — aggregated views that guide "what to fix first" */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-stretch">
        <DefectHeatmapPanel L={L} />
        <DefectBreakdownPanel L={L} />
      </section>

      {/* the money angle + the timing angle — turns "where" into "how much" and "when" */}
      <section className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <CopqBreakdownPanel L={L} />
        <DefectTimingPanel L={L} />
      </section>

      {/* forward CTA — Insight stays descriptive; the "why" (AI) lives in the next step */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{L({ en: "Ready to find the root cause?", th: "พร้อมหาต้นตอแล้วหรือยัง?" })}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-white/50">{L({ en: "the 80/20 view above points to the few defects worth fixing first — let AI Analysis pin down why", th: "ภาพ 80/20 ด้านบนชี้ดีเฟกต์ไม่กี่ตัวที่ควรแก้ก่อน — ให้ AI Analysis เจาะต่อว่าทำไม" })}</p>
        </div>
        <button onClick={onAnalyze} className="btn-glow shrink-0 px-4 py-2.5 text-sm">{L({ en: "Next · AI Analysis", th: "ขั้นถัดไป · AI Analysis" })} <ArrowRight size={15} /></button>
      </div>
    </div>
  );
}

/* ══════════════════════════ tab · MONITOR ══════════════════════════ */
function MonitorView({ L, onInvestigate }: { L: Tr; onInvestigate: () => void }) {
  const passed = inspectedToday - defectsToday;
  // filter the timeline by camera — chips show what each camera caught
  const [camFilter, setCamFilter] = useState<string>("all");
  const rows = detections.filter((d) => camFilter === "all" || d.station === camFilter);
  const camChips = cameraRig.map((c) => ({ id: c.id, pos: c.pos, n: detections.filter((d) => d.station === c.id).length }));
  return (
    <div className="space-y-6">
      <Panel title={L({ en: "Live Inspection", th: "ตรวจเรียลไทม์" })} sub={L({ en: "V-B1 AI QC gate · 3× OMRON STC-HD213DV — every finished part passes this gate, captured from top, left & right", th: "V-B1 ด่านตรวจ AI ปลายไลน์ · OMRON STC-HD213DV 3 ตัว — ชิ้นงานทุกชิ้นวิ่งผ่านด่านนี้ ถ่ายพร้อมกันจากมุมบน ซ้าย ขวา" })} extra={<span className="chip text-emerald-300"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" />{L({ en: "streaming", th: "กำลังสตรีม" })}</span>}>
        <MultiCameraInspection L={L} />
      </Panel>

      <ProcessPulse L={L} onInvestigate={onInvestigate} />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="panel p-4 text-center"><p className="text-[11px] text-white/45">{L({ en: "Passed · today", th: "ผ่าน · วันนี้" })}</p><p className="mt-1 tabular text-2xl font-semibold text-emerald-300">{passed.toLocaleString()}</p></div>
        <div className="panel p-4 text-center"><p className="text-[11px] text-white/45">{L({ en: "Rejected · today", th: "คัดออก · วันนี้" })}</p><p className="mt-1 tabular text-2xl font-semibold text-rose-300">{defectsToday}</p></div>
        <div className="panel p-4 text-center"><p className="text-[11px] text-white/45">{L({ en: "AI confidence", th: "ความมั่นใจ AI" })}</p><p className="mt-1 tabular text-2xl font-semibold text-cyan-300">{modelConfidence}%</p></div>
        <div className="panel p-4 text-center"><p className="text-[11px] text-white/45">{L({ en: "Escapes", th: "หลุดรอด" })}</p><p className="mt-1 tabular text-2xl font-semibold text-emerald-300">{escapes}</p><p className="text-[10px] text-white/35">{daysClean}{L({ en: "d clean", th: " วันไม่มีหลุด" })}</p></div>
      </section>

      <Panel title={L({ en: "Camera Status", th: "สถานะกล้อง" })} sub={L({ en: "Which cameras can still be trusted", th: "กล้องตัวไหนยังเชื่อถือได้" })} extra={
        <span className="flex items-center gap-2">
          <span className="chip text-emerald-300">{stations.filter((s) => s.status === "ok").length} {L({ en: "healthy", th: "ปกติ" })}</span>
          <span className="chip border-status-warn/30 bg-status-warn/10 text-amber-300">{stations.filter((s) => s.status === "warn").length} {L({ en: "watch", th: "เฝ้าระวัง" })}</span>
        </span>
      }>
        <div className="grid gap-2.5 sm:grid-cols-3">{stations.map((s) => (
          <div key={s.id} className="flex items-center gap-2.5 rounded-lg border p-2.5" style={{ borderColor: s.status === "ok" ? "#34d39933" : "#f59e0b44" }}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ color: s.status === "ok" ? "#34d399" : "#f59e0b", backgroundColor: s.status === "ok" ? "#34d39914" : "#f59e0b14" }}><ScanEye size={15} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-white/85">{s.id} · {L(s.name)}</p>
              <p className="truncate text-[10px] text-white/40">{s.line} · {s.fps} fps</p>
            </div>
            <span className="shrink-0 tabular text-[12px] font-semibold" style={{ color: s.status === "ok" ? "var(--c-emerald)" : "var(--c-amber-strong)" }}>{s.acc}%</span>
          </div>
        ))}</div>
      </Panel>

      <section className="panel overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-5">
          <Activity size={18} className="shrink-0 text-purple-300" />
          <div className="min-w-0"><h3 className="font-semibold">{L({ en: "Inspection Timeline", th: "ไทม์ไลน์การตรวจ" })}</h3><p className="mt-0.5 text-xs text-white/45">{L({ en: "auto-diverted before leaving the line", th: "คัดออกอัตโนมัติก่อนหลุดสาย" })}</p></div>
          {/* camera filter chips — which camera caught what */}
          <div className="ml-auto flex flex-wrap items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
            <button onClick={() => setCamFilter("all")} className={cn("whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition", camFilter === "all" ? "bg-white/10 text-white/90" : "text-white/45 hover:text-white/70")}>{L({ en: "All", th: "ทั้งหมด" })} <span className="tabular text-white/35">{detections.length}</span></button>
            {camChips.map((c) => { const on = camFilter === c.id; return (
              <button key={c.id} onClick={() => setCamFilter(on ? "all" : c.id)} className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition", on ? "bg-white/10 text-white/90" : "text-white/45 hover:text-white/70")}>
                <ScanEye size={12} className={on ? "text-purple-300" : "text-white/35"} />{c.id} · {L(c.pos)} <span className="tabular text-white/35">{c.n}</span>
              </button>
            ); })}
          </div>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-white/40"><th className="px-5 py-3 font-medium">{L({ en: "Time", th: "เวลา" })}</th><th className="px-3 py-3 font-medium">{L({ en: "Camera", th: "กล้อง" })}</th><th className="px-3 py-3 font-medium">{L({ en: "Defect", th: "ดีเฟกต์" })}</th><th className="px-3 py-3 font-medium">{L({ en: "Confidence", th: "มั่นใจ" })}</th><th className="px-5 py-3 text-right font-medium">{L({ en: "Action", th: "การจัดการ" })}</th></tr></thead>
          <tbody>{rows.map((d, i) => { const cam = cameraRig.find((c) => c.id === d.station); return (
            <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02]"><td className="px-5 py-2.5 tabular text-white/60">{d.at}</td><td className="px-3 py-2.5"><button onClick={() => setCamFilter(d.station)} className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-0.5 text-[12px] tabular text-white/70 transition hover:bg-white/[0.08] hover:text-white/90">{d.station}{cam ? <span className="text-[10px] text-white/40">· {L(cam.pos)}</span> : null}</button></td><td className="px-3 py-2.5 font-medium">{L(d.defect)}</td><td className="px-3 py-2.5 tabular text-purple-300">{d.conf}%</td><td className="px-5 py-2.5 text-right"><span className={cn("inline-flex items-center gap-1.5 text-xs", d.reject ? "text-rose-300" : "text-white/60")}>{d.reject ? <AlertTriangle size={12} /> : <Check size={12} className="text-emerald-300" />}{L(d.action)}</span></td></tr>
          ); })}</tbody>
        </table></div>
      </section>
    </div>
  );
}

/* ══════════════════════════ tab · ANALYZE (flagship) ══════════════════════════ */
function CorrelationRow({ c, L }: { c: Correlation; L: Tr }) {
  if (c.phase === 2) {
    // locked until the extra system is connected — the built-in upsell
    return (
      <div className="rounded-xl border border-dashed border-white/12 bg-white/[0.01] p-3 opacity-80">
        <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-[13px] font-medium text-white/55"><Lock size={12} className="shrink-0 text-white/35" /> {L(c.factor)}</span><span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/45">{L({ en: "phase 2", th: "เฟส 2" })}</span></div>
        <p className="mt-1.5 text-[11px] leading-snug text-white/45">{L(c.finding)}</p>
        {c.needs ? <p className="mt-1.5 text-[10px] leading-snug" style={{ color: "var(--c-amber-strong)" }}>{L({ en: "unlock with:", th: "ปลดล็อกเมื่อมี:" })} {L(c.needs)}</p> : null}
      </div>
    );
  }
  const bar = c.strength >= 0.7 ? "#f43f5e" : c.strength >= 0.5 ? "#f59e0b" : "#22d3ee";
  const txt = c.strength >= 0.7 ? "var(--c-rose)" : c.strength >= 0.5 ? "var(--c-amber-strong)" : "var(--c-cyan)";
  const linkLabel: LZ = c.strength >= 0.7 ? { en: "strong link", th: "เกี่ยวแน่ๆ" } : c.strength >= 0.5 ? { en: "clear link", th: "เกี่ยวชัดเจน" } : { en: "weak link", th: "เกี่ยวน้อย" };
  const inner = (
    <>
      <div className="flex items-center justify-between"><span className="text-[13px] font-medium text-white/85">{L(c.factor)}</span><span className="text-[12px] font-semibold" style={{ color: txt }}>{L(linkLabel)} <span className="tabular text-[10px] opacity-60">r={c.strength.toFixed(2)}</span></span></div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${c.strength * 100}%`, backgroundColor: bar }} /></div>
      <p className="mt-1 text-[11px] leading-snug text-white/50">{L(c.finding)}</p>
    </>
  );
  return c.link ? <Link href="/os/rpm" className="block rounded-xl border border-white/8 bg-white/[0.02] p-3 transition hover:bg-white/[0.04]">{inner}<span className="mt-1 inline-flex items-center gap-1 text-[10px] text-brand-300">{L({ en: "open in RPM ▸", th: "เปิดใน RPM ▸" })}</span></Link> : <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">{inner}</div>;
}
/* procedural "photo" of a defect — sells the learning-from-images story without real assets */
function DefectSwatch({ glyph, hex, size = 52 }: { glyph: Glyph; hex: string; size?: number }) {
  const g = (() => {
    switch (glyph) {
      case "scratch": return <><line x1="9" y1="40" x2="43" y2="13" stroke={hex} strokeWidth="2" strokeLinecap="round" opacity="0.9" /><line x1="16" y1="42" x2="38" y2="24" stroke={hex} strokeWidth="1" strokeLinecap="round" opacity="0.45" /></>;
      case "groove": return <><line x1="7" y1="31" x2="45" y2="26" stroke="#0b101a" strokeWidth="6" strokeLinecap="round" /><line x1="7" y1="29" x2="45" y2="24" stroke={hex} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" /></>;
      case "drip": return <><path d="M26 8 q-3.5 16 0 30 q3.5 -14 0 -30 Z" fill={hex} opacity="0.7" /><circle cx="26" cy="40" r="3.5" fill={hex} opacity="0.7" /></>;
      case "pores": return <>{[[18, 22], [30, 18], [24, 32], [36, 30], [20, 39], [38, 21]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2.4 + (i % 3) * 0.6} fill="#0b101a" stroke={hex} strokeWidth="0.7" />)}</>;
      case "specks": return <>{[[16, 20], [34, 16], [22, 30], [40, 34], [18, 40], [30, 38], [26, 23]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.4" fill={hex} opacity="0.85" />)}</>;
      case "dent": return <circle cx="26" cy="26" r="13" fill="url(#dentG)" stroke={hex} strokeWidth="0.6" strokeOpacity="0.4" />;
    }
  })();
  return (
    <svg viewBox="0 0 52 52" width={size} height={size} className="shrink-0 rounded-lg">
      <defs><radialGradient id="dentG"><stop offset="0" stopColor="#0b101a" /><stop offset="0.75" stopColor="#2a3342" /><stop offset="1" stopColor="#2a3342" /></radialGradient><linearGradient id="vMetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#313b4b" /><stop offset="1" stopColor="#222a37" /></linearGradient></defs>
      <rect width="52" height="52" rx="7" fill="url(#vMetal)" />
      {[12, 24, 36].map((y) => <line key={y} x1="0" y1={y} x2="52" y2={y} stroke="#ffffff" strokeWidth="0.5" opacity="0.05" />)}
      {g}
    </svg>
  );
}
function DefectLearning({ L }: { L: Tr }) {
  const [classes, setClasses] = useState<DefectClass[]>(defectClasses);
  const [queue, setQueue] = useState<LearnItem[]>(learningQueue);
  const [names, setNames] = useState<Record<string, string>>({});
  const [uploads, setUploads] = useState<{ id: string; name: string; url: string }[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [addedByUser, setAddedByUser] = useState(0); // images the user taught this session
  const learnRef = useRef<HTMLDivElement>(null); // the "name the new patterns" section below
  const resolve = (id: string) => setQueue((q) => q.filter((x) => x.id !== id));

  const GLYPHS: Glyph[] = ["scratch", "groove", "drip", "pores", "specks", "dent"];
  const HEXES = ["#c084fc", "#f43f5e", "#22d3ee", "#f59e0b", "#34d399", "#818cf8", "#f472b6", "#60a5fa"];
  const totalSamples = classes.reduce((s, c) => s + c.samples, 0);
  const overallAccuracy = Math.round(classes.reduce((s, c) => s + c.accuracy * c.samples, 0) / totalSamples * 10) / 10;
  const pending = queue.reduce((s, q) => s + q.count, 0);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    setFlash(null);
    Array.from(files).slice(0, 16).forEach((f, i) => {
      if (!f.type.startsWith("image/")) return;
      const rd = new FileReader();
      rd.onload = () => setUploads((u) => [...u, { id: `${f.name}-${Date.now()}-${i}`, name: f.name, url: String(rd.result) }]);
      rd.readAsDataURL(f);
    });
  };
  const canTeach = uploads.length > 0 && !!target && (target !== "__new__" || newName.trim().length > 0);
  const teach = () => {
    if (!canTeach) return;
    const n = uploads.length;
    if (target === "__new__") {
      const nm = newName.trim();
      setClasses((cs) => [...cs, { id: `u-${cs.length}`, name: { en: nm, th: nm }, samples: n, accuracy: Math.round((90 + Math.min(4, n * 0.3)) * 10) / 10, glyph: GLYPHS[cs.length % GLYPHS.length], hex: HEXES[cs.length % HEXES.length] }]);
      setFlash(L({ en: `Created "${nm}" and trained on ${n} image${n > 1 ? "s" : ""}.`, th: `สร้างคลาส "${nm}" และเทรนจาก ${n} ภาพแล้ว` }));
    } else {
      const c = classes.find((x) => x.id === target)!;
      const after = Math.min(99.6, Math.round((c.accuracy + Math.min(0.8, n * 0.08)) * 10) / 10);
      setClasses((cs) => cs.map((x) => x.id === target ? { ...x, samples: x.samples + n, accuracy: after } : x));
      setFlash(L({ en: `Added ${n} sample${n > 1 ? "s" : ""} to ${c.name.en} — accuracy ${c.accuracy}% → ${after}%.`, th: `เพิ่ม ${n} ตัวอย่างให้ ${c.name.th} — ความแม่น ${c.accuracy}% → ${after}%` }));
    }
    setAddedByUser((a) => a + n);
    setUploads([]); setTarget(null); setNewName("");
  };

  const stat = (label: LZ, value: string, tone?: string) => (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5 text-center"><p className="text-[10px] text-white/45">{L(label)}</p><p className="mt-0.5 tabular text-lg font-semibold" style={{ color: tone }}>{value}</p></div>
  );
  return (
    <Panel
      title={L({ en: "AI Defect Learning", th: "AI เรียนรู้ดีเฟกต์" })}
      sub={L({ en: "pattern library · the model learns from labelled photos, auto-groups new ones — you name each class", th: "คลังรูปแบบ · โมเดลเรียนรู้จากภาพที่ติดป้ายไว้ แล้วจัดกลุ่มภาพใหม่ให้เอง เหลือแค่คุณตั้งชื่อแต่ละกลุ่ม" })}
      extra={<button onClick={() => openCopilot("Retrain the VisionIQ defect-classification model")} className="btn-ghost px-3 py-1.5 text-[12px]"><RefreshCw size={13} /> {L({ en: "Retrain", th: "เทรนใหม่" })}</button>}
    >
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {stat({ en: "Defect classes", th: "คลาสดีเฟกต์" }, `${classes.length}`)}
        {stat({ en: "Training images", th: "ภาพที่เทรน" }, totalSamples.toLocaleString())}
        {stat({ en: "Model accuracy", th: "ความแม่นของโมเดล" }, `${overallAccuracy}%`, "var(--c-emerald)")}
        {stat({ en: "Pending review", th: "รอตรวจ" }, `${pending}`, "var(--c-amber-strong)")}
      </div>

      {/* teach the AI · upload sample images */}
      <div className="mt-4 rounded-xl border border-brand-400/25 bg-brand-400/[0.05] p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950"><UploadCloud size={17} /></span>
          <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-white/90">{L({ en: "Teach the AI — upload sample images", th: "สอน AI — อัปโหลดภาพตัวอย่าง" })}</p><p className="text-[11px] text-white/50">{L({ en: "the more labelled samples you add, the more accurately it classifies", th: "ยิ่งป้อนตัวอย่างที่ติดป้ายมากเท่าไหร่ AI ยิ่งแยกแม่นขึ้น" })}</p></div>
          <div className="shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-right">
            <p className="tabular text-[15px] font-semibold leading-tight text-white/90">{totalSamples.toLocaleString()} <span className="text-[10px] font-normal text-white/45">{L({ en: "images learned", th: "ภาพที่เรียนรู้แล้ว" })}</span></p>
            <p className="text-[10px] leading-tight" style={{ color: addedByUser > 0 ? "var(--c-emerald)" : undefined }}>{addedByUser > 0 ? `+${addedByUser} ${L({ en: "added by you", th: "ที่คุณเพิ่มวันนี้" })}` : <span className="text-white/35">{L({ en: `${classes.length} classes`, th: `${classes.length} คลาส` })}</span>}</p>
          </div>
        </div>
        <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }} className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/20 bg-white/[0.02] py-6 text-center transition hover:border-brand-400/40 hover:bg-brand-400/[0.04]">
          <input type="file" hidden multiple accept="image/*" onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }} />
          <UploadCloud size={22} className="text-brand-300" />
          <span className="text-[13px] text-white/70">{L({ en: "Drop defect photos here or click to browse", th: "ลากภาพดีเฟกต์มาวาง หรือคลิกเพื่อเลือกไฟล์" })}</span>
          <span className="text-[11px] text-white/40">{L({ en: "PNG / JPG · up to 16 at once", th: "PNG / JPG · ครั้งละไม่เกิน 16 ภาพ" })}</span>
        </label>

        {uploads.length ? (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">{uploads.map((u) => (
              <div key={u.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.url} alt={u.name} className="h-16 w-16 rounded-lg border border-white/10 object-cover" />
                <button onClick={() => setUploads((us) => us.filter((x) => x.id !== u.id))} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-white/20 bg-ink-950 text-white/70 transition hover:text-white"><X size={11} /></button>
              </div>
            ))}</div>
            <p className="mt-3 text-[12px] text-white/55">{L({ en: "Assign", th: "เลือกคลาสให้" })} <span className="font-semibold text-white/80">{uploads.length}</span> {L({ en: "image(s) to a defect class", th: "ภาพนี้" })}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {classes.map((c) => (
                <button key={c.id} onClick={() => setTarget(c.id)} className={cn("rounded-lg border px-2.5 py-1 text-[12px] transition", target === c.id ? "border-brand-400/50 bg-brand-400/15 text-brand-200" : "border-white/10 bg-white/[0.02] text-white/60 hover:text-white/85")}>{L(c.name)}</button>
              ))}
              <button onClick={() => setTarget("__new__")} className={cn("inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[12px] transition", target === "__new__" ? "border-brand-400/50 bg-brand-400/15 text-brand-200" : "border-white/10 bg-white/[0.02] text-white/60 hover:text-white/85")}><Plus size={12} /> {L({ en: "New class", th: "คลาสใหม่" })}</button>
            </div>
            {target === "__new__" ? <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={L({ en: "new class name… e.g. Deep groove", th: "ชื่อคลาสใหม่… เช่น ร่องลึก" })} className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-white/35 focus:border-brand-400/40 focus:outline-none" /> : null}
            <button onClick={teach} disabled={!canTeach} className={cn("mt-3 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium transition", canTeach ? "btn-glow" : "cursor-not-allowed bg-white/5 text-white/40")}><GraduationCap size={15} /> {L({ en: "Teach AI", th: "สอน AI" })} · {L({ en: "add", th: "เพิ่ม" })} {uploads.length} {L({ en: "samples", th: "ตัวอย่าง" })}</button>
          </div>
        ) : null}
        {flash ? <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-500/[0.08] px-3 py-2 text-[12px] font-medium text-emerald-200"><Check size={14} className="shrink-0" /> {flash}</div> : null}
      </div>

      {/* one library, one story: the named classes — plus the cluster the AI grouped but nobody named yet */}
      <div className="mt-4">
        <p className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-white/60"><Tag size={13} className="text-brand-300" /> {L({ en: "Named defect classes", th: "คลาสดีเฟกต์ที่ตั้งชื่อแล้ว" })}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <div key={c.id} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-2">
              <DefectSwatch glyph={c.glyph} hex={c.hex} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-white/85">{L(c.name)}</p>
                <p className="text-[10px] text-white/40">{L({ en: "learned", th: "เรียนแล้ว" })} {c.samples.toLocaleString()} {L({ en: "images", th: "ภาพ" })}</p>
                <div className="mt-1 flex items-center gap-1.5"><div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${c.accuracy}%`, backgroundColor: c.accuracy >= 98 ? "#34d399" : c.accuracy >= 96 ? "#22d3ee" : "#f59e0b" }} /></div><span className="tabular text-[10px] text-white/50">{c.accuracy}%</span></div>
              </div>
            </div>
          ))}
          {pending > 0 ? (
            <button onClick={() => learnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="flex items-center gap-2.5 rounded-xl border border-dashed border-amber-400/40 bg-amber-500/[0.05] p-2 text-left transition hover:bg-amber-500/[0.09]">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-dashed border-amber-400/40 text-[17px] font-bold" style={{ color: "var(--c-amber-strong)" }}>?</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium" style={{ color: "var(--c-amber-strong)" }}>{L({ en: "New pattern · unnamed", th: "รูปแบบใหม่ · รอตั้งชื่อ" })}</p>
                <p className="text-[10px] text-white/40">{pending} {L({ en: "images the AI already grouped", th: "ภาพ ที่ AI จัดกลุ่มรอไว้แล้ว" })}</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold" style={{ color: "var(--c-amber-strong)" }}>{L({ en: "go name it", th: "ไปตั้งชื่อ" })} <ArrowRight size={10} /></p>
              </div>
            </button>
          ) : null}
        </div>
      </div>

      <div ref={learnRef} className="mt-4 scroll-mt-24">
        <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-white/60"><Sparkles size={13} className="text-amber-300" /> {L({ en: "Active learning — name the new patterns", th: "เรียนรู้เพิ่ม — ช่วยตั้งชื่อรูปแบบใหม่ให้ AI" })}</p>
        {queue.length ? <div className="space-y-2.5">{queue.map((q) => { const near = classById(q.closest)!; return (
          <div key={q.id} className="rounded-xl border border-amber-400/25 bg-amber-500/[0.05] p-3">
            <div className="flex items-center gap-2.5">
              <DefectSwatch glyph={near.glyph} hex="#f59e0b" size={40} />
              <div className="min-w-0 flex-1"><p className="text-[13px] font-medium text-white/85">{L({ en: "New pattern found", th: "พบรูปแบบใหม่" })} · {q.count} {L({ en: "images", th: "ภาพ" })}</p><p className="text-[11px] leading-snug text-white/55">{L(q.note)} · {L({ en: "closest", th: "ใกล้สุด" })} {L(near.name)} {q.closestConf}%</p></div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <input value={names[q.id] ?? ""} onChange={(e) => setNames((n) => ({ ...n, [q.id]: e.target.value }))} placeholder={L({ en: "name this defect… e.g. Deep groove", th: "ตั้งชื่อดีเฟกต์… เช่น ร่องลึก" })} className="min-w-[150px] flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-white/35 focus:border-brand-400/40 focus:outline-none" />
              <button onClick={() => resolve(q.id)} disabled={!(names[q.id] ?? "").trim()} className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition", (names[q.id] ?? "").trim() ? "btn-glow" : "cursor-not-allowed bg-white/5 text-white/40")}><Plus size={13} /> {L({ en: "Add as new class", th: "เพิ่มเป็นคลาสใหม่" })}</button>
              <button onClick={() => resolve(q.id)} className="btn-ghost whitespace-nowrap px-3 py-1.5 text-[12px]">{L({ en: "Merge into", th: "รวมกับ" })} {L(near.name)}</button>
            </div>
          </div>
        ); })}</div> : <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.05] p-3 text-[12px] text-emerald-200"><Check size={14} /> {L({ en: "All patterns are labelled — model is up to date.", th: "ทุกรูปแบบถูกตั้งชื่อแล้ว — โมเดลอัปเดตล่าสุด" })}</div>}
      </div>
    </Panel>
  );
}
/** deviation measured by the top camera through the current Press 03 run — the
 *  monotonic creep is HOW the AI concludes "die wear" (vs setup error / material noise) */
function AnalyzeView({ L, onAct }: { L: Tr; onAct: () => void }) {
  // every defect found today has its own analysis — pick one, worst ฿ first
  const [rcId, setRcId] = useState(rootCauses[0].defectId);
  const rc = rootCauses.find((r) => r.defectId === rcId) ?? rootCauses[0];
  const rcDefect = defects.find((d) => d.id === rc.defectId)!;
  // no ERP yet — the customer types their own cost assumptions; everything below recomputes live
  const ov = useCostOverrides();
  const [editCosts, setEditCosts] = useState(false);
  const p = paramsFor(rc.defectId, ov);
  const cost = (d: (typeof defects)[number]) => { const q = paramsFor(d.id, ov); return scrapUnits(d) * q.unitCost + reworkUnits(d) * q.reworkCost; };
  const totalCost = defects.reduce((s, d) => s + cost(d), 0);
  const edited = (id: string) => Object.keys(ov[id] ?? {}).length > 0;
  const ranked = [...defects].sort((a, b) => cost(b) - cost(a));
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-xl border border-brand-400/20 bg-brand-400/[0.05] px-4 py-2.5"><Brain size={16} className="shrink-0 text-brand-300" /><p className="text-[12px] font-medium text-brand-200">{L({ en: "The flagship AI — from one bad part, it tells you what caused it, how much it costs, and what to fix first.", th: "AI ตัวชูโรง — เจอของเสีย 1 ชิ้น บอกได้เลยว่าเกิดจากอะไร เสียเงินเท่าไหร่ และควรแก้ตรงไหนก่อน" })}</p></div>

      {/* AI Verdict — the 5-second answer; every panel below is the depth behind it */}
      <div className="panel relative overflow-hidden border-brand-400/25 bg-gradient-to-br from-brand-400/[0.08] to-transparent p-4">
        <div className="flex flex-wrap items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-400/15 text-brand-200"><Sparkles size={17} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-300/80">{L({ en: "AI Verdict · fix this first", th: "AI สรุป · ควรแก้ตัวนี้ก่อน" })}</p>
            <h3 className="mt-0.5 text-[15px] font-semibold leading-snug text-white/90">{L(rc.cause)}</h3>
            <p className="mt-0.5 text-[12px] text-white/55">{L(rcDefect.name)} · {rcDefect.machine} · <span className={cn(rc.confidence >= 80 ? "text-emerald-300" : "text-amber-300")}>{L({ en: "confidence", th: "มั่นใจ" })} {rc.confidence}%</span></p>
          </div>
          <div className="shrink-0 text-right">
            <p className="tabular text-[17px] font-semibold text-rose-300">{thbCompact(cost(rcDefect))}<span className="text-[11px] font-normal text-white/40">/{L({ en: "day", th: "วัน" })}</span></p>
            <p className="text-[11px] text-white/45">{L({ en: "if ignored · risk", th: "ถ้าปล่อย เสี่ยง" })} {thbCompact(p.riskTHB)}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-emerald-300/70">{L({ en: "The fix", th: "ทางแก้" })}</p>
            <p className="truncate text-[13px] font-medium text-white/90">{L(rc.fix.label)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3.5">
            <div className="text-right">
              <p className="tabular text-[14px] font-semibold text-emerald-300">{thbCompact(p.fixCost)}</p>
              <p className="text-[10px] text-white/45">{L({ en: "cheaper", th: "ถูกกว่า" })} {Math.max(1, Math.round(p.riskTHB / Math.max(p.fixCost, 1)))}×</p>
            </div>
            <button onClick={onAct} className="btn-glow px-3.5 py-2 text-[12px]">{L({ en: "Fix plan", th: "ไปแผนแก้" })} <ArrowRight size={13} /></button>
          </div>
        </div>
      </div>

      {/* Root cause — one analysis per defect found */}
      <Panel className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-status-crit/12 blur-3xl" />
        <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-lg bg-rose-500/12 text-rose-300"><Radar size={18} /></span><div><h3 className="font-semibold">{L({ en: "AI Root-Cause Analysis", th: "วิเคราะห์รากสาเหตุด้วย AI" })}</h3><p className="text-xs text-white/45">{L({ en: "every defect found today, analysed — pick one", th: "วิเคราะห์ครบทุกดีเฟกต์ที่เจอวันนี้ — เลือกดูได้เลย" })}</p></div><button onClick={() => setEditCosts((v) => !v)} className={cn("ml-auto flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition", editCosts ? "border-amber-400/40 bg-amber-500/10 text-amber-300" : "border-white/12 bg-white/[0.03] text-white/60 hover:text-white/85")}><Pencil size={12} /> {L({ en: "Edit costs", th: "แก้ต้นทุน" })}</button><span className="rounded-md bg-rose-500/15 px-2 py-1 text-[12px] font-semibold text-rose-300">{thbCompact(cost(rcDefect))}/{L({ en: "day", th: "วัน" })}</span></div>

        {/* cost assumptions — hand-entered until ERP is connected */}
        {editCosts ? (
          <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/[0.05] p-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-[11px] font-semibold" style={{ color: "var(--c-amber-strong)" }}>{L({ en: "Cost assumptions", th: "ตั้งค่าต้นทุน" })} · {L(rcDefect.name)}</p>
              <p className="text-[10px] text-white/45">{L({ en: "no ERP connection yet — enter your own numbers, saved on this device", th: "ยังไม่เชื่อม ERP — กรอกตัวเลขของโรงงานคุณเองได้ ระบบบันทึกไว้ในเครื่องนี้" })}</p>
              <button onClick={() => resetCostParams(rc.defectId)} className="btn-ghost ml-auto px-2.5 py-1 text-[11px]">{L({ en: "Reset to defaults", th: "คืนค่าเริ่มต้น" })}</button>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {([
                ["unitCost", { en: "Scrap cost (฿/pc)", th: "ต้นทุนชิ้นที่ทิ้ง (฿/ชิ้น)" }, { en: "ask Cost Accounting", th: "ถามฝ่ายบัญชีต้นทุน" }, { en: "standard cost per pc (material + labour + overhead)", th: "ต้นทุนมาต°านต่อชิ้น (วัสดุ + แรง + โสหุ้ย)" }],
                ["reworkCost", { en: "Rework cost (฿/pc)", th: "ค่าแก้งาน (฿/ชิ้น)" }, { en: "production lead / QC", th: "หัวหน้าผลิต / QC" }, { en: "rework minutes × labour rate", th: "นาทีที่ใช้แก้ × เรตค่าแรง" }],
                ["fixCost", { en: "Fix-at-source (฿)", th: "ค่าซ่อมต้นตอ (฿)" }, { en: "maintenance engineer", th: "วิศวกรซ่อมบำรุง" }, { en: "parts + technician hours / vendor quote", th: "อะไหล่ + ชั่วโมงช่าง / ใบเสนอราคา" }],
                ["riskTHB", { en: "Risk if ignored (฿)", th: "ความเสี่ยงถ้าปล่อย (฿)" }, { en: "plant manager + sales", th: "ผู้จัดการโรงงาน + ฝ่ายขาย" }, { en: "lot value · claims · late penalties", th: "มูลค่าล็อต · เคลม · ค่าปรับส่งช้า" }],
              ] as [keyof CostParams, LZ, LZ, LZ][]).map(([k, lab, who, how]) => (
                <label key={k} className="block">
                  <span className="text-[10px] text-white/50">{L(lab)}</span>
                  <input type="number" min={0} value={p[k]} onChange={(e) => setCostParam(rc.defectId, { [k]: Math.max(0, Number(e.target.value) || 0) })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-sm tabular text-white focus:border-amber-400/40 focus:outline-none" />
                  <p className="mt-1 text-[9.5px] leading-snug text-white/40"><span className="font-semibold" style={{ color: "var(--c-amber-strong)" }}>{L(who)}</span> — {L(how)}</p>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-5 lg:grid-cols-[200px_1fr_300px]">
          {/* vertical defect picker · sorted by ฿ lost */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{L({ en: "Defects found today", th: "ดีเฟกต์ที่เจอวันนี้" })}</p>
            <div className="flex flex-col gap-1.5">
              {ranked.map((d) => { const on = d.id === rc.defectId; return (
                <button key={d.id} onClick={() => setRcId(d.id)} className={cn("flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition", on ? "border-brand-400/50 bg-brand-400/12" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]")}>
                  <span className={cn("flex min-w-0 items-center gap-1.5 truncate text-[12px] font-medium", on ? "text-brand-200" : "text-white/65")}>{edited(d.id) ? <span title={L({ en: "custom costs", th: "ต้นทุนที่กรอกเอง" })} className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: "var(--c-amber-strong)" }} /> : null}<span className="truncate">{L(d.name)}</span></span>
                  <span className={cn("tabular shrink-0 text-[10px]", on ? "text-brand-200/70" : "text-white/35")}>{thbCompact(cost(d))}/{L({ en: "d", th: "วัน" })}</span>
                </button>
              ); })}
            </div>
            {/* today's total across all defects */}
            <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
              <div className="flex items-center justify-between text-[11px]"><span className="text-white/50">{L({ en: "Total today", th: "รวมวันนี้" })}</span><span className="tabular font-semibold text-white/85">{defectsToday} {L({ en: "pcs", th: "ชิ้น" })}</span></div>
              <div className="mt-0.5 flex items-center justify-between text-[11px]"><span className="text-white/50">{L({ en: "Money lost", th: "เงินที่เสีย" })}</span><span className="tabular font-semibold" style={{ color: "var(--c-rose)" }}>{thbCompact(totalCost)}/{L({ en: "d", th: "วัน" })}</span></div>
            </div>
          </div>

          {/* the analysis of the selected defect */}
          <motion.div key={rc.defectId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="min-w-0">
            <p className="flex items-start gap-2 text-sm font-medium text-white/90"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-rose-300" /> {L(rc.cause)}</p>
            <p className="mt-2 text-[11px]">
              <span className={cn(rc.confidence >= 80 ? "text-emerald-300" : "text-amber-300")}>{L({ en: "confidence", th: "มั่นใจ" })} {rc.confidence}%</span>
              {rc.confidence < 70 ? <span style={{ color: "var(--c-amber-strong)" }}> · {L({ en: "not certain yet — verify on-site before acting", th: "ยังไม่ฟันธง — ควรยืนยันหน้างานก่อนลงมือ" })}</span> : null}
            </p>
            <p className="mt-3.5 text-[11px] uppercase tracking-wider text-white/40">{L({ en: "How the AI knows", th: "AI รู้ได้ยังไง" })}</p>
            <ul className="mt-2 space-y-2">
              {rc.evidence.map((e, i) => (
                <li key={e.en} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-white/70">
                  <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-brand-400/12 text-[10px] font-semibold tabular text-brand-200">{i + 1}</span>
                  <span className="min-w-0">{L(e)}</span>
                </li>
              ))}
            </ul>
            {/* today's real damage from THIS defect — grounds the story in what already happened */}
            <p className="mt-4 text-[11px] uppercase tracking-wider text-white/40">{L({ en: "Damage already done · today", th: "ความเสียหายที่เกิดแล้ว · วันนี้" })}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5"><p className="text-[10px] text-white/45">{L({ en: "Caught", th: "ตรวจเจอ" })}</p><p className="mt-0.5 tabular text-base font-semibold text-white/85">{rcDefect.count} <span className="text-[10px] font-normal text-white/40">{L({ en: "pcs", th: "ชิ้น" })}</span></p></div>
              <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5"><p className="text-[10px] text-white/45">{L({ en: "Scrapped", th: "คัดทิ้ง" })}</p><p className="mt-0.5 tabular text-base font-semibold" style={{ color: "var(--c-rose)" }}>{scrapUnits(rcDefect)} <span className="text-[10px] font-normal text-white/40">{L({ en: "pcs", th: "ชิ้น" })}</span></p></div>
              <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5"><p className="text-[10px] text-white/45">{L({ en: "Reworked", th: "ส่งแก้" })}</p><p className="mt-0.5 tabular text-base font-semibold" style={{ color: "var(--c-amber-strong)" }}>{reworkUnits(rcDefect)} <span className="text-[10px] font-normal text-white/40">{L({ en: "pcs", th: "ชิ้น" })}</span></p></div>
              <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5"><p className="text-[10px] text-white/45">{L({ en: "Money lost", th: "เงินที่เสีย" })}</p><p className="mt-0.5 tabular text-base font-semibold" style={{ color: "var(--c-rose)" }}>{thbCompact(cost(rcDefect))}</p><p className="text-[9px] text-white/40">{Math.round(cost(rcDefect) / totalCost * 100)}% {L({ en: "of all defects", th: "ของดีเฟกต์ทั้งหมด" })}</p></div>
            </div>
          </motion.div>

          {/* the journey + the decision, per selected defect */}
          <div className="min-w-0">
            <p className="mb-2.5 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{L({ en: "The journey of", th: "เส้นทางของ" })} · <span className="text-brand-300">{L(rcDefect.name)}</span></p>
            <div key={`chain-${rc.defectId}`}>
            {chainNodeTitles.map((n, i) => {
              const Icon = [ScanEye, Clock, Package, Factory, Banknote][i] ?? ScanEye;
              const last = i === chainNodeTitles.length - 1;
              const detail = last ? { en: `if nothing is done, up to ${thbCompact(p.riskTHB)} is at risk`, th: `ถ้าไม่ทำอะไร เสี่ยงเสียหายสูงสุด ${thbCompact(p.riskTHB)}` } : rc.chain[i];
              const STEP = 0.5; // seconds the flowing pulse spends on each connector
              return (
                <motion.div key={n.en} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.16, duration: 0.35, ease: "easeOut" }} className="relative flex items-start gap-2.5 pb-3 last:pb-0">
                  {!last ? (
                    <span className="absolute left-[15px] top-9 h-[calc(100%-32px)] w-px bg-gradient-to-b from-white/20 to-white/5">
                      {/* signal pulse travelling down the chain, connector by connector */}
                      <motion.span
                        className="absolute -left-[2.5px] h-1.5 w-1.5 rounded-full bg-brand-300"
                        style={{ boxShadow: "0 0 6px 1px rgba(96,165,250,0.55)" }}
                        initial={{ top: "0%", opacity: 0 }}
                        animate={{ top: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
                        transition={{ duration: STEP, ease: "linear", repeat: Infinity, delay: 1 + i * STEP, repeatDelay: (chainNodeTitles.length - 2) * STEP }}
                      />
                    </span>
                  ) : null}
                  <motion.span
                    animate={last ? { scale: [1, 1.09, 1] } : undefined}
                    transition={last ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : undefined}
                    className={cn("relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-lg border", last ? "border-rose-400/40 bg-rose-500/12 text-rose-300" : "border-white/12 bg-white/[0.04] text-brand-300")}
                  ><Icon size={15} /></motion.span>
                  <div className={cn("min-w-0 flex-1 rounded-lg border px-3 py-1.5", last ? "border-rose-400/30 bg-rose-500/[0.08]" : "border-white/8 bg-white/[0.02]")}>
                    <p className="text-[12px] font-semibold" style={{ color: last ? "var(--c-rose)" : "var(--c-bright)" }}>{L(n)}</p>
                    <p className="text-[10.5px] leading-snug text-white/50">{L(detail)}</p>
                  </div>
                </motion.div>
              );
            })}

            </div>
          </div>
        </div>
      </Panel>

      {/* similar-case search — the plant's own fix history, full width (the most actionable panel) */}
      <Panel title={L({ en: "Similar Defect Search", th: "ค้นหาเคสที่คล้ายกัน" })} sub={L({ en: `today's ${L(rcDefect.name)} photos matched against ${defectClasses.reduce((s, c) => s + c.samples, 0).toLocaleString()} labelled photos in the library`, th: `เทียบภาพ ${L(rcDefect.name)} วันนี้ กับคลังภาพที่ติดป้ายแล้ว ${defectClasses.reduce((s, c) => s + c.samples, 0).toLocaleString()} ภาพ` })} extra={<span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-400/12 text-brand-300"><ScanSearch size={16} /></span>}>
          <motion.div key={`sim-${rc.defectId}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-2">
            {(similarCases[rc.defectId] ?? []).map((sc) => (
              <div key={sc.when.en} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold tabular", sc.similarity >= 85 ? "bg-emerald-500/12 text-emerald-300" : "bg-white/8 text-white/65")}>{L({ en: "match", th: "คล้าย" })} {sc.similarity}%</span>
                  <span className="flex items-center gap-1 text-[10.5px] text-white/45"><History size={11} /> {L(sc.when)}</span>
                </div>
                <p className="mt-1.5 text-[12px] leading-snug text-white/75">{L({ en: "Cause back then:", th: "สาเหตุตอนนั้น:" })} <span className="font-medium text-white/90">{L(sc.cause)}</span></p>
                <p className="mt-1 flex items-start gap-1.5 text-[11.5px] leading-snug" style={{ color: "var(--c-emerald)" }}><Check size={12} className="mt-0.5 shrink-0" /> {L(sc.outcome)}</p>
              </div>
            ))}
          </motion.div>
          <p className="mt-2.5 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2 text-[11px] leading-relaxed text-white/50">{L({ en: "The plant's own history answers first — if it worked before, try that before anything expensive.", th: "ประวัติของโรงงานคุณเองตอบก่อน — ถ้าเคยแก้แบบไหนแล้วได้ผล ลองแบบนั้นก่อนวิธีที่แพงกว่า" })}</p>
      </Panel>

      {/* Business impact correlation ⭐ — the USP, full width */}
      <Panel title={L({ en: "AI Business-Impact Correlation", th: "เชื่อมโยงผลกระทบธุรกิจด้วย AI" })} sub={L({ en: "uses only the photo time-stamps, matched with the shift, model and production schedule you already have", th: "ใช้แค่เวลาในภาพถ่าย จับคู่กับกะ · รุ่น · ตารางผลิต ที่โรงงานมีอยู่แล้ว" })} extra={<span className="rounded-md bg-brand-400/12 px-2 py-0.5 text-[11px] font-semibold text-brand-200">★ USP</span>}>
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{L({ en: "Factors AI checked · today overall · strongest first", th: "ปัจจัยที่ AI เทียบแล้ว · ภาพรวมวันนี้ · เรียงจากเกี่ยวมากสุด" })}</p>
          <div className="grid gap-2 sm:grid-cols-2">{correlations.filter((c) => c.phase === 1).map((c) => <CorrelationRow key={c.factor.en} c={c} L={L} />)}</div>
          <div className="mt-4 flex items-center gap-2"><Lock size={12} className="text-white/35" /><p className="text-[11px] font-medium text-white/45">{L({ en: "Phase 2 — unlocks as you connect more systems", th: "เฟส 2 — ปลดล็อกเพิ่มเมื่อเชื่อมระบบมากขึ้น" })}</p><span className="h-px flex-1 bg-white/8" /></div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">{correlations.filter((c) => c.phase === 2).map((c) => <CorrelationRow key={c.factor.en} c={c} L={L} />)}</div>
        </Panel>

      {/* forward look — "slipping now" + "coming next" in one panel */}
      <Panel title={L({ en: "AI Looks Ahead", th: "AI มองไปข้างหน้า" })} sub={L({ en: "what's slipping now — and what it becomes if nobody acts", th: "อะไรกำลังเพี้ยนตอนนี้ — และจะกลายเป็นอะไรถ้าไม่ทำอะไร" })}>
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{L({ en: "Slipping now", th: "กำลังเพี้ยน · ตอนนี้" })}</p>
            <ul className="space-y-2">{processInsights.map((pi) => { const hex = pi.sev === "crit" ? "#f43f5e" : pi.sev === "warn" ? "#f59e0b" : "#34d399"; const txt = pi.sev === "crit" ? "var(--c-rose)" : pi.sev === "warn" ? "var(--c-amber-strong)" : "var(--c-emerald)"; return (
              <li key={pi.title.en} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2"><span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ color: txt, backgroundColor: `${hex}1f` }}>{L(pi.kind)}</span><span className="text-[13px] font-medium text-white/85">{L(pi.title)}</span></div>
                <p className="mt-1 text-[11px] leading-snug text-white/50">{L(pi.detail)}</p>
              </li>
            ); })}</ul>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{L({ en: "Coming next · forecast", th: "จะเกิดถัดไป · ล่วงหน้า" })}</p>
            <div className="space-y-2">{predictions.map((pr) => (
              <div key={pr.kind.en} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white/85"><TrendingUp size={13} className="text-amber-300" /> {L(pr.kind)}</span><span className="rounded-md bg-white/8 px-1.5 py-0.5 text-[10px] font-semibold tabular text-white/70">{pr.prob}%</span></div>
                <p className="mt-1 text-[11.5px] leading-snug text-white/55">{L(pr.detail)}</p>
                <div className="mt-1.5 flex items-center justify-between text-[10.5px]"><span className="text-white/40">{L({ en: "in", th: "ใน" })} {L(pr.when)}</span><span className="font-semibold text-rose-300">{thbCompact(pr.impact)} {L({ en: "at risk", th: "เสี่ยง" })}</span></div>
              </div>
            ))}</div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ══════════════════════════ tab · ACT ══════════════════════════ */

/** small on/off switch (local copy of the shared Toggle). */
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
function QuoteEmailModal({ project, L, onClose, onSent }: { project: (typeof visionCapitalProjects)[number]; L: Tr; onClose: () => void; onSent: () => void }) {
  const title = L(project.title);
  const bom = project.parts.map((p, i) => `${i + 1}. ${L(p.name)} · ${p.brand} · ${p.partNo} · ${p.qty} × ${thbCompact(p.unitPrice)} · ${thbCompact(p.qty * p.unitPrice)}`).join("\n");
  const sig = L({
    en: `—\n${currentUser.name}\n${currentUser.title} · ${currentUser.plant}\n${currentUser.company}\n${currentUser.email} · ${currentUser.phone}`,
    th: `—\n${currentUser.name}\n${currentUser.titleTh} · ${currentUser.plant}\n${currentUser.company}\n${currentUser.email} · ${currentUser.phone}`,
  });
  const [subject, setSubject] = useState(L({ en: `Request for Quotation · ${title}`, th: `ขอใบเสนอราคา · ${title}` }));
  const [body, setBody] = useState(L({
    en: `Dear SpareX Sales team,\n\nWe would like to request a formal quotation for the following vision-quality improvement project:\n\nProject: ${title}\nLocation: ${L(project.asset)}\nEstimated budget: ${thbCompact(project.capex)}\nReturn: saves ${thbCompact(project.savingYr)}/yr · payback ${project.paybackMo} months\n\nBill of materials:\n${bom}\n\nPlease include unit prices, lead time, warranty and installation. Equivalent brands are welcome if the specs are met.\n\nThank you,\n\n${sig}`,
    th: `เรียน ทีมขาย SpareX,\n\nทางเราขอใบเสนอราคาอย่างเป็นทางการสำหรับโครงการปรับปรุงคุณภาพงานตรวจดังนี้:\n\nโครงการ: ${title}\nจุดติดตั้ง: ${L(project.asset)}\nงบประมาณโดยประมาณ: ${thbCompact(project.capex)}\nผลตอบแทน: ประหยัด ${thbCompact(project.savingYr)}/ปี · คืนทุน ${project.paybackMo} เดือน\n\nรายการอะไหล่ (BOM):\n${bom}\n\nรบกวนเสนอราคาต่อหน่วย ระยะเวลาส่งมอบ การรับประกัน และค่าติดตั้ง (เสนอรุ่นเทียบเท่าได้หากสเปคตรง)\n\nขอบคุณครับ/ค่ะ\n\n${sig}`,
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

function ActView({ L }: { L: Tr }) {
  const [lit, setLit] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLit(true), 90); return () => clearTimeout(t); }, []);
  const [openId, setOpenId] = useState<string | null>(visionCapitalProjects[0]?.id ?? null);
  const [doneQw, setDoneQw] = useState<Set<string>>(new Set());
  const [poDone, setPoDone] = useState<Set<string>>(new Set());
  const [quoteFor, setQuoteFor] = useState<(typeof visionCapitalProjects)[number] | null>(null);
  const [focus, setFocus] = useState<"all" | "quick" | "capex">("all");
  const [capSev, setCapSev] = useState<"all" | "critical" | "warning" | "recommend">("all");
  const [qwFilter, setQwFilter] = useState<"all" | "pending" | "done">("all");
  const [qwSel, setQwSel] = useState<string | null>(visionQuickWins[0]?.id ?? null);
  const [qwAuto, setQwAuto] = useState<Record<string, boolean>>(() => Object.fromEntries(visionQuickWins.map((q) => [q.id, true])));
  const [quoteSent, setQuoteSent] = useState<Set<string>>(new Set());
  const orders = useWorkOrders();

  const noCapex = visionQuickWins.reduce((s, q) => s + q.savingYr, 0);
  const capexSaving = visionCapitalProjects.reduce((s, c) => s + c.savingYr, 0);
  const capexTotal = visionCapitalProjects.reduce((s, c) => s + c.capex, 0);
  const grand = noCapex + capexSaving;
  const blended = Math.round((capexTotal / capexSaving) * 12);
  const ncPct = Math.round((noCapex / grand) * 100);
  const woFor = (id: string) => orders.find((w) => w.findingId === id);
  const hasWO = (id: string) => poDone.has(id) || !!woFor(id);

  // capital project → single Work Order for installation & commissioning (raised on budget approval)
  const raisePO = (c: (typeof visionCapitalProjects)[number]) => {
    createWorkOrder({ id: c.id, code: c.code, title: { en: `Install & commission · ${L(c.title)}`, th: `ติดตั้ง & Commissioning · ${L(c.title)}` }, asset: c.asset, severity: c.severity === "recommend" ? "advisory" : c.severity, capex: c.capex, annualSaving: c.savingYr, partsCount: c.parts.length }, "production");
    setPoDone((s) => new Set(s).add(c.id));
  };
  // quick win → one-time setup/enable Work Order (config task, no parts → goes straight to "scheduled")
  const commitQuickWin = (q: (typeof visionQuickWins)[number]) => {
    const auto = qwAuto[q.id];
    createWorkOrder({ id: q.id, code: q.id.toUpperCase(), title: { en: `${auto ? "Set up & enable AI-auto" : "Configure"} · ${L(q.title)}`, th: `${auto ? "ตั้งค่า & เปิด AI-auto" : "ตั้งค่า"} · ${L(q.title)}` }, asset: q.asset, severity: "advisory", capex: 0, annualSaving: q.savingYr, partsCount: 0 }, "production");
    setDoneQw((s) => new Set(s).add(q.id));
  };

  return (
    <div className="space-y-6">
      {/* Executive summary — the ฿ decision in one glance */}
      <section className="panel p-5" style={{ background: "linear-gradient(180deg, rgba(52,211,153,0.06), transparent 82%)" }}>
        <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
          <Icon3D icon={Sparkles} color="#34d399" size={28} rounded={9} /> {L({ en: "Action plan · recoverable this year", th: "แผนลงมือ · กู้คืนได้ปีนี้" })}
        </div>
        <p className="mt-3 tabular text-4xl font-bold text-white">{thbCompact(grand)}<span className="ml-2 text-sm font-normal text-white/45">/{L({ en: "yr", th: "ปี" })}</span></p>
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
              <p className="tabular text-xl font-bold text-emerald-200">{thbCompact(noCapex)}<span className="text-[11px] font-normal text-white/45">/{L({ en: "yr", th: "ปี" })}</span></p>
              <p className="text-[10.5px] text-white/45">{visionQuickWins.length} {L({ en: "actions · ฿0 capex", th: "รายการ · ลงทุน ฿0" })}</p>
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
              <p className="tabular text-xl font-bold text-indigo-200">+{thbCompact(capexSaving)}<span className="text-[11px] font-normal text-white/45">/{L({ en: "yr", th: "ปี" })}</span></p>
              <p className="text-[10.5px] text-white/45">{L({ en: "budget", th: "งบ" })} {thbCompact(capexTotal)} · {L({ en: "payback", th: "คืนทุน" })} {blended} {L({ en: "mo", th: "เดือน" })}</p>
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
              const n = id === "all" ? visionQuickWins.length : visionQuickWins.filter((q) => (doneQw.has(q.id) || hasWO(q.id)) === (id === "done")).length;
              const sel = qwFilter === id;
              return (
                <button key={id} onClick={() => setQwFilter(id)} className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium transition", sel ? "bg-white/10 text-white/90" : "text-white/45 hover:text-white/70")}>
                  {dot ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} /> : null}
                  {L(lab)} <span className="tabular text-white/40">{n}</span>
                </button>
              );
            })}
          </div>
          <span className="chip text-emerald-300">{thbCompact(noCapex)}/{L({ en: "yr", th: "ปี" })} · ฿0</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {visionQuickWins.filter((q) => qwFilter === "all" || (doneQw.has(q.id) || hasWO(q.id)) === (qwFilter === "done")).map((q) => {
            const on = qwSel === q.id;
            const done = doneQw.has(q.id) || hasWO(q.id);
            return (
              <div key={q.id} onClick={() => setQwSel(on ? null : q.id)} className={cn("flex cursor-pointer flex-col rounded-2xl border p-4 transition", on ? "border-emerald-400/50 bg-emerald-400/[0.07] ring-1 ring-emerald-400/30" : done ? "border-emerald-400/20 bg-emerald-400/[0.03]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]")}>
                <p className="text-[13px] font-medium leading-snug text-white">{L(q.title)}</p>
                <p className="mt-1 text-[10.5px] text-white/40">{L(q.asset)}</p>
                <p className="mt-2 flex-1 text-[11px] leading-relaxed text-white/55">{L(q.how)}</p>
                <div className="mt-2.5">
                  <p className="tabular text-lg font-bold text-emerald-300">{thbCompact(q.savingYr)}</p>
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
            const q = visionQuickWins.find((x) => x.id === qwSel)!;
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
                      <li className="flex items-start gap-2 text-[12px] leading-relaxed text-white/75"><ArrowRight size={12} className="mt-0.5 shrink-0 text-emerald-400" /> {L({ en: "Recovers", th: "กู้คืนได้" })} <b className="tabular text-emerald-300">{thbCompact(q.savingYr)}/{L({ en: "yr", th: "ปี" })}</b> {L({ en: "at ฿0 capex", th: "โดยไม่ต้องลงทุน" })}</li>
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
              const n = id === "all" ? visionCapitalProjects.length : visionCapitalProjects.filter((c) => c.severity === id).length;
              const sel = capSev === id;
              return (
                <button key={id} onClick={() => setCapSev(id)} className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium transition", sel ? "bg-white/10 text-white/90" : "text-white/45 hover:text-white/70")}>
                  {dot ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} /> : null}
                  {L(lab)} <span className="tabular text-white/40">{n}</span>
                </button>
              );
            })}
          </div>
          <span className="chip text-indigo-300">+{thbCompact(capexSaving)}/{L({ en: "yr", th: "ปี" })} · {L({ en: "budget", th: "งบ" })} {thbCompact(capexTotal)}</span>
        </div>
        <div className="space-y-3">
          {visionCapitalProjects.filter((c) => capSev === "all" || c.severity === capSev).map((c) => {
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
                  <div className="text-right"><p className="tabular text-[13px] font-bold text-emerald-300">+{thbCompact(c.savingYr)}</p><p className="text-[9px] uppercase text-white/35">/{L({ en: "yr saving", th: "ปี ประหยัด" })}</p></div>
                  <div className="text-right"><p className="tabular text-[13px] font-bold text-amber-300">{thbCompact(c.capex)}</p><p className="text-[9px] uppercase text-white/35">{L({ en: "budget", th: "งบ" })}</p></div>
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
                            <span><span className="font-medium text-white/55">{L({ en: "Evidence", th: "หลักฐานที่เจอ" })}</span> · {L(c.evidence)} <span className="text-white/30">· {L({ en: "from the AI cameras + PLC", th: "จากกล้อง AI + PLC" })}</span></span>
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
                                  <td className="px-2 py-2 text-right text-white/80">{thbCompact(p.qty * p.unitPrice)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="tabular text-[11px]">
                              <tr><td colSpan={4} className="py-1.5 pr-2 text-right text-white/45">{L({ en: "Parts subtotal", th: "รวมค่าอะไหล่" })}</td><td className="px-2 py-1.5 text-right text-white/70">{thbCompact(partsSum)}</td></tr>
                              {install > 0 ? <tr><td colSpan={4} className="py-1.5 pr-2 text-right text-white/45">{L({ en: "Install & commissioning", th: "ติดตั้ง & คอมมิชชัน" })}</td><td className="px-2 py-1.5 text-right text-white/70">{thbCompact(install)}</td></tr> : null}
                              <tr><td colSpan={4} className="py-1.5 pr-2 text-right text-[12px] font-semibold text-white/70">{L({ en: "Total budget", th: "งบรวม" })}</td><td className="px-2 py-1.5 text-right text-[12px] font-bold text-amber-300">{thbCompact(c.capex)}</td></tr>
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

/* ══════════════════════════ tab · REPORT ══════════════════════════ */
/** In-app PDF preview — an A4 page styled like a real factory document.
 *  The paper is ALWAYS white, so every colour inside is a fixed hex (never theme-flipped utilities). */
function PdfPreview({ t, L, onClose }: { t: ReportTemplate; L: Tr; onClose: () => void }) {
  const [dl, setDl] = useState<"idle" | "busy" | "done">("idle");
  const paperRef = useRef<HTMLDivElement>(null);
  const totalScrap = defects.reduce((s, d) => s + scrapUnits(d), 0);
  const totalRework = defects.reduce((s, d) => s + reworkUnits(d), 0);
  const top5 = [...defects].sort((a, b) => b.count - a.count).slice(0, 5);
  const topActs = [...actions].sort((a, b) => a.priority.localeCompare(b.priority)).slice(0, 3);
  const fname = `${t.name.en.replace(/[^A-Za-z0-9]+/g, "-")}-2026-07-07.pdf`;
  // real client-side PDF: rasterise the paper DOM (Thai text renders from the loaded fonts).
  // page = A4 width × the content's own height → the file looks exactly like the preview, no blank tail
  const download = async () => {
    if (dl !== "idle" || !paperRef.current) return;
    setDl("busy");
    try {
      const el = paperRef.current;
      const pageW = 210;
      const pageH = Math.max(148, (el.scrollHeight / el.offsetWidth) * pageW + 1);
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf().set({
        margin: 0,
        filename: fname,
        image: { type: "jpeg", quality: 0.98 }, // near-lossless on white paper, ~10× smaller than png
        html2canvas: { scale: 3, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: [pageW, pageH], orientation: "portrait" },
      }).from(el).save();
      setDl("done");
      setTimeout(() => setDl("idle"), 2500);
    } catch {
      setDl("idle");
    }
  };
  const Sec = ({ no, title, children }: { no: string; title: string; children: React.ReactNode }) => (
    <div className="px-8 pt-5" style={{ breakInside: "avoid" }}>
      <div className="flex items-baseline gap-2 border-b-2 border-[#0f172a] pb-1">
        <span className="text-[11px] font-bold tabular text-[#0e7490]">{no}</span>
        <h2 className="text-[12px] font-bold uppercase tracking-wider text-[#0f172a]">{title}</h2>
      </div>
      <div className="pt-2.5">{children}</div>
    </div>
  );
  /* paper building blocks — fixed print colours */
  const P = ({ children }: { children: React.ReactNode }) => <p className="text-[11.5px] leading-relaxed text-[#334155]">{children}</p>;
  const Kpis = ({ items }: { items: [LZ, string, LZ, string?][] }) => (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))` }}>
      {items.map(([k, v, s, c]) => (
        <div key={k.en} className="border border-[#e2e8f0] p-2.5">
          <p className="text-[8.5px] uppercase tracking-wider text-[#94a3b8]">{L(k)}</p>
          <p className="tabular text-[18px] font-bold leading-tight" style={{ color: c ?? "#0f172a" }}>{v}</p>
          <p className="text-[9px] text-[#94a3b8]">{L(s)}</p>
        </div>
      ))}
    </div>
  );
  const Tbl = ({ head, right = [], rows }: { head: LZ[]; right?: number[]; rows: React.ReactNode[][] }) => (
    <table className="w-full">
      <thead><tr className="bg-[#f1f5f9] text-[9px] uppercase tracking-wider text-[#64748b]">
        {head.map((h, i) => <th key={h.en} className={cn("px-2 py-1.5 align-middle font-semibold leading-[1.4]", right.includes(i) ? "text-right" : "text-left")}>{L(h)}</th>)}
      </tr></thead>
      <tbody>{rows.map((r, ri) => (
        <tr key={ri} className="border-b border-[#e2e8f0] text-[11px] text-[#334155]">
          {r.map((c, ci) => <td key={ci} className={cn("px-2 py-1.5 align-middle leading-[1.4]", right.includes(ci) && "tabular text-right")}>{c}</td>)}
        </tr>
      ))}</tbody>
    </table>
  );
  const Num = ({ items }: { items: React.ReactNode[] }) => (
    <ol className="space-y-1.5">{items.map((it, i) => (
      <li key={i} className="flex items-start gap-2 text-[11px] text-[#334155]"><span className="tabular mt-px shrink-0 font-bold text-[#0e7490]">{i + 1}.</span><span className="min-w-0">{it}</span></li>
    ))}</ol>
  );
  const St = ({ ok }: { ok: boolean }) => <span className={cn("whitespace-nowrap rounded px-1.5 py-px text-[8.5px] font-bold", ok ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fef3c7] text-[#b45309]")}>{ok ? L({ en: "done", th: "เสร็จ" }) : L({ en: "pending", th: "รอ" })}</span>;
  const B = ({ children }: { children: React.ReactNode }) => <span className="font-medium text-[#0f172a]">{children}</span>;

  /* shared figures */
  const rcDim = rootCauses.find((r) => r.defectId === "dim")!;
  const rcAsm = rootCauses.find((r) => r.defectId === "assembly")!;
  const ranked = [...defects].sort((a, b) => b.count - a.count);
  let cumc = 0;
  const paretoRows = ranked.map((d) => { cumc += d.count; return { d, cum: Math.round((cumc / defectsToday) * 100) }; });
  const fixTotal = rootCauses.reduce((s, r) => s + r.fix.cost, 0);
  const riskTotal = rootCauses.reduce((s, r) => s + r.riskTHB, 0);
  const invisiblePct = Math.round((copq.invisible / copq.today) * 100);

  /* the body — one storyline per template, all reading the same 380-piece ledger */
  const body = (() => {
    switch (t.id) {
      case "quality-summary": return (<>
        <Sec no="01" title={L({ en: "Executive summary · by AI", th: "บทสรุปผู้บริหาร · โดย AI" })}>
          <P>{L({
            en: `FPY sits at ${fpy}% (down 0.3pp this week) with a defect rate of ${defectRatePpm.toLocaleString()} ppm and a quality health score of ${qualityHealthScore}/100. No escapes have reached a customer for ${daysClean} straight days. Quality cost today is ${thbCompact(copq.today)} (≈ ${thbCompact(copq.yr)}/yr at this run-rate); the single largest drag is die wear on Stamping Press 03.`,
            th: `FPY อยู่ที่ ${fpy}% (ลดลง 0.3pp ในสัปดาห์นี้) อัตราดีเฟกต์ ${defectRatePpm.toLocaleString()} ppm และคะแนนสุขภาพคุณภาพ ${qualityHealthScore}/100 ไม่มีของหลุดถึงลูกค้าต่อเนื่อง ${daysClean} วัน ต้นทุนคุณภาพวันนี้ ${thbCompact(copq.today)} (คิดเป็นปีละ ≈ ${thbCompact(copq.yr)}) ตัวฉุดที่ใหญ่ที่สุดคือดายสึกที่ Stamping Press 03`,
          })}</P>
        </Sec>
        <Sec no="02" title={L({ en: "Quality KPIs", th: "ตัวชี้วัดคุณภาพ" })}>
          <Kpis items={[
            [{ en: "FPY", th: "FPY" }, `${fpy}%`, { en: "▼ 0.3pp this week", th: "▼ 0.3pp สัปดาห์นี้" }, "#b45309"],
            [{ en: "Defect rate", th: "อัตราดีเฟกต์" }, `${defectRatePpm.toLocaleString()}`, { en: "ppm · of 100% inspected", th: "ppm · จากการตรวจ 100%" }],
            [{ en: "Quality health", th: "สุขภาพคุณภาพ" }, `${qualityHealthScore}/100`, { en: "camera + AI + process", th: "กล้อง + AI + กระบวนการ" }],
            [{ en: "Escapes", th: "ของหลุดถึงลูกค้า" }, `${escapes}`, { en: `${daysClean} clean days in a row`, th: `${daysClean} วันสะอาดติดต่อกัน` }, "#15803d"],
          ]} />
        </Sec>
        <Sec no="03" title={L({ en: "Cost of poor quality · visible vs hidden", th: "ต้นทุนคุณภาพ · ที่เห็น vs ที่ซ่อน" })}>
          <Tbl head={[{ en: "Item", th: "รายการ" }, { en: "In the books?", th: "บัญชีเห็นมั้ย" }, { en: "Today", th: "วันนี้" }]} right={[2]}
            rows={copqBreakdown.map((b) => [L(b.label), b.visible ? L({ en: "visible", th: "เห็น" }) : <span key="h" className="font-semibold text-[#b91c1c]">{L({ en: "hidden", th: "ซ่อน" })}</span>, thbCompact(b.value)])} />
          <p className="mt-1.5 text-[10px] text-[#64748b]">{L({ en: `${invisiblePct}% of today's quality cost never appears in accounting`, th: `${invisiblePct}% ของต้นทุนคุณภาพวันนี้ ไม่เคยโผล่ในบัญชี` })}</p>
        </Sec>
        <Sec no="04" title={L({ en: "Recommendations", th: "ข้อเสนอแนะ" })}>
          <Num items={[
            <span key="1">{L({ en: "Regrind the Press 03 die (฿85K) within 18 hours — stops the largest defect at its source", th: "เจียรดาย Press 03 (฿85K) ภายใน 18 ชั่วโมง — หยุดดีเฟกต์ตัวใหญ่สุดที่ต้นทาง" })}</span>,
            <span key="2">{L({ en: "Add a night-shift-B setup checklist — its defect rate runs 2.1× the day shift", th: "เพิ่มเช็คลิสต์เซ็ตอัพกะดึก B — อัตราของเสียสูงเป็น 2.1 เท่าของกะเช้า" })}</span>,
          ]} />
        </Sec>
      </>);

      case "business-impact": return (<>
        <Sec no="01" title={L({ en: "Executive summary · by AI", th: "บทสรุปผู้บริหาร · โดย AI" })}>
          <P>{L({
            en: `Today's ${defectsToday} defects do not stay inside the QC gate — they ripple into the business: ${defects.reduce((s, d) => s + reworkUnits(d), 0)} reworked parts consume roughly 26 machine-hours, quality losses shave ~0.9pp off OEE, and the pending export lot carries ${thbCompact(rcDim.riskTHB)} of revenue at risk from dimensional defects. Fixing the top source (Press 03 die, ฿85K) removes the largest link in that chain.`,
            th: `ดีเฟกต์ ${defectsToday} ชิ้นของวันนี้ไม่ได้จบที่ด่านตรวจ — มันลามต่อถึงธุรกิจ: งานส่งแก้ ${defects.reduce((s, d) => s + reworkUnits(d), 0)} ชิ้นกินเวลาเครื่องรวม ~26 ชั่วโมง ความสูญเสียด้านคุณภาพฉุด OEE ลง ~0.9pp และล็อตส่งออกที่ค้างอยู่มีรายได้เสี่ยง ${thbCompact(rcDim.riskTHB)} จากดีเฟกต์เรื่องขนาด การแก้ต้นทางตัวใหญ่สุด (ดาย Press 03 · ฿85K) คือการตัดห่วงโซ่ที่ใหญ่ที่สุดทิ้ง`,
          })}</P>
        </Sec>
        <Sec no="02" title={L({ en: "Defect → OEE → downtime → revenue", th: "ดีเฟกต์ → OEE → ดาวน์ไทม์ → รายได้" })}>
          <Kpis items={[
            [{ en: "Defects today", th: "ดีเฟกต์วันนี้" }, `${defectsToday}`, { en: "pcs caught at the gate", th: "ชิ้น จับได้ที่ด่านตรวจ" }],
            [{ en: "OEE impact", th: "ผลต่อ OEE" }, "-0.9pp", { en: "quality-loss share", th: "จากความสูญเสียด้านคุณภาพ" }, "#b45309"],
            [{ en: "Hidden downtime", th: "ดาวน์ไทม์แฝง" }, "~26", { en: "machine-hours on rework", th: "ชม.เครื่อง หมดไปกับงานแก้" }, "#b45309"],
            [{ en: "Revenue at risk", th: "รายได้ที่เสี่ยง" }, thbCompact(rcDim.riskTHB), { en: "pending export lot", th: "ล็อตส่งออกที่ค้างอยู่" }, "#b91c1c"],
          ]} />
        </Sec>
        <Sec no="03" title={L({ en: "What the defects correlate with · today", th: "ดีเฟกต์เกี่ยวข้องกับอะไร · วันนี้" })}>
          <Tbl head={[{ en: "Factor", th: "ปัจจัย" }, { en: "Strength", th: "ความเกี่ยวข้อง" }, { en: "What AI found", th: "สิ่งที่ AI พบ" }]} right={[1]}
            rows={correlations.filter((c) => c.phase === 1).map((c) => [<B key="f">{L(c.factor)}</B>, `r = ${c.strength.toFixed(2)}`, L(c.finding)])} />
        </Sec>
        <Sec no="04" title={L({ en: "The decision", th: "ทางแก้ของการตัดสินใจ" })}>
          <Tbl head={[{ en: "Option", th: "ทางเลือก" }, { en: "Cost", th: "ต้นทุน" }, { en: "Outcome", th: "ผลลัพธ์" }]} right={[1]} rows={[
            [<B key="a">{L({ en: "Fix now — regrind the Press 03 die", th: "แก้ตอนนี้ — เจียรดาย Press 03" })}</B>, thbCompact(rcDim.fix.cost), L({ en: "dimensional defects ~-60% within one shift", th: "ดีเฟกต์ขนาดลด ~60% ภายใน 1 กะ" })],
            [L({ en: "Let it run", th: "ปล่อยไว้" }), <span key="r" className="font-semibold text-[#b91c1c]">{L({ en: "risk", th: "เสี่ยง" })} {thbCompact(rcDim.riskTHB)}</span>, L({ en: "defect passes 1.5% before shift end · export lot exposed", th: "ดีเฟกต์ทะลุ 1.5% ก่อนหมดกะ · ล็อตส่งออกเสี่ยง" })],
          ]} />
          <p className="mt-1.5 text-[10px] font-semibold text-[#0e7490]">{L({ en: `Acting now is ${Math.round(rcDim.riskTHB / rcDim.fix.cost)}× cheaper than the risk of waiting`, th: `ตัดสินใจตอนนี้ถูกกว่าความเสี่ยงที่รออยู่ ${Math.round(rcDim.riskTHB / rcDim.fix.cost)} เท่า` })}</p>
        </Sec>
      </>);

      case "financial": return (<>
        <Sec no="01" title={L({ en: "Executive summary · by AI", th: "บทสรุปผู้บริหาร · โดย AI" })}>
          <P>{L({
            en: `Accounting sees ${thbCompact(copq.visible)} of scrap today — but the full quality cost is ${thbCompact(copq.today)}: ${invisiblePct}% hides in rework labour, machine time, re-inspection and material burn that no ledger line captures. At this run-rate that is ≈ ${thbCompact(copq.yr)} per year. The entire root-cause fix list costs ${thbCompact(fixTotal)} against ${thbCompact(riskTotal)} of accumulated risk.`,
            th: `บัญชีเห็นค่าของเสียวันนี้แค่ ${thbCompact(copq.visible)} — แต่ต้นทุนคุณภาพจริงคือ ${thbCompact(copq.today)}: อีก ${invisiblePct}% ซ่อนอยู่ในค่าแรงงานแก้ เวลาเครื่อง การตรวจซ้ำ และวัตถุดิบที่เผาทิ้ง ซึ่งไม่มีบรรทัดไหนในบัญชีบันทึก คิดเป็นปีละ ≈ ${thbCompact(copq.yr)} ขณะที่ค่าแก้ต้นตอทั้งรายการรวมกันเพียง ${thbCompact(fixTotal)} เทียบความเสี่ยงสะสม ${thbCompact(riskTotal)}`,
          })}</P>
        </Sec>
        <Sec no="02" title={L({ en: "The money picture", th: "ภาพรวมตัวเงิน" })}>
          <Kpis items={[
            [{ en: "Total today", th: "รวมวันนี้" }, thbCompact(copq.today), { en: "cost of poor quality", th: "ต้นทุนคุณภาพทั้งหมด" }],
            [{ en: "Visible", th: "บัญชีเห็น" }, thbCompact(copq.visible), { en: "scrap on the books", th: "ค่าของเสียตามบัญชี" }],
            [{ en: "Hidden", th: "ซ่อนอยู่" }, thbCompact(copq.invisible), { en: `${invisiblePct}% of the real cost`, th: `${invisiblePct}% ของต้นทุนจริง` }, "#b91c1c"],
            [{ en: "Full year", th: "ทั้งปี" }, `≈ ${thbCompact(copq.yr)}`, { en: "at today's run-rate", th: "ถ้าอัตราเท่าวันนี้" }, "#b91c1c"],
          ]} />
        </Sec>
        <Sec no="03" title={L({ en: "Where the money goes", th: "เงินหายไปไหนบ้าง" })}>
          <Tbl head={[{ en: "Cost item", th: "รายการต้นทุน" }, { en: "Status", th: "สถานะ" }, { en: "Today", th: "วันนี้" }, { en: "≈ / year", th: "≈ ต่อปี" }]} right={[2, 3]}
            rows={copqBreakdown.map((b) => [L(b.label), b.visible ? L({ en: "in the books", th: "เห็นในบัญชี" }) : <span key="h" className="font-semibold text-[#b91c1c]">{L({ en: "hidden", th: "ซ่อน" })}</span>, thbCompact(b.value), thbCompact(b.value * 300)])} />
        </Sec>
        <Sec no="04" title={L({ en: "Financial recommendations", th: "ข้อเสนอแนะด้านการเงิน" })}>
          <Num items={[
            <span key="1">{L({ en: `Approve the root-cause budget ${thbCompact(fixTotal)} — it retires ${thbCompact(riskTotal)} of standing risk`, th: `อนุมัติงบแก้ต้นตอรวม ${thbCompact(fixTotal)} — ปลดความเสี่ยงคงค้าง ${thbCompact(riskTotal)}` })}</span>,
            <span key="2">{L({ en: "Track COPQ (visible + hidden) as a monthly KPI — today only scrap is measured", th: "ตั้ง COPQ (เห็น + ซ่อน) เป็น KPI รายเดือน — ทุกวันนี้วัดแค่ค่าของเสีย" })}</span>,
          ]} />
        </Sec>
      </>);

      case "system-roi": return (<>
        <Sec no="01" title={L({ en: "Executive summary · by AI", th: "บทสรุปผู้บริหาร · โดย AI" })}>
          <P>{L({
            en: `VisionIQ inspects 100% of output and catches ${defectsToday} defective parts per day before they leave the plant — ${daysClean} straight days without an escape. Total value protected is ≈ ฿10.8M/yr against a system cost of ฿1.8M/yr: an ROI of ~6× with a ~2-month payback.`,
            th: `VisionIQ ตรวจชิ้นงานครบ 100% และจับของเสีย ${defectsToday} ชิ้นต่อวันก่อนออกจากโรงงาน — ไม่มีของหลุดต่อเนื่อง ${daysClean} วัน มูลค่าที่ระบบปกป้องรวม ≈ ฿10.8M/ปี เทียบค่าระบบ ฿1.8M/ปี คิดเป็น ROI ~6 เท่า คืนทุนภายใน ~2 เดือน`,
          })}</P>
        </Sec>
        <Sec no="02" title={L({ en: "Return on investment", th: "ผลตอบแทนการลงทุน" })}>
          <Kpis items={[
            [{ en: "Value protected / yr", th: "มูลค่าที่กันได้ / ปี" }, "฿10.8M", { en: "three sources below", th: "จาก 3 แหล่งด้านล่าง" }, "#15803d"],
            [{ en: "System cost / yr", th: "ค่าระบบ / ปี" }, "฿1.8M", { en: "cameras + AI + support", th: "กล้อง + AI + ดูแลระบบ" }],
            [{ en: "ROI", th: "ROI" }, "6.0×", { en: "value ÷ cost", th: "มูลค่า ÷ ค่าระบบ" }, "#15803d"],
            [{ en: "Payback", th: "คืนทุน" }, "~2", { en: "months", th: "เดือน" }, "#15803d"],
          ]} />
        </Sec>
        <Sec no="03" title={L({ en: "Where the value comes from", th: "มูลค่ามาจากไหน" })}>
          <Tbl head={[{ en: "Source", th: "แหล่งที่มา" }, { en: "How it's counted", th: "วิธีคิด" }, { en: "฿ / yr", th: "฿ / ปี" }]} right={[2]} rows={[
            [<B key="1">{L({ en: "Escapes prevented", th: "ของหลุดที่กันได้" })}</B>, L({ en: "before: ~3 claims/mo × ฿180K average", th: "ก่อนติดตั้ง: เคลมเฉลี่ย ~3 ครั้ง/เดือน × ฿180K" }), "฿6.5M"],
            [<B key="2">{L({ en: "Inspection labour", th: "คนตรวจที่ลดได้" })}</B>, L({ en: "4 → 1 QC inspectors per shift × 2 shifts", th: "คนตรวจ 4 → 1 คนต่อกะ × 2 กะ" }), "฿1.4M"],
            [<B key="3">{L({ en: "COPQ reduction", th: "COPQ ที่ลดลง" })}</B>, L({ en: "root causes fixed faster (~13% of yearly COPQ)", th: "แก้ต้นตอได้เร็วขึ้น (~13% ของ COPQ ทั้งปี)" }), "฿2.9M"],
          ]} />
        </Sec>
        <Sec no="04" title={L({ en: "Expansion recommendation", th: "ข้อเสนอการขยาย" })}>
          <Num items={[
            <span key="1">{L({ en: "Add a second gate at the assembly line — same camera spec, reuses the trained model", th: "เพิ่มด่านตรวจที่ 2 ที่ไลน์ประกอบ — ใช้สเปกกล้องเดิมและโมเดลที่สอนไว้แล้ว" })}</span>,
            <span key="2">{L({ en: "Connect PLC parameters (Phase 2) to unlock machine-level correlation", th: "เชื่อมพารามิเตอร์ PLC (เฟส 2) เพื่อปลดล็อกการเชื่อมโยงระดับตัวเครื่อง" })}</span>,
          ]} />
        </Sec>
      </>);

      case "root-cause": return (<>
        <Sec no="01" title={L({ en: "Conclusion · by AI", th: "ข้อสรุป · โดย AI" })}>
          <P><B>{L(rcDim.cause)}</B> — {L({ en: `confidence ${rcDim.confidence}%. The evidence chain below is built from camera measurements and time-stamps only.`, th: `ความมั่นใจ ${rcDim.confidence}% ห่วงโซ่หลักฐานด้านล่างสร้างจากค่าที่กล้องวัดและเวลาบนภาพเท่านั้น` })}</P>
        </Sec>
        <Sec no="02" title={L({ en: "How the AI knows", th: "AI รู้ได้ยังไง" })}>
          <Num items={rcDim.evidence.map((e, i) => <span key={i}>{L(e)}</span>)} />
        </Sec>
        <Sec no="03" title={L({ en: "The defect's journey", th: "เส้นทางของดีเฟกต์" })}>
          <Tbl head={[{ en: "Step", th: "ขั้น" }, { en: "What the data says", th: "ข้อมูลบอกว่า" }]} rows={[
            ...chainNodeTitles.slice(0, 4).map((n, i) => [<B key={n.en}>{L(n)}</B>, L(rcDim.chain[i])]),
            [<B key="biz">{L(chainNodeTitles[4])}</B>, <span key="risk" className="font-semibold text-[#b91c1c]">{L({ en: `if nothing is done, up to ${thbCompact(rcDim.riskTHB)} is at risk`, th: `ถ้าไม่ทำอะไร เสี่ยงเสียหายสูงสุด ${thbCompact(rcDim.riskTHB)}` })}</span>],
          ]} />
        </Sec>
        <Sec no="04" title={L({ en: "Decision & expected outcome", th: "การตัดสินใจและผลที่คาด" })}>
          <Num items={[
            <span key="1">{L({ en: `Fix: ${rcDim.fix.label.en} — ${thbCompact(rcDim.fix.cost)}, done within one maintenance window`, th: `การแก้: ${rcDim.fix.label.th} — ${thbCompact(rcDim.fix.cost)} ใช้ช่วงหยุดซ่อมรอบเดียว` })}</span>,
            <span key="2">{L({ en: "Expected: dimensional defects -60% within one shift · FPY back above 99.4%", th: "ผลที่คาด: ดีเฟกต์ขนาดลด 60% ภายใน 1 กะ · FPY กลับไปเกิน 99.4%" })}</span>,
            <span key="3">{L({ en: `Doing nothing carries ${thbCompact(rcDim.riskTHB)} of risk — ${Math.round(rcDim.riskTHB / rcDim.fix.cost)}× the cost of the fix`, th: `ไม่ทำอะไรมีความเสี่ยง ${thbCompact(rcDim.riskTHB)} — เป็น ${Math.round(rcDim.riskTHB / rcDim.fix.cost)} เท่าของค่าแก้` })}</span>,
          ]} />
        </Sec>
      </>);

      case "defect-analysis": return (<>
        <Sec no="01" title={L({ en: "Executive summary · by AI", th: "บทสรุปผู้บริหาร · โดย AI" })}>
          <P>{L({
            en: `${defectsToday} defective parts across 7 defect classes today. The distribution is heavily concentrated: the top 3 classes cover ${paretoRows[2].cum}% of everything — fix those three sources and most of the problem disappears.`,
            th: `วันนี้พบของเสีย ${defectsToday} ชิ้นจากดีเฟกต์ 7 ชนิด การกระจายกระจุกตัวชัดเจน: แค่ 3 อันดับแรกครอบ ${paretoRows[2].cum}% ของทั้งหมด — แก้ 3 ต้นทางนี้ได้ ปัญหาส่วนใหญ่หายไปด้วย`,
          })}</P>
        </Sec>
        <Sec no="02" title={L({ en: "Pareto · all 7 classes", th: "Pareto · ครบทั้ง 7 ชนิด" })}>
          <Tbl head={[{ en: "Defect", th: "ดีเฟกต์" }, { en: "Caught", th: "จับได้" }, { en: "Cumulative", th: "สะสม" }, { en: "Money lost", th: "เงินที่เสีย" }, { en: "Source machine", th: "เครื่องต้นทาง" }]} right={[1, 2, 3]}
            rows={paretoRows.map(({ d, cum }, i) => [i < 3 ? <B key="n">{L(d.name)}</B> : L(d.name), `${d.count}`, `${cum}%`, thbCompact(defectCost(d)), d.machine])} />
          <p className="mt-1.5 text-[10px] text-[#64748b]">{L({ en: "bold = the 80/20 group to fix first", th: "ตัวหนา = กลุ่มที่ควรแก้ก่อนตามกฎ 80/20" })}</p>
        </Sec>
        <Sec no="03" title={L({ en: "Where to focus", th: "จุดที่ควรโฟกัส" })}>
          <Num items={[
            <span key="1"><B>Stamping Press 03</B> — {L({ en: "die wear driving 128 pcs/day, still climbing", th: "ดายสึก ทำของเสีย 128 ชิ้น/วัน และยังไต่ขึ้น" })}</span>,
            <span key="2"><B>Paint Booth 14</B> — {L({ en: "weak exhaust + one clogged nozzle: 150 pcs/day combined", th: "ลมดูดอ่อน + หัวพ่นอุดตัน: รวม 150 ชิ้น/วัน" })}</span>,
            <span key="3"><B>{L({ en: "Night shift B", th: "กะดึก B" })}</B> — {L({ en: "defect rate 2.1× the day shift — checklist, not hardware", th: "อัตราของเสีย 2.1 เท่าของกะเช้า — แก้ด้วยเช็คลิสต์ ไม่ใช่ซื้อเครื่อง" })}</span>,
          ]} />
        </Sec>
      </>);

      case "fix-effect": return (<>
        <Sec no="01" title={L({ en: "Executive summary · by AI", th: "บทสรุปผู้บริหาร · โดย AI" })}>
          <P>{L({
            en: "Two source-fixes closed in the last quarter keep proving themselves: the camera measures the defect rate before and after every closed work order, so the effect is fact, not opinion. Combined verified saving ≈ ฿1.4M/yr.",
            th: "มาตรการแก้ต้นตอ 2 รายการที่ปิดไปไตรมาสล่าสุดยังยืนยันผลต่อเนื่อง: กล้องวัดอัตราดีเฟกต์ก่อนและหลังปิดใบสั่งงานทุกใบ ผลลัพธ์จึงเป็นข้อเท็จจริง ไม่ใช่ความเห็น รวมมูลค่าที่พิสูจน์แล้ว ≈ ฿1.4M/ปี",
          })}</P>
        </Sec>
        <Sec no="02" title={L({ en: "Verified results · before vs after", th: "ผลที่พิสูจน์แล้ว · ก่อน vs หลัง" })}>
          <Tbl head={[{ en: "Fix (closed)", th: "มาตรการ (ปิดเมื่อ)" }, { en: "Before", th: "ก่อน" }, { en: "After", th: "หลัง" }, { en: "Change", th: "เปลี่ยนแปลง" }, { en: "Saving / yr", th: "ประหยัด / ปี" }]} right={[1, 2, 3, 4]} rows={[
            [<B key="1">{L({ en: "Warm-up step before injection · Mold 08 (Apr 2026)", th: "อุ่นเครื่องก่อนฉีด · Mold 08 (เม.ย. 2026)" })}</B>, "120", "14", <span key="c" className="font-semibold text-[#15803d]">-88%</span>, "฿0.9M"],
            [<B key="2">{L({ en: "Dust curtain + moved grinding · CNC 01 (Mar 2026)", th: "กั้นม่านฝุ่น + ย้ายจุดเจียร · CNC 01 (มี.ค. 2026)" })}</B>, "45", "18", <span key="c" className="font-semibold text-[#15803d]">-60%</span>, "฿0.5M"],
          ]} />
          <p className="mt-1.5 text-[10px] text-[#64748b]">{L({ en: "unit: defective pcs/day, measured by the same gate before and after", th: "หน่วย: ชิ้นเสีย/วัน วัดโดยด่านตรวจเดียวกันทั้งก่อนและหลัง" })}</p>
        </Sec>
        <Sec no="03" title={L({ en: "Awaiting measurement", th: "รอวัดผล" })}>
          <Num items={[
            <span key="1">{L({ en: "Regrind Press 03 die (work order open) — expected -60% on dimensional defects; the gate will verify within 3 shifts of closing", th: "เจียรดาย Press 03 (ใบสั่งงานเปิดอยู่) — คาดลดดีเฟกต์ขนาด 60% ด่านตรวจจะยืนยันผลภายใน 3 กะหลังปิดงาน" })}</span>,
          ]} />
        </Sec>
      </>);

      case "supplier-quality": return (<>
        <Sec no="01" title={L({ en: "Executive summary · by AI", th: "บทสรุปผู้บริหาร · โดย AI" })}>
          <P>{L({
            en: `One material signal stands out: assembly misfits (${rcAsm && defects.find((d) => d.id === "assembly")!.count} pcs today) started the same week a new mating-parts lot arrived and hit Model D almost exclusively — every shift equally, so workmanship is ruled out. Confidence ${rcAsm.confidence}%: hold the lot and measure incoming parts before releasing more.`,
            th: `สัญญาณด้านวัตถุดิบที่ชัดที่สุด: งานประกอบไม่เข้า (${defects.find((d) => d.id === "assembly")!.count} ชิ้นวันนี้) เริ่มเกิดสัปดาห์เดียวกับที่ล็อตชิ้นส่วนคู่ประกบล็อตใหม่เข้ามา และกระจุกที่ Model D แทบทั้งหมด — ทุกกะเจอเท่ากัน จึงตัดเรื่องฝีมือคนออกได้ ความมั่นใจ ${rcAsm.confidence}%: ควรกักล็อตและวัดขนาดขาเข้าก่อนปล่อยใช้ต่อ`,
          })}</P>
        </Sec>
        <Sec no="02" title={L({ en: "Material-linked defects · today", th: "ดีเฟกต์ที่โยงถึงวัตถุดิบ · วันนี้" })}>
          <Tbl head={[{ en: "Defect", th: "ดีเฟกต์" }, { en: "Pcs", th: "ชิ้น" }, { en: "Material link", th: "ความเชื่อมโยงวัตถุดิบ" }, { en: "Action", th: "ข้อเสนอ" }]} right={[1]} rows={[
            [<B key="1">{L({ en: "Assembly misfit", th: "ประกอบไม่เข้า" })}</B>, `${defects.find((d) => d.id === "assembly")!.count}`, L({ en: "new mating-parts lot, slightly off-size (suspected)", th: "ล็อตชิ้นส่วนคู่ประกบใหม่ ขนาดคลาด (ต้องสงสัย)" }), L({ en: "hold lot + measure incoming", th: "กักล็อต + วัดขาเข้า" })],
            [L({ en: "Contamination", th: "สิ่งปนเปื้อน" }), `${defects.find((d) => d.id === "contam")!.count}`, L({ en: "not material — grinding dust from the next station", th: "ไม่ใช่วัตถุดิบ — ฝุ่นเจียรจากสถานีข้างเคียง" }), L({ en: "excluded from this report", th: "ตัดออกจากรายงานนี้" })],
          ]} />
        </Sec>
        <Sec no="03" title={L({ en: "Coverage note", th: "หมายเหตุขอบเขต" })}>
          <P>{L({
            en: "Today the AI links defects to material by timing (photo time-stamps × lot arrival). Automatic linkage to exact lot numbers and suppliers unlocks when the material-lot scan (WMS/ERP · Phase 2) is connected.",
            th: "ปัจจุบัน AI โยงดีเฟกต์กับวัตถุดิบด้วยช่วงเวลา (เวลาบนภาพ × วันที่ล็อตเข้า) การโยงอัตโนมัติถึงเลขล็อตและซัพพลายเออร์แบบชิ้นต่อชิ้น จะปลดล็อกเมื่อเชื่อมการสแกนล็อตวัตถุดิบ (WMS/ERP · เฟส 2)",
          })}</P>
        </Sec>
      </>);

      case "traceability": return (<>
        <Sec no="01" title={L({ en: "Executive summary · by AI", th: "บทสรุปผู้บริหาร · โดย AI" })}>
          <P>{L({
            en: `Every defect today is traceable: the photo's time-stamp pins the machine window, shift and product model for each piece. All ${defectsToday} defective parts were removed at the gate — ${escapes} escaped, keeping the clean streak at ${daysClean} days.`,
            th: `ดีเฟกต์ทุกชิ้นของวันนี้สอบกลับได้: เวลาบนภาพระบุช่วงเดินเครื่อง กะ และรุ่นของแต่ละชิ้น ของเสียทั้ง ${defectsToday} ชิ้นถูกคัดออกที่ด่านตรวจ — หลุด ${escapes} ชิ้น รักษาสถิติสะอาดต่อเนื่อง ${daysClean} วัน`,
          })}</P>
        </Sec>
        <Sec no="02" title={L({ en: "Trace table · defect → source → disposition", th: "ตารางสอบกลับ · ดีเฟกต์ → ต้นทาง → การจัดการ" })}>
          <Tbl head={[{ en: "Defect", th: "ดีเฟกต์" }, { en: "Pcs", th: "ชิ้น" }, { en: "Source machine", th: "เครื่องต้นทาง" }, { en: "Hot window", th: "ช่วงที่เกิดหนัก" }, { en: "Disposition", th: "การจัดการ" }]} right={[1]}
            rows={top5.map((d) => { const rc = rootCauses.find((r) => r.defectId === d.id); return [<B key="n">{L(d.name)}</B>, `${d.count}`, d.machine, rc ? L(rc.chain[1]).split("—")[0].trim().slice(0, 30) : "—", <span key="s" className="font-semibold text-[#15803d]">{L({ en: "removed at gate", th: "คัดออกครบ" })}</span>]; })} />
        </Sec>
        <Sec no="03" title={L({ en: "Lot to watch", th: "ล็อตที่ต้องจับตา" })}>
          <P><B>EXPORT-4472 · Model B</B> — {L({ en: `dimensional escape risk flagged at 61% while the Press 03 die stays worn (exposure ${thbCompact(rcDim.riskTHB)}). Recommend re-inspecting this lot before loading, or holding it until the die is fixed.`, th: `ถูกตั้งธงเสี่ยงของหลุดเรื่องขนาดที่ 61% ตราบที่ดาย Press 03 ยังสึกอยู่ (มูลค่าเสี่ยง ${thbCompact(rcDim.riskTHB)}) แนะนำตรวจซ้ำก่อนโหลดสินค้า หรือกักไว้จนกว่าจะซ่อมดายเสร็จ` })}</P>
        </Sec>
      </>);

      case "lot-cert": return (<>
        <Sec no="01" title={L({ en: "Lot information", th: "ข้อมูลล็อต" })}>
          <Tbl head={[{ en: "Field", th: "รายการ" }, { en: "Value", th: "ข้อมูล" }]} rows={[
            [L({ en: "Lot number", th: "เลขล็อต" }), <B key="v">EXPORT-4472</B>],
            [L({ en: "Product model", th: "รุ่นสินค้า" }), <B key="v">Model B</B>],
            [L({ en: "Quantity produced", th: "จำนวนผลิต" }), "12,400 " + L({ en: "pcs", th: "ชิ้น" })],
            [L({ en: "Production window", th: "ช่วงการผลิต" }), "05–07/07/2026 · Line B"],
            [L({ en: "Customer", th: "ลูกค้า" }), L({ en: "(fill in before sending)", th: "(กรอกก่อนส่ง)" })],
          ]} />
        </Sec>
        <Sec no="02" title={L({ en: "100% inspection result", th: "ผลการตรวจ 100%" })}>
          <Kpis items={[
            [{ en: "Inspected", th: "ตรวจทั้งหมด" }, "12,400", { en: "pcs · every single piece", th: "ชิ้น · ครบทุกชิ้น" }],
            [{ en: "Defects found", th: "พบดีเฟกต์" }, "84", { en: "6,774 ppm", th: "6,774 ppm" }, "#b45309"],
            [{ en: "Removed", th: "คัดออก" }, "84", { en: "100% of defects found", th: "ครบ 100% ของที่พบ" }, "#15803d"],
            [{ en: "Good parts shipped", th: "ของดีส่งมอบ" }, "12,316", { en: "pcs", th: "ชิ้น" }, "#15803d"],
          ]} />
        </Sec>
        <Sec no="03" title={L({ en: "Inspection standard", th: "มาต°านการตรวจ" })}>
          <Num items={[
            <span key="1">{L({ en: "3× OMRON STC-HD213DV industrial cameras (top / left / right) at 60 fps — every surface seen", th: "กล้องอุตสาหกรรม OMRON STC-HD213DV 3 ตัว (บน / ซ้าย / ขวา) ที่ 60 fps — เห็นครบทุกผิว" })}</span>,
            <span key="2">{L({ en: "AI model accuracy 94–99% per defect class, trained on this plant's own labelled photos", th: "ความแม่นของ AI 94–99% ต่อชนิดดีเฟกต์ สอนด้วยภาพที่ติดป้ายของโรงงานนี้เอง" })}</span>,
            <span key="3">{L({ en: "Disposition per the plant's severity rules (see Settings · Disposition rules)", th: "การคัดเป็นไปตามเกณฑ์ความรุนแรงที่โรงงานกำหนด (ดู ตั้งค่า · กติกาการคัด)" })}</span>,
          ]} />
        </Sec>
        <Sec no="04" title={L({ en: "Certification", th: "คำรับรอง" })}>
          <P>{L({
            en: "We certify that every part in this lot passed 100% AI visual inspection at the Final QC gate, and that all detected defective parts were removed before packing. This document was generated automatically by SpareX FactoryOS™ VisionIQ.",
            th: "ขอรับรองว่าชิ้นงานทุกชิ้นในล็อตนี้ผ่านการตรวจด้วยภาพโดย AI ครบ 100% ณ ด่านตรวจ Final QC และของเสียที่ตรวจพบทั้งหมดถูกคัดออกก่อนการบรรจุ เอกสารนี้ออกโดยอัตโนมัติจากระบบ SpareX FactoryOS™ VisionIQ",
          })}</P>
        </Sec>
      </>);

      case "8d-car": return (<>
        <Sec no="01" title={L({ en: "Case information", th: "ข้อมูลเคส" })}>
          <P>{L({
            en: `Opened from internal detection (no customer has been reached — ${daysClean} clean days). Reference case: dimensional defects from Stamping Press 03. AI pre-filled D1–D5 from its root-cause analysis; D6–D8 require human confirmation.`,
            th: `เปิดเคสจากการตรวจพบภายใน (ยังไม่มีของถึงลูกค้า — สะอาดต่อเนื่อง ${daysClean} วัน) เคสอ้างอิง: ดีเฟกต์เรื่องขนาดจาก Stamping Press 03 · AI เติม D1–D5 จากการวิเคราะห์รากสาเหตุให้แล้ว ส่วน D6–D8 ต้องยืนยันโดยคน`,
          })}</P>
        </Sec>
        <Sec no="02" title={L({ en: "8 Disciplines · AI pre-filled", th: "8 ขั้นตอน · AI เติมให้" })}>
          <Tbl head={[{ en: "Step", th: "ขั้น" }, { en: "Content", th: "รายละเอียด" }, { en: "Status", th: "สถานะ" }]} rows={[
            [<B key="d">D1</B>, L({ en: "Team: QC engineer · maintenance engineer · production leader", th: "ตั้งทีม: วิศวกร QC · วิศวกรซ่อมบำรุง · หัวหน้าผลิต" }), <St key="s" ok />],
            [<B key="d">D2</B>, L({ en: "Problem: parts up to +0.31mm over spec · 128 pcs/day (34% of all defects)", th: "ปัญหา: ชิ้นงานเกินสเปกสูงสุด +0.31mm · 128 ชิ้น/วัน (34% ของดีเฟกต์ทั้งหมด)" }), <St key="s" ok />],
            [<B key="d">D3</B>, L({ en: "Containment: 100% removal at the gate · 45 scrapped pcs quarantined", th: "กักกันชั่วคราว: คัดออก 100% ที่ด่านตรวจ · กัก 45 ชิ้นที่คัดทิ้ง" }), <St key="s" ok />],
            [<B key="d">D4</B>, L({ en: `Root cause: die wear (confidence ${rcDim.confidence}% — linear drift +0.008mm / 1,000 strokes)`, th: `รากสาเหตุ: ดายสึก (มั่นใจ ${rcDim.confidence}% — ไต่เป็นเส้นตรง +0.008mm ต่อ 1,000 ปั๊ม)` }), <St key="s" ok />],
            [<B key="d">D5</B>, L({ en: `Corrective action: regrind & shim the Press 03 die (${thbCompact(rcDim.fix.cost)})`, th: `มาตรการแก้ถาวร: เจียรดาย Press 03 + ปรับชิม (${thbCompact(rcDim.fix.cost)})` }), <St key="s" ok />],
            [<B key="d">D6</B>, L({ en: "Verification: gate re-measures 3 shifts after the fix (automatic)", th: "ยืนยันผล: ด่านตรวจวัดซ้ำ 3 กะหลังซ่อม (อัตโนมัติ)" }), <St key="s" ok={false} />],
            [<B key="d">D7</B>, L({ en: "Prevention: die-change rule every ~9,000 strokes + early-wear alert", th: "ป้องกันซ้ำ: ตั้งเกณฑ์เปลี่ยนดายทุก ~9,000 ปั๊ม + แจ้งเตือนสึกล่วงหน้า" }), <St key="s" ok={false} />],
            [<B key="d">D8</B>, L({ en: "Closure & team recognition: awaiting plant-manager sign-off", th: "ปิดเคสและชื่นชมทีม: รอผู้จัดการโรงงานลงนาม" }), <St key="s" ok={false} />],
          ]} />
        </Sec>
      </>);

      default: return (<>
        <Sec no="01" title={L({ en: "Executive summary · by AI", th: "บทสรุปผู้บริหาร · โดย AI" })}>
          <P>{L({
            en: `Analysis of today's ${inspectedToday.toLocaleString()} inspected parts indicates overall quality within limits (FPY ${fpy}%), with one signal that needs action fast: dimensional defects from Stamping Press 03 are climbing with die wear and now account for 34% of all defects, and night shift B runs a defect rate 2.1× the morning shift. Today's loss totals ${thbCompact(copq.today)}. If the root cause is not fixed, accumulated risk reaches ฿1.9M. Key recommendation: regrind the Press 03 die (฿85K) within 18 hours — 22× cheaper than letting it run.`,
            th: `การวิเคราะห์ภาพถ่ายชิ้นงาน ${inspectedToday.toLocaleString()} ชิ้นของวันนี้ชี้ว่า คุณภาพโดยรวมยังอยู่ในเกณฑ์ (FPY ${fpy}%) แต่มีสัญญาณหนึ่งที่ต้องจัดการเร็ว: ดีเฟกต์เรื่องขนาดจาก Stamping Press 03 กำลังไต่ขึ้นตามการสึกของดาย คิดเป็น 34% ของของเสียทั้งหมด และกะดึก B มีอัตราของเสียสูงเป็น 2.1 เท่าของกะเช้า ความเสียหายวันนี้รวม ${thbCompact(copq.today)} หากไม่แก้ที่ต้นตอ ความเสี่ยงสะสมจะถึง ฿1.9M ข้อเสนอหลัก: เจียรดาย Press 03 (฿85K) ภายใน 18 ชั่วโมง — ถูกกว่าปล่อยไว้ 22 เท่า`,
          })}</P>
        </Sec>
        <Sec no="02" title={L({ en: "Today's key numbers", th: "ตัวเลขหลักวันนี้" })}>
          <Kpis items={[
            [{ en: "Inspected", th: "ตรวจทั้งหมด" }, inspectedToday.toLocaleString(), { en: "pcs · 100% of output", th: "ชิ้น · ครบ 100% ของยอดผลิต" }],
            [{ en: "Defects caught", th: "ของเสียที่จับได้" }, defectsToday.toLocaleString(), { en: `pcs · ${defectRatePpm.toLocaleString()} ppm`, th: `ชิ้น · ${defectRatePpm.toLocaleString()} ppm` }, "#b91c1c"],
            [{ en: "Scrap · rework", th: "คัดทิ้ง · ส่งแก้" }, `${totalScrap} · ${totalRework}`, { en: "per disposition rules", th: "ตามกติกาการคัด" }],
            [{ en: "Money lost", th: "เงินที่เสีย" }, thbCompact(copq.today), { en: `${invisiblePct}% invisible to accounting`, th: `${invisiblePct}% มองไม่เห็นในบัญชี` }, "#b91c1c"],
          ]} />
        </Sec>
        <Sec no="03" title={L({ en: "Top 5 defects · traced to source", th: "ดีเฟกต์ 5 อันดับ · โยงถึงต้นทาง" })}>
          <Tbl head={[{ en: "Defect", th: "ดีเฟกต์" }, { en: "Caught", th: "จับได้" }, { en: "Scrap", th: "ทิ้ง" }, { en: "Rework", th: "แก้" }, { en: "Money lost", th: "เงินที่เสีย" }, { en: "Source machine", th: "เครื่องต้นทาง" }]} right={[1, 2, 3, 4]}
            rows={top5.map((d) => [<B key="n">{L(d.name)}</B>, `${d.count}`, <span key="s" className="text-[#b91c1c]">{scrapUnits(d)}</span>, `${reworkUnits(d)}`, <span key="m" className="font-semibold">{thbCompact(defectCost(d))}</span>, <span key="mc" className="text-[#64748b]">{d.machine}</span>])} />
        </Sec>
        <Sec no="04" title={L({ en: "Recommended actions · ranked by AI", th: "สิ่งที่ควรทำต่อ · เรียงโดย AI" })}>
          <ol className="space-y-1.5">
            {topActs.map((a, i) => (
              <li key={a.id} className="flex items-start gap-2 text-[11px] text-[#334155]">
                <span className="tabular mt-px shrink-0 font-bold text-[#0e7490]">{i + 1}.</span>
                <span className="min-w-0">
                  <span className={cn("mr-1.5 rounded px-1 py-px text-[8.5px] font-bold", a.priority === "P1" ? "bg-[#fee2e2] text-[#b91c1c]" : "bg-[#fef3c7] text-[#b45309]")}>{a.priority}</span>
                  <span className="font-medium text-[#0f172a]">{L(a.title)}</span>
                  <span className="text-[#64748b]"> — {L({ en: "expected defect reduction", th: "คาดว่าลดดีเฟกต์" })} {a.reduction}%</span>
                </span>
              </li>
            ))}
          </ol>
        </Sec>
      </>);
    }
  })();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.25 }} className="flex max-h-[92vh] w-full max-w-[760px] flex-col" onClick={(e) => e.stopPropagation()}>
        {/* viewer toolbar */}
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-white/15 bg-[#0b1220]/95 px-3 py-2">
          <FileText size={14} style={{ color: "rgba(255,255,255,0.6)" }} />
          <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: "rgba(255,255,255,0.85)" }}>{fname}</span>
          <span className="hidden text-[10.5px] sm:block" style={{ color: "rgba(255,255,255,0.4)" }}>PDF · {L({ en: "print-sharp", th: "คมชัดระดับพิมพ์" })}</span>
          <button onClick={download} disabled={dl === "busy"} className="btn-glow whitespace-nowrap px-2.5 py-1 text-[11px]">
            {dl === "busy" ? <><RefreshCw size={12} className="animate-spin" /> {L({ en: "generating…", th: "กำลังสร้าง…" })}</>
              : dl === "done" ? <><Check size={12} /> {L({ en: "downloaded", th: "ดาวน์โหลดแล้ว" })}</>
              : <><Download size={12} /> {L({ en: "Download PDF", th: "ดาวน์โหลด PDF" })}</>}
          </button>
          <button onClick={onClose} title={L({ en: "close", th: "ปิด" })} className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/20 transition hover:bg-white/10" style={{ color: "rgba(255,255,255,0.7)" }}><X size={13} /></button>
        </div>

        {/* the paper */}
        <div className="overflow-y-auto rounded-lg shadow-2xl">
          <div ref={paperRef} className="relative overflow-hidden bg-white" style={{ fontFeatureSettings: '"tnum"' }}>
            {/* watermark */}
            <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-28deg] select-none whitespace-nowrap text-[92px] font-black" style={{ color: "rgba(15,23,42,0.035)" }}>SPAREX</p>

            {/* header band */}
            <div className="flex items-start justify-between px-8 py-5" style={{ backgroundColor: "#0b1220" }}>
              <div>
                <p className="text-[15px] font-bold tracking-wide" style={{ color: "#ffffff" }}>SpareX <span style={{ color: "#22d3ee" }}>FactoryOS™</span></p>
                <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.24em]" style={{ color: "rgba(255,255,255,0.5)" }}>VisionIQ · AI Vision Intelligence</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.45)" }}>{L({ en: "Document no.", th: "เลขที่เอกสาร" })}</p>
                <p className="tabular text-[12px] font-semibold" style={{ color: "#ffffff" }}>VIS-RPT-2026-0707-001</p>
                <p className="mt-1 text-[9.5px]" style={{ color: "rgba(255,255,255,0.45)" }}>07/07/2026 · 17:00 · {L({ en: "Bangkok Plant 1", th: "โรงงานกรุงเทพ 1" })}</p>
              </div>
            </div>
            {/* hazard accent */}
            <div style={{ height: 6, background: "repeating-linear-gradient(45deg,#f59e0b 0 10px,#0b1220 10px 20px)" }} />

            {/* title block */}
            <div className="px-8 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-[21px] font-bold leading-tight text-[#0f172a]">{L(t.name)}</h1>
                  <p className="mt-0.5 text-[11px] text-[#64748b]">{t.name.en} · {L(t.desc)}</p>
                </div>
                <div className="shrink-0 rotate-[-4deg] rounded border-2 border-[#0e7490] px-3 py-1 text-center">
                  <p className="text-[8.5px] font-bold uppercase tracking-[0.2em] text-[#0e7490]">AI Verified</p>
                  <p className="tabular text-[12px] font-bold text-[#0e7490]">{L({ en: "confidence 82%", th: "มั่นใจ 82%" })}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded border border-[#e2e8f0] bg-[#e2e8f0]">
                {([
                  [{ en: "Data period", th: "ช่วงข้อมูล" }, { en: "07/07/2026 · all shifts", th: "07/07/2026 · ทุกกะ" }],
                  [{ en: "Production lines", th: "ไลน์ผลิต" }, { en: "Line A · B · C", th: "Line A · B · C" }],
                  [{ en: "Prepared by", th: "ผู้จัดทำ" }, { en: "VisionIQ AI · automatic", th: "VisionIQ AI · อัตโนมัติ" }],
                ] as [LZ, LZ][]).map(([k, v]) => (
                  <div key={k.en} className="bg-white px-3 py-2"><p className="text-[8.5px] uppercase tracking-wider text-[#94a3b8]">{L(k)}</p><p className="text-[11px] font-medium text-[#0f172a]">{L(v)}</p></div>
                ))}
              </div>
            </div>

            {/* body — template-specific storyline */}
            {body}

            {/* signatures */}
            <div className="grid grid-cols-3 gap-6 px-8 pt-8">
              {([
                { en: "Prepared · VisionIQ AI (auto)", th: "ผู้จัดทำ · VisionIQ AI (อัตโนมัติ)" },
                { en: "Reviewed · QC supervisor", th: "ผู้ตรวจ · หัวหน้า QC" },
                { en: "Approved · Plant manager", th: "ผู้อนุมัติ · ผู้จัดการโรงงาน" },
              ] as LZ[]).map((s) => (
                <div key={s.en} className="pt-6 text-center">
                  <div className="mx-auto h-px w-full max-w-[150px] bg-[#94a3b8]" />
                  <p className="mt-1 text-[9px] text-[#64748b]">{L(s)}</p>
                </div>
              ))}
            </div>

            {/* footer */}
            <div className="mt-6 flex items-center justify-between border-t border-[#e2e8f0] px-8 py-3">
              <p className="text-[8.5px] text-[#94a3b8]">{L({ en: "Generated by SpareX FactoryOS™ · VisionIQ AI — data from 3× OMRON STC-HD213DV at the Final QC gate", th: "สร้างโดย SpareX FactoryOS™ · VisionIQ AI — ข้อมูลจากกล้อง OMRON STC-HD213DV 3 ตัว ณ ด่านตรวจ Final QC" })}</p>
              <p className="tabular shrink-0 text-[8.5px] text-[#94a3b8]">{L({ en: "page 1 / 1 · internal use", th: "หน้า 1 / 1 · ใช้ภายใน" })}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReportView({ L }: { L: Tr }) {
  const sov = useScheduleOverrides();
  const recips = useRecipients();
  // generation-time options — not settings, so plain component state is enough
  const [fmt, setFmt] = useState<Record<string, "pdf" | "xls">>({});
  const [lang, setLang] = useState<Record<string, "th" | "en">>({});
  const SCHEDS: { id: ReportSchedule; label: LZ }[] = [
    { id: "off", label: { en: "off", th: "ปิด" } },
    { id: "daily", label: { en: "end of day", th: "ทุกท้ายวัน" } },
    { id: "weekly", label: { en: "end of week", th: "ทุกท้ายสัปดาห์" } },
    { id: "monthly", label: { en: "end of month", th: "ทุกสิ้นเดือน" } },
  ];
  const groupIcon = (en: string) => (en === "Operations" ? Activity : en === "Executive" ? Building2 : en === "Engineering" ? Cpu : Package);
  const groups = reportTemplates.reduce<{ group: LZ; items: typeof reportTemplates }[]>((acc, t) => {
    const g = acc.find((x) => x.group.en === t.group.en);
    if (g) g.items.push(t); else acc.push({ group: t.group, items: [t] });
    return acc;
  }, []);
  const Seg = ({ opts, val, onPick }: { opts: { id: string; label: string }[]; val: string; onPick: (id: string) => void }) => (
    <div className="flex w-fit items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
      {opts.map((o) => <button key={o.id} onClick={() => onPick(o.id)} className={cn("whitespace-nowrap rounded-md px-2 py-1 text-[10.5px] font-medium transition", val === o.id ? "bg-white/10 text-white/90" : "text-white/40 hover:text-white/65")}>{o.label}</button>)}
    </div>
  );
  const selCls = "rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[11.5px] text-white focus:border-brand-400/40 focus:outline-none";
  const [grp, setGrp] = useState<string>("all");
  const [preview, setPreview] = useState<ReportTemplate | null>(null);
  const shown = grp === "all" ? groups : groups.filter((g) => g.group.en === grp);
  const chipCls = (on: boolean) => cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-medium transition", on ? "border-brand-400/50 bg-brand-400/10 text-brand-200" : "border-white/10 bg-white/[0.02] text-white/50 hover:text-white/75");
  return (
    <div className="space-y-6">
      <Panel title={L({ en: "Generate a Report", th: "ออกรายงาน" })} sub={L({ en: "every report opens with a 1-page AI executive summary · auto-delivery goes to the Email/LINE recipients set in Settings", th: "ทุกฉบับขึ้นต้นด้วยบทสรุปผู้บริหารที่ AI เขียนให้ 1 หน้า · การส่งอัตโนมัติจะเข้า Email/LINE ตามรายชื่อในแท็บตั้งค่า" })}>
        {/* group chips — pick who the report is for */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <button onClick={() => setGrp("all")} className={chipCls(grp === "all")}>{L({ en: "All", th: "ทั้งหมด" })} <span className="rounded bg-white/10 px-1 text-[10px] tabular">{reportTemplates.length}</span></button>
          {groups.map((g) => { const GIcon = groupIcon(g.group.en); return (
            <button key={g.group.en} onClick={() => setGrp(g.group.en)} className={chipCls(grp === g.group.en)}><GIcon size={12} /> {L(g.group)} <span className="rounded bg-white/10 px-1 text-[10px] tabular">{g.items.length}</span></button>
          ); })}
        </div>
        <motion.div key={grp} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
              <th className="px-2 py-2.5 font-medium">{L({ en: "Report", th: "รายงาน" })}</th>
              <th className="px-2 py-2.5 font-medium whitespace-nowrap">{L({ en: "For", th: "สำหรับ" })}</th>
              <th className="px-2 py-2.5 font-medium whitespace-nowrap">{L({ en: "Data period", th: "ช่วงข้อมูล" })}</th>
              <th className="px-2 py-2.5 font-medium whitespace-nowrap">{L({ en: "Format · language", th: "รูปแบบ · ภาษา" })}</th>
              <th className="px-2 py-2.5 font-medium whitespace-nowrap">{L({ en: "Auto-send", th: "ส่งอัตโนมัติ" })}</th>
              <th className="px-2 py-2.5" />
            </tr></thead>
            <tbody>
              {shown.map((g) => { const GIcon = groupIcon(g.group.en); return [
                ...(grp === "all" ? [
                  <tr key={`h-${g.group.en}`}><td colSpan={6} className="px-2 pb-1.5 pt-4">
                    <span className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-md bg-white/[0.06] text-brand-300"><GIcon size={11} /></span><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">{L(g.group)}</span><span className="h-px flex-1 bg-white/8" /></span>
                  </td></tr>,
                ] : []),
                ...g.items.map((t) => { const sched = sov[t.id] ?? t.schedule; return (
                  <tr key={t.id} className="border-t border-white/5 align-top">
                    <td className="px-2 py-2.5">
                      <p className="whitespace-nowrap text-[13px] font-medium text-white/90">{L(t.name)}</p>
                      <p className="max-w-[260px] text-[11px] leading-snug text-white/45">{L(t.desc)}</p>
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap text-[11.5px] text-white/60">{L(t.audience)}</td>
                    <td className="px-2 py-2.5">
                      <select defaultValue={t.id === "daily-shift" ? "today" : t.schedule === "monthly" ? "month" : "week"} className={selCls}>
                        <option value="today">{L({ en: "today", th: "วันนี้" })}</option>
                        <option value="week">{L({ en: "last 7 days", th: "7 วันล่าสุด" })}</option>
                        <option value="month">{L({ en: "this month", th: "เดือนนี้" })}</option>
                      </select>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Seg opts={[{ id: "pdf", label: "PDF" }, { id: "xls", label: "Excel" }]} val={fmt[t.id] ?? "pdf"} onPick={(id) => setFmt((m) => ({ ...m, [t.id]: id as "pdf" | "xls" }))} />
                        <Seg opts={[{ id: "th", label: "ไทย" }, { id: "en", label: "EN" }]} val={lang[t.id] ?? "th"} onPick={(id) => setLang((m) => ({ ...m, [t.id]: id as "th" | "en" }))} />
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <select value={sched} onChange={(e) => setReportSchedule(t.id, e.target.value as ReportSchedule)} className={cn(selCls, sched !== "off" && "border-brand-400/30 text-brand-200")}>
                        {SCHEDS.map((s) => <option key={s.id} value={s.id}>{L(s.label)}</option>)}
                      </select>
                      {sched !== "off" ? <p className="mt-1 whitespace-nowrap text-[10px] text-white/40">→ Email/LINE · {L({ en: "recipients", th: "ผู้รับ" })} {recips.length} {L({ en: "people", th: "คน" })}</p> : null}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <button onClick={() => setPreview(t)} className="btn-glow whitespace-nowrap px-3 py-1.5 text-[11.5px]"><Download size={12} /> {L({ en: "Generate", th: "ออกรายงาน" })}</button>
                    </td>
                  </tr>
                ); }),
              ]; })}
            </tbody>
          </table>
        </motion.div>
      </Panel>

      {preview ? <PdfPreview t={preview} L={L} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}

/* ══════════════════════════ tab · SETTINGS ══════════════════════════ */
/** Notification settings — who hears about what, over email and LINE */
function NotifySettings({ L }: { L: Tr }) {
  const recips = useRecipients();
  const rov = useRuleOverrides();
  const [tested, setTested] = useState<string | null>(null);
  const alarmed = defects.filter((d) => ruleFor(d.id, rov).alarm);
  const reachable = (r: Recipient) => (r.viaEmail && r.email.trim() !== "") || (r.viaLine && r.lineId.trim() !== "");
  const test = (id: string) => { setTested(id); setTimeout(() => setTested((v) => (v === id ? null : v)), 2200); };
  const field = "rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[12px] text-white placeholder:text-white/25 focus:border-brand-400/40 focus:outline-none";
  return (
    <Panel title={L({ en: "Notify the Right People", th: "แจ้งเตือนผู้เกี่ยวข้อง" })} sub={L({ en: "Email + LINE · who hears about what — sent automatically the moment it happens", th: "Email + LINE · ใครควรรู้เรื่องไหน — ระบบส่งให้เองทันทีที่เกิดเหตุการณ์" })} extra={<div className="flex items-center gap-2"><span className="flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/[0.08] px-2 py-0.5 text-[10px] font-medium text-emerald-300"><Check size={11} /> {L({ en: "saves instantly", th: "บันทึกทันที" })}</span><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-400/12 text-brand-300"><Bell size={16} /></span></div>}>
      {/* ties the scrap event to the alarm flags set in the rules above */}
      <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-500/[0.05] px-3 py-2">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: "var(--c-amber-strong)" }} />
        <p className="text-[11px] leading-relaxed text-white/60">
          {L({ en: "The “Scrap found” event fires only for defects with “alert on scrap” turned on above — currently on:", th: "เหตุการณ์ “คัดออก (Scrap)” จะส่งเฉพาะดีเฟกต์ที่เปิดธง “แจ้งเตือนเมื่อคัดออก” ไว้ด้านบน — ตอนนี้เปิดอยู่:" })}{" "}
          <span className="font-semibold text-white/85">{alarmed.length ? alarmed.map((d) => L(d.name)).join(" · ") : L({ en: "none yet", th: "ยังไม่มี" })}</span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
            <th className="px-2 py-2.5 font-medium">{L({ en: "Recipient", th: "ผู้รับ" })}</th>
            <th className="px-2 py-2.5 font-medium">Email</th>
            <th className="px-2 py-2.5 font-medium">LINE</th>
            <th className="px-2 py-2.5 font-medium">{L({ en: "Send when", th: "ส่งเมื่อ" })}</th>
            <th className="px-2 py-2.5" />
          </tr></thead>
          <tbody>
            {recips.map((r) => (
              <tr key={r.id} className="border-t border-white/5 align-top">
                <td className="px-2 py-2.5">
                  <input value={r.name} onChange={(e) => updateRecipient(r.id, { name: e.target.value })} placeholder={L({ en: "Name", th: "ชื่อ" })} className={cn(field, "w-36 font-medium")} />
                  <input value={r.role} onChange={(e) => updateRecipient(r.id, { role: e.target.value })} placeholder={L({ en: "Role", th: "ตำแหน่ง" })} className={cn(field, "mt-1.5 w-36 text-[11px]")} />
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <button title={L({ en: "turn this channel on/off", th: "เปิด/ปิดช่องทางนี้" })} onClick={() => updateRecipient(r.id, { viaEmail: !r.viaEmail })} className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md border transition", r.viaEmail ? "border-brand-400/40 bg-brand-400/10 text-brand-200" : "border-white/10 bg-white/[0.02] text-white/30 hover:text-white/60")}><Mail size={13} /></button>
                    <input type="email" value={r.email} disabled={!r.viaEmail} onChange={(e) => updateRecipient(r.id, { email: e.target.value })} placeholder="name@company.co.th" className={cn(field, "w-48", !r.viaEmail && "opacity-40")} />
                  </div>
                  {r.viaEmail && !r.email.trim() ? <p className="mt-1 text-[10px]" style={{ color: "var(--c-amber-strong)" }}>{L({ en: "on, but no address yet — won't deliver", th: "เปิดไว้แต่ยังไม่กรอก — ยังส่งไม่ถึง" })}</p> : null}
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <button title={L({ en: "turn this channel on/off", th: "เปิด/ปิดช่องทางนี้" })} onClick={() => updateRecipient(r.id, { viaLine: !r.viaLine })} className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md border transition", r.viaLine ? "border-emerald-400/45 bg-emerald-500/10" : "border-white/10 bg-white/[0.02] text-white/30 hover:text-white/60")} style={r.viaLine ? { color: "var(--c-emerald)" } : undefined}><MessageCircle size={13} /></button>
                    <input value={r.lineId} disabled={!r.viaLine} onChange={(e) => updateRecipient(r.id, { lineId: e.target.value })} placeholder={L({ en: "LINE ID", th: "LINE ID" })} className={cn(field, "w-32", !r.viaLine && "opacity-40")} />
                  </div>
                  {r.viaLine && !r.lineId.trim() ? <p className="mt-1 text-[10px]" style={{ color: "var(--c-amber-strong)" }}>{L({ en: "on, but no ID yet — won't deliver", th: "เปิดไว้แต่ยังไม่กรอก — ยังส่งไม่ถึง" })}</p> : null}
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex max-w-[340px] flex-wrap gap-1.5">
                    {NOTIFY_EVENTS.map((ev) => { const on = r.events.includes(ev.id); return (
                      <button key={ev.id} title={L(ev.desc)} onClick={() => toggleRecipientEvent(r.id, ev.id)} className={cn("whitespace-nowrap rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition", on ? "border-brand-400/40 bg-brand-400/10 text-brand-200" : "border-white/10 bg-white/[0.02] text-white/40 hover:text-white/65")}>{L(ev.name)}</button>
                    ); })}
                  </div>
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <button onClick={() => test(r.id)} disabled={!reachable(r)} className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition", tested === r.id ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" : reachable(r) ? "border-white/12 bg-white/[0.03] text-white/60 hover:text-white/85" : "cursor-not-allowed border-white/8 text-white/25")}>
                      {tested === r.id ? <><Check size={12} /> {L({ en: "sent", th: "ส่งแล้ว" })}</> : <><Send size={12} /> {L({ en: "test send", th: "ทดสอบส่ง" })}</>}
                    </button>
                    <button title={L({ en: "remove", th: "ลบออก" })} onClick={() => removeRecipient(r.id)} className="grid h-7 w-7 place-items-center rounded-md border border-white/10 text-white/40 transition hover:border-rose-400/30 hover:text-rose-300"><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={addRecipient} className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-white/15 px-3 py-2 text-[12px] font-medium text-white/55 transition hover:border-brand-400/40 hover:text-brand-200"><Plus size={13} /> {L({ en: "Add a recipient", th: "เพิ่มผู้รับแจ้งเตือน" })}</button>

      <p className="mt-3 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2 text-[11px] leading-relaxed text-white/50">
        {L({ en: "Real delivery connects to the plant's email (SMTP) and a LINE Official Account — in this demo the list is saved on this device and the test button simulates a send.", th: "การส่งจริงจะเชื่อมกับอีเมลของโรงงาน (SMTP) และ LINE Official Account — ในเดโมนี้รายชื่อถูกบันทึกไว้ในเครื่อง และปุ่มทดสอบเป็นการจำลองการส่ง" })}
      </p>
    </Panel>
  );
}

function SettingsView({ L }: { L: Tr }) {
  const rov = useRuleOverrides();
  const cov = useCostOverrides();
  // edits are held as a draft and only written to storage on Save — so a typed
  // number is visibly "unsaved" until the user commits it (no silent auto-save)
  const [dRules, setDRules] = useState<Record<string, Partial<DispositionRule>>>({});
  const [dCost, setDCost] = useState<Record<string, Partial<CostParams>>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  const effRule = (id: string): DispositionRule => ({ ...ruleFor(id, rov), ...(dRules[id] ?? {}) });
  const effCost = (id: string): CostParams => ({ ...paramsFor(id, cov), ...(dCost[id] ?? {}) });
  const editRule = (id: string, patch: Partial<DispositionRule>) => setDRules((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
  const editCost = (id: string, patch: Partial<CostParams>) => setDCost((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const RULE_KEYS: (keyof DispositionRule)[] = ["reworkable", "scrapAbove", "alarm"];
  const COST_KEYS: (keyof CostParams)[] = ["unitCost", "reworkCost", "fixCost", "riskTHB"];
  const ruleUnsaved = (id: string) => { const e = effRule(id), c = ruleFor(id, rov); return RULE_KEYS.some((k) => e[k] !== c[k]); };
  const costUnsaved = (id: string) => { const e = effCost(id), c = paramsFor(id, cov); return COST_KEYS.some((k) => e[k] !== c[k]); };
  const dirtyCount = defects.filter((d) => ruleUnsaved(d.id)).length + defects.filter((d) => costUnsaved(d.id)).length;

  const dropDraft = <T,>(set: React.Dispatch<React.SetStateAction<Record<string, T>>>, id: string) => set((p) => { const n = { ...p }; delete n[id]; return n; });
  const save = () => {
    defects.forEach((d) => { if (ruleUnsaved(d.id)) setRule(d.id, effRule(d.id)); });
    defects.forEach((d) => { if (costUnsaved(d.id)) setCostParam(d.id, effCost(d.id)); });
    setDRules({}); setDCost({});
    setSavedAt(new Date().toTimeString().slice(0, 8));
    setFlash(true); setTimeout(() => setFlash(false), 2400);
  };
  const discard = () => { setDRules({}); setDCost({}); };

  const Toggle = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className={cn("whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition", on ? "bg-white/10 text-white/90" : "text-white/40 hover:text-white/65")}>{children}</button>
  );
  // amber dot: pulsing = unsaved draft · solid = a saved custom value · none = default
  const EditDot = ({ unsaved, overridden }: { unsaved: boolean; overridden: boolean }) => {
    if (unsaved) return <span title={L({ en: "unsaved", th: "ยังไม่บันทึก" })} className="relative flex h-1.5 w-1.5 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ backgroundColor: "var(--c-amber-strong)" }} /><span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--c-amber-strong)" }} /></span>;
    if (overridden) return <span title={L({ en: "custom value", th: "ค่าที่กรอกเอง" })} className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: "var(--c-amber-strong)" }} />;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-xl border border-brand-400/20 bg-brand-400/[0.05] px-4 py-2.5"><Settings2 size={16} className="shrink-0 text-brand-300" /><p className="text-[12px] font-medium text-brand-200">{L({ en: "These rules are what the gate follows automatically on every part. Edit the values below, then press Save — everything is stored on this device until MES/ERP is connected.", th: "กติกาที่ตั้งตรงนี้คือสิ่งที่ด่านตรวจใช้ตัดสินอัตโนมัติกับทุกชิ้น แก้ค่าด้านล่างแล้วกด บันทึก — ระบบเก็บไว้ในเครื่องนี้ จนกว่าจะเชื่อม MES/ERP" })}</p></div>

      {/* disposition rules — found a defect: scrap or rework? */}
      <Panel title={L({ en: "Disposition Rules", th: "กติกาการคัด" })} sub={L({ en: "Scrap or Rework · what the gate should do per defect type, by the severity the camera measures", th: "Scrap หรือ Rework · เจอดีเฟกต์แล้วให้ด่านทำอะไร — ตามชนิดและความรุนแรงที่กล้องวัดได้" })}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
              <th className="px-2 py-2.5 font-medium">{L({ en: "Defect", th: "ดีเฟกต์" })}</th>
              <th className="px-2 py-2.5 font-medium whitespace-nowrap">{L({ en: "Today scrap · rework", th: "วันนี้ ทิ้ง · แก้" })}</th>
              <th className="px-2 py-2.5 font-medium">{L({ en: "Disposition", th: "การคัด" })}</th>
              <th className="px-2 py-2.5 font-medium whitespace-nowrap">{L({ en: "Scrap when over — at/below = rework", th: "คัดออกเมื่อเกิน — ไม่เกิน = ส่งแก้" })}</th>
              <th className="px-2 py-2.5 font-medium whitespace-nowrap">{L({ en: "Alert on scrap", th: "แจ้งเตือนเมื่อคัดออก" })}</th>
              <th className="px-2 py-2.5" />
            </tr></thead>
            <tbody>
              {defects.map((d) => {
                const meta = ruleMetaFor(d.id);
                const r = effRule(d.id);
                const overridden = Object.keys(rov[d.id] ?? {}).length > 0;
                const unsaved = ruleUnsaved(d.id);
                return (
                  <tr key={d.id} className={cn("border-t border-white/5", unsaved && "bg-amber-500/[0.04]")}>
                    <td className="px-2 py-2"><span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-white/85"><EditDot unsaved={unsaved} overridden={overridden} />{L(d.name)}</span></td>
                    <td className="px-2 py-2 whitespace-nowrap"><span className="tabular text-[12px]"><span className="font-semibold" style={{ color: "var(--c-rose)" }}>{scrapUnits(d)}</span><span className="text-white/35"> · </span><span className="font-semibold text-emerald-300">{reworkUnits(d)}</span></span></td>
                    <td className="px-2 py-2"><div className="flex w-fit items-center gap-0.5 whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
                      <Toggle on={r.reworkable} onClick={() => editRule(d.id, { reworkable: true })}>{L({ en: "Reworkable", th: "ซ่อมได้" })}</Toggle>
                      <Toggle on={!r.reworkable} onClick={() => editRule(d.id, { reworkable: false })}>{L({ en: "Always scrap", th: "คัดออกเสมอ" })}</Toggle>
                    </div></td>
                    <td className="px-2 py-2">
                      {r.reworkable ? (
                        <span className="flex items-center gap-1.5 whitespace-nowrap text-[12px] text-white/65">
                          <span className="font-medium text-white/85">{L(meta.metric)}</span> {L({ en: "over", th: "เกิน" })}
                          <input type="number" min={0} step={meta.step} value={r.scrapAbove} onChange={(e) => editRule(d.id, { scrapAbove: Math.max(0, Number(e.target.value) || 0) })} className="w-20 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-center text-[12px] tabular text-white focus:border-brand-400/40 focus:outline-none" />
                          {meta.unit}
                        </span>
                      ) : (
                        <span className="whitespace-nowrap text-[12px] font-medium" style={{ color: "var(--c-rose)" }}>{L({ en: "any hit → scrap immediately", th: "เจอเมื่อไหร่ → คัดออกทันที" })}</span>
                      )}
                    </td>
                    <td className="px-2 py-2"><button onClick={() => editRule(d.id, { alarm: !r.alarm })} className={cn("flex items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-medium transition", r.alarm ? "border-amber-400/40 bg-amber-500/10 text-amber-300" : "border-white/10 bg-white/[0.02] text-white/40 hover:text-white/65")}><AlertTriangle size={11} /> {r.alarm ? L({ en: "on", th: "เปิด" }) : L({ en: "off", th: "ปิด" })}</button></td>
                    <td className="px-2 py-2 text-right">{overridden ? <button onClick={() => { resetRule(d.id); dropDraft(setDRules, d.id); }} className="btn-ghost px-2 py-1 text-[11px]"><RotateCcw size={11} /> {L({ en: "reset", th: "คืนค่า" })}</button> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* cost assumptions — same store the Analyze tab reads */}
      <Panel title={L({ en: "Cost per Defect", th: "ต้นทุนต่อดีเฟกต์" })} sub={L({ en: "drives every ฿ figure on the Analyze tab · editable until ERP is connected", th: "ใช้คำนวณเงินทุกตัวในหน้าวิเคราะห์ · แก้ได้จนกว่าจะเชื่อม ERP" })}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
              <th className="px-2 py-2.5 font-medium">{L({ en: "Defect", th: "ดีเฟกต์" })}</th>
              <th className="px-2 py-2.5 font-medium">{L({ en: "Scrap ฿/pc", th: "ทิ้ง ฿/ชิ้น" })}</th>
              <th className="px-2 py-2.5 font-medium">{L({ en: "Rework ฿/pc", th: "แก้ ฿/ชิ้น" })}</th>
              <th className="px-2 py-2.5 font-medium">{L({ en: "Fix source ฿", th: "ซ่อมต้นตอ ฿" })}</th>
              <th className="px-2 py-2.5 font-medium">{L({ en: "Risk ฿", th: "เสี่ยง ฿" })}</th>
              <th className="px-2 py-2.5" />
            </tr></thead>
            <tbody>
              {defects.map((d) => {
                const p = effCost(d.id);
                const overridden = Object.keys(cov[d.id] ?? {}).length > 0;
                const unsaved = costUnsaved(d.id);
                const cell = (k: keyof CostParams, w = "w-24") => (
                  <input type="number" min={0} value={p[k]} onChange={(e) => editCost(d.id, { [k]: Math.max(0, Number(e.target.value) || 0) })} className={cn(w, "rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[12px] tabular text-white focus:border-brand-400/40 focus:outline-none")} />
                );
                return (
                  <tr key={d.id} className={cn("border-t border-white/5", unsaved && "bg-amber-500/[0.04]")}>
                    <td className="px-2 py-2"><span className="flex items-center gap-1.5 text-[13px] font-medium text-white/85"><EditDot unsaved={unsaved} overridden={overridden} />{L(d.name)}</span></td>
                    <td className="px-2 py-2">{cell("unitCost")}</td>
                    <td className="px-2 py-2">{cell("reworkCost")}</td>
                    <td className="px-2 py-2">{cell("fixCost", "w-28")}</td>
                    <td className="px-2 py-2">{cell("riskTHB", "w-32")}</td>
                    <td className="px-2 py-2 text-right">{overridden ? <button onClick={() => { resetCostParams(d.id); dropDraft(setDCost, d.id); }} className="btn-ghost px-2 py-1 text-[11px]"><RotateCcw size={11} /> {L({ en: "reset", th: "คืนค่า" })}</button> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* sticky save bar — governs both tables above */}
      <div className="sticky bottom-3 z-20">
        <div className={cn("flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 shadow-lg backdrop-blur transition", dirtyCount > 0 ? "border-amber-400/40 bg-amber-500/[0.12]" : flash ? "border-emerald-400/40 bg-emerald-500/[0.12]" : "border-white/10 bg-ink-950/85")}>
          <div className="flex min-w-0 items-center gap-2 text-[12.5px]">
            {dirtyCount > 0 ? (
              <>
                <span className="relative flex h-2 w-2 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ backgroundColor: "var(--c-amber-strong)" }} /><span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: "var(--c-amber-strong)" }} /></span>
                <span className="truncate font-medium" style={{ color: "var(--c-amber-strong)" }}>{L({ en: `${dirtyCount} unsaved change${dirtyCount > 1 ? "s" : ""} — press Save to apply`, th: `ยังไม่บันทึก ${dirtyCount} รายการ — กดบันทึกเพื่อใช้งาน` })}</span>
              </>
            ) : flash || savedAt ? (
              <><Check size={15} className="shrink-0 text-emerald-300" /><span className="truncate font-medium text-emerald-300">{L({ en: "All changes saved", th: "บันทึกครบแล้ว" })}</span>{savedAt ? <span className="shrink-0 text-white/40">· {savedAt}</span> : null}</>
            ) : (
              <><Check size={15} className="shrink-0 text-white/30" /><span className="truncate text-white/45">{L({ en: "No changes to save", th: "ยังไม่มีการเปลี่ยนแปลง" })}</span></>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={discard} disabled={!dirtyCount} className={cn("rounded-lg px-3 py-1.5 text-[12px] font-medium transition", dirtyCount ? "text-white/60 hover:bg-white/5 hover:text-white/85" : "cursor-not-allowed text-white/25")}>{L({ en: "Discard", th: "ยกเลิก" })}</button>
            <button onClick={save} disabled={!dirtyCount} className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-1.5 text-[12.5px] font-semibold transition", dirtyCount ? "btn-glow" : "cursor-not-allowed bg-white/5 text-white/30")}><Save size={13} /> {L({ en: "Save", th: "บันทึก" })}</button>
          </div>
        </div>
      </div>

      {/* who to tell, and how — email + LINE (saves instantly, labelled as such) */}
      <NotifySettings L={L} />
    </div>
  );
}

/* ══════════════════════════ workspace ══════════════════════════ */

/** Small secondary toggle for steps that host two views (e.g. Analysis | AI Learning). */
function SubChips<T extends string>({ value, onChange, items, L }: { value: T; onChange: (v: T) => void; items: { id: T; icon: typeof Brain; label: LZ }[]; L: Tr }) {
  return (
    <div className="mb-4 flex items-center gap-1.5">
      {items.map((it) => { const on = value === it.id; return (
        <button key={it.id} onClick={() => onChange(it.id)} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition", on ? "border-brand-400/40 bg-brand-400/12 text-brand-100" : "border-white/10 bg-white/[0.02] text-white/50 hover:text-white/80")}>
          <it.icon size={13} className={on ? "text-brand-300" : "text-white/40"} />{L(it.label)}
        </button>
      ); })}
    </div>
  );
}

export function VisionWorkspace() {
  const { locale } = useI18n();
  const L: Tr = (o) => (locale === "th" ? o.th : o.en);
  const [step, setStep] = useState(0);
  const [analysisSub, setAnalysisSub] = useState<"analysis" | "learning">("analysis");
  const [reportSub, setReportSub] = useState<"report" | "settings">("report");

  const goAnalysis = () => { setAnalysisSub("analysis"); setStep(2); };

  return (
    <main className="p-5 lg:p-8">
      <div className="mb-5">
        <WorkflowBar step={step} setStep={setStep} L={L} />
      </div>

      <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {step === 0 ? <MonitorView L={L} onInvestigate={goAnalysis} /> : null}
        {step === 1 ? <OverviewView L={L} onAnalyze={goAnalysis} onMonitor={() => setStep(0)} /> : null}
        {step === 2 ? (
          <div>
            <SubChips value={analysisSub} onChange={setAnalysisSub} L={L} items={[
              { id: "analysis", icon: Brain, label: { en: "Analysis", th: "วิเคราะห์" } },
              { id: "learning", icon: GraduationCap, label: { en: "AI Learning", th: "สอน AI" } },
            ]} />
            {analysisSub === "analysis" ? <AnalyzeView L={L} onAct={() => setStep(3)} /> : <DefectLearning L={L} />}
          </div>
        ) : null}
        {step === 3 ? <ActView L={L} /> : null}
        {step === 4 ? (
          <div>
            <SubChips value={reportSub} onChange={setReportSub} L={L} items={[
              { id: "report", icon: FileText, label: { en: "Report", th: "รายงาน" } },
              { id: "settings", icon: Settings2, label: { en: "Settings", th: "ตั้งค่า" } },
            ]} />
            {reportSub === "report" ? <ReportView L={L} /> : <SettingsView L={L} />}
          </div>
        ) : null}
      </motion.div>
    </main>
  );
}
