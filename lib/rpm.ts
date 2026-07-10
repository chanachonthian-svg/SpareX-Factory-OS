/** RPM Intelligence — rotating-equipment condition-monitoring layer.
 *  Turns raw vibration/temp/current into a named failure MODE, an ISO 10816
 *  severity zone, a remaining-useful-life window, and a ฿ decision.
 *  Fleet data is derived from the shared asset registry; diagnoses are curated. */

import { assets, type Asset } from "./factory";

export type LZ = { en: string; th: string };

/* ── ISO 10816 severity zones (simplified · medium machines) ──────────────── */
export type IsoZone = "A" | "B" | "C" | "D";
export function isoZone(v: number): IsoZone {
  if (v < 1.8) return "A";
  if (v < 2.8) return "B";
  if (v < 4.5) return "C";
  return "D";
}
/** `hex` = fill/stroke (saturated, fine on both themes); `text` = theme-flipping var for TEXT. */
export const ZONE_META: Record<IsoZone, { label: LZ; hex: string; text: string; tone: "ok" | "warn" | "crit" }> = {
  A: { label: { en: "A · good", th: "A · ดี" }, hex: "#34d399", text: "var(--c-emerald)", tone: "ok" },
  B: { label: { en: "B · acceptable", th: "B · รับได้" }, hex: "#22d3ee", text: "var(--c-cyan)", tone: "ok" },
  C: { label: { en: "C · watch", th: "C · เฝ้าระวัง" }, hex: "#f59e0b", text: "var(--c-amber-strong)", tone: "warn" },
  D: { label: { en: "D · act now", th: "D · ต้องทำ" }, hex: "#f43f5e", text: "var(--c-rose)", tone: "crit" },
};

/* ── Equipment kind (for the type filter) ─────────────────────────────────────
 *  ONLY genuine rotating equipment qualifies — machines with a continuously-rotating
 *  shaft: pumps, compressors/chillers, fans/blowers/cooling-towers/AHUs (and mixers/
 *  agitators). Reciprocating presses & injection moulders, servo robots/AGVs, machine
 *  tools (CNC), boilers and static gear are NOT rotating equipment → "other" (excluded). */
export type RpmKind = "pump" | "compressor" | "fan" | "other";
export function rpmKind(a: Asset): RpmKind {
  const t = a.type.toLowerCase();
  if (/pump/.test(t)) return "pump";
  if (/compressor|chiller/.test(t)) return "compressor";
  if (/cooling tower|air-handling|\bahu\b|blower|\bfan\b|mixer|agitator/.test(t)) return "fan";
  return "other";
}
export const kindTabs: { id: RpmKind | "all"; label: LZ }[] = [
  { id: "all", label: { en: "All rotating", th: "ทั้งหมด" } },
  { id: "pump", label: { en: "Pumps", th: "Pumps" } },
  { id: "compressor", label: { en: "Compressors · chillers", th: "Compressors · Chillers" } },
  { id: "fan", label: { en: "Fans · blowers", th: "Fans · Blowers" } },
];

/* ── Criticality (process impact) & ฿ at risk — for the fleet matrix ──────── */
export function criticality(a: Asset): number {
  const base = a.category === "production" ? 62 : 48;
  const power = Math.min(28, a.powerKw / 6);
  const line = /Line A|Line B|Line C|Cooling|Compressed Air/.test(a.line) ? 8 : 0;
  return Math.round(Math.min(98, base + power + line));
}
export function riskTHB(a: Asset): number {
  const sev = a.status === "critical" ? 900_000 : a.status === "warning" ? 350_000 : 60_000;
  return Math.round(sev + a.powerKw * 5_000);
}

/* rotating fleet = anything that actually spins & is metered */
export const rpmFleet: Asset[] = assets.filter((a) => a.vibration > 0.3 && rpmKind(a) !== "other");

