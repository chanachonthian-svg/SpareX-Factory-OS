/** VisionIQ™ — AI Vision Intelligence Platform.
 *  "From visual inspection to business intelligence."
 *
 *  Shared framework across every SpareX product: Overview → Monitor → Analyze → Act → Report.
 *  Analyze is the flagship — the AI that turns a detected defect into a root cause, a hidden
 *  ฿ cost, a correlated business impact, and a simulated fix.
 *
 *  All quality metrics derive from one defect ledger so the numbers stay coherent. */

export type LZ = { en: string; th: string };

/* ── defect ledger (today) — one source of truth ─────────────────────────── */
export type Defect = {
  id: string; name: LZ; count: number;
  scrapRate: number;   // share scrapped vs reworked
  unitCost: number;    // ฿ to scrap one unit
  reworkCost: number;  // ฿ to rework one unit
  line: string; machineId: string; machine: string;
};
export const defects: Defect[] = [
  { id: "dim", name: { en: "Dimensional deviation", th: "ขนาดคลาดเคลื่อน" }, count: 128, scrapRate: 0.35, unitCost: 180, reworkCost: 45, line: "Line B", machineId: "press-03", machine: "Stamping Press 03" },
  { id: "scratch", name: { en: "Surface scratch", th: "รอยขีดข่วนผิว" }, count: 96, scrapRate: 0.15, unitCost: 140, reworkCost: 30, line: "Line C", machineId: "paint-14", machine: "Paint Booth 14" },
  { id: "paint", name: { en: "Paint run / sag", th: "สีย้อย / สีไหล" }, count: 54, scrapRate: 0.20, unitCost: 150, reworkCost: 35, line: "Line C", machineId: "paint-14", machine: "Paint Booth 14" },
  { id: "weld", name: { en: "Weld porosity", th: "รูพรุนแนวเชื่อม" }, count: 38, scrapRate: 0.60, unitCost: 220, reworkCost: 60, line: "Line B", machineId: "weld-04", machine: "Weld Robot 04" },
  { id: "assembly", name: { en: "Assembly misfit", th: "ประกอบไม่เข้า" }, count: 32, scrapRate: 0.10, unitCost: 120, reworkCost: 25, line: "Line C", machineId: "assy-13", machine: "Assembly Cell 13" },
  { id: "contam", name: { en: "Contamination", th: "สิ่งปนเปื้อน" }, count: 18, scrapRate: 0.50, unitCost: 160, reworkCost: 40, line: "Line A", machineId: "cnc-01", machine: "CNC Cell 01" },
  { id: "shortshot", name: { en: "Short shot", th: "ฉีดไม่เต็ม" }, count: 14, scrapRate: 0.70, unitCost: 200, reworkCost: 0, line: "Line C", machineId: "inj-08", machine: "Injection Mold 08" },
];

export const scrapUnits = (d: Defect) => Math.round(d.count * d.scrapRate);
export const reworkUnits = (d: Defect) => d.count - scrapUnits(d);
export const scrapCost = (d: Defect) => scrapUnits(d) * d.unitCost;
export const reworkCost = (d: Defect) => reworkUnits(d) * d.reworkCost;
export const defectCost = (d: Defect) => scrapCost(d) + reworkCost(d);

/* ── COPQ · cost of poor quality (the Invisible Cost Detector) ────────────── */
const INSPECTION_COST = 15_000;  // fixed overhead / day
const QUALITY_DOWNTIME_COST = 16_000; // quality holds / day
const CLAIM_COST = 12_000;      // amortised customer-claim reserve / day
export const copq = (() => {
  const scrap = defects.reduce((s, d) => s + scrapCost(d), 0);
  const rework = defects.reduce((s, d) => s + reworkCost(d), 0);
  const today = scrap + rework + INSPECTION_COST + QUALITY_DOWNTIME_COST + CLAIM_COST;
  const visible = scrap;                 // what finance normally books
  const invisible = today - visible;     // rework + inspection + downtime + claims — the hidden part
  return { scrap, rework, inspection: INSPECTION_COST, downtime: QUALITY_DOWNTIME_COST, claim: CLAIM_COST, today, visible, invisible, yr: today * 300 };
})();
export const copqBreakdown: { label: LZ; value: number; visible: boolean }[] = [
  { label: { en: "Scrap", th: "ของเสียทิ้ง" }, value: copq.scrap, visible: true },
  { label: { en: "Rework", th: "งานแก้ไข" }, value: copq.rework, visible: false },
  { label: { en: "Inspection overhead", th: "ต้นทุนการตรวจ" }, value: copq.inspection, visible: false },
  { label: { en: "Quality downtime", th: "หยุดสายจากคุณภาพ" }, value: copq.downtime, visible: false },
  { label: { en: "Customer claims", th: "เคลมลูกค้า" }, value: copq.claim, visible: false },
];

/* ── headline quality metrics ─────────────────────────────────────────────── */
export const inspectedToday = 42_180;
export const defectsToday = defects.reduce((s, d) => s + d.count, 0);
export const fpy = Math.round((1 - defectsToday / inspectedToday) * 1000) / 10; // First Pass Yield %
export const defectRatePpm = Math.round((defectsToday / inspectedToday) * 1_000_000);
export const modelConfidence = 99.4;
export const escapes = 0;
export const daysClean = 14;
const invisibleShare = copq.invisible / copq.today;
export const qualityHealthScore = Math.round(Math.max(0, Math.min(100, 100 - defectRatePpm / 1000 * 1.5 - invisibleShare * 10)));
export const revenueAtRisk = 1_900_000; // customer-facing exposure surfaced by the correlation engine

/* ── cameras / inspection stations ────────────────────────────────────────── */
export type Station = { id: string; name: LZ; line: string; fps: number; acc: number; status: "ok" | "warn"; defectId: string };
/** The plant's ONE AI inspection gate: every finished part passes the V-B1 cell,
 *  3 synchronized OMRON STC-HD213DV cameras see it from top / left / right, and the
 *  AI attributes each defect back to its source machine (press, paint booth, …). */
export const stations: Station[] = [
  { id: "V-B1-T", name: { en: "AI QC gate · top", th: "ด่านตรวจ AI · บน" }, line: "Final QC", fps: 60, acc: 99.1, status: "warn", defectId: "dim" },
  { id: "V-B1-L", name: { en: "AI QC gate · left", th: "ด่านตรวจ AI · ซ้าย" }, line: "Final QC", fps: 60, acc: 99.4, status: "ok", defectId: "scratch" },
  { id: "V-B1-R", name: { en: "AI QC gate · right", th: "ด่านตรวจ AI · ขวา" }, line: "Final QC", fps: 60, acc: 99.6, status: "ok", defectId: "weld" },
];

/* ── V-B1 AI QC gate — 3× OMRON STC-HD213DV (top/left/right), the plant's only cell ── */
export const CAMERA_MODEL = "OMRON STC-HD213DV";
export const CAMERA_SPEC = { sensor: '1/3" CMOS', res: "1920×1080", mp: 2.1, fps: 60, iface: "HD-SDI / DVI-D", mount: "C-mount" };
export type RigAngle = "top" | "left" | "right";
export type RigCam = { id: string; angle: RigAngle; pos: LZ; fps: number; acc: number; check: LZ; finding: { label: string; conf: number } | null };
export const cameraRig: RigCam[] = [
  { id: "V-B1-T", angle: "top", pos: { en: "Top", th: "บน" }, fps: 60, acc: 99.1, check: { en: "Dimensional · width / length", th: "ตรวจขนาด · กว้าง / ยาว" }, finding: { label: "DIM +0.31mm", conf: 99.1 } },
  { id: "V-B1-L", angle: "left", pos: { en: "Left", th: "ซ้าย" }, fps: 60, acc: 99.4, check: { en: "Left edge · burr / flatness", th: "ขอบซ้าย · ครีบ / ความเรียบ" }, finding: null },
  { id: "V-B1-R", angle: "right", pos: { en: "Right", th: "ขวา" }, fps: 60, acc: 99.6, check: { en: "Right edge · burr / flatness", th: "ขอบขวา · ครีบ / ความเรียบ" }, finding: null },
];

