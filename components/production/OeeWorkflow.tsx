"use client";

import { useEffect, useRef, useState, forwardRef, type ReactNode, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, BarChart3, Sparkles, Bot, FileText, Factory, Target, Timer, Gauge,
  TrendingUp, TrendingDown, AlertTriangle, Check, Plus, Play, Pause,
  Wrench, ArrowRight, CircleDot, Rocket, Wallet, Zap, Package, Send, Paperclip,
  X, ChevronDown, Printer, FileSpreadsheet, SlidersHorizontal, Maximize2, Minimize2, Pencil, RotateCcw, type LucideIcon,
} from "lucide-react";
import { currentUser, SPAREX_SALES_EMAIL } from "@/lib/user";
import { useI18n } from "@/lib/i18n";
import { WorkflowBar } from "@/components/os/WorkflowNav";
import { KpiCard } from "@/components/os/KpiCard";
import { Icon3D } from "@/components/os/Icon3D";
import { AreaTrend, HBars, MultiLine } from "@/components/os/charts";
import { createWorkOrder, useWorkOrders } from "@/lib/workorders";
import { Sparkline } from "@/components/ui/Sparkline";
import { cn, formatTHB } from "@/lib/utils";
import { useAiAutoQw } from "@/lib/autonomy";
import { AiReasoningTrace } from "@/components/os/AiReasoningTrace";

type LZ = { en: string; th: string };

/* ─────────────────────────────────────────────────────────────── data ── */

const oeeTrend24h = [
  { t: "06:00", oee: 81 }, { t: "08:00", oee: 79 }, { t: "10:00", oee: 74 },
  { t: "12:00", oee: 77 }, { t: "14:00", oee: 80 }, { t: "16:00", oee: 76 },
  { t: "18:00", oee: 78 }, { t: "20:00", oee: 82 }, { t: "22:00", oee: 79 },
];

const lines: { name: string; status: "running" | "changeover" | "down"; oee: number; out: string; note: LZ }[] = [
  { name: "Line A", status: "running", oee: 84, out: "412 / 480", note: { en: "on takt", th: "ตามจังหวะผลิต" } },
  { name: "Line B", status: "running", oee: 79, out: "388 / 480", note: { en: "quality drift", th: "คุณภาพเริ่มเบี่ยง" } },
  { name: "Line C", status: "changeover", oee: 68, out: "241 / 400", note: { en: "changeover 18 min over", th: "เปลี่ยนรุ่นเกิน 18 นาที" } },
  { name: "Line D", status: "down", oee: 61, out: "195 / 400", note: { en: "down 12 min · jam", th: "หยุด 12 นาที · ของติด" } },
];

const downtimePareto = [
  { name: "Changeover", value: 96 },
  { name: "Material wait", value: 74 },
  { name: "Micro-stops / jam", value: 58 },
  { name: "Breakdown", value: 45 },
  { name: "Quality rework", value: 31 },
];

/* Insight · unified loss pareto — minutes + ฿/day (min × ฿158 lost-output rate),
   7-day direction, and where each loss lands per line. Line sums reconcile with
   the Monitor line stories (C = changeover, D = jam/breakdown, B = quality)
   and the grand total (304 min · ฿48K/day) matches the callouts. */
const LOSS_LINES = ["Line A", "Line B", "Line C", "Line D"] as const;
const lossPareto: { name: LZ; min: number; d7: number; byLine: number[] }[] = [
  { name: { en: "Changeover", th: "เปลี่ยนรุ่น" }, min: 96, d7: 14, byLine: [12, 18, 58, 8] },
  { name: { en: "Material wait", th: "รอวัตถุดิบ" }, min: 74, d7: -6, byLine: [22, 16, 14, 22] },
  { name: { en: "Micro-stops / jam", th: "หยุดสั้น / ของติด" }, min: 58, d7: 9, byLine: [8, 12, 6, 32] },
  { name: { en: "Breakdown", th: "หยุดเสีย" }, min: 45, d7: -3, byLine: [0, 10, 0, 35] },
  { name: { en: "Quality rework", th: "งานแก้คุณภาพ" }, min: 31, d7: 5, byLine: [4, 21, 6, 0] },
];
const BAHT_PER_MIN = 158; // ฿ of lost output per stopped minute (blended)
/** total downtime per day, last 7 days (min) — today last; backs the Δ column */
const downtime7d = [286, 292, 275, 310, 298, 288, 304];

// the classic TPM Six Big Losses, grouped by the OEE pillar each one drags down
const sixLosses: { pillar: LZ; color: string; items: { name: LZ; min: number }[] }[] = [
  { pillar: { en: "Availability loss", th: "สูญเสียเวลาเดินเครื่อง" }, color: "#22d3ee", items: [
    { name: { en: "Setup & changeover", th: "เปลี่ยนรุ่น" }, min: 96 },
    { name: { en: "Breakdowns", th: "หยุดเสีย" }, min: 45 },
  ] },
  { pillar: { en: "Performance loss", th: "สูญเสียความเร็ว" }, color: "#818cf8", items: [
    { name: { en: "Reduced speed", th: "ความเร็วตก" }, min: 62 },
    { name: { en: "Minor stops", th: "หยุดสั้น" }, min: 58 },
  ] },
  { pillar: { en: "Quality loss", th: "สูญเสียคุณภาพ" }, color: "#f43f5e", items: [
    { name: { en: "Production rejects", th: "ของเสียระหว่างผลิต" }, min: 31 },
    { name: { en: "Startup rejects", th: "ของเสียตอนเริ่ม" }, min: 18 },
  ] },
];

const shiftOee: { shift: LZ; oee: number }[] = [
  { shift: { en: "Day · 06–14", th: "กะเช้า · 06–14" }, oee: 81 },
  { shift: { en: "Evening · 14–22", th: "กะบ่าย · 14–22" }, oee: 77 },
  { shift: { en: "Night · 22–06", th: "กะดึก · 22–06" }, oee: 74 },
];

/* Hourly plan vs actual, per shift. "Now" = 14:00 (deterministic) so the day
   shift has actuals through 14:00 (in progress) and plan-only after — totals
   reconcile with the Output stat (1,236 / 1,760 pcs). Night = last night, complete. */
type PlanRow = { t: string; model: string; plan: number; actual: number | null; co?: boolean; note?: LZ; current?: boolean };
const MODEL_COLOR: Record<string, string> = { "BRKT-218": "#22d3ee", "ASSY-V2": "#818cf8", "PNL-A36": "#f59e0b" };
const hourlyPlan: { day: PlanRow[]; night: PlanRow[] } = {
  day: [
    { t: "06:00", model: "BRKT-218", plan: 160, actual: 152 },
    { t: "07:00", model: "BRKT-218", plan: 160, actual: 158 },
    { t: "08:00", model: "BRKT-218", plan: 160, actual: 149, note: { en: "micro-stops · M-214", th: "หยุดสั้นถี่ · M-214" } },
    { t: "09:00", model: "BRKT-218", plan: 160, actual: 155 },
    { t: "10:00", model: "ASSY-V2", plan: 80, actual: 64, co: true, note: { en: "changeover +18 min over", th: "เปลี่ยนรุ่นเกิน +18 นาที" } },
    { t: "11:00", model: "ASSY-V2", plan: 160, actual: 151 },
    { t: "12:00", model: "ASSY-V2", plan: 160, actual: 138, note: { en: "quality drift · Line B", th: "คุณภาพเบี่ยง · Line B" } },
    { t: "13:00", model: "ASSY-V2", plan: 160, actual: 147 },
    { t: "14:00", model: "ASSY-V2", plan: 160, actual: 122, current: true, note: { en: "in progress", th: "กำลังผลิต" } },
    { t: "15:00", model: "ASSY-V2", plan: 160, actual: null },
    { t: "16:00", model: "PNL-A36", plan: 80, actual: null, co: true },
    { t: "17:00", model: "PNL-A36", plan: 160, actual: null },
  ],
  night: [
    { t: "18:00", model: "PNL-A36", plan: 140, actual: 131 },
    { t: "19:00", model: "PNL-A36", plan: 140, actual: 135 },
    { t: "20:00", model: "PNL-A36", plan: 140, actual: 138 },
    { t: "21:00", model: "PNL-A36", plan: 140, actual: 129 },
    { t: "22:00", model: "BRKT-218", plan: 70, actual: 58, co: true, note: { en: "changeover on plan", th: "เปลี่ยนรุ่นตามแผน" } },
    { t: "23:00", model: "BRKT-218", plan: 140, actual: 132 },
    { t: "00:00", model: "BRKT-218", plan: 140, actual: 126 },
    { t: "01:00", model: "BRKT-218", plan: 140, actual: 119 },
    { t: "02:00", model: "BRKT-218", plan: 140, actual: 96, note: { en: "breakdown 22 min · jam", th: "หยุดเสีย 22 นาที · ของติด" } },
    { t: "03:00", model: "BRKT-218", plan: 140, actual: 121 },
    { t: "04:00", model: "BRKT-218", plan: 140, actual: 128 },
    { t: "05:00", model: "BRKT-218", plan: 140, actual: 130 },
  ],
};

/** shift-level quality/stability stats shown inside the Plan-vs-Actual board */
const shiftStats = {
  day: { scrap: "2.6", stops: 67 },
  night: { scrap: "3.1", stops: 84 },
};

const throughputForecast = [
  { t: "13:00", actual: 1420 }, { t: "14:00", actual: 1465 }, { t: "15:00", actual: 1440, forecast: 1440 },
  { t: "16:00", forecast: 1418 }, { t: "17:00", forecast: 1395 }, { t: "18:00", forecast: 1408 },
];

/* Step-3 findings — each carries the ฿/day translation for executives (1pp OEE
   ≈ ฿7.27K/day from the ฿48K gap), a model confidence, a small evidence series
   for engineers, and the step-4 fix it links to. */
