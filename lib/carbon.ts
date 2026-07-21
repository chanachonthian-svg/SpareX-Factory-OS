// ESG & Carbon Intelligence — data layer (bilingual, deterministic mock).
// Feeds the 5-tab Carbon Suite: Overview · Monitor · Analyze · Act · Report.

export type CZ = { en: string; th: string };

/** reporting context */
export const reportPeriod: CZ = { en: "MTD · Jul 2026", th: "เดือนนี้ · ก.ค. 2026" };
export const baseYear = 2021;

/** headline figures (tCO₂e, month-to-date) */
export const kpi = {
  scope1: 442, // = Σ direct sources (natural gas 220 + steam 130 + refrigerants 64 + diesel 28)
  scope2: 540,
  scope3: 1180,
  intensity: 0.42, // kgCO₂e per unit produced
  renewablePct: 38, // % of electricity from renewable sources (market-based)
  traceability: 100, // % of figures traceable to a source meter
};

/** tiny downward sparklines for the KPI cards (good = falling) */
export const sparks = {
  scope1: [58, 56, 57, 55, 53, 52, 50, 49, 48, 47, 46, 45],
  scope2: [72, 70, 68, 66, 61, 58, 56, 54, 52, 51, 50, 49],
  scope3: [64, 63, 62, 60, 59, 58, 57, 56, 55, 55, 54, 53],
  intensity: [70, 68, 67, 64, 60, 57, 55, 53, 51, 50, 49, 48],
};

/** emissions trend — Scope 1/2/3 by month (tCO₂e) */
export const emissionsTrend = [
  { t: "Jan", scope1: 340, scope2: 620, scope3: 1290 },
  { t: "Feb", scope1: 352, scope2: 640, scope3: 1305 },
  { t: "Mar", scope1: 348, scope2: 636, scope3: 1288 },
  { t: "Apr", scope1: 334, scope2: 606, scope3: 1260 },
  { t: "May", scope1: 300, scope2: 566, scope3: 1235 },
  { t: "Jun", scope1: 276, scope2: 512, scope3: 1210 },
  { t: "Jul", scope1: 258, scope2: 470, scope3: 1180 },
  { t: "Aug", scope1: 244, scope2: 452, scope3: 1165 },
  { t: "Sep", scope1: 250, scope2: 460, scope3: 1170 },
];

/** emissions by source — Scope 1 & 2 (MTD, tCO₂e) */
export const bySource: { name: CZ; value: number; scope: 1 | 2 }[] = [
  { name: { en: "Grid electricity", th: "ไฟฟ้าจากกริด" }, value: 540, scope: 2 },
  { name: { en: "Natural gas", th: "ก๊าซธรรมชาติ" }, value: 220, scope: 1 },
  { name: { en: "Steam / boiler", th: "ไอน้ำ / หม้อไอน้ำ" }, value: 130, scope: 1 },
  { name: { en: "Refrigerants", th: "สารทำความเย็น" }, value: 64, scope: 1 },
  { name: { en: "Diesel (backup)", th: "ดีเซล (สำรอง)" }, value: 28, scope: 1 },
];

/** Scope 1 (direct) grouped by GHG-Protocol category · Σ = kpi.scope1 (442) */
export const scope1Categories: { name: CZ; value: number }[] = [
  { name: { en: "Stationary combustion", th: "เผาไหม้อยู่กับที่" }, value: 350 }, // natural gas + steam/boiler
  { name: { en: "Fugitive · refrigerants", th: "รั่วไหล · สารทำความเย็น" }, value: 64 },
  { name: { en: "Mobile · backup diesel", th: "เคลื่อนที่ · ดีเซลสำรอง" }, value: 28 },
];

/** Scope 3 value-chain categories (tCO₂e, MTD) */
export const scope3 = [
  { name: { en: "Purchased goods & materials", th: "วัตถุดิบที่จัดซื้อ" }, value: 620 },
  { name: { en: "Upstream transport", th: "ขนส่งต้นน้ำ" }, value: 210 },
  { name: { en: "Downstream logistics", th: "ขนส่งปลายน้ำ" }, value: 175 },
  { name: { en: "Business travel & commute", th: "เดินทาง & พนักงาน" }, value: 95 },
  { name: { en: "Waste & wastewater", th: "ของเสีย & น้ำเสีย" }, value: 80 },
];

