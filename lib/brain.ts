/** Factory Brain™ — the AI cognition layer that powers the Command Center home.
 *  Leads with an executive briefing, not charts. */

import type { Locale } from "./dict";

export const briefing = {
  greeting: "Good morning",
  health: 89,
  headline:
    "Your factory is operating at 89/100 overall health. Three critical issues require attention today.",
  criticalIssues: [
    {
      n: 1,
      title: "Compressor #2 energy waste",
      detail: "Running off-schedule during on-peak — bleeding ฿/hr.",
      severity: "warning" as const,
    },
    {
      n: 2,
      title: "Pump P-203 failure risk",
      detail: "Bearing vibration signature — ~3 days to failure.",
      severity: "critical" as const,
    },
    {
      n: 3,
      title: "Production Line B downtime",
      detail: "OEE dragging the plant; changeover losses rising.",
      severity: "warning" as const,
    },
  ],
  financialImpact: 127000,
  recommendedActions: [
    "Inspect Pump P-203 bearing",
    "Optimize compressor schedule",
    "Shift Production Lot A127",
  ],
  annualBenefit: 850000,
};

/** Natural-language text the Voice Briefing reads aloud, per language.
 *  Paired with a BCP-47 lang tag so the browser selects the right TTS voice. */
export const voiceLang: Record<Locale, string> = {
  en: "en-US",
  th: "th-TH",
  ja: "ja-JP",
  zh: "zh-CN",
};

export const voiceScripts: Record<Locale, string> = {
  en:
    "Good morning. Your factory is operating at 89 out of 100 overall health. " +
    "Three critical issues need attention today. " +
    "Pump P-203 shows a bearing failure risk within three days. " +
    "Compressor number 2 is wasting energy during on-peak hours. " +
    "And Production Line B downtime is dragging plant O E E. " +
    "Total financial impact at risk today is one hundred twenty-seven thousand baht. " +
    "I recommend inspecting the P-203 bearing, optimizing the compressor schedule, " +
    "and shifting production lot A127. Acting on these unlocks an estimated " +
    "eight hundred fifty thousand baht in annual benefit.",
  th:
    "อรุณสวัสดิ์ค่ะ โรงงานของคุณกำลังทำงานที่ระดับสุขภาพโดยรวม 89 จาก 100 " +
    "มี 3 ปัญหาวิกฤตที่ต้องจัดการในวันนี้ " +
    "ปั๊ม พี 203 มีความเสี่ยงลูกปืนเสียหายภายใน 3 วัน " +
    "คอมเพรสเซอร์หมายเลข 2 ใช้พลังงานสิ้นเปลืองในช่วงออนพีก " +
    "และสายการผลิต บี หยุดทำงาน ทำให้ค่า OEE รวมของโรงงานลดลง " +
    "มูลค่าความเสี่ยงรวมวันนี้อยู่ที่หนึ่งแสนสองหมื่นเจ็ดพันบาท " +
    "ขอแนะนำให้ตรวจสอบลูกปืนปั๊ม พี 203 ปรับตารางเดินคอมเพรสเซอร์ " +
    "และเลื่อนล็อตการผลิต เอ 127 หากดำเนินการจะช่วยประหยัดได้ประมาณแปดแสนห้าหมื่นบาทต่อปี",
  ja:
    "おはようございます。工場の総合ヘルスは100点中89点で稼働しています。" +
    "本日対応が必要な重大課題が3件あります。" +
    "ポンプP-203は3日以内に軸受故障のリスクがあります。" +
    "コンプレッサー2号機はオンピーク時間帯にエネルギーを浪費しています。" +
    "また、生産ラインBの停止が工場全体のOEEを押し下げています。" +
    "本日のリスク影響額は合計12万7千バーツです。" +
    "P-203の軸受点検、コンプレッサーのスケジュール最適化、" +
    "生産ロットA127のシフトを推奨します。実行すれば年間約85万バーツの効果が見込めます。",
  zh:
    "早上好。您的工厂当前综合健康度为100分中的89分。" +
    "今天有三个关键问题需要处理。" +
    "P-203泵在三天内存在轴承故障风险。" +
    "2号空压机在高峰时段浪费能源。" +
    "同时，B生产线停机正在拖累全厂OEE。" +
    "今天的风险影响总额为12.7万泰铢。" +
    "建议检查P-203轴承、优化空压机排程，" +
    "并调整生产批次A127。执行后预计每年可带来约85万泰铢收益。",
};

