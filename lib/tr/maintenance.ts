import type { TrDict } from "./types";

/** Maintenance Intelligence module views. */
export const maintenanceDict: TrDict = {
  // —— shell sub-nav tabs ——
  "Work Orders": { th: "ใบสั่งงาน", ja: "作業指示", zh: "工单" },
  "Preventive Maintenance": { th: "การบำรุงรักษาเชิงป้องกัน", ja: "予防保全", zh: "预防性维护" },
  "Spare Parts": { th: "อะไหล่", ja: "スペアパーツ", zh: "备件" },
  "Performance": { th: "ประสิทธิภาพ", ja: "パフォーマンス", zh: "绩效" },
  "AI Planner": { th: "ตัววางแผน AI", ja: "AIプランナー", zh: "AI 排程" },

  // —— health score ——
  "Maintenance Health Score": { th: "คะแนนสุขภาพงานบำรุงรักษา", ja: "保全ヘルススコア", zh: "维护健康评分" },
  "Healthy": { th: "แข็งแรง", ja: "良好", zh: "健康" },
  "PM Compliance": { th: "การปฏิบัติตาม PM", ja: "PM遵守率", zh: "PM 合规率" },
  "Schedule Adherence": { th: "การทำตามกำหนดการ", ja: "スケジュール遵守", zh: "计划达成率" },
  "Parts Readiness": { th: "ความพร้อมของอะไหล่", ja: "部品準備状況", zh: "备件就绪度" },
  "Backlog Control": { th: "การควบคุมงานค้าง", ja: "バックログ管理", zh: "积压管控" },

  // —— exec summary ——
  "Open Work Orders": { th: "ใบสั่งงานที่เปิดอยู่", ja: "未完了作業指示", zh: "未结工单" },
  "Parts at Risk": { th: "อะไหล่ที่เสี่ยงขาด", ja: "リスクのある部品", zh: "风险备件" },
  "AI Maintenance Summary": { th: "สรุปงานบำรุงรักษาโดย AI", ja: "AI保全サマリー", zh: "AI 维护摘要" },
  "One": { th: "มี", ja: "", zh: "有一张" },
  "work order: Chiller B condenser clean (parts in stock).": { th: "ใบสั่งงาน: ล้างคอนเดนเซอร์ Chiller B (มีอะไหล่ในสต็อก)", ja: "作業指示: Chiller B コンデンサ清掃 (部品在庫あり)。", zh: "工单：Chiller B 冷凝器清洗（备件有库存）。" },
  "Press main bearing": { th: "แบริ่งหลักของ Press", ja: "プレス主軸受", zh: "冲压机主轴承" },
  "is out of stock with a 21-day lead — reorder now to cover the predicted failure in ~6 days. Wrench-time efficiency is up 3.2× after prescriptive scheduling.": { th: "หมดสต็อก ระยะเวลาสั่ง 21 วัน — สั่งซื้อตอนนี้เพื่อรองรับการเสียที่คาดว่าจะเกิดใน ~6 วัน เวลาลงมือซ่อมมีประสิทธิภาพขึ้น 3.2× หลังใช้การจัดตารางแบบพรีสคริปทีฟ", ja: "在庫切れでリードタイム21日 — 約6日後に予測される故障に備え、今すぐ再発注してください。処方的スケジューリングでレンチタイム効率が3.2倍に向上。", zh: "已缺货且交货期21天 — 请立即再订货以应对约6天后的预测故障。采用处方式排程后，扳手作业效率提升3.2倍。" },
  "Prioritize this week": { th: "จัดลำดับความสำคัญสัปดาห์นี้", ja: "今週の優先順位付け", zh: "本周优先排序" },
  "Reorder check": { th: "ตรวจสอบการสั่งซื้อ", ja: "再発注チェック", zh: "再订货检查" },

  // —— work orders ——
  "AI-scheduled": { th: "จัดตารางโดย AI", ja: "AIスケジュール", zh: "AI 排程" },
  "Asset / Task": { th: "สินทรัพย์ / งาน", ja: "資産 / 作業", zh: "资产 / 任务" },
  "Priority": { th: "ความสำคัญ", ja: "優先度", zh: "优先级" },
  "Parts": { th: "อะไหล่", ja: "部品", zh: "备件" },
  "Due": { th: "กำหนดส่ง", ja: "期限", zh: "到期" },

  // —— work-order tasks ——
  "Condenser clean + refrigerant check": { th: "ล้างคอนเดนเซอร์ + ตรวจสารทำความเย็น", ja: "コンデンサ清掃 + 冷媒点検", zh: "冷凝器清洗 + 制冷剂检查" },
  "Main-bearing inspection & regrease": { th: "ตรวจแบริ่งหลัก & อัดจาระบีใหม่", ja: "主軸受点検・再給脂", zh: "主轴承检查与重新加脂" },
  "Air-end service + leak survey": { th: "บริการชุดอัดอากาศ + ตรวจรั่ว", ja: "エアエンド整備 + 漏れ調査", zh: "空压主机保养 + 泄漏检查" },
  "Hydraulic temperature diagnostic": { th: "วินิจฉัยอุณหภูมิระบบไฮดรอลิก", ja: "油圧温度診断", zh: "液压温度诊断" },
  "Fan-bearing & fill inspection": { th: "ตรวจแบริ่ง Fan & แผงระบายความร้อน", ja: "ファン軸受・充填材点検", zh: "风机轴承与填料检查" },
  "Exhaust-filter replacement": { th: "เปลี่ยนไส้กรองไอเสีย", ja: "排気フィルタ交換", zh: "排气过滤器更换" },
  "Aeration blower service": { th: "บริการ Blower เติมอากาศ", ja: "曝気ブロワ整備", zh: "曝气风机保养" },
  "Predictive inspection": { th: "การตรวจเชิงพยากรณ์", ja: "予知点検", zh: "预测性检查" },

  // —— parts / stock status ——
  "In stock": { th: "มีในสต็อก", ja: "在庫あり", zh: "有库存" },
  "1 on order": { th: "สั่งซื้อแล้ว 1", ja: "1点発注済み", zh: "在订 1 件" },
  "Out of stock": { th: "หมดสต็อก", ja: "在庫切れ", zh: "缺货" },
  "Below min": { th: "ต่ำกว่าขั้นต่ำ", ja: "最小在庫未満", zh: "低于最小值" },

  // —— spares table headers ——
  "Part": { th: "อะไหล่", ja: "部品", zh: "备件" },
  "Stock": { th: "สต็อก", ja: "在庫", zh: "库存" },
  "Min": { th: "ขั้นต่ำ", ja: "最小", zh: "最小" },
  "Lead": { th: "ระยะเวลาสั่ง", ja: "リードタイム", zh: "交货期" },
  "Status": { th: "สถานะ", ja: "状態", zh: "状态" },

  // —— spares views ——
  "Spare-Parts Inventory": { th: "คลังอะไหล่", ja: "スペアパーツ在庫", zh: "备件库存" },
  "Critical Spares": { th: "อะไหล่วิกฤต", ja: "重要スペア", zh: "关键备件" },
  "flagged": { th: "ถูกทำเครื่องหมาย", ja: "件フラグ", zh: "项已标记" },

  // —— reorder view ——
  "Reorder Now": { th: "สั่งซื้อทันที", ja: "今すぐ再発注", zh: "立即再订货" },
  "Out of Stock": { th: "หมดสต็อก", ja: "在庫切れ", zh: "缺货" },
  "Est. PO Value": { th: "มูลค่า PO โดยประมาณ", ja: "発注見込額", zh: "预估采购额" },
  "AI Reorder Recommendation": { th: "คำแนะนำการสั่งซื้อโดย AI", ja: "AI再発注提案", zh: "AI 再订货建议" },
  "auto-drafted": { th: "ร่างอัตโนมัติ", ja: "自動作成", zh: "自动草拟" },
  "min": { th: "ขั้นต่ำ", ja: "最小", zh: "最小" },
  "lead": { th: "ระยะเวลาสั่ง", ja: "リードタイム", zh: "交货期" },
  "covers a predicted failure": { th: "ครอบคลุมการเสียที่คาดการณ์ไว้", ja: "予測故障に対応", zh: "覆盖预测故障" },
  "Qty": { th: "จำนวน", ja: "数量", zh: "数量" },
  "Draft PO": { th: "ร่างใบสั่งซื้อ", ja: "発注書作成", zh: "拟采购单" },

  // —— copilot ——
  "Maintenance Copilot": { th: "ผู้ช่วยงานบำรุงรักษา", ja: "保全コパイロット", zh: "维护副驾驶" },
  "Troubleshoot, recall SOPs, and plan repairs — grounded in live data": { th: "แก้ปัญหา เรียกดู SOP และวางแผนซ่อม — อ้างอิงจากข้อมูลปัจจุบัน", ja: "トラブルシュート、SOP参照、修理計画 — ライブデータに基づく", zh: "排障、调取 SOP 并规划维修 — 基于实时数据" },
  "There's 1 P1 work order open and a spare part out of stock. Ask me to troubleshoot a fault, pull an SOP, or recommend a repair.": { th: "มีใบสั่งงาน P1 เปิดอยู่ 1 ใบ และอะไหล่หมดสต็อก 1 รายการ ถามฉันให้ช่วยแก้ปัญหา ดึง SOP หรือแนะนำวิธีซ่อมได้", ja: "P1作業指示が1件、在庫切れのスペアが1点あります。故障の切り分け、SOPの参照、修理の提案をご依頼ください。", zh: "有 1 张 P1 工单未结、1 项备件缺货。可让我排查故障、调取 SOP 或推荐维修方案。" },
  "Ask the Maintenance Copilot…": { th: "ถามผู้ช่วยงานบำรุงรักษา…", ja: "保全コパイロットに質問…", zh: "向维护副驾驶提问…" },

  // —— copilot prompts ——
  "What should maintenance prioritize today?": { th: "วันนี้งานบำรุงรักษาควรให้ความสำคัญกับอะไร?", ja: "本日、保全は何を優先すべきですか？", zh: "今天维护应优先处理什么？" },
  "How do I troubleshoot the Chiller B fault?": { th: "จะแก้ปัญหาข้อขัดข้องของ Chiller B อย่างไร?", ja: "Chiller B の故障をどう切り分けますか？", zh: "如何排查 Chiller B 的故障？" },
  "Show the SOP for bearing replacement": { th: "แสดง SOP สำหรับการเปลี่ยนแบริ่ง", ja: "軸受交換のSOPを表示", zh: "显示轴承更换的 SOP" },
  "Recommend a repair for Stamping Press 03": { th: "แนะนำวิธีซ่อมสำหรับ Stamping Press 03", ja: "Stamping Press 03 の修理を提案", zh: "为 Stamping Press 03 推荐维修方案" },
  "Which spare parts should we reorder?": { th: "ควรสั่งซื้ออะไหล่ตัวใดเพิ่ม?", ja: "どのスペアパーツを再発注すべきですか？", zh: "应再订货哪些备件？" },
};
