import type { Locale } from "./dict";
import type { AssetStatus } from "./factory";

export type OpTwinTabId =
  | "overview"
  | "map"
  | "production"
  | "energy"
  | "asset"
  | "utility"
  | "carbon"
  | "financial"
  | "process"
  | "heatmap"
  | "simulation"
  | "insights"
  | "action"
  | "copilot";

export const opTwinTabs: {
  id: OpTwinTabId;
  icon: string;
  labels: Record<Locale, string>;
}[] = [
  { id: "overview", icon: "overview", labels: { en: "Factory Overview", th: "ภาพรวมโรงงาน", ja: "工場概要", zh: "工厂概览" } },
  { id: "map", icon: "map", labels: { en: "3D Factory Map", th: "แผนที่โรงงาน 3D", ja: "3Dファクトリーマップ", zh: "3D 工厂地图" } },
  { id: "production", icon: "production", labels: { en: "Production Twin", th: "ทวินการผลิต", ja: "生産ツイン", zh: "生产孪生" } },
  { id: "energy", icon: "energy", labels: { en: "Energy Twin", th: "ทวินพลังงาน", ja: "エネルギーツイン", zh: "能源孪生" } },
  { id: "asset", icon: "asset", labels: { en: "Asset Twin", th: "ทวินสินทรัพย์", ja: "資産ツイン", zh: "资产孪生" } },
  { id: "utility", icon: "utility", labels: { en: "Utility Twin", th: "ทวินระบบสนับสนุน", ja: "ユーティリティツイン", zh: "公用工程孪生" } },
  { id: "carbon", icon: "carbon", labels: { en: "Carbon Twin", th: "ทวินคาร์บอน", ja: "カーボンツイン", zh: "碳孪生" } },
  { id: "financial", icon: "financial", labels: { en: "Financial Twin", th: "ทวินการเงิน", ja: "財務ツイン", zh: "财务孪生" } },
  { id: "process", icon: "process", labels: { en: "Process Flow Twin", th: "ทวินการไหลของกระบวนการ", ja: "プロセスフローツイン", zh: "工艺流孪生" } },
  { id: "heatmap", icon: "heatmap", labels: { en: "Heatmap Center", th: "ศูนย์ฮีตแมป", ja: "ヒートマップ", zh: "热力图中心" } },
  { id: "simulation", icon: "simulation", labels: { en: "Simulation Center", th: "ศูนย์จำลอง", ja: "シミュレーション", zh: "仿真中心" } },
  { id: "insights", icon: "insights", labels: { en: "AI Insights", th: "ข้อมูลเชิงลึก AI", ja: "AIインサイト", zh: "AI 洞察" } },
  { id: "action", icon: "action", labels: { en: "Action Center", th: "ศูนย์ดำเนินการ", ja: "アクションセンター", zh: "操作中心" } },
  { id: "copilot", icon: "copilot", labels: { en: "Factory Copilot", th: "Factory Copilot", ja: "ファクトリーコパイロット", zh: "工厂副驾驶" } },
];

/** Functional groups for the workspace sub-navigation. */
export const optwinGroups: { key: string; labels: Record<Locale, string>; items: OpTwinTabId[] }[] = [
  { key: "overview", labels: { en: "Overview", th: "ภาพรวม", ja: "概要", zh: "概览" }, items: ["overview", "map"] },
  { key: "twins", labels: { en: "Digital Twins", th: "ทวิน", ja: "ツイン", zh: "孪生" }, items: ["production", "energy", "asset", "utility", "carbon", "financial", "process"] },
  { key: "analyze", labels: { en: "Analyze", th: "วิเคราะห์", ja: "分析", zh: "分析" }, items: ["heatmap", "simulation", "insights"] },
  { key: "act", labels: { en: "Act", th: "ดำเนินการ", ja: "アクション", zh: "执行" }, items: ["action", "copilot"] },
];

/* ── AI Analysis (step 3) — ranked findings + the deep dive on the worst ──
   Findings carry a severity, a ฿ headline and a model confidence so users can
   triage without reading everything — and every actionable one links to the
   Action step. */

