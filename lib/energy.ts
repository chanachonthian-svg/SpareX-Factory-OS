import type { Locale } from "./dict";
import { assets, type Asset } from "./factory";

/* ------------------------------------------------------------- sub-nav tabs */

export type EnergyTabId =
  | "overview"
  | "live"
  | "flow"
  | "cost"
  | "machine"
  | "health"
  | "anomaly"
  | "peak"
  | "demand"
  | "opportunity"
  | "roi"
  | "copilot"
  | "autonomous";

export const energyTabs: {
  id: EnergyTabId;
  icon: string;
  labels: Record<Locale, string>;
}[] = [
  { id: "overview", icon: "gauge", labels: { en: "Overview", th: "ภาพรวม", ja: "概要", zh: "概览" } },
  { id: "live", icon: "activity", labels: { en: "Live Monitoring", th: "มอนิเตอร์เรียลไทม์", ja: "ライブ監視", zh: "实时监控" } },
  { id: "flow", icon: "flow", labels: { en: "Energy Flow", th: "การไหลของพลังงาน", ja: "エネルギーフロー", zh: "能流" } },
  { id: "cost", icon: "coins", labels: { en: "Cost Intelligence", th: "อัจฉริยะต้นทุน", ja: "コスト分析", zh: "成本智能" } },
  { id: "machine", icon: "cpu", labels: { en: "Machine Analytics", th: "วิเคราะห์รายเครื่อง", ja: "設備分析", zh: "设备分析" } },
  { id: "health", icon: "heart", labels: { en: "Energy Health Score", th: "คะแนนสุขภาพพลังงาน", ja: "エネルギーヘルス", zh: "能源健康评分" } },
  { id: "anomaly", icon: "alert", labels: { en: "Anomaly Detection", th: "ตรวจจับความผิดปกติ", ja: "異常検知", zh: "异常检测" } },
  { id: "peak", icon: "shield", labels: { en: "PeakShield AI", th: "PeakShield AI", ja: "PeakShield AI", zh: "PeakShield AI" } },
  { id: "demand", icon: "sliders", labels: { en: "Demand Optimization", th: "เพิ่มประสิทธิภาพดีมานด์", ja: "デマンド最適化", zh: "需量优化" } },
  { id: "opportunity", icon: "sparkles", labels: { en: "Opportunity Center", th: "ศูนย์โอกาส", ja: "機会センター", zh: "机会中心" } },
  { id: "roi", icon: "calculator", labels: { en: "ROI Calculator", th: "เครื่องคำนวณ ROI", ja: "ROI計算機", zh: "ROI 计算器" } },
  { id: "copilot", icon: "spark", labels: { en: "Energy Copilot", th: "ผู้ช่วยพลังงาน", ja: "エネルギーコパイロット", zh: "能源副驾驶" } },
  { id: "autonomous", icon: "bot", labels: { en: "Autonomous Energy", th: "พลังงานอัตโนมัติ", ja: "自律エネルギー", zh: "自主能源" } },
];

/** Functional groups for the workspace sub-navigation. */
export const energyGroups: { key: string; labels: Record<Locale, string>; items: EnergyTabId[] }[] = [
  { key: "monitor", labels: { en: "Monitor", th: "มอนิเตอร์", ja: "モニター", zh: "监控" }, items: ["overview", "live", "flow", "machine"] },
  { key: "analyze", labels: { en: "Analyze", th: "วิเคราะห์", ja: "分析", zh: "分析" }, items: ["cost", "health", "anomaly"] },
  { key: "optimize", labels: { en: "Optimize", th: "เพิ่มประสิทธิภาพ", ja: "最適化", zh: "优化" }, items: ["peak", "demand", "opportunity", "roi"] },
  { key: "act", labels: { en: "Act", th: "ดำเนินการ", ja: "アクション", zh: "执行" }, items: ["copilot", "autonomous"] },
];

/* ------------------------------------------------------------------- tariff */

export const tariff = {
  contractDemand: 3000, // kW
  onPeakRate: 4.3297,
  offPeakRate: 2.6369,
  demandCharge: 132.93, // ฿/kW
};

/** 12-month bill history + MES output, derived index-for-index from one coherent
 *  factory-year model (lib/plant-year) so the ฿ bill, the kWh, the peak demand and
 *  the carbon all reconcile month-to-month. Last entry = current month-to-date. */
export { monthlyBills, monthlyUnits } from "./plant-year";

/** Loads that can be time-shifted into the cheap off-peak window. Sourced from the same asset
 *  registry the Settings screen manages (single source of truth) — only genuinely deferrable
 *  machines (buffered by air receivers, thermal storage or batteries) qualify. `save` = kw ×
 *  TOU spread × ~88 on-peak hours shifted/mo. `recommended` = AI's default plan. */
export type ShiftLoad = { id: string; name: string; kw: number; save: number; recommended: boolean; why: LZ };
const shiftSpec: { id: string; recommended: boolean; why: LZ }[] = [
  { id: "comp-10", recommended: true, why: { en: "Fill air receivers overnight", th: "อัดลมเข้าถังเก็บช่วงกลางคืน" } },
  { id: "chiller-15", recommended: true, why: { en: "Pre-cool to shave the day peak", th: "ทำความเย็นล่วงหน้าเพื่อลดพีคกลางวัน" } },
  { id: "comp-16", recommended: true, why: { en: "Charge the second receiver bank off-peak", th: "อัดลมถังสำรองชุดที่สองช่วงออฟพีค" } },
  { id: "agv-06", recommended: false, why: { en: "Charge the mobile fleet off-peak", th: "ชาร์จฟลีตรถ AMR ช่วงออฟพีค" } },
  { id: "pump-18", recommended: false, why: { en: "Runs with the chilled-water loop", th: "ทำงานคู่กับลูปน้ำเย็น" } },
  { id: "wwt-20", recommended: false, why: { en: "Dissolved oxygen holds through the night", th: "ค่าออกซิเจนคงอยู่ข้ามคืนได้" } },
  { id: "ct-17", recommended: false, why: { en: "Pairs with off-peak cooling", th: "จับคู่กับการทำความเย็นช่วงออฟพีค" } },
];
export const shiftableLoads: ShiftLoad[] = shiftSpec.flatMap((s) => {
  const a = assets.find((x) => x.id === s.id);
  if (!a) return [];
  return [{ id: a.id, name: a.name, kw: a.powerKw, save: Math.round(a.powerKw * (tariff.onPeakRate - tariff.offPeakRate) * 88), recommended: s.recommended, why: s.why }];
});

/* --------------------------------------------------- savings portfolio (M&V) */

export type SaveStatus = "active" | "ready" | "planned";
/** Savings measures with decision data: ฿/yr, capex, payback, confidence, status.
 *  `source` = the metered signal / analysis that surfaced the measure. */
export const savingMeasures: { name: string; detail: string; saving: number; capex: number; paybackMo: number; confidence: number; status: SaveStatus; source: string }[] = [
  { name: "Peak Optimization", detail: "Automated load-shed + pre-cooling off-peak.", saving: 1_200_000, capex: 0, paybackMo: 0, confidence: 92, status: "active", source: "Demand charge 34% of bill · monthly peak 3,150 kW over contract" },
  { name: "Idle Machine Shutdown", detail: "Auto-standby for machines idling >15 min.", saving: 340_000, capex: 0, paybackMo: 0, confidence: 95, status: "active", source: "Metered idle draw 128 kWh/day across 6 machines" },
  { name: "Compressor Sequencing", detail: "Lead/lag staging to match air demand.", saving: 850_000, capex: 120_000, paybackMo: 2, confidence: 88, status: "ready", source: "Air demand vs supply mismatch · 2 compressors poorly staged" },
  { name: "Chiller Optimization", detail: "Setpoint + staging tuning across the plant.", saving: 620_000, capex: 260_000, paybackMo: 5, confidence: 84, status: "ready", source: "Chiller draws 12% over design for the same PLC load · setpoint drift" },
  { name: "LED + HVAC Retrofit", detail: "Facility lighting + AHU VSD upgrade.", saving: 480_000, capex: 1_400_000, paybackMo: 35, confidence: 76, status: "planned", source: "Equipment audit · 4,200 legacy fixtures · AHU without VSD" },
  { name: "Solar Rooftop 500 kWp", detail: "Offset daytime on-peak with PV.", saving: 1_950_000, capex: 9_500_000, paybackMo: 58, confidence: 80, status: "planned", source: "2,400 m² usable roof · 68% of load is daytime on-peak" },
];

/** Verified monthly savings vs the pre-AI baseline (measurement & verification). */
export const realizedSavings: { month: string; saved: number }[] = [
  { month: "Jan", saved: 42_000 },
  { month: "Feb", saved: 55_000 },
  { month: "Mar", saved: 88_000 },
  { month: "Apr", saved: 104_000 },
  { month: "May", saved: 121_000 },
  { month: "Jun", saved: 128_000 },
];

/** Daily peak demand (kW) this month — the 24th breached the 3,000 kW contract. */
export const dailyPeaks: { day: string; kw: number; breach?: boolean }[] = [
  { day: "11", kw: 2710 }, { day: "12", kw: 2680 }, { day: "13", kw: 2820 }, { day: "14", kw: 2760 },
  { day: "15", kw: 2900 }, { day: "16", kw: 2850 }, { day: "17", kw: 2790 }, { day: "18", kw: 2870 },
  { day: "19", kw: 2760 }, { day: "20", kw: 2830 }, { day: "21", kw: 2910 }, { day: "22", kw: 2880 },
  { day: "23", kw: 2840 }, { day: "24", kw: 3150, breach: true }, { day: "25", kw: 2900 },
];

/* ---------------------------------------------------------- live load areas */

export const liveAreas = [
  { area: "Production Line A", kw: 196, color: "#22d3ee" },
  { area: "Production Line B", kw: 376, color: "#34d399" },
  { area: "Utility & Facility", kw: 668, color: "#818cf8" },
  { area: "HVAC & Lighting", kw: 142, color: "#f59e0b" },
  { area: "Compressed Air", kw: 206, color: "#f472b6" },
];

export const totalLiveKw = liveAreas.reduce((s, a) => s + a.kw, 0);

/* -------------------------------------------------------- per-machine energy */

const blendedRate = 3.5; // ฿/kWh blended
const runHours = 20;

export const machineEnergy = assets
  .filter((a) => a.powerKw > 0)
  .map((a) => {
    const kwhDay = Math.round(a.powerKw * runHours);
    return {
      id: a.id,
      name: a.name,
      category: a.category,
      powerKw: a.powerKw,
      kwhDay,
      thbDay: Math.round(kwhDay * blendedRate),
    };
  })
  .sort((x, y) => y.powerKw - x.powerKw);

export const totalMachineKw = machineEnergy.reduce((s, m) => s + m.powerKw, 0);

/* --------------------------------------- consumption rollups (Area / Plant) */

export const areaEnergy = liveAreas.map((a) => ({
  name: a.area,
  kwhDay: a.kw * runHours,
  thbDay: Math.round(a.kw * runHours * blendedRate),
}));

/* ------------------------------------------------------ MTD peak analytics */

export const mtdDays = 22;
/** The month's peak-demand event — Wednesday, inside the typical 13–15h window. */
export const peakEvent = { kw: 3150, day: "Wed · Jun 24", time: "13:42" };
/** Typical load shape by hour (0–23), % of max — crests 13:00–15:00. */
export const hourlyLoadShape = [38, 35, 33, 32, 31, 32, 40, 52, 64, 74, 80, 84, 88, 96, 100, 94, 86, 80, 74, 70, 66, 60, 50, 42];
export const peakWindow = { from: 13, to: 15, share: 78 };
/** Average daily consumption by weekday (MWh) — Wednesday runs heaviest. */
export const weekdayEnergy = [
  { d: "Mon", mwh: 218 },
  { d: "Tue", mwh: 224 },
  { d: "Wed", mwh: 232 },
  { d: "Thu", mwh: 226 },
  { d: "Fri", mwh: 221 },
  { d: "Sat", mwh: 172 },
  { d: "Sun", mwh: 148 },
];

/** Multi-site rollup — Plant 1 matches today's TOU totals (142k + 86k kWh). */
export const plantEnergy = [
  { name: "Bangkok Plant 1 · this plant", kwhDay: 228_000, thbDay: 841_590 },
  { name: "Rayong Plant", kwhDay: 341_000, thbDay: 1_258_000 },
  { name: "Bangkok Plant 2", kwhDay: 164_000, thbDay: 605_000 },
];

/* ------------------------------------------------- power quality (PQ) data */

export type PQSeverity = "warning" | "critical";

/** Live-ish incomer snapshot — three-phase, harmonics & power triangle. */
export const powerQuality = {
  score: 94, // 0–100 PQ health index
  freq: 50.0, // Hz
  vthd: 3.0, // voltage THD % (IEEE-519 limit 5)
  ithd: 6.4, // current THD % (IEEE-519 limit 8)
  vUnbalance: 0.7, // %
  iUnbalance: 3.2, // %
  pfTrue: 0.96,
  pfDisplacement: 0.98,
  kw: 2840,
  kvar: 690,
  kva: 2920,
  phases: [
    { name: "L1", volt: 401, amp: 3980, thd: 2.9 },
    { name: "L2", volt: 399, amp: 4120, thd: 3.4 },
    { name: "L3", volt: 402, amp: 3860, thd: 2.6 },
  ],
};

/** Harmonic spectrum — odd orders, % of fundamental (voltage & current). */
export const harmonics = [
  { order: 3, v: 1.8, i: 4.2 },
  { order: 5, v: 2.4, i: 5.1 },
  { order: 7, v: 1.5, i: 3.3 },
  { order: 9, v: 0.7, i: 1.4 },
  { order: 11, v: 0.9, i: 2.1 },
  { order: 13, v: 0.5, i: 1.2 },
  { order: 15, v: 0.3, i: 0.7 },
];

/** Compliance limits (IEEE-519 / EN 50160). */
export const pqStandards = [
  { code: "IEEE 519", metric: "Voltage THD", value: 3.0, limit: 5.0, unit: "%" },
  { code: "IEEE 519", metric: "Current THD", value: 6.4, limit: 8.0, unit: "%" },
  { code: "EN 50160", metric: "Voltage unbalance", value: 0.7, limit: 2.0, unit: "%" },
  { code: "EN 50160", metric: "Flicker · Pst", value: 0.6, limit: 1.0, unit: "" },
  { code: "IEC 61000", metric: "Frequency dev.", value: 0.02, limit: 1.0, unit: "%" },
];

/** Recent power-quality events (sag / swell / transient / harmonic). */
export const pqEvents: { at: string; type: string; detail: string; sev: PQSeverity }[] = [
  { at: "13:41:07", type: "Transient", detail: "1.9 kV impulse on incomer — capacitor switching", sev: "critical" },
  { at: "11:26:33", type: "Voltage sag", detail: "L2 dipped to 372 V (−7%) for 120 ms", sev: "warning" },
  { at: "09:02:18", type: "Voltage swell", detail: "L1 rose to 418 V (+4%) for 60 ms", sev: "warning" },
  { at: "Jun 24", type: "Harmonic alarm", detail: "Current THD 8.1% exceeded IEEE-519 at MDB-2", sev: "warning" },
  { at: "Jun 22", type: "Voltage sag", detail: "3-phase dip to 88% for 200 ms — utility side", sev: "warning" },
];

/* --------------------------------------- voltage disturbance analysis (IEEE 1159) */

export type DisturbanceKind = "sag" | "swell" | "interruption";

/** Sag / swell / interruption events with engineering context + mitigation.
 *  magPct = residual voltage (sag/interruption) or peak voltage (swell), % of nominal. */
export const voltageEvents: {
  at: string;
  kind: DisturbanceKind;
  phase: string;
  magPct: number;
  durationMs: number;
  cause: string;
  fix: string;
  itic: "within" | "violation";
}[] = [
  { at: "11:26:33", kind: "sag", phase: "L2", magPct: 76, durationMs: 120, cause: "Chiller B DOL motor start (inrush 6×)", fix: "Fit soft-starter / VFD on Chiller B", itic: "violation" },
  { at: "09:02:18", kind: "swell", phase: "L1", magPct: 118, durationMs: 60, cause: "Capacitor bank switching overshoot", fix: "Add detuned reactor / pre-insertion resistor", itic: "within" },
  { at: "07:41:05", kind: "sag", phase: "3φ", magPct: 88, durationMs: 200, cause: "Upstream utility fault + auto-reclose", fix: "Ride-through: DVR or UPS on critical PLCs", itic: "within" },
  { at: "Jun 23 22:14", kind: "interruption", phase: "3φ", magPct: 5, durationMs: 80, cause: "Incomer feeder breaker trip", fix: "Auto-transfer to backup feeder / UPS", itic: "violation" },
  { at: "Jun 22 14:05", kind: "swell", phase: "L3", magPct: 112, durationMs: 40, cause: "Large load rejection (press line stop)", fix: "Review load-shedding sequence + AVR", itic: "within" },
];

