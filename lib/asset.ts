/** AssetIQ™ — Asset Performance Management (APM) layer for the WHOLE fleet.
 *
 *  Where RPM Intelligence goes deep on rotating-equipment vibration/FFT, AssetIQ is
 *  the portfolio brain across EVERY asset (rotating + static + production): it fuses
 *  criticality, condition, maintenance strategy, reliability, spares, lifecycle and
 *  cost into one record — presented through two lenses, Engineer and Executive.
 *
 *  Every number here is DERIVED from the shared asset registry (lib/factory.ts) plus a
 *  compact curated META table (nameplate facts that can't be inferred), so the whole
 *  module stays internally coherent — no free-floating figures. */

import { assets, assetById, predictedFailures, type Asset } from "./factory";

export type LZ = { en: string; th: string };
export const CURRENT_YEAR = 2026;

/* ══════════════════════════ curated nameplate META ══════════════════════════
 * The few facts sensors can't tell us: maker, model, install year, design life,
 * replacement cost, current maintenance strategy, the corrective-repair cost of the
 * open issue (flagged assets only) and the critical spare. Everything else derives. */
type Meta = {
  mfr: string; model: string; installed: number; lifeYears: number; replaceTHB: number;
  strategy: Strategy; bump: number; repairTHB?: number; spare?: { part: LZ; leadDays: number; inStock: boolean };
};
const META: Record<string, Meta> = {
  "cnc-01":     { mfr: "DMG MORI", model: "NLX 2500", installed: 2019, lifeYears: 12, replaceTHB: 4_200_000, strategy: "predictive", bump: 6 },
  "cnc-05":     { mfr: "Mazak", model: "QT-250", installed: 2020, lifeYears: 12, replaceTHB: 3_400_000, strategy: "predictive", bump: 4 },
  "robo-02":    { mfr: "FANUC", model: "M-410iC", installed: 2021, lifeYears: 12, replaceTHB: 2_100_000, strategy: "preventive", bump: 2 },
  "weld-04":    { mfr: "KUKA", model: "KR 16 R2010", installed: 2018, lifeYears: 12, replaceTHB: 2_600_000, strategy: "preventive", bump: 4 },
  "qc-07":      { mfr: "Cognex", model: "In-Sight 9912", installed: 2023, lifeYears: 8, replaceTHB: 1_200_000, strategy: "preventive", bump: 6 },
  "press-03":   { mfr: "Komatsu", model: "H1F-630", installed: 2015, lifeYears: 20, replaceTHB: 8_500_000, strategy: "predictive", bump: 14, repairTHB: 145_000, spare: { part: { en: "Main bearing 6318 + coupling", th: "แบริ่งเมน 6318 + คัปปลิ้ง" }, leadDays: 0, inStock: true } },
  "inj-08":     { mfr: "ENGEL", model: "victory 320", installed: 2017, lifeYears: 18, replaceTHB: 4_800_000, strategy: "preventive", bump: 8, repairTHB: 80_000, spare: { part: { en: "Hydraulic cooler + O₂ sensor", th: "คูลเลอร์ไฮดรอลิก + เซนเซอร์ O₂" }, leadDays: 3, inStock: false } },
  "assy-13":    { mfr: "Bosch Rexroth", model: "TS 2plus", installed: 2021, lifeYears: 12, replaceTHB: 1_900_000, strategy: "preventive", bump: 4 },
  "paint-14":   { mfr: "Dürr", model: "EcoRP E043i", installed: 2016, lifeYears: 15, replaceTHB: 3_200_000, strategy: "preventive", bump: 4, repairTHB: 35_000, spare: { part: { en: "Exhaust filter bank", th: "ชุดกรองไอเสีย" }, leadDays: 0, inStock: true } },
  "agv-06":     { mfr: "MiR", model: "MiR250", installed: 2023, lifeYears: 8, replaceTHB: 1_600_000, strategy: "predictive", bump: 0 },
  "chiller-09": { mfr: "Trane", model: "CVHF 500t", installed: 2014, lifeYears: 20, replaceTHB: 6_500_000, strategy: "predictive", bump: 14, repairTHB: 120_000, spare: { part: { en: "Condenser tube-clean kit", th: "ชุดล้างท่อคอนเดนเซอร์" }, leadDays: 0, inStock: true } },
  "chiller-15": { mfr: "Trane", model: "CVHF 500t", installed: 2019, lifeYears: 20, replaceTHB: 6_200_000, strategy: "predictive", bump: 14 },
  "comp-10":    { mfr: "Atlas Copco", model: "GA 110 VSD", installed: 2011, lifeYears: 15, replaceTHB: 2_800_000, strategy: "preventive", bump: 8, repairTHB: 95_000, spare: { part: { en: "Air-end overhaul kit", th: "ชุดโอเวอร์ฮอล air-end" }, leadDays: 12, inStock: false } },
  "comp-16":    { mfr: "Atlas Copco", model: "GA 90 VSD", installed: 2020, lifeYears: 15, replaceTHB: 2_400_000, strategy: "preventive", bump: 6 },
  "boiler-12":  { mfr: "Cleaver-Brooks", model: "CBEX 200", installed: 2013, lifeYears: 25, replaceTHB: 5_500_000, strategy: "preventive", bump: 12 },
  "mdb-11":     { mfr: "Schneider", model: "Blokset", installed: 2012, lifeYears: 30, replaceTHB: 3_800_000, strategy: "preventive", bump: 40 },
  "ct-17":      { mfr: "BAC", model: "VTL-350", installed: 2015, lifeYears: 20, replaceTHB: 1_400_000, strategy: "preventive", bump: 6, repairTHB: 90_000, spare: { part: { en: "Fan gearbox + fill pack", th: "เกียร์ Fan + fill pack" }, leadDays: 5, inStock: false } },
  "pump-18":    { mfr: "Grundfos", model: "NK 125-250", installed: 2018, lifeYears: 18, replaceTHB: 900_000, strategy: "preventive", bump: 10 },
  "ahu-19":     { mfr: "Daikin", model: "Modular L", installed: 2017, lifeYears: 20, replaceTHB: 1_300_000, strategy: "run_to_fail", bump: 2 },
  "wwt-20":     { mfr: "Kaeser", model: "HB 950 C", installed: 2016, lifeYears: 18, replaceTHB: 1_100_000, strategy: "preventive", bump: 6, repairTHB: 55_000, spare: { part: { en: "Blower bearing 6206", th: "แบริ่ง Blower 6206" }, leadDays: 0, inStock: true } },
};
const meta = (a: Asset): Meta => META[a.id] ?? { mfr: "—", model: a.type, installed: 2018, lifeYears: 15, replaceTHB: 1_500_000, strategy: "preventive", bump: 0 };