export type TwinSeverity = "act-now" | "this-week" | "opportunity" | "good";
export type TwinLZ2 = { en: string; th: string };
export const twinAiInsights: {
  tag: string;
  severity: TwinSeverity;
  title: TwinLZ2;
  detail: TwinLZ2;
  impact: TwinLZ2; // ฿ headline shown on the right
  bahtOrder: number; // sort key, biggest money first
  confidence: number; // model confidence %
  actionable: boolean;
}[] = [
  {
    tag: "Asset", severity: "act-now", bahtOrder: 3_500_000, confidence: 87, actionable: true,
    title: { en: "Chiller B will fail in ~3 days", th: "Chiller B จะพังใน ~3 วัน" },
    detail: { en: "Vibration climbing + condenser fouling signature. Work order staged with parts confirmed.", th: "ความสั่นไต่ขึ้น + ลายเซ็นตะกรันคอนเดนเซอร์ — Work Order เตรียมพร้อมอะไหล่แล้ว" },
    impact: { en: "฿3.5M at risk", th: "เสี่ยง ฿3.5M" },
  },
  {
    tag: "Production", severity: "this-week", bahtOrder: 450_000, confidence: 82, actionable: true,
    title: { en: "Line B is the OEE bottleneck", th: "ไลน์ B คือคอขวด OEE" },
    detail: { en: "Changeover losses cost ~฿15k/day. Rebalancing lots to Line A recovers ~4 pts of plant OEE.", th: "เสียเวลาเปลี่ยนรุ่น ~฿15k/วัน — ย้ายล็อตไปไลน์ A กู้ OEE โรงงานคืน ~4 จุด" },
    impact: { en: "฿450K/mo leaking", th: "รั่ว ฿450K/เดือน" },
  },
  {
    tag: "Energy", severity: "opportunity", bahtOrder: 33_000, confidence: 91, actionable: true,
    title: { en: "On-peak load drove cost +12% today", th: "โหลดช่วงพีคดันค่าไฟ +12% วันนี้" },
    detail: { en: "Shifting packaging off-peak recovers ~฿7.7k/week with zero capex.", th: "ย้ายงานแพ็กกิ้งออกนอกพีคได้คืน ~฿7.7k/สัปดาห์ โดยไม่ต้องลงทุน" },
    impact: { en: "฿33K/mo to grab", th: "เก็บได้ ฿33K/เดือน" },
  },
  {
    tag: "Carbon", severity: "good", bahtOrder: 0, confidence: 94, actionable: false,
    title: { en: "Carbon intensity down 8% YoY", th: "ความเข้มคาร์บอนลด 8% YoY" },
    detail: { en: "Scope 2 reductions are on track for the FY decarbonization target.", th: "การลด Scope 2 เดินตามเป้าลดคาร์บอนของปีงบนี้" },
    impact: { en: "on target", th: "ตามเป้า" },
  },
];

/** the deep dive behind the #1 finding — signals, confidence and the ฿ maths
 *  that separate "real AI" from decorated text in a customer's eyes */
export const chillerAnalysis = {
  asset: "Chiller B",
  assetId: "chiller-09",
  rulDays: 3,
  confidence: 87,
  daysOfData: 90,
  similarCases: 3,
  riskBaht: 3_500_000,
  fixBaht: 85_000,
  signals: [
    { label: { en: "Vibration (mm/s)", th: "ความสั่น (mm/s)" }, series: [4.4, 4.6, 4.9, 5.3, 5.8, 6.2, 6.8], now: "6.8", color: "#f43f5e", note: { en: "ISO zone D · trip level 7.1", th: "โซน D ตาม ISO · ระดับตัดการทำงาน 7.1" } },
    { label: { en: "COP · efficiency", th: "COP · ประสิทธิภาพ" }, series: [5.2, 5.15, 5.05, 4.95, 4.88, 4.82, 4.78], now: "4.78", color: "#f59e0b", note: { en: "−8% in 14 days = +15% energy draw", th: "ตก 8% ใน 14 วัน = กินไฟเพิ่ม 15%" } },
    { label: { en: "Condenser ΔT (°C)", th: "ΔT คอนเดนเซอร์ (°C)" }, series: [4.1, 4.3, 4.8, 5.6, 6.6, 7.9, 9.8], now: "9.8", color: "#22d3ee", note: { en: "fouling signature — matches 3 past cases", th: "ลายเซ็นตะกรัน — ตรงกับเคสในอดีต 3 เคส" } },
  ] as { label: TwinLZ2; series: number[]; now: string; color: string; note: TwinLZ2 }[],
  verdict: {
    en: "Condenser fouling is choking heat rejection; the compressor compensates and bearing load climbs. Left alone, a trip is expected in ~3 days.",
    th: "ตะกรันในคอนเดนเซอร์ทำให้ระบายความร้อนไม่ทัน คอมเพรสเซอร์ต้องทำงานชดเชยและแบริ่งรับภาระเพิ่ม — ถ้าปล่อยไว้ คาดว่าเครื่องจะตัดการทำงานใน ~3 วัน",
  } as TwinLZ2,
};