/* ── FFT spectrum archetypes (mag 0..60; fault peaks flagged) ─────────────── */
export type FftBar = { mag: number; label?: string; fault?: boolean };
export const FFT: Record<string, FftBar[]> = {
  misalign_bearing: [{ mag: 9 }, { mag: 26, label: "1×" }, { mag: 10 }, { mag: 8 }, { mag: 54, label: "2×", fault: true }, { mag: 11 }, { mag: 9 }, { mag: 17, label: "3×" }, { mag: 8 }, { mag: 10 }, { mag: 46, label: "BPFO", fault: true }, { mag: 13 }, { mag: 8 }],
  bearing: [{ mag: 10 }, { mag: 22, label: "1×" }, { mag: 9 }, { mag: 8 }, { mag: 18, label: "2×" }, { mag: 9 }, { mag: 34, label: "BPFI", fault: true }, { mag: 12 }, { mag: 9 }, { mag: 50, label: "BPFO", fault: true }, { mag: 16 }, { mag: 10 }, { mag: 8 }],
  imbalance: [{ mag: 8 }, { mag: 56, label: "1×", fault: true }, { mag: 12 }, { mag: 9 }, { mag: 16, label: "2×" }, { mag: 8 }, { mag: 7 }, { mag: 11, label: "3×" }, { mag: 8 }, { mag: 9 }, { mag: 10 }, { mag: 8 }, { mag: 7 }],
  looseness: [{ mag: 9 }, { mag: 30, label: "1×" }, { mag: 26, label: "1.5×", fault: true }, { mag: 12 }, { mag: 36, label: "2×", fault: true }, { mag: 14 }, { mag: 28, fault: true }, { mag: 22, label: "3×", fault: true }, { mag: 10 }, { mag: 12 }, { mag: 9 }, { mag: 8 }, { mag: 7 }],
};

/* ── Curated diagnoses for the fleet's most at-risk machines ──────────────── */
export type Diagnosis = {
  assetId: string;
  fault: LZ;
  confidence: number;
  fftKey: keyof typeof FFT;
  evidence: LZ;
  runToFailure: number;
  fixNow: number;
  action: LZ;
  partsInStock: boolean;
  window: LZ;
  rpm: number;
  bearing: string;
  tempDelta: number;   // °C above baseline
  mcsa: LZ;            // motor-current signature note
  daysToZoneD: number | null; // null = already in D
};

export const diagnoses: Diagnosis[] = [
  {
    assetId: "chiller-09", fault: { en: "Misalignment + early bearing wear", th: "มิสอะไลน์เมนต์ + แบริ่งเริ่มสึก" },
    confidence: 88, fftKey: "misalign_bearing", evidence: { en: "2× peak rising + bearing BPFO emerging", th: "พีค 2× สูงขึ้น + ความถี่แบริ่ง BPFO โผล่ชัด" },
    runToFailure: 1_400_000, fixNow: 62_000, action: { en: "Realign coupling <0.05mm · replace 6205 bearing · re-grease", th: "จัดศูนย์คัปปลิ้ง <0.05mm · เปลี่ยนแบริ่ง 6205 · อัดจารบี" },
    partsInStock: true, window: { en: "this Saturday", th: "เสาร์นี้" }, rpm: 1480, bearing: "6205", tempDelta: 8, mcsa: { en: "sideband detected", th: "พบ sideband" }, daysToZoneD: null,
  },
  {
    assetId: "comp-10", fault: { en: "Rotor imbalance · air-end wear", th: "โรเตอร์ไม่สมดุล · air-end สึก" },
    confidence: 66, fftKey: "imbalance", evidence: { en: "dominant 1× radial · rising with load", th: "พีค 1× เด่นในแนวรัศมี · สูงขึ้นตามโหลด" },
    runToFailure: 420_000, fixNow: 45_000, action: { en: "Field-balance rotor · inspect air-end clearance", th: "ถ่วงสมดุลหน้างาน · เช็คระยะ air-end" },
    partsInStock: true, window: { en: "within 10 days", th: "ภายใน 10 วัน" }, rpm: 2950, bearing: "6309", tempDelta: 4, mcsa: { en: "harmonics up", th: "ฮาร์มอนิกเพิ่ม" }, daysToZoneD: 10,
  },
  {
    assetId: "ct-17", fault: { en: "Structural looseness + gearbox wear", th: "โครงหลวม + เกียร์ Fan สึก" },
    confidence: 61, fftKey: "looseness", evidence: { en: "1.5× / 2.5× sub-harmonics + gear mesh", th: "ฮาร์มอนิกย่อย 1.5× / 2.5× + gear mesh" },
    runToFailure: 300_000, fixNow: 60_000, action: { en: "Re-torque structure · replace fan gearbox", th: "ขันโครงสร้าง · เปลี่ยนเกียร์ Fan" },
    partsInStock: false, window: { en: "await parts (~5d)", th: "รออะไหล่ (~5 วัน)" }, rpm: 590, bearing: "gearbox", tempDelta: 3, mcsa: { en: "n/a", th: "—" }, daysToZoneD: 12,
  },
  {
    assetId: "wwt-20", fault: { en: "Blower bearing degradation", th: "แบริ่ง Blower เริ่มเสื่อม" },
    confidence: 58, fftKey: "bearing", evidence: { en: "early BPFO energy · temp trending up", th: "พลังงาน BPFO ระยะต้น · อุณหภูมิไต่ขึ้น" },
    runToFailure: 260_000, fixNow: 40_000, action: { en: "Replace blower bearing · check DO control", th: "เปลี่ยนแบริ่ง Blower · เช็คระบบควบคุม DO" },
    partsInStock: true, window: { en: "within 18 days", th: "ภายใน 18 วัน" }, rpm: 3550, bearing: "6206", tempDelta: 2, mcsa: { en: "nominal", th: "ปกติ" }, daysToZoneD: 18,
  },
];