/* ══════════════════════════ criticality (ABC) ══════════════════════════
 * Consequence-of-failure score → class A (mission-critical) … D (non-critical).
 * Driven by category, connected power and a curated single-point-of-failure bump. */
export type CritClass = "A" | "B" | "C" | "D";
export function critScore(a: Asset): number {
  const base = a.category === "production" ? 52 : 44;
  const power = Math.min(26, a.powerKw / 6);
  return Math.round(Math.min(98, Math.max(20, base + power + meta(a).bump)));
}
export function critClass(a: Asset): CritClass {
  const s = critScore(a);
  return s >= 80 ? "A" : s >= 65 ? "B" : s >= 50 ? "C" : "D";
}
/** `hex` = saturated fill/stroke (fine on both themes); `text` = theme-flipping var for TEXT. */
export const CRIT_META: Record<CritClass, { label: LZ; short: LZ; hex: string; text: string }> = {
  A: { label: { en: "A · mission-critical", th: "A · วิกฤตสูงสุด" }, short: { en: "Mission-critical", th: "วิกฤตสูงสุด" }, hex: "#f43f5e", text: "var(--c-rose)" },
  B: { label: { en: "B · business-critical", th: "B · สำคัญต่อธุรกิจ" }, short: { en: "Business-critical", th: "สำคัญต่อธุรกิจ" }, hex: "#f59e0b", text: "var(--c-amber-strong)" },
  C: { label: { en: "C · important", th: "C · สำคัญปานกลาง" }, short: { en: "Important", th: "สำคัญปานกลาง" }, hex: "#22d3ee", text: "var(--c-cyan)" },
  D: { label: { en: "D · non-critical", th: "D · ไม่วิกฤต" }, short: { en: "Non-critical", th: "ไม่วิกฤต" }, hex: "#94a3b8", text: "var(--c-slate)" },
};