/** Flicker per IEC 61000-4-15 (Pst 10-min, Plt 2-hr). */
export const flicker = { pst: 0.62, plt: 0.48, limitPst: 1.0, limitPlt: 0.8, source: "Welding bay #2 · arc welders" };

/** Impulsive / oscillatory transients (µs–ms, kV). */
export const transientSummary = {
  count24h: 3,
  worstKv: 1.9,
  typical: "capacitor switching",
  fix: "Type-2 SPD at MDB + RC snubbers on contactors",
};

/* -------------------------------------------- PQ event tally + report data */
export type PqEventType = "sag" | "overvoltage" | "flicker" | "transient";
export const PQ_EVENT_META: { type: PqEventType; label: LZ; color: string }[] = [
  { type: "sag", label: { en: "Voltage sag", th: "ไฟตก" }, color: "#22d3ee" },
  { type: "overvoltage", label: { en: "Overvoltage", th: "แรงดันเกิน" }, color: "#818cf8" },
  { type: "flicker", label: { en: "Flicker", th: "ไฟกระพริบ" }, color: "#f59e0b" },
  { type: "transient", label: { en: "Transient", th: "ไฟกระชาก" }, color: "#f43f5e" },
];
/** headline tallies — how many of each disturbance so far today / this month */
export const pqTally: Record<"today" | "month", Record<PqEventType, number>> = {
  today: { sag: 7, overvoltage: 6, flicker: 12, transient: 4 },
  month: { sag: 143, overvoltage: 121, flicker: 261, transient: 71 },
};
/** per-source tallies — which equipment causes the disturbances, for the "most frequent
 *  source" ranking. Totals reconcile with pqTally above (today / this month). */
export const pqSources: { name: string; feeder: string; type: PqEventType; today: number; month: number }[] = [
  { name: "Weld Robot 04", feeder: "DB-B · Line B", type: "flicker", today: 12, month: 261 },
  { name: "Chiller B", feeder: "DB-COOL · Cooling", type: "sag", today: 5, month: 100 },
  { name: "Capacitor Bank", feeder: "MDB", type: "overvoltage", today: 4, month: 82 },
  { name: "Capacitor Bank", feeder: "MDB", type: "transient", today: 4, month: 71 },
  { name: "Utility side", feeder: "PCC incomer", type: "sag", today: 2, month: 43 },
  { name: "Stamping Press 03", feeder: "DB-B · Line B", type: "overvoltage", today: 2, month: 39 },
];
const pqDailyRate: Record<PqEventType, number> = {
  sag: pqTally.month.sag / 30, overvoltage: pqTally.month.overvoltage / 30,
  flicker: pqTally.month.flicker / 30, transient: pqTally.month.transient / 30,
};
/** counts for any range — a custom span scales from the monthly run-rate */
export function pqCountsFor(range: "today" | "month" | "custom", days = 1): Record<PqEventType, number> {
  if (range === "today") return pqTally.today;
  if (range === "month") return pqTally.month;
  const d = Math.max(1, days);
  return { sag: Math.round(pqDailyRate.sag * d), overvoltage: Math.round(pqDailyRate.overvoltage * d), flicker: Math.round(pqDailyRate.flicker * d), transient: Math.round(pqDailyRate.transient * d) };
}
/** per-type worst magnitude + typical source, for the report summary table */
export const pqEventProfile: Record<PqEventType, { worst: LZ; source: string; standard: string }> = {
  sag: { worst: { en: "residual 76% · 120 ms", th: "เหลือ 76% · 120 ms" }, source: "Chiller B DOL start", standard: "IEEE 1159 / ITIC" },
  overvoltage: { worst: { en: "RMS 111% · 200 ms", th: "RMS 111% · 200 ms" }, source: "Cap-bank switching", standard: "EN 50160" },
  flicker: { worst: { en: "Pst 0.62 (limit 1.0)", th: "Pst 0.62 (เกณฑ์ 1.0)" }, source: "Welding bay #2", standard: "IEC 61000-4-15" },
  transient: { worst: { en: "impulse 2.0 pu · 1.9 kV", th: "อิมพัลส์ 2.0 pu · 1.9 kV" }, source: "MDB incomer", standard: "IEEE 1159" },
};
/** notable dated events for the report detail table (today's set) */
export const pqNotableEvents: { at: string; type: PqEventType; detail: LZ; phase: string; source: string; itic: "within" | "violation" }[] = [
  { at: "15:45:51", type: "transient", detail: { en: "impulse 2.00 pu", th: "อิมพัลส์ 2.00 pu" }, phase: "L1", source: "Main Distribution", itic: "violation" },
  { at: "15:45:39", type: "overvoltage", detail: { en: "RMS 111% overvoltage", th: "RMS 111% แรงดันเกิน" }, phase: "L2", source: "Main Distribution", itic: "within" },
  { at: "14:22:10", type: "overvoltage", detail: { en: "swell 109% — cap-bank step in", th: "แรงดันพุ่ง 109% — คาปาซิเตอร์สลับสเต็ป" }, phase: "3φ", source: "Main Distribution", itic: "within" },
  { at: "13:41:07", type: "transient", detail: { en: "1.9 kV impulse — capacitor switching", th: "อิมพัลส์ 1.9 kV — สวิตช์คาปาซิเตอร์" }, phase: "L1", source: "Main Distribution", itic: "violation" },
  { at: "11:26:33", type: "sag", detail: { en: "dipped to 76% for 120 ms", th: "ตกเหลือ 76% นาน 120 ms" }, phase: "L2", source: "Chiller B", itic: "violation" },
  { at: "10:12:44", type: "flicker", detail: { en: "Pst 0.58 — arc welding", th: "Pst 0.58 — งานเชื่อมอาร์ก" }, phase: "3φ", source: "Weld Robot 04", itic: "within" },
  { at: "09:02:18", type: "overvoltage", detail: { en: "rose to 104% for 60 ms", th: "ขึ้นถึง 104% นาน 60 ms" }, phase: "L1", source: "Main Distribution", itic: "within" },
  { at: "08:15:22", type: "overvoltage", detail: { en: "swell to 112% — press-line load rejection", th: "แรงดันพุ่ง 112% — โหลด press หลุด" }, phase: "L3", source: "Press Line 02", itic: "within" },
  { at: "07:41:05", type: "sag", detail: { en: "3φ dip to 88% for 200 ms", th: "3φ ตกเหลือ 88% นาน 200 ms" }, phase: "3φ", source: "Utility side", itic: "within" },
  { at: "06:18:20", type: "flicker", detail: { en: "Pst 0.61 — arc welding", th: "Pst 0.61 — งานเชื่อมอาร์ก" }, phase: "3φ", source: "Weld Robot 04", itic: "within" },
];

/** AI root-cause analysis of the power-quality disturbances — cause → evidence → fix. */
export const pqRootCauses: { type: PqEventType; source: string; assetId: string; confidence: number; savingYr: number; cause: LZ; evidence: LZ; fix: LZ; quickFix: LZ; outcome: LZ; partSpec: LZ; proof: LZ[] }[] = [
  { type: "sag", source: "Chiller B", assetId: "chiller-09", confidence: 88, savingYr: 320_000,
    cause: { en: "Chiller B starts direct-on-line — inrush ~6× rated current", th: "Chiller B สตาร์ทแบบ DOL — กระแสพุ่งประมาณ 6 เท่าของพิกัด" },
    evidence: { en: "Sags cluster on L2 at shift start, only while Chiller B cycles — 76% residual, outside the ITIC curve", th: "ไฟตกกระจุกที่เฟส L2 ช่วงเปิดกะ เฉพาะตอน Chiller B ทำงาน — เหลือ 76% หลุดเส้น ITIC" },
    proof: [
      { en: "Voltage drops sharply then recovers within 120 ms — a motor-start signature, not a utility-side sag", th: "แรงดันตกลึกฉับพลันแล้วฟื้นใน 120 ms — เป็นลายเซ็นของโหลดสตาร์ท ไม่ใช่ไฟตกจากฝั่งการไฟฟ้า" },
      { en: "Every dip lands exactly when Chiller B starts, with inrush ~6× rated current", th: "ไฟตกทุกครั้งเกิดพร้อมจังหวะ Chiller B สตาร์ท พร้อมกระแสพุ่ง ~6 เท่าของพิกัด" },
      { en: "Clustered on phase L2 at shift start, only on the Chiller B feeder — no other machine affected", th: "กระจุกที่เฟส L2 ช่วงเปิดกะ เฉพาะฟีดเดอร์ Chiller B — เครื่องอื่นไม่กระทบ" },
      { en: "Utility ruled out (not a balanced 3-phase dip); 76% residual is outside the ITIC curve, so it counts as a real sag", th: "ตัดฝั่งการไฟฟ้าออก (ไม่ตกพร้อมกันทั้ง 3 เฟส) — เหลือ 76% หลุดเส้น ITIC จึงนับเป็นไฟตกจริง" },
    ],
    quickFix: { en: "Sequence the Chiller B start away from the shift-start peak and other big loads — no hardware needed", th: "จัดคิวให้ Chiller B สตาร์ทเลี่ยงช่วงพีคเปิดกะและเลี่ยงโหลดใหญ่ตัวอื่น — ทำได้เลย ไม่ต้องซื้อของ" },
    outcome: { en: "Sag recovers from 76% back above 90% (within ITIC) — sensitive CNC/PLC stop tripping, and the VFD trims Chiller energy on top", th: "ไฟตกจากเหลือ 76% กลับมา >90% อยู่ในเส้น ITIC — CNC/PLC ที่ไวต่อไฟตกไม่สะดุด/ทริป และ VFD ช่วยลดค่าไฟ Chiller เพิ่ม" },
    partSpec: { en: "VFD sized to the Chiller B motor — ~90 kW, 400 V 3-phase, ~150 A, IP54, built-in EMC filter + 3% line reactor; ramp 10–15 s to hold inrush ≤ 2× rated", th: "VFD ตามพิกัดมอเตอร์ Chiller B — ~90 kW, 400 V 3 เฟส, ~150 A, IP54, มี EMC filter + line reactor 3% ในตัว; ตั้ง ramp 10–15 วิ กดกระแสสตาร์ทเหลือ ≤ 2 เท่าพิกัด" },
    fix: { en: "Fit a soft-starter / VFD on Chiller B", th: "ติด soft-starter / VFD ที่ Chiller B" } },
  { type: "transient", source: "Main Distribution", assetId: "mdb-11", confidence: 82, savingYr: 180_000,
    cause: { en: "Capacitor-bank switching overshoot at the MDB", th: "การสลับคาปาซิเตอร์แบงก์ที่ MDB ทำให้แรงดันพุ่งเกิน" },
    evidence: { en: "1.9 kV impulses coincide exactly with PF-correction cap steps", th: "อิมพัลส์ 1.9 kV เกิดพร้อมจังหวะสลับสเต็ปคาปาซิเตอร์แก้ PF พอดี" },
    proof: [
      { en: "Voltage spikes then rings at high frequency before decaying — a capacitor-switching signature, unlike a one-way lightning impulse", th: "แรงดันพุ่งขึ้นแล้วแกว่งสั่นความถี่สูงก่อนซาลง — เป็นลายเซ็นของการสลับคาปาซิเตอร์ ต่างจากฟ้าผ่าที่พุ่งทางเดียว" },
      { en: "Every 1.9 kV impulse lands on a cap-bank step change — seen as an instant kVAR / PF jump", th: "อิมพัลส์ 1.9 kV ทุกลูกเกิดพร้อมจังหวะคาปาซิเตอร์สลับสเต็ป — เห็นจากค่า kVAR / PF ที่กระโดดทันที" },
      { en: "Strongest right at the MDB where the cap bank sits, weaker further downstream", th: "วัดได้แรงสุดที่จุด MDB ซึ่งเป็นที่ติดตั้งคาปาซิเตอร์แบงก์ ยิ่งไกลออกไปยิ่งเบา" },
      { en: "Lightning / utility ruled out (not tied to weather or external timing); motor start ruled out (that causes a sag, not a spike)", th: "ตัดฟ้าผ่า/ฝั่งการไฟฟ้าออก (ไม่ผูกกับฝนหรือเวลาภายนอก) และตัดมอเตอร์สตาร์ทออก (นั่นทำให้ไฟตก ไม่ใช่ไฟพุ่ง)" },
    ],
    quickFix: { en: "Retune the PF controller to switch fewer, less-frequent steps (kill the hunting) and add switching dead-time — no hardware needed", th: "ปรับตั้งตัวคุม PF ให้สลับสเต็ปถี่น้อยลงและหน่วงเวลาสลับ ลดการสลับไปมา (hunting) — ทำได้เลย ไม่ต้องซื้อของ" },
    outcome: { en: "The 1.9 kV impulses drop below the level that degrades insulation and electronics — longer life for VFDs / PLCs / power supplies and fewer mid-run resets", th: "อิมพัลส์ 1.9 kV ถูกกดลงต่ำกว่าระดับที่ทำลายฉนวน/อิเล็กทรอนิกส์ — ยืดอายุ VFD / PLC / พาวเวอร์ซัพพลาย และลดของเสียจากเครื่องรีเซ็ตกลางคัน" },
    partSpec: { en: "Type-2 SPD (Uc ≥ 440 V, In 20 kA 8/20 µs, Up ≤ 1.5 kV) on the MDB busbar · 7% detuned reactor (189 Hz) matched to the bank · RC snubber 0.1 µF + 100 Ω / 600 V across each cap contactor", th: "SPD Type-2 (Uc ≥ 440 V, In 20 kA 8/20 µs, Up ≤ 1.5 kV) ที่บัสบาร์ MDB · detuned reactor 7% (189 Hz) จับคู่กับแบงก์ · RC snubber 0.1 µF + 100 Ω / 600 V คร่อมคอนแทกเตอร์คาปฯ ทุกตัว" },
    fix: { en: "Type-2 SPD at the MDB + detuned reactor + RC snubbers on contactors", th: "SPD Type-2 ที่ MDB + detuned reactor + RC snubber ที่คอนแทกเตอร์" } },
  { type: "flicker", source: "Weld Robot 04", assetId: "weld-04", confidence: 79, savingYr: 140_000,
    cause: { en: "Arc welders in welding bay #2", th: "เครื่องเชื่อมอาร์กในโซนงานเชื่อม #2" },
    evidence: { en: "Pst tracks welding activity 1:1 — Weld Robot 04 is the dominant source (Pst 0.62 of a 1.0 limit)", th: "Pst ขึ้น-ลงตามงานเชื่อมแบบ 1:1 — Weld Robot 04 เป็นตัวหลัก (Pst 0.62 จากเกณฑ์ 1.0)" },
    proof: [
      { en: "Pst tracks the welding cycle 1:1 — rises the moment welding starts, falls when it stops", th: "ค่า Pst ขึ้น-ลงตามรอบงานเชื่อมแบบ 1:1 — เชื่อมเมื่อไหร่ Pst ขึ้นทันที หยุดเชื่อมก็ลง" },
      { en: "Traced feeder by feeder, Weld Robot 04 is the dominant source (largest flicker share)", th: "ไล่ทีละฟีดเดอร์แล้ว Weld Robot 04 เป็นตัวหลัก (สัดส่วนไฟกระพริบสูงสุด)" },
      { en: "Flicker peaks in the 8–10 Hz band the human eye is most sensitive to — consistent with arc welding", th: "ไฟกระพริบเด่นที่ย่าน 8–10 Hz ซึ่งเป็นย่านที่สายตาคนไวสุด — ตรงกับพฤติกรรมงานเชื่อมอาร์ก" },
      { en: "Pst 0.62 is still under the 1.0 limit but climbing with welding hours — flagged early", th: "Pst 0.62 ยังไม่เกินเกณฑ์ 1.0 แต่ไต่ขึ้นตามชั่วโมงเชื่อม จึงเฝ้าระวังไว้ก่อน" },
    ],
    quickFix: { en: "Schedule heavy welding away from voltage-sensitive work and stagger the welders so they don't fire together — no hardware needed", th: "จัดตารางงานเชื่อมหนักไม่ให้ตรงกับงานที่ไวต่อแรงดัน และไม่ให้เครื่องเชื่อมทำงานพร้อมกัน — ทำได้เลย ไม่ต้องซื้อของ" },
    outcome: { en: "Pst falls well clear of the 1.0 limit — no visible flicker on lighting or sensitive lines, and steadier weld quality", th: "Pst ลดลงห่างจากเกณฑ์ 1.0 — ไฟไม่กระพริบรบกวนสายตาและงานที่ไวต่อแรงดัน คุณภาพงานเชื่อมนิ่งขึ้น" },
    partSpec: { en: "STATCOM ~200 kVAr dynamic, 400 V, response < 5 ms on the bay #2 weld feeder (or an SVC of equal rating)", th: "STATCOM ~200 kVAr แบบไดนามิก, 400 V, ตอบสนอง < 5 ms ที่ฟีดเดอร์เชื่อมโซน #2 (หรือ SVC พิกัดเท่ากัน)" },
    fix: { en: "SVC / STATCOM on the welding feeder", th: "ติด SVC / STATCOM ที่ฟีดเดอร์งานเชื่อม" } },
  { type: "overvoltage", source: "Main Distribution", assetId: "mdb-11", confidence: 74, savingYr: 90_000,
    cause: { en: "Light-load overvoltage from an oversized capacitor bank", th: "แรงดันเกินช่วงโหลดต่ำ จากคาปาซิเตอร์แบงก์ใหญ่เกินความจำเป็น" },
    evidence: { en: "RMS peaks 111–118% off-shift when plant load drops", th: "RMS พุ่ง 111–118% นอกกะ ตอนโหลดโรงงานตก" },
    proof: [
      { en: "RMS rises to 111–118% only off-shift when plant load drops — settles back on its own when load returns", th: "แรงดันพุ่ง 111–118% เฉพาะช่วงนอกกะที่โหลดโรงงานตก — พอโหลดกลับมาก็ลงเอง" },
      { en: "The rise lines up with the cap bank still connected while there's no load to absorb the reactive power", th: "จังหวะแรงดันขึ้นตรงกับตอนคาปาซิเตอร์แบงก์ยังต่ออยู่ ทั้งที่ไม่มีโหลดมาหักล้างรีแอกทีฟ" },
      { en: "PF goes leading at those times — supplying more reactive power than needed, confirming the bank is oversized", th: "ค่า PF ตอนนั้นนำหน้า (leading) — จ่ายรีแอกทีฟเกินที่ต้องการจริง ยืนยันว่าคาปฯ ใหญ่เกิน" },
      { en: "Repeats every low-load window (not random) — a systemic issue, not a one-off", th: "เกิดซ้ำทุกช่วงโหลดต่ำ (ไม่สุ่ม) จึงเป็นปัญหาเชิงระบบ ไม่ใช่เหตุการณ์บังเอิญ" },
    ],
    quickFix: { en: "Drop part of the cap bank during off-shift / low-load hours (set the controller to shed steps as load falls) — no hardware needed", th: "ปลดสเต็ปคาปาซิเตอร์บางส่วนช่วงนอกกะ/โหลดต่ำ (ตั้งตัวคุมให้ถอดสเต็ปเมื่อโหลดตก) — ทำได้เลย ไม่ต้องซื้อของ" },
    outcome: { en: "RMS settles back to 100–105% within spec — longer life for motors, lighting and gear that ages fast under overvoltage, and PF no longer runs leading toward a penalty", th: "RMS กลับมาอยู่ 100–105% ไม่เกินพิกัด — ยืดอายุมอเตอร์/หลอดไฟ/อุปกรณ์ที่เสื่อมเร็วเมื่อแรงดันเกิน และ PF ไม่นำหน้าจนเสี่ยงโดนค่าปรับ" },
    partSpec: { en: "Smart PF controller with per-step contactor switching by load (retrofit to the existing bank), or a 7% detuned series reactor (189 Hz)", th: "ตัวคุม PF อัจฉริยะแบบสลับคอนแทกเตอร์รายสเต็ปตามโหลด (เสริมเข้ากับแบงก์เดิม) หรือรีแอกเตอร์อนุกรม detuned 7% (189 Hz)" },
    fix: { en: "Auto-switch the cap bank by load, or add a series reactor", th: "สลับคาปาซิเตอร์ตามโหลดอัตโนมัติ หรือเพิ่มรีแอกเตอร์อนุกรม" } },
];