export type TwinActionStatus = "active" | "pending" | "suggested";
export const twinActions: {
  id: string;
  name: string;
  desc: string;
  impact: string;
  domain: string;
  status: TwinActionStatus;
}[] = [
  { id: "shed", name: "Peak Load Shedding", desc: "Shed non-critical loads to stay under 3,000 kW.", impact: "฿180k/mo", domain: "Energy", status: "active" },
  { id: "precool", name: "Off-Peak Pre-Cooling", desc: "Pre-cool chilled water during off-peak tariff.", impact: "฿95k/mo", domain: "Energy", status: "active" },
  { id: "wo", name: "Stage Chiller B Work Order", desc: "Auto-create the predictive work order with parts.", impact: "฿3.5M risk", domain: "Maintenance", status: "pending" },
  { id: "rebalance", name: "Rebalance Line B Load", desc: "Move lots to Line A to lift OEE and cut changeover loss.", impact: "฿15k/day", domain: "Production", status: "pending" },
  { id: "standby", name: "Idle Auto-Standby", desc: "Put machines idling >15 min into standby.", impact: "฿42k/mo", domain: "Energy", status: "suggested" },
];

export const simDefaults = {
  offPeakShift: 30, // %
  downtimeReduction: 20, // %
  idleCut: 40, // %
};

/* ── 24-h time replay ─────────────────────────────────────────────────────
   Scrub back through the last day and watch asset states change — the twin as
   a flight recorder. Slider t runs 0..24 where 24 = "now" (fixed at 14:00 so
   the demo stays deterministic). Status keyframes accumulate up to t. */

export type TwinLZ = { en: string; th: string };
export type ReplayTone = "ok" | "warn" | "crit";

/** clock label for a slider position (now = 14:00) */
export const replayClock = (t: number) => `${String((14 + Math.round(t)) % 24).padStart(2, "0")}:00`;

export const replayEvents: { t: number; time: string; tone: ReplayTone; label: TwinLZ }[] = [
  { t: 8, time: "22:10", tone: "warn", label: { en: "Chiller B condenser ΔT starts climbing — flagged Warning", th: "อุณหภูมิคอนเดนเซอร์ Chiller B เริ่มไต่ — ติดธงเตือน" } },
  { t: 12, time: "02:20", tone: "crit", label: { en: "Chiller B COP drop steepens → Critical · work order staged with parts", th: "COP ของ Chiller B ตกแรง → วิกฤต · เตรียม Work Order พร้อมอะไหล่" } },
  { t: 13, time: "03:05", tone: "warn", label: { en: "Stamping Press 03 vibration crosses ISO zone C", th: "ความสั่น Stamping Press 03 ข้ามโซน C (ISO)" } },
  { t: 18, time: "08:30", tone: "ok", label: { en: "Day-shift crew starts condenser clean on Chiller B", th: "กะเช้าเริ่มล้างคอนเดนเซอร์ Chiller B" } },
  { t: 22, time: "12:15", tone: "warn", label: { en: "Injection Mold 08 barrel-temp drift logged", th: "อุณหภูมิกระบอก Injection Mold 08 เริ่มเพี้ยน" } },
];