export type SubScore = {
  key: string;
  label: string;
  score: number;
  trend: "up" | "down" | "flat";
  delta: string;
  comment: string;
  accent: string;
};

export const healthScores = {
  overall: 89,
  trend: "up" as const,
  delta: "+2",
  subs: [
    { key: "energy", label: "Energy Intelligence", score: 92, trend: "up", delta: "+3", comment: "Off-peak load shifting is paying off.", accent: "#22d3ee" },
    { key: "production", label: "Production Intelligence", score: 85, trend: "up", delta: "+1", comment: "Line A above target; Line B dragging OEE.", accent: "#34d399" },
    { key: "asset", label: "Asset Intelligence", score: 78, trend: "down", delta: "-4", comment: "Pump P-203 degradation lowering the score.", accent: "#f472b6" },
    { key: "maintenance", label: "Maintenance Intelligence", score: 88, trend: "up", delta: "+2", comment: "Prescriptive work orders cleared on time.", accent: "#60a5fa" },
    { key: "sustainability", label: "Sustainability Intelligence", score: 91, trend: "up", delta: "+5", comment: "Carbon intensity down 8% YoY.", accent: "#4ade80" },
  ] as SubScore[],
};

export type Risk = {
  name: string;
  risk: number; // %
  impact: number; // THB
  detail: string;
};

/** Ranked by financial impact (desc). */
export const topRisks: Risk[] = [
  { name: "Pump P-203 Failure", risk: 87, impact: 3_500_000, detail: "Bearing vibration rising; secondary cooling at risk." },
  { name: "Peak Demand Event", risk: 74, impact: 1_200_000, detail: "Forecast peak 3,120 kW vs. 3,000 kW contract." },
  { name: "Compressed Air Leakage", risk: 65, impact: 850_000, detail: "Ring-main night base-load 20% over target." },
  { name: "Chiller Efficiency Loss", risk: 58, impact: 620_000, detail: "Condenser fouling on Chiller B raising kW/ton." },
];

export type Opportunity = { name: string; saving: number; detail: string };

export const opportunities: Opportunity[] = [
  { name: "Peak Optimization", saving: 1_200_000, detail: "Automated load-shed + pre-cooling off-peak." },
  { name: "Compressor Sequencing", saving: 850_000, detail: "Lead/lag staging to match air demand." },
  { name: "Chiller Optimization", saving: 620_000, detail: "Setpoint + staging tuning across the plant." },
  { name: "Idle Machine Shutdown", saving: 340_000, detail: "Auto-standby for machines idling >15 min." },
];

export const totalOpportunity = opportunities.reduce((s, o) => s + o.saving, 0); // 3.01M

export type ActionStatus = "active" | "pending" | "suggested";
export type AutonomousAction = {
  id: string;
  name: string;
  desc: string;
  impact: string;
  status: ActionStatus;
};

export const autonomousActions: AutonomousAction[] = [
  { id: "peak", name: "Peak Demand Reduction", desc: "Shed non-critical loads to stay under the 3,000 kW contract demand.", impact: "฿180k/mo", status: "active" },
  { id: "shift", name: "Load Shifting", desc: "Move shiftable production to off-peak tariff windows.", impact: "฿95k/mo", status: "active" },
  { id: "chiller", name: "Chiller Optimization", desc: "Stage chillers to match real-time cooling demand.", impact: "฿52k/mo", status: "pending" },
  { id: "pump", name: "Pump Scheduling", desc: "Sequence pumps to eliminate idle running.", impact: "฿28k/mo", status: "pending" },
  { id: "robot", name: "Robot Production Balancing", desc: "Rebalance cell load to lift Line B OEE.", impact: "฿140k/mo", status: "suggested" },
];