/* ----------------------------------------------------------- energy health */

export const energyHealth = {
  overall: 92,
  metrics: [
    { label: "Power Factor", value: "0.96", score: 95, hint: "Near unity — minimal reactive penalty." },
    { label: "Load Factor", value: "78%", score: 82, hint: "Demand fairly steady vs. peak." },
    { label: "Peak Ratio", value: "0.94", score: 74, hint: "Running close to contract demand." },
    { label: "Off-Peak Use", value: "61%", score: 88, hint: "Good share of load shifted off-peak." },
  ],
};

/* --------------------------------------------------------------- anomalies */

export const energyAnomalies = [
  { title: "Hidden consumption — Packaging", detail: "15 kW drawn outside operating hours.", level: "warning", at: "02:14" },
  { title: "Idle machine — CNC-02", detail: "Running idle >45 min. Recommend Standby.", level: "warning", at: "09:38" },
  { title: "Night base-load +20%", detail: "Compressed-air system active overnight.", level: "critical", at: "23:50" },
  { title: "Power-factor dip — MCC-03", detail: "PF fell to 0.86 during line start-up.", level: "warning", at: "07:05" },
];

/* ------------------------------------------------------- demand optimization */

export const demandRecs = [
  { name: "Delay Air Comp #2 start by 15 min", impact: "-120 kW peak", thb: "฿180k/mo", auto: true },
  { name: "Pre-cool chilled water off-peak", impact: "-90 kW on-peak", thb: "฿95k/mo", auto: true },
  { name: "Stagger CNC spindle warm-up", impact: "-60 kW coincident", thb: "฿42k/mo", auto: false },
  { name: "Cap simultaneous heater load", impact: "-75 kW peak", thb: "฿58k/mo", auto: false },
];

/* -------------------------------------------------------------------- ROI */

export const roiDefaults = {
  annualEnergySpend: 15_240_000, // ฿/yr (~1.27M/mo)
  reductionPct: 18,
  investment: 2_400_000,
};

/* ----------------------------------------------------------- energy prompts */

export const energyPrompts = [
  "Why is energy consumption higher today?",
  "Show the top 10 energy losses",
  "Predict next month's electricity bill",
  "How do we cut peak demand this week?",
];

/* ------------------------------------------------------- autonomous energy */

export type EnergyActionStatus = "active" | "pending" | "suggested";
export const energyActions: {
  id: string;
  name: string;
  desc: string;
  impact: string;
  status: EnergyActionStatus;
  savingMo: number;
  runsToday: number;
  lastRun: string;
  guardrail: string;
}[] = [
  { id: "shed", name: "Peak Load Shedding", desc: "Shed non-critical loads to stay under 3,000 kW.", impact: "฿180k/mo", status: "active", savingMo: 180_000, runsToday: 7, lastRun: "14:32", guardrail: "Never sheds critical production loads" },
  { id: "precool", name: "Off-Peak Pre-Cooling", desc: "Pre-cool chilled-water loop during off-peak tariff.", impact: "฿95k/mo", status: "active", savingMo: 95_000, runsToday: 2, lastRun: "03:10", guardrail: "Holds process temperature ±1°C" },
  { id: "standby", name: "Idle Auto-Standby", desc: "Put machines idling >15 min into standby.", impact: "฿42k/mo", status: "pending", savingMo: 42_000, runsToday: 0, lastRun: "—", guardrail: "Skips machines with queued jobs" },
  { id: "pf", name: "Power-Factor Correction", desc: "Auto-switch capacitor banks to hold PF ≥ 0.95.", impact: "฿28k/mo", status: "suggested", savingMo: 28_000, runsToday: 0, lastRun: "—", guardrail: "Keeps power factor 0.95–0.99" },
];

/** Savings the autonomous AI has banked this month (MTD). */
export const aiSavedMTD = 212_000;

/** Live feed of what the autonomous AI just did — the audit trail. */
export const aiActivity: { at: string; action: string; detail: string; saved: string }[] = [
  { at: "14:32", action: "Peak Load Shedding", detail: "Deferred Air Comp 10 for 6 min — avoided a 180 kW peak.", saved: "฿4,200" },
  { at: "13:05", action: "Off-Peak Pre-Cooling", detail: "Charged the chilled-water loop to 6°C before on-peak.", saved: "฿2,800" },
  { at: "11:48", action: "Peak Load Shedding", detail: "Trimmed 2 non-critical AHUs during a forecast peak.", saved: "฿3,100" },
  { at: "09:15", action: "Off-Peak Pre-Cooling", detail: "Pre-cool cycle done — 1,100 kWh shifted off-peak.", saved: "฿1,860" },
  { at: "07:02", action: "Peak Load Shedding", detail: "Held the plant under 2,950 kW through the morning ramp.", saved: "฿5,400" },
];

/** Safety constraints the AI operates within — always on. */
export const aiGuardrails: string[] = [
  "Critical production loads are never shed",
  "Process temperatures held within ±1°C",
  "Power factor kept between 0.95–0.99",
  "Every action is logged and reversible",
];

/* ------------------------------------------------------ power-meter findings */
/* Simulated diagnostic findings surfaced after installing SpareX power meters
 * and analysing the electrical data. Each is a full case: measured problem →
 * root-cause analysis → AI recommendation → parts spec → CAPEX / saving / ROI.
 * Long text is bilingual inline (en/th); ja/zh fall back to en. */

/** Localised string (English source of truth + natural Thai). */
export type LZ = { en: string; th: string };
export type PMSeverity = "critical" | "warning" | "advisory";
export type PMPart = { name: LZ; spec: string; qty: number; unit: LZ; unitPrice: number };
export type PMMetric = { label: LZ; value: string; limit: string; status: "bad" | "warn" | "ok"; pct: number };

export type PMFinding = {
  id: string;
  code: string;
  title: LZ;
  category: LZ;
  catKey: string; // stable key for icon + filtering (locale-independent)
  severity: PMSeverity;
  asset: LZ;
  meter: string;
  detected: string;
  symptom: LZ[]; // what the meter measured (bullet points)
  metrics: PMMetric[]; // measured value vs limit
  rootCause: LZ[]; // RCA (bullet points)
  impact: LZ; // business/technical consequence (one-line callout)
  recommendation: LZ[]; // AI advice (bullet points)
  parts: PMPart[]; // hardware to change (empty = setpoint/software only)
  capex: number; // ฿ investment (incl. install)
  annualSaving: number; // ฿/yr
  paybackMo: number; // months
  co2: number; // tCO₂/yr avoided
};

const UNIT_SET: LZ = { en: "set", th: "ชุด" };
const UNIT_EA: LZ = { en: "unit", th: "ตัว" };
const UNIT_LOT: LZ = { en: "lot", th: "งาน" };

