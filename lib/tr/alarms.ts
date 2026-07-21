import type { TrDict } from "./types";

/** Alarm Center module views. */
export const alarmsDict: TrDict = {
  // —— KPI labels ——
  "Active Alarms": { th: "การเตือนที่ยังเปิดอยู่", ja: "アクティブ警報", zh: "活动报警" },
  "Critical": { th: "วิกฤต", ja: "重大", zh: "严重" },
  "Acknowledged · Today": { th: "รับทราบแล้ว · วันนี้", ja: "確認済み · 本日", zh: "已确认 · 今日" },
  "Mean Time to Ack": { th: "เวลาเฉลี่ยจนรับทราบ", ja: "平均確認時間", zh: "平均确认时间" },

  // —— panel header ——
  "Alarm Stream": { th: "รายการเตือนปัจจุบัน", ja: "アラームストリーム", zh: "报警流" },
  "Cross-module events · AI-prioritized": { th: "เหตุการณ์ข้ามโมดูล · จัดลำดับด้วย AI", ja: "モジュール横断イベント · AI優先順位付け", zh: "跨模块事件 · AI优先级排序" },

  // —— filter chips (lowercase, CSS-capitalized) ——
  "all": { th: "ทั้งหมด", ja: "すべて", zh: "全部" },
  "critical": { th: "วิกฤต", ja: "重大", zh: "严重" },
  "warning": { th: "เตือน", ja: "警告", zh: "警告" },
  "info": { th: "ข้อมูล", ja: "情報", zh: "信息" },

  // —— severity labels (SEV.label) ——
  "Warning": { th: "เตือน", ja: "警告", zh: "警告" },
  "Info": { th: "ข้อมูล", ja: "情報", zh: "信息" },

  // —— actions / status ——
  "Ack all": { th: "รับทราบทั้งหมด", ja: "すべて確認", zh: "全部确认" },
  "Acked": { th: "รับทราบแล้ว", ja: "確認済み", zh: "已确认" },
  "Acknowledge": { th: "รับทราบ", ja: "確認", zh: "确认" },

  // —— alarm messages ——
  "Condenser fouling — vibration 5.8 mm/s over alarm limit. Failure predicted in ~3 days.": {
    th: "คอนเดนเซอร์อุดตัน — การสั่นสะเทือน 5.8 mm/s เกินลิมิตเตือน คาดว่าจะเสียใน ~3 วัน",
    ja: "凝縮器の汚れ — 振動5.8 mm/sが警報上限超過。約3日で故障予測。",
    zh: "冷凝器结垢 — 振动5.8 mm/s超过报警限值。预计约3天后故障。",
  },
  "Predicted peak 3,120 kW vs 3,000 kW contract — auto load-shed armed.": {
    th: "คาดการณ์พีค 3,120 kW เทียบสัญญา 3,000 kW — เตรียมปลดโหลดอัตโนมัติ",
    ja: "予測ピーク3,120 kW 対 契約3,000 kW — 自動負荷遮断を準備。",
    zh: "预测峰值3,120 kW 对比合约3,000 kW — 已启用自动甩负荷。",
  },
  "Paint-finish defect rate trending up on Line C (97.9% station accuracy).": {
    th: "อัตราข้อบกพร่องงานพ่นสีมีแนวโน้มเพิ่มขึ้นที่ไลน์ C (ความแม่นยำสถานี 97.9%)",
    ja: "ラインCで塗装仕上げの不良率が上昇傾向 (ステーション精度97.9%)。",
    zh: "C线喷漆缺陷率呈上升趋势 (工位准确率97.9%)。",
  },
  "Night base-load 20% above target — possible ring-main leak.": {
    th: "โหลดฐานกลางคืนสูงกว่าเป้าหมาย 20% — อาจมีการรั่วที่ท่อวงแหวน",
    ja: "夜間ベース負荷が目標を20%超過 — リングメイン漏れの可能性。",
    zh: "夜间基础负荷高于目标20% — 可能环网管路泄漏。",
  },
  "Weld porosity rejected at V-B2 — quality hold on batch 218.": {
    th: "รอยเชื่อมพรุนถูกปฏิเสธที่ V-B2 — กักคุณภาพล็อต 218",
    ja: "V-B2で溶接ポロシティを不合格 — バッチ218を品質保留。",
    zh: "V-B2检出焊接气孔不合格 — 批次218质量扣留。",
  },
  "Main-bearing service window scheduled in 6 days (WO-1043).": {
    th: "กำหนดหน้าต่างซ่อมแบริ่งหลักในอีก 6 วัน (WO-1043)",
    ja: "主軸受のサービス期間を6日後に予定 (WO-1043)。",
    zh: "主轴承检修窗口安排在6天后 (WO-1043)。",
  },
  "Off-peak pre-cooling completed — ฿4,100 saved vs. on-peak baseline.": {
    th: "ทำความเย็นล่วงหน้านอกช่วงพีคเสร็จสิ้น — ประหยัด ฿4,100 เทียบฐานช่วงพีค",
    ja: "オフピーク予冷完了 — ピーク基準比 ฿4,100 節約。",
    zh: "非高峰预冷却完成 — 相比高峰基线节省 ฿4,100。",
  },

  // —— AskCopilot ——
  "Summarize today's alarms and what to do first": {
    th: "สรุปการเตือนของวันนี้และควรทำอะไรก่อน",
    ja: "本日の警報を要約し、最初に対応すべきことを示して",
    zh: "汇总今日报警并说明应优先处理什么",
  },
  "Ask AI to triage the alarm queue": {
    th: "ให้ AI ช่วยจัดลำดับคิวการเตือน",
    ja: "AIに警報キューのトリアージを依頼",
    zh: "让AI对报警队列进行分级处理",
  },
};