export const diagnosisFor = (id: string) => diagnoses.find((d) => d.assetId === id) ?? null;

/* ── ROI proof · the deal-closer ──────────────────────────────────────────── */
export const roiProof = {
  caughtEarly: 12,
  savedTHB: 4_800_000,
  downtimeHoursAvoided: 186,
  unplannedReductionPct: 45,
};

export const thbCompact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return "฿" + (n / 1_000_000).toFixed(a % 1_000_000 === 0 ? 0 : 2).replace(/\.?0+$/, "") + "M";
  if (a >= 1_000) return "฿" + Math.round(n / 1_000) + "K";
  return "฿" + n;
};

/* ── Reliability metrics ──────────────────────────────────────────────────── */
export const reliability = { mtbfDays: 62, mttrHours: 4.2, availabilityPct: 97.8, mtbfDeltaPct: 12, mttrDeltaPct: -9 };
export const failurePareto: { mode: LZ; count: number; costShare: number }[] = [
  { mode: { en: "Bearing wear", th: "แบริ่งสึก" }, count: 9, costShare: 42 },
  { mode: { en: "Misalignment", th: "มิสอะไลน์เมนต์" }, count: 6, costShare: 24 },
  { mode: { en: "Rotor imbalance", th: "โรเตอร์ไม่สมดุล" }, count: 4, costShare: 15 },
  { mode: { en: "Looseness", th: "จุดยึดหลวม" }, count: 3, costShare: 11 },
  { mode: { en: "Lubrication", th: "การหล่อลื่น" }, count: 2, costShare: 8 },
];

/* ── Energy · condition-driven excess draw ────────────────────────────────── */
export const RPM_TARIFF = 4.2; // ฿/kWh blended
export function excessKw(a: Asset): number {
  const z = isoZone(a.vibration);
  const f = z === "D" ? 0.08 : z === "C" ? 0.045 : z === "B" ? 0.012 : 0;
  return Math.round(a.powerKw * f * 10) / 10;
}
export function excessCostYr(a: Asset): number {
  return Math.round(excessKw(a) * RPM_TARIFF * 16 * 300); // 16h/day · 300 days
}