export const pmFindings: PMFinding[] = [
  {
    id: "pf", code: "PQ-01", severity: "critical", catKey: "pf",
    title: { en: "Low power factor · utility penalty", th: "เพาเวอร์แฟกเตอร์ต่ำ · โดนค่าปรับการไฟฟ้า" },
    category: { en: "Power Factor", th: "เพาเวอร์แฟกเตอร์" },
    asset: { en: "Main incomer · MDB-A", th: "จุดรับไฟหลัก · MDB-A" }, meter: "PM-01 · MDB-A", detected: "Jun 28 · 14:02",
    symptom: [
      { en: "PF averages 0.82 lagging in production, dipping to 0.78 at peak.", th: "PF เฉลี่ย 0.82 ล้าหลังช่วงเดินเครื่อง ตกถึง 0.78 ตอนพีค" },
      { en: "The utility bills a reactive-power surcharge whenever PF < 0.85.", th: "การไฟฟ้าคิดค่าปรับกำลังรีแอกทีฟทุกครั้งที่ PF ต่ำกว่า 0.85" },
    ],
    metrics: [
      { label: { en: "Power factor", th: "เพาเวอร์แฟกเตอร์" }, value: "0.82", limit: "≥ 0.95", status: "bad", pct: 82 },
      { label: { en: "Reactive load", th: "โหลดรีแอกทีฟ" }, value: "1,180 kVAR", limit: "≤ 320 kVAR", status: "bad", pct: 88 },
      { label: { en: "PF penalty", th: "ค่าปรับ PF" }, value: "฿28.4k/mo", limit: "฿0", status: "bad", pct: 70 },
    ],
    rootCause: [
      { en: "≈1,180 kVAR of uncompensated inductive load.", th: "มีโหลดเหนี่ยวนำที่ไม่ได้ชดเชยราว 1,180 kVAR" },
      { en: "Induction motors, transformers and welders draw magnetising current with no local compensation.", th: "Motor เหนี่ยวนำ หม้อแปลง และตู้เชื่อม กินกำลังรีแอกทีฟ (magnetising) โดยไม่มีตัวชดเชยที่หน้างาน" },
    ],
    impact: { en: "≈฿28,400/month in PF penalties, plus 6% of cable and transformer capacity wasted carrying reactive current — which blocks future expansion.", th: "เสียค่าปรับ PF ราว ฿28,400/เดือน และเปลืองพิกัดสาย/หม้อแปลงไป 6% ไปกับการส่งกระแสรีแอกทีฟ ทำให้ขยายกำลังผลิตในอนาคตติดขัด" },
    recommendation: [
      { en: "Install an automatic PF-correction bank sized to lift PF to 0.98.", th: "ติดตั้งชุดคาปาซิเตอร์แก้ PF อัตโนมัติ ให้ค่า PF ขึ้นเป็น 0.98" },
      { en: "Use detuned reactors — on-site VFD harmonics would otherwise resonate with the capacitors.", th: "ต้องใส่รีแอกเตอร์ดีจูน เพราะฮาร์มอนิกจาก VFD จะเรโซแนนซ์กับคาปาซิเตอร์ได้" },
    ],
    parts: [
      { name: { en: "Automatic PF capacitor bank", th: "ตู้คาปาซิเตอร์แก้ PF อัตโนมัติ" }, spec: "400 kVAR · 12-step · 415V · with PF controller", qty: 1, unit: UNIT_SET, unitPrice: 360000 },
      { name: { en: "Detuned reactor (7%)", th: "รีแอกเตอร์ดีจูน 7%" }, spec: "7% · tuned 189 Hz · per step", qty: 12, unit: UNIT_EA, unitPrice: 8500 },
    ],
    capex: 480000, annualSaving: 342000, paybackMo: 17, co2: 18,
  },
  {
    id: "harmonics", code: "PQ-02", severity: "warning", catKey: "harmonics",
    title: { en: "Voltage THD over IEEE-519 limit", th: "ค่า THD แรงดันเกินเกณฑ์ IEEE-519" },
    category: { en: "Harmonics", th: "ฮาร์มอนิก" },
    asset: { en: "Extrusion line · MDB-B", th: "ไลน์เอ็กซ์ทรูชัน · MDB-B" }, meter: "PM-04 · MDB-B", detected: "Jun 29 · 09:20",
    symptom: [
      { en: "Voltage THD 6.8% (limit 5.0%); current THD 22%.", th: "THD แรงดัน 6.8% (เกณฑ์ 5.0%) · THD กระแส 22%" },
      { en: "Dominant 5th and 7th harmonics from the extruder VFDs.", th: "ฮาร์มอนิกเด่นลำดับ 5 และ 7 จาก VFD เอ็กซ์ทรูเดอร์" },
    ],
    metrics: [
      { label: { en: "Voltage THD", th: "THD แรงดัน" }, value: "6.8%", limit: "≤ 5.0%", status: "bad", pct: 80 },
      { label: { en: "Current THD (TDD)", th: "THD กระแส (TDD)" }, value: "22%", limit: "≤ 8%", status: "bad", pct: 92 },
      { label: { en: "5th harmonic", th: "ฮาร์มอนิกที่ 5" }, value: "5.9%", limit: "≤ 4%", status: "warn", pct: 74 },
    ],
    rootCause: [
      { en: "Six 45 kW extruder VFDs are 6-pulse drives with no input reactors.", th: "VFD เอ็กซ์ทรูเดอร์ 45 kW จำนวน 6 ตัว เป็นไดรฟ์ 6 พัลส์ ไม่มีรีแอกเตอร์ด้านเข้า" },
      { en: "They inject 5th/7th harmonic currents that distort the bus voltage.", th: "จึงปล่อยกระแสฮาร์มอนิกลำดับ 5/7 ทำให้แรงดันบัสเพี้ยน" },
    ],
    impact: { en: "Extra transformer and cable heating (~9 tCO₂/yr of loss), nuisance breaker trips, and risk of failing the utility's IEEE-519 audit at the point of common coupling.", th: "หม้อแปลงและสายร้อนเกิน (สูญเสียราว 9 tCO₂/ปี) เบรกเกอร์ทริปโดยไม่จำเป็น และเสี่ยงไม่ผ่านการตรวจ IEEE-519 ของการไฟฟ้าที่จุดต่อร่วม" },
    recommendation: [
      { en: "Fit an active harmonic filter (AHF) at MDB-B to cancel harmonics in real time.", th: "ติดตั้งActive Harmonic Filter (AHF) ที่ MDB-B หักล้างฮาร์มอนิกแบบเรียลไทม์" },
      { en: "Or add 5%/3% input reactors on each drive as a lower-cost first step.", th: "หรือใส่รีแอกเตอร์ด้านเข้า 5%/3% ที่ไดรฟ์แต่ละตัว เป็นทางเลือกต้นทุนต่ำกว่า" },
    ],
    parts: [
      { name: { en: "Active harmonic filter (AHF)", th: "Active Harmonic Filter (AHF)" }, spec: "100 A · 415V · wall-mount · IGBT", qty: 1, unit: UNIT_SET, unitPrice: 620000 },
      { name: { en: "Line reactor", th: "ไลน์รีแอกเตอร์" }, spec: "5% · 45 kW · per drive", qty: 6, unit: UNIT_EA, unitPrice: 6500 },
    ],
    capex: 720000, annualSaving: 156000, paybackMo: 55, co2: 22,
  },
  {
    id: "neutral", code: "PQ-03", severity: "warning", catKey: "neutral",
    title: { en: "Neutral overloaded by triplen harmonics", th: "สายนิวทรัลรับโหลดเกินจากฮาร์มอนิกลำดับสาม" },
    category: { en: "Harmonics", th: "ฮาร์มอนิก" },
    asset: { en: "Office & QC panel · DB-3", th: "ตู้สำนักงาน & QC · DB-3" }, meter: "PM-07 · DB-3", detected: "Jun 30 · 11:10",
    symptom: [
      { en: "Neutral current measures 118% of the average phase current.", th: "กระแสนิวทรัลวัดได้ 118% ของกระแสเฉลี่ยต่อเฟส" },
      { en: "The neutral carries more current than any single phase even though the load looks balanced.", th: "สายนิวทรัลรับกระแสมากกว่าสายเฟสใด ๆ ทั้งที่โหลดดูสมดุล" },
    ],
    metrics: [
      { label: { en: "Neutral current", th: "กระแสนิวทรัล" }, value: "118%", limit: "≤ 60% of phase", status: "bad", pct: 88 },
      { label: { en: "3rd harmonic (I)", th: "ฮาร์มอนิกที่ 3 (กระแส)" }, value: "14%", limit: "≤ 5%", status: "bad", pct: 82 },
      { label: { en: "Est. neutral heating", th: "ความร้อนนิวทรัล (ประมาณ)" }, value: "~2×", limit: "1×", status: "warn", pct: 70 },
    ],
    rootCause: [
      { en: "Hundreds of single-phase electronic loads — PCs, LED drivers, chargers.", th: "โหลดเฟสเดียวชนิดอิเล็กทรอนิกส์นับร้อย — พีซี ไดรเวอร์ LED ที่ชาร์จ" },
      { en: "Their 3rd-harmonic currents don't cancel but add up in the shared neutral.", th: "กระแสฮาร์มอนิกลำดับ 3 ไม่หักล้างกัน แต่บวกสะสมในสายนิวทรัลร่วม" },
    ],
    impact: { en: "An overheated neutral is a fire risk, forces cable derating, and blocks adding any load on this panel.", th: "สายนิวทรัลร้อนเกินเป็นความเสี่ยงไฟไหม้ ต้องลดพิกัดสาย และทำให้เพิ่มโหลดที่ตู้นี้ไม่ได้" },
    recommendation: [
      { en: "Install a zig-zag harmonic-mitigating (or K-rated) transformer to trap triplen harmonics.", th: "ติดตั้งหม้อแปลงลดฮาร์มอนิกแบบซิกแซก (หรือ K-rated) เพื่อดักฮาร์มอนิกลำดับสาม" },
      { en: "Upsize the neutral conductor to 200%.", th: "เพิ่มขนาดสายนิวทรัลเป็น 200%" },
    ],
    parts: [
      { name: { en: "Harmonic-mitigating transformer", th: "หม้อแปลงลดฮาร์มอนิก" }, spec: "Zig-zag · 150 kVA · K-13", qty: 1, unit: UNIT_SET, unitPrice: 210000 },
      { name: { en: "Neutral busbar upgrade", th: "อัปเกรดบัสบาร์นิวทรัล" }, spec: "200% neutral · copper", qty: 1, unit: UNIT_LOT, unitPrice: 28000 },
    ],
    capex: 260000, annualSaving: 84000, paybackMo: 37, co2: 9,
  },
  {
    id: "unbalance", code: "PQ-04", severity: "warning", catKey: "unbalance",
    title: { en: "Voltage unbalance derating motors", th: "แรงดันไม่สมดุลทำให้ Motor ต้องลดพิกัด" },
    category: { en: "Voltage", th: "แรงดัน" },
    asset: { en: "Motor control centre · MCC-2", th: "ตู้ควบคุม Motor · MCC-2" }, meter: "PM-05 · MCC-2", detected: "Jun 27 · 16:45",
    symptom: [
      { en: "Voltage unbalance 2.8% — above the 2% NEMA limit.", th: "ความไม่สมดุลแรงดัน 2.8% เกินเกณฑ์ NEMA ที่ 2%" },
      { en: "The affected motors are derated ~18% and lose efficiency.", th: "Motor ที่กระทบต้องลดพิกัดราว 18% และประสิทธิภาพลดลง" },
    ],
    metrics: [
      { label: { en: "Voltage unbalance", th: "ความไม่สมดุลแรงดัน" }, value: "2.8%", limit: "≤ 2.0%", status: "bad", pct: 82 },
      { label: { en: "Motor derating", th: "Motor ต้อง derate" }, value: "18%", limit: "0%", status: "warn", pct: 60 },
      { label: { en: "Est. winding loss", th: "การสูญเสียขดลวด (ประมาณ)" }, value: "~2×", limit: "1×", status: "warn", pct: 55 },
    ],
    rootCause: [
      { en: "Single-phase loads (lighting, welders, chargers) are split unevenly across L1/L2/L3.", th: "โหลดเฟสเดียว (แสงสว่าง ตู้เชื่อม ที่ชาร์จ) กระจายไม่เท่ากันระหว่าง L1/L2/L3" },
      { en: "One phase is pulled down relative to the others.", th: "ทำให้เฟสหนึ่งแรงดันตกกว่าเฟสอื่น" },
    ],
    impact: { en: "A 2.8% unbalance derates motors ~18% and roughly doubles winding losses — leading to early insulation failure and higher energy use.", th: "ความไม่สมดุล 2.8% ทำให้ Motor ลดพิกัดราว 18% และการสูญเสียในขดลวดเพิ่มเกือบเท่าตัว — ฉนวนเสื่อมเร็วและใช้พลังงานมากขึ้น" },
    recommendation: [
      { en: "Re-balance the single-phase circuits across the three phases (mostly wiring).", th: "จัดสมดุลวงจรเฟสเดียวใหม่ให้กระจายทั้งสามเฟส (ส่วนใหญ่เป็นงานเดินสาย)" },
      { en: "Add per-phase monitoring to hold unbalance under 1%.", th: "เพิ่มการวัดรายเฟส เพื่อคุมความไม่สมดุลให้ต่ำกว่า 1%" },
    ],
    parts: [
      { name: { en: "Load re-balancing (labour)", th: "งานจัดสมดุลโหลด (ค่าแรง)" }, spec: "circuit survey + re-phasing · 2 days", qty: 1, unit: UNIT_LOT, unitPrice: 32000 },
      { name: { en: "3-phase power meter", th: "มิเตอร์วัดไฟ 3 เฟส" }, spec: "per-phase V/I logging · Modbus", qty: 1, unit: UNIT_EA, unitPrice: 13000 },
    ],
    capex: 45000, annualSaving: 96000, paybackMo: 6, co2: 11,
  },
  {
    id: "sag", code: "PQ-05", severity: "critical", catKey: "sag",
    title: { en: "Recurrent voltage sags stopping the line", th: "ไฟตกซ้ำ ๆ ทำให้ไลน์การผลิตหยุด" },
    category: { en: "Voltage disturbance", th: "แรงดันรบกวน" },
    asset: { en: "Packing line PLC · DB-5", th: "PLC ไลน์แพ็ก · DB-5" }, meter: "PM-06 · DB-5", detected: "Jun 26 · 08:15",
    symptom: [
      { en: "12 sags this month dipped to 76% for ~120 ms.", th: "เดือนนี้เกิดไฟตก 12 ครั้ง ลงถึง 76% นานราว 120 ms" },
      { en: "Each event drops out contactors/PLCs and stops the packing line.", th: "แต่ละครั้งทำให้คอนแทกเตอร์/PLC หลุด และไลน์แพ็กหยุด" },
    ],
    metrics: [
      { label: { en: "Sag depth", th: "ความลึกไฟตก" }, value: "76%", limit: "≥ 90%", status: "bad", pct: 76 },
      { label: { en: "Sag events", th: "จำนวนไฟตก" }, value: "12 /mo", limit: "0", status: "bad", pct: 85 },
      { label: { en: "Line downtime", th: "เวลาไลน์หยุด" }, value: "3.2 h/mo", limit: "0", status: "bad", pct: 78 },
    ],
    rootCause: [
      { en: "DOL start of Chiller B (6× inrush) collapses the bus locally.", th: "การสตาร์ทแบบ DOL ของ Chiller B (กระแสพุ่ง 6 เท่า) ทำให้แรงดันบัสตกเฉพาะจุด" },
      { en: "Upstream utility faults with auto-reclose add more sags.", th: "ฟอลต์ฝั่งการไฟฟ้าที่มี auto-reclose ยิ่งเพิ่มไฟตก" },
      { en: "The sensitive PLCs have no ride-through.", th: "PLC ที่ไวไม่มีระบบ ride-through" },
    ],
    impact: { en: "≈3.2 h/month of unplanned downtime plus scrap at restart — the single biggest loss on this page.", th: "ทำให้เสียเวลาโดยไม่ได้วางแผนราว 3.2 ชม./เดือน บวกของเสียตอนรีสตาร์ท — เป็นการสูญเสียก้อนใหญ่ที่สุดในหน้านี้" },
    recommendation: [
      { en: "Soft-start/VFD Chiller B to kill the local inrush.", th: "ใส่ซอฟต์สตาร์ท/VFD ให้ Chiller B กำจัดกระแสพุ่งเฉพาะจุด" },
      { en: "Install a ride-through device (DVR or online UPS) on the critical PLC panel.", th: "ติดตั้งอุปกรณ์ ride-through (DVR หรือ UPS ออนไลน์) ที่ตู้ PLC สำคัญ" },
      { en: "Utility sags then no longer stop the line.", th: "ไฟตกจากการไฟฟ้าจะไม่ทำให้ไลน์หยุดอีก" },
    ],
    parts: [
      { name: { en: "Digital soft starter", th: "ซอฟต์สตาร์ทดิจิทัล" }, spec: "160 kW · 415V · with bypass contactor", qty: 1, unit: UNIT_EA, unitPrice: 145000 },
      { name: { en: "DVR / online UPS", th: "DVR / UPS ออนไลน์" }, spec: "30 kVA · <2 ms transfer · ride-through 200 ms", qty: 1, unit: UNIT_SET, unitPrice: 560000 },
    ],
    capex: 850000, annualSaving: 1240000, paybackMo: 8, co2: 0,
  },
  {
    id: "demand", code: "PQ-06", severity: "critical", catKey: "demand",
    title: { en: "Peak demand breaching contract cap", th: "ดีมานด์พีคเกินเพดานสัญญา" },
    category: { en: "Demand", th: "ดีมานด์" },
    asset: { en: "Plant-wide · main meter", th: "ทั้งโรงงาน · มิเตอร์หลัก" }, meter: "PM-01 · MDB-A", detected: "Jun 24 · 13:42",
    symptom: [
      { en: "Registered demand hit 3,150 kW against a 3,000 kW contract.", th: "ดีมานด์ที่วัดได้แตะ 3,150 kW เทียบสัญญา 3,000 kW" },
      { en: "Every breach is billed at a punitive demand rate for the whole month.", th: "ทุกครั้งที่เกินสัญญา จะถูกคิดค่าปรับดีมานด์ทั้งเดือน" },
    ],
    metrics: [
      { label: { en: "Peak demand", th: "ดีมานด์พีค" }, value: "3,150 kW", limit: "≤ 3,000 kW", status: "bad", pct: 85 },
      { label: { en: "Over contract", th: "เกินสัญญา" }, value: "+150 kW", limit: "0", status: "bad", pct: 60 },
      { label: { en: "Demand charge", th: "ค่าดีมานด์" }, value: "฿132.9/kW", limit: "—", status: "warn", pct: 50 },
    ],
    rootCause: [
      { en: "No coordination between large loads.", th: "ไม่มีการประสานงานระหว่างโหลดใหญ่" },
      { en: "Compressors, chillers and the press line ramp up together at 13:00–15:00 with no staging.", th: "Compressor, Chiller และไลน์ Press เร่งกำลังพร้อมกันช่วง 13:00–15:00 โดยไม่มีการจัดลำดับ" },
    ],
    impact: { en: "A single 150 kW breach re-bases the monthly demand charge — roughly ฿19,900 per event, and it recurs most weeks.", th: "การเกินเพียง 150 kW ครั้งเดียวทำให้ฐานค่าดีมานด์ทั้งเดือนขยับ — ราว ฿19,900 ต่อครั้ง และเกิดซ้ำเกือบทุกสัปดาห์" },
    recommendation: [
      { en: "Deploy a demand controller that sheds/staggers non-critical loads before the threshold.", th: "ติดตั้งตัวควบคุมดีมานด์ที่ปลด/สลับโหลดที่ไม่วิกฤตก่อนถึงเพดาน" },
      { en: "Largely software plus a control relay — very fast payback.", th: "ส่วนใหญ่เป็นซอฟต์แวร์บวกรีเลย์ควบคุม — คืนทุนเร็วมาก" },
    ],
    parts: [
      { name: { en: "Demand controller + I/O", th: "ตัวควบคุมดีมานด์ + I/O" }, spec: "PeakShield · 16-relay · load prioritisation", qty: 1, unit: UNIT_SET, unitPrice: 88000 },
      { name: { en: "Contactor & wiring", th: "คอนแทกเตอร์ & เดินสาย" }, spec: "for 6 sheddable loads", qty: 1, unit: UNIT_LOT, unitPrice: 26000 },
    ],
    capex: 120000, annualSaving: 640000, paybackMo: 2, co2: 0,
  },
  {
    id: "idle", code: "PQ-07", severity: "advisory", catKey: "idle",
    title: { en: "Idle base-load draw overnight", th: "โหลดฐานกินไฟตอนกลางคืนช่วงเดินตัวเปล่า" },
    category: { en: "Load profile", th: "โปรไฟล์โหลด" },
    asset: { en: "6 CNC machines · shop floor", th: "เครื่อง CNC 6 เครื่อง · พื้นที่ผลิต" }, meter: "PM-08 · sub-metering", detected: "Jun 25 · 02:00",
    symptom: [
      { en: "128 kWh/day drawn between 22:00 and 06:00 with nothing in production.", th: "ใช้ไฟ 128 kWh/วัน ช่วง 22:00–06:00 ทั้งที่ไม่มีการผลิต" },
      { en: "Hydraulics, controls and lighting are left energised overnight.", th: "ระบบไฮดรอลิก ตัวควบคุม และไฟส่องสว่าง ถูกเปิดค้างข้ามคืน" },
    ],
    metrics: [
      { label: { en: "Idle draw", th: "ไฟตอนเดินตัวเปล่า" }, value: "128 kWh/day", limit: "≈ 0", status: "bad", pct: 70 },
      { label: { en: "Idle cost", th: "ค่าไฟที่เสียเปล่า" }, value: "฿14k/mo", limit: "฿0", status: "warn", pct: 55 },
      { label: { en: "Machines affected", th: "เครื่องที่เกี่ยวข้อง" }, value: "6", limit: "0", status: "warn", pct: 45 },
    ],
    rootCause: [
      { en: "The machines have no auto-standby.", th: "เครื่องจักรไม่มีระบบพักเครื่องอัตโนมัติ" },
      { en: "Hydraulics and control cabinets stay powered after the last job because operators don't fully shut down.", th: "ไฮดรอลิกและตู้ควบคุมยังมีไฟหลังจบงานสุดท้าย เพราะพนักงานไม่ได้ปิดจนสุด" },
    ],
    impact: { en: "≈฿168,000/yr of energy for zero output, plus needless wear on the hydraulic pumps.", th: "เสียค่าพลังงานราว ฿168,000/ปี โดยไม่ได้ผลผลิต บวกการสึกหรอของ Hydraulic pump โดยไม่จำเป็น" },
    recommendation: [
      { en: "Add IoT smart contactors that put each machine into standby after 15 min idle.", th: "ติดตั้งคอนแทกเตอร์อัจฉริยะ IoT ให้พักเครื่องหลังเดินตัวเปล่า 15 นาที" },
      { en: "Cut auxiliary circuits on a schedule.", th: "ตัดวงจรอุปกรณ์เสริมตามตารางเวลา" },
    ],
    parts: [
      { name: { en: "Smart contactor / IoT relay", th: "คอนแทกเตอร์อัจฉริยะ / รีเลย์ IoT" }, spec: "per machine · energy metering · WiFi", qty: 6, unit: UNIT_EA, unitPrice: 9500 },
      { name: { en: "Standby controller & config", th: "ตัวควบคุมพักเครื่อง & ตั้งค่า" }, spec: "logic + commissioning", qty: 1, unit: UNIT_LOT, unitPrice: 24000 },
    ],
    capex: 85000, annualSaving: 168000, paybackMo: 6, co2: 24,
  },
  {
    id: "motor", code: "PQ-08", severity: "advisory", catKey: "motor",
    title: { en: "Oversized pump motor running underloaded", th: "Pump motor ขนาดใหญ่เกินเดินโหลดต่ำ" },
    category: { en: "Motor efficiency", th: "ประสิทธิภาพ Motor" },
    asset: { en: "Cooling-water pump P-3", th: "Cooling-water pump P-3" }, meter: "PM-09 · MCC-2", detected: "Jun 28 · 10:30",
    symptom: [
      { en: "A 75 kW motor runs at only 38% load.", th: "Motor 75 kW เดินที่โหลดเพียง 38%" },
      { en: "It draws steadily at a low load factor around the clock — never near its efficient band.", th: "ดึงไฟคงที่ที่โหลดต่ำตลอดเวลา — ไม่เคยเข้าใกล้ช่วงประสิทธิภาพดี" },
    ],
    metrics: [
      { label: { en: "Motor load", th: "โหลด Motor" }, value: "38%", limit: "70–90%", status: "warn", pct: 55 },
      { label: { en: "Operating efficiency", th: "ประสิทธิภาพขณะใช้งาน" }, value: "88%", limit: "≥ 95%", status: "warn", pct: 60 },
      { label: { en: "Est. energy waste", th: "พลังงานที่เสีย (ประมาณ)" }, value: "~22%", limit: "0", status: "bad", pct: 65 },
    ],
    rootCause: [
      { en: "The motor is oversized — it never draws near its rated load.", th: "Motor ถูกเลือกขนาดใหญ่เกินไป — ไม่เคยดึงไฟใกล้พิกัด" },
      { en: "With no speed control, the surplus capacity is wasted instead of dialled back to the real duty.", th: "ไม่มีการควบคุมความเร็ว กำลังส่วนเกินจึงถูกทิ้งแทนที่จะปรับลดให้ตรงกับงานจริง" },
    ],
    impact: { en: "Running a 75 kW motor at 38% load wastes ~22% of its energy; right-sizing plus a VFD recovers most of it.", th: "เดิน Motor 75 kW ที่โหลด 38% เปลืองพลังงานราว 22% การเลือกขนาดใหม่บวก VFD ช่วยกู้คืนได้เกือบหมด" },
    recommendation: [
      { en: "Replace with a right-sized 37 kW IE4 motor.", th: "เปลี่ยนเป็น Motor IE4 ขนาด 37 kW ที่พอดี" },
      { en: "Add a VFD so speed follows the real duty — cutting the surplus draw entirely.", th: "เพิ่ม VFD ให้ความเร็วปรับตามงานจริง — ตัดกำลังส่วนเกินทั้งหมด" },
    ],
    parts: [
      { name: { en: "IE4 premium motor", th: "Motor IE4 พรีเมียม" }, spec: "37 kW · 415V · 1,480 rpm", qty: 1, unit: UNIT_EA, unitPrice: 78000 },
      { name: { en: "Variable frequency drive", th: "อินเวอร์เตอร์ (VFD)" }, spec: "45 kW · 415V · with PID + reactor", qty: 1, unit: UNIT_EA, unitPrice: 96000 },
    ],
    capex: 210000, annualSaving: 138000, paybackMo: 18, co2: 20,
  },
  {
    id: "air", code: "PQ-09", severity: "warning", catKey: "air",
    title: { en: "Air compressor short-cycling", th: "Air compressor สับเปิด-ปิดถี่" },
    category: { en: "Compressed air", th: "ระบบลมอัด" },
    asset: { en: "Compressor room · C-1/C-2", th: "Compressor room · C-1/C-2" }, meter: "PM-10 · compressor room", detected: "Jun 29 · 15:05",
    symptom: [
      { en: "Load/unload cycling 14×/hour.", th: "เดินโหลด/อันโหลดถี่ 14 ครั้ง/ชม." },
      { en: "It keeps drawing load-power through no-production hours — a persistent base demand.", th: "ยังดึงไฟแบบโหลดตลอดช่วงไม่ผลิต — เป็นโหลดฐานที่ค้างอยู่" },
      { en: "Two fixed-speed units are poorly staged.", th: "Compressor ความเร็วคงที่สองตัวจัดลำดับไม่ดี" },
    ],
    metrics: [
      { label: { en: "Cycles / hour", th: "รอบ/ชม." }, value: "14", limit: "≤ 6", status: "bad", pct: 78 },
      { label: { en: "Idle load draw", th: "โหลดฐานขณะไม่ผลิต" }, value: "18 kW", limit: "≈ 0", status: "warn", pct: 65 },
      { label: { en: "Estimated leaks", th: "ลมรั่ว (ประมาณ)" }, value: "18%", limit: "≤ 10%", status: "warn", pct: 62 },
    ],
    rootCause: [
      { en: "The air receiver is undersized.", th: "ถังพักลมเล็กเกินไป" },
      { en: "Both compressors are fixed-speed with no master sequencer, so they hunt against each other.", th: "Compressor ทั้งสองเป็นความเร็วคงที่ ไม่มี master sequencer จึงแย่งกันทำงาน" },
      { en: "A leak load keeps them loading.", th: "ลมรั่วทำให้ต้องเดินโหลดตลอด" },
    ],
    impact: { en: "Short-cycling wastes ~15% of compressor energy and shortens valve/motor life; the leaks add another 8%.", th: "การสับเปิด-ปิดถี่เปลืองพลังงาน Compressor ราว 15% และลดอายุวาล์ว/Motor ส่วนลมรั่วเพิ่มอีก 8%" },
    recommendation: [
      { en: "Retrofit one unit to VSD.", th: "ปรับ Compressor หนึ่งตัวเป็นแบบ VSD" },
      { en: "Add a 3,000 L receiver and a master sequencer.", th: "เพิ่มถังพักลม 3,000 ลิตร และ master sequencer" },
      { en: "Run a leak-repair sweep.", th: "สำรวจซ่อมจุดลมรั่ว" },
    ],
    parts: [
      { name: { en: "VSD retrofit kit", th: "ชุดปรับเป็น VSD" }, spec: "for 55 kW compressor · with controller", qty: 1, unit: UNIT_SET, unitPrice: 320000 },
      { name: { en: "Air receiver tank", th: "ถังพักลม" }, spec: "3,000 L · 10 bar · ASME", qty: 1, unit: UNIT_EA, unitPrice: 95000 },
      { name: { en: "Master sequencer", th: "Master Sequencer" }, spec: "up to 4 compressors · pressure-band control", qty: 1, unit: UNIT_EA, unitPrice: 68000 },
    ],
    capex: 540000, annualSaving: 312000, paybackMo: 21, co2: 41,
  },
  {
    id: "chiller", code: "PQ-10", severity: "warning", catKey: "chiller",
    title: { en: "Chiller efficiency drifting off design", th: "ประสิทธิภาพ Chiller เพี้ยนจากค่าออกแบบ" },
    category: { en: "Chiller / HVAC", th: "Chiller / HVAC" },
    asset: { en: "Chiller B · utility yard", th: "Chiller B · ลานยูทิลิตี้" }, meter: "PM-11 · chiller B", detected: "Jun 30 · 13:20",
    symptom: [
      { en: "It draws 26% more power than design for the same PLC cooling load.", th: "ดึงไฟมากกว่าค่าออกแบบ 26% สำหรับโหลดความเย็นเท่าเดิม (จาก PLC)" },
      { en: "The condenser-water setpoint (from the PLC) has drifted up, forcing more power per unit of cooling.", th: "setpoint น้ำคอนเดนเซอร์ (จาก PLC) เพี้ยนสูงขึ้น ทำให้ใช้ไฟมากขึ้นต่อความเย็นหนึ่งหน่วย" },
    ],
    metrics: [
      { label: { en: "Power vs design", th: "กำลังเทียบค่าออกแบบ" }, value: "+26%", limit: "0%", status: "bad", pct: 78 },
      { label: { en: "Excess power", th: "กำลังส่วนเกิน" }, value: "+23 kW", limit: "0", status: "bad", pct: 72 },
      { label: { en: "CW setpoint (PLC)", th: "Setpoint คอนเดนเซอร์ (PLC)" }, value: "32°C", limit: "29°C", status: "warn", pct: 55 },
    ],
    rootCause: [
      { en: "Likely fouled condenser tubes.", th: "น่าจะท่อคอนเดนเซอร์อุดตัน" },
      { en: "The high condenser-water setpoint makes the compressor work harder for the same cooling.", th: "setpoint น้ำคอนเดนเซอร์สูง ทำให้ Compressor ทำงานหนักขึ้นเพื่อความเย็นเท่าเดิม" },
    ],
    impact: { en: "The 26% drift costs ≈฿288,000/yr for the same cooling output.", th: "การเพี้ยน 26% ทำให้เสียค่าพลังงานราว ฿288,000/ปี สำหรับความเย็นเท่าเดิม" },
    recommendation: [
      { en: "Clean the condenser tubes and reset the setpoint to design.", th: "ล้างท่อคอนเดนเซอร์ และตั้งค่ากลับสู่ค่าออกแบบ" },
      { en: "Add a VFD on the condenser-water pump for wet-bulb reset.", th: "เพิ่ม VFD ที่ Condenser-water pump เพื่อรีเซ็ตตามอุณหภูมิกระเปาะเปียก" },
      { en: "Mostly service — very fast payback.", th: "ส่วนใหญ่เป็นงานบริการ — คืนทุนเร็วมาก" },
    ],
    parts: [
      { name: { en: "Condenser tube cleaning", th: "ล้างท่อคอนเดนเซอร์" }, spec: "chemical + mechanical · service", qty: 1, unit: UNIT_LOT, unitPrice: 28000 },
      { name: { en: "Condenser-pump VFD", th: "VFD Condenser pump" }, spec: "22 kW · 415V · wet-bulb reset", qty: 1, unit: UNIT_EA, unitPrice: 42000 },
    ],
    capex: 65000, annualSaving: 288000, paybackMo: 3, co2: 38,
  },
  {
    id: "transformer", code: "PQ-11", severity: "warning", catKey: "transformer",
    title: { en: "Main transformer near thermal limit", th: "หม้อแปลงหลักใกล้พิกัดความร้อน" },
    category: { en: "Transformer", th: "หม้อแปลง" },
    asset: { en: "TX-1 · 2,000 kVA", th: "TX-1 · 2,000 kVA" }, meter: "PM-02 · TX-1", detected: "Jun 22 · 14:00",
    symptom: [
      { en: "TX-1 loads to 92%.", th: "TX-1 โหลดสูงถึง 92%" },
      { en: "Harmonics derate its usable capacity further, so real headroom is thinner than the nameplate — summer load pushes it hardest.", th: "ฮาร์มอนิกยังลดพิกัดที่ใช้งานได้ลงอีก พิกัดสำรองจริงจึงน้อยกว่าที่ป้ายระบุ — โหลดหน้าร้อนกดดันหนักสุด" },
    ],
    metrics: [
      { label: { en: "Transformer loading", th: "โหลดหม้อแปลง" }, value: "92%", limit: "≤ 80%", status: "bad", pct: 90 },
      { label: { en: "Harmonic derating", th: "Derate จากฮาร์มอนิก" }, value: "-7%", limit: "0%", status: "warn", pct: 60 },
      { label: { en: "Usable headroom", th: "พิกัดสำรองที่ใช้ได้" }, value: "1%", limit: "≥ 20%", status: "warn", pct: 68 },
    ],
    rootCause: [
      { en: "Load growth plus harmonic derating.", th: "โหลดเติบโตขึ้นบวกการลดพิกัดจากฮาร์มอนิก" },
      { en: "The transformer must be derated for the harmonic-rich load, so headroom is nearly gone.", th: "หม้อแปลงต้องลดพิกัดสำหรับโหลดที่มีฮาร์มอนิกสูง จึงแทบไม่มีพิกัดสำรอง" },
    ],
    impact: { en: "No headroom for expansion, accelerated insulation ageing, and risk of a forced outage on the hottest days.", th: "ไม่มีพิกัดสำรองสำหรับขยาย ฉนวนเสื่อมเร็วขึ้น และเสี่ยงไฟดับฉุกเฉินในวันที่ร้อนที่สุด" },
    recommendation: [
      { en: "First recover ~7% capacity by fixing harmonics (see PQ-02).", th: "เริ่มด้วยการกู้พิกัดคืนราว 7% ด้วยการแก้ฮาร์มอนิก (ดู PQ-02)" },
      { en: "If growth continues, add a second 1,000 kVA transformer with a tie breaker.", th: "หากยังเติบโตต่อ ให้เพิ่มหม้อแปลงตัวที่สอง 1,000 kVA พร้อม tie breaker" },
    ],
    parts: [
      { name: { en: "Distribution transformer", th: "หม้อแปลงจำหน่าย" }, spec: "1,000 kVA · cast-resin · K-13", qty: 1, unit: UNIT_EA, unitPrice: 920000 },
      { name: { en: "LV tie breaker & panel", th: "tie breaker & ตู้ LV" }, spec: "1,600 A · ACB · interlocked", qty: 1, unit: UNIT_SET, unitPrice: 180000 },
    ],
    capex: 1150000, annualSaving: 210000, paybackMo: 66, co2: 15,
  },
  {
    id: "resonance", code: "PQ-12", severity: "warning", catKey: "resonance",
    title: { en: "Capacitor bank at harmonic-resonance risk", th: "ชุดคาปาซิเตอร์เสี่ยงเรโซแนนซ์กับฮาร์มอนิก" },
    category: { en: "Harmonics", th: "ฮาร์มอนิก" },
    asset: { en: "Existing PF bank · MDB-A", th: "ชุดคาปาซิเตอร์เดิม · MDB-A" }, meter: "PM-03 · PF bank", detected: "Jun 23 · 10:40",
    symptom: [
      { en: "The existing un-detuned capacitor bank sits near the 5th-harmonic resonance point.", th: "ชุดคาปาซิเตอร์เดิมที่ไม่มีรีแอกเตอร์ดีจูน อยู่ใกล้จุดเรโซแนนซ์ฮาร์มอนิกลำดับ 5" },
      { en: "Two capacitor steps have already failed early.", th: "มีคาปาซิเตอร์เสียก่อนกำหนดแล้ว 2 สเต็ป" },
    ],
    metrics: [
      { label: { en: "Resonance point", th: "จุดเรโซแนนซ์" }, value: "~4.8th", limit: "away from 5th", status: "bad", pct: 75 },
      { label: { en: "Cap failures", th: "คาปาซิเตอร์เสีย" }, value: "2 steps", limit: "0", status: "bad", pct: 70 },
      { label: { en: "Cap current", th: "กระแสคาปาซิเตอร์" }, value: "138%", limit: "≤ 130%", status: "warn", pct: 62 },
    ],
    rootCause: [
      { en: "Capacitors without series reactors form a parallel resonant circuit with the transformer.", th: "คาปาซิเตอร์ที่ไม่มีรีแอกเตอร์อนุกรม สร้างวงจรเรโซแนนซ์ขนานกับหม้อแปลง" },
      { en: "Near the dominant 5th harmonic it amplifies current until the capacitors fail.", th: "ใกล้ฮาร์มอนิกลำดับ 5 ที่เด่น ทำให้กระแสถูกขยายจนคาปาซิเตอร์เสีย" },
    ],
    impact: { en: "Repeated capacitor failures, blown fuses, and the PF-correction benefit is lost whenever a step drops out.", th: "คาปาซิเตอร์เสียซ้ำ ฟิวส์ขาด และประโยชน์การแก้ PF หายไปทุกครั้งที่มีสเต็ปหลุด" },
    recommendation: [
      { en: "Retrofit 7% detuned reactors on every capacitor step.", th: "ปรับใส่รีแอกเตอร์ดีจูน 7% ที่คาปาซิเตอร์ทุกสเต็ป" },
      { en: "This shifts resonance below the 5th harmonic — protecting the existing investment.", th: "เลื่อนจุดเรโซแนนซ์ให้ต่ำกว่าฮาร์มอนิกลำดับ 5 — ปกป้องเงินลงทุนเดิม" },
    ],
    parts: [
      { name: { en: "Detuned reactor (7%)", th: "รีแอกเตอร์ดีจูน 7%" }, spec: "7% · per 25 kVAR step", qty: 8, unit: UNIT_EA, unitPrice: 12000 },
      { name: { en: "Capacitor replacement", th: "เปลี่ยนคาปาซิเตอร์" }, spec: "25 kVAR · heavy-duty · for failed steps", qty: 2, unit: UNIT_EA, unitPrice: 9500 },
    ],
    capex: 180000, annualSaving: 60000, paybackMo: 36, co2: 5,
  },
  {
    id: "schedule", code: "PQ-13", severity: "advisory", catKey: "schedule",
    title: { en: "Lighting & AHUs running off-shift", th: "ไฟส่องสว่าง & AHU เปิดค้างนอกกะ" },
    category: { en: "Load profile", th: "โปรไฟล์โหลด" },
    asset: { en: "Warehouse & offices", th: "คลังสินค้า & สำนักงาน" }, meter: "PM-12 · lighting DB", detected: "Jun 28 · 21:00",
    symptom: [
      { en: "≈40 kW of high-bay lighting and two AHUs run through nights and weekends.", th: "ไฟไฮเบย์ราว 40 kW และ AHU สองชุด เปิดค้างตลอดคืนและวันหยุด" },
      { en: "The areas are empty at the time.", th: "ทั้งที่พื้นที่ว่างในช่วงเวลานั้น" },
    ],
    metrics: [
      { label: { en: "Off-shift load", th: "โหลดนอกกะ" }, value: "40 kW", limit: "≈ 0", status: "bad", pct: 68 },
      { label: { en: "Wasted hours", th: "ชั่วโมงที่เสียเปล่า" }, value: "~2,900 h/yr", limit: "0", status: "warn", pct: 60 },
      { label: { en: "Zones affected", th: "โซนที่เกี่ยวข้อง" }, value: "5", limit: "0", status: "warn", pct: 45 },
    ],
    rootCause: [
      { en: "Lighting and HVAC run on manual switches.", th: "ไฟและ HVAC ใช้สวิตช์มือ" },
      { en: "No scheduling or occupancy sensing — the last person out rarely switches off.", th: "ไม่มีตารางเวลาหรือเซนเซอร์ตรวจจับคน — คนสุดท้ายมักไม่ปิด" },
    ],
    impact: { en: "≈฿214,000/yr of energy lighting and cooling empty space.", th: "เสียค่าพลังงานราว ฿214,000/ปี ให้แสงสว่างและความเย็นกับพื้นที่ที่ไม่มีคน" },
    recommendation: [
      { en: "Add a lighting control panel with time schedules and occupancy sensors.", th: "ติดตั้งตู้ควบคุมแสงสว่าง พร้อมตารางเวลาและเซนเซอร์ตรวจจับคน" },
      { en: "Tie the AHUs into the BMS schedule.", th: "ผูก AHU เข้ากับตารางเวลาของ BMS" },
    ],
    parts: [
      { name: { en: "Lighting control panel", th: "ตู้ควบคุมแสงสว่าง" }, spec: "DALI · 24 zones · astro time-clock", qty: 1, unit: UNIT_SET, unitPrice: 62000 },
      { name: { en: "Occupancy / daylight sensors", th: "เซนเซอร์ตรวจจับคน / แสง" }, spec: "PIR + lux · wireless", qty: 24, unit: UNIT_EA, unitPrice: 1400 },
    ],
    capex: 95000, annualSaving: 214000, paybackMo: 5, co2: 30,
  },
  {
    id: "distcap", code: "PQ-14", severity: "advisory", catKey: "distcap",
    title: { en: "High reactive load on moulding feeder", th: "โหลดรีแอกทีฟสูงที่ฟีดเดอร์ไลน์ฉีดพลาสติก" },
    category: { en: "Power Factor", th: "เพาเวอร์แฟกเตอร์" },
    asset: { en: "Feeder-3 · injection moulding", th: "ฟีดเดอร์ 3 · ไลน์ฉีดพลาสติก" }, meter: "PM-13 · feeder-3", detected: "Jun 27 · 12:15",
    symptom: [
      { en: "Feeder-3 runs at PF 0.71 with high kVAR from the moulding machines.", th: "ฟีดเดอร์ 3 เดินที่ PF 0.71 มี kVAR สูงจากเครื่องฉีด" },
      { en: "It drags the whole-plant PF down and loads the feeder cable.", th: "ทำให้ PF รวมของโรงงานตก และสายฟีดเดอร์รับโหลดหนัก" },
    ],
    metrics: [
      { label: { en: "Feeder PF", th: "PF ฟีดเดอร์" }, value: "0.71", limit: "≥ 0.95", status: "bad", pct: 74 },
      { label: { en: "Reactive load", th: "โหลดรีแอกทีฟ" }, value: "220 kVAR", limit: "≤ 60", status: "bad", pct: 80 },
      { label: { en: "Cable loading", th: "โหลดสายเคเบิล" }, value: "83%", limit: "≤ 70%", status: "warn", pct: 60 },
    ],
    rootCause: [
      { en: "The moulding motors sit far from the central PF bank.", th: "Motor เครื่องฉีดอยู่ไกลจากชุดคาปาซิเตอร์กลาง" },
      { en: "Central compensation can't relieve the reactive current on this feeder cable.", th: "การชดเชยจากส่วนกลางจึงลดกระแสรีแอกทีฟบนสายฟีดเดอร์นี้ไม่ได้" },
    ],
    impact: { en: "Central-only correction leaves this feeder overloaded and lossy; distributed compensation frees ~13% of cable capacity.", th: "การแก้จากส่วนกลางอย่างเดียวทำให้ฟีดเดอร์นี้โหลดหนักและสูญเสียมาก การชดเชยแบบกระจายช่วยคืนพิกัดสายราว 13%" },
    recommendation: [
      { en: "Install a local 200 kVAR detuned capacitor bank at Feeder-3 (distributed compensation).", th: "ติดตั้งชุดคาปาซิเตอร์ดีจูน 200 kVAR ที่ฟีดเดอร์ 3 (ชดเชยแบบกระจาย)" },
      { en: "Reactive current then never travels down the cable.", th: "กระแสรีแอกทีฟจะไม่วิ่งผ่านสายฟีดเดอร์" },
    ],
    parts: [
      { name: { en: "Local PF capacitor bank", th: "ตู้คาปาซิเตอร์ PF เฉพาะจุด" }, spec: "200 kVAR · 6-step · detuned 7% · 415V", qty: 1, unit: UNIT_SET, unitPrice: 145000 },
    ],
    capex: 160000, annualSaving: 132000, paybackMo: 15, co2: 8,
  },
  {
    id: "overvoltage", code: "PQ-15", severity: "advisory", catKey: "overvoltage",
    title: { en: "Supply voltage high · over-fluxing loads", th: "แรงดันจ่ายสูงเกิน · โหลดใช้ไฟเกินจำเป็น" },
    category: { en: "Voltage", th: "แรงดัน" },
    asset: { en: "Main incomer · all feeders", th: "จุดรับไฟหลัก · ทุกฟีดเดอร์" }, meter: "PM-01 · MDB-A", detected: "Jun 26 · 03:30",
    symptom: [
      { en: "Incoming voltage holds at 415–418 V (+3–4%) around the clock.", th: "แรงดันด้านเข้าค้างที่ 415–418 V (+3–4%) ตลอดเวลา" },
      { en: "Voltage-dependent loads — motors, lighting, heaters — draw more than they need.", th: "โหลดที่ขึ้นกับแรงดัน — Motor แสงสว่าง ฮีตเตอร์ — ดึงไฟมากกว่าที่จำเป็น" },
    ],
    metrics: [
      { label: { en: "Supply voltage", th: "แรงดันจ่าย" }, value: "417 V", limit: "400 V", status: "warn", pct: 65 },
      { label: { en: "Over-nominal", th: "เกินค่าปกติ" }, value: "+4.2%", limit: "±2%", status: "warn", pct: 58 },
      { label: { en: "Voltage-dep. load", th: "โหลดที่ขึ้นกับแรงดัน" }, value: "62%", limit: "—", status: "ok", pct: 40 },
    ],
    rootCause: [
      { en: "The utility tap and a lightly loaded transformer keep the bus above nominal.", th: "ตำแหน่งแท็ปของการไฟฟ้าและหม้อแปลงที่รับโหลดน้อย ทำให้แรงดันบัสสูงกว่าปกติ" },
      { en: "Nothing trims it back down to the plant's actual needs.", th: "ไม่มีอะไรปรับลดให้ตรงกับความต้องการจริงของโรงงาน" },
    ],
    impact: { en: "Every +1% of over-voltage adds ~1.5% loss on motors and shortens lamp life; ~2–3% of voltage-dependent energy is wasted.", th: "แรงดันเกินทุก +1% เพิ่มการสูญเสีย Motor ราว 1.5% และลดอายุหลอดไฟ พลังงานของโหลดที่ขึ้นกับแรงดันถูกทิ้งไปราว 2–3%" },
    recommendation: [
      { en: "Change the transformer off-load tap down one step.", th: "ปรับแท็ปหม้อแปลง (ปลดโหลด) ลงหนึ่งสเต็ป" },
      { en: "Install a voltage-optimisation unit at the incomer to hold the bus at nominal.", th: "ติดตั้งชุดปรับแรงดัน (Voltage Optimiser) ที่จุดรับไฟ เพื่อคุมแรงดันบัสให้อยู่ระดับปกติ" },
    ],
    parts: [
      { name: { en: "Voltage optimisation unit", th: "ชุดปรับแรงดัน (Voltage Optimiser)" }, spec: "2,000 kVA · -4% to 0 · auto-tap", qty: 1, unit: UNIT_SET, unitPrice: 340000 },
      { name: { en: "Transformer tap change", th: "ปรับแท็ปหม้อแปลง" }, spec: "off-load · one step · service", qty: 1, unit: UNIT_LOT, unitPrice: 18000 },
    ],
    capex: 380000, annualSaving: 246000, paybackMo: 19, co2: 33,
  },
];