/* ── overview health rollups ──────────────────────────────────────────────── */
/** How trustworthy the inspection system ITSELF is — cameras + the AI that judges.
 *  30% camera availability · 40% average camera accuracy · 30% AI confidence. */
export const inspectionHealth = (() => {
  const ok = stations.filter((s) => s.status === "ok").length;
  const avgAcc = Math.round((stations.reduce((s, x) => s + x.acc, 0) / stations.length) * 10) / 10;
  const score = Math.round((ok / stations.length) * 100 * 0.3 + avgAcc * 0.4 + modelConfidence * 0.3);
  return { score, okCams: ok, totalCams: stations.length, avgAcc };
})();

/** Line-by-line health, graded by today's defect money from the ledger. */
export const lineHealth = ["Line A", "Line B", "Line C"].map((line) => {
  const ds = defects.filter((d) => d.line === line);
  const count = ds.reduce((s, d) => s + d.count, 0);
  const costTHB = ds.reduce((s, d) => s + defectCost(d), 0);
  const tone: "ok" | "warn" | "crit" = costTHB > 15_000 ? "crit" : costTHB > 5_000 ? "warn" : "ok";
  return { line, count, costTHB, tone };
});

/* ── live detection feed ──────────────────────────────────────────────────── */
export const detections: { at: string; station: string; defect: LZ; conf: number; action: LZ; reject: boolean }[] = [
  { at: "10:42", station: "V-B1-T", defect: { en: "Dimensional +0.31mm", th: "ขนาด +0.31mm" }, conf: 99.1, action: { en: "Rejected", th: "คัดออก" }, reject: true },
  { at: "10:38", station: "V-B1-L", defect: { en: "Paint run", th: "สีย้อย" }, conf: 96.4, action: { en: "Diverted to rework", th: "ส่งแก้ไข" }, reject: false },
  { at: "10:31", station: "V-B1-T", defect: { en: "Contamination", th: "สิ่งปนเปื้อน" }, conf: 97.8, action: { en: "Rejected", th: "คัดออก" }, reject: true },
  { at: "10:22", station: "V-B1-R", defect: { en: "Weld porosity", th: "รูพรุนแนวเชื่อม" }, conf: 99.3, action: { en: "Rejected · alarm", th: "คัดออก · แจ้งเตือน" }, reject: true },
  { at: "10:07", station: "V-B1-R", defect: { en: "Surface scratch", th: "รอยขีดข่วน" }, conf: 98.2, action: { en: "Diverted to rework", th: "ส่งแก้ไข" }, reject: false },
];

/* ── slices for Monitor (defect by …) ─────────────────────────────────────── */
const sum = (arr: { count: number }[]) => arr.reduce((s, x) => s + x.count, 0);
export const defectByMachine = (() => {
  const m: Record<string, { machine: string; count: number }> = {};
  defects.forEach((d) => { (m[d.machine] ??= { machine: d.machine, count: 0 }).count += d.count; });
  return Object.values(m).sort((a, b) => b.count - a.count);
})();
export const defectByLine = (() => {
  const m: Record<string, number> = {};
  defects.forEach((d) => { m[d.line] = (m[d.line] ?? 0) + d.count; });
  return Object.entries(m).map(([line, count]) => ({ line, count })).sort((a, b) => b.count - a.count);
})();
export const defectByShift = [
  { shift: { en: "Day A", th: "กะเช้า A" }, count: 74 },
  { shift: { en: "Day B", th: "กะเช้า B" }, count: 88 },
  { shift: { en: "Night A", th: "กะดึก A" }, count: 96 },
  { shift: { en: "Night B", th: "กะดึก B" }, count: 122 },
];
export const defectByProduct = [
  { product: "Model B", count: 158 }, { product: "Model A", count: 96 },
  { product: "Model D", count: 78 }, { product: "Model C", count: 48 },
];
/** heatmap: defect class × line intensity (0..1) */
export const heatmap = (() => {
  const lines = ["Line A", "Line B", "Line C"];
  const max = Math.max(...defects.map((d) => d.count));
  return defects.map((d) => ({
    defect: d.name,
    cells: lines.map((ln) => ({ line: ln, v: ln === d.line ? d.count / max : d.count / max * (ln === "Line A" ? 0.08 : 0.14) })),
  }));
})();

/* ══════════════════ ANALYZE — the flagship AI layer ══════════════════ */

/* Every defect found today gets its own root-cause analysis — Phase-1 method:
 * camera timestamps × shift / model / production schedule. Confidence <70% must be
 * presented as uncertain (verify on-site first). */
