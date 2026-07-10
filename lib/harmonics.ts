import type { LZ } from "./energy";

/**
 * General harmonic classifier — a rule-based "fingerprint library" that maps
 * whatever the meter reports (any order, even / inter / high-order, resonance)
 * to ranked findings, each with: what was found (measured) → where from →
 * cause → fix (AI-interpreted). Replaces the old hard-coded 3rd/5th·7th logic.
 */

export type HSeverity = "critical" | "warning" | "watch";

export type HarmonicRow = { order: number; v: number; i: number };

/**
 * A generic power-quality diagnostic finding — shared by every PQ analyzer
 * (harmonics, three-phase balance, …). Renders as one ranked card that drills
 * into: found (meter) → where → cause → fix (AI).
 */
export interface PqFinding {
  id: string;
  klass: string;
  severity: HSeverity;
  score: number; // ranking key
  confidence: number; // %
  orders: number[]; // harmonic orders (empty for non-harmonic findings)
  tags?: string[]; // short header chips (e.g. ["L2 ↑", "L3 ↓"]); falls back to H-orders
  standard: string;
  savingYr?: number;
  title: LZ;
  found: LZ; // measured — what
  where: LZ; // AI — source equipment
  cause: LZ; // AI — physics / why
  fix: LZ; // AI — mitigation
  fixNote?: LZ; // e.g. detuned-reactor caveat
  impact?: LZ; // benefit when there is no ฿ figure (e.g. "prevents capacitor failure")
}

export interface HarmonicInput {
  harmonics: HarmonicRow[];
  vLimit?: number; // individual voltage-order limit (%)
  iLimit?: number; // individual current-order limit (%)
  capKvar?: number; // PF capacitor bank size (for resonance)
  sccKva?: number; // system short-circuit power (for resonance)
  savingYr?: number; // recoverable ฿/yr from harmonic losses
}

const SEV_RANK: Record<HSeverity, number> = { critical: 3, warning: 2, watch: 1 };