/** Roll-up of the findings for the answer-first hero summary. */
export const pmSummary = {
  count: pmFindings.length,
  critical: pmFindings.filter((f) => f.severity === "critical").length,
  totalCapex: pmFindings.reduce((s, f) => s + f.capex, 0),
  totalSaving: pmFindings.reduce((s, f) => s + f.annualSaving, 0),
  totalCo2: pmFindings.reduce((s, f) => s + f.co2, 0),
  get blendedPaybackMo() {
    return Math.round((this.totalCapex / this.totalSaving) * 12);
  },
};

/* ------------------------------------ 05 report · M&V before/after baselines
 * Keyed by the finding/WO id (WorkOrder.findingId). When a WO is verified, the Report
 * step pulls the machine's pre-fix baseline and compares it to the post-fix reading —
 * proving (from power-meter + PLC only) that energy/efficiency actually improved. */
export type MVBaseline = { id: string; machine: LZ; metric: LZ; before: number; after: number; target: number; unit: string; betterLower: boolean; monitorDays: number };
export const mvBaselines: MVBaseline[] = [
  { id: "cp-chiller", machine: { en: "Chiller B · utility yard", th: "Chiller B · ลานยูทิลิตี้" }, metric: { en: "Specific power (kW per %PLC-load)", th: "กำลังจำเพาะ (kW ต่อ %โหลด PLC)" }, before: 1.26, after: 1.03, target: 1.05, unit: "", betterLower: true, monitorDays: 21 },
  { id: "cp-air", machine: { en: "Compressors · C-1/C-2", th: "คอมเพรสเซอร์ · C-1/C-2" }, metric: { en: "Night base-load draw", th: "โหลดฐานกลางคืน" }, before: 18, after: 5, target: 2, unit: " kW", betterLower: true, monitorDays: 14 },
  { id: "cp-pf", machine: { en: "PF bank · MDB-A", th: "ชุดคาปาซิเตอร์ · MDB-A" }, metric: { en: "Power factor", th: "เพาเวอร์แฟกเตอร์" }, before: 0.88, after: 0.98, target: 0.95, unit: "", betterLower: false, monitorDays: 20 },
  { id: "cp-sag", machine: { en: "Packing line · DB-5", th: "ไลน์แพ็ก · DB-5" }, metric: { en: "Line downtime", th: "เวลาไลน์หยุด" }, before: 3.2, after: 0.2, target: 0.5, unit: " h/mo", betterLower: true, monitorDays: 30 },
  { id: "cp-pump", machine: { en: "Cooling-water pump P-3", th: "ปั๊มน้ำเย็น P-3" }, metric: { en: "Motor load factor", th: "ตัวประกอบโหลดมอเตอร์" }, before: 38, after: 82, target: 75, unit: "%", betterLower: false, monitorDays: 14 },
  { id: "qw-peak", machine: { en: "Plant-wide · main meter", th: "ทั้งโรงงาน · มิเตอร์หลัก" }, metric: { en: "Monthly peak demand", th: "พีคดีมานด์รายเดือน" }, before: 1560, after: 1410, target: 1450, unit: " kW", betterLower: true, monitorDays: 30 },
  { id: "qw-idle", machine: { en: "6 CNC machines", th: "เครื่อง CNC 6 เครื่อง" }, metric: { en: "Idle base-load", th: "โหลดฐานเดินตัวเปล่า" }, before: 24, after: 4, target: 6, unit: " kW", betterLower: true, monitorDays: 14 },
  { id: "pq-01", machine: { en: "MDB · incomer", th: "ตู้เมน MDB · จุดรับไฟ" }, metric: { en: "Power factor", th: "เพาเวอร์แฟกเตอร์" }, before: 0.82, after: 0.99, target: 0.95, unit: "", betterLower: false, monitorDays: 30 },
  { id: "pq-06", machine: { en: "Plant-wide · main meter", th: "ทั้งโรงงาน · มิเตอร์หลัก" }, metric: { en: "Monthly peak demand", th: "พีคดีมานด์รายเดือน" }, before: 1560, after: 1420, target: 1450, unit: " kW", betterLower: true, monitorDays: 30 },
  { id: "pq-10", machine: { en: "Chiller · CH-2", th: "Chiller · CH-2" }, metric: { en: "Specific power (kW per %PLC-load)", th: "กำลังจำเพาะ (kW ต่อ %โหลด PLC)" }, before: 1.26, after: 1.05, target: 1.05, unit: "", betterLower: true, monitorDays: 21 },
];