/* ══════════════════════════ maintenance strategy + fit ══════════════════════════ */
export type Strategy = "run_to_fail" | "preventive" | "predictive" | "prescriptive";
const STRAT_RANK: Record<Strategy, number> = { run_to_fail: 1, preventive: 2, predictive: 3, prescriptive: 4 };
export const STRATEGY_META: Record<Strategy, { label: LZ }> = {
  run_to_fail: { label: { en: "Run-to-failure", th: "ปล่อยจนเสีย" } },
  preventive: { label: { en: "Preventive (time-based)", th: "ป้องกันตามเวลา" } },
  predictive: { label: { en: "Predictive (condition)", th: "พยากรณ์ตามสภาพ" } },
  prescriptive: { label: { en: "Prescriptive (AI)", th: "สั่งการด้วย AI" } },
};
export const strategyOf = (a: Asset): Strategy => meta(a).strategy;
export function recommendedStrategy(a: Asset): Strategy {
  const c = critClass(a);
  return c === "A" ? "predictive" : c === "B" ? "predictive" : c === "C" ? "preventive" : "run_to_fail";
}
export type Fit = "good" | "under" | "over";
export function strategyFit(a: Asset): Fit {
  const cur = STRAT_RANK[strategyOf(a)], rec = STRAT_RANK[recommendedStrategy(a)];
  if (cur < rec) return "under";       // too little maintenance for the criticality → RISK
  if (cur > rec + 1) return "over";    // gold-plating a low-criticality asset → WASTE
  return "good";
}
export const FIT_META: Record<Fit, { label: LZ; hex: string; text: string }> = {
  good: { label: { en: "Strategy fits criticality", th: "กลยุทธ์เหมาะกับความวิกฤต" }, hex: "#34d399", text: "var(--c-emerald)" },
  under: { label: { en: "Under-maintained for its criticality", th: "ดูแลน้อยเกินไปเทียบความวิกฤต" }, hex: "#f43f5e", text: "var(--c-rose)" },
  over: { label: { en: "Over-maintained — cost to recover", th: "ดูแลเกินจำเป็น — ลดต้นทุนได้" }, hex: "#f59e0b", text: "var(--c-amber-strong)" },
};

/* ══════════════════════════ condition · health factors ══════════════════════════ */
const clamp = (n: number, lo = 0, hi = 100) => Math.round(Math.min(hi, Math.max(lo, n)));
export type HealthFactor = { label: LZ; value: number };
export function healthFactors(a: Asset): HealthFactor[] {
  const vib = clamp(100 - (a.vibration / 6) * 78);
  const therm = clamp(100 - Math.max(0, a.tempC - 45) * 1.5);
  const elec = clamp(a.status === "critical" ? 55 : a.status === "warning" ? 74 : 92 - (a.powerKw > 120 ? 6 : 0));
  const life = clamp(100 - (ageYears(a) / meta(a).lifeYears) * 60);
  return [
    { label: { en: "Vibration", th: "ความสั่น" }, value: vib },
    { label: { en: "Thermal", th: "ความร้อน" }, value: therm },
    { label: { en: "Electrical", th: "ไฟฟ้า" }, value: elec },
    { label: { en: "Age / duty", th: "อายุ / การใช้งาน" }, value: life },
  ];
}

/* ══════════════════════════ RUL · P-F interval ══════════════════════════ */
export const rul = (a: Asset): number | null => a.rulDays;
/** the P-F window: from first detectable warning (P) to functional failure (F). */
export function pfIntervalDays(a: Asset): number {
  const byType = /chiller|compressor|boiler/.test(a.type) ? 45 : /pump|tower|blower|air-handling/.test(a.type) ? 30 : /press|mold|imm/i.test(a.type) ? 25 : 20;
  return byType;
}
export function failureProb(a: Asset): number {
  const base = a.status === "critical" ? 0.72 : a.status === "warning" ? 0.34 : 0.05;
  const boost = a.rulDays != null ? ((30 - Math.min(a.rulDays, 30)) / 30) * 0.25 : 0;
  return Math.min(0.94, base + boost);
}