export type RootCause = { defectId: string; confidence: number; cause: LZ; evidence: LZ[]; riskTHB: number; fix: { label: LZ; cost: number }; chain: LZ[] /* details for: defect · time/shift · model · source */ };
export const rootCauses: RootCause[] = [
  {
    defectId: "dim", confidence: 82,
    riskTHB: 1_900_000,
    fix: { label: { en: "Regrind & shim the Press 03 die", th: "เจียรดาย Press 03 + ปรับชิม" }, cost: 85_000 },
    chain: [
      { en: "Parts measure +0.3mm over spec", th: "ชิ้นงานใหญ่เกินสเปก +0.3mm" },
      { en: "Mostly night shift B — defect rate 2.1× the morning shift", th: "เกิดกะดึก B มากสุด — อัตราของเสียเป็น 2.1 เท่าของกะเช้า" },
      { en: "Clusters on Model B, right after changeovers", th: "กระจุกที่ Model B ช่วงหลังเปลี่ยนรุ่น" },
      { en: "Only while Stamping Press 03 runs — fits a worn die", th: "เกิดเฉพาะช่วง Stamping Press 03 เดินเครื่อง — เข้าเค้าดายสึก" },
    ],
    cause: { en: "The die on Stamping Press 03 is wearing out — parts keep growing past spec", th: "ดายของ Stamping Press 03 เริ่มสึก — ชิ้นงานเลยค่อยๆ ใหญ่เกินสเปก" },
    evidence: [
      { en: "The camera measures every single part in mm", th: "กล้องวัดขนาดจริงทุกชิ้นที่ผลิต" },
      { en: "Parts keep growing little by little: +0.07 → +0.31mm — the longer the run, the worse it gets", th: "ชิ้นงานค่อยๆ ใหญ่ขึ้นทีละนิด +0.07 → +0.31mm ยิ่งผลิตนาน ยิ่งเกินสเปก" },
      { en: "Other causes don't fit: a bad setup is wrong from part #1 · bad material jumps up and down", th: "สาเหตุอื่นไม่เข้าเค้า: ตั้งเครื่องผิดจะผิดตั้งแต่ชิ้นแรก · วัตถุดิบไม่ดีค่าจะเดี๋ยวขึ้นเดี๋ยวลง" },
      { en: "That leaves one culprit — a worn die. AI is 82% sure; the technician opens the die to confirm", th: "เหลือผู้ต้องสงสัยเดียวคือดายสึก — AI มั่นใจ 82% ที่เหลือให้ช่างเปิดดายยืนยัน" },
    ],
  },
  {
    defectId: "weld", confidence: 71,
    riskTHB: 1_500_000,
    fix: { label: { en: "Clean the gas nozzle + check the gas line", th: "ล้างหัวฉีดแก๊ส + เช็คไลน์แก๊ส" }, cost: 18_000 },
    chain: [
      { en: "Pores found inside the weld seam", th: "แนวเชื่อมมีรูพรุนข้างใน" },
      { en: "Spikes at morning-shift start — when the gas line reopens", th: "เกิดถี่ช่วงเริ่มกะเช้า — จังหวะเปิดไลน์แก๊สใหม่พอดี" },
      { en: "Every model equally — the model is not the cause", th: "เกิดทุกรุ่นพอๆ กัน — รุ่นไม่ใช่สาเหตุ" },
      { en: "From Weld Robot 04 — its gas nozzle is clogging up", th: "มาจาก Weld Robot 04 — หัวฉีดแก๊สเริ่มอุดตัน" },
    ],
    cause: { en: "Shielding gas on Weld Robot 04 is flowing unevenly — air sneaks into the weld", th: "แก๊สปกป้องแนวเชื่อมของ Weld Robot 04 ไหลไม่นิ่ง — อากาศเลยแทรกเข้าแนวเชื่อม" },
    evidence: [
      { en: "Pores cluster at the same spot of the weld — points at the torch, not the part", th: "รูพรุนกระจุกตำแหน่งเดิมของแนวเชื่อม — ชี้ไปที่หัวเชื่อม ไม่ใช่ชิ้นงาน" },
      { en: "Happens most at the start of the morning shift — right when the gas line reopens", th: "เกิดถี่ช่วงเริ่มกะเช้า — ตรงกับจังหวะเปิดไลน์แก๊สใหม่พอดี" },
      { en: "Slowly getting more frequent all month — consistent with a clogging gas nozzle", th: "ถี่ขึ้นช้าๆ ทั้งเดือน — เข้าเค้าหัวฉีดแก๊สเริ่มอุดตัน" },
    ],
  },
  {
    defectId: "scratch", confidence: 64,
    riskTHB: 620_000,
    fix: { label: { en: "Pad the conveyor rail + add spacers", th: "บุรางกันกระแทก + เพิ่มตัวคั่น" }, cost: 22_000 },
    chain: [
      { en: "Scratches on the part surface", th: "ผิวชิ้นงานมีรอยขีดข่วน" },
      { en: "Every shift equally — but worse when production speeds up", th: "เกิดทุกกะพอๆ กัน — แต่หนักขึ้นช่วงเร่งผลิต" },
      { en: "Every model gets them — the model is not the cause", th: "โดนทุกรุ่นเหมือนกัน — รุ่นไม่ใช่สาเหตุ" },
      { en: "Suspect: the conveyor before Paint Booth 14 — parts rub at the same spot", th: "จุดต้องสงสัย: รางลำเลียงก่อนเข้า Paint Booth 14 — ชิ้นงานเสียดสีจุดเดิม" },
    ],
    cause: { en: "Parts likely rub against each other on the conveyor before painting", th: "ชิ้นงานน่าจะเสียดสีกันบนรางลำเลียงช่วงก่อนเข้าพ่นสี" },
    evidence: [
      { en: "Scratches sit at nearly the same spot on every part — a repeating contact point, not bad luck", th: "รอยอยู่ตำแหน่งใกล้กันแทบทุกชิ้น — ชี้ว่ามีจุดสัมผัสเดิมซ้ำๆ ไม่ใช่ความบังเอิญ" },
      { en: "Every shift and every model gets them equally — rules out people and machines", th: "เกิดพอๆ กันทุกกะ ทุกรุ่น — ตัดเรื่องฝีมือคนและตัวเครื่องออกได้" },
      { en: "Worst when production speeds up — parts crowd the rail and touch", th: "หนักขึ้นช่วงเร่งกำลังผลิต — ชิ้นงานแน่นรางจนเบียดกัน" },
    ],
  },
  {
    defectId: "paint", confidence: 78,
    riskTHB: 540_000,
    fix: { label: { en: "Change the filter + restore airflow", th: "เปลี่ยนไส้กรอง + คืนลมดูด" }, cost: 35_000 },
    chain: [
      { en: "Paint sags into runs on the surface", th: "สีไหลย้อยเป็นทางบนผิวงาน" },
      { en: "Rising slowly all month — every shift sees the same", th: "ค่อยๆ เพิ่มขึ้นทั้งเดือน — กะไหนก็เจอเท่ากัน" },
      { en: "Every model that gets painted", th: "โดนทุกรุ่นที่ผ่านการพ่นสี" },
      { en: "From Paint Booth 14 — exhaust down 11%, so paint dries slower", th: "มาจาก Paint Booth 14 — ลมดูดอ่อนลง 11% สีเลยแห้งช้า" },
    ],
    cause: { en: "Paint Booth 14's exhaust is getting weak — paint dries slower and sags", th: "ลมดูดไอเสียของ Paint Booth 14 อ่อนลง — สีเลยแห้งช้าและไหลย้อย" },
    evidence: [
      { en: "Paint runs increased in step with the airflow dropping 11% this month", th: "สีย้อยเพิ่มขึ้นสอดคล้องกับลมดูดที่อ่อนลง 11% ในเดือนนี้" },
      { en: "Only happens while Paint Booth 14 runs — shift and model make no difference", th: "เกิดเฉพาะช่วงที่ Paint Booth 14 เดิน — กะและรุ่นไม่มีผล" },
      { en: "Last time the filter was changed, this vanished overnight — the same pattern is repeating", th: "ครั้งก่อนเปลี่ยนไส้กรองแล้วอาการหายทันที — รูปแบบเดิมกำลังวนกลับมา" },
    ],
  },
  {
    defectId: "shortshot", confidence: 74,
    riskTHB: 380_000,
    fix: { label: { en: "Enforce the warm-up step before shooting", th: "ล็อกขั้นตอนอุ่นเครื่องก่อนฉีด" }, cost: 8_000 },
    chain: [
      { en: "Plastic doesn't fill the mold completely", th: "พลาสติกฉีดไม่เต็มแม่พิมพ์" },
      { en: "Only the first ~40 min of every shift — then it stops by itself", th: "เกิดเฉพาะ ~40 นาทีแรกของทุกกะ แล้วหายไปเอง" },
      { en: "Thick-walled models hit hardest", th: "รุ่นผนังหนาเจอหนักสุด" },
      { en: "From Injection Mold 08 — it shoots before reaching temperature", th: "มาจาก Injection Mold 08 — ฉีดตอนเครื่องยังไม่ร้อนพอ" },
    ],
    cause: { en: "Injection Mold 08 shoots before it reaches temperature — plastic can't fill the mold", th: "Injection Mold 08 ฉีดตอนเครื่องยังไม่ร้อนถึงอุณหภูมิ — พลาสติกเลยวิ่งไม่เต็มแม่พิมพ์" },
    evidence: [
      { en: "Comes in a burst during the first ~40 min of every shift, then disappears", th: "เกิดเป็นชุดใน ~40 นาทีแรกของทุกกะ แล้วหายไปเอง" },
      { en: "That window matches the machine warm-up exactly — once hot, no more short shots", th: "ช่วงเวลานั้นตรงกับตอนอุ่นเครื่องพอดี — เครื่องร้อนแล้วไม่เกิดอีก" },
      { en: "Same on every shift — the operator is not the variable", th: "ทุกกะเหมือนกันหมด — ไม่เกี่ยวกับคนคุมเครื่อง" },
    ],
  },
  {
    defectId: "contam", confidence: 66,
    riskTHB: 450_000,
    fix: { label: { en: "Shorten the coolant cycle + air-blow parts", th: "ร่นรอบน้ำหล่อเย็น + เป่าลมก่อนส่งต่อ" }, cost: 15_000 },
    chain: [
      { en: "Shiny metal specks stuck on the surface", th: "มีเศษโลหะเงาๆ ติดบนผิวงาน" },
      { en: "Worse late in the week — right as the coolant change comes due", th: "หนักช่วงท้ายสัปดาห์ — ใกล้รอบเปลี่ยนน้ำหล่อเย็นพอดี" },
      { en: "Only on parts that went through machining", th: "เจอเฉพาะชิ้นที่ผ่านงานกลึงเท่านั้น" },
      { en: "From CNC Cell 01 — machining chips ride along on the part", th: "มาจาก CNC Cell 01 — เศษกลึงติดชิ้นงานมาถึงด่านตรวจ" },
    ],
    cause: { en: "Machining chips from CNC Cell 01 likely ride along on the part to the gate", th: "เศษกลึงจาก CNC Cell 01 น่าจะติดชิ้นงานมาจนถึงด่านตรวจ" },
    evidence: [
      { en: "Found only on parts that passed CNC Cell 01", th: "เจอเฉพาะชิ้นที่ผ่าน CNC Cell 01 เท่านั้น" },
      { en: "Gets worse late in the week — right as the coolant change comes due", th: "หนักขึ้นช่วงท้ายสัปดาห์ — ตรงกับรอบน้ำหล่อเย็นใกล้ครบกำหนดเปลี่ยน" },
      { en: "The specks are shiny metal — the same look as machining chips", th: "สิ่งปนเปื้อนเป็นโลหะเงา — หน้าตาเดียวกับเศษกลึง" },
    ],
  },
  {
    defectId: "assembly", confidence: 58,
    riskTHB: 300_000,
    fix: { label: { en: "Hold the parts lot + measure incoming", th: "กักล็อตชิ้นส่วน + วัดขนาดขาเข้า" }, cost: 12_000 },
    chain: [
      { en: "Mating parts don't fit together properly", th: "ชิ้นส่วนประกบกันไม่สนิท" },
      { en: "Started the same week the new parts lot arrived", th: "เริ่มเกิดสัปดาห์เดียวกับที่ล็อตชิ้นส่วนใหม่เข้ามา" },
      { en: "Almost all on Model D — other models barely see it", th: "เกิดกับ Model D แทบทั้งหมด — รุ่นอื่นแทบไม่เจอ" },
      { en: "Source: the new lot of mating parts is slightly off-size", th: "ต้นตอ: ชิ้นส่วนคู่ประกบล็อตใหม่ ขนาดคลาดจากเดิม" },
    ],
    cause: { en: "A new lot of mating parts is probably slightly off-size", th: "ชิ้นส่วนคู่ประกบล็อตใหม่น่าจะขนาดคลาดจากเดิมเล็กน้อย" },
    evidence: [
      { en: "Almost all of it is on Model D — other models barely see it", th: "เกิดกับรุ่น Model D แทบทั้งหมด — รุ่นอื่นแทบไม่เจอ" },
      { en: "Started the same week the new parts lot arrived", th: "เริ่มโผล่สัปดาห์เดียวกับที่ชิ้นส่วนล็อตใหม่เข้ามาพอดี" },
      { en: "Every shift sees the same rate — assembly skill is not the cause", th: "ทุกกะเจอเท่าๆ กัน — ไม่ใช่เรื่องฝีมือประกอบ" },
    ],
  },
];

