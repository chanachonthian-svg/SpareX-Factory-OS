/** SpareX Engineering Rules — the rule engine.
 *
 *  Every rule is grounded in a real engineering standard or utility tariff, so
 *  an engineer trusts the threshold and an executive sees the ฿ and the plain
 *  reason. The engine takes the current asset readings + the Settings config,
 *  compares them against each rule, and returns the matches (findings). Today it
 *  runs on the shared (demo) asset registry; when SpareX Connect feeds live
 *  readings the *same* engine fires on real numbers — nothing else changes.
 *
 *  Design: rules are pure functions (reading → verdict). No side effects here —
 *  firing into work orders / notifications is the caller's job, so the engine
 *  stays testable and the guardrails/autonomy layer ([[autonomy]]) can gate it. */

import { assets, type Asset } from "./factory";
import { isoZone } from "./rpm";

export type Severity = "ok" | "warning" | "critical";
export type LZ = { en: string; th: string };

export type RuleCategory = "vibration" | "thermal" | "power" | "power-quality" | "production" | "reliability";

/** current plant-level readings the per-asset registry doesn't hold.
 *  Demo defaults — replaced by the SpareX Connect feed (see Settings → Data source). */
export type PlantReading = { pf: number; demandKw: number; contractKw: number };
export const DEMO_PLANT: PlantReading = { pf: 0.83, demandKw: 2760, contractKw: 3000 };

/** thresholds an engineer may tune — mirrors factoryos:automation in Settings */
export type RuleConfig = {
  peakPct: number;   // alert when demand exceeds this % of contract
  pfMin: number;     // power-factor penalty floor
  oeeTarget: number; // production target
};
export const DEFAULT_CONFIG: RuleConfig = { peakPct: 90, pfMin: 0.85, oeeTarget: 85 };

export type Finding = {
  ruleId: string;
  severity: Severity;         // "ok" findings are dropped by evaluate()
  scope: string;              // machine name or "Plant-wide"
  value: string;              // measured value, formatted
  limit: string;              // the threshold it crossed
  bahtAtRisk: number;         // ฿ exposure if unresolved
};

export type EngineeringRule = {
  id: string;
  category: RuleCategory;
  name: LZ;
  standard: string;           // the badge an engineer recognises: "ISO 10816-3", "IEEE 519", "MEA tariff"…
  basis: LZ;                  // one line on WHY — the engineering reason
  check: LZ;                  // the condition in plain words (for executives)
  action: LZ;                 // what it triggers when it fires
  unit: string;
  /** evaluate against every asset (rotating/thermal/production rules) */
  perAsset?: (a: Asset, cfg: RuleConfig) => Finding | null;
  /** evaluate once for the whole plant (demand, power factor) */
  perPlant?: (p: PlantReading, cfg: RuleConfig) => Finding | null;
};

const round10 = (n: number) => Math.round(n / 10) * 10;