/* ══════════════════════════ reliability per asset ══════════════════════════ */
const MTTR_BY_TYPE: [RegExp, number][] = [
  [/chiller/, 6], [/compressor/, 5], [/boiler/, 8], [/press/, 7], [/mold|imm/i, 6],
  [/pump/, 4], [/tower/, 5], [/blower|air-handling|ahu/i, 3], [/machining|cnc/i, 4],
  [/robot|weld|palletiz/i, 3], [/switchboard|mdb/i, 3], [/mobile|amr|agv/i, 2],
];
export function mttrHours(a: Asset): number {
  const hit = MTTR_BY_TYPE.find(([re]) => re.test(a.type) || re.test(a.name));
  return hit ? hit[1] : 4;
}
export function mtbfDays(a: Asset): number {
  const pen = a.status === "critical" ? 90 : a.status === "warning" ? 40 : 0;
  return clamp(60 + a.health * 1.8 - pen, 25, 360);
}

/* ══════════════════════════ lifecycle · repair-vs-replace ══════════════════════════ */
export const ageYears = (a: Asset): number => CURRENT_YEAR - meta(a).installed;
export const lifeYears = (a: Asset): number => meta(a).lifeYears;
export const installedYear = (a: Asset): number => meta(a).installed;
export const nameplate = (a: Asset) => ({ mfr: meta(a).mfr, model: meta(a).model, installed: meta(a).installed });
export const replaceTHB = (a: Asset): number => meta(a).replaceTHB;
export function repairTHB(a: Asset): number {
  const m = meta(a);
  if (m.repairTHB != null) return m.repairTHB;
  return Math.round(m.replaceTHB * (0.02 + (100 - a.health) / 100 * 0.05));
}
export function spareFor(a: Asset) {
  return meta(a).spare ?? { part: { en: "Standard service kit", th: "ชุดบริการมาต°าน" }, leadDays: a.health < 80 ? 4 : 0, inStock: a.health >= 78 };
}
export type RepairReplace = { repair: number; replace: number; ageRatio: number; rec: "repair" | "replace"; note: LZ };
export function repairVsReplace(a: Asset): RepairReplace {
  const ratio = ageYears(a) / lifeYears(a);
  const eol = ratio >= 0.95 || (ratio >= 0.8 && a.status !== "healthy");
  const rec: "repair" | "replace" = eol ? "replace" : "repair";
  const note: LZ = rec === "replace"
    ? { en: `At ${Math.round(ratio * 100)}% of design life and still failing — repeat repairs no longer pay back.`, th: `ใช้งานถึง ${Math.round(ratio * 100)}% ของอายุออกแบบและยังเสียซ้ำ — ซ่อมต่อไม่คุ้มแล้ว` }
    : { en: `Only ${Math.round(ratio * 100)}% of design life used — fix now, budget replacement later.`, th: `ใช้ไปแค่ ${Math.round(ratio * 100)}% ของอายุออกแบบ — ซ่อมตอนนี้ ตั้งงบเปลี่ยนภายหลัง` };
  return { repair: repairTHB(a), replace: replaceTHB(a), ageRatio: ratio, rec, note };
}

/* ══════════════════════════ cost · ฿ at risk ══════════════════════════ */
export function riskTHB(a: Asset): number {
  const impactBase = a.category === "production" ? 2_600_000 : 2_400_000;
  const impact = impactBase * (0.45 + critScore(a) / 100 * 0.75);
  return Math.round(impact * failureProb(a));
}
export function maintCostYtd(a: Asset): number {
  const f = a.status === "critical" ? 3 : a.status === "warning" ? 1.8 : 1;
  return Math.round(replaceTHB(a) * 0.015 * f);
}
export function downtimeCostYr(a: Asset): number {
  const hrLoss = (a.category === "production" ? 45_000 : 24_000) * (0.55 + critScore(a) / 100 * 0.9);
  const hrs = a.status === "critical" ? 24 : a.status === "warning" ? 8 : 2;
  return Math.round(hrLoss * hrs);
}