/** per-part deviation measured by the top camera through the current Press 03 run —
 *  the monotonic creep IS the die-wear evidence the AI reasons from. */
export const dimDrift = { toleranceMm: 0.25, points: [0.07, 0.08, 0.10, 0.11, 0.13, 0.14, 0.16, 0.19, 0.21, 0.22, 0.24, 0.26, 0.29, 0.31] };

/* AI Business-Impact Correlation.
 * Phase 1 (live) needs NOTHING beyond the cameras: every photo carries a timestamp,
 * joined against data every plant already has — shift roster, product model, production
 * schedule. Phase 2 factors stay locked until the extra system is connected (the upsell). */
export type Correlation = { factor: LZ; strength: number; finding: LZ; link?: string; phase: 1 | 2; needs?: LZ };
export const correlations: Correlation[] = [
  { phase: 1, factor: { en: "Machine (from schedule)", th: "เครื่องจักร (จากตารางผลิต)" }, strength: 0.82, finding: { en: "78% of the bad parts happen while Stamping Press 03 is running", th: "ดีเฟกต์เรื่องขนาด 78% เกิดตอนที่ Stamping Press 03 กำลังเดินเครื่อง" }, link: "press-03" },
  { phase: 1, factor: { en: "Shift", th: "กะทำงาน" }, strength: 0.64, finding: { en: "Night shift B makes 2.1× more defects than the day shift", th: "กะดึก B ทำดีเฟกต์มากกว่ากะเช้า 2.1 เท่า" } },
  { phase: 1, factor: { en: "Product model", th: "รุ่นที่ผลิต" }, strength: 0.58, finding: { en: "Almost half of all defects (42%) are on Model B", th: "เกือบครึ่งของดีเฟกต์ทั้งหมด (42%) มาจากรุ่น Model B" } },
  { phase: 1, factor: { en: "Changeover", th: "การเปลี่ยนรุ่น" }, strength: 0.55, finding: { en: "Defects mostly show up in the first 30 min after a model change", th: "ดีเฟกต์มักโผล่ช่วง 30 นาทีแรกหลังเปลี่ยนรุ่น" } },
  { phase: 2, factor: { en: "Material lot", th: "ล็อตวัตถุดิบ" }, strength: 0, finding: { en: "Link defects to the exact coil lot being fed", th: "โยงดีเฟกต์ถึงล็อตคอยล์ที่ป้อนอยู่ตอนนั้น" }, needs: { en: "scan the lot when loading it (WMS/ERP)", th: "สแกน lot วัตถุดิบตอนโหลดเข้าเครื่อง (WMS/ERP)" } },
  { phase: 2, factor: { en: "Supplier", th: "ซัพพลายเออร์" }, strength: 0, finding: { en: "See which supplier's material fails more often", th: "เห็นว่าวัตถุดิบของเจ้าไหนทำของเสียบ่อยกว่า" }, needs: { en: "supplier record per incoming lot (ERP / incoming QC)", th: "ข้อมูลซัพพลายเออร์ต่อล็อตขาเข้า (ERP / QC ขาเข้า)" } },
  { phase: 2, factor: { en: "Operator / setup", th: "พนักงาน / เซ็ตอัพ" }, strength: 0, finding: { en: "Catch skipped setup verification", th: "จับการข้ามขั้นตอนตรวจเซ็ตอัพ" }, needs: { en: "a digital setup checklist (MES)", th: "เช็คลิสต์เซ็ตอัพแบบดิจิทัล (MES)" } },
  { phase: 2, factor: { en: "Tool wear", th: "การสึกของทูล" }, strength: 0, finding: { en: "See how many strokes before defects start", th: "ดูว่าปั๊มไปกี่ครั้งแล้วดีเฟกต์เริ่มมา" }, needs: { en: "stroke counter from the machine (PLC)", th: "ต่อตัวนับจำนวนปั๊มจากเครื่อง (PLC)" } },
  { phase: 2, factor: { en: "Environment (temp · humidity)", th: "สภาพแวดล้อม (อุณหภูมิ · ความชื้น)" }, strength: 0, finding: { en: "Match paint defects with booth temperature and humidity", th: "จับคู่ดีเฟกต์งานสีกับอุณหภูมิ-ความชื้นในห้องพ่น" }, needs: { en: "IoT environment sensors on the line", th: "เซ็นเซอร์วัดสภาพแวดล้อมที่ไลน์ (IoT)" } },
  { phase: 2, factor: { en: "PLC parameters", th: "พารามิเตอร์ PLC" }, strength: 0, finding: { en: "Correlate tonnage, temperature and cycle time with every defect", th: "เทียบแรงกด อุณหภูมิ รอบเวลาของเครื่อง กับดีเฟกต์ทุกชิ้น" }, needs: { en: "machine data via SpareX Connect (OPC-UA)", th: "ข้อมูลเครื่องผ่าน SpareX Connect (OPC-UA)" } },
  { phase: 2, factor: { en: "Customer claims", th: "เคลมลูกค้า" }, strength: 0, finding: { en: "Tie escapes to real customer claims", th: "โยงของหลุดกับเคลมลูกค้าจริง" }, needs: { en: "claims / CRM integration", th: "เชื่อมระบบเคลม / CRM" } },
];

