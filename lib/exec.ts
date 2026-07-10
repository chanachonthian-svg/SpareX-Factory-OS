/** Executive Briefing — decision-first data layer.
 *  Everything is tied to a THB impact; lists are pre-sorted by that impact.
 *  Deterministic mock stand-in for the live feed. Bilingual inline (EN/TH). */

export type LZ = { en: string; th: string };
export type ExecRole = "CEO" | "COO" | "CFO";

export const execRoles: { id: ExecRole; label: LZ; headline: LZ; kpiOrder: string[] }[] = [
  {
    id: "CEO", label: { en: "CEO", th: "CEO" },
    headline: { en: "Plant performance & ESG, board-ready in one view", th: "ผลงานโรงงาน & ESG พร้อมเข้าบอร์ดในหน้าเดียว" },
    kpiOrder: ["oee", "energy", "cost", "carbon", "risk"],
  },
  {
    id: "COO", label: { en: "COO", th: "COO" },
    headline: { en: "Throughput, downtime & daily loss recovery", th: "กำลังผลิต ดาวน์ไทม์ & กู้คืนความสูญเสียรายวัน" },
    kpiOrder: ["oee", "risk", "cost", "energy", "carbon"],
  },
  {
    id: "CFO", label: { en: "CFO", th: "CFO" },
    headline: { en: "Revenue at risk, spend & ROI on every action", th: "รายได้ที่เสี่ยง ค่าใช้จ่าย & ROI ทุกการตัดสินใจ" },
    kpiOrder: ["cost", "energy", "risk", "oee", "carbon"],
  },
];

/* ── Money today · 3 lenses ───────────────────────────────────────────────── */
export const moneyToday = {
  atRisk: 127_000,        // ฿ exposure if today's issues go unresolved
  savedByAi: 62_000,      // ฿ AI actions already captured today
  opportunityYr: 850_000, // ฿/yr of opportunities waiting for a decision
};

/* ── KPIs · value + 7-day trend + "so what" (all money-tied) ──────────────── */
export type ExecKpi = {
  id: string;
  label: LZ;
  value: string;
  unit: string;
  spark?: number[];
  trendPct: number;    // vs yesterday / target — sign matters
  goodWhenUp: boolean;
  soWhat: LZ;          // the decision hook — always references ฿ or a target
  accent: string;      // saturated hex for the sparkline
};

export const execKpis: ExecKpi[] = [
  {
    id: "oee", label: { en: "Overall OEE", th: "OEE รวม" }, value: "87", unit: "%",
    spark: [85, 86, 84, 87, 88, 86, 87], trendPct: -5.4, goodWhenUp: true,
    soWhat: { en: "5pt below 92% target ≈ ฿180K/wk lost · driver: Line B", th: "ต่ำกว่าเป้า 92% อยู่ 5 จุด ≈ เสีย ฿180K/สัปดาห์ · ต้นเหตุ: สาย B" },
    accent: "#34d399",
  },
  {
    id: "energy", label: { en: "Energy · today", th: "พลังงาน · วันนี้" }, value: "฿1.27M", unit: "",
    spark: [1180, 1210, 1240, 1190, 1305, 1260, 1270], trendPct: 6, goodWhenUp: false,
    soWhat: { en: "+6% vs yesterday · on-peak overrun, ฿90K/mo recoverable", th: "+6% เทียบเมื่อวาน · เกินช่วง on-peak · ลดได้ ฿90K/เดือน" },
    accent: "#22d3ee",
  },
  {
    id: "cost", label: { en: "Cost / unit", th: "ต้นทุน/หน่วย" }, value: "฿11.84", unit: "",
    spark: [12.3, 12.1, 12.0, 11.9, 11.8, 11.85, 11.84], trendPct: -3, goodWhenUp: false,
    soWhat: { en: "improving 3% this month — energy actions landing", th: "ดีขึ้น 3% เดือนนี้ — มาตรการพลังงานเริ่มเห็นผล" },
    accent: "#4ade80",
  },
  {
    id: "carbon", label: { en: "Carbon", th: "คาร์บอน" }, value: "555", unit: "kg/h",
    spark: [540, 548, 552, 560, 550, 556, 555], trendPct: 14, goodWhenUp: false,
    soWhat: { en: "+14% over ESG target · risks the Q3 commitment", th: "เกินเป้า ESG 14% · เสี่ยงพลาดคำมั่น Q3" },
    accent: "#a78bfa",
  },
  {
    id: "risk", label: { en: "Open risks", th: "ความเสี่ยงที่เปิดอยู่" }, value: "7", unit: "",
    trendPct: 0, goodWhenUp: false,
    soWhat: { en: "3 critical · ฿127K exposed today", th: "3 วิกฤต · เสี่ยง ฿127K วันนี้" },
    accent: "#f59e0b",
  },
];