export const ENGINEERING_RULES: EngineeringRule[] = [
  // ── 1 · Vibration severity (ISO 10816-3) ──
  {
    id: "vib-iso10816",
    category: "vibration",
    standard: "ISO 10816-3",
    unit: "mm/s RMS",
    name: { en: "Vibration severity", th: "ระดับการสั่นสะเทือน" },
    basis: {
      en: "Velocity-RMS zones for medium machines: A/B 1.8, B/C 2.8, C/D 4.5 mm/s. Zone D = damage imminent.",
      th: "โซนความเร็ว-RMS ของเครื่องขนาดกลาง: A/B 1.8, B/C 2.8, C/D 4.5 mm/s · โซน D = ใกล้พังแล้ว",
    },
    check: { en: "Vibration enters zone C (watch) or D (act now)", th: "การสั่นเข้าโซน C (เฝ้าดู) หรือ D (ต้องจัดการ)" },
    action: { en: "Raise a maintenance work order to the RPM team", th: "ออกใบสั่งซ่อมให้ทีม RPM" },
    perAsset: (a) => {
      const z = isoZone(a.vibration);
      if (z !== "C" && z !== "D") return null;
      const crit = z === "D";
      return {
        ruleId: "vib-iso10816", severity: crit ? "critical" : "warning",
        scope: a.name, value: `${a.vibration} mm/s (zone ${z})`, limit: "C/D = 4.5 mm/s",
        bahtAtRisk: round10(a.powerKw * (crit ? 900 : 300) + (crit ? 45000 : 8000)),
      };
    },
  },
  // ── 2 · Bearing / motor temperature (IEC 60034-1) ──
  {
    id: "temp-iec60034",
    category: "thermal",
    standard: "IEC 60034-1",
    unit: "°C",
    name: { en: "Bearing / motor temperature", th: "อุณหภูมิลูกปืน / มอเตอร์" },
    basis: {
      en: "Rising bearing temperature signals lubrication or cooling failure; every +10 °C roughly halves insulation life.",
      th: "อุณหภูมิลูกปืนที่สูงขึ้นบ่งชี้การหล่อลื่น/ระบายความร้อนบกพร่อง · ทุก +10 °C อายุฉนวนลดลงครึ่งหนึ่ง",
    },
    check: { en: "Temperature above 75 °C (watch) or 88 °C (act now)", th: "อุณหภูมิเกิน 75 °C (เฝ้าดู) หรือ 88 °C (ต้องจัดการ)" },
    action: { en: "Inspect lubrication & cooling; schedule service", th: "ตรวจการหล่อลื่นและระบายความร้อน · นัดซ่อมบำรุง" },
    perAsset: (a) => {
      if (a.tempC < 75) return null;
      const crit = a.tempC >= 88;
      return {
        ruleId: "temp-iec60034", severity: crit ? "critical" : "warning",
        scope: a.name, value: `${a.tempC} °C`, limit: crit ? "88 °C" : "75 °C",
        bahtAtRisk: round10(a.powerKw * (crit ? 500 : 180) + (crit ? 30000 : 6000)),
      };
    },
  },
  // ── 3 · Predicted failure / low health (SpareX RUL) ──
  {
    id: "health-rul",
    category: "reliability",
    standard: "SpareX RUL model",
    unit: "health %",
    name: { en: "Remaining-life risk", th: "ความเสี่ยงอายุการใช้งานเหลือ" },
    basis: {
      en: "Health blends vibration, temperature and runtime into a remaining-useful-life score; a low score precedes unplanned downtime.",
      th: "คะแนนสุขภาพรวมการสั่น อุณหภูมิ และชั่วโมงเดินเครื่อง เป็นอายุที่เหลือ · คะแนนต่ำมาก่อนเครื่องหยุดไม่ทันตั้งตัว",
    },
    check: { en: "Health below 80% (watch) or 68% (act now)", th: "สุขภาพต่ำกว่า 80% (เฝ้าดู) หรือ 68% (ต้องจัดการ)" },
    action: { en: "Plan predictive maintenance before failure", th: "วางแผนซ่อมเชิงคาดการณ์ก่อนเครื่องเสีย" },
    perAsset: (a) => {
      if (a.health >= 80) return null;
      const crit = a.health < 68;
      return {
        ruleId: "health-rul", severity: crit ? "critical" : "warning",
        scope: a.name, value: `${a.health}% health${a.rulDays != null ? ` · ~${a.rulDays}d left` : ""}`, limit: crit ? "68%" : "80%",
        bahtAtRisk: round10(a.powerKw * (crit ? 700 : 250) + (crit ? 60000 : 12000)),
      };
    },
  },
  // ── 4 · OEE below target (production) ──
  {
    id: "oee-target",
    category: "production",
    standard: "OEE · world-class 85%",
    unit: "% OEE",
    name: { en: "OEE below target", th: "OEE ต่ำกว่าเป้า" },
    basis: {
      en: "OEE = Availability × Performance × Quality. World-class is ≥85%; sustained shortfall is lost throughput.",
      th: "OEE = ความพร้อมใช้ × สมรรถนะ × คุณภาพ · ระดับโลก ≥85% · ต่ำกว่านานๆ คือกำลังผลิตที่หายไป",
    },
    check: { en: "OEE under the target (default 85%)", th: "OEE ต่ำกว่าเป้า (ค่าเริ่มต้น 85%)" },
    action: { en: "Drill into the six big losses on that line", th: "เจาะดู Six Big Losses ของไลน์นั้น" },
    perAsset: (a, cfg) => {
      if (a.category !== "production" || a.oee >= cfg.oeeTarget) return null;
      const gap = cfg.oeeTarget - a.oee;
      const crit = a.oee < cfg.oeeTarget - 10;
      return {
        ruleId: "oee-target", severity: crit ? "critical" : "warning",
        scope: a.name, value: `${a.oee}% OEE`, limit: `${cfg.oeeTarget}%`,
        bahtAtRisk: round10(gap * 2500),
      };
    },
  },
  // ── 5 · Peak demand vs contract (utility tariff) ──
  {
    id: "peak-demand",
    category: "power",
    standard: "MEA/PEA contract demand",
    unit: "kW",
    name: { en: "Peak demand approaching contract", th: "ดีมานด์ใกล้ชนสัญญา" },
    basis: {
      en: "The demand charge is billed on the 15-min peak. Crossing the contracted maximum triggers a steep penalty for a full year.",
      th: "ค่าดีมานด์คิดจากพีค 15 นาที · เกินสัญญาโดนค่าปรับแพงยาวทั้งปี",
    },
    check: { en: "Demand over the alert % of contract (default 90%)", th: "ดีมานด์เกิน % ของสัญญาที่ตั้งไว้ (เริ่มต้น 90%)" },
    action: { en: "Shed/stagger non-critical loads before the peak", th: "ปลด/เหลื่อมโหลดที่ไม่วิกฤตก่อนถึงพีค" },
    perPlant: (p, cfg) => {
      const alertKw = p.contractKw * (cfg.peakPct / 100);
      if (p.demandKw < alertKw) return null;
      const crit = p.demandKw >= p.contractKw;
      const overContract = Math.max(0, p.demandKw - p.contractKw);
      return {
        ruleId: "peak-demand", severity: crit ? "critical" : "warning",
        scope: "Plant-wide · main meter", value: `${p.demandKw.toLocaleString()} kW`, limit: `${Math.round(alertKw).toLocaleString()} kW (${cfg.peakPct}%)`,
        // MEA demand charge ≈ 132 ฿/kW·month; over-contract exposure is the penalty
        bahtAtRisk: crit ? round10(overContract * 132 * 12 + 180000) : round10((p.demandKw - alertKw) * 132),
      };
    },
  },
  // ── 6 · Power factor (utility tariff) ──
  {
    id: "power-factor",
    category: "power-quality",
    standard: "MEA/PEA PF ≥ 0.85",
    unit: "PF",
    name: { en: "Low power factor", th: "เพาเวอร์แฟกเตอร์ต่ำ" },
    basis: {
      en: "Reactive power beyond 61.97% of kW (PF < 0.85) is surcharged at 56.07 ฿/kVAR. Capacitor correction erases it.",
      th: "กำลังรีแอกทีฟเกิน 61.97% ของ kW (PF < 0.85) โดนคิดเพิ่ม 56.07 ฿/kVAR · แก้ด้วยคาปาซิเตอร์แบงก์",
    },
    check: { en: "Power factor below the penalty floor (0.85)", th: "PF ต่ำกว่าเกณฑ์ค่าปรับ (0.85)" },
    action: { en: "Recommend / size a capacitor bank", th: "แนะนำ / คำนวณคาปาซิเตอร์แบงก์" },
    perPlant: (p, cfg) => {
      if (p.pf >= cfg.pfMin) return null;
      const crit = p.pf < 0.8;
      // surcharged reactive kVAR ≈ demand × (tan(acos(pf)) − 0.6197)
      const excessKvar = Math.max(0, p.demandKw * (Math.tan(Math.acos(p.pf)) - 0.6197));
      return {
        ruleId: "power-factor", severity: crit ? "critical" : "warning",
        scope: "Plant-wide · main meter", value: `PF ${p.pf.toFixed(2)}`, limit: `${cfg.pfMin.toFixed(2)}`,
        bahtAtRisk: round10(excessKvar * 56.07),
      };
    },
  },
];