/* Defect Pattern Intelligence — patterns AI reads from photos + time-stamps alone (no extra systems needed).
 * Each pattern is a behaviour signature that narrows the suspect list before anyone walks the floor. */
export type DefectPattern = { kind: LZ; defectId: string; title: LZ; detail: LZ };
export const defectPatterns: DefectPattern[] = [
  { kind: { en: "Repeat position", th: "ตำแหน่งซ้ำ" }, defectId: "paint", title: { en: "68% of paint runs land on the same lower-left corner", th: "สีย้อย 68% เกิดที่มุมล่างซ้ายของชิ้นงาน ตำแหน่งเดิมซ้ำๆ" }, detail: { en: "a defect that keeps hitting one spot points at one nozzle — not the whole booth", th: "ดีเฟกต์ที่ลงจุดเดิมตลอดชี้ว่าหัวพ่นตัวใดตัวหนึ่งผิดปกติ ไม่ใช่ทั้งห้องพ่น" } },
  { kind: { en: "Comes in bursts", th: "มาเป็นชุด" }, defectId: "scratch", title: { en: "Scratches arrive in runs of 4–6 consecutive parts", th: "รอยขีดข่วนมาเป็นชุด 4–6 ชิ้นติดกัน แล้วหายไปเอง" }, detail: { en: "consistent with debris caught in the fixture — it scratches every part until it drops out", th: "เข้าเค้าว่ามีเศษโลหะค้างในตัวจับชิ้นงาน — ขูดทุกชิ้นจนกว่าเศษจะหลุด" } },
  { kind: { en: "Steady climb", th: "ไต่ขึ้นเรื่อยๆ" }, defectId: "dim", title: { en: "Oversize grows in a straight line with running hours", th: "ขนาดเกินสเปกโตเป็นเส้นตรงตามชั่วโมงเดินเครื่อง" }, detail: { en: "a straight-line drift is the signature of cumulative wear — not a one-off event", th: "กราฟที่ไต่เป็นเส้นตรงคือลายเซ็นของการสึกสะสม ไม่ใช่เหตุการณ์ครั้งเดียว" } },
  { kind: { en: "After changeover", th: "หลังเปลี่ยนรุ่น" }, defectId: "assembly", title: { en: "Assembly defects cluster in the first 30 min after a model change", th: "งานประกอบพลาดกระจุกช่วง 30 นาทีแรกหลังเปลี่ยนรุ่น" }, detail: { en: "points at the setup routine, not the machine — a checklist fixes this cheaper than new hardware", th: "ชี้ไปที่ขั้นตอนเซ็ตอัพ ไม่ใช่ตัวเครื่อง — เช็คลิสต์แก้ได้ถูกกว่าซื้ออุปกรณ์ใหม่" } },
];

/* Similar Defect Search — today's defect photos matched against the labelled photo library.
 * The value: the plant's own history answers "we've seen this before — here's what fixed it". */
export type SimilarCase = { when: LZ; similarity: number; cause: LZ; outcome: LZ };
export const similarCases: Record<string, SimilarCase[]> = {
  dim: [
    { when: { en: "Mar 2026", th: "มี.ค. 2026" }, similarity: 94, cause: { en: "same die, previous wear cycle", th: "ดายชุดเดิม รอบสึกครั้งก่อน" }, outcome: { en: "replaced the die insert — defect gone within one shift", th: "เปลี่ยน insert ดาย — ดีเฟกต์หายภายใน 1 กะ" } },
    { when: { en: "Nov 2025", th: "พ.ย. 2025" }, similarity: 81, cause: { en: "loose die clamping", th: "ตัวยึดดายหลวม" }, outcome: { en: "re-torqued the clamps — solved the same day", th: "ขันทอร์กตัวยึดใหม่ — จบภายในวันเดียว" } },
  ],
  scratch: [
    { when: { en: "Apr 2026", th: "เม.ย. 2026" }, similarity: 91, cause: { en: "metal debris stuck in the fixture", th: "เศษโลหะค้างในตัวจับชิ้นงาน" }, outcome: { en: "added an air-blow cleaning step — scratches down 90%", th: "เพิ่มรอบเป่าลมทำความสะอาด — รอยลดลง 90%" } },
    { when: { en: "Dec 2025", th: "ธ.ค. 2025" }, similarity: 78, cause: { en: "sharp edge on a transfer tray", th: "ขอบถาดขนย้ายคม" }, outcome: { en: "switched to rubber-lined trays — stopped immediately", th: "เปลี่ยนเป็นถาดบุยาง — หยุดทันที" } },
  ],
  paint: [
    { when: { en: "Feb 2026", th: "ก.พ. 2026" }, similarity: 89, cause: { en: "nozzle #3 partially clogged", th: "หัวพ่นตัวที่ 3 อุดตันบางส่วน" }, outcome: { en: "cleaned the nozzle + weekly flush schedule — runs stopped", th: "ล้างหัวพ่น + ตั้งรอบล้างทุกสัปดาห์ — สีย้อยหยุด" } },
    { when: { en: "Sep 2025", th: "ก.ย. 2025" }, similarity: 74, cause: { en: "paint viscosity off-spec", th: "ความหนืดของสีผิดสเปก" }, outcome: { en: "controlled paint-tank temperature — back to normal", th: "คุมอุณหภูมิถังสี — กลับมาปกติ" } },
  ],
  weld: [
    { when: { en: "Jan 2026", th: "ม.ค. 2026" }, similarity: 87, cause: { en: "shielding-gas leak at a torch joint", th: "แก๊สปกคลุมรั่วที่ข้อต่อ torch" }, outcome: { en: "replaced the torch O-ring — porosity gone", th: "เปลี่ยนโอริง torch — รูพรุนหาย" } },
    { when: { en: "Aug 2025", th: "ส.ค. 2025" }, similarity: 72, cause: { en: "welding wire absorbed moisture", th: "ลวดเชื่อมชื้น" }, outcome: { en: "baked the wire + sealed storage — solved", th: "อบลวด + เก็บในถุงปิดสนิท — จบ" } },
  ],
  assembly: [
    { when: { en: "May 2026", th: "พ.ค. 2026" }, similarity: 85, cause: { en: "changeover jig not fully locked", th: "jig เปลี่ยนรุ่นล็อกไม่สุด" }, outcome: { en: "added a positioning pin — misalignment to zero", th: "เพิ่ม pin ล็อกตำแหน่ง — งานเบี้ยวเป็นศูนย์" } },
    { when: { en: "Oct 2025", th: "ต.ค. 2025" }, similarity: 70, cause: { en: "torque check skipped at setup", th: "ข้ามขั้นตอนตรวจ torque ตอนเซ็ตอัพ" }, outcome: { en: "added a setup checklist — defects down 80%", th: "เพิ่มเช็คลิสต์เซ็ตอัพ — ลดลง 80%" } },
  ],
  contam: [
    { when: { en: "Mar 2026", th: "มี.ค. 2026" }, similarity: 83, cause: { en: "grinding dust from the next station", th: "ฝุ่นจากงานเจียรสถานีข้างๆ" }, outcome: { en: "installed a curtain + moved the grinding spot", th: "กั้นม่าน + ย้ายจุดเจียร — จุดปนเปื้อนลด" } },
    { when: { en: "Jul 2025", th: "ก.ค. 2025" }, similarity: 69, cause: { en: "worn gloves shedding fibres", th: "ถุงมือเสื่อมปล่อยเส้นใย" }, outcome: { en: "changed the glove spec — cleared up", th: "เปลี่ยนสเปกถุงมือ — หายไป" } },
  ],
  shortshot: [
    { when: { en: "Apr 2026", th: "เม.ย. 2026" }, similarity: 88, cause: { en: "nozzle temperature dips at shift start", th: "อุณหภูมิหัวฉีดตกช่วงเปิดกะ" }, outcome: { en: "longer warm-up before production — every shot fills", th: "เพิ่มเวลาอุ่นเครื่องก่อนผลิต — เต็มทุกช็อต" } },
    { when: { en: "Nov 2025", th: "พ.ย. 2025" }, similarity: 75, cause: { en: "resin pellets absorbed moisture", th: "เม็ดพลาสติกชื้น" }, outcome: { en: "dried the pellets before use — solved", th: "อบเม็ดก่อนใช้ — จบ" } },
  ],
};
/** fixed titles of the journey — each defect's details come from rootCause.chain */
export const chainNodeTitles: LZ[] = [
  { en: "Defect", th: "ดีเฟกต์" },
  { en: "Time · shift", th: "เวลา · กะ" },
  { en: "Product model", th: "รุ่นที่ผลิต" },
  { en: "Source", th: "ต้นทาง" },
  { en: "Business", th: "ธุรกิจ" },
];