const replayKeyframes: { t: number; statuses: Record<string, AssetStatus> }[] = [
  { t: 0, statuses: { "chiller-09": "healthy", "press-03": "healthy", "inj-08": "healthy" } },
  { t: 8, statuses: { "chiller-09": "warning" } },
  { t: 12, statuses: { "chiller-09": "critical" } },
  { t: 13, statuses: { "press-03": "warning" } },
  { t: 22, statuses: { "inj-08": "warning" } },
];

/** asset-status overrides at slider position t (latest keyframe ≤ t wins) */
export function replayStatusesAt(t: number): Record<string, AssetStatus> {
  const out: Record<string, AssetStatus> = {};
  for (const k of replayKeyframes) if (k.t <= t) Object.assign(out, k.statuses);
  return out;
}

/* ── Insight step — descriptive analytics over the live asset model ──────
   Monitor shows state; Insight answers "so what": who is degrading, which
   system chain is weakest, and what an at-risk machine costs if it stops. */

/** health change over the last 7 days (points) — negative = degrading */
export const healthDelta7d: Record<string, number> = {
  "chiller-09": -14, "press-03": -9, "inj-08": -6, "comp-10": -4, "ct-17": -3,
  "paint-14": -2, "weld-04": -1, "ahu-19": -1,
  "cnc-01": 1, "cnc-05": 0, "robo-02": 1, "qc-07": 0, "assy-13": 2, "agv-06": 1,
  "chiller-15": 1, "comp-16": 0, "boiler-12": 1, "mdb-11": 0, "pump-18": 2, "wwt-20": 0,
};

/** plant systems — grouped into the chains that fail together */
export const twinSystems: { label: TwinLZ; lines: string[] }[] = [
  { label: { en: "Cooling chain", th: "ระบบทำความเย็น" }, lines: ["Cooling"] },
  { label: { en: "Compressed air", th: "ระบบลมอัด" }, lines: ["Compressed Air"] },
  { label: { en: "Power & steam", th: "ไฟฟ้า & ไอน้ำ" }, lines: ["Electrical", "Steam"] },
  { label: { en: "HVAC & environment", th: "HVAC & สิ่งแวดล้อม" }, lines: ["HVAC", "Environmental"] },
  { label: { en: "Line A", th: "ไลน์ผลิต A" }, lines: ["Line A"] },
  { label: { en: "Line B", th: "ไลน์ผลิต B" }, lines: ["Line B"] },
  { label: { en: "Line C + logistics", th: "ไลน์ C + โลจิสติกส์" }, lines: ["Line C", "Logistics"] },
];

/** what it costs the business if an at-risk asset stops — asset → line → ฿ */
export const riskImpact: { assetId: string; asset: string; downstream: TwinLZ; bahtPerHr: number }[] = [
  { assetId: "chiller-09", asset: "Chiller B", downstream: { en: "Lines A + B overheat and stop within ~40 min (shared cooling)", th: "ไลน์ A + B ร้อนเกินและหยุดใน ~40 นาที (ใช้คูลลิ่งร่วมกัน)" }, bahtPerHr: 60_000 },
  { assetId: "press-03", asset: "Stamping Press 03", downstream: { en: "Line B stops immediately — no press buffer", th: "ไลน์ B หยุดทันที — ไม่มีบัฟเฟอร์งานปั๊ม" }, bahtPerHr: 30_000 },
  { assetId: "inj-08", asset: "Injection Mold 08", downstream: { en: "Line C slows ~30% while molding reroutes", th: "ไลน์ C ช้าลง ~30% ระหว่างย้ายงานฉีด" }, bahtPerHr: 9_000 },
];

/* ── twin ROI — what the module paid back this month ──────────────────────
   Downtime the twin's predictions avoided, priced at the line's ฿/hr loss.
   This is the number a CFO uses to justify the license renewal. */