/** activity data behind Scope 1·2·3 — the measured quantities auditors trace back to (MTD) */
export const activityData = {
  scope1: [
    { name: { en: "Natural gas", th: "ก๊าซธรรมชาติ" }, qty: "118,400", unit: "Nm³" },
    { name: { en: "Boiler fuel / steam", th: "เชื้อเพลิงหม้อไอน้ำ" }, qty: "1,920", unit: "GJ" },
    { name: { en: "Refrigerant top-up · R-134a", th: "เติมสารทำความเย็น · R-134a" }, qty: "45", unit: "kg" },
    { name: { en: "Diesel (backup gen)", th: "ดีเซล (เครื่องสำรอง)" }, qty: "10,400", unit: "L" },
  ] as { name: CZ; qty: string; unit: string }[],
  scope2: { mwh: "1,380", gridFactor: "0.4999", factorSource: "EPPO" },
  scope3Coverage: { measured: 5, total: 15, spendPct: 82 },
};

/** Scope 2 dual reporting (GHG Protocol) */
export const scope2Dual = {
  locationBased: 690, // grid-average factor
  marketBased: 540, // after RECs / PPA
  renewablePct: 38,
  mix: [
    { name: { en: "Grid (fossil)", th: "กริด (ฟอสซิล)" }, value: 62, color: "#94a3b8" },
    { name: { en: "Solar PPA", th: "โซลาร์ PPA" }, value: 26, color: "#facc15" },
    { name: { en: "I-REC certificates", th: "ใบรับรอง I-REC" }, value: 12, color: "#34d399" },
  ] as { name: CZ; value: number; color: string }[],
};

/** Net-zero glidepath — SBTi target vs actual vs AI forecast (tCO₂e/yr) */
export const glidepath = [
  { t: "2021", target: 12800, actual: 12800 },
  { t: "2022", target: 12089, actual: 12100 },
  { t: "2023", target: 11378, actual: 11250 },
  { t: "2024", target: 10667, actual: 10400 },
  { t: "2025", target: 9956, actual: 9700 },
  { t: "2026", target: 9244, actual: 9200, forecast: 9200 },
  { t: "2027", target: 8533, forecast: 8480 },
  { t: "2028", target: 7822, forecast: 7690 },
  { t: "2029", target: 7111, forecast: 6880 },
  { t: "2030", target: 6400, forecast: 6080 },
];
export const target2030 = { reductionPct: 50, tco2e: 6400 }; // SBTi near-term target

/** AI-detected emission hotspots */
export const hotspots: { title: CZ; detail: CZ; tco2e: number; trend: "up" | "down" }[] = [
  { title: { en: "Chiller plant efficiency drift", th: "ประสิทธิภาพชิลเลอร์ตก" }, detail: { en: "COP down 8% → +34 tCO₂e/mo from grid power", th: "COP ลด 8% → +34 tCO₂e/เดือนจากไฟกริด" }, tco2e: 34, trend: "up" },
  { title: { en: "Compressed-air leakage", th: "ลมรั่วในระบบอัดอากาศ" }, detail: { en: "Night base-load 20% over target — ring-main leak", th: "โหลดกลางคืนเกินเป้า 20% — ลมรั่วท่อวงแหวน" }, tco2e: 18, trend: "up" },
  { title: { en: "Off-peak load shifting", th: "ย้ายโหลดออกช่วงพีค" }, detail: { en: "Pre-cooling shifted 210 MWh to low-carbon hours", th: "พรีคูลย้าย 210 MWh ไปชั่วโมงคาร์บอนต่ำ" }, tco2e: -22, trend: "down" },
];