/* ── Production vs plan — will we hit the month? ──────────────────────────── */
export const production = {
  unit: { en: "units", th: "ชิ้น" },
  target: 42_000,
  actualMtd: 38_600,
  projectedMonthEnd: 40_100,
  dayOfMonth: 27,
  daysInMonth: 31,
};

/* ── Active incidents · sorted by financial impact ───────────────────────── */
export type ExecIncident = {
  id: string;
  name: LZ;
  asset: LZ;
  severity: "critical" | "warning";
  elapsed: LZ;
  lossToday: number;   // ฿ if unresolved today
  action: LZ;          // recommended action
};

export const execIncidents: ExecIncident[] = [
  {
    id: "inc-pump", name: { en: "Pump P-203 failure risk", th: "Pump P-203 เสี่ยงเสียหาย" },
    asset: { en: "Chilled-water pump", th: "Chilled-water pump" }, severity: "critical", elapsed: { en: "47 min", th: "47 นาที" },
    lossToday: 62_000, action: { en: "Approve bearing service + spare on standby", th: "อนุมัติซ่อมแบริ่ง + เตรียมอะไหล่สำรอง" },
  },
  {
    id: "inc-comp", name: { en: "Compressor #2 energy waste", th: "Compressor #2 ใช้พลังงานสิ้นเปลือง" },
    asset: { en: "Air compressor", th: "Air compressor" }, severity: "warning", elapsed: { en: "2h 10m", th: "2 ชม. 10 นาที" },
    lossToday: 40_000, action: { en: "Let AI re-schedule off on-peak", th: "ให้ AI ปรับตารางเลี่ยง on-peak" },
  },
  {
    id: "inc-lineb", name: { en: "Line B changeover losses", th: "สาย B เสียเวลา changeover" },
    asset: { en: "Packing line", th: "ไลน์แพ็ก" }, severity: "warning", elapsed: { en: "3h 05m", th: "3 ชม. 05 นาที" },
    lossToday: 25_000, action: { en: "Dispatch technician — voltage sags tripping line", th: "ส่งช่าง — ไฟตกทำสายหลุด" },
  },
];

/* ── Today's opportunities · sorted by ROI (the recommended actions) ──────── */
export type ExecAction = { id: string; action: LZ; area: LZ; roiYr: number; effort: LZ };

export const execActions: ExecAction[] = [
  { id: "act-comp", action: { en: "Re-schedule compressors off on-peak", th: "ปรับตาราง Compressor เลี่ยง on-peak" }, area: { en: "Energy", th: "พลังงาน" }, roiYr: 380_000, effort: { en: "Zero capex", th: "ไม่ต้องลงทุน" } },
  { id: "act-shift", action: { en: "Shift deferrable load to off-peak", th: "เลื่อนโหลดที่เลื่อนได้ไปออฟพีค" }, area: { en: "Energy", th: "พลังงาน" }, roiYr: 300_000, effort: { en: "Zero capex", th: "ไม่ต้องลงทุน" } },
  { id: "act-idle", action: { en: "Auto-standby idle machines >15 min", th: "auto-standby เครื่องที่ Idle เกิน 15 นาที" }, area: { en: "Energy", th: "พลังงาน" }, roiYr: 170_000, effort: { en: "Zero capex", th: "ไม่ต้องลงทุน" } },
];

/* ── Predictive horizon · next 7 days · sorted by expected value ──────────── */
export type ExecPrediction = { id: string; issue: LZ; asset: LZ; etaDays: number; probability: number; impact: number; preventCost: number };

export const execPredictions: ExecPrediction[] = [
  { id: "pred-pump", issue: { en: "P-203 bearing seizure", th: "แบริ่ง P-203 ล็อก" }, asset: { en: "Chilled-water pump", th: "Chilled-water pump" }, etaDays: 3, probability: 82, impact: 1_400_000, preventCost: 62_000 },
  { id: "pred-comp", issue: { en: "Compressor efficiency cliff", th: "ประสิทธิภาพ Compressor ตก" }, asset: { en: "Air compressor 10", th: "Air compressor 10" }, etaDays: 5, probability: 58, impact: 420_000, preventCost: 45_000 },
];