/** did the post-fix reading actually reach the promised target? */
export const mvMetTarget = (b: MVBaseline) => (b.betterLower ? b.after <= b.target : b.after >= b.target);

/* --------------------------------------------- 04 recommend & act · action plan
 * Split by capital: quickWins need ฿0 (software/schedule/config — an executive can
 * approve on the spot, the AI can run many automatically), capitalProjects need budget
 * and carry a full BOM with brand + part number so an engineer can order directly. */
export type ActionPart = { name: LZ; brand: string; partNo: string; spec: string; qty: number; unit: LZ; unitPrice: number };

export const quickWins: { id: string; title: LZ; asset: LZ; savingYr: number; effort: LZ; how: LZ; auto: boolean }[] = [
  { id: "qw-peak", title: { en: "Peak-demand management", th: "จัดการพีคดีมานด์" }, asset: { en: "Plant-wide · main meter", th: "ทั้งโรงงาน · มิเตอร์หลัก" }, savingYr: 240000, effort: { en: "PLC rules · 2 days", th: "ตั้งกฎ PLC · 2 วัน" }, how: { en: "Shed / stage non-critical loads before demand hits the 1,500 kW cap", th: "ปลด / สลับโหลดไม่วิกฤตก่อนดีมานด์แตะเพดาน 1,500 kW" }, auto: true },
  { id: "qw-idle", title: { en: "Idle-waste management", th: "จัดการไฟเดินตัวเปล่า" }, asset: { en: "6 CNC machines · shop floor", th: "เครื่อง CNC 6 เครื่อง · พื้นที่ผลิต" }, savingYr: 168000, effort: { en: "PLC logic · 2 days", th: "ตั้งลอจิก PLC · 2 วัน" }, how: { en: "Auto-standby: drop hydraulics & controls after 15 min idle", th: "auto-standby: ตัดไฮดรอลิก & คอนโทรลหลังเดินเบา 15 นาที" }, auto: true },
  { id: "qw-stagger", title: { en: "Scheduled load — staggered start-up", th: "จัดตารางโหลด — ไล่เปิดเครื่อง" }, asset: { en: "Production lines · shift start", th: "สายการผลิต · เริ่มกะ" }, savingYr: 120000, effort: { en: "PLC schedule · 1 day", th: "ตั้งตาราง PLC · 1 วัน" }, how: { en: "Spread machine start-ups so they don't all inrush together and spike the peak", th: "กระจายเวลาเปิดเครื่อง ไม่ให้กระชากพร้อมกันจนดันพีค" }, auto: true },
  { id: "qw-shift", title: { en: "Off-peak load shifting", th: "เลื่อนโหลดไปช่วง off-peak" }, asset: { en: "Compressors · chillers", th: "คอมเพรสเซอร์ · ชิลเลอร์" }, savingYr: 300000, effort: { en: "BMS / PLC schedule · 1 day", th: "ตั้งตาราง BMS / PLC · 1 วัน" }, how: { en: "Move deferrable loads (air, pre-cooling) into the cheap off-peak window", th: "ย้ายโหลดที่เลื่อนได้ (ลม, พรีคูล) ไปช่วง off-peak ค่าไฟถูก" }, auto: true },
];