/** MACC — marginal abatement projects, ranked by cost per tonne */
export type Macc = {
  id: string;
  code: string;
  name: CZ;
  category: CZ;
  tco2e: number; // tCO₂e/yr abated
  capex: number; // ฿
  saving: number; // ฿/yr operating saving
  bahtPerTon: number; // ฿ / tCO₂e (negative = self-funding)
  paybackYr: number; // years (0 = PPA, no capex)
  credits: number; // extra T-VER credits/yr unlocked
};
export const macc: Macc[] = [
  { id: "CARB-01", code: "ESG-01", name: { en: "Rooftop solar 1.2 MWp (solar PPA)", th: "โซลาร์รูฟท็อป 1.2 MWp (PPA)" }, category: { en: "Renewable", th: "พลังงานสะอาด" }, tco2e: 720, capex: 0, saving: 3_600_000, bahtPerTon: -1200, paybackYr: 0, credits: 720 },
  { id: "CARB-02", code: "ESG-02", name: { en: "VSD retrofit · chillers & pumps", th: "ติดตั้ง VSD · ชิลเลอร์ & ปั๊ม" }, category: { en: "Efficiency", th: "ประสิทธิภาพ" }, tco2e: 190, capex: 850_000, saving: 1_240_000, bahtPerTon: -640, paybackYr: 0.7, credits: 190 },
  { id: "CARB-03", code: "ESG-03", name: { en: "Compressed-air leak repair programme", th: "โครงการซ่อมลมรั่วระบบอัดอากาศ" }, category: { en: "Efficiency", th: "ประสิทธิภาพ" }, tco2e: 96, capex: 120_000, saving: 540_000, bahtPerTon: -560, paybackYr: 0.3, credits: 96 },
  { id: "CARB-04", code: "ESG-04", name: { en: "Boiler heat recovery (economizer)", th: "นำความร้อนทิ้งกลับมาใช้ (economizer)" }, category: { en: "Heat", th: "ความร้อน" }, tco2e: 140, capex: 1_400_000, saving: 980_000, bahtPerTon: 210, paybackYr: 1.4, credits: 140 },
  { id: "CARB-05", code: "ESG-05", name: { en: "LED + smart lighting controls", th: "เปลี่ยน LED + ควบคุมแสงอัจฉริยะ" }, category: { en: "Efficiency", th: "ประสิทธิภาพ" }, tco2e: 58, capex: 460_000, saving: 380_000, bahtPerTon: 320, paybackYr: 1.2, credits: 58 },
  { id: "CARB-06", code: "ESG-06", name: { en: "Low-GWP refrigerant conversion", th: "เปลี่ยนสารทำความเย็น GWP ต่ำ" }, category: { en: "Refrigerant", th: "สารทำความเย็น" }, tco2e: 42, capex: 680_000, saving: 90_000, bahtPerTon: 1450, paybackYr: 4.2, credits: 42 },
  { id: "CARB-07", code: "ESG-07", name: { en: "Electric forklift fleet (diesel → EV)", th: "เปลี่ยนรถโฟล์คลิฟต์เป็นไฟฟ้า" }, category: { en: "Fleet", th: "ยานพาหนะ" }, tco2e: 34, capex: 2_100_000, saving: 420_000, bahtPerTon: 2600, paybackYr: 5.0, credits: 34 },
];

/** Product Carbon Footprint — per-product, CBAM-relevant (kgCO₂e/unit) */
export const products: { sku: string; name: CZ; kg: number; cbam: boolean; market: CZ }[] = [
  { sku: "AL-6061-BILLET", name: { en: "Aluminium billet", th: "อะลูมิเนียมแท่ง" }, kg: 8.6, cbam: true, market: { en: "EU", th: "อียู" } },
  { sku: "STL-PLATE-A36", name: { en: "Steel plate A36", th: "เหล็กแผ่น A36" }, kg: 2.1, cbam: true, market: { en: "EU", th: "อียู" } },
  { sku: "PART-STAMP-218", name: { en: "Stamped bracket 218", th: "ชิ้นงานปั๊ม 218" }, kg: 0.94, cbam: false, market: { en: "JP / TH", th: "ญี่ปุ่น / ไทย" } },
  { sku: "WELD-ASSY-V2", name: { en: "Welded assembly V2", th: "ชุดงานเชื่อม V2" }, kg: 1.7, cbam: false, market: { en: "US", th: "สหรัฐฯ" } },
];

/**
 * Carbon-credit growth — the headline promise: run the plant on SpareX and the
 * verified abatement (T-VER) you can register grows well beyond the do-nothing
 * baseline. Cumulative credits (tCO₂e) by quarter, "e" = forecast.
 */