function ord(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function classifyHarmonics(inp: HarmonicInput): PqFinding[] {
  const vLim = inp.vLimit ?? 3;
  const iLim = inp.iLimit ?? 4;
  const H = inp.harmonics;
  const get = (o: number) => H.find((h) => h.order === o);
  const exceed = (h: HarmonicRow) => h.v > vLim || h.i > iLim;
  const overRatio = (h: HarmonicRow) => Math.max(h.v / vLim, h.i / iLim);
  const notable = (h: HarmonicRow) => h.i >= 2 || h.v >= 1.5 || exceed(h);
  const rows = (os: number[]) => os.map(get).filter((h): h is HarmonicRow => Boolean(h));
  const worst = (rs: HarmonicRow[]) => rs.reduce((m, h) => Math.max(m, overRatio(h)), 0);
  const foundLine = (rs: HarmonicRow[]): LZ => {
    const parts = rs.map((h) => `H${h.order} ${h.i.toFixed(1)}%`);
    const over = rs.filter(exceed).map((h) => `H${h.order}`);
    return {
      en: `${parts.join(" · ")} (I-limit ${iLim}%)${over.length ? ` — ${over.join(", ")} over limit` : ""}`,
      th: `${parts.join(" · ")} (ลิมิตกระแส ${iLim}%)${over.length ? ` — ${over.join(", ")} เกินลิมิต` : ""}`,
    };
  };

  const out: PqFinding[] = [];

  // 1) TRIPLEN — odd multiples of 3 (zero-sequence, sum on the neutral)
  const triplen = rows([3, 9, 15, 21]).filter(notable);
  if (triplen.length) {
    const over = triplen.some(exceed);
    out.push({
      id: "triplen", klass: "triplen", severity: over ? "warning" : "watch",
      confidence: triplen.length >= 2 ? 86 : 74, score: 0, orders: triplen.map((h) => h.order),
      standard: "IEEE-519 / EN 50160", savingYr: over && inp.savingYr ? Math.round(inp.savingYr * 0.35) : undefined,
      title: { en: "Triplen harmonics on the neutral", th: "ฮาร์มอนิกทริปเปิลบนสายนิวทรัล" },
      found: foundLine(triplen),
      where: { en: "Single-phase non-linear loads — computer / SMPS power supplies, LED & fluorescent lighting, UPS, small EV chargers", th: "โหลดเฟสเดียวไม่เชิงเส้น — พาวเวอร์ซัพพลายคอมพิวเตอร์/SMPS, ไฟ LED และหลอดฟลูออเรสเซนต์, UPS, ที่ชาร์จ EV ขนาดเล็ก" },
      cause: { en: "Triplen orders are zero-sequence: the three phases' 3rd harmonics don't cancel — they add up on the neutral, so neutral current can exceed phase current and overheat the conductor", th: "ฮาร์มอนิกทริปเปิลเป็นลำดับศูนย์: ฮาร์มอนิกที่ 3 ของทั้ง 3 เฟสไม่หักล้างกัน แต่มาบวกกันบนสายนิวทรัล กระแสนิวทรัลจึงอาจสูงกว่ากระแสเฟสจนสายร้อนเกิน" },
      fix: { en: "Oversize / double the neutral conductor, add a K-rated or zig-zag transformer, or fit an active harmonic filter (AHF)", th: "ขยาย/เพิ่มสายนิวทรัลเป็นสองเท่า, ใส่หม้อแปลง K-rated หรือ zig-zag, หรือติดตั้ง active harmonic filter (AHF)" },
    });
  }

  // 2) SIX-PULSE (5·7, characteristic) — else HIGHER-ORDER (11·13)
  const sixChar = rows([5, 7]).filter(notable);
  const highChar = rows([11, 13]).filter(notable);
  if (sixChar.length) {
    const over = sixChar.some(exceed);
    out.push({
      id: "six-pulse", klass: "six-pulse", severity: over ? "warning" : "watch",
      confidence: sixChar.length >= 2 ? 90 : 76, score: 0, orders: sixChar.map((h) => h.order),
      standard: "IEEE-519", savingYr: inp.savingYr,
      title: { en: "6-pulse rectifier harmonics (5th · 7th)", th: "ฮาร์มอนิกจากเรกติไฟเออร์ 6 พัลส์ (ที่ 5 · 7)" },
      found: foundLine(sixChar),
      where: { en: "6-pulse variable-speed drives (VFDs) — fans, pumps, compressors — and 3-phase DC drives / rectifiers", th: "ไดรฟ์ปรับรอบ (VFD) แบบ 6 พัลส์ — พัดลม ปั๊ม คอมเพรสเซอร์ — และ DC drive / เรกติไฟเออร์ 3 เฟส" },
      cause: { en: "A 6-pulse rectifier front-end draws current in sharp pulses; by the 6k±1 rule it inherently produces the 5th and 7th (then 11th / 13th) harmonics", th: "หน้าอินพุตเรกติไฟเออร์ 6 พัลส์ดึงกระแสเป็นจังหวะแหลม ตามกฎ 6k±1 จึงเกิดฮาร์มอนิกที่ 5 และ 7 (ตามด้วย 11/13) เป็นธรรมชาติ" },
      fix: { en: "A passive 5th/7th tuned filter or 3–5% line reactors on the drives; convert to a 12-/18-pulse drive; or an active harmonic filter (AHF) at the MDB", th: "ตัวกรองพาสซีฟจูนที่ 5/7 หรือ line reactor 3–5% ที่ตัวไดรฟ์; แปลงเป็นไดรฟ์ 12/18 พัลส์; หรือ active harmonic filter (AHF) ที่ MDB" },
      fixNote: { en: "keep any capacitor bank on a 7% detuned reactor so it can't resonate", th: "ถ้ามีคาปาซิเตอร์แบงก์ ให้ใส่ detuned reactor 7% กันเรโซแนนซ์" },
    });
  } else if (highChar.length) {
    out.push({
      id: "high-order", klass: "high-order", severity: highChar.some(exceed) ? "warning" : "watch",
      confidence: 72, score: 0, orders: highChar.map((h) => h.order), standard: "IEEE-519",
      title: { en: "Higher-order harmonics dominant (11th · 13th)", th: "ฮาร์มอนิกอันดับสูงเด่น (ที่ 11 · 13)" },
      found: foundLine(highChar),
      where: { en: "12-pulse drives, or 6-pulse drives whose 5th/7th have already been filtered — leaving the 11th/13th", th: "ไดรฟ์ 12 พัลส์ หรือไดรฟ์ 6 พัลส์ที่กรอง 5/7 ไปแล้ว จึงเหลือ 11/13" },
      cause: { en: "12-pulse rectifiers cancel the 5th/7th and produce the 11th/13th (12k±1); passive tuning becomes impractical at these orders", th: "เรกติไฟเออร์ 12 พัลส์หักล้าง 5/7 แล้วสร้าง 11/13 (12k±1) การจูนพาสซีฟที่อันดับสูงเริ่มไม่คุ้ม" },
      fix: { en: "An active harmonic filter (AHF) is the practical fix at these orders; a high-tuned passive filter is an option", th: "ควรใช้ active harmonic filter (AHF) เป็นหลักที่อันดับสูง; หรือตัวกรองพาสซีฟจูนอันดับสูง" },
    });
  }

  // 3) EVEN harmonics (2·4·6) — abnormal, points at a fault
  const even = H.filter((h) => Number.isInteger(h.order) && h.order % 2 === 0 && (h.i >= 1 || exceed(h)));
  if (even.length) {
    out.push({
      id: "even", klass: "even", severity: even.some(exceed) ? "critical" : "warning",
      confidence: 68, score: 0, orders: even.map((h) => h.order), standard: "IEEE-519",
      title: { en: "Even harmonics detected — abnormal", th: "พบฮาร์มอนิกเลขคู่ — ผิดปกติ" },
      found: foundLine(even),
      where: { en: "A specific device — often a half-wave rectifier, a welder, a saturating transformer, or a rectifier / drive starting to fail", th: "อุปกรณ์ตัวใดตัวหนึ่ง — มักเป็นเรกติไฟเออร์ครึ่งคลื่น, เครื่องเชื่อม, หม้อแปลงที่อิ่มตัว หรือเรกติไฟเออร์/ไดรฟ์ที่เริ่มจะเสีย" },
      cause: { en: "Even harmonics mean an asymmetric current waveform (a DC offset). Healthy 3-phase loads produce almost none — their appearance usually signals a fault or a failing component", th: "ฮาร์มอนิกเลขคู่แปลว่ารูปคลื่นกระแสไม่สมมาตร (มี DC offset) โหลด 3 เฟสปกติแทบไม่สร้างเลขคู่ — การที่โผล่มามักชี้ว่ามีของเสียหรืออุปกรณ์กำลังจะพัง" },
      fix: { en: "Inspect to find the offending device (check for a failed rectifier diode / DC offset) before it fails fully; a broadband AHF suppresses it in the meantime", th: "ตรวจหาอุปกรณ์ต้นเหตุ (เช็กไดโอดเรกติไฟเออร์ที่เสีย / DC offset) ก่อนพังสนิท; ระหว่างนั้นใช้ AHF บรอดแบนด์ช่ว·ด" },
      impact: { en: "catches a failing device before an unplanned breakdown", th: "จับอุปกรณ์ที่กำลังจะเสียได้ก่อนพังกะทันหัน" },
    });
  }

  // 4) INTER-HARMONICS (non-integer orders) — flicker source
  const inter = H.filter((h) => !Number.isInteger(h.order) && (h.i >= 1 || exceed(h)));
  if (inter.length) {
    out.push({
      id: "interharmonic", klass: "interharmonic", severity: "warning",
      confidence: 65, score: 0, orders: inter.map((h) => h.order), standard: "IEC 61000-4-7",
      title: { en: "Inter-harmonics detected (non-integer)", th: "พบอินเตอร์ฮาร์มอนิก (ความถี่ไม่ลงตัว)" },
      found: foundLine(inter),
      where: { en: "Arc furnaces, welding machines, cycloconverters, or wind / solar inverters", th: "เตาอาร์ก, เครื่องเชื่อม, ไซโคลคอนเวอร์เตอร์ หรืออินเวอร์เตอร์ลม/แสงอาทิตย์" },
      cause: { en: "Loads that switch or modulate at a rate unrelated to 50 Hz put energy between the harmonic orders — the main driver of voltage flicker", th: "โหลดที่สวิตช์/มอดูเลตด้วยจังหวะที่ไม่สัมพันธ์กับ 50 Hz สร้างพลังงานระหว่างอันดับฮาร์มอนิก — เป็นตัวการหลักของไฟกระพริบ" },
      fix: { en: "A broadband active filter (AHF), or an SVC / STATCOM on the offending feeder", th: "ตัวกรองแอ็กทีฟบรอดแบนด์ (AHF) หรือ SVC / STATCOM ที่ฟีดเดอร์ต้นเหตุ" },
    });
  }

  // 5) RESONANCE — parallel resonance of the PF cap bank with system impedance
  if (inp.capKvar && inp.sccKva) {
    const hr = Math.sqrt(inp.sccKva / inp.capKvar);
    const near = H.filter((h) => Number.isInteger(h.order) && Math.abs(h.order - hr) <= 0.6 && notable(h))
      .sort((a, b) => Math.abs(a.order - hr) - Math.abs(b.order - hr))[0];
    if (near) {
      const dist = Math.abs(near.order - hr);
      out.push({
        id: "resonance", klass: "resonance", severity: dist <= 0.3 ? "critical" : "warning",
        confidence: dist <= 0.15 ? 88 : 78, score: 0, orders: [near.order], standard: "IEEE-519",
        title: { en: "Capacitor-bank resonance risk", th: "เสี่ยงเรโซแนนซ์ที่คาปาซิเตอร์แบงก์" },
        found: { en: `Estimated parallel resonance at h ≈ ${hr.toFixed(1)} — right on the measured ${ord(near.order)} (${near.i.toFixed(1)}%)`, th: `ประเมินเรโซแนนซ์ขนานที่ h ≈ ${hr.toFixed(1)} — ตรงกับฮาร์มอนิกที่ ${near.order} ที่วัดได้ (${near.i.toFixed(1)}%)` },
        where: { en: `The ${inp.capKvar} kVAR power-factor capacitor bank at the MDB, interacting with the transformer / source impedance`, th: `คาปาซิเตอร์แก้เพาเวอร์แฟกเตอร์ ${inp.capKvar} kVAR ที่ MDB ที่ทำงานร่วมกับอิมพีแดนซ์ของหม้อแปลง/แหล่งจ่าย` },
        cause: { en: `The cap bank and the system inductance form a parallel resonant circuit at h ≈ ${hr.toFixed(1)}. With a real harmonic sitting there, voltage and current get amplified — which can overheat and blow the capacitors`, th: `คาปาซิเตอร์แบงก์กับความเหนี่ยวนำของระบบเกิดวงจรเรโซแนนซ์ขนานที่ h ≈ ${hr.toFixed(1)} เมื่อมีฮาร์มอนิกจริงอยู่ตรงนั้น แรงดัน/กระแสจะถูกขยาย — ทำให้คาปาซิเตอร์ร้อนจัดจนเสียหาย` },
        fix: { en: "Add a 7% detuned reactor (tunes to ~3.8th, below the 5th) so the bank can no longer resonate; or switch to a detuned / filter bank", th: "ใส่ detuned reactor 7% (จูนที่ ~3.8 ต่ำกว่า 5th) ให้แบงก์ไม่เรโซแนนซ์อีก; หรือเปลี่ยนเป็นแบงก์แบบ detuned/ตัวกรอง" },
        impact: { en: "prevents capacitor failure & downtime", th: "ป้องกันคาปาซิเตอร์เสียหายและดาวน์ไทม์" },
      });
    }
  }

  // rank: severity → confidence → how far over limit
  for (const f of out) {
    f.score = SEV_RANK[f.severity] * 100 + f.confidence / 10 + worst(rows(f.orders)) * 5;
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}