/* ── Reports ──────────────────────────────────────────────────────────────── */
export const reportTemplates: { id: string; name: LZ; desc: LZ }[] = [
  { id: "condition", name: { en: "Condition monitoring report", th: "รายงานเฝ้าระวังสภาพ" }, desc: { en: "Fleet vibration, ISO zones & fault signatures", th: "ความสั่นทั้งฟลีต โซน ISO และสัญญาณผิดปกติ" } },
  { id: "reliability", name: { en: "Reliability report", th: "รายงานความน่าเชื่อถือ" }, desc: { en: "MTBF · MTTR · availability · failure Pareto", th: "MTBF · MTTR · ความพร้อมใช้ · Pareto ความเสียหาย" } },
  { id: "roi", name: { en: "PdM ROI report", th: "รายงาน ROI งานพยากรณ์" }, desc: { en: "Failures prevented & ฿ saved this quarter", th: "งานที่กันพังได้และ ฿ ที่ประหยัดไตรมาสนี้" } },
  { id: "board", name: { en: "Board summary · 1-page", th: "สรุปเข้าบอร์ด · 1 หน้า" }, desc: { en: "Executive rotating-equipment health digest", th: "สรุปสุขภาพเครื่องหมุนสำหรับผู้บริหาร" } },
];
export const recentReports: { name: string; date: string; by: LZ }[] = [
  { name: "Condition-2026-W27.pdf", date: "2026-07-04", by: { en: "AI · auto", th: "AI · อัตโนมัติ" } },
  { name: "Reliability-Q2-2026.pdf", date: "2026-06-30", by: { en: "Arun", th: "อรุณ" } },
  { name: "PdM-ROI-Q2.pdf", date: "2026-06-30", by: { en: "AI · auto", th: "AI · อัตโนมัติ" } },
];

/* ── AI briefing · the 5-part executive voice (summary → findings → why → impact → next) ── */
export const aiBrief = {
  confidence: 88,
  summary: { en: "Most of the rotating fleet is healthy — but Chiller B must be fixed this week, or it fails mid-production.", th: "เครื่องหมุนส่วนใหญ่ยังปกติ แต่ Chiller B ต้องซ่อมภายในสัปดาห์นี้ ไม่งั้นพังกลางคัน" },
  findings: [
    { en: "Chiller B vibrates at 5.8 mm/s — zone D (act now) out of the 8 machines monitored", th: "Chiller B สั่น 5.8 mm/s — โซน D (ต้องทำทันที) จาก 8 เครื่องที่เฝ้าอยู่" },
    { en: "Air Compressor 10 and Cooling Tower 1 are next in line (zone C)", th: "Air Compressor 10 กับ Cooling Tower 1 กำลังตามมา (โซน C)" },
    { en: "Degraded machines together waste ~฿440K/yr in extra electricity", th: "เครื่องที่เสื่อมกินไฟเกินรวมกัน ~฿440K/ปี" },
  ],
  why: { en: "Chiller B's vibration climbs steadily with clear 2× and bearing-frequency peaks — this pattern is consistent with shaft misalignment plus early bearing wear.", th: "ความสั่นของ Chiller B ไต่ขึ้นเรื่อยๆ พร้อมพีคที่ 2× และความถี่แบริ่งชัดเจน — รูปแบบนี้ตรงกับเพลาเยื้องศูนย์บวกแบริ่งเริ่มสึก" },
  impact: { en: "Run to failure = the cooling line stops mid-week, ~฿1.4M damage — versus ฿62K to fix it now.", th: "ปล่อยจนพัง = ไลน์ทำความเย็นหยุดกลางสัปดาห์ เสียหาย ~฿1.4M — เทียบกับซ่อมตอนนี้แค่ ฿62K" },
  recommendation: { en: "Issue the Chiller B work order for this Saturday (parts in stock), and book Air Compressor 10 within 10 days.", th: "ออกใบสั่งงาน Chiller B เสาร์นี้ (อะไหล่พร้อมในสต็อก) และจองคิว Air Compressor 10 ภายใน 10 วัน" },
  actionLabel: { en: "Open the work queue", th: "ไปหน้าซ่อมบำรุง" },
};

/* ── Copilot suggestions ──────────────────────────────────────────────────── */
export const copilotSuggestions: LZ[] = [
  { en: "Which rotating machine should I service first and why?", th: "ควรซ่อมเครื่องหมุนตัวไหนก่อน เพราะอะไร?" },
  { en: "Explain the fault signature on Chiller B", th: "อธิบายสัญญาณความเสียหายของ Chiller B" },
  { en: "How much energy are degraded bearings wasting?", th: "แบริ่งที่เสื่อมทำให้เปลืองพลังงานเท่าไหร่?" },
  { en: "Forecast rotating-equipment failures for the next 30 days", th: "พยากรณ์ความเสียหายเครื่องหมุน 30 วันข้างหน้า" },
];