export const ruleById = (id: string) => ENGINEERING_RULES.find((r) => r.id === id);

/** run every rule against the current data → the findings that fired */
export function evaluateRules(
  list: Asset[] = assets,
  plant: PlantReading = DEMO_PLANT,
  cfg: RuleConfig = DEFAULT_CONFIG,
): Finding[] {
  const out: Finding[] = [];
  for (const rule of ENGINEERING_RULES) {
    if (rule.perPlant) { const f = rule.perPlant(plant, cfg); if (f) out.push(f); }
    if (rule.perAsset) for (const a of list) { const f = rule.perAsset(a, cfg); if (f) out.push(f); }
  }
  // worst first, then biggest ฿
  const rank: Record<Severity, number> = { critical: 0, warning: 1, ok: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || b.bahtAtRisk - a.bahtAtRisk);
}

/** findings grouped under their rule, for the catalog view */
export function findingsByRule(findings: Finding[]) {
  const m = new Map<string, Finding[]>();
  for (const f of findings) { const l = m.get(f.ruleId) ?? []; l.push(f); m.set(f.ruleId, l); }
  return m;
}

export const SEV_META: Record<Severity, { label: LZ; hex: string; tone: string }> = {
  critical: { label: { en: "Critical", th: "วิกฤต" }, hex: "#f43f5e", tone: "rose" },
  warning: { label: { en: "Watch", th: "เฝ้าดู" }, hex: "#f59e0b", tone: "amber" },
  ok: { label: { en: "OK", th: "ปกติ" }, hex: "#34d399", tone: "emerald" },
};