/* AI Process Intelligence */
export const processInsights: { kind: LZ; title: LZ; detail: LZ; sev: "warn" | "crit" | "ok" }[] = [
  { kind: { en: "Bottleneck", th: "คอขวด" }, title: { en: "Press station gates quality", th: "Stamping Press 03 เป็นคอขวดของการตรวจ" }, detail: { en: "The press runs so hard (94%) there is no time to check parts mid-run", th: "เครื่องเดินแน่นถึง 94% จนไม่มีเวลาตรวจชิ้นงานระหว่างผลิต" }, sev: "warn" },
  { kind: { en: "Process drift", th: "ค่ากระบวนการเพี้ยน" }, title: { en: "Die gap widening bit by bit", th: "ช่องว่างดายค่อยๆ ห่างขึ้น" }, detail: { en: "Grows +0.008mm every 1,000 strokes — will cross the limit at ~9,200 strokes", th: "ห่างขึ้น +0.008mm ทุกๆ ปั๊ม 1,000 ครั้ง — อีกราวๆ 9,200 ครั้งจะเกินเกณฑ์" }, sev: "crit" },
  { kind: { en: "Parameter drift", th: "พารามิเตอร์เลื่อน" }, title: { en: "Paint booth exhaust getting weak", th: "ลมดูดไอเสียห้องพ่นสีอ่อนลง" }, detail: { en: "Airflow down 11% → paint runs are coming", th: "ลมดูดอ่อนลง 11% → สีย้อยกำลังจะตามมา" }, sev: "warn" },
  { kind: { en: "Abnormal", th: "ผิดปกติ" }, title: { en: "Night B setup anomaly", th: "เซ็ตอัพกะดึก B ผิดปกติ" }, detail: { en: "Setup done 40% faster than standard — some steps were probably skipped", th: "ตั้งเครื่องเร็วกว่ามาต°านถึง 40% — น่าจะข้ามบางขั้นตอน" }, sev: "warn" },
];

/* AI Predictions */
export type Prediction = { kind: LZ; when: LZ; prob: number; detail: LZ; impact: number };
export const predictions: Prediction[] = [
  { kind: { en: "Defect spike", th: "ดีเฟกต์พุ่ง" }, when: { en: "next 4 h", th: "4 ชม.ข้างหน้า" }, prob: 76, detail: { en: "If the die is not fixed, size defects will pass 1.5% before this shift ends", th: "ถ้ายังไม่ซ่อมดาย ดีเฟกต์เรื่องขนาดจะเกิน 1.5% ก่อนหมดกะนี้" }, impact: 240_000 },
  { kind: { en: "Scrap forecast", th: "คาดการณ์ของเสีย" }, when: { en: "this week", th: "สัปดาห์นี้" }, prob: 68, detail: { en: "≈ 3,400 scrapped units if the worn die keeps running", th: "≈ 3,400 ชิ้นเสีย ถ้ายังเดินเครื่องด้วยดายชุดเดิม" }, impact: 610_000 },
  { kind: { en: "Tool wear", th: "ทูลใกล้ครบอายุ" }, when: { en: "~18 h", th: "~18 ชม." }, prob: 82, detail: { en: "The Stamping Press 03 die hits its wear limit in ~9,200 strokes (≈ 18 running hours) — a planned swap beats an unplanned stop", th: "ดายของ Stamping Press 03 จะถึงเกณฑ์สึกในอีก ~9,200 ปั๊ม (≈ เดินเครื่อง 18 ชม.) — เปลี่ยนตามแผนถูกกว่าปล่อยให้พังคางาน" }, impact: 350_000 },
  { kind: { en: "Process failure", th: "กระบวนการล่ม" }, when: { en: "~2 days", th: "~2 วัน" }, prob: 54, detail: { en: "Paint Booth exhaust is about to cross the line — paint runs will come in batches", th: "ลมดูดไอเสียของ Paint Booth ใกล้เกินเกณฑ์ — สีย้อยจะมาเป็นชุด" }, impact: 180_000 },
  { kind: { en: "Customer risk", th: "เสี่ยงลูกค้า" }, when: { en: "next lot", th: "ล็อตถัดไป" }, prob: 61, detail: { en: "Dimensional escape risk on the pending export lot", th: "เสี่ยงของหลุดเรื่องขนาดในล็อตส่งออกที่ค้างอยู่" }, impact: 1_900_000 },
];

/* AI Defect Learning — the model learns from labelled photos, auto-groups new ones,
 * and a human names each class (pattern A = "Scratch", pattern B = "Deep groove" …). */