const anomalies: {
  title: LZ; detail: LZ; delta: string; cause: LZ;
  bahtDay: number; confidence: number; fix: LZ;
  ev: { label: LZ; series: number[]; color: string; note: LZ };
}[] = [
  {
    title: { en: "Line C changeover overrun", th: "เปลี่ยนรุ่น Line C เกินเวลา" }, detail: { en: "+18 min vs SMED standard (35 min)", th: "+18 นาที เทียบมาตรฐาน SMED (35 นาที)" }, delta: "-3.2% OEE",
    cause: { en: "Die pre-heat step skipped — evidence: mold temp 82°C at start vs 140°C standard", th: "ข้ามขั้นตอนอุ่นแม่พิมพ์ — หลักฐาน: อุณหภูมิแม่พิมพ์ 82°C ตอนเริ่ม เทียบมาตรฐาน 140°C" },
    bahtDay: 23_300, confidence: 91, fix: { en: "Enforce the SMED pre-heat checklist (฿0)", th: "บังคับใช้เช็กลิสต์อุ่นแม่พิมพ์ SMED (฿0)" },
    ev: { label: { en: "Mold temp at start · last 7 changeovers", th: "อุณหภูมิแม่พิมพ์ตอนเริ่ม · 7 ครั้งหลัง" }, series: [138, 141, 136, 140, 82, 85, 84], color: "#f43f5e", note: { en: "standard 140°C — the last 3 started cold", th: "มาตรฐาน 140°C — 3 ครั้งหลังเริ่มแบบเย็น" } },
  },
  {
    title: { en: "Micro-stop cluster · Filler M-214", th: "หยุดสั้นถี่ผิดปกติ · เครื่องบรรจุ M-214" }, detail: { en: "41 stops this shift · avg 38 s each", th: "หยุด 41 ครั้งกะนี้ · เฉลี่ยครั้งละ 38 วิ" }, delta: "-2.4% OEE",
    cause: { en: "Upstream starvation — evidence: infeed buffer empty 34% of runtime, conveyor 2 speed mismatch", th: "ของจากต้นทางมาไม่ทัน — หลักฐาน: บัฟเฟอร์ขาเข้าว่าง 34% ของเวลาเดินเครื่อง, สายพาน 2 ความเร็วไม่สัมพันธ์กัน" },
    bahtDay: 17_500, confidence: 84, fix: { en: "Sync conveyor-2 speed to the filler takt (฿0)", th: "ปรับสายพาน 2 ให้ตรงจังหวะเครื่องบรรจุ (฿0)" },
    ev: { label: { en: "Micro-stops per hour · this shift", th: "หยุดสั้นต่อชั่วโมง · กะนี้" }, series: [2, 3, 2, 8, 11, 9, 6], color: "#f59e0b", note: { en: "spikes after 10:00 — when the infeed buffer runs dry", th: "พุ่งหลัง 10:00 — ช่วงที่บัฟเฟอร์ขาเข้าเริ่มว่าง" } },
  },
  {
    title: { en: "Quality drift · Line B", th: "คุณภาพเบี่ยง · Line B" }, detail: { en: "Defect rate 2.1% → 3.4% in 4 h", th: "ของเสีย 2.1% → 3.4% ใน 4 ชม." }, delta: "-1.3% OEE",
    cause: { en: "Correlates with mold temp +6°C after cooling-water valve hunting — SPC rule 4 triggered", th: "สัมพันธ์กับอุณหภูมิแม่พิมพ์ +6°C หลังวาล์วน้ำหล่อเย็นแกว่ง — เข้าเงื่อนไข SPC ข้อ 4" },
    bahtDay: 9_500, confidence: 78, fix: { en: "Stabilise the cooling-water valve · mold temp", th: "คุมวาล์วน้ำหล่อเย็น · อุณหภูมิแม่พิมพ์ให้นิ่ง" },
    ev: { label: { en: "Defect % · last 4 hours", th: "% ของเสีย · 4 ชม.หลัง" }, series: [2.1, 2.3, 2.6, 2.9, 3.2, 3.4], color: "#fb7185", note: { en: "climbing steadily — SPC rule 4 (trend) fired", th: "ไต่ต่อเนื่องไม่หยุด — เข้า SPC ข้อ 4 (เทรนด์)" } },
  },
];

/** what-if levers on the forecast — fixing each finding claws back part of the 4% plan miss */
const forecastFixes: { label: LZ; gain: number }[] = [
  { label: { en: "Fix changeover · SMED checklist", th: "แก้เปลี่ยนรุ่น · เช็กลิสต์ SMED" }, gain: 1.8 },
  { label: { en: "Fix micro-stops · conveyor sync", th: "แก้หยุดสั้น · sync สายพาน 2" }, gain: 1.4 },
  { label: { en: "Hold quality · mold temp", th: "คุมคุณภาพ · อุณหภูมิแม่พิมพ์" }, gain: 0.8 },
];
const PLAN_RATE = 1465; // pcs/h the plan needs from here on

/* ── Production Action data — Part 1 zero-invest quick wins + Part 2 capital projects (BOM) ── */

/** One BOM line on a capital project — brand + part number an engineer can order. */
type ActionPart = { brand: string; partNo: string; name: LZ; qty: number; unitPrice: number };

/** Part 1 · Quick wins — no hardware, config / discipline only (฿0 capex). */
const productionQuickWins: { id: string; title: LZ; asset: LZ; how: LZ; savingYr: number; effort: LZ }[] = [
  {
    id: "qw-smed",
    title: { en: "Enforce the SMED die pre-heat checklist on Line C", th: "บังคับใช้เช็กลิสต์อุ่นแม่พิมพ์ (SMED) ที่ Line C" },
    asset: { en: "Line C · changeover", th: "Line C · เปลี่ยนรุ่น" },
    how: { en: "Add the mold pre-heat step (140°C before start) to the changeover SOP so the +18-minute overrun on Line C disappears — pure discipline, no hardware.", th: "เพิ่มขั้นอุ่นแม่พิมพ์ (140°C ก่อนเริ่ม) เข้าไปใน SOP เปลี่ยนรุ่น เพื่อลบเวลาเกิน +18 นาทีของ Line C — เป็นวินัยล้วนๆ ไม่ต้องมีฮาร์ดแวร์" },
    savingYr: 420000,
    effort: { en: "SOP + checklist", th: "SOP + เช็กลิสต์" },
  },
  {
    id: "qw-conveyor",
    title: { en: "Sync conveyor-2 speed to the filler takt", th: "ปรับความเร็วสายพาน 2 ให้ตรงจังหวะเครื่องบรรจุ" },
    asset: { en: "M-214 infeed · conveyor 2", th: "ขาเข้า M-214 · สายพาน 2" },
    how: { en: "Match conveyor-2 speed to the filler takt through the PLC so upstream starvation and the micro-stop cluster on M-214 stop.", th: "ปรับความเร็วสายพาน 2 ให้เท่าจังหวะเครื่องบรรจุผ่าน PLC เพื่อหยุดปัญหาของขาดจากต้นทางและหยุดสั้นถี่ที่ M-214" },
    savingYr: 310000,
    effort: { en: "PLC parameter · minutes", th: "ตั้งค่า PLC · ไม่กี่นาที" },
  },
];

/** Part 2 · Capital projects — with investment; each carries a full BOM (brand + part no.). */
const productionCapitalProjects: {
  id: string; code: string; title: LZ; asset: LZ; severity: "critical" | "warning" | "recommend";
  capex: number; savingYr: number; paybackMo: number; roi: number;
  why: LZ; evidence: LZ; outcome: LZ; parts: ActionPart[];
}[] = [
  {
    id: "prd-sensor", code: "PRD-01",
    title: { en: "Starvation sensor + buffer alert on the M-214 infeed", th: "ติดเซนเซอร์ของขาด + แจ้งเตือนบัฟเฟอร์ ที่ขาเข้า M-214" },
    asset: { en: "Filler M-214 · infeed", th: "เครื่องบรรจุ M-214 · ขาเข้า" },
    severity: "warning", capex: 45000, savingYr: 260000, paybackMo: 2, roi: 578,
    why: { en: "Upstream starvation causes a cluster of 41 micro-stops per shift on M-214.", th: "ของจากต้นทางมาไม่ทัน ทำให้ M-214 หยุดสั้นถี่ 41 ครั้งต่อกะ" },
    evidence: { en: "The infeed buffer sits empty 34% of runtime, ahead of each micro-stop.", th: "บัฟเฟอร์ขาเข้าว่าง 34% ของเวลาเดินเครื่อง ก่อนเกิดหยุดสั้นทุกครั้ง" },
    outcome: { en: "The line slows before starving instead of stopping — micro-stops drop sharply.", th: "ไลน์ชะลอก่อนของขาดแทนที่จะหยุด — หยุดสั้นลดลงชัดเจน" },
    parts: [
      { brand: "SICK", partNo: "WL12-2 photoelectric", name: { en: "Photoelectric buffer-level sensor", th: "เซนเซอร์วัดระดับบัฟเฟอร์ (โฟโตอิเล็กทริก)" }, qty: 2, unitPrice: 12000 },
      { brand: "SpareX Connect", partNo: "IO module + HMI alert", name: { en: "IO module + HMI buffer alert", th: "โมดูล IO + แจ้งเตือนบัฟเฟอร์บน HMI" }, qty: 1, unitPrice: 15000 },
    ],
  },
  {
    id: "prd-pid", code: "PRD-02",
    title: { en: "Re-tune the cooling-water valve PID + add a mold temp sensor · Line B", th: "จูนวาล์วน้ำหล่อเย็น (PID) + ติดเซนเซอร์อุณหภูมิแม่พิมพ์ · Line B" },
    asset: { en: "Line B · mold cooling", th: "Line B · ระบบหล่อเย็นแม่พิมพ์" },
    severity: "warning", capex: 20000, savingYr: 240000, paybackMo: 1, roi: 1200,
    why: { en: "The cooling-water valve hunts, pushing mold temp +6°C and drifting quality out of spec.", th: "วาล์วน้ำหล่อเย็นแกว่ง ทำให้อุณหภูมิแม่พิมพ์ +6°C และคุณภาพเบี่ยงหลุดสเปก" },
    evidence: { en: "Defect rate rose 2.1%→3.4% in 4 h and tripped SPC rule 4 as mold temp climbed.", th: "ของเสียขึ้น 2.1%→3.4% ใน 4 ชม. และเข้าเงื่อนไข SPC ข้อ 4 ตอนอุณหภูมิแม่พิมพ์ไต่ขึ้น" },
    outcome: { en: "Mold temp holds steady and the scrap rate returns to baseline.", th: "อุณหภูมิแม่พิมพ์นิ่ง และอัตราของเสียกลับสู่ระดับปกติ" },
    parts: [
      { brand: "Siemens", partNo: "SIPART PS2 positioner", name: { en: "Smart valve positioner (PID)", th: "ตัวปรับตำแหน่งวาล์วอัจฉริยะ (PID)" }, qty: 1, unitPrice: 14000 },
      { brand: "IFM", partNo: "TA2502 RTD", name: { en: "Mold RTD temperature sensor", th: "เซนเซอร์อุณหภูมิแม่พิมพ์ (RTD)" }, qty: 1, unitPrice: 6000 },
    ],
  },
];

