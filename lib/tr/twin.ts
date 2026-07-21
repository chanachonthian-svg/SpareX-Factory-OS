import type { TrDict } from "./types";

/** Digital Twin / Operational Twin module + DigitalTwin inspector. */
export const twinDict: TrDict = {
  // —— OperationalTwin sub-nav tab labels (GROUPS) ——
  "Factory View": { th: "มุมมองโรงงาน", ja: "工場ビュー", zh: "工厂视图" },
  "Process Flow": { th: "การไหลของกระบวนการ", ja: "プロセスフロー", zh: "工艺流程" },
  "Utilities": { th: "ระบบสาธารณูปโภค", ja: "ユーティリティ", zh: "公用工程" },
  "Heatmap": { th: "ฮีตแมป", ja: "ヒートマップ", zh: "热力图" },
  "Simulation": { th: "การจำลอง", ja: "シミュレーション", zh: "仿真" },

  // —— Factory overview view ——
  "Plant OEE": { th: "OEE ทั้งโรงงาน", ja: "工場OEE", zh: "全厂OEE" },
  "Total Power": { th: "กำลังไฟรวม", ja: "総電力", zh: "总功率" },
  "Avg Health": { th: "สุขภาพเฉลี่ย", ja: "平均ヘルス", zh: "平均健康度" },
  "Carbon · Now": { th: "คาร์บอน · ปัจจุบัน", ja: "カーボン · 現在", zh: "碳排 · 当前" },
  "Healthy": { th: "ปกติ", ja: "正常", zh: "健康" },
  "Warning": { th: "เตือน", ja: "警告", zh: "警告" },
  "Critical": { th: "วิกฤต", ja: "重大", zh: "严重" },
  "assets streaming": { th: "กำลังสตรีมข้อมูล", ja: "資産をストリーミング中", zh: "台资产实时传输" },
  "Production Hall": { th: "โรงผลิต", ja: "生産ホール", zh: "生产车间" },
  "Facility & Utility": { th: "อาคารและระบบสนับสนุน", ja: "施設・ユーティリティ", zh: "设施与公用工程" },
  "machines · avg OEE": { th: "เครื่องจักร · OEE เฉลี่ย", ja: "台 · 平均OEE", zh: "台设备 · 平均OEE" },

  // —— generic / shared ——
  "assets": { th: "สินทรัพย์", ja: "資産", zh: "资产" },
  "Production": { th: "การผลิต", ja: "生産", zh: "生产" },
  "Facility": { th: "อาคารสถานที่", ja: "施設", zh: "设施" },
  "Financial": { th: "การเงิน", ja: "財務", zh: "财务" },

  // —— Production twin view ——
  "Production assets": { th: "สินทรัพย์การผลิต", ja: "生産資産", zh: "生产资产" },

  // —— Energy twin view ——
  "Total Draw": { th: "การใช้ไฟรวม", ja: "総消費電力", zh: "总用电" },
  "Which machines pull the most power": { th: "เครื่องไหนกินไฟมากสุด", ja: "電力を最も使う設備はどれか", zh: "哪些设备用电最多" },

  // —— Asset twin view ——
  "Asset health register": { th: "สุขภาพเครื่องจักรทั้งหมด", ja: "資産ヘルス台帳", zh: "资产健康台账" },
  "Asset": { th: "สินทรัพย์", ja: "資産", zh: "资产" },
  "Status": { th: "สถานะ", ja: "状態", zh: "状态" },
  "Health": { th: "สุขภาพ", ja: "ヘルス", zh: "健康度" },
  "Vib": { th: "การสั่น", ja: "振動", zh: "振动" },

  // —— Utility twin view ——
  "Utility Power": { th: "กำลังไฟระบบสนับสนุน", ja: "ユーティリティ電力", zh: "公用工程功率" },
  "Utility Assets": { th: "สินทรัพย์ระบบสนับสนุน", ja: "ユーティリティ資産", zh: "公用工程资产" },
  "Needs Attention": { th: "ต้องดูแล", ja: "要対応", zh: "需关注" },
  "Facility & Utility systems": { th: "ระบบอาคารและสนับสนุน", ja: "施設・ユーティリティ設備", zh: "设施与公用工程系统" },

  // —— Carbon twin view ——
  "Total CO₂": { th: "CO₂ รวม", ja: "総CO₂", zh: "总CO₂" },
  "Where to cut CO₂ first": { th: "ควรลดคาร์บอนที่ไหนก่อน", ja: "どこからCO₂を削減すべきか", zh: "先从哪里减碳" },

  // —— Financial twin view ——
  "Risk Exposure": { th: "มูลค่าความเสี่ยง", ja: "リスクエクスポージャー", zh: "风险敞口" },
  "Savings Found": { th: "โอกาสประหยัดที่พบ", ja: "発見された節約", zh: "发现的节省" },
  "Energy Cost": { th: "ต้นทุนพลังงาน", ja: "エネルギーコスト", zh: "能源成本" },
  "What each open issue could cost": { th: "แต่ละปัญหาเสี่ยงเสียเงินเท่าไร", ja: "各問題でいくら失う可能性があるか", zh: "每个问题可能损失多少" },
  "Which assets cost the most to run": { th: "เครื่องไหนค่าไฟแพงสุด", ja: "運転コストが最も高い設備はどれか", zh: "哪些设备运行成本最高" },

  // —— Process flow twin view ——
  "Live power flow, grid to machine": { th: "ดูไฟไหลจากกริดถึงเครื่องจักร", ja: "系統から設備への電力の流れ", zh: "电网到设备的实时电力流" },
  "Grid": { th: "กริด", ja: "系統", zh: "电网" },
  "Substation": { th: "สถานีไฟฟ้าย่อย", ja: "変電所", zh: "变电站" },
  "Utility": { th: "ระบบสนับสนุน", ja: "ユーティリティ", zh: "公用工程" },
  "CNC / Robots": { th: "CNC / หุ่นยนต์", ja: "CNC / ロボット", zh: "CNC / 机器人" },
  "Press / Mold": { th: "Press / Mold", ja: "プレス / 金型", zh: "冲压 / 模具" },
  "Chillers / Air": { th: "Chillers / Air", ja: "チラー / エア", zh: "冷水机 / 空气" },

  // —— Heatmap view ——
  "Factory heatmap": { th: "ฮีตแมปโรงงาน", ja: "工場ヒートマップ", zh: "工厂热力图" },
  "Energy": { th: "พลังงาน", ja: "エネルギー", zh: "能源" },
  "Carbon": { th: "คาร์บอน", ja: "カーボン", zh: "碳排" },
  "Risk": { th: "ความเสี่ยง", ja: "リスク", zh: "风险" },
  "Good": { th: "ดี", ja: "良好", zh: "良好" },
  "Watch": { th: "เฝ้าระวัง", ja: "監視", zh: "关注" },

  // —— Simulation view ——
  "What-if scenario": { th: "สถานการณ์จำลอง", ja: "What-ifシナリオ", zh: "假设情景" },
  "Shift load to off-peak": { th: "ย้ายโหลดไปช่วงนอกพีค", ja: "負荷をオフピークへ移行", zh: "将负荷转移至非高峰" },
  "Reduce unplanned downtime": { th: "ลดการหยุดที่ไม่ได้วางแผน", ja: "計画外停止を削減", zh: "减少非计划停机" },
  "Cut idle waste": { th: "ตัดการสูญเสียจากการเดินเปล่า", ja: "アイドル浪費を削減", zh: "削减空转浪费" },
  "The twin replays current telemetry through your scenario to project monthly impact.": { th: "ทวินจะจำลองด้วยข้อมูลจริงตอนนี้ ตามสถานการณ์ที่คุณตั้ง เพื่อคาดผลกระทบรายเดือน", ja: "ツインは現在のテレメトリをシナリオで再生し、月次影響を予測します。", zh: "孪生体将当前遥测数据代入您的情景以预测每月影响。" },
  "Projected monthly impact": { th: "ผลกระทบรายเดือนที่คาดการณ์", ja: "予測月次影響", zh: "预计每月影响" },
  "Cost saving": { th: "ประหยัดต้นทุน", ja: "コスト削減", zh: "成本节省" },
  "CO₂ avoided": { th: "CO₂ ที่หลีกเลี่ยงได้", ja: "CO₂削減量", zh: "减少CO₂" },
  "OEE gain": { th: "OEE ที่เพิ่มขึ้น", ja: "OEE改善", zh: "OEE提升" },
  "Ask AI to plan the rollout": { th: "ให้ AI วางแผนการติดตั้งใช้งาน", ja: "AIに展開計画を依頼", zh: "让AI规划推行方案" },

  // —— AI insights view ——
  "What's worth acting on right now": { th: "สิ่งที่ควรลงมือทำตอนนี้", ja: "今すぐ対応すべきこと", zh: "现在最该处理的事" },
  "Ask the Copilot for the full picture": { th: "ถาม Copilot เพื่อดูภาพรวมทั้งหมด", ja: "全体像はCopilotに質問", zh: "向副驾驶询问全貌" },
  "Line B is the OEE bottleneck": { th: "ไลน์ B เป็นคอขวดของ OEE", ja: "ラインBがOEEのボトルネック", zh: "B线是OEE瓶颈" },
  "Changeover losses on Line B cost ~฿15k/day. Rebalancing to Line A recovers ~4 pts of plant OEE.": { th: "การสูญเสียตอนเปลี่ยนงานที่ไลน์ B คิดเป็น ~฿15k/วัน · ปรับสมดุลไปไลน์ A จะกู้ OEE ทั้งโรงงานได้ ~4 จุด", ja: "ラインBの段取りロスは約฿15k/日。ラインAへ再配分で工場OEEを約4pt回復。", zh: "B线换型损失约฿15k/天。重新分配至A线可恢复约4个百分点的全厂OEE。" },
  "Chiller B will likely fail in ~3 days": { th: "Chiller B มีแนวโน้มเสียใน ~3 วัน", ja: "Chiller Bは約3日で故障の可能性", zh: "Chiller B 可能在约3天内故障" },
  "Vibration + condenser fouling signature. A work order is staged with parts confirmed.": { th: "ลายเซ็นการสั่น + คอนเดนเซอร์อุดตัน · จัดเตรียมใบสั่งงานพร้อมยืนยันอะไหล่แล้ว", ja: "振動+凝縮器汚れの兆候。部品確定済みの作業指示を準備済み。", zh: "振动+冷凝器结垢特征。已备好工单并确认备件。" },
  "On-peak load drove cost +12% today": { th: "โหลดช่วงพีคทำให้ต้นทุนเพิ่ม +12% วันนี้", ja: "オンピーク負荷で本日コスト+12%", zh: "高峰负荷使今日成本+12%" },
  "Shifting packaging off-peak recovers ~฿7.7k/week with zero capex.": { th: "ย้ายงานแพ็กไปช่วงนอกพีคจะประหยัด ~฿7.7k/สัปดาห์ โดยไม่ต้องลงทุน", ja: "包装をオフピークへ移すと投資ゼロで約฿7.7k/週を回収。", zh: "将包装转至非高峰可零投资每周节省约฿7.7k。" },
  "Carbon intensity down 8% YoY": { th: "ความเข้มคาร์บอนลดลง 8% เทียบปีก่อน", ja: "カーボン原単位が前年比8%減", zh: "碳强度同比下降8%" },
  "Scope 2 reductions are on track for the FY decarbonization target.": { th: "การลด Scope 2 เป็นไปตามเป้าลดคาร์บอนของปีงบประมาณ", ja: "スコープ2削減は年度脱炭素目標に沿って進行中。", zh: "范围2减排按财年脱碳目标推进。" },
  "฿6.2M total risk exposure": { th: "ความเสี่ยงรวม ฿6.2M", ja: "総リスクエクスポージャー ฿6.2M", zh: "总风险敞口 ฿6.2M" },
  "Four open risks concentrate in utilities — addressing Chiller B removes the largest.": { th: "ความเสี่ยงที่เปิดอยู่สี่รายการกระจุกในระบบสนับสนุน — จัดการ Chiller B จะกำจัดตัวใหญ่สุด", ja: "4件の未対応リスクがユーティリティに集中 — Chiller B対応で最大を解消。", zh: "四项未决风险集中于公用工程 — 处理Chiller B可消除最大项。" },

  // —— Action center view ——
  "Action Center": { th: "ศูนย์ดำเนินการ", ja: "アクションセンター", zh: "操作中心" },
  "Cross-domain actions the AI can run — with approval": { th: "การดำเนินการข้ามโดเมนที่ AI ทำได้ — เมื่อได้รับอนุมัติ", ja: "AIが実行できる領域横断アクション — 承認付き", zh: "AI可执行的跨域操作 — 需审批" },
  "running": { th: "กำลังทำงาน", ja: "実行中", zh: "运行中" },
  "Running": { th: "กำลังทำงาน", ja: "実行中", zh: "运行中" },
  "Pending approval": { th: "รออนุมัติ", ja: "承認待ち", zh: "待审批" },
  "Suggested": { th: "แนะนำ", ja: "提案", zh: "建议" },
  "Pause": { th: "หยุดชั่วคราว", ja: "一時停止", zh: "暂停" },
  "Approve": { th: "อนุมัติ", ja: "承認", zh: "批准" },
  "Enable": { th: "เปิดใช้", ja: "有効化", zh: "启用" },
  "Guardrailed with a full audit trail. Critical actions always need approval.": { th: "มีการ์ดเรลและบันทึกตรวจสอบครบถ้วน · การดำเนินการวิกฤตต้องได้รับอนุมัติเสมอ", ja: "ガードレールと完全な監査証跡付き。重大アクションは常に承認が必要。", zh: "配备护栏及完整审计轨迹。关键操作始终需要审批。" },
  "Peak Load Shedding": { th: "การปลดโหลดช่วงพีค", ja: "ピーク負荷遮断", zh: "高峰甩负荷" },
  "Shed non-critical loads to stay under 3,000 kW.": { th: "ปลดโหลดที่ไม่วิกฤตเพื่อคุมไว้ต่ำกว่า 3,000 kW", ja: "重要でない負荷を遮断し3,000 kW未満に維持。", zh: "甩掉非关键负荷以保持低于3,000 kW。" },
  "Off-Peak Pre-Cooling": { th: "พรีคูลลิ่งช่วงนอกพีค", ja: "オフピークプレクーリング", zh: "非高峰预冷" },
  "Pre-cool chilled water during off-peak tariff.": { th: "พรีคูลน้ำเย็นในช่วงอัตราค่าไฟนอกพีค", ja: "オフピーク料金時に冷水を予冷。", zh: "在非高峰电价时段预冷冷冻水。" },
  "Stage Chiller B Work Order": { th: "จัดเตรียมใบสั่งงาน Chiller B", ja: "Chiller B作業指示を準備", zh: "准备Chiller B工单" },
  "Auto-create the predictive work order with parts.": { th: "สร้างใบสั่งงานเชิงพยากรณ์พร้อมอะไหล่อัตโนมัติ", ja: "部品付きの予知作業指示を自動作成。", zh: "自动创建含备件的预测性工单。" },
  "Rebalance Line B Load": { th: "ปรับสมดุลโหลดไลน์ B", ja: "ラインB負荷を再配分", zh: "重新平衡B线负荷" },
  "Move lots to Line A to lift OEE and cut changeover loss.": { th: "ย้ายล็อตไปไลน์ A เพื่อเพิ่ม OEE และลดการสูญเสียตอนเปลี่ยนงาน", ja: "ロットをラインAへ移しOEE向上・段取りロス削減。", zh: "将批次移至A线以提升OEE并减少换型损失。" },
  "Idle Auto-Standby": { th: "สแตนด์บายอัตโนมัติเมื่อเดินเปล่า", ja: "アイドル自動スタンバイ", zh: "空转自动待机" },
  "Put machines idling >15 min into standby.": { th: "ให้เครื่องที่เดินเปล่า >15 นาทีเข้าโหมดสแตนด์บาย", ja: "15分超アイドルの機械をスタンバイに。", zh: "将空转超15分钟的设备置于待机。" },
  "Maintenance": { th: "การบำรุงรักษา", ja: "保全", zh: "维护" },

  // —— Factory copilot view ——
  "Factory Copilot": { th: "Factory Copilot", ja: "ファクトリーコパイロット", zh: "工厂副驾驶" },
  "Ask the twin anything — grounded in live data": { th: "ถามทวินได้ทุกเรื่อง — อ้างอิงข้อมูลปัจจุบัน", ja: "ツインに何でも質問 — ライブデータに基づく", zh: "向孪生体提问任何事 — 基于实时数据" },
  "I have the whole plant modeled — production, energy, assets, carbon and finance. Ask me to explain, simulate, or recommend.": { th: "ฉันจำลองทั้งโรงงานไว้แล้ว — การผลิต พลังงาน สินทรัพย์ คาร์บอน และการเงิน · ถามให้อธิบาย จำลอง หรือแนะนำได้", ja: "工場全体をモデル化済み — 生産・エネルギー・資産・カーボン・財務。説明・シミュレーション・推奨をどうぞ。", zh: "我已建模整个工厂 — 生产、能源、资产、碳排与财务。可让我解释、模拟或推荐。" },
  "What's happening in the factory right now?": { th: "ตอนนี้เกิดอะไรขึ้นในโรงงานบ้าง?", ja: "工場で今何が起きていますか？", zh: "工厂现在正发生什么？" },
  "Which asset needs attention first?": { th: "สินทรัพย์ใดต้องดูแลก่อน?", ja: "最初に対応すべき資産は？", zh: "哪台资产需要优先关注？" },
  "Simulate shifting Line B to off-peak": { th: "จำลองการย้ายไลน์ B ไปช่วงนอกพีค", ja: "ラインBのオフピーク移行をシミュレート", zh: "模拟将B线转至非高峰" },
  "Show today's biggest financial risk": { th: "แสดงความเสี่ยงทางการเงินที่ใหญ่สุดของวันนี้", ja: "本日最大の財務リスクを表示", zh: "显示今日最大的财务风险" },
  "Ask the Factory Copilot…": { th: "ถาม Factory Copilot…", ja: "ファクトリーコパイロットに質問…", zh: "向工厂副驾驶提问…" },

  // —— DigitalTwin: layer switcher labels (twinLayers data) ——
  "Asset Health": { th: "สุขภาพสินทรัพย์", ja: "資産ヘルス", zh: "资产健康" },
  "Predictive Risk": { th: "ความเสี่ยงเชิงพยากรณ์", ja: "予知リスク", zh: "预测性风险" },
  "Energy Flow": { th: "การไหลของพลังงาน", ja: "エネルギーフロー", zh: "能量流" },

  // —— DigitalTwin: overlay / loading / hints ——
  "Initializing digital twin…": { th: "กำลังเริ่มต้นดิจิทัลทวิน…", ja: "デジタルツインを初期化中…", zh: "正在初始化数字孪生…" },
  "drag to rotate · scroll to zoom": { th: "ลากเพื่อหมุน · เลื่อนเพื่อซูม", ja: "ドラッグで回転 · スクロールでズーム", zh: "拖动旋转 · 滚动缩放" },
  "Fullscreen": { th: "ขยายเต็มจอ", ja: "全画面表示", zh: "全屏" },
  "Exit fullscreen": { th: "ออกจากเต็มจอ", ja: "全画面を終了", zh: "退出全屏" },
  "War-room mode": { th: "โหมด war-room", ja: "ウォールームモード", zh: "作战室模式" },
  "Auto-rotate · layers cycle every 8s": { th: "หมุนอัตโนมัติ · สลับเลเยอร์ทุก 8 วิ", ja: "自動回転 · 8秒ごとにレイヤー切替", zh: "自动旋转 · 每8秒切换图层" },

  // —— DigitalTwin: cost-burn layer ——
  "Cost Burn": { th: "เงินที่กำลังรั่ว", ja: "コスト損失", zh: "成本流失" },
  "฿ burning per hour, per asset": { th: "เงินที่รั่วต่อชั่วโมง รายเครื่อง", ja: "資産ごとの毎時損失額", zh: "每台设备每小时流失金额" },
  "Low burn": { th: "รั่วน้อย", ja: "低損失", zh: "低流失" },
  "High burn": { th: "รั่วมาก", ja: "高損失", zh: "高流失" },
  "colour = ฿/hr above healthy baseline": { th: "สี = ฿/ชม. ที่เกินจากสภาพเครื่องปกติ", ja: "色 = 正常時比の฿/時", zh: "颜色 = 高于正常基线的฿/小时" },
  "Plant burning now": { th: "โรงงานกำลังรั่วเงิน", ja: "工場の現在損失", zh: "工厂当前流失" },
  "per hr": { th: "ต่อ ชม.", ja: "毎時", zh: "每小时" },
  "per day": { th: "ต่อวัน", ja: "毎日", zh: "每天" },
  "Burn now": { th: "เงินรั่วตอนนี้", ja: "現在の損失", zh: "当前流失" },
  "/hr": { th: "/ชม.", ja: "/時", zh: "/时" },

  // —— DigitalTwin: legend labels ——
  "Low": { th: "ต่ำ", ja: "低", zh: "低" },
  "Medium": { th: "ปานกลาง", ja: "中", zh: "中" },
  "High CO₂": { th: "CO₂ สูง", ja: "CO₂高", zh: "CO₂高" },
  "Normal": { th: "ปกติ", ja: "正常", zh: "正常" },
  "Load rising": { th: "โหลดกำลังเพิ่ม", ja: "負荷上昇中", zh: "负荷上升" },
  "Over-draw": { th: "ดึงไฟเกิน", ja: "過負荷", zh: "过载" },
  "bar height = kW": { th: "ความสูงแท่ง = kW", ja: "バーの高さ = kW", zh: "柱高 = kW" },

  // —— DigitalTwin: inspector ——
  "Selected asset": { th: "สินทรัพย์ที่เลือก", ja: "選択中の資産", zh: "已选资产" },
  "Power": { th: "กำลังไฟ", ja: "電力", zh: "功率" },
  "Current": { th: "กระแส", ja: "電流", zh: "电流" },
  "Voltage L-L": { th: "แรงดัน L-L", ja: "線間電圧 L-L", zh: "线电压 L-L" },
  "Power Factor": { th: "เพาเวอร์แฟกเตอร์", ja: "力率", zh: "功率因数" },
  "Energy · today": { th: "พลังงาน · วันนี้", ja: "エネルギー · 本日", zh: "能耗 · 今日" },
  "Vibration": { th: "การสั่นสะเทือน", ja: "振動", zh: "振动" },
  "Temp": { th: "อุณหภูมิ", ja: "温度", zh: "温度" },
  "Predicted failure": { th: "คาดว่าจะเสีย", ja: "故障予測", zh: "预测故障" },
  "in ~": { th: "ในอีก ~", ja: "あと約", zh: "约还有 " },
  "days — AI recommends a work order now.": { th: "วัน — AI แนะนำให้ออกใบสั่งงานทันที", ja: "日 — AIは今すぐの作業指示を推奨。", zh: "天 — AI建议立即创建工单。" },
  "Click a machine in the 3D view": { th: "คลิกเครื่องจักรในมุมมอง 3D", ja: "3Dビューで機械をクリック", zh: "在3D视图中点击设备" },
  "Select any asset to inspect its live electrical parameters — power, current, voltage, PF and energy.": { th: "เลือกสินทรัพย์ใดก็ได้เพื่อตรวจพารามิเตอร์ไฟฟ้าปัจจุบัน — กำลังไฟ กระแส แรงดัน PF และพลังงาน", ja: "任意の資産を選択してライブ電気パラメータを確認 — 電力・電流・電圧・PF・エネルギー。", zh: "选择任意资产以查看其实时电气参数 — 功率、电流、电压、PF与能耗。" },
  "Select an asset to inspect.": { th: "เลือกสินทรัพย์เพื่อตรวจสอบ", ja: "検査する資産を選択してください。", zh: "请选择要检查的资产。" },
  "Factory floor": { th: "พื้นที่โรงงาน", ja: "工場フロア", zh: "车间现场" },
  "Main Distribution": { th: "ตู้จ่ายไฟหลัก", ja: "主配電盤", zh: "总配电" },
  "Floating labels": { th: "ป้ายข้อมูลลอย", ja: "フローティング表示", zh: "悬浮标签" },
  "Floating label of": { th: "ป้ายลอยของ", ja: "フローティング表示:", zh: "悬浮标签:" },
  "Apply to every machine": { th: "ใช้กับทุกเครื่อง", ja: "全機械に適用", zh: "应用到所有设备" },
  "Hide for this machine": { th: "ซ่อนของเครื่องนี้", ja: "この機械では非表示", zh: "隐藏此设备" },
  "Pick what floats above this machine": { th: "เลือกว่าจะให้อะไรลอยเหนือเครื่องนี้", ja: "この機械の上に表示する項目を選択", zh: "选择此设备上方显示的数据" },
};