export type Glyph = "scratch" | "groove" | "drip" | "pores" | "specks" | "dent";
export type DefectClass = { id: string; name: LZ; samples: number; accuracy: number; glyph: Glyph; hex: string };
export const defectClasses: DefectClass[] = [
  { id: "scratch", name: { en: "Scratch", th: "รอยขีดข่วน" }, samples: 1240, accuracy: 99.2, glyph: "scratch", hex: "#c084fc" },
  { id: "groove", name: { en: "Deep groove", th: "ร่องลึก" }, samples: 480, accuracy: 96.4, glyph: "groove", hex: "#f43f5e" },
  { id: "drip", name: { en: "Paint run", th: "สีย้อย" }, samples: 860, accuracy: 98.1, glyph: "drip", hex: "#22d3ee" },
  { id: "pores", name: { en: "Weld porosity", th: "รูพรุนแนวเชื่อม" }, samples: 610, accuracy: 97.5, glyph: "pores", hex: "#f59e0b" },
  { id: "specks", name: { en: "Contamination", th: "สิ่งปนเปื้อน" }, samples: 390, accuracy: 95.8, glyph: "specks", hex: "#34d399" },
  { id: "dent", name: { en: "Dent", th: "รอยบุบ" }, samples: 275, accuracy: 94.1, glyph: "dent", hex: "#818cf8" },
];
export const classById = (id: string) => defectClasses.find((c) => c.id === id);

/** active-learning queue — new/low-confidence patterns for a human to name. */
export type LearnItem = { id: string; count: number; closest: string; closestConf: number; note: LZ };
export const learningQueue: LearnItem[] = [
  { id: "lq1", count: 34, closest: "scratch", closestConf: 72, note: { en: "Deeper, shorter marks than Scratch — likely a new class", th: "รอยลึกและสั้นกว่า Scratch — น่าจะเป็นคลาสใหม่" } },
  { id: "lq2", count: 12, closest: "drip", closestConf: 64, note: { en: "Glossy blister near paint runs", th: "ตุ่มเงาใกล้บริเวณสีย้อย" } },
];
export const modelTraining = (() => {
  const totalSamples = defectClasses.reduce((s, c) => s + c.samples, 0);
  const overallAccuracy = Math.round(defectClasses.reduce((s, c) => s + c.accuracy * c.samples, 0) / totalSamples * 10) / 10;
  return { totalSamples, classes: defectClasses.length, overallAccuracy, lastTrained: { en: "2 days ago", th: "2 วันก่อน" } as LZ, pendingReview: learningQueue.reduce((s, q) => s + q.count, 0) };
})();

/* ══════════════════ ACT ══════════════════ */
export type Action = {
  id: string; priority: "P1" | "P2" | "P3"; title: LZ; defectId: string;
  reduction: number; capex: number; sop: LZ; parts: number;
};
export const actions: Action[] = [
  { id: "die-regrind", priority: "P1", title: { en: "Re-shim & regrind Stamping Press 03 die", th: "ปรับชิม & เจียรดาย Stamping Press 03" }, defectId: "dim", reduction: 62, capex: 85_000, sop: { en: "Add die-clearance check every 8,000 strokes to setup SOP", th: "เพิ่มการเช็คระยะดายทุก 8,000 สโตรกใน SOP เซ็ตอัพ" }, parts: 1 },
  { id: "supplier-hold", priority: "P1", title: { en: "Inspect & hold the coil lots used in high-defect windows", th: "ตรวจ + กักคอยล์ล็อตที่ใช้ช่วงดีเฟกต์สูง" }, defectId: "dim", reduction: 28, capex: 0, sop: { en: "Add incoming coil-thickness gate at receiving", th: "เพิ่มการตรวจความหนาคอยล์ขาเข้า" }, parts: 0 },
  { id: "paint-exhaust", priority: "P2", title: { en: "Restore Paint Booth 14 exhaust airflow", th: "แก้ลมไอเสีย Paint Booth 14" }, defectId: "paint", reduction: 45, capex: 35_000, sop: { en: "Weekly exhaust-filter ΔP check", th: "เช็ค ΔP กรองไอเสียรายสัปดาห์" }, parts: 1 },
  { id: "night-cert", priority: "P2", title: { en: "Re-certify Night B setup operators", th: "อบรมรับรองพนักงานเซ็ตอัพกะดึก B" }, defectId: "dim", reduction: 22, capex: 0, sop: { en: "Enforce first-article approval before run", th: "บังคับอนุมัติชิ้นแรกก่อนเดินเครื่อง" }, parts: 0 },
];
export const actionFor = (id: string) => actions.find((a) => a.id === id)!;

/* AI Solution Simulator — pick scenarios, see the combined outcome */
export type SimScenario = { id: string; label: LZ; reduction: number; capex: number; note?: LZ };
export const simScenarios: SimScenario[] = [
  { id: "die", label: { en: "Regrind press die + shim", th: "เจียรดาย + ชิม" }, reduction: 34, capex: 85_000 },
  { id: "supplier", label: { en: "Swap out the suspect coil lots", th: "เปลี่ยนคอยล์ล็อตต้องสงสัยออก" }, reduction: 22, capex: 0, note: { en: "+฿2/unit material", th: "วัตถุดิบ +฿2/ชิ้น" } },
  { id: "exhaust", label: { en: "Restore paint-booth exhaust", th: "แก้ลมห้องพ่นสี" }, reduction: 14, capex: 35_000 },
  { id: "speed", label: { en: "Reduce conveyor speed 8%", th: "ลดความเร็วสายพาน 8%" }, reduction: 9, capex: 0, note: { en: "−3% throughput", th: "กำลังผลิต −3%" } },
  { id: "cert", label: { en: "Re-certify night operators", th: "รับรองพนักงานกะดึก" }, reduction: 12, capex: 0 },
];

/* ══════════════════ REPORT ══════════════════ */
/* Every report opens with a 1-page AI executive summary, then the data.
 * schedule = default auto-delivery cadence (sent to the Email/LINE recipients set in Settings). */