export const capitalProjects: { id: string; severity: "critical" | "warning" | "recommend"; title: LZ; asset: LZ; savingYr: number; capex: number; paybackMo: number; roi: number; downtime: LZ; why: LZ; evidence: LZ[]; outcome: LZ[]; parts: ActionPart[] }[] = [
  {
    id: "cp-chiller", severity: "warning", title: { en: "Restore Chiller B efficiency", th: "กู้ประสิทธิภาพ Chiller B" }, asset: { en: "Chiller B · utility yard", th: "Chiller B · ลานยูทิลิตี้" },
    savingYr: 288000, capex: 70000, paybackMo: 3, roi: 411, downtime: { en: "4 h · off-shift", th: "4 ชม. · นอกกะ" },
    why: { en: "Chiller B has drifted 26% off its design efficiency — it now draws far more power for the same cooling and is the plant's single most expensive drift.", th: "Chiller B ประสิทธิภาพเพี้ยนจากค่าออกแบบ 26% — ใช้ไฟมากขึ้นมากเพื่อความเย็นเท่าเดิม และเป็นจุดที่แพงที่สุดในโรงงาน" },
    evidence: [
      { en: "+23 kW vs same-load baseline", th: "+23 kW เทียบค่าฐานที่โหลดเท่ากัน" },
      { en: "specific power (kW per PLC load%) up 26%", th: "กำลังจำเพาะ (kW ต่อ %โหลด PLC) เพิ่ม 26%" },
      { en: "runs longer to hold the setpoint", th: "เดินนานขึ้นเพื่อรักษา setpoint" },
    ],
    outcome: [
      { en: "Back to design efficiency — the +23 kW excess draw is gone", th: "กลับสู่ประสิทธิภาพออกแบบ — กำลังส่วนเกิน +23 kW หายไป" },
      { en: "Same cooling for ~26% less power", th: "ความเย็นเท่าเดิมด้วยไฟน้อยลง ~26%" },
      { en: "≈฿288,000/yr recovered · pays back in 3 months", th: "กู้คืน ≈฿288,000/ปี · คืนทุนใน 3 เดือน" },
    ],
    parts: [
      { name: { en: "Condenser tube cleaning", th: "ล้างท่อคอนเดนเซอร์" }, brand: "Service", partNo: "—", spec: "chemical + mechanical", qty: 1, unit: UNIT_LOT, unitPrice: 28000 },
      { name: { en: "Condenser-pump VFD 22 kW", th: "VFD ปั๊มคอนเดนเซอร์ 22 kW" }, brand: "ABB", partNo: "ACS580-01-045A-4", spec: "22 kW · 415V · IP21 · built-in choke", qty: 1, unit: UNIT_EA, unitPrice: 42000 },
    ],
  },
  {
    id: "cp-air", severity: "warning", title: { en: "Compressed-air VSD + sequencing", th: "ระบบลม VSD + จัดลำดับ" }, asset: { en: "Compressor room · C-1/C-2", th: "ห้องคอมเพรสเซอร์ · C-1/C-2" },
    savingYr: 312000, capex: 540000, paybackMo: 21, roi: 58, downtime: { en: "1 day · weekend", th: "1 วัน · เสาร์-อาทิตย์" },
    why: { en: "Two fixed-speed compressors short-cycle and hunt against each other, and a persistent night draw points to leaks — wasting ~15–20% of compressed-air energy.", th: "คอมเพรสเซอร์ความเร็วคงที่ 2 ตัวสับเปิด-ปิดถี่และแย่งกันทำงาน บวกโหลดกลางคืนที่ค้างชี้ว่ามีลมรั่ว — เปลืองพลังงานลมราว 15–20%" },
    evidence: [
      { en: "load/unload cycling 14×/hour", th: "โหลด/อันโหลด 14 ครั้ง/ชม." },
      { en: "still draws load-power at 02:00 with all lines idle (PLC)", th: "ยังดึงไฟแบบโหลดตอน 02:00 ทั้งที่ไลน์หยุด (PLC)" },
      { en: "two fixed-speed units poorly staged", th: "สองตัวความเร็วคงที่จัดลำดับไม่ดี" },
    ],
    outcome: [
      { en: "Short-cycling stops — one VSD unit trims smoothly to demand", th: "หยุดสับเปิด-ปิดถี่ — VSD ปรับตามความต้องการนุ่มนวล" },
      { en: "Night base-load & leak losses cut", th: "ตัดโหลดฐานกลางคืน & การรั่วทิ้ง" },
      { en: "≈฿312,000/yr saved · longer valve & motor life", th: "ประหยัด ≈฿312,000/ปี · วาล์ว & มอเตอร์อายุยืนขึ้น" },
    ],
    parts: [
      { name: { en: "VSD retrofit kit 55 kW", th: "ชุด VSD 55 kW" }, brand: "Danfoss", partNo: "VLT FC-102 P55K", spec: "55 kW · 415V · with controller", qty: 1, unit: UNIT_SET, unitPrice: 320000 },
      { name: { en: "Air receiver 3,000 L", th: "ถังพักลม 3,000 ลิตร" }, brand: "Kaeser", partNo: "3000L-11bar-ASME", spec: "3,000 L · 11 bar · ASME", qty: 1, unit: UNIT_EA, unitPrice: 95000 },
      { name: { en: "Master sequencer", th: "Master sequencer" }, brand: "Atlas Copco", partNo: "ES 4000", spec: "up to 4 compressors · pressure-band", qty: 1, unit: UNIT_EA, unitPrice: 68000 },
    ],
  },
  {
    id: "cp-pf", severity: "warning", title: { en: "Detuned power-factor correction", th: "แก้ Power Factor แบบดีจูน" }, asset: { en: "PF bank · MDB-A", th: "ชุดคาปาซิเตอร์ · MDB-A" },
    savingYr: 60000, capex: 180000, paybackMo: 36, roi: 33, downtime: { en: "3 h · off-shift", th: "3 ชม. · นอกกะ" },
    why: { en: "The un-detuned capacitor bank sits near the 5th-harmonic resonance point — steps keep failing early and the power-factor benefit is lost whenever one drops out.", th: "ชุดคาปาซิเตอร์ที่ไม่มีรีแอกเตอร์ดีจูนอยู่ใกล้จุดเรโซแนนซ์ฮาร์มอนิกลำดับ 5 — คาปาซิเตอร์เสียก่อนกำหนดซ้ำ และประโยชน์ PF หายไปทุกครั้งที่สเต็ปหลุด" },
    evidence: [
      { en: "capacitor current 138% of rating", th: "กระแสคาปาซิเตอร์ 138% ของพิกัด" },
      { en: "2 capacitor steps already failed early", th: "คาปาซิเตอร์เสียก่อนกำหนดแล้ว 2 สเต็ป" },
      { en: "resonance near the 4.8th · 5th harmonic dominant", th: "เรโซแนนซ์ใกล้ลำดับ 4.8 · ฮาร์มอนิกลำดับ 5 เด่น" },
    ],
    outcome: [
      { en: "Resonance shifted below the 5th harmonic — no more early capacitor failures", th: "เลื่อนเรโซแนนซ์ต่ำกว่าฮาร์มอนิกลำดับ 5 — คาปาซิเตอร์ไม่เสียก่อนกำหนดอีก" },
      { en: "PF correction stays online — no lost steps or PF penalty", th: "การแก้ PF ทำงานต่อเนื่อง — ไม่มีสเต็ปหลุดหรือค่าปรับ PF" },
      { en: "≈฿60,000/yr saved · protects the existing bank", th: "ประหยัด ≈฿60,000/ปี · ปกป้องชุดคาปาซิเตอร์เดิม" },
    ],
    parts: [
      { name: { en: "Detuned reactor 7%", th: "รีแอกเตอร์ดีจูน 7%" }, brand: "Schneider", partNo: "VLVAF7L025A40", spec: "7% · 25 kVAR step · 415V", qty: 8, unit: UNIT_EA, unitPrice: 12000 },
      { name: { en: "Capacitor 25 kVAR", th: "คาปาซิเตอร์ 25 kVAR" }, brand: "EPCOS", partNo: "B44066S3025K230", spec: "25 kVAR · 415V · heavy-duty", qty: 2, unit: UNIT_EA, unitPrice: 9500 },
    ],
  },
  {
    id: "cp-sag", severity: "critical", title: { en: "Ride-through for the sag-sensitive line", th: "ป้องกันไฟตกให้ไลน์ที่ไว" }, asset: { en: "Packing line PLC · DB-5", th: "PLC ไลน์แพ็ก · DB-5" },
    savingYr: 1240000, capex: 850000, paybackMo: 8, roi: 146, downtime: { en: "8 h · weekend", th: "8 ชม. · เสาร์-อาทิตย์" },
    why: { en: "Recurrent voltage sags drop out the packing-line PLCs and stop production 12× a month — the single biggest loss on the plant.", th: "ไฟตกซ้ำ ๆ ทำ PLC ไลน์แพ็กหลุดและหยุดผลิต 12 ครั้ง/เดือน — เป็นการสูญเสียก้อนใหญ่ที่สุด" },
    evidence: [
      { en: "12 sags to 76% for ~120 ms this month", th: "ไฟตก 12 ครั้งลงถึง 76% นาน ~120 ms เดือนนี้" },
      { en: "DOL start of Chiller B (6× inrush) collapses the bus locally", th: "สตาร์ท DOL ของ Chiller B (กระชาก 6 เท่า) ทำแรงดันบัสตกเฉพาะจุด" },
      { en: "3.2 h/mo line downtime logged", th: "ไลน์หยุด 3.2 ชม./เดือน" },
    ],
    outcome: [
      { en: "Utility & local sags no longer stop the line", th: "ไฟตกจากการไฟฟ้า/เฉพาะจุดไม่ทำไลน์หยุดอีก" },
      { en: "Soft-start kills Chiller B's local inrush", th: "ซอฟต์สตาร์ทกำจัดกระชากของ Chiller B" },
      { en: "≈฿1.24M/yr of downtime & scrap avoided · payback 8 mo", th: "เลี่ยงความเสียหาย ≈฿1.24M/ปี · คืนทุน 8 เดือน" },
    ],
    parts: [
      { name: { en: "Digital soft starter", th: "ซอฟต์สตาร์ทดิจิทัล" }, brand: "ABB", partNo: "PSTX300-600-70", spec: "160 kW · 415V · with bypass contactor", qty: 1, unit: UNIT_EA, unitPrice: 145000 },
      { name: { en: "Online UPS · ride-through", th: "UPS ออนไลน์ · ride-through" }, brand: "Eaton", partNo: "93PM-30", spec: "30 kVA · online · <2 ms transfer", qty: 1, unit: UNIT_SET, unitPrice: 560000 },
    ],
  },
  {
    id: "cp-light", severity: "recommend", title: { en: "Lighting & AHU scheduling", th: "ตั้งเวลาไฟ & AHU" }, asset: { en: "Warehouse & offices", th: "คลังสินค้า & สำนักงาน" },
    savingYr: 214000, capex: 96000, paybackMo: 5, roi: 223, downtime: { en: "none · live install", th: "ไม่ต้องหยุด · ติดตั้งขณะเดินเครื่อง" },
    why: { en: "≈40 kW of high-bay lighting and two AHUs run through nights and weekends over empty space — pure schedule waste.", th: "ไฟไฮเบย์ ~40 kW และ AHU 2 ชุดเปิดค้างข้ามคืน/วันหยุดในพื้นที่ว่าง — เสียเปล่าจากไม่มีตารางเวลา" },
    evidence: [
      { en: "40 kW off-shift load on the lighting DB (metered)", th: "โหลดนอกกะ 40 kW ที่ตู้ไฟแสงสว่าง (วัดได้)" },
      { en: "~2,900 wasted hours/yr across 5 zones", th: "~2,900 ชม./ปี ที่เสียเปล่า ใน 5 โซน" },
    ],
    outcome: [
      { en: "Lights & AHUs follow a schedule and occupancy", th: "ไฟ & AHU ทำงานตามตารางและเซนเซอร์คน" },
      { en: "Empty areas stop drawing power off-shift", th: "พื้นที่ว่างหยุดกินไฟนอกกะ" },
      { en: "≈฿214,000/yr saved · payback 5 mo", th: "ประหยัด ≈฿214,000/ปี · คืนทุน 5 เดือน" },
    ],
    parts: [
      { name: { en: "Lighting control panel", th: "ตู้ควบคุมแสงสว่าง" }, brand: "Signify", partNo: "LCN9600 DALI", spec: "24 zones · astro time-clock", qty: 1, unit: UNIT_SET, unitPrice: 62000 },
      { name: { en: "Occupancy / daylight sensors", th: "เซนเซอร์ตรวจจับคน / แสง" }, brand: "Signify", partNo: "LRM1810", spec: "PIR + lux · wireless", qty: 24, unit: UNIT_EA, unitPrice: 1400 },
    ],
  },
  {
    id: "cp-pump", severity: "recommend", title: { en: "Right-size cooling-water pump + VFD", th: "เปลี่ยนปั๊มน้ำเย็นให้พอดี + VFD" }, asset: { en: "Cooling-water pump P-3", th: "ปั๊มน้ำเย็น P-3" },
    savingYr: 138000, capex: 210000, paybackMo: 18, roi: 66, downtime: { en: "6 h · off-shift", th: "6 ชม. · นอกกะ" },
    why: { en: "A 75 kW motor runs 24/7 at only 38% load and never near its efficient band — oversized and wasteful.", th: "มอเตอร์ 75 kW เดิน 24/7 ที่โหลดเพียง 38% ไม่เคยเข้าช่วงประสิทธิภาพดี — ใหญ่เกินและเปลืองไฟ" },
    evidence: [
      { en: "75 kW motor draws steadily at ~38% load", th: "มอเตอร์ 75 kW ดึงไฟคงที่ที่โหลด ~38%" },
      { en: "runs continuously at a low load factor", th: "เดินต่อเนื่องที่โหลดต่ำตลอด" },
    ],
    outcome: [
      { en: "Right-sized 37 kW IE4 motor runs near its efficient point", th: "มอเตอร์ IE4 37 kW ที่พอดีเดินใกล้จุดประสิทธิภาพ" },
      { en: "VFD matches speed to the real duty — no surplus draw", th: "VFD ปรับความเร็วตามงานจริง — ไม่มีกำลังส่วนเกิน" },
      { en: "≈฿138,000/yr saved · payback 18 mo", th: "ประหยัด ≈฿138,000/ปี · คืนทุน 18 เดือน" },
    ],
    parts: [
      { name: { en: "IE4 premium motor", th: "มอเตอร์ IE4 พรีเมียม" }, brand: "ABB", partNo: "3GBP112340-ADK", spec: "37 kW · 415V · 1,480 rpm · IE4", qty: 1, unit: UNIT_EA, unitPrice: 78000 },
      { name: { en: "Variable frequency drive", th: "อินเวอร์เตอร์ (VFD)" }, brand: "ABB", partNo: "ACS580-01-106A-4", spec: "45 kW · 415V · PID + reactor", qty: 1, unit: UNIT_EA, unitPrice: 96000 },
    ],
  },
  {
    id: "cp-voltage", severity: "recommend", title: { en: "Voltage optimisation at the incomer", th: "ปรับแรงดันที่จุดรับไฟ" }, asset: { en: "Main incomer · all feeders", th: "จุดรับไฟหลัก · ทุกฟีดเดอร์" },
    savingYr: 246000, capex: 380000, paybackMo: 19, roi: 65, downtime: { en: "6 h · off-shift", th: "6 ชม. · นอกกะ" },
    why: { en: "Incoming voltage holds +4% above nominal around the clock, so every voltage-dependent load (motors, lighting, heaters) draws more than it needs.", th: "แรงดันด้านเข้าค้างสูงกว่าปกติ +4% ตลอดเวลา ทำให้โหลดที่ขึ้นกับแรงดัน (มอเตอร์ ไฟ ฮีตเตอร์) ดึงไฟเกินจำเป็น" },
    evidence: [
      { en: "417 V held on the bus (+4.2% over 400 V nominal)", th: "แรงดันบัส 417 V (+4.2% เกิน 400 V)" },
      { en: "~62% of load is voltage-dependent (metered)", th: "~62% ของโหลดขึ้นกับแรงดัน (วัดได้)" },
    ],
    outcome: [
      { en: "Bus held at nominal — over-fluxing losses removed", th: "คุมแรงดันบัสให้อยู่ระดับปกติ — ตัดการใช้ไฟเกิน" },
      { en: "~2–3% of voltage-dependent energy recovered · longer lamp/motor life", th: "กู้คืนพลังงานโหลดแรงดัน ~2–3% · หลอด/มอเตอร์อายุยืน" },
      { en: "≈฿246,000/yr saved · payback 19 mo", th: "ประหยัด ≈฿246,000/ปี · คืนทุน 19 เดือน" },
    ],
    parts: [
      { name: { en: "Voltage optimisation unit", th: "ชุดปรับแรงดัน" }, brand: "Powerstar", partNo: "MAX-2000", spec: "2,000 kVA · -4% to 0 · auto-tap", qty: 1, unit: UNIT_SET, unitPrice: 340000 },
      { name: { en: "Transformer tap change", th: "ปรับแท็ปหม้อแปลง" }, brand: "Service", partNo: "—", spec: "off-load · one step", qty: 1, unit: UNIT_LOT, unitPrice: 18000 },
    ],
  },
  {
    id: "cp-distpf", severity: "recommend", title: { en: "Distributed PF at the moulding feeder", th: "ชดเชย PF เฉพาะจุดที่ไลน์ฉีด" }, asset: { en: "Feeder-3 · injection moulding", th: "ฟีดเดอร์ 3 · ไลน์ฉีดพลาสติก" },
    savingYr: 132000, capex: 160000, paybackMo: 15, roi: 83, downtime: { en: "3 h · off-shift", th: "3 ชม. · นอกกะ" },
    why: { en: "Feeder-3 runs at PF 0.71 with reactive current the central bank can't relieve — it overloads the cable and drags whole-plant PF down.", th: "ฟีดเดอร์ 3 เดินที่ PF 0.71 มีกระแสรีแอกทีฟที่ชุดกลางช่วยไม่ได้ — สายรับโหลดหนักและ PF รวมตก" },
    evidence: [
      { en: "Feeder PF 0.71 · 220 kVAR reactive", th: "PF ฟีดเดอร์ 0.71 · รีแอกทีฟ 220 kVAR" },
      { en: "cable loading 83% (metered)", th: "สายรับโหลด 83% (วัดได้)" },
    ],
    outcome: [
      { en: "Reactive current never travels down the feeder cable", th: "กระแสรีแอกทีฟไม่วิ่งผ่านสายฟีดเดอร์" },
      { en: "~13% of cable capacity freed · whole-plant PF up", th: "คืนพิกัดสาย ~13% · PF รวมดีขึ้น" },
      { en: "≈฿132,000/yr saved · payback 15 mo", th: "ประหยัด ≈฿132,000/ปี · คืนทุน 15 เดือน" },
    ],
    parts: [
      { name: { en: "Local PF capacitor bank", th: "ตู้คาปาซิเตอร์ PF เฉพาะจุด" }, brand: "Schneider", partNo: "VLVAW6N200A40", spec: "200 kVAR · 6-step · detuned 7% · 415V", qty: 1, unit: UNIT_SET, unitPrice: 145000 },
    ],
  },
  {
    id: "cp-ahf", severity: "warning", title: { en: "Active harmonic filter on the VFD bus", th: "Active Harmonic Filter ที่บัส VFD" }, asset: { en: "MDB-A · VFD-rich load", th: "MDB-A · โหลด VFD หนาแน่น" },
    savingYr: 156000, capex: 720000, paybackMo: 55, roi: 22, downtime: { en: "1 day · weekend", th: "1 วัน · เสาร์-อาทิตย์" },
    why: { en: "Harmonic-rich drives distort the current, derate the transformer and cause extra losses across the plant.", th: "ไดรฟ์ที่มีฮาร์มอนิกสูงทำกระแสเพี้ยน ลดพิกัดหม้อแปลง และเพิ่มการสูญเสียทั่วโรงงาน" },
    evidence: [
      { en: "current THD above the IEEE-519 limit at MDB-A", th: "THD กระแสเกินเกณฑ์ IEEE-519 ที่ MDB-A" },
      { en: "transformer derated ~7% for the harmonic load", th: "หม้อแปลงถูกลดพิกัด ~7% จากโหลดฮาร์มอนิก" },
    ],
    outcome: [
      { en: "THD pulled under IEEE-519 — clean current", th: "ดึง THD ต่ำกว่า IEEE-519 — กระแสสะอาด" },
      { en: "~7% transformer capacity recovered · lower losses", th: "กู้พิกัดหม้อแปลง ~7% · การสูญเสียลดลง" },
      { en: "≈฿156,000/yr saved · frees capacity for growth", th: "ประหยัด ≈฿156,000/ปี · เปิดพิกัดรองรับการขยาย" },
    ],
    parts: [
      { name: { en: "Active harmonic filter (AHF)", th: "Active Harmonic Filter (AHF)" }, brand: "ABB", partNo: "PQFI-100", spec: "100 A · 415V · IGBT · wall-mount", qty: 1, unit: UNIT_SET, unitPrice: 620000 },
      { name: { en: "Line reactor 5%", th: "ไลน์รีแอกเตอร์ 5%" }, brand: "Schaffner", partNo: "RWK305-45", spec: "5% · 45 kW · per drive", qty: 6, unit: UNIT_EA, unitPrice: 6500 },
    ],
  },
  {
    id: "cp-neutral", severity: "warning", title: { en: "Fix triplen-harmonic neutral overload", th: "แก้สายนิวทรัลรับโหลดเกิน (ฮาร์มอนิกลำดับ 3)" }, asset: { en: "Office & QC panel · DB-3", th: "ตู้สำนักงาน & QC · DB-3" },
    savingYr: 84000, capex: 260000, paybackMo: 37, roi: 32, downtime: { en: "4 h · off-shift", th: "4 ชม. · นอกกะ" },
    why: { en: "Hundreds of single-phase electronic loads pump 3rd-harmonic current into the shared neutral, overloading it and blocking any added load on the panel.", th: "โหลดเฟสเดียวอิเล็กทรอนิกส์นับร้อยอัดกระแสฮาร์มอนิกลำดับ 3 เข้าสายนิวทรัลร่วม ทำให้รับโหลดเกินและเพิ่มโหลดที่ตู้ไม่ได้" },
    evidence: [
      { en: "neutral current 118% of the average phase current", th: "กระแสนิวทรัล 118% ของกระแสเฉลี่ยต่อเฟส" },
      { en: "3rd-harmonic current 14% (limit 5%)", th: "ฮาร์มอนิกที่ 3 (กระแส) 14% (เกณฑ์ 5%)" },
    ],
    outcome: [
      { en: "Triplen harmonics trapped — neutral current back to safe", th: "ดักฮาร์มอนิกลำดับ 3 — กระแสนิวทรัลกลับสู่ปลอดภัย" },
      { en: "Panel freed to take new load · fire risk removed", th: "ตู้รับโหลดเพิ่มได้ · ตัดความเสี่ยงไฟไหม้" },
      { en: "≈฿84,000/yr saved · payback 37 mo", th: "ประหยัด ≈฿84,000/ปี · คืนทุน 37 เดือน" },
    ],
    parts: [
      { name: { en: "Harmonic-mitigating transformer", th: "หม้อแปลงลดฮาร์มอนิก" }, brand: "MTE", partNo: "HGP-150-K13", spec: "Zig-zag · 150 kVA · K-13", qty: 1, unit: UNIT_SET, unitPrice: 210000 },
      { name: { en: "Neutral busbar upgrade", th: "อัปเกรดบัสบาร์นิวทรัล" }, brand: "—", partNo: "—", spec: "200% neutral · copper", qty: 1, unit: UNIT_LOT, unitPrice: 28000 },
    ],
  },
];