export const twinRoi = {
  month: { en: "Jul 2026 · MTD", th: "ก.ค. 2026 · เดือนนี้" } as TwinLZ,
  avoidedHrs: 14,
  avoidedBaht: 860_000,
  catches: [
    { asset: "Chiller B", hrs: 8, baht: 480_000, what: { en: "Condenser fouling caught 3 days early — fixed in a planned window, no line stop", th: "จับตะกรันคอนเดนเซอร์ได้ก่อนพัง 3 วัน — ซ่อมช่วงหยุดตามแผน ไลน์ไม่สะดุด" } },
    { asset: "Stamping Press 03", hrs: 4, baht: 240_000, what: { en: "Bearing vibration trend → early lubrication service, avoided a mid-shift stop", th: "เทรนด์ความสั่นแบริ่ง → เข้าหล่อลื่นก่อนกำหนด เลี่ยงหยุดกลางกะ" } },
    { asset: "Main Distribution", hrs: 2, baht: 140_000, what: { en: "Feeder overload forecast → load shifted before the breaker tripped", th: "คาดการณ์ฟีดเดอร์โอเวอร์โหลด → ย้ายโหลดก่อนเบรกเกอร์ทริป" } },
  ] as { asset: string; hrs: number; baht: number; what: TwinLZ }[],
};

/* ── Step 4 · AI Recommendation & Action — Zero-Invest vs Invest ──────────
   Part 1: the twin's autonomous actions (same numbers as twinActions) as
   quick wins with an AI-Auto toggle. Part 2: capital projects with a full
   BOM. Zero-invest ≈ ฿9.2M/yr · invest +฿3.18M/yr → grand ≈ ฿12.4M/yr. */

export type TwinQuickWinStatus = "running" | "pending" | "suggested";

export const twinQuickWins: {
  id: string;
  title: TwinLZ;
  asset: TwinLZ;
  how: TwinLZ;
  savingMo: number;
  savingYr: number;
  status: TwinQuickWinStatus;
  autoDefault: boolean;
}[] = [
  {
    id: "tqw-shed",
    title: { en: "Peak Load Shedding", th: "ปลดโหลดช่วงพีคอัตโนมัติ" },
    asset: { en: "Plant-wide · main incomer", th: "ทั้งโรงงาน · จุดรับไฟหลัก" },
    how: { en: "When demand nears the 3,000 kW ceiling the twin sheds non-critical loads by itself — no demand-charge penalty, no production impact.", th: "พอดีมานด์ใกล้เพดาน 3,000 kW ทวินจะปลดโหลดที่ไม่วิกฤตให้เอง — ไม่โดนค่าดีมานด์เพิ่ม และไม่กระทบการผลิต" },
    savingMo: 180_000,
    savingYr: 2_160_000,
    status: "running",
    autoDefault: true,
  },
  {
    id: "tqw-precool",
    title: { en: "Off-Peak Pre-Cooling", th: "ทำความเย็นล่วงหน้าช่วงออฟพีค" },
    asset: { en: "Chiller plant · chilled-water loop", th: "ห้อง Chiller · วงจรน้ำเย็น" },
    how: { en: "Chill water during the cheap off-peak tariff, then coast through the afternoon peak with the chillers throttled back.", th: "ทำน้ำเย็นตุนไว้ช่วงค่าไฟถูก แล้วผ่อนเครื่อง Chiller ตอนบ่ายที่ค่าไฟแพง" },
    savingMo: 95_000,
    savingYr: 1_140_000,
    status: "running",
    autoDefault: true,
  },
  {
    id: "tqw-standby",
    title: { en: "Idle Auto-Standby", th: "สแตนด์บายอัตโนมัติเมื่อเครื่องว่าง" },
    asset: { en: "All machines · PLC standby mode", th: "ทุกเครื่อง · โหมดสแตนด์บายผ่าน PLC" },
    how: { en: "Any machine idle for more than 15 minutes drops into standby by itself and wakes when the next lot arrives.", th: "เครื่องไหนว่างเกิน 15 นาที ระบบพาเข้าสแตนด์บายให้เอง แล้วปลุกกลับมาเมื่องานล็อตถัดไปมาถึง" },
    savingMo: 42_000,
    savingYr: 504_000,
    status: "suggested",
    autoDefault: false,
  },
  {
    id: "tqw-rebalance",
    title: { en: "Rebalance Line B lots to Line A", th: "ย้ายล็อตไลน์ B ไปไลน์ A" },
    asset: { en: "Line A + Line B · lot scheduling", th: "ไลน์ A + B · การจัดตารางผลิต" },
    how: { en: "Move changeover-heavy lots from Line B to Line A — cuts ~฿15k/day of changeover loss and lifts plant OEE ~4 pts.", th: "ย้ายล็อตที่เปลี่ยนรุ่นบ่อยจากไลน์ B ไปไลน์ A — ลดความเสียหายจากการเปลี่ยนรุ่น ~฿15k/วัน และดัน OEE โรงงานขึ้น ~4 จุด" },
    savingMo: 450_000,
    savingYr: 5_400_000,
    status: "pending",
    autoDefault: true,
  },
];

