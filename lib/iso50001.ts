// ISO 50001:2018 Energy Management System (EnMS) — data layer for the
// energy-performance report. Clause-aligned, bilingual, deterministic mock.

import type { CZ } from "./carbon";

export const enms = {
  standard: "ISO 50001:2018",
  baselineYear: 2021,
  period: { en: "FY2026 · MTD Jul", th: "ปีงบ 2026 · เดือน ก.ค." } as CZ,
  /** total energy (MWh) */
  baselineMWh: 21600,
  currentMWh: 19340,
  targetMWh: 19800,
  improvementPct: 10.5, // energy performance improvement vs baseline
  targetImprovementPct: 8,
  renewablePct: 38,
  annualCost: 78_400_000, // ฿/yr total energy spend
};

/** Clause 5.2 — Energy policy statement */
export const energyPolicy: CZ = {
  en: "SpareX Bangkok Plant 1 is committed to continual improvement of energy performance, to providing the resources and information needed to achieve energy objectives, and to complying with all legal and other energy requirements. We embed energy efficiency into design, procurement and operations, and support the procurement of energy-efficient products and renewable energy.",
  th: "โรงงาน SpareX กรุงเทพ 1 มุ่งมั่นปรับปรุงสมรรถนะพลังงานอย่างต่อเนื่อง จัดสรรทรัพยากรและข้อมูลที่จำเป็นเพื่อบรรลุวัตถุประสงค์ด้านพลังงาน และปฏิบัติตามกฎหมายและข้อกำหนดด้านพลังงานทั้งหมด เราผนวกประสิทธิภาพพลังงานเข้ากับการออกแบบ การจัดซื้อ และการปฏิบัติงาน พร้อมสนับสนุนการจัดซื้อสินค้าประหยัดพลังงานและพลังงานหมุนเวียน",
};

/** Clause 6.3 — energy sources (annual, MWh-equivalent) */
export const energySources: { name: CZ; mwh: number; color: string }[] = [
  { name: { en: "Grid electricity", th: "ไฟฟ้าจากกริด" }, mwh: 14200, color: "#0284c7" },
  { name: { en: "Natural gas", th: "ก๊าซธรรมชาติ" }, mwh: 3100, color: "#f59e0b" },
  { name: { en: "Steam / boiler", th: "ไอน้ำ / หม้อไอน้ำ" }, mwh: 1800, color: "#a78bfa" },
  { name: { en: "Diesel (backup)", th: "ดีเซล (สำรอง)" }, mwh: 240, color: "#94a3b8" },
];

/** Clause 6.3 — Significant Energy Uses (SEU), % of total energy */
export const seus: { name: CZ; share: number; note: CZ }[] = [
  { name: { en: "Chiller plant (cooling)", th: "ระบบชิลเลอร์ (ทำความเย็น)" }, share: 32, note: { en: "COP-monitored · AI setpoint", th: "ติดตาม COP · ตั้งค่าอัตโนมัติด้วย AI" } },
  { name: { en: "Process heating (boiler/steam)", th: "ความร้อนในกระบวนการ (หม้อไอน้ำ)" }, share: 18, note: { en: "Economizer heat recovery", th: "นำความร้อนทิ้งกลับ (economizer)" } },
  { name: { en: "Motors & drives (production)", th: "มอเตอร์ & ไดรฟ์ (การผลิต)" }, share: 16, note: { en: "VSD retrofit programme", th: "โครงการติดตั้ง VSD" } },
  { name: { en: "Compressed air", th: "ระบบอัดอากาศ" }, share: 14, note: { en: "Leak survey · night base-load", th: "สำรวจลมรั่ว · โหลดกลางคืน" } },
  { name: { en: "HVAC / air handling", th: "ปรับอากาศ / เครื่องส่งลม" }, share: 12, note: { en: "Demand-controlled ventilation", th: "ควบคุมการระบายอากาศตามโหลด" } },
  { name: { en: "Lighting & others", th: "แสงสว่าง & อื่นๆ" }, share: 8, note: { en: "LED + smart controls", th: "LED + ควบคุมอัจฉริยะ" } },
];

/** Clause 6.4 — Energy Performance Indicators (EnPI) */
export const enpis: { name: CZ; unit: string; baseline: number; current: number; target: number; better: "lower" | "higher" }[] = [
  { name: { en: "Specific energy consumption (SEC)", th: "การใช้พลังงานจำเพาะ (SEC)" }, unit: "kWh/unit", baseline: 0.58, current: 0.49, target: 0.5, better: "lower" },
  { name: { en: "Chiller plant efficiency", th: "ประสิทธิภาพชิลเลอร์" }, unit: "kW/RT", baseline: 0.72, current: 0.64, target: 0.62, better: "lower" },
  { name: { en: "Compressed air", th: "ระบบอัดอากาศ" }, unit: "kWh/Nm³", baseline: 0.118, current: 0.104, target: 0.105, better: "lower" },
  { name: { en: "Boiler efficiency", th: "ประสิทธิภาพหม้อไอน้ำ" }, unit: "%", baseline: 82, current: 86, target: 88, better: "higher" },
  { name: { en: "Total energy", th: "พลังงานรวม" }, unit: "MWh/yr", baseline: 21600, current: 19340, target: 19800, better: "lower" },
];

