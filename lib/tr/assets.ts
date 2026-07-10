import type { TrDict } from "./types";

/** Assets / AssetIQ module views. */
export const assetsDict: TrDict = {
  // —— sub-nav tabs (shell GROUPS) ——
  "Asset Health": { th: "สุขภาพสินทรัพย์", ja: "資産ヘルス", zh: "资产健康" },
  "Live Condition": { th: "สภาพเรียลไทม์", ja: "ライブ状態", zh: "实时状态" },
  "Critical Assets": { th: "สินทรัพย์วิกฤต", ja: "重要資産", zh: "关键资产" },
  "Failure Prediction": { th: "พยากรณ์การเสีย", ja: "故障予測", zh: "故障预测" },
  "AI Diagnosis": { th: "การวินิจฉัยด้วย AI", ja: "AI診断", zh: "AI诊断" },

  // —— health score view ——
  "Asset Health Score": { th: "คะแนนสุขภาพสินทรัพย์", ja: "資産ヘルススコア", zh: "资产健康评分" },
  "Watch · 1 critical": { th: "เฝ้าระวัง · วิกฤต 1 รา·าร", ja: "監視 · 重大1件", zh: "关注 · 1项严重" },
  "Healthy": { th: "ปกติ", ja: "正常", zh: "健康" },
  "Warning": { th: "เตือน", ja: "警告", zh: "警告" },
  "Critical": { th: "วิกฤต", ja: "重大", zh: "严重" },

  // —— critical assets view ——
  "Critical & at-risk assets": { th: "สินทรัพย์วิกฤตและเสี่ยง", ja: "重要・リスク資産", zh: "关键与高风险资产" },
  "ranked by health": { th: "จัดอันดับตามสุขภาพ", ja: "ヘルス順", zh: "按健康度排序" },

  // —— exec summary view ——
  "Avg Health": { th: "สุขภาพเฉลี่ย", ja: "平均ヘルス", zh: "平均健康度" },
  "Predicted Failures": { th: "การเสี·ี่คาดการณ์", ja: "予測故障", zh: "预测故障" },
  "Risk Exposure": { th: "มูลค่าความเสี่ยง", ja: "リスクエクスポージャー", zh: "风险敞口" },
  "AI Asset Summary": { th: "สรุปสินทรัพย์โดย AI", ja: "AI資産サマリー", zh: "AI资产摘要" },
  "is the top risk — condenser fouling, ~3 days RUL, ฿3.5M exposure. A work order is staged. Stamping Press 03 and Air Compressor 10 are trending toward service. Overall fleet health is": {
    th: "คือความเสี่ยงอันดับหนึ่ง — คอนเดนเซอร์อุดตัน, RUL ~3 วัน, ความเสี่ยง ฿3.5M · จัดใบสั่งงานไว้แล้ว · Stamping Press 03 และ Air Compressor 10 กำลังเข้าใกล้กำหนดซ่อม · สุขภาพรวมของฟลีตอยู่ที่",
    ja: "が最大のリスク — 復水器汚損、RUL約3日、エクスポージャー฿3.5M。作業指示を準備済み。Stamping Press 03とAir Compressor 10は整備時期に近づいています。全体のフリートヘルスは",
    zh: "为最高风险 — 冷凝器结垢、RUL约3天、风险敞口฿3.5M。工单已就绪。Stamping Press 03与Air Compressor 10正趋向需要保养。整体机群健康度为",
  },
  "Generate report": { th: "สร้างรายงาน", ja: "レポート生成", zh: "生成报告" },
  "Triage top risk": { th: "จัดลำดับความเสี่ยงสูงสุด", ja: "最大リスクを優先判定", zh: "分诊最高风险" },

  // —— live status view ——
  "Real-time asset status": { th: "สถานะสินทรัพย์เรียลไทม์", ja: "リアルタイム資産状態", zh: "实时资产状态" },
  "Live": { th: "สด", ja: "ライブ", zh: "实时" },

  // —— work orders view ——
  "Open work orders": { th: "ใบสั่งงานที่เปิดอยู่", ja: "オープン作業指示", zh: "未完工单" },
  "AI-generated": { th: "สร้างโดย AI", ja: "AI生成", zh: "AI生成" },
  "Asset / Task": { th: "สินทรัพย์ / งาน", ja: "資産 / タスク", zh: "资产 / 任务" },
  "Priority": { th: "ลำดับความสำคัญ", ja: "優先度", zh: "优先级" },
  "Parts": { th: "อะไหล่", ja: "部品", zh: "备件" },
  "Due": { th: "กำหนด", ja: "期限", zh: "到期" },
  "Condenser clean + refrigerant check": { th: "ทำความสะอาดคอนเดนเซอร์ + ตรวจสารทำความเย็น", ja: "復水器洗浄 + 冷媒点検", zh: "清洗冷凝器 + 检查制冷剂" },
  "Main-bearing inspection & regrease": { th: "ตรวจแบริ่งหลัก & อัดจารบีใหม่", ja: "主軸受点検・再グリス", zh: "主轴承检查与补脂" },
  "Air-end service + leak survey": { th: "บริการชุดอัดอากาศ + สำรวจการรั่ว", ja: "エアエンド整備 + 漏れ調査", zh: "主机保养 + 泄漏排查" },
  "Hydraulic temperature diagnostic": { th: "วินิจฉัยอุณหภูมิระบบไฮดรอลิก", ja: "油圧温度診断", zh: "液压温度诊断" },
  "Fan-bearing & fill inspection": { th: "ตรวจแบริ่งพัดลม & แผงระบายความร้อน", ja: "ファン軸受・充填材点検", zh: "风机轴承与填料检查" },
  "Exhaust-filter replacement": { th: "เปลี่ยนไส้กรองไอเสีย", ja: "排気フィルタ交換", zh: "更换排风滤芯" },
  "Aeration blower service": { th: "บริการ Blower เติมอากาศ", ja: "曝気ブロワ整備", zh: "曝气风机保养" },
  "Predictive inspection": { th: "การตรวจสอบเชิงพยากรณ์", ja: "予知保全点検", zh: "预测性检查" },
  "1 on order": { th: "สั่งซื้อ 1 รา·าร", ja: "1点発注済", zh: "1件在订" },
  "In stock": { th: "มีในสต็อก", ja: "在庫あり", zh: "有库存" },

  // —— copilot view ——
  "Asset Copilot": { th: "ผู้ช่วยสินทรัพย์ AI", ja: "資産コパイロット", zh: "资产副驾驶" },
  "Ask anything about asset health — grounded in live sensor data": {
    th: "ถามอะไรก็ได้เกี่ยวกับสุขภาพสินทรัพย์ — อ้างอิงข้อมูลเซ็นเซอร์สด",
    ja: "資産ヘルスについて何でも質問 — ライブセンサーデータに基づく",
    zh: "关于资产健康随意提问 — 基于实时传感器数据",
  },
  "Chiller B is my top concern — condenser fouling, ~3 days RUL. Ask me to explain a failure, estimate RUL, or recommend maintenance.": {
    th: "Chiller B คือสิ่งที่ผมกังวลที่สุด — คอนเดนเซอร์อุดตัน, RUL ~3 วัน · ให้ผมอธิบายสาเหตุความเสียหาย ประเมิน RUL หรือแนะนำการซ่อมบำรุงได้เลย",
    ja: "Chiller Bが最大の懸念です — 復水器汚損、RUL約3日。故障の説明、RUL推定、保全の推奨をお申し付けください。",
    zh: "Chiller B是我最担心的 — 冷凝器结垢、RUL约3天。可让我解释故障、估算RUL或推荐维护。",
  },
  "Ask the Asset Copilot…": { th: "ถามผู้ช่วยสินทรัพย์…", ja: "資産コパイロットに質問…", zh: "向资产副驾驶提问…" },
  "Why is Chiller B failing?": { th: "ทำไม Chiller B ถึงกำลังเสียหาย?", ja: "Chiller Bはなぜ故障しかけているのか？", zh: "Chiller B为何即将故障？" },
  "What's the RUL of Stamping Press 03?": { th: "RUL ของ Stamping Press 03 คือเท่าไร?", ja: "Stamping Press 03のRULは？", zh: "Stamping Press 03的RUL是多少？" },
  "Recommend maintenance for this week": { th: "แนะนำการซ่อมบำรุงสำหรับสัปดาห์นี้", ja: "今週の保全を推奨して", zh: "推荐本周的维护" },
  "Explain the vibration alarm on Air Comp 10": { th: "อธิบา·ารเตือนการสั่นสะเทือนของ Air Comp 10", ja: "Air Comp 10の振動警報を説明して", zh: "解释Air Comp 10的振动报警" },
  "Which assets should I service first?": { th: "ควรซ่อมบำรุงสินทรัพย์ใดก่อน?", ja: "どの資産を先に整備すべき？", zh: "应先保养哪些资产？" },

  // —— generic view (bespoke strings) ——
  "runs on the live asset model (vibration · thermal · current fusion). Ask the Asset Copilot to generate this analysis.": {
    th: "ทำงานบนโมเดลสินทรัพย์แบบสด (รวมข้อมูลการสั่นสะเทือน · ความร้อน · กระแส) · ขอให้ผู้ช่วยสินทรัพย์สร้างการวิเคราะห์นี้ได้",
    ja: "ライブ資産モデル（振動 · 熱 · 電流のフュージョン）で稼働。この分析の生成は資産コパイロットに依頼してください。",
    zh: "运行于实时资产模型（振动 · 热 · 电流融合）。可请资产副驾驶生成此分析。",
  },
  "Ask AI about": { th: "ถาม AI เกี่ยวกับ", ja: "AIに質問:", zh: "向AI询问" },

  // —— generic view leaf labels (from lib/asset.ts, rendered via tr) ——
  "AI Executive Summary": { th: "สรุปสำหรับผู้บริหารโดย AI", ja: "AIエグゼクティブサマリー", zh: "AI高管摘要" },
  "Real-time Status": { th: "สถานะเรียลไทม์", ja: "リアルタイム状態", zh: "实时状态" },
  "Vibration": { th: "การสั่นสะเทือน", ja: "振動", zh: "振动" },
  "Temperature": { th: "อุณหภูมิ", ja: "温度", zh: "温度" },
  "Current": { th: "กระแส", ja: "電流", zh: "电流" },
  "Remaining Useful Life (RUL)": { th: "อายุการใช้งานคงเหลือ (RUL)", ja: "残存有効寿命 (RUL)", zh: "剩余使用寿命 (RUL)" },
  "Root Cause Analysis": { th: "การวิเคราะห์สาเหตุที่แท้จริง", ja: "根本原因分析", zh: "根因分析" },
  "Maintenance History": { th: "ประวัติการซ่อมบำรุง", ja: "保全履歴", zh: "维护历史" },
  "Work Orders": { th: "ใบสั่งงาน", ja: "作業指示", zh: "工单" },
  "PM Schedule": { th: "ตารางบำรุงรักษาเชิงป้องกัน", ja: "予防保全スケジュール", zh: "预防维护计划" },
  "Risk Ranking": { th: "การจัดอันดับความเสี่ยง", ja: "リスクランキング", zh: "风险排名" },
  "Financial Impact": { th: "ผลกระทบทางการเงิน", ja: "財務影響", zh: "财务影响" },
  "Recommended Actions": { th: "การดำเนินการที่แนะนำ", ja: "推奨アクション", zh: "建议措施" },
  "Ask Asset AI": { th: "ถาม AI สินทรัพย์", ja: "資産AIに質問", zh: "询问资产AI" },
  "Failure Explanation": { th: "คำอธิบายความเสียหาย", ja: "故障の説明", zh: "故障说明" },
  "Maintenance Recommendation": { th: "คำแนะนำการซ่อมบำรุง", ja: "保全の推奨", zh: "维护建议" },

  // —— generic view KPI labels (from lib/asset.ts, rendered via tr) ——
  "Avg Vibration": { th: "การสั่นสะเทือนเฉลี่ย", ja: "平均振動", zh: "平均振动" },
  "Highest": { th: "สูงสุด", ja: "最高", zh: "最高" },
  "Over Alarm": { th: "เกินเกณฑ์เตือน", ja: "警報超過", zh: "超报警" },
  "Avg Temp": { th: "อุณหภูมิเฉลี่ย", ja: "平均温度", zh: "平均温度" },
  "Over Limit": { th: "เกินลิมิต", ja: "上限超過", zh: "超限" },
  "Total Draw": { th: "การใช้ไฟรวม", ja: "総消費", zh: "总耗电" },
  "Imbalanced": { th: "ไม่สมดุล", ja: "不平衡", zh: "不平衡" },
  "Highest Prob": { th: "โอกาสสูงสุด", ja: "最高確率", zh: "最高概率" },
  "Soonest": { th: "เร็วที่สุด", ja: "最短", zh: "最快" },
  "Assets w/ RUL": { th: "สินทรัพย์ที่มี RUL", ja: "RULを持つ資産", zh: "有RUL的资产" },
  "Min RUL": { th: "RUL ต่ำสุด", ja: "最小RUL", zh: "最小RUL" },
  "Avg RUL": { th: "RUL เฉลี่ย", ja: "平均RUL", zh: "平均RUL" },
  "Top Cause": { th: "สาเหตุหลัก", ja: "主要原因", zh: "主要原因" },
  "Bearing wear": { th: "แบริ่งสึกหรอ", ja: "軸受摩耗", zh: "轴承磨损" },
  "Share": { th: "สัดส่วน", ja: "割合", zh: "占比" },
  "Addressable": { th: "แก้ไขได้", ja: "対処可能", zh: "可处理" },
  "WOs · 30d": { th: "ใบสั่งงาน · 30 วัน", ja: "作業指示 · 30日", zh: "工单 · 30天" },
  "Due · 7d": { th: "ครบกำหนด · 7 วัน", ja: "期限 · 7日", zh: "到期 · 7天" },
  "Overdue": { th: "เกินกำหนด", ja: "期限超過", zh: "逾期" },
  "Compliance": { th: "การปฏิบัติตาม", ja: "適合率", zh: "合规率" },
  "Health Avg": { th: "สุขภาพเฉลี่ย", ja: "平均ヘルス", zh: "平均健康度" },
  "Top Risk": { th: "ความเสี่ยงสูงสุด", ja: "最大リスク", zh: "最高风险" },
  "Recoverable": { th: "กู้คืนได้", ja: "回収可能", zh: "可回收" },
  "Actions": { th: "การดำเนินการ", ja: "アクション", zh: "措施" },
  "Est. Saving": { th: "ประหยัดโดยประมาณ", ja: "推定削減", zh: "预计节省" },
  "Auto-applicable": { th: "ใช้อัตโนมัติได้", ja: "自動適用可", zh: "可自动应用" },
};