const autos: { name: LZ; desc: LZ; impact: string; status: "active" | "pending" | "suggested" }[] = [
  { name: { en: "Speed-loss auto-recovery", th: "กู้ความเร็วอัตโนมัติ" }, desc: { en: "Nudge line speed back to takt when performance drops below 90% for 10 min", th: "ดันความเร็วไลน์กลับสู่จังหวะผลิตเมื่อ performance ต่ำกว่า 90% เกิน 10 นาที" }, impact: "+1.8% OEE", status: "active" },
  { name: { en: "Dynamic changeover scheduler", th: "จัดคิวเปลี่ยนรุ่นอัตโนมัติ" }, desc: { en: "Re-sequence jobs to cut changeover count — grouped by die & material", th: "เรียงงานใหม่เพื่อลดจำนวนครั้งเปลี่ยนรุ่น — จัดกลุ่มตามแม่พิมพ์และวัสดุ" }, impact: "+1.1% OEE", status: "pending" },
  { name: { en: "SPC auto-hold on drift", th: "หยุดไลน์อัตโนมัติเมื่อคุณภาพเบี่ยง" }, desc: { en: "Hold the line when SPC rules trigger, before scrap is produced", th: "หยุดไลน์ทันทีเมื่อเข้าเงื่อนไข SPC ก่อนผลิตของเสีย" }, impact: "-0.9% scrap", status: "suggested" },
];

const mv: { action: LZ; planned: number; verified: number }[] = [
  { action: { en: "SMED die pre-heat · Line C", th: "อุ่นแม่พิมพ์ SMED · Line C" }, planned: 35000, verified: 38200 },
  { action: { en: "Conveyor-2 takt sync", th: "ปรับสายพาน 2 ตรงจังหวะ" }, planned: 26000, verified: 24100 },
  { action: { en: "Speed-loss auto-recovery", th: "กู้ความเร็วอัตโนมัติ" }, planned: 18000, verified: 19400 },
];

/* ─────────────────────────────────────────────────────────── workflow ── */