export type ReportSchedule = "off" | "daily" | "weekly" | "monthly";
export type ReportTemplate = { id: string; group: LZ; name: LZ; desc: LZ; audience: LZ; schedule: ReportSchedule };
export const reportTemplates: ReportTemplate[] = [
  // operations — the artifacts a plant produces every single day
  { id: "daily-shift", group: { en: "Operations", th: "ปฏิบัติการ" }, name: { en: "Daily / shift report", th: "รายงานประจำกะ · ประจำวัน" }, desc: { en: "inspected, pass/scrap, money lost — with a 1-paragraph AI summary", th: "ยอดตรวจ ผ่าน/คัดออก เงินที่เสีย พร้อมสรุปโดย AI 1 ย่อหน้า" }, audience: { en: "plant manager · line leaders", th: "ผจก.โรงงาน · หัวหน้าไลน์" }, schedule: "daily" },
  // executive
  { id: "quality-summary", group: { en: "Executive", th: "ผู้บริหาร" }, name: { en: "Production quality summary", th: "สรุปคุณภาพการผลิต" }, desc: { en: "FPY, defect rate & COPQ at a glance", th: "FPY อัตราดีเฟกต์ และ COPQ ในหน้าเดียว" }, audience: { en: "executives", th: "ผู้บริหาร" }, schedule: "weekly" },
  { id: "business-impact", group: { en: "Executive", th: "ผู้บริหาร" }, name: { en: "Business impact summary", th: "สรุปผลกระทบธุรกิจ" }, desc: { en: "defect → OEE → downtime → revenue", th: "ดีเฟกต์ → OEE → ดาวน์ไทม์ → รายได้" }, audience: { en: "executives", th: "ผู้บริหาร" }, schedule: "off" },
  { id: "financial", group: { en: "Executive", th: "ผู้บริหาร" }, name: { en: "Financial impact report", th: "รายงานผลกระทบการเงิน" }, desc: { en: "visible vs invisible quality cost", th: "ต้นทุนคุณภาพที่เห็น vs ที่ซ่อน" }, audience: { en: "executives · finance", th: "ผู้บริหาร · การเงิน" }, schedule: "off" },
  { id: "system-roi", group: { en: "Executive", th: "ผู้บริหาร" }, name: { en: "System ROI report", th: "รายงาน ROI ของระบบ" }, desc: { en: "value VisionIQ caught vs system cost — the renew/expand decision", th: "มูลค่าที่ระบบจับได้เทียบค่าระบบ — ใช้ตัดสินใจต่ออายุ/ขยาย" }, audience: { en: "owner · executives", th: "เจ้าของ · ผู้บริหาร" }, schedule: "monthly" },
  // engineering
  { id: "root-cause", group: { en: "Engineering", th: "วิศวกรรม" }, name: { en: "AI root-cause report", th: "รายงานรากสาเหตุด้วย AI" }, desc: { en: "cause, evidence & correlations", th: "สาเหตุ หลักฐาน และความสัมพันธ์" }, audience: { en: "engineers", th: "วิศวกร" }, schedule: "off" },
  { id: "defect-analysis", group: { en: "Engineering", th: "วิศวกรรม" }, name: { en: "Defect analysis report", th: "รายงานวิเคราะห์ดีเฟกต์" }, desc: { en: "Pareto, trend & by-machine breakdown", th: "Pareto เทรนด์ และแยกตามเครื่อง" }, audience: { en: "engineers · QC", th: "วิศวกร · QC" }, schedule: "off" },
  { id: "fix-effect", group: { en: "Engineering", th: "วิศวกรรม" }, name: { en: "Fix effectiveness (before/after)", th: "รายงานผลการแก้ไข (ก่อน/หลัง)" }, desc: { en: "defect rate before vs after each closed work order — proof the fix worked", th: "อัตราดีเฟกต์ก่อน-หลังปิดใบสั่งงาน — พิสูจน์ว่าแก้แล้วได้ผล" }, audience: { en: "engineers · QC", th: "วิศวกร · QC" }, schedule: "off" },
  { id: "supplier-quality", group: { en: "Engineering", th: "วิศวกรรม" }, name: { en: "Supplier quality report", th: "รายงานคุณภาพซัพพลายเออร์" }, desc: { en: "incoming-material defect linkage", th: "ความเชื่อมโยงดีเฟกต์กับวัตถุดิบ" }, audience: { en: "purchasing · QC", th: "จัดซื้อ · QC" }, schedule: "monthly" },
  { id: "traceability", group: { en: "Engineering", th: "วิศวกรรม" }, name: { en: "Traceability report", th: "รายงานสอบกลับ" }, desc: { en: "defect → lot → machine → customer", th: "ดีเฟกต์ → ล็อต → เครื่อง → ลูกค้า" }, audience: { en: "QC", th: "QC" }, schedule: "off" },
  // customer & claims — what leaves the building
  { id: "lot-cert", group: { en: "Customer & claims", th: "ลูกค้า & เคลม" }, name: { en: "Lot quality certificate", th: "ใบรับรองคุณภาพล็อต" }, desc: { en: "100% AI-inspected, defects removed — plant logo on, ready to send", th: "ตรวจ 100% ด้วย AI คัดของเสียออกแล้ว — ใส่โลโก้โรงงาน พร้อมส่งลูกค้า" }, audience: { en: "sales · customers", th: "ฝ่ายขาย · ลูกค้า" }, schedule: "off" },
  { id: "8d-car", group: { en: "Customer & claims", th: "ลูกค้า & เคลม" }, name: { en: "8D / CAR report", th: "รายงาน 8D / CAR" }, desc: { en: "on a claim, AI pre-fills D1–D5 from its root-cause evidence", th: "ลูกค้าเคลมเมื่อไหร่ AI เติม D1–D5 จากรากสาเหตุและหลักฐานให้ก่อนเลย" }, audience: { en: "QC manager", th: "QC Manager" }, schedule: "off" },
];

/* ── AI briefing · the 5-part executive voice (summary → findings → why → impact → next) ── */
export const aiBrief = {
  confidence: 82,
  summary: { en: "Quality is under control today, but money is leaking from one clear spot: size defects from the worn die on Stamping Press 03.", th: "คุณภาพวันนี้ยังคุมได้ แต่เงินรั่วชัดๆ อยู่จุดเดียว: ดีเฟกต์เรื่องขนาดจากดายที่สึกของ Stamping Press 03" },
  findings: [
    { en: "Size defects alone cost ฿12K/day — the most expensive defect on the floor", th: "ดีเฟกต์เรื่องขนาดตัวเดียวกินเงิน ฿12K/วัน — แพงสุดในบรรดาดีเฟกต์ทั้งหมด" },
    { en: "They spike while Press 03 runs, on Night B (2.1×) and right after model changes", th: "เกิดหนักช่วงเดิน Press 03 · กะดึก B (2.1 เท่า) · หลังเปลี่ยนรุ่น" },
    { en: "Today's quality bill is ฿73K — 73% of it never shows up in the books", th: "ความเสียหายวันนี้ ฿73K — 73% เป็นเงินที่ไม่โผล่ในบัญชี" },
  ],
  why: { en: "Parts grow little by little through every run — this pattern is consistent with die wear, not people or material.", th: "ชิ้นงานค่อยๆ ใหญ่ขึ้นทีละนิดตลอดรอบผลิต — รูปแบบนี้ตรงกับดายสึก ไม่ใช่ฝีมือคนหรือวัตถุดิบ" },
  impact: { en: "Left alone, defects pass 1.5% before shift end and a ~฿1.9M export lot is at risk of escapes.", th: "ปล่อยไว้ ดีเฟกต์จะเกิน 1.5% ก่อนหมดกะ และล็อตส่งออก ~฿1.9M เสี่ยงมีของหลุดไปถึงลูกค้า" },
  recommendation: { en: "Regrind the Press 03 die (฿85K, prevents ฿2.2M/yr) and enforce a first-article check after every model change.", th: "เจียรดาย Press 03 (฿85K กันเสียหาย ฿2.2M/ปี) และบังคับตรวจชิ้นแรกหลังเปลี่ยนรุ่นทุกครั้ง" },
  actionLabel: { en: "See the full analysis", th: "ดูการวิเคราะห์เต็ม" },
};

/* ── copilot suggestions ──────────────────────────────────────────────────── */
export const copilotSuggestions: LZ[] = [
  { en: "Why did dimensional defects spike on Line B?", th: "ทำไมดีเฟกต์ขนาดพุ่งที่ Line B?" },
  { en: "What is the invisible cost of quality this month?", th: "ต้นทุนคุณภาพที่ซ่อนอยู่เดือนนี้เท่าไหร่?" },
  { en: "Simulate switching Stamping Press 03 die", th: "จำลองการเปลี่ยนดาย Stamping Press 03" },
  { en: "Generate a CAPA for the top defect", th: "สร้าง CAPA สำหรับดีเฟกต์อันดับหนึ่ง" },
];

/* ── ฿ formatting ─────────────────────────────────────────────────────────── */
export const thbCompact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return "฿" + (n / 1_000_000).toFixed(a % 1_000_000 === 0 ? 0 : 2).replace(/\.?0+$/, "") + "M";
  if (a >= 1_000) return "฿" + Math.round(n / 1_000) + "K";
  return "฿" + Math.round(n);
};