/** One BOM line on a twin capital project — item, qty, unit price. */
export type TwinBomLine = { item: TwinLZ; qty: number; unitPrice: number };

export const twinCapitalProjects: {
  id: string;
  code: string;
  title: TwinLZ;
  asset: TwinLZ;
  severity: "critical" | "warning" | "recommend";
  capex: number;
  benefitYr: number;
  paybackMo: number;
  riskAvoided?: number; // one-time failure cost this project prevents
  urgency?: TwinLZ; // shown when the clock is ticking (ties to chillerAnalysis.rulDays)
  why: TwinLZ;
  outcome: TwinLZ;
  bom: TwinBomLine[];
}[] = [
  {
    id: "twn-chiller",
    code: "TWN-01",
    title: { en: "Chiller B condenser overhaul + condition-monitoring kit", th: "ยกเครื่องคอนเดนเซอร์ Chiller B + ชุดเซนเซอร์เฝ้าดูสภาพ" },
    asset: { en: "Chiller B · shared cooling for Lines A + B", th: "Chiller B · คูลลิ่งร่วมของไลน์ A + B" },
    severity: "critical",
    capex: 185_000,
    benefitYr: 180_000,
    paybackMo: 1,
    riskAvoided: 3_500_000,
    urgency: { en: "act within ~3 days", th: "ต้องทำใน ~3 วัน" },
    why: { en: "Condenser fouling is choking heat rejection — vibration is in ISO zone D and the model gives ~3 days to a trip. A failure stops Lines A + B (~฿3.5M); the planned fix is a ฿85K service plus ฿100K of monitoring hardware.", th: "ตะกรันในคอนเดนเซอร์ทำให้ระบายความร้อนไม่ทัน — ความสั่นอยู่โซน D ตาม ISO และโมเดลให้เวลา ~3 วันก่อนเครื่องตัด ถ้าพังจริงไลน์ A + B หยุด (~฿3.5M) ส่วนค่าซ่อมตามแผนแค่ ฿85K บวกชุดเซนเซอร์อีก ฿100K" },
    outcome: { en: "Fixed in a planned window — the ฿3.5M stop never happens, the chiller draws ~15% less power (~฿180K/yr), and the sensor kit spots the next fouling episode weeks early.", th: "ซ่อมในช่วงหยุดตามแผน — เหตุพัง ฿3.5M ไม่เกิดขึ้น เครื่องกินไฟลดลง ~15% (~฿180K/ปี) และชุดเซนเซอร์จะเห็นตะกรันรอบหน้าล่วงหน้าหลายสัปดาห์" },
    bom: [
      { item: { en: "Condenser chemical clean + brush kit", th: "ชุดล้างเคมี + แปรงล้างคอนเดนเซอร์" }, qty: 1, unitPrice: 45_000 },
      { item: { en: "Gasket & seal replacement set", th: "ชุดปะเก็นและซีลใหม่" }, qty: 1, unitPrice: 12_000 },
      { item: { en: "Wireless vibration + temperature sensors", th: "เซนเซอร์ความสั่น + อุณหภูมิไร้สาย" }, qty: 4, unitPrice: 18_000 },
      { item: { en: "IoT gateway (Modbus / LoRa)", th: "IoT Gateway (Modbus / LoRa)" }, qty: 1, unitPrice: 28_000 },
      { item: { en: "Service labour · planned 2-day window", th: "ค่าแรงช่าง · หยุดตามแผน 2 วัน" }, qty: 1, unitPrice: 28_000 },
    ],
  },
  {
    id: "twn-smed",
    code: "TWN-02",
    title: { en: "Line B quick-changeover (SMED) kit", th: "ชุดเปลี่ยนรุ่นเร็ว (SMED) ไลน์ B" },
    asset: { en: "Line B · stamping & assembly changeover", th: "ไลน์ B · จุดเปลี่ยนรุ่นงานปั๊มและประกอบ" },
    severity: "warning",
    capex: 650_000,
    benefitYr: 1_800_000,
    paybackMo: 4.3,
    why: { en: "Line B loses ~45 minutes per changeover vs Line A's 12 — the twin prices that gap at ฿450K/mo of lost OEE. Rebalancing lots helps today, but the changeover itself is the root cause.", th: "ไลน์ B เสียเวลาเปลี่ยนรุ่นครั้งละ ~45 นาที เทียบกับ 12 นาทีของไลน์ A — ทวินตีมูลค่าช่องว่างนี้เป็น OEE ที่หายไป ฿450K/เดือน การย้ายล็อตช่วยได้วันนี้ แต่ต้นตอจริงคือขั้นตอนเปลี่ยนรุ่นเอง" },
    outcome: { en: "Changeover drops toward ~15 minutes — Line B recovers ~฿1.8M/yr of OEE and no longer needs lot-rebalancing as a crutch.", th: "เวลาเปลี่ยนรุ่นลดลงเหลือ ~15 นาที — ไลน์ B ได้ OEE คืน ~฿1.8M/ปี และไม่ต้องพึ่งการย้ายล็อตเป็นทางแก้ชั่วคราวอีก" },
    bom: [
      { item: { en: "Hydraulic die clamps", th: "ชุดแคลมป์แม่พิมพ์ไฮดรอลิก" }, qty: 8, unitPrice: 35_000 },
      { item: { en: "Die transfer cart", th: "รถเข็นย้ายแม่พิมพ์" }, qty: 1, unitPrice: 150_000 },
      { item: { en: "Standardized tooling plates", th: "เพลททูลลิ่งมาตรฐานเดียวกัน" }, qty: 4, unitPrice: 30_000 },
      { item: { en: "Andon light kit", th: "ชุดไฟ Andon" }, qty: 1, unitPrice: 40_000 },
      { item: { en: "SMED training · 2 shifts", th: "อบรม SMED · 2 กะ" }, qty: 1, unitPrice: 60_000 },
    ],
  },
  {
    id: "twn-sensors",
    code: "TWN-03",
    title: { en: "Sensor coverage expansion — 6 unmonitored assets", th: "ขยายเซนเซอร์ให้ 6 เครื่องที่ AI ยังมองไม่เห็น" },
    asset: { en: "Paint shop · welders · pumps (6 assets)", th: "ห้องพ่นสี · เครื่องเชื่อม · ปั๊ม (6 เครื่อง)" },
    severity: "recommend",
    capex: 420_000,
    benefitYr: 1_200_000,
    paybackMo: 4.2,
    why: { en: "Six assets still have no vibration or current sensing, so the AI cannot predict their failures — this blind spot caused 2 of last quarter's 3 surprise stops.", th: "ยังมี 6 เครื่องที่ไม่มีเซนเซอร์ความสั่นหรือกระแส AI จึงคาดการณ์การพังไม่ได้ — จุดบอดนี้เป็นเหตุให้ไตรมาสก่อนมีหยุดกะทันหัน 2 จาก 3 ครั้ง" },
    outcome: { en: "AI prediction covers 100% of the fleet — ~฿1.2M/yr of surprise downtime becomes planned maintenance instead.", th: "AI คาดการณ์ครอบคลุม 100% ของเครื่องจักร — ดาวน์ไทม์กะทันหัน ~฿1.2M/ปี กลายเป็นงานซ่อมตามแผนแทน" },
    bom: [
      { item: { en: "Wireless vibration sensors", th: "เซนเซอร์ความสั่นไร้สาย" }, qty: 6, unitPrice: 32_000 },
      { item: { en: "Current transducers", th: "ทรานสดิวเซอร์วัดกระแส" }, qty: 6, unitPrice: 15_000 },
      { item: { en: "IoT gateway", th: "IoT Gateway" }, qty: 1, unitPrice: 48_000 },
      { item: { en: "Installation & commissioning", th: "ค่าติดตั้ง & คอมมิชชัน" }, qty: 1, unitPrice: 90_000 },
    ],
  },
];