export function OeeWorkflow() {
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
      {step === 4 && <ReportStep L={L} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── 01 monitor ── */

const LINE_STYLE: Record<"running" | "changeover" | "down", { color: string; label: LZ }> = {
  running: { color: "#34d399", label: { en: "Running", th: "เดินเครื่อง" } },
  changeover: { color: "#f59e0b", label: { en: "Changeover", th: "เปลี่ยนรุ่น" } },
  down: { color: "#f43f5e", label: { en: "Down", th: "หยุด" } },
};

function MonitorStep({ L }: { L: (o: LZ) => string }) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={L({ en: "OEE · now", th: "OEE · ขณะนี้" })} value="78.4" unit="%" delta="Live" deltaGood accent="#f59e0b" icon={Target} />
        <KpiCard label={L({ en: "Availability", th: "อัตราพร้อมเดินเครื่อง" })} value="88.2" unit="%" delta="1.2%" accent="#22d3ee" icon={Timer} />
        <KpiCard label={L({ en: "Performance", th: "อัตราความเร็วผลิต" })} value="92.1" unit="%" delta="0.8%" deltaGood accent="#818cf8" icon={Gauge} />
        <KpiCard label={L({ en: "Quality", th: "อัตราของดี" })} value="96.5" unit="%" delta="1.3%" accent="#34d399" icon={Check} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <Panel title={L({ en: "OEE Trend", th: "แนวโน้ม OEE" })} sub={L({ en: "On track to hit 85% today", th: "วันนี้จะถึงเป้า 85% ไหม" })} icon={Activity} right={<span className="chip text-amber-300">● {L({ en: "target 85%", th: "เป้า 85%" })}</span>}>
          <AreaTrend data={oeeTrend24h} dataKey="oee" color="#f59e0b" height={260} baseline={85} baselineLabel={L({ en: "target 85%", th: "เป้า 85%" })} />
        </Panel>
        <Panel title={L({ en: "Line Status", th: "สถานะไลน์ผลิต" })} sub={L({ en: "Which lines are running or down", th: "ไลน์ไหนเดินอยู่ ไลน์ไหนหยุด" })} icon={Factory}>
          <div className="space-y-2.5">
            {lines.map((l) => {
              const s = LINE_STYLE[l.status];
              return (
                <div key={l.name} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                  <CircleDot size={14} style={{ color: s.color }} className={l.status !== "down" ? "" : "animate-pulse"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium">{l.name}</p>
                      <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium" style={{ color: s.color, borderColor: `${s.color}44`, backgroundColor: `${s.color}14` }}>{L(s.label)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-white/45">{L(l.note)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-[13px] font-semibold" style={{ color: s.color }}>{l.oee}%</p>
                    <p className="tabular text-[10px] text-white/40">{l.out} pcs</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <PlanVsActualPanel L={L} />
    </div>
  );
}

/** Plan vs Actual, hour by hour per shift — which hour slipped, on which model,
 *  by how many pieces. Day shift reconciles with the Output stat (1,236/1,760). */
const PLAN_KEY = "factoryos:prod-plan"; // user-entered hourly plan, per shift

function PlanVsActualPanel({ L }: { L: (o: LZ) => string }) {
  const [shift, setShift] = useState<"day" | "night">("day");
  // planner-editable plan: overrides replace the mock plan per hour and persist
  // locally, so a supervisor can key in today's plan and every stat follows
  const [overrides, setOverrides] = useState<{ day?: number[]; night?: number[] }>({});
  const [draft, setDraft] = useState<string[] | null>(null); // edit mode when non-null
  useEffect(() => {
    try { setOverrides(JSON.parse(localStorage.getItem(PLAN_KEY) || "{}")); } catch { /* ignore */ }
  }, []);
  const saveOverrides = (next: { day?: number[]; night?: number[] }) => {
    setOverrides(next);
    try { localStorage.setItem(PLAN_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  // shop-floor display mode — CSS overlay (embedded webviews ignore the native
  // Fullscreen API); Esc exits, body scroll locks while maximized
  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    if (!isFs) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsFs(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [isFs]);
  const rows = hourlyPlan[shift].map((r, i) => ({ ...r, plan: overrides[shift]?.[i] ?? r.plan }));
  const editing = draft !== null;
  const beginEdit = () => setDraft(rows.map((r) => String(r.plan)));
  const commitEdit = () => {
    if (!draft) return;
    const nums = draft.map((v, i) => {
      const n = Math.round(Number(v));
      return Number.isFinite(n) && n > 0 ? n : rows[i].plan;
    });
    saveOverrides({ ...overrides, [shift]: nums });
    setDraft(null);
  };
  const done = rows.filter((r) => r.actual !== null);
  const planSoFar = done.reduce((s, r) => s + r.plan, 0);
  const planTotal = rows.reduce((s, r) => s + r.plan, 0);
  const actualSum = done.reduce((s, r) => s + (r.actual ?? 0), 0);
  const attain = planSoFar ? Math.round((actualSum / planSoFar) * 100) : 0;
  const tone = (pct: number) => (pct >= 95 ? "#34d399" : pct >= 85 ? "#f59e0b" : "#f43f5e");
  const panel = (
    <Panel
      title={L({ en: "Production Plan vs Actual", th: "แผนผลิต vs ผลจริง" })}
      sub={L({ en: "Which hour slipped, on which model", th: "ชั่วโมงไหนหลุดแผน กำลังผลิตรุ่นอะไร" })}
      icon={Package}
      right={
        <div className="flex items-center gap-2">
          <span className="chip tabular text-[11px]">{actualSum.toLocaleString()} / {planTotal.toLocaleString()} pcs · <b style={{ color: tone(attain) }}>{attain}%</b> {L({ en: "of plan so far", th: "ของแผนที่ผ่านมา" })}</span>
          <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
            <button onClick={() => { setShift("day"); setDraft(null); }} className={cn("rounded-md px-2.5 py-1 text-xs", shift === "day" ? "bg-white/10 text-white" : "text-white/50 hover:text-white")}>{L({ en: "Day · today", th: "กะเช้า · วันนี้" })}</button>
            <button onClick={() => { setShift("night"); setDraft(null); }} className={cn("rounded-md px-2.5 py-1 text-xs", shift === "night" ? "bg-white/10 text-white" : "text-white/50 hover:text-white")}>{L({ en: "Night · last night", th: "กะดึก · เมื่อคืน" })}</button>
          </div>
          {editing ? (
            <div className="flex gap-1">
              <button onClick={commitEdit} className="flex h-8 items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-400/20"><Check size={13} /> {L({ en: "Save plan", th: "บันทึกแผน" })}</button>
              <button onClick={() => setDraft(null)} aria-label={L({ en: "Cancel", th: "ยกเลิก" })} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.02] text-white/60 transition hover:text-white"><X size={13} /></button>
            </div>
          ) : (
            <button
              onClick={beginEdit}
              title={L({ en: "Enter today's plan per hour", th: "กรอกแผนผลิตรายชั่วโมงของวันนี้" })}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 text-xs text-white/60 transition hover:border-brand-400/40 hover:text-white"
            ><Pencil size={12} /> {L({ en: "Edit plan", th: "กรอกแผน" })}</button>
          )}
          {!editing && overrides[shift] ? (
            <button
              onClick={() => { const { [shift]: _drop, ...rest } = overrides; saveOverrides(rest); }}
              title={L({ en: "Reset to default plan", th: "คืนค่าแผนตั้งต้น" })}
              aria-label={L({ en: "Reset plan", th: "คืนค่าแผนตั้งต้น" })}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.02] text-white/50 transition hover:text-white"
            ><RotateCcw size={13} /></button>
          ) : null}
          <button
            onClick={() => setIsFs((v) => !v)}
            title={L(isFs ? { en: "Exit fullscreen (Esc)", th: "ออกจากเต็มจอ (Esc)" } : { en: "Fullscreen — shop-floor display", th: "ขยายเต็มจอ — ขึ้นจอหน้าไลน์" })}
            aria-label={L(isFs ? { en: "Exit fullscreen", th: "ออกจากเต็มจอ" } : { en: "Fullscreen", th: "ขยายเต็มจอ" })}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.02] text-white/60 transition hover:border-white/25 hover:text-white"
          >
            {isFs ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      }
    >
      {/* shift scoreboard — travels with the board onto the shop-floor display */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: shift === "day" ? L({ en: "Output · today", th: "ยอดผลิต · วันนี้" }) : L({ en: "Output · last night", th: "ยอดผลิต · เมื่อคืน" }), value: actualSum.toLocaleString(), unit: `/ ${planTotal.toLocaleString()} pcs`, accent: "#22d3ee" },
          { label: L({ en: "Takt adherence", th: "ตามจังหวะผลิต" }), value: `${attain}`, unit: "%", accent: "#818cf8" },
          { label: L({ en: "Scrap rate", th: "อัตราของเสีย" }), value: shiftStats[shift].scrap, unit: "%", accent: "#f43f5e" },
          { label: shift === "day" ? L({ en: "Micro-stops · shift", th: "หยุดสั้น · กะนี้" }) : L({ en: "Micro-stops · night", th: "หยุดสั้น · กะดึก" }), value: `${shiftStats[shift].stops}`, unit: undefined as string | undefined, accent: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-white/45">{s.label}</p>
            <p className="mt-1 tabular text-xl font-semibold" style={{ color: s.accent }}>
              {s.value}
              {s.unit ? <span className="ml-1 text-xs font-normal text-white/45">{s.unit}</span> : null}
            </p>
          </div>
        ))}
      </div>

      {(() => {
        // contiguous model runs → the spanning "รุ่นที่ผลิต" band, like a calendar event
        const runs: { model: string; start: number; len: number; co: boolean }[] = [];
        rows.forEach((r, i) => {
          const last = runs[runs.length - 1];
          if (last && last.model === r.model) last.len += 1;
          else runs.push({ model: r.model, start: i, len: 1, co: !!r.co });
        });
        const grid = { display: "grid", gridTemplateColumns: `92px repeat(${rows.length}, minmax(56px, 1fr))`, columnGap: "4px" } as const;
        const rowLabel = "flex items-center text-[10.5px] font-medium uppercase tracking-wider text-white/40";
        return (
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[820px] space-y-1">
              {/* X axis · hours */}
              <div style={grid}>
                <div />
                {rows.map((r) => (
                  <div key={r.t} className={cn("rounded-md py-1 text-center tabular text-[11px]", r.current ? "bg-brand-400/10 font-semibold text-brand-300" : "text-white/50")}>{r.t}</div>
                ))}
              </div>
              {/* model band — spans its hours */}
              <div style={grid}>
                <div className={rowLabel}>{L({ en: "Model", th: "รุ่นที่ผลิต" })}</div>
                {runs.map((run) => {
                  const c = MODEL_COLOR[run.model] ?? "#94a3b8";
                  return (
                    <div key={`${run.model}-${run.start}`} style={{ gridColumn: `span ${run.len}`, color: c, borderColor: `${c}44`, backgroundColor: `${c}12` }} className="flex items-center justify-center gap-1.5 truncate rounded-lg border px-2 py-1.5 font-mono text-[11px] font-semibold">
                      {run.co ? <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-400/15 px-1.5 text-[8.5px] font-sans font-medium text-amber-300">⟳ {L({ en: "changeover", th: "เปลี่ยนรุ่น" })}</span> : null}
                      <span className="truncate">{run.model}</span>
                    </div>
                  );
                })}
              </div>
              {/* plan row — editable so the supervisor keys in today's plan */}
              <div style={grid}>
                <div className={rowLabel}>{L({ en: "Plan", th: "แผน" })}</div>
                {rows.map((r, i) => (
                  editing ? (
                    <input
                      key={r.t}
                      type="number"
                      min={1}
                      value={draft![i]}
                      onChange={(e) => setDraft((d) => { const n = [...d!]; n[i] = e.target.value; return n; })}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setDraft(null); }}
                      aria-label={`${L({ en: "Plan", th: "แผน" })} ${r.t}`}
                      className="w-full rounded-md border border-brand-400/40 bg-brand-400/[0.06] py-1 text-center tabular text-[12px] text-white focus:border-brand-400 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  ) : (
                    <div key={r.t} className={cn("rounded-md border border-white/8 bg-white/[0.02] py-1.5 text-center tabular text-[12px] text-white/60", r.current && "border-brand-400/25")}>{r.plan}</div>
                  )
                ))}
              </div>
              {/* actual row — the calendar cells that carry the verdict */}
              <div style={grid}>
                <div className={rowLabel}>{L({ en: "Actual", th: "ผลจริง" })}</div>
                {rows.map((r) => {
                  const pct = r.actual !== null ? Math.round((r.actual / r.plan) * 100) : null;
                  const c = pct !== null ? tone(pct) : null;
                  return (
                    <div
                      key={r.t}
                      title={r.note ? L(r.note) : undefined}
                      className={cn("relative rounded-md border py-1 text-center", r.current && "ring-1 ring-brand-400/40")}
                      style={c ? { borderColor: `${c}44`, backgroundColor: `${c}14` } : { borderColor: "rgba(148,163,184,0.15)" }}
                    >
                      {pct !== null ? (
                        <>
                          <p className="tabular text-[13px] font-bold leading-tight" style={{ color: c! }}>{r.actual}</p>
                          <p className="tabular text-[9.5px] leading-tight" style={{ color: `${c}CC` }}>{pct}%</p>
                        </>
                      ) : (
                        <>
                          <p className="tabular text-[13px] leading-tight text-white/30">—</p>
                          <p className="text-[9.5px] leading-tight text-white/30">{L({ en: "upcoming", th: "รอผลิต" })}</p>
                        </>
                      )}
                      {r.note ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" /> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
      {/* event notes — the amber dots explained */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[10.5px] text-white/45">
        {rows.filter((r) => r.note).map((r) => (
          <span key={r.t} className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" /><b className="tabular font-medium text-white/60">{r.t}</b> {L(r.note!)}</span>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-4 border-t border-white/8 pt-2.5 text-[11px] text-white/45">
        {Object.entries(MODEL_COLOR).map(([m, c]) => (
          <span key={m} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} /> {m}</span>
        ))}
        <span className="ml-auto">{L({ en: "cell = actual vs plan · green ≥95% · amber ≥85% · red <85%", th: "ช่อง = ผลจริงเทียบแผน · เขียว ≥95% · ส้ม ≥85% · แดง <85%" })}</span>
      </div>
    </Panel>
  );
  // maximized = a shop-floor display: the panel alone, full viewport, slightly
  // zoomed so operators can read it from a distance. Portaled to <body> so a
  // transformed ancestor (step-transition motion) can't offset the fixed overlay.
  return isFs ? (
    createPortal(
      <div className="fixed inset-0 z-[100] overflow-auto bg-ink-950 p-4 sm:p-6">
        <div className="mx-auto max-w-[1700px]" style={{ zoom: 1.15 }}>{panel}</div>
      </div>,
      document.body,
    )
  ) : panel;
}

/* ─────────────────────────────────────────────────────────── 02 insight ── */

function InsightStep({ L, onAct }: { L: (o: LZ) => string; onAct: () => void }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Callout tone="crit" icon={TrendingDown} big="-6.6pp" label={L({ en: "OEE vs 85% target", th: "OEE เทียบเป้า 85%" })} note={L({ en: "Gap costs ≈ ฿48K/day in lost output", th: "ช่องว่างนี้เท่ากับยอดผลิตหาย ≈ ฿48K/วัน" })} />
        <Callout tone="warn" icon={Timer} big="304 min" label={L({ en: "downtime · today", th: "เวลาหยุด · วันนี้" })} note={L({ en: "Changeover is the #1 loss — 96 min (32%)", th: "เปลี่ยนรุ่นคือการสูญเสียอันดับ 1 — 96 นาที (32%)" })} />
        <Callout tone="ok" icon={TrendingUp} big="+2.1pp" label={L({ en: "OEE recovered · MTD", th: "OEE ที่กู้คืนแล้ว · เดือนนี้" })} note={L({ en: "from cutting changeover time & speed loss", th: "จากลดเวลาเปลี่ยนรุ่น & ความเร็วตก" })} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* one pareto instead of two twin charts — time, money and direction per row */}
        <Panel
          title={L({ en: "Loss Pareto · time + money", th: "พาเรโตการสูญเสีย · เวลา + เงิน" })}
          sub={L({ en: "What to attack first, and is it growing", th: "ควรจัดการอะไรก่อน และตัวไหนกำลังโตขึ้น" })}
          icon={BarChart3}
          right={<span className="chip tabular text-[11px]">{lossPareto.reduce((s, d) => s + d.min, 0)} {L({ en: "min", th: "นาที" })} · ฿{Math.round((lossPareto.reduce((s, d) => s + d.min, 0) * BAHT_PER_MIN) / 1000)}K/{L({ en: "day", th: "วัน" })}</span>}
        >
          {(() => {
            const total = lossPareto.reduce((s, d) => s + d.min, 0);
            const max = Math.max(...lossPareto.map((d) => d.min));
            let cum = 0;
            const top2 = lossPareto[0].min + lossPareto[1].min;
            return (
              <>
                <div className="space-y-2.5">
                  {lossPareto.map((d, i) => {
                    cum += d.min;
                    const inCore = i < 2;
                    const worse = d.d7 > 0;
                    return (
                      <div key={d.name.en} className="flex items-center gap-2.5">
                        <span className="w-28 shrink-0 break-words text-[11.5px] leading-tight text-white/65">{L(d.name)}</span>
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/8">
                          <div className="h-full rounded-full" style={{ width: `${(d.min / max) * 100}%`, backgroundColor: inCore ? "#f43f5e" : "#64748b" }} />
                        </div>
                        <span className="w-12 shrink-0 text-right tabular text-[12px] font-semibold text-white/80">{d.min}m</span>
                        <span className="w-16 shrink-0 text-right tabular text-[11px] text-white/50">฿{(d.min * BAHT_PER_MIN / 1000).toFixed(1)}K</span>
                        <span className={cn("flex w-16 shrink-0 items-center justify-end gap-0.5 tabular text-[11px] font-semibold", worse ? "text-rose-300" : "text-emerald-300")}>
                          {worse ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{worse ? "+" : "−"}{Math.abs(d.d7)}m
                        </span>
                        <span className="w-10 shrink-0 text-right tabular text-[10px] text-white/35">{Math.round((cum / total) * 100)}%</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-white/40">
                  <span>{L({ en: "min · ฿/day · Δ 7-day · cumulative", th: "นาที · ฿/วัน · เทียบ 7 วัน · สะสม" })}</span>
                  <span className="ml-auto flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400/80" /> {L({ en: "the 80/20 core", th: "แกน 80/20" })}</span>
                </div>
                <p className="mt-2.5 rounded-lg border border-rose-400/15 bg-rose-500/[0.05] px-2.5 py-2 text-[11px] leading-relaxed text-white/60">
                  {L({
                    en: `Fix the top 2 (red) → recovers ${top2} min ≈ ${Math.round((top2 / total) * 100)}% of all downtime · ฿${((top2 * BAHT_PER_MIN) / 1000).toFixed(1)}K/day — and Changeover is still growing (+14 min vs last week)`,
                    th: `แก้ 2 อันดับแรก (สีแดง) = คืน ${top2} นาที ≈ ${Math.round((top2 / total) * 100)}% ของเวลาหยุดทั้งหมด · ฿${((top2 * BAHT_PER_MIN) / 1000).toFixed(1)}K/วัน — และเปลี่ยนรุ่นยังโตขึ้นอยู่ (+14 นาทีเทียบสัปดาห์ก่อน)`,
                  })}
                </p>
                {/* 7-day context + what it costs if left alone — no dead space below the pareto */}
                <div className="mt-3 grid gap-4 border-t border-white/8 pt-3 sm:grid-cols-[1.25fr_1fr]">
                  <div>
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40">{L({ en: "Total downtime · last 7 days", th: "เวลาหยุดรวม · 7 วันหลังสุด" })}</p>
                    <div className="flex h-14 items-end gap-1.5">
                      {downtime7d.map((v, i) => {
                        const today = i === downtime7d.length - 1;
                        const maxD = Math.max(...downtime7d);
                        return (
                          <div key={i} className="flex h-full flex-1 items-end">
                            <div className="w-full rounded-t-sm" style={{ height: `${(v / maxD) * 100}%`, backgroundColor: today ? "#f59e0b" : "rgba(148,163,184,0.30)" }} title={`${v} min`} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-1 flex justify-between text-[9.5px] text-white/35">
                      <span>{L({ en: "6 days ago", th: "6 วันก่อน" })}</span>
                      <span className="font-medium text-amber-300/90">{L({ en: "today", th: "วันนี้" })} {downtime7d[downtime7d.length - 1]}m · {L({ en: "avg", th: "เฉลี่ย" })} {Math.round(downtime7d.reduce((s, v) => s + v, 0) / downtime7d.length)}m</span>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40">{L({ en: "If nothing changes", th: "ถ้าปล่อยไว้เท่านี้" })}</p>
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5">
                        <span className="text-[11px] text-white/50">{L({ en: "per month", th: "ต่อเดือน" })}</span>
                        <span className="tabular text-[13px] font-semibold text-rose-300">฿{((total * BAHT_PER_MIN * 30) / 1_000_000).toFixed(2)}M</span>
                      </div>
                      <div className="flex items-baseline justify-between rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5">
                        <span className="text-[11px] text-white/50">{L({ en: "per year", th: "ต่อปี" })}</span>
                        <span className="tabular text-[13px] font-semibold text-rose-300">฿{((total * BAHT_PER_MIN * 365) / 1_000_000).toFixed(1)}M</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </Panel>

        {/* where each loss lands — the walk-to-this-line map */}
        <Panel
          title={L({ en: "Loss × Line", th: "การสูญเสียเกิดที่ไลน์ไหน" })}
          sub={L({ en: "Which line to walk to for each loss", th: "แต่ละปัญหาต้องเดินไปไลน์ไหน" })}
          icon={Factory}
        >
          {(() => {
            const lineTotals = LOSS_LINES.map((_, li) => lossPareto.reduce((s, d) => s + d.byLine[li], 0));
            const worstLine = lineTotals.indexOf(Math.max(...lineTotals));
            const heat = (v: number) => (v === 0 ? "rgba(148,163,184,0.05)" : `rgba(244,63,94,${Math.min(0.12 + (v / 60) * 0.5, 0.62)})`);
            return (
              <>
                <div className="grid gap-1" style={{ gridTemplateColumns: "88px repeat(4, minmax(0,1fr))" }}>
                  <div />
                  {LOSS_LINES.map((ln, li) => (
                    <div key={ln} className={cn("rounded-md py-1 text-center text-[10.5px] font-medium", li === worstLine ? "bg-rose-400/10 text-rose-300" : "text-white/50")}>{ln}</div>
                  ))}
                  {lossPareto.map((d) => (
                    <div key={d.name.en} className="contents">
                      <div className="flex items-center break-words pr-1 text-[10.5px] leading-tight text-white/55">{L(d.name)}</div>
                      {d.byLine.map((v, li) => (
                        <div key={li} className={cn("rounded-md py-2 text-center tabular text-[12px] font-semibold", v === 0 ? "text-white/25" : "text-white/90")} style={{ backgroundColor: heat(v) }}>{v || "·"}</div>
                      ))}
                    </div>
                  ))}
                  <div className="flex items-center pr-1 pt-1 text-[10px] font-medium uppercase tracking-wider text-white/40">{L({ en: "Total", th: "รวม" })}</div>
                  {lineTotals.map((t, li) => (
                    <div key={li} className={cn("pt-1 text-center tabular text-[12px] font-bold", li === worstLine ? "text-rose-300" : "text-white/70")}>{t}m</div>
                  ))}
                </div>
                <p className="mt-3 rounded-lg border border-amber-400/15 bg-amber-400/[0.05] px-2.5 py-2 text-[11px] leading-relaxed text-white/60">
                  {L({
                    en: "Line D is the heaviest (97 min — jams + breakdown) · Line C's pain is pure changeover (58 min) · Line B leaks through quality (21 min)",
                    th: "ไลน์ D หนักสุด (97 นาที — ของติด+หยุดเสีย) · ไลน์ C เจ็บจากเปลี่ยนรุ่นล้วนๆ (58 นาที) · ไลน์ B รั่วทางคุณภาพ (21 นาที)",
                  })}
                </p>
              </>
            );
          })()}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel title={L({ en: "Six Big Losses", th: "หกการสูญเสียหลัก" })} sub={L({ en: "where OEE leaks · by A·P·Q", th: "OEE รั่วตรงไหน · แยกตาม A·P·Q" })} icon={BarChart3}>
          <div className="space-y-3.5">
            {sixLosses.map((g) => {
              const gTotal = g.items.reduce((s, x) => s + x.min, 0);
              const maxMin = Math.max(...sixLosses.flatMap((gg) => gg.items.map((x) => x.min)));
              return (
                <div key={g.pillar.en}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 font-medium text-white/70"><span className="h-2 w-2 rounded-full" style={{ background: g.color }} />{L(g.pillar)}</span>
                    <span className="tabular text-white/45">{gTotal} min</span>
                  </div>
                  <div className="mt-1.5 space-y-1.5">
                    {g.items.map((it) => (
                      <div key={it.name.en} className="flex items-center gap-2.5">
                        <span className="w-28 shrink-0 break-words leading-tight text-[11.5px] text-white/60">{L(it.name)}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${(it.min / maxMin) * 100}%`, background: g.color }} /></div>
                        <span className="w-10 shrink-0 text-right tabular text-[11.5px] font-semibold text-white/70">{it.min}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3.5 rounded-lg border border-amber-400/15 bg-amber-400/[0.05] px-2.5 py-2 text-[11px] leading-relaxed text-white/60">{L({ en: "Changeover alone is 96 min — the single biggest loss to attack first.", th: "เปลี่ยนรุ่นอย่างเดียว 96 นาที — ก้อนสูญเสียใหญ่สุด ควรจัดการก่อน" })}</p>
        </Panel>

        <Panel title={L({ en: "OEE by Shift", th: "OEE แยกตามกะ" })} sub={L({ en: "which shift drags OEE down", th: "กะไหนฉุด OEE ลง" })} icon={Timer}>
          <div className="space-y-3">
            {shiftOee.map((s) => { const col = s.oee >= 80 ? "#34d399" : s.oee >= 76 ? "#f59e0b" : "#f43f5e"; return (
              <div key={s.shift.en}>
                <div className="flex items-center justify-between text-[12.5px]"><span className="text-white/70">{L(s.shift)}</span><span className="tabular font-semibold" style={{ color: col }}>{s.oee}%</span></div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${s.oee}%`, background: col }} /></div>
              </div>
            ); })}
          </div>
          <p className="mt-3.5 rounded-lg border border-rose-400/15 bg-rose-400/[0.05] px-2.5 py-2 text-[11px] leading-relaxed text-white/60">{L({ en: "Night shift runs 7pp below day — tighten night setup & manning.", th: "กะดึกต่ำกว่ากะเช้า 7pp — คุมเซ็ตอัพ & กำลังคนกะดึกให้แน่น" })}</p>
        </Panel>
      </div>
      <Panel title={L({ en: "Plan Attainment", th: "ความคืบหน้าตามแผน" })} sub={L({ en: "Are we ahead or behind plan", th: "ผลิตทันแผนหรือช้ากว่าแผน" })} icon={Factory}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">{L({ en: "1,236 of 1,760 pcs planned", th: "ผลิตแล้ว 1,236 จากแผน 1,760 ชิ้น" })}</span>
          <span className="font-semibold text-amber-300">70% · {L({ en: "4% behind pace", th: "ช้ากว่าแผน 4%" })}</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-amber-400" style={{ width: "70%" }} /></div>
        <button onClick={onAct} className="btn-glow mt-4 px-4 py-2 text-sm">{L({ en: "See how to close the gap", th: "ดูแนวทางปิดช่องว่าง" })} <ArrowRight size={14} /></button>
      </Panel>
    </div>
  );
}

/* ─────────────────────────────────────────────────── 03 ai analysis ── */

function AnalysisStep({ L, onAct }: { L: (o: LZ) => string; onAct: () => void }) {
  // what-if levers — recover part of the 4% plan miss per fix enabled
  const [fixOn, setFixOn] = useState<boolean[]>(forecastFixes.map(() => false));
  const recovered = forecastFixes.reduce((s, f, i) => s + (fixOn[i] ? f.gain : 0), 0);
  const missLeft = Math.max(0, Math.round((4 - recovered) * 10) / 10);
  const onPlan = missLeft <= 0.05;
  const fcData = throughputForecast.map((p) => ({
    ...p,
    adjusted: p.forecast !== undefined && recovered > 0
      ? Math.round(p.forecast + (PLAN_RATE - p.forecast) * (recovered / 4))
      : undefined,
  }));

  return (
    <div className="space-y-6">
      {/* glass-box: the engine's reasoning trace before the curated analysis */}
      <AiReasoningTrace
        categories={["production", "vibration", "thermal"]}
        pointsLabel={{ en: "OEE · line machines · vibration/temp · now", th: "OEE · เครื่องในไลน์ · การสั่น/อุณหภูมิ · ปัจจุบัน" }}
      />
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Panel title={L({ en: "AI Anomaly & Root Cause", th: "AI ตรวจจับผิดปกติ & หาสาเหตุ" })} sub={L({ en: "Ranked by money · evidence engineers can check", th: "เรียงตามเงิน · หลักฐานที่วิศวกรตรวจได้" })} icon={Sparkles}>
          <div className="space-y-3">
            {anomalies.map((a) => (
              <div key={a.title.en} className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="text-[13px] font-medium">{L(a.title)}</p>
                  <span className="flex items-baseline gap-2">
                    <span className="tabular text-sm font-semibold text-rose-300">{a.delta}</span>
                    <span className="tabular text-[12px] font-semibold text-rose-300/90">≈฿{(a.bahtDay / 1000).toFixed(1)}K/{L({ en: "day", th: "วัน" })}</span>
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] text-white/55">{L(a.detail)}</p>
                <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-brand-400/[0.07] px-2.5 py-1.5 text-[11.5px] text-brand-200"><Sparkles size={12} className="mt-0.5 shrink-0" /> {L(a.cause)}</p>
                {/* the evidence, drawn — what separates a measured finding from decorated text */}
                <div className="mt-2.5 flex items-center gap-3 rounded-lg border border-white/6 bg-white/[0.015] px-2.5 py-2">
                  <div className="shrink-0"><Sparkline data={a.ev.series} color={a.ev.color} width={132} height={30} /></div>
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-medium text-white/60">{L(a.ev.label)}</p>
                    <p className="text-[10px] leading-snug text-white/40">{L(a.ev.note)}</p>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10.5px] text-white/35">{L({ en: "AI confidence", th: "AI มั่นใจ" })} {a.confidence}% · {L({ en: "fix", th: "ทางแก้" })}: <span className="text-white/55">{L(a.fix)}</span></span>
                  <button onClick={onAct} className="btn border border-white/15 bg-white/5 px-3 py-1 text-[11.5px] text-white/80 hover:bg-white/10">
                    {L({ en: "Act", th: "ลงมือ" })} <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel
            title={L({ en: "Throughput Forecast · What-if", th: "พยากรณ์ยอดผลิต · ลองแก้ดู" })}
            sub={L({ en: "Tick a fix — watch today's plan come back", th: "ติ๊กแก้ทีละเรื่อง แล้วดูแผนวันนี้กลับมา" })}
            icon={TrendingUp}
          >
            <MultiLine
              data={fcData}
              height={190}
              lines={[
                { key: "actual", color: "#22d3ee", name: L({ en: "Actual", th: "จริง" }) },
                { key: "forecast", color: "#f59e0b", name: L({ en: "No action", th: "ถ้าไม่ลงมือ" }), dashed: true },
                ...(recovered > 0 ? [{ key: "adjusted", color: "#34d399", name: L({ en: "With fixes", th: "ถ้าแก้ตามที่เลือก" }), dashed: true }] : []),
              ]}
            />
            <div className="mt-2.5 space-y-1.5">
              {forecastFixes.map((f, i) => (
                <div key={f.label.en} className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-white/65">{L(f.label)}</span>
                  <span className="tabular shrink-0 text-[10.5px] text-emerald-300/80">+{f.gain}%</span>
                  <Toggle on={fixOn[i]} onChange={() => setFixOn((s) => s.map((v, j) => (j === i ? !v : v)))} color="#34d399" />
                </div>
              ))}
            </div>
            <p className={cn("mt-2.5 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px]", onPlan ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-rose-400/25 bg-rose-400/10 text-rose-200")}>
              {onPlan ? <Check size={13} /> : <AlertTriangle size={13} />}
              {onPlan
                ? L({ en: "All 3 fixes on — AI projects today's plan is met", th: "แก้ครบ 3 เรื่อง — AI คาดว่าวันนี้ทันแผน" })
                : L({ en: `AI predicts a ${missLeft}% plan miss with the current selection`, th: `AI คาดว่าจะพลาดแผนวันนี้ ${missLeft}% ตามที่เลือกตอนนี้` })}
            </p>
          </Panel>
          <div className="panel border-brand-400/25 bg-brand-400/[0.05] p-5">
            <p className="text-[13px] font-semibold text-brand-200">{L({ en: "AI verdict", th: "ข้อสรุปจาก AI" })}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/65">{L({ en: "≈+6.9pp OEE is recoverable: ~45% from changeover discipline (SMED), ~35% from micro-stop & speed-loss fixes, ~20% from quality drift control. Move to actions to execute.", th: "กู้คืน OEE ได้ ≈+6.9pp: ~45% จากวินัยเปลี่ยนรุ่น (SMED), ~35% จากแก้หยุดสั้นและความเร็วตก, ~20% จากคุมคุณภาพเบี่ยง ไปหน้าลงมือเพื่อสั่งทำ" })}</p>
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
function QuoteEmailModal({ project, L, onClose, onSent }: { project: (typeof productionCapitalProjects)[number]; L: (o: LZ) => string; onClose: () => void; onSent: () => void }) {
  const title = L(project.title);
  const bom = project.parts.map((p, i) => `${i + 1}. ${L(p.name)} · ${p.brand} · ${p.partNo} · ${p.qty} × ${formatTHB(p.unitPrice)} · ${formatTHB(p.qty * p.unitPrice)}`).join("\n");
  const sig = L({
    en: `—\n${currentUser.name}\n${currentUser.title} · ${currentUser.plant}\n${currentUser.company}\n${currentUser.email} · ${currentUser.phone}`,
    th: `—\n${currentUser.name}\n${currentUser.titleTh} · ${currentUser.plant}\n${currentUser.company}\n${currentUser.email} · ${currentUser.phone}`,
  });
  const [subject, setSubject] = useState(L({ en: `Request for Quotation · ${title}`, th: `ขอใบเสนอราคา · ${title}` }));
  const [body, setBody] = useState(L({
    en: `Dear SpareX Sales team,\n\nWe would like to request a formal quotation for the following production-improvement project:\n\nProject: ${title}\nLocation: ${L(project.asset)}\nEstimated budget: ${formatTHB(project.capex)}\nReturn: saves ${formatTHB(project.savingYr)}/yr · payback ${project.paybackMo} months\n\nBill of materials:\n${bom}\n\nPlease include unit prices, lead time, warranty and installation. Equivalent brands are welcome if the specs are met.\n\nThank you,\n\n${sig}`,
    th: `เรียน ทีมขาย SpareX,\n\nทางเราขอใบเสนอราคาอย่างเป็นทางการสำหรับโครงการปรับปรุงการผลิตดังนี้:\n\nโครงการ: ${title}\nจุดติดตั้ง: ${L(project.asset)}\nงบประมาณโดยประมาณ: ${formatTHB(project.capex)}\nผลตอบแทน: ประหยัด ${formatTHB(project.savingYr)}/ปี · คืนทุน ${project.paybackMo} เดือน\n\nรายการอะไหล่ (BOM):\n${bom}\n\nรบกวนเสนอราคาต่อหน่วย ระยะเวลาส่งมอบ การรับประกัน และค่าติดตั้ง (เสนอรุ่นเทียบเท่าได้หากสเปคตรง)\n\nขอบคุณครับ/ค่ะ\n\n${sig}`,
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
  const [openId, setOpenId] = useState<string | null>(productionCapitalProjects[0]?.id ?? null);
  const [doneQw, setDoneQw] = useState<Set<string>>(new Set());
  const [poDone, setPoDone] = useState<Set<string>>(new Set());
  const [quoteFor, setQuoteFor] = useState<(typeof productionCapitalProjects)[number] | null>(null);
  const [focus, setFocus] = useState<"all" | "quick" | "capex">("all");
  const [capSev, setCapSev] = useState<"all" | "critical" | "warning" | "recommend">("all");
  const [qwFilter, setQwFilter] = useState<"all" | "pending" | "done">("all");
  const [qwSel, setQwSel] = useState<string | null>(productionQuickWins[0]?.id ?? null);
  const [qwAuto, setQwAuto] = useAiAutoQw("production", Object.fromEntries(productionQuickWins.map((q) => [q.id, true])));
  const [quoteSent, setQuoteSent] = useState<Set<string>>(new Set());
  const [acts, setActs] = useState(autos);
  const orders = useWorkOrders();

  const noCapex = productionQuickWins.reduce((s, q) => s + q.savingYr, 0);
  const capexSaving = productionCapitalProjects.reduce((s, c) => s + c.savingYr, 0);
  const capexTotal = productionCapitalProjects.reduce((s, c) => s + c.capex, 0);
  const grand = noCapex + capexSaving;
  const blended = Math.round((capexTotal / capexSaving) * 12);
  const ncPct = Math.round((noCapex / grand) * 100);
  const woFor = (id: string) => orders.find((w) => w.findingId === id);
  const hasWO = (id: string) => poDone.has(id) || !!woFor(id);

  // capital project → single Work Order for installation & commissioning (raised on budget approval)
  const raisePO = (c: (typeof productionCapitalProjects)[number]) => {
    createWorkOrder({ id: c.id, code: c.code, title: { en: `Install & commission · ${L(c.title)}`, th: `ติดตั้ง & Commissioning · ${L(c.title)}` }, asset: c.asset, severity: c.severity === "recommend" ? "advisory" : c.severity, capex: c.capex, annualSaving: c.savingYr, partsCount: c.parts.length }, "production");
    setPoDone((s) => new Set(s).add(c.id));
  };
  // quick win → one-time setup/enable Work Order (config task, no parts → goes straight to "scheduled")
  const commitQuickWin = (q: (typeof productionQuickWins)[number]) => {
    const auto = qwAuto[q.id];
    createWorkOrder({ id: q.id, code: q.id.toUpperCase(), title: { en: `${auto ? "Set up & enable AI-auto" : "Configure"} · ${L(q.title)}`, th: `${auto ? "ตั้งค่า & เปิด AI-auto" : "ตั้งค่า"} · ${L(q.title)}` }, asset: q.asset, severity: "advisory", capex: 0, annualSaving: q.savingYr, partsCount: 0 }, "production");
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
              <p className="text-[10.5px] text-white/45">{productionQuickWins.length} {L({ en: "actions · ฿0 capex", th: "รายการ · ลงทุน ฿0" })}</p>
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
              const n = id === "all" ? productionQuickWins.length : productionQuickWins.filter((q) => (doneQw.has(q.id) || hasWO(q.id)) === (id === "done")).length;
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
          {productionQuickWins.filter((q) => qwFilter === "all" || (doneQw.has(q.id) || hasWO(q.id)) === (qwFilter === "done")).map((q) => {
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
            const q = productionQuickWins.find((x) => x.id === qwSel)!;
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
              const n = id === "all" ? productionCapitalProjects.length : productionCapitalProjects.filter((c) => c.severity === id).length;
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
          {productionCapitalProjects.filter((c) => capSev === "all" || c.severity === capSev).map((c) => {
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
                            <span><span className="font-medium text-white/55">{L({ en: "Evidence", th: "หลักฐานที่เจอ" })}</span> · {L(c.evidence)} <span className="text-white/30">· {L({ en: "from the line PLC + MES signals", th: "จาก PLC ของไลน์ + สัญญาณ MES" })}</span></span>
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

      {/* Autonomous Actions — AI runs these guardrailed loops on the line */}
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

const SECTION_DEFS: { key: "summary" | "losses" | "cost" | "actions" | "mv"; title: LZ; sub: LZ }[] = [
  { key: "summary", title: { en: "OEE Summary", th: "สรุป OEE" }, sub: { en: "pillars & line status", th: "เสาหลัก + สถานะไลน์" } },
  { key: "losses", title: { en: "Six Big Losses", th: "หกการสูญเสียหลัก" }, sub: { en: "minutes by pillar", th: "นาทีแยกตามเสาหลัก" } },
  { key: "cost", title: { en: "Loss Cost", th: "มูลค่าการสูญเสีย" }, sub: { en: "cost per day", th: "ต้นทุนต่อวัน" } },
  { key: "actions", title: { en: "Recommended Actions", th: "แนวทางแก้ไข" }, sub: { en: "zero-invest + capital", th: "แก้ฟรี + โครงการลงทุน" } },
  { key: "mv", title: { en: "Measurement & Verification", th: "การวัดและพิสูจน์ผล" }, sub: { en: "planned vs verified", th: "แผนเทียบผลจริง" } },
];

/** The 4 OEE pillars shown on the report's summary (matches the Monitor step KPIs). */
const OEE_PILLARS: { label: LZ; value: number }[] = [
  { label: { en: "OEE", th: "OEE" }, value: 78.4 },
  { label: { en: "Availability", th: "อัตราพร้อมเดินเครื่อง" }, value: 88.2 },
  { label: { en: "Performance", th: "อัตราความเร็วผลิต" }, value: 92.1 },
  { label: { en: "Quality", th: "อัตราของดี" }, value: 96.5 },
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
  const qwTotal = productionQuickWins.reduce((s, q) => s + q.savingYr, 0);
  const flatLosses = sixLosses.flatMap((g) => g.items.map((it) => ({ pillar: g.pillar, color: g.color, loss: it.name, min: it.min })));

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
  const pillarColor = (v: number) => (v >= 90 ? "#059669" : v >= 80 ? PAPER.brand : "#d97706");

  return (
    <div ref={ref} style={{ width: "100%", background: PAPER.bg, color: PAPER.body, fontFamily: "'Sarabun','Segoe UI',system-ui,-apple-system,sans-serif", fontSize: 12 }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, padding: "20px 26px", borderBottom: `2px solid ${PAPER.brand}` }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-grid", placeItems: "center", width: 26, height: 26, borderRadius: 7, background: PAPER.brand, color: "#fff", fontWeight: 800, fontSize: 13 }}>S</span>
            <span style={{ fontWeight: 800, color: PAPER.ink, fontSize: 14 }}>SpareX <span style={{ color: PAPER.brand }}>FactoryOS</span></span>
          </div>
          <h1 style={{ margin: "12px 0 2px", fontSize: 20, fontWeight: 800, color: PAPER.ink }}>{L({ en: "Production Report", th: "รายงานการผลิต" })}</h1>
          <div style={{ color: PAPER.muted, fontSize: 11.5 }}>{L({ en: "OEE · losses · recovery — plant-wide", th: "OEE · การสูญเสีย · การกู้คืน — ทั้งโรงงาน" })}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11 }}>
          {meta(L({ en: "Period", th: "ช่วงเวลา" }), period)}
          {meta(L({ en: "Plant", th: "โรงงาน" }), "SpareX Demo Plant")}
          {meta(L({ en: "Generated", th: "ออกรายงาน" }), genAt || period)}
          {meta(L({ en: "Standards", th: "มาตรฐาน" }), "OEE (A·P·Q) · IPMVP")}
        </div>
      </div>

      {/* exec summary */}
      <div style={{ padding: "16px 26px", background: "#fbfdff" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: PAPER.brand, marginBottom: 9 }}>{L({ en: "Executive summary", th: "บทสรุปผู้บริหาร" })}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 9 }}>
          {kpi(L({ en: "OEE · MTD", th: "OEE · เดือนนี้" }), "79.1", "%", "#d97706")}
          {kpi(L({ en: "Output · MTD", th: "ยอดผลิต · เดือนนี้" }), "31,480", "pcs", PAPER.brand)}
          {kpi(L({ en: "Loss cost · MTD", th: "มูลค่าสูญเสีย · เดือนนี้" }), "฿1.34M", "", "#e11d48")}
          {kpi(L({ en: "Verified recovery", th: "กู้คืนที่ยืนยันแล้ว" }), formatTHB(verified), "", "#059669")}
        </div>
        <p style={{ margin: "11px 0 0", color: PAPER.body, fontSize: 12, lineHeight: 1.55 }}>
          {L({
            en: "This period ran at 79.1% OEE — 5.9 points under the 85% target. The dominant loss is changeover (96 min); the fastest, zero-invest relief is the SMED die pre-heat checklist on Line C.",
            th: "ช่วงนี้ OEE 79.1% — ต่ำกว่าเป้า 85% อยู่ 5.9 จุด การสูญเสียหลักคือเปลี่ยนรุ่น (96 นาที) แก้เร็วสุดแบบไม่ลงทุนคือเช็กลิสต์อุ่นแม่พิมพ์ SMED ที่ Line C",
          })}
        </p>
      </div>

      {/* 01 · OEE summary */}
      {sec.summary && (
        <div style={wrapS}>
          {secHead(L({ en: "OEE Summary", th: "สรุป OEE" }), L({ en: "the four pillars & every line", th: "สี่เสาหลัก + ทุกไลน์" }))}
          <table style={{ ...tableS, marginBottom: 14 }}>
            <thead><tr>{OEE_PILLARS.map((p, i) => <th key={i} style={{ ...thS, textAlign: "center" }}>{L(p.label)}</th>)}</tr></thead>
            <tbody><tr>{OEE_PILLARS.map((p, i) => <td key={i} style={{ ...tdS, textAlign: "center", fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: 15, color: pillarColor(p.value) }}>{p.value.toFixed(1)}%</td>)}</tr></tbody>
          </table>
          <table style={tableS}>
            <thead><tr>{[L({ en: "Line", th: "ไลน์" }), L({ en: "Status", th: "สถานะ" }), "OEE", L({ en: "Output", th: "ยอดผลิต" })].map((h, i) => <th key={i} style={{ ...thS, textAlign: i >= 2 ? "right" : "left" }}>{h}</th>)}</tr></thead>
            <tbody>
              {lines.map((l) => {
                const s = LINE_STYLE[l.status];
                return (
                  <tr key={l.name}>
                    <td style={{ ...tdS, fontWeight: 700, color: PAPER.ink }}>{l.name}</td>
                    <td style={tdS}>{chip(L(s.label), s.color)}</td>
                    <td style={{ ...tdNum, color: l.oee >= 80 ? "#059669" : l.oee >= 70 ? "#d97706" : "#e11d48" }}>{l.oee}%</td>
                    <td style={{ ...tdNum, color: PAPER.muted, fontWeight: 600 }}>{l.out} pcs</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 02 · six big losses */}
      {sec.losses && (
        <div style={wrapS}>
          {secHead(L({ en: "Six Big Losses", th: "หกการสูญเสียหลัก" }), L({ en: "where OEE leaks · by A·P·Q", th: "OEE รั่วตรงไหน · แยกตาม A·P·Q" }))}
          <table style={tableS}>
            <thead><tr>{[L({ en: "Pillar", th: "เสาหลัก" }), L({ en: "Loss", th: "การสูญเสีย" }), L({ en: "Minutes", th: "นาที" })].map((h, i) => <th key={i} style={{ ...thS, textAlign: i === 2 ? "right" : "left" }}>{h}</th>)}</tr></thead>
            <tbody>
              {flatLosses.map((r, i) => (
                <tr key={i}>
                  <td style={tdS}><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 99, background: r.color, marginRight: 6 }} />{L(r.pillar)}</td>
                  <td style={{ ...tdS, color: PAPER.ink }}>{L(r.loss)}</td>
                  <td style={tdNum}>{r.min}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 03 · loss cost */}
      {sec.cost && (
        <div style={wrapS}>
          {secHead(L({ en: "Loss Cost", th: "มูลค่าการสูญเสีย" }), L({ en: "what each stoppage costs per day", th: "แต่ละการหยุดเสียเงินวันละเท่าไร" }))}
          <table style={tableS}>
            <thead><tr>{[L({ en: "Loss", th: "การสูญเสีย" }), L({ en: "Minutes", th: "นาที" }), L({ en: "Cost/day", th: "ต้นทุน/วัน" })].map((h, i) => <th key={i} style={{ ...thS, textAlign: i >= 1 ? "right" : "left" }}>{h}</th>)}</tr></thead>
            <tbody>
              {downtimePareto.map((d) => (
                <tr key={d.name}>
                  <td style={{ ...tdS, color: PAPER.ink }}>{d.name}</td>
                  <td style={{ ...tdNum, color: PAPER.muted }}>{d.value}</td>
                  <td style={{ ...tdNum, color: "#e11d48" }}>{formatTHB(d.value * 158)}</td>
                </tr>
              ))}
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
            <tbody>{productionQuickWins.map((q) => (
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
            <tbody>{productionCapitalProjects.map((c) => {
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
          {secHead(L({ en: "Measurement & Verification (IPMVP)", th: "การวัดและพิสูจน์ผล (M&V)" }), L({ en: "planned savings vs verified", th: "ที่วางแผนเทียบที่ยืนยันแล้ว" }))}
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
            </tbody>
          </table>
        </div>
      )}

      {/* footer */}
      <div style={{ padding: "12px 26px", borderTop: `1px solid ${PAPER.line}`, color: PAPER.faint, fontSize: 10, display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span>{L({ en: "Every figure traces to machine signals & the line PLC — no estimates.", th: "ทุกตัวเลขตรวจย้อนถึงสัญญาณเครื่องจักร & PLC ของไลน์ — ไม่มีการประมาณ" })}</span>
        <span style={{ whiteSpace: "nowrap" }}>SpareX FactoryOS · Production</span>
      </div>
    </div>
  );
});

function ReportStep({ L }: { L: (o: LZ) => string }) {
  const { locale } = useI18n();
  const [range, setRange] = useState<"today" | "month">("month");
  const [sec, setSec] = useState<Record<string, boolean>>({ summary: true, losses: true, cost: true, actions: true, mv: true });
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
      `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>SpareX · Production Report</title>` +
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
    let body = `<h2 style="font-family:Tahoma;margin:0 0 4px">${esc(L({ en: "Production Report", th: "รายงานการผลิต" }))}</h2>`;
    body += `<p style="font-family:Tahoma;font-size:12px;color:#475569;margin:0 0 12px">${esc(L({ en: "Plant", th: "โรงงาน" }))}: SpareX Demo Plant &nbsp;|&nbsp; ${esc(L({ en: "Period", th: "ช่วงเวลา" }))}: ${esc(period)}</p>`;

    if (sec.summary) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "OEE Summary", th: "สรุป OEE" }))}</h3><table style="${tbl}"><tr>${OEE_PILLARS.map((p) => th(L(p.label))).join("")}</tr><tr>${OEE_PILLARS.map((p) => td(p.value.toFixed(1) + "%")).join("")}</tr></table><br/>`;
      body += `<table style="${tbl}"><tr>${[L({ en: "Line", th: "ไลน์" }), L({ en: "Status", th: "สถานะ" }), "OEE", L({ en: "Output", th: "ยอดผลิต" })].map(th).join("")}</tr>`;
      lines.forEach((l) => { body += `<tr>${td(l.name)}${td(L(LINE_STYLE[l.status].label))}${td(l.oee + "%")}${td(l.out + " pcs")}</tr>`; });
      body += `</table><br/>`;
    }
    if (sec.losses) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "Six Big Losses", th: "หกการสูญเสียหลัก" }))}</h3><table style="${tbl}"><tr>${[L({ en: "Pillar", th: "เสาหลัก" }), L({ en: "Loss", th: "การสูญเสีย" }), L({ en: "Minutes", th: "นาที" })].map(th).join("")}</tr>`;
      sixLosses.forEach((g) => g.items.forEach((it) => { body += `<tr>${td(L(g.pillar))}${td(L(it.name))}${td(it.min)}</tr>`; }));
      body += `</table><br/>`;
    }
    if (sec.cost) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "Loss Cost", th: "มูลค่าการสูญเสีย" }))}</h3><table style="${tbl}"><tr>${[L({ en: "Loss", th: "การสูญเสีย" }), L({ en: "Minutes", th: "นาที" }), L({ en: "Cost/day", th: "ต้นทุน/วัน" })].map(th).join("")}</tr>`;
      downtimePareto.forEach((d) => { body += `<tr>${td(d.name)}${td(d.value)}${td(formatTHB(d.value * 158))}</tr>`; });
      body += `</table><br/>`;
    }
    if (sec.actions) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "Recommended Actions — zero-invest", th: "แนวทางแก้ไข — แก้ฟรี" }))}</h3><table style="${tbl}"><tr>${[L({ en: "Action", th: "สิ่งที่ทำ" }), L({ en: "Asset", th: "จุด" }), L({ en: "Saving/yr", th: "ประหยัด/ปี" }), L({ en: "Effort", th: "แรงที่ใช้" })].map(th).join("")}</tr>`;
      productionQuickWins.forEach((q) => { body += `<tr>${td(L(q.title))}${td(L(q.asset))}${td(formatTHB(q.savingYr))}${td(L(q.effort))}</tr>`; });
      body += `</table><br/><h3 style="font-family:Tahoma">${esc(L({ en: "Recommended Actions — capital", th: "แนวทางแก้ไข — โครงการลงทุน" }))}</h3><table style="${tbl}"><tr>${[L({ en: "Code", th: "รหัส" }), L({ en: "Project", th: "โครงการ" }), L({ en: "Capex", th: "เงินลงทุน" }), L({ en: "Saving/yr", th: "ประหยัด/ปี" }), L({ en: "Payback (mo)", th: "คืนทุน (เดือน)" })].map(th).join("")}</tr>`;
      productionCapitalProjects.forEach((c) => { body += `<tr>${td(c.code)}${td(L(c.title))}${td(formatTHB(c.capex))}${td(formatTHB(c.savingYr))}${td(c.paybackMo)}</tr>`; });
      body += `</table><br/>`;
    }
    if (sec.mv) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "Measurement & Verification (IPMVP)", th: "การวัดและพิสูจน์ผล (M&V)" }))}</h3><table style="${tbl}"><tr>${[L({ en: "Action", th: "การดำเนินการ" }), L({ en: "Planned", th: "แผน" }), L({ en: "Verified", th: "ยืนยันแล้ว" }), "Delta %"].map(th).join("")}</tr>`;
      mv.forEach((m) => { const delta = Math.round((m.verified / m.planned - 1) * 100); body += `<tr>${td(L(m.action))}${td(formatTHB(m.planned))}${td(formatTHB(m.verified))}${td((delta >= 0 ? "+" : "") + delta + "%")}</tr>`; });
      body += `</table>`;
    }
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Production Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>${body}</body></html>`;
    const blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `SpareX-Production-Report-${range}.xls`;
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