/* ------------------------------------------------ optimization control tools */

/** Loads a peak-demand controller can shed, listed in priority (shed #1 first). */
/** A peak-shed load. `ctrl` = how it can be reduced: fully shed off, or only dimmed
 *  down to `minKw` (e.g. an AHU can throttle its VFD but must keep some airflow). */
/** `equipReady` = is the modulating hardware already installed? Throttling needs a
 *  VFD (motors) or dimmable driver (lights); if it's missing, that's a Level-2 install
 *  first, so we can't count the reduction as an immediate free saving. */
export type PeakLoad = { id: string; name: LZ; kw: number; ctrl: "shed" | "throttle"; minKw: number; how: LZ; equipReady: boolean; equip: LZ };
export const peakSheddable: PeakLoad[] = [
  { id: "ahu-c", name: { en: "Non-critical AHUs · zone C", th: "AHU ที่ไม่วิกฤต · โซน C" }, kw: 120, ctrl: "throttle", minKw: 60, how: { en: "Dim fan speed via VFD", th: "หรี่รอบ Fan ด้วย VFD" }, equipReady: true, equip: { en: "VFD", th: "VFD (อินเวอร์เตอร์)" } },
  { id: "air-topup", name: { en: "Compressed-air top-up", th: "เติมลมอัดสำรอง" }, kw: 90, ctrl: "shed", minKw: 0, how: { en: "Pause the backup top-up", th: "หยุดเติมลมสำรองชั่วคราว" }, equipReady: true, equip: { en: "contactor", th: "คอนแทกเตอร์" } },
  { id: "charge-bay", name: { en: "Battery charging bay", th: "จุดชาร์จแบตเตอรี่" }, kw: 60, ctrl: "shed", minKw: 0, how: { en: "Pause charging", th: "หยุดชาร์จชั่วคราว" }, equipReady: true, equip: { en: "contactor", th: "คอนแทกเตอร์" } },
  { id: "wh-light", name: { en: "Warehouse lighting · partial", th: "ไฟคลังสินค้า · บางส่วน" }, kw: 40, ctrl: "throttle", minKw: 20, how: { en: "Dim lighting to 50%", th: "หรี่แสงลง 50%" }, equipReady: false, equip: { en: "dimmable LED driver", th: "ไดรเวอร์ LED หรี่ได้" } },
];

/** Machines that would otherwise all start together at shift change — sequencing their
 *  starts spreads the inrush (`kw × inrushX`) so the combined surge stays under the cap.
 *  The pool is derived from the same asset registry the Settings screen manages, so the
 *  machine names/kW here always match what the plant has configured — single source of truth. */
export type StartupLoad = { id: string; name: LZ; kw: number; inrushX: number };

/** Startup inrush multiplier inferred from the machine's drive type.
 *  Soft-start drives (VSD/VFD/servo) barely surge; direct-on-line motors surge hardest. */
const startupInrushX = (a: Asset): number => {
  const t = `${a.type} ${a.name}`.toLowerCase();
  if (/vsd|vfd|servo|inverter|soft.?start/.test(t)) return 1.5; // drive-limited soft start
  if (/vision|inspection|switchboard|mdb|control panel/.test(t)) return 1.2; // electronics only
  if (/compressor/.test(t)) return 3.2;
  if (/chiller/.test(t)) return 3.0;
  if (/pump|tower|blower|air-handling|ahu|\bfan\b|boiler/.test(t)) return 3.6; // DOL fans & pumps
  if (/press|injection|imm|mold|mould|stamp/.test(t)) return 2.6;
  return 2.2; // CNC / robots / assembly and the rest
};

/** Only loads that actually draw a startup surge — skip near-zero & pure-electronic assets. */
const startupPool: StartupLoad[] = assets
  .filter((a) => a.powerKw >= 20)
  .map((a) => ({ id: a.id, name: { en: a.name, th: a.name }, kw: a.powerKw, inrushX: startupInrushX(a) }))
  .sort((x, y) => y.kw * y.inrushX - x.kw * x.inrushX);

/** Biggest-surge machines are pre-loaded into the sequence; the rest are addable candidates. */
export const startupLoads: StartupLoad[] = startupPool.slice(0, 6);
export const startupCandidates: StartupLoad[] = startupPool.slice(6);
/** Current registered demand (kW) shown in the peak manager. */
export const peakNow = 3060;

/** Machines the idle-standby manager watches; `idleFor` = current minutes idle,
 *  `idleTodayH` = cumulative hours drawn idle during production so far today. */
export const idleMachinesCtl: { id: string; name: string; area: LZ; idleFor: number; idleKw: number; idleTodayH: number }[] = [
  { id: "cnc-04", name: "CNC-04", area: { en: "Machining", th: "งานกลึง/มิลลิ่ง" }, idleFor: 22, idleKw: 4.5, idleTodayH: 2.6 },
  { id: "cnc-07", name: "CNC-07", area: { en: "Machining", th: "งานกลึง/มิลลิ่ง" }, idleFor: 17, idleKw: 4.2, idleTodayH: 2.1 },
  { id: "press-02", name: "Press-02", area: { en: "Stamping", th: "งานปั๊มขึ้นรูป" }, idleFor: 9, idleKw: 6.0, idleTodayH: 1.2 },
  { id: "inj-03", name: "Injection-03", area: { en: "Moulding", th: "ไลน์ฉีดพลาสติก" }, idleFor: 41, idleKw: 5.5, idleTodayH: 3.8 },
  { id: "conv-a", name: "Conveyor-A", area: { en: "Packing", th: "ไลน์แพ็ก" }, idleFor: 6, idleKw: 2.0, idleTodayH: 0.9 },
  { id: "weld-05", name: "Welder-05", area: { en: "Fabrication", th: "งานเชื่อม/ประกอบ" }, idleFor: 28, idleKw: 3.8, idleTodayH: 3.0 },
];

/* ------------------------------------------------------------------ reports */
/** Report templates for the Report tab — every report opens with a 1-page AI summary.
 *  Strings are EN source keys translated via tr(); schedule = default auto-delivery cadence. */
export type EnergyReportSchedule = "off" | "daily" | "weekly" | "monthly";
export const energyReports: { id: string; group: string; name: string; desc: string; audience: string; schedule: EnergyReportSchedule }[] = [
  { id: "en-daily", group: "Operations", name: "Daily energy report", desc: "kWh, baht and peak vs baseline — with a 1-paragraph AI summary", audience: "plant manager · shift leads", schedule: "daily" },
  { id: "en-pq", group: "Engineering", name: "Power quality report", desc: "PF, THD, unbalance and disturbance events vs IEEE/EN limits", audience: "electrical engineer", schedule: "off" },
  { id: "en-load", group: "Engineering", name: "Load & peak analysis", desc: "24-h load shape, peak window and demand-charge exposure", audience: "electrical engineer", schedule: "weekly" },
  { id: "en-machine", group: "Engineering", name: "Machine energy report", desc: "top consumers and abnormal draw, traced to the machine", audience: "engineers · maintenance", schedule: "off" },
  { id: "en-bill", group: "Executive", name: "Cost & tariff report", desc: "TOU breakdown, demand charge and penalty risk", audience: "executives · finance", schedule: "monthly" },
  { id: "en-savings", group: "Executive", name: "Savings verification", desc: "measure-by-measure baht saved, verified against the baseline", audience: "executives", schedule: "monthly" },
];

/* --------------------------------------------- tariff & demand-contract optimizer */
/** Billed peaks (kW) over the last 12 months once peak-shaving is holding the peak
 *  down — the basis for right-sizing the demand contract (a no-capex saving). */
export const tariffOpt = {
  contractNow: 3000, // current demand contract (kW)
  recommended: 2900, // right-sized = max sustained peak + safety margin
  currentTariff: "TOU",
  onPeakShare: 62, // % of energy consumed on-peak
  peaks12: [
    { m: "Jul", kw: 2810 }, { m: "Aug", kw: 2760 }, { m: "Sep", kw: 2840 },
    { m: "Oct", kw: 2780 }, { m: "Nov", kw: 2820 }, { m: "Dec", kw: 2850 },
    { m: "Jan", kw: 2790 }, { m: "Feb", kw: 2740 }, { m: "Mar", kw: 2830 },
    { m: "Apr", kw: 2770 }, { m: "May", kw: 2800 }, { m: "Jun", kw: 2780 },
  ] as { m: string; kw: number }[],
};