export const credits = {
  earnedYtd: 1240,
  bahtPerCredit: 320, // ฿ per verified credit (tCO₂e)
  upliftPct: 51, // extra credits vs baseline over the horizon
  registry: "TGO · T-VER",
  series: [
    { t: "Q1", baseline: 220, sparex: 220 },
    { t: "Q2", baseline: 430, sparex: 520 },
    { t: "Q3", baseline: 600, sparex: 880 },
    { t: "Q4", baseline: 810, sparex: 1240 },
    { t: "Q1'27e", baseline: 1000, sparex: 1680 },
    { t: "Q2'27e", baseline: 1180, sparex: 2110 },
  ],
};

/** tCO₂e already abated year-to-date (drives the real-world equivalents) */
export const abatedYtd = 3120;

/** decoupling — production output climbs while emissions fall (Jan = 100).
 *  The widening jaws are the board-level proof that growth ≠ more carbon. */
export const decouplingTrend = [
  { t: "Jan", output: 100, emissions: 100 },
  { t: "Feb", output: 103, emissions: 102 },
  { t: "Mar", output: 106, emissions: 101 },
  { t: "Apr", output: 108, emissions: 98 },
  { t: "May", output: 112, emissions: 93 },
  { t: "Jun", output: 116, emissions: 89 },
  { t: "Jul", output: 118, emissions: 84 },
  { t: "Aug", output: 121, emissions: 82 },
  { t: "Sep", output: 124, emissions: 83 },
];

/** T-VER credit pipeline — how far each verified tonne is from being sellable */
export const creditPipeline: { stage: CZ; tco2e: number; note: CZ }[] = [
  { stage: { en: "Credits issued", th: "ออกเครดิตแล้ว" }, tco2e: 1240, note: { en: "registered & sellable", th: "ขึ้นทะเบียนแล้ว ขายได้" } },
  { stage: { en: "Submitted to TGO", th: "ยื่น TGO รอตรวจ" }, tco2e: 540, note: { en: "under validation · ~8 weeks", th: "อยู่ระหว่างตรวจรับรอง · ~8 สัปดาห์" } },
  { stage: { en: "Measured, not yet filed", th: "วัดผลแล้ว ยังไม่ยื่น" }, tco2e: 460, note: { en: "evidence pack auto-compiled by SpareX", th: "SpareX รวบรวมหลักฐานให้อัตโนมัติ" } },
];

/** CBAM exposure — what EU-bound products cost in certificates at today's
 *  embedded carbon (EU ETS price × tCO₂e shipped per year) */
export const cbamExposure = {
  etsEur: 85, // €/tCO₂e (EU ETS reference)
  fxThb: 39, // ฿/€
  items: [
    { sku: "AL-6061-BILLET", unitsYr: 120_000 },
    { sku: "STL-PLATE-A36", unitsYr: 260_000 },
  ] as { sku: string; unitsYr: number }[],
  planReductionPct: 30, // PCF drop if the Act pipeline is delivered
};

/** relatable equivalents for a tonnage of CO₂e */
export const equivalents = (tco2e: number) => ({
  trees: Math.round((tco2e * 1000) / 21), // ~21 kgCO₂/tree/yr sequestered
  cars: Math.round(tco2e / 4.6), // ~4.6 tCO₂/passenger car/yr
  homes: Math.round(tco2e / 2.1), // homes' annual electricity
  flights: Math.round(tco2e / 0.9), // one-way BKK–London economy ≈ 0.9 tCO₂
});

/** frameworks this report aligns to */
export const standards: CZ[] = [
  { en: "GHG Protocol", th: "GHG Protocol" },
  { en: "ISO 14064-1", th: "ISO 14064-1" },
  { en: "EU CBAM", th: "CBAM (อียู)" },
  { en: "CSRD / ESRS", th: "CSRD / ESRS" },
  { en: "IFRS S2 (ISSB)", th: "IFRS S2 (ISSB)" },
  { en: "CDP", th: "CDP" },
  { en: "GRI 305", th: "GRI 305" },
  { en: "TGO T-VER", th: "TGO T-VER" },
];

/** ฿ formatter (compact) */
export const baht = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return `฿${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(n) >= 1_000) return `฿${Math.round(n / 1_000)}K`;
  return `฿${n}`;
};
