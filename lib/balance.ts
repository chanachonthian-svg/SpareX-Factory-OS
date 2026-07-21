import type { PqFinding, HSeverity } from "./harmonics";

/**
 * Three-phase balance classifier — turns the phase readings + unbalance metrics
 * into ranked PQ findings (current unbalance, voltage unbalance / motor derating),
 * each with: found (meter) → where → cause → fix (AI). Same shape & UI as the
 * harmonic classifier so one findings list renders both.
 */

export interface BalancePhase { name: string; volt: number; amp: number; thd: number }

export interface BalanceInput {
  phases: BalancePhase[];
  vUnbalance: number; // %
  iUnbalance: number; // %
  vLimit?: number; // NEMA voltage-unbalance limit (%)
  iLimit?: number; // NEMA current-unbalance guideline (%)
}

const SEV_RANK: Record<HSeverity, number> = { critical: 3, warning: 2, watch: 1 };

export function classifyBalance(inp: BalanceInput): PqFinding[] {
  const vLim = inp.vLimit ?? 2;
  const iLim = inp.iLimit ?? 10;
  const P = inp.phases;
  const avgA = P.reduce((s, p) => s + p.amp, 0) / (P.length || 1);
  const hi = [...P].sort((a, b) => b.amp - a.amp)[0];
  const lo = [...P].sort((a, b) => a.amp - b.amp)[0];
  const hiV = [...P].sort((a, b) => b.volt - a.volt)[0];
  const loV = [...P].sort((a, b) => a.volt - b.volt)[0];
  const neutralA = Math.round((inp.iUnbalance / 100) * avgA);
  const out: PqFinding[] = [];

  // 1) CURRENT UNBALANCE — uneven single-phase load spread
  if (inp.iUnbalance >= 2) {
    const sev: HSeverity = inp.iUnbalance >= iLim ? "critical" : inp.iUnbalance >= 5 ? "warning" : "watch";
    out.push({
      id: "i-unbalance", klass: "current-unbalance", severity: sev, confidence: 84, score: 0,
      orders: [], tags: [`${hi.name} ↑`, `${lo.name} ↓`], standard: "NEMA MG-1 / IEC 61000-3-13",
      title: { en: "Current unbalance across phases", th: "กระแสไม่สมดุลระหว่างเฟส" },
      found: {
        en: `I-unbalance ${inp.iUnbalance.toFixed(1)}% — ${hi.name} ${hi.amp.toLocaleString()}A (highest) vs ${lo.name} ${lo.amp.toLocaleString()}A (lowest); neutral ≈ ${neutralA}A. ${sev === "watch" ? "Within" : "Above"} the NEMA <${iLim}% guideline`,
        th: `กระแสไม่สมดุล ${inp.iUnbalance.toFixed(1)}% — ${hi.name} ${hi.amp.toLocaleString()}A (สูงสุด) เทียบ ${lo.name} ${lo.amp.toLocaleString()}A (ต่ำสุด); นิวทรัล ≈ ${neutralA}A. ${sev === "watch" ? "ยังอยู่ใน" : "เกิน"}เกณฑ์ NEMA <${iLim}%`,
      },
      where: {
        en: `Single-phase loads spread unevenly — more circuits (lighting, small machines, welders, chargers) are tied to ${hi.name} than to ${lo.name}`,
        th: `โหลดเฟสเดียวกระจายไม่เท่ากัน — มีวงจร (ไฟส่องสว่าง เครื่องเล็ก เครื่องเชื่อม ที่ชาร์จ) ต่อเข้าเฟส ${hi.name} มากกว่า ${lo.name}`,
      },
      cause: {
        en: "When single-phase loads aren't balanced across L1 / L2 / L3, one phase draws more current — and the difference returns on the neutral, heating it",
        th: "เมื่อโหลดเฟสเดียวไม่สมดุลระหว่าง L1 / L2 / L3 เฟสหนึ่งจะดึงกระแสมากกว่า และส่วนต่างจะไหลกลับลงสายนิวทรัลจนสายร้อน",
      },
      fix: {
        en: `Rebalance at the panel — move a few single-phase circuits from the heavy phase (${hi.name}) to the light phase (${lo.name}). No capex, just re-terminate breakers during a shutdown`,
        th: `เกลี่ยโหลดใหม่ที่ตู้ — ย้ายวงจรเฟสเดียวบางส่วนจากเฟสหนัก (${hi.name}) ไปเฟสเบา (${lo.name}) ไม่ต้องลงทุน แค่ย้ายเบรกเกอร์ตอนหยุดเดินเครื่อง`,
      },
      fixNote: {
        en: `keep the neutral sized for ~${neutralA}A plus any 3rd-harmonic return`,
        th: `เผื่อขนาดสายนิวทรัลให้รับ ~${neutralA}A บวกกระแสฮาร์มอนิกที่ 3 ที่ไหลกลับ`,
      },
      impact: { en: "cuts neutral & transformer heating and avoids nuisance trips", th: "ลดความร้อนสะสมที่สายนิวทรัลและหม้อแปลง และลดการทริปโดยไม่จำเป็น" },
    });
  }

  // 2) VOLTAGE UNBALANCE — matters for motors (NEMA derating > 1%)
  if (inp.vUnbalance >= 1.0) {
    const sev: HSeverity = inp.vUnbalance >= vLim ? "critical" : inp.vUnbalance >= 1.5 ? "warning" : "watch";
    out.push({
      id: "v-unbalance", klass: "voltage-unbalance", severity: sev, confidence: 80, score: 0,
      orders: [], tags: [`Δ ${hiV.volt - loV.volt}V`, `${inp.vUnbalance.toFixed(1)}%`], standard: "NEMA MG-1",
      title: { en: "Voltage unbalance — motor derating risk", th: "แรงดันไม่สมดุล — เสี่ยงต้องลดพิกัดมอเตอร์" },
      found: {
        en: `V-unbalance ${inp.vUnbalance.toFixed(1)}% (${hiV.name} ${hiV.volt}V vs ${loV.name} ${loV.volt}V) — past 1% NEMA asks you to derate motors`,
        th: `แรงดันไม่สมดุล ${inp.vUnbalance.toFixed(1)}% (${hiV.name} ${hiV.volt}V เทียบ ${loV.name} ${loV.volt}V) — เกิน 1% NEMA แนะนำให้ลดพิกัดมอเตอร์`,
      },
      where: {
        en: "The unequal phase currents dropping across the system impedance, a utility-side unbalance, or a loose / high-resistance connection on one phase",
        th: "กระแสที่ไม่เท่ากันตกคร่อมอิมพีแดนซ์ของระบบ, ความไม่สมดุลจากฝั่งการไฟฟ้า หรือจุดต่อหลวม/ความต้านทานสูงที่เฟสใดเฟสหนึ่ง",
      },
      cause: {
        en: "A small voltage unbalance drives a large negative-sequence current in motors, adding heat — a ~3.5% unbalance can raise winding temperature ~25% and shorten motor life",
        th: "แรงดันไม่สมดุลเล็กน้อยทำให้เกิดกระแสลำดับลบในมอเตอร์สูงมาก เพิ่มความร้อน — ไม่สมดุล ~3.5% อาจทำอุณหภูมิขดลวดขึ้น ~25% และลดอายุมอเตอร์",
      },
      fix: {
        en: "Fix the current balance first; if it persists, check terminations / tighten the connection on the low-voltage phase, or raise it with the utility",
        th: "แก้สมดุลกระแสก่อน; ถ้ายังเป็น ให้ตรวจจุดต่อ/ขันแน่นที่เฟสแรงดันต่ำ หรือแจ้งการไฟฟ้า",
      },
      impact: { en: "protects motor windings & extends motor life", th: "ปกป้องขดลวดมอเตอร์และยืดอายุมอเตอร์" },
    });
  }

  for (const f of out) f.score = SEV_RANK[f.severity] * 100 + f.confidence / 10;
  out.sort((a, b) => b.score - a.score);
  return out;
}