/** Clause 6.5 — Energy Baseline (EnB) monthly SEC: baseline vs actual (kWh/unit) */
export const enpiTrend = [
  { t: "Jan", baseline: 0.58, actual: 0.55 },
  { t: "Feb", baseline: 0.58, actual: 0.54 },
  { t: "Mar", baseline: 0.58, actual: 0.53 },
  { t: "Apr", baseline: 0.58, actual: 0.52 },
  { t: "May", baseline: 0.58, actual: 0.51 },
  { t: "Jun", baseline: 0.58, actual: 0.5 },
  { t: "Jul", baseline: 0.58, actual: 0.49 },
  { t: "Aug", baseline: 0.58, actual: 0.49 },
  { t: "Sep", baseline: 0.58, actual: 0.485 },
];

/** Clause 6.2 — objectives, targets & action plans */
export const actionPlans: { action: CZ; seu: CZ; mwh: number; saving: number; status: CZ }[] = [
  { action: { en: "Rooftop solar 1.2 MWp (PPA)", th: "โซลาร์รูฟท็อป 1.2 MWp (PPA)" }, seu: { en: "Grid electricity", th: "ไฟฟ้ากริด" }, mwh: 1750, saving: 3_600_000, status: { en: "In progress", th: "กำลังดำเนินการ" } },
  { action: { en: "VSD retrofit · chillers & pumps", th: "ติดตั้ง VSD · ชิลเลอร์ & ปั๊ม" }, seu: { en: "Motors & drives", th: "มอเตอร์ & ไดรฟ์" }, mwh: 1240, saving: 1_240_000, status: { en: "In progress", th: "กำลังดำเนินการ" } },
  { action: { en: "AI chiller setpoint optimization", th: "ปรับตั้งค่าชิลเลอร์ด้วย AI" }, seu: { en: "Chiller plant", th: "ระบบชิลเลอร์" }, mwh: 620, saving: 720_000, status: { en: "Verified", th: "ยืนยันผลแล้ว" } },
  { action: { en: "Boiler heat recovery (economizer)", th: "นำความร้อนทิ้งกลับ (economizer)" }, seu: { en: "Process heating", th: "ความร้อนกระบวนการ" }, mwh: 980, saving: 980_000, status: { en: "Planned", th: "วางแผน" } },
  { action: { en: "Compressed-air leak repair", th: "ซ่อมลมรั่วระบบอัดอากาศ" }, seu: { en: "Compressed air", th: "ระบบอัดอากาศ" }, mwh: 540, saving: 540_000, status: { en: "Verified", th: "ยืนยันผลแล้ว" } },
  { action: { en: "LED + smart lighting controls", th: "เปลี่ยน LED + ควบคุมอัจฉริยะ" }, seu: { en: "Lighting", th: "แสงสว่าง" }, mwh: 380, saving: 380_000, status: { en: "Done", th: "เสร็จ" } },
];

/** Clause 9.1 — Monitoring, measurement & analysis (M&V per IPMVP) */
export const mv: { project: CZ; planned: number; verified: number; option: string }[] = [
  { project: { en: "AI chiller setpoint optimization", th: "ปรับตั้งค่าชิลเลอร์ด้วย AI" }, planned: 600, verified: 620, option: "IPMVP Option C" },
  { project: { en: "Compressed-air leak repair", th: "ซ่อมลมรั่วระบบอัดอากาศ" }, planned: 520, verified: 540, option: "IPMVP Option A" },
  { project: { en: "LED + smart lighting controls", th: "เปลี่ยน LED + ควบคุมอัจฉริยะ" }, planned: 400, verified: 380, option: "IPMVP Option B" },
];

/** Clause 9.3 — Management review */
export const managementReview = {
  date: { en: "12 Jun 2026", th: "12 มิ.ย. 2026" } as CZ,
  decisions: [
    { en: "Approved capex for boiler economizer (Q3)", th: "อนุมัติงบ economizer หม้อไอน้ำ (ไตรมาส 3)" },
    { en: "Tighten SEC target to 0.47 kWh/unit for 2027", th: "ปรับเป้า SEC เข้มขึ้นเป็น 0.47 kWh/หน่วย ปี 2027" },
    { en: "Expand sub-metering on the compressed-air ring-main", th: "ขยายมิเตอร์ย่อยบนท่อลมวงแหวน" },
  ] as CZ[],
};

/** standards / references this EnMS report aligns to */
export const enmsStandards: CZ[] = [
  { en: "ISO 50001:2018", th: "ISO 50001:2018" },
  { en: "ISO 50006 (EnB/EnPI)", th: "ISO 50006 (EnB/EnPI)" },
  { en: "ISO 50015 (M&V)", th: "ISO 50015 (M&V)" },
  { en: "IPMVP", th: "IPMVP" },
  { en: "PDCA continual improvement", th: "PDCA ปรับปรุงต่อเนื่อง" },
];