/* ── Benchmark · executives think in comparisons ──────────────────────────── */
export const benchmark = {
  health: 89,
  vsYesterday: 2,
  vsLastMonth: 5,
  plants: [
    { id: "bkk1", name: { en: "Bangkok 1", th: "กรุงเทพ 1" }, health: 89, self: true },
    { id: "ryg2", name: { en: "Rayong 2", th: "ระยอง 2" }, health: 84, self: false },
    { id: "cbi3", name: { en: "Chonburi 3", th: "ชลบุรี 3" }, health: 91, self: false },
  ],
};

/* ── Scenario simulator · "what if a line stops?" ─────────────────────────── */
export type ScenarioLine = { id: string; name: LZ; dailyRevenue: number; slaBufferDays: number; carbonPerDay: number };

export const scenarioLines: ScenarioLine[] = [
  { id: "a", name: { en: "Line A", th: "สาย A" }, dailyRevenue: 3_100_000, slaBufferDays: 3, carbonPerDay: 11 },
  { id: "b", name: { en: "Line B", th: "สาย B" }, dailyRevenue: 2_400_000, slaBufferDays: 2, carbonPerDay: 8 },
  { id: "c", name: { en: "Line C", th: "สาย C" }, dailyRevenue: 1_600_000, slaBufferDays: 4, carbonPerDay: 5 },
];

export const thbCompact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return "฿" + (n / 1_000_000).toFixed(a % 1_000_000 === 0 ? 0 : 2).replace(/\.?0+$/, "") + "M";
  if (a >= 1_000) return "฿" + Math.round(n / 1_000) + "K";
  return "฿" + n;
};

/* ── AI briefing · the 5-part executive voice (summary → findings → why → impact → next) ── */
export const execAiBrief = {
  confidence: 84,
  summary: { en: "The plant is making money on plan today — but ฿1.4M is hanging on one pump, and acting today costs 20× less than waiting.", th: "วันนี้โรงงานทำเงินตามแผน แต่มีเงิน ฿1.4M แขวนอยู่กับปั๊มตัวเดียว — ตัดสินใจวันนี้ถูกกว่ารอถึง 20 เท่า" },
  findings: [
    { en: "Production is on plan and quality escapes are zero for 14 days", th: "การผลิตเดินตามแผน และ 14 วันแล้วไม่มีของเสียหลุดถึงลูกค้า" },
    { en: "Pump P-203 has an 82% chance of bearing seizure within ~3 days (฿1.4M impact)", th: "Pump P-203 มีโอกาส 82% ที่แบริ่งจะล็อกภายใน ~3 วัน (กระทบ ฿1.4M)" },
    { en: "Compressor #2 wastes ฿380K/yr running through on-peak hours", th: "Compressor #2 เดินช่วง on-peak เปลืองไฟ ฿380K/ปี" },
  ],
  why: { en: "P-203's vibration is climbing the same way it did before the last seizure — the most likely explanation is a failing bearing, not a sensor issue.", th: "ความสั่นของ P-203 ไต่ขึ้นแบบเดียวกับก่อนเคสแบริ่งล็อกครั้งที่แล้ว — คำอธิบา·ี่เป็นไปได้สุดคือแบริ่งกำลังเสีย ไม่ใช่เซนเซอร์เพี้ยน" },
  impact: { en: "If P-203 fails: the cooling loop stops, deliveries slip ~฿1.4M, and the whole week's plan gets re-shuffled around an emergency repair.", th: "ถ้า P-203 พังจริง: ระบบน้ำเย็นหยุด งานส่งมอบสะดุด ~฿1.4M และแผนทั้งสัปดาห์ต้องรื้อมารับงานซ่อมฉุกเฉิน" },
  recommendation: { en: "Approve the ฿62K P-203 repair today and shift Compressor #2 off-peak — two decisions worth ฿1.78M.", th: "อนุมัติซ่อม P-203 (฿62K) วันนี้ และย้าย Compressor #2 ไปเดินนอก on-peak — สองเรื่องนี้มีมูลค่ารวม ฿1.78M" },
  actionLabel: { en: "Review the decisions below", th: "ดูรา·ารตัดสินใจด้านล่าง" },
};