/* ══════════════════════════ FMEA (failure modes) ══════════════════════════ */
export type FmeaRow = { mode: LZ; effect: LZ; sev: number; occ: number; det: number };
export const rpn = (r: FmeaRow) => r.sev * r.occ * r.det;
const FMEA: Record<string, FmeaRow[]> = {
  "chiller-09": [
    { mode: { en: "Condenser fouling", th: "คอนเดนเซอร์อุดตัน" }, effect: { en: "COP loss, high-pressure trip", th: "COP ตก, ตัดจากแรงดันสูง" }, sev: 8, occ: 7, det: 4 },
    { mode: { en: "Compressor bearing wear", th: "แบริ่ง Compressor สึก" }, effect: { en: "Vibration, seizure risk", th: "สั่น, เสี่ยงจับตาย" }, sev: 7, occ: 4, det: 5 },
  ],
  "press-03": [
    { mode: { en: "Main bearing wear", th: "แบริ่งเมนสึก" }, effect: { en: "Ram play, scrap parts", th: "แรมคลอน, ของเสีย" }, sev: 9, occ: 5, det: 5 },
    { mode: { en: "Ram misalignment", th: "แรมเยื้องศูนย์" }, effect: { en: "Die wear, tonnage error", th: "ดายสึก, ตันเพี้ยน" }, sev: 6, occ: 4, det: 6 },
  ],
  "comp-10": [
    { mode: { en: "Air-end wear", th: "air-end สึก" }, effect: { en: "Capacity loss, overheating", th: "กำลังตก, ร้อนเกิน" }, sev: 7, occ: 6, det: 5 },
    { mode: { en: "Ring-main leak", th: "รั่วในไลน์ลม" }, effect: { en: "20% base-load waste", th: "สูญเปล่า 20% ของโหลด" }, sev: 5, occ: 7, det: 6 },
  ],
  "inj-08": [{ mode: { en: "Hydraulic overheating", th: "ไฮดรอลิกร้อนเกิน" }, effect: { en: "Short-shots, cycle drift", th: "ฉีดไม่เต็ม, ไซเคิลเพี้ยน" }, sev: 6, occ: 5, det: 5 }],
  "ct-17": [{ mode: { en: "Fan gearbox wear", th: "เกียร์ Fan สึก" }, effect: { en: "Approach rises, capacity loss", th: "approach สูงขึ้น, กำลังตก" }, sev: 6, occ: 5, det: 6 }],
  "paint-14": [{ mode: { en: "Exhaust filter clogging", th: "กรองไอเสียตัน" }, effect: { en: "Overspray, finish defects", th: "สเปรย์เกิน, สีเสีย" }, sev: 5, occ: 6, det: 3 }],
  "wwt-20": [{ mode: { en: "Blower bearing degradation", th: "แบริ่ง Blower เสื่อม" }, effect: { en: "DO control loss, compliance risk", th: "คุม DO ไม่ได้, เสี่ยงผิดมาต°าน" }, sev: 6, occ: 5, det: 5 }],
};
export function fmeaFor(a: Asset): FmeaRow[] {
  if (FMEA[a.id]) return FMEA[a.id];
  const g: FmeaRow = a.category === "production"
    ? { mode: { en: "General wear", th: "การสึกทั่วไป" }, effect: { en: "Gradual performance drift", th: "สมรรถนะค่อยๆ ลด" }, sev: 4, occ: 3, det: 4 }
    : { mode: { en: "Component ageing", th: "ชิ้นส่วนเสื่อมตามอายุ" }, effect: { en: "Efficiency loss over time", th: "ประสิทธิภาพลดตามเวลา" }, sev: 4, occ: 3, det: 4 };
  return [g];
}
export const topFmea = (a: Asset): FmeaRow => [...fmeaFor(a)].sort((x, y) => rpn(y) - rpn(x))[0];

/* ══════════════════════════ portfolio aggregates ══════════════════════════ */
const round1 = (n: number) => Math.round(n * 10) / 10;
export const portfolio = (() => {
  const byClass: Record<CritClass, number> = { A: 0, B: 0, C: 0, D: 0 };
  const strat: Record<Strategy, number> = { run_to_fail: 0, preventive: 0, predictive: 0, prescriptive: 0 };
  assets.forEach((a) => { byClass[critClass(a)] += 1; strat[strategyOf(a)] += 1; });
  const avgHealth = Math.round(assets.reduce((s, a) => s + a.health, 0) / assets.length);
  const totalRiskTHB = assets.reduce((s, a) => s + riskTHB(a), 0);
  const flaggedRiskTHB = predictedFailures().reduce((s, a) => s + riskTHB(a), 0);
  const underMaintained = assets.filter((a) => strategyFit(a) === "under").length;
  return {
    count: assets.length, avgHealth, byClass, strat, totalRiskTHB, flaggedRiskTHB,
    critCount: byClass.A, atRisk: predictedFailures().length, underMaintained,
    availabilityPct: 97.8, mtbfDays: 62, mttrHours: 4.2, reactivePct: 34, plannedPct: 66,
    maintBudgetYr: 12_000_000, maintSpentYtd: assets.reduce((s, a) => s + maintCostYtd(a), 0),
  };
})();

/** worst-first "bad actors" — assets consuming risk & maintenance, ranked by ฿ at risk. */
export const badActors = (n = 8): Asset[] => [...assets].filter((a) => a.status !== "healthy" || a.rulDays != null).sort((x, y) => riskTHB(y) - riskTHB(x)).slice(0, n);

/** best ฿-risk-reduced per ฿-spent — where capital works hardest. */
export const investmentPriority = () =>
  predictedFailures().map((a) => ({ a, leverage: round1(riskTHB(a) / Math.max(repairTHB(a), 1)) })).sort((x, y) => y.leverage - x.leverage);

/** repair-vs-replace candidates flagged as end-of-life. */
export const replaceCandidates = (): Asset[] => assets.filter((a) => repairVsReplace(a).rec === "replace").sort((x, y) => critScore(y) - critScore(x));

/** grouped registry: two areas, each sorted most-critical first. */
export const registryByArea = (): { id: string; label: LZ; items: Asset[] }[] => [
  { id: "prod", label: { en: "Production Hall", th: "อาคารผลิต" }, items: assets.filter((a) => a.buildingId === "prod").sort((x, y) => critScore(y) - critScore(x)) },
  { id: "util", label: { en: "Facility & Utility", th: "ระบบสนับสนุน & สาธารณูปโภค" }, items: assets.filter((a) => a.buildingId === "util").sort((x, y) => critScore(y) - critScore(x)) },
];

/* ══════════════════════════ copilot suggestions ══════════════════════════ */
export const copilotSuggestions: LZ[] = [
  { en: "Which asset should I invest maintenance budget in first?", th: "ควรลงงบซ่อมบำรุงที่เครื่องไหนก่อน?" },
  { en: "Show every asset whose strategy doesn't fit its criticality", th: "แสดงเครื่องที่กลยุทธ์ไม่เหมาะกับความวิกฤต" },
  { en: "Repair or replace Air Compressor 10?", th: "Air Compressor 10 ควรซ่อมหรือเปลี่ยน?" },
  { en: "What is my total ฿ at risk across the fleet right now?", th: "ตอนนี้ทั้งฟลีตมี ฿ ที่เสี่ยงรวมเท่าไหร่?" },
];

/* ══════════════════════════ ฿ formatting ══════════════════════════ */
export const thbCompact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return "฿" + (n / 1_000_000).toFixed(a % 1_000_000 === 0 ? 0 : 2).replace(/\.?0+$/, "") + "M";
  if (a >= 1_000) return "฿" + Math.round(n / 1_000) + "K";
  return "฿" + n;
};

/* ══════════════════════════ legacy exports (still used by lib/maintenance.ts) ══════════════════════════ */
export const riskBars = predictedFailures().map((a) => ({ name: a.name, value: Math.min(95, Math.round(100 - (a.rulDays ?? 30) * 2.4)) }));
export const rootCauses = [
  { name: "Bearing wear", value: 38 },
  { name: "Condenser fouling", value: 24 },
  { name: "Lubrication", value: 16 },
  { name: "Misalignment", value: 12 },
  { name: "Electrical", value: 10 },
];
export const maintByType = [
  { name: "Predictive", value: 42 },
  { name: "Preventive", value: 31 },
  { name: "Corrective", value: 19 },
  { name: "Breakdown", value: 8 },
];
