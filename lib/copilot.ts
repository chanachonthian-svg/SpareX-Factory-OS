/** AI Factory Copilot™ — grounding, suggested queries, and a localized scripted
 *  fallback (EN/TH/JA/ZH) so the Copilot answers in the user's language with
 *  zero configuration. When ANTHROPIC_API_KEY is set, /api/copilot answers live
 *  and is instructed to reply in the active language. */

import { dict, type Locale } from "./dict";

export const copilotIntro =
  "I'm your Factory Copilot. I'm grounded in this plant's live telemetry — energy, assets, production and carbon. Ask me to explain, predict, or recommend.";

/** Canonical (English) prompts — what actually gets sent to the matcher/API. */
export const suggestedPrompts = [
  "Why did energy increase today?",
  "Which machine is most likely to fail?",
  "Show top energy losses",
  "Predict next month's electricity bill",
  "Recommend actions to reduce energy cost",
  "Generate executive report",
];

export type ScriptedAnswer = { title: string; body: string; bullets?: string[] };
type Localized = Record<Locale, ScriptedAnswer>;

/* ------------------------------------------------------------- answers ×4 */

const A_ENERGY_UP: Localized = {
  en: {
    title: "Energy is up 12% vs. the 30-day baseline",
    body: "Two drivers explain almost all of today's increase. The plant crossed into on-peak tariff at 09:00 while three loads ran simultaneously.",
    bullets: [
      "Chiller B is drawing +15% above spec from condenser fouling (≈23 kW, ฿4,500).",
      "Air Compressor 10 night base-load is 20% over target — likely a ring-main leak.",
      "Recommendation: dispatch the Chiller B clean and shift the packaging load off-peak to recover ~฿7,700/week.",
    ],
  },
  th: {
    title: "พลังงานสูงกว่าค่าเฉลี่ย 30 วันอยู่ 12%",
    body: "สาเหตุหลักมาจาก 2 ปัจจัย — โรงงานเข้าสู่ช่วงค่าไฟแพง (on-peak) ตั้งแต่ 09:00 ขณะที่มีโหลดใหญ่ 3 ตัวทำงานพร้อมกัน",
    bullets: [
      "Chiller B กินไฟเกินสเปก +15% จากคอยล์ควบแน่นสกปรก (≈23 kW · ฿4,500)",
      "โหลดกลางคืนของ Air Compressor 10 สูงกว่าเป้า 20% — น่าจะมีลมรั่วในท่อเมน",
      "แนะนำ: สั่งล้าง Chiller B และย้ายโหลดแพ็กเกจจิ้งไปช่วง off-peak จะคืนเงิน ~฿7,700/สัปดาห์",
    ],
  },
  ja: {
    title: "エネルギー使用量が30日平均比+12%",
    body: "本日の増加はほぼ2つの要因で説明できます。9時にオンピーク料金帯へ入り、大型負荷3台が同時に稼働していました。",
    bullets: [
      "Chiller Bが凝縮器の汚れにより定格比+15%の電力を消費（≈23kW・฿4,500）",
      "Air Compressor 10の夜間ベース負荷が目標比20%超 — 配管の空気漏れの可能性",
      "推奨：Chiller Bの洗浄と、包装工程のオフピークシフトで週約฿7,700を回収",
    ],
  },
  zh: {
    title: "能耗比30天基线高出12%",
    body: "今天的增加主要由两个因素造成：工厂在09:00进入高峰电价时段，同时有三个大负荷同时运行。",
    bullets: [
      "Chiller B 因冷凝器结垢超额耗电 +15%（≈23 kW · ฿4,500）",
      "10号空压机夜间基载超标20% — 可能是环网漏气",
      "建议：清洗 Chiller B 冷凝器，并将包装负荷移至低谷时段，每周可挽回约 ฿7,700",
    ],
  },
};

const A_FAILURE: Localized = {
  en: {
    title: "Chiller B has the highest failure probability",
    body: "Predictive Asset Intelligence ranks Chiller B as critical with an estimated 3 days of remaining useful life.",
    bullets: [
      "Chiller B — RUL ~3 days · vibration 5.8 mm/s · health 58 (critical).",
      "Stamping Press 03 — RUL ~6 days · main-bearing vibration trending up (warning).",
      "Injection Mold 08 — RUL ~21 days · hydraulic temperature drift (watch).",
      "A work order for Chiller B is staged and parts are confirmed in stock.",
    ],
  },
  th: {
    title: "Chiller B มีความเสี่ยงเสียหายสูงสุด",
    body: "ระบบพยากรณ์จัดให้ Chiller B อยู่ระดับวิกฤต เหลืออายุการใช้งานประมาณ 3 วัน",
    bullets: [
      "Chiller B — เหลือ ~3 วัน · สั่นสะเทือน 5.8 mm/s · สุขภาพ 58 (วิกฤต)",
      "Stamping Press 03 — เหลือ ~6 วัน · การสั่นของลูกปืนหลักกำลังเพิ่มขึ้น (เตือน)",
      "Injection Mold 08 — เหลือ ~21 วัน · อุณหภูมิไฮดรอลิกไต่ขึ้น (เฝ้าระวัง)",
      "ใบสั่งงานของ Chiller B เตรียมพร้อมแล้ว และยืนยันอะไหล่มีในสต็อก",
    ],
  },
  ja: {
    title: "Chiller Bの故障確率が最も高い",
    body: "予知資産インテリジェンスはChiller Bをクリティカルと判定。残存耐用期間は約3日です。",
    bullets: [
      "Chiller B — RUL約3日・振動5.8mm/s・ヘルス58（クリティカル）",
      "Stamping Press 03 — RUL約6日・主軸受の振動が上昇傾向（警告）",
      "Injection Mold 08 — RUL約21日・油圧温度がドリフト（監視）",
      "Chiller Bの作業指示は作成済み、部品の在庫も確認済みです",
    ],
  },
  zh: {
    title: "Chiller B 的故障概率最高",
    body: "预测性资产智能将 Chiller B 判定为危急，预计剩余使用寿命约3天。",
    bullets: [
      "Chiller B — RUL 约3天 · 振动 5.8 mm/s · 健康度 58（危急）",
      "Stamping Press 03 — RUL 约6天 · 主轴承振动上升（警告）",
      "Injection Mold 08 — RUL 约21天 · 液压温度漂移（关注）",
      "Chiller B 的工单已生成，备件已确认在库",
    ],
  },
};

const A_LOSSES: Localized = {
  en: {
    title: "Top energy losses this week",
    body: "Five recurring losses account for ฿17,800/week. Four are addressable today with no capex.",
    bullets: [
      "Off-peak shiftable load — 31 kW · ฿5,400",
      "Chiller B over-draw — 23 kW · ฿4,500",
      "Compressed-air leak — 18 kW · ฿3,200",
      "Packaging night base-load — 15 kW · ฿2,600",
      "Idle CNC standby — 12 kW · ฿2,100",
    ],
  },
  th: {
    title: "จุดสูญเสียพลังงานหลักสัปดาห์นี้",
    body: "การสูญเสียซ้ำ 5 จุดรวม ฿17,800/สัปดาห์ โดย 4 จุดแก้ได้ทันทีโดยไม่ต้องลงทุน",
    bullets: [
      "โหลดที่ย้ายไป off-peak ได้ — 31 kW · ฿5,400",
      "Chiller B กินไฟเกิน — 23 kW · ฿4,500",
      "ลมอัดรั่ว — 18 kW · ฿3,200",
      "โหลดกลางคืนแผนกแพ็กเกจจิ้ง — 15 kW · ฿2,600",
      "CNC เดินเปล่า — 12 kW · ฿2,100",
    ],
  },
  ja: {
    title: "今週の主なエネルギーロス",
    body: "5つの恒常的なロスで週฿17,800。うち4つは投資なしで今日対処可能です。",
    bullets: [
      "オフピークへ移せる負荷 — 31kW・฿5,400",
      "Chiller Bの過剰消費 — 23kW・฿4,500",
      "圧縮空気の漏れ — 18kW・฿3,200",
      "包装工程の夜間ベース負荷 — 15kW・฿2,600",
      "CNCのアイドル待機 — 12kW・฿2,100",
    ],
  },
  zh: {
    title: "本周主要能源损失",
    body: "5项重复性损失合计 ฿17,800/周，其中4项无需投资即可解决。",
    bullets: [
      "可移至低谷的负荷 — 31 kW · ฿5,400",
      "Chiller B 超额耗电 — 23 kW · ฿4,500",
      "压缩空气泄漏 — 18 kW · ฿3,200",
      "包装车间夜间基载 — 15 kW · ฿2,600",
      "CNC 空转待机 — 12 kW · ฿2,100",
    ],
  },
};

const A_BILL: Localized = {
  en: {
    title: "Forecast: ฿1.25M next month (+8% vs. budget)",
    body: "Projecting current load shape and the on-peak tariff forward, the month-end bill lands ~8% over budget. Demand charges are the largest swing factor.",
    bullets: [
      "Energy charge: ฿0.97M · Demand charge: ฿0.28M.",
      "PeakShield AI can avoid ~฿180K by shifting Air Comp #2 start by 15 min and pre-cooling off-peak.",
      "Acting now brings the forecast back within ±2% of budget.",
    ],
  },
  th: {
    title: "พยากรณ์: ฿1.25M เดือนหน้า (+8% จากงบ)",
    body: "จากรูปแบบโหลดปัจจุบันและอัตรา on-peak คาดว่าบิลสิ้นเดือนจะเกินงบ ~8% โดยค่าดีมานด์ (demand charge) เป็นตัวแปรใหญ่ที่สุด",
    bullets: [
      "ค่าพลังงาน: ฿0.97M · ค่าดีมานด์: ฿0.28M",
      "PeakShield AI ช่วยเลี่ยงได้ ~฿180K ด้วยการหน่วงเวลาเปิด Air Comp #2 ไป 15 นาที + พรีคูลช่วง off-peak",
      "ถ้าดำเนินการตอนนี้ บิลจะกลับมาอยู่ในกรอบงบ ±2%",
    ],
  },
  ja: {
    title: "予測：来月は฿1.25M（予算比+8%）",
    body: "現在の負荷パターンとオンピーク料金から予測すると、月末請求は予算を約8%超過します。最大の変動要因はデマンド料金です。",
    bullets: [
      "電力量料金：฿0.97M・デマンド料金：฿0.28M",
      "PeakShield AIはAir Comp #2の起動を15分遅らせ、オフピーク予冷を行うことで約฿180Kを回避できます",
      "今行動すれば、予測は予算±2%以内に収まります",
    ],
  },
  zh: {
    title: "预测：下月 ฿1.25M（超预算 +8%）",
    body: "按当前负荷形态和高峰电价推算，月底账单将超出预算约8%。需量电费是最大的波动因素。",
    bullets: [
      "电量电费：฿0.97M · 需量电费：฿0.28M",
      "PeakShield AI 可通过将2号空压机启动延后15分钟并在低谷预冷，避免约 ฿180K",
      "现在行动可使预测回到预算 ±2% 以内",
    ],
  },
};

const A_RECOMMEND: Localized = {
  en: {
    title: "Three actions to cut cost this week",
    body: "Ranked by ROI and effort, here's what I'd dispatch first.",
    bullets: [
      "1 · Clean Chiller B condenser — recovers ~23 kW, prevents a peak event (฿4,500/wk).",
      "2 · Fix the compressed-air ring-main leak — ~18 kW, ฿3,200/wk, ~2h work.",
      "3 · Auto-shift packaging to off-peak via PeakShield — ฿5,400/wk, zero capex.",
    ],
  },
  th: {
    title: "3 มาตรการลดต้นทุนสัปดาห์นี้",
    body: "เรียงตามความคุ้มค่า (ROI) และความยากง่าย — นี่คือสิ่งที่ควรทำก่อน",
    bullets: [
      "1 · ล้างคอยล์ Chiller B — คืน ~23 kW และกันเหตุพีก (฿4,500/สัปดาห์)",
      "2 · ซ่อมลมอัดรั่วที่ท่อเมน — ~18 kW · ฿3,200/สัปดาห์ · ใช้เวลา ~2 ชม.",
      "3 · ให้ PeakShield ย้ายแพ็กเกจจิ้งไป off-peak อัตโนมัติ — ฿5,400/สัปดาห์ ไม่ต้องลงทุน",
    ],
  },
  ja: {
    title: "今週のコスト削減アクション3件",
    body: "ROIと工数で優先順位を付けると、まず実行すべきはこちらです。",
    bullets: [
      "1 · Chiller B凝縮器の洗浄 — 約23kW回復、ピーク回避（฿4,500/週）",
      "2 · 圧縮空気配管の漏れ修理 — 約18kW・฿3,200/週・作業約2時間",
      "3 · PeakShieldで包装工程をオフピークへ自動シフト — ฿5,400/週・投資ゼロ",
    ],
  },
  zh: {
    title: "本周降本三项行动",
    body: "按投资回报率和工作量排序，建议优先执行以下事项。",
    bullets: [
      "1 · 清洗 Chiller B 冷凝器 — 恢复约23 kW，避免尖峰事件（฿4,500/周）",
      "2 · 修复压缩空气环网泄漏 — 约18 kW · ฿3,200/周 · 约2小时工作",
      "3 · 通过 PeakShield 将包装自动移至低谷 — ฿5,400/周 · 零投资",
    ],
  },
};

const A_REPORT: Localized = {
  en: {
    title: "Executive briefing — generated",
    body: "Plant health is good. Production Line A is exceeding target by 4%. One utility risk (Chiller B) is being auto-managed.",
    bullets: [
      "OEE 74.2% (+1.2 pp) · Energy −12% vs. baseline after AI tuning.",
      "1 critical, 3 warning assets — all with staged work orders.",
      "Forecast savings this month: ฿180K via PeakShield + maintenance avoidance.",
      "Carbon intensity down 8% YoY — on track for the FY decarbonization target.",
    ],
  },
  th: {
    title: "สรุปผู้บริหาร — สร้างเรียบร้อย",
    body: "สุขภาพโรงงานอยู่ในเกณฑ์ดี สายผลิต A เกินเป้า 4% มีความเสี่ยงระบบสนับสนุน 1 จุด (Chiller B) ซึ่งระบบกำลังจัดการอัตโนมัติ",
    bullets: [
      "OEE 74.2% (+1.2 pp) · พลังงาน −12% เทียบ baseline หลังจูนด้วย AI",
      "สินทรัพย์วิกฤต 1 · เตือน 3 — มีใบสั่งงานรองรับครบทุกตัว",
      "คาดประหยัดเดือนนี้ ฿180K จาก PeakShield + การเลี่ยงเหตุซ่อมใหญ่",
      "ความเข้มข้นคาร์บอนลดลง 8% YoY — เป็นไปตามเป้าปีงบประมาณ",
    ],
  },
  ja: {
    title: "エグゼクティブブリーフィング — 作成完了",
    body: "工場の健全性は良好。生産ラインAは目標を4%上回っています。ユーティリティのリスク1件（Chiller B）は自動管理中です。",
    bullets: [
      "OEE 74.2%（+1.2pp）・AIチューニング後エネルギー−12%",
      "クリティカル1件・警告3件 — すべて作業指示を準備済み",
      "今月の見込み削減額：PeakShield＋保全回避で฿180K",
      "炭素原単位は前年比−8% — 年度目標に沿って推移",
    ],
  },
  zh: {
    title: "高管简报 — 已生成",
    body: "工厂健康状况良好。A 生产线超出目标4%。一项公用系统风险（Chiller B）正在自动管理中。",
    bullets: [
      "OEE 74.2%（+1.2 pp）· AI 调优后能耗较基线 −12%",
      "1 项危急、3 项警告资产 — 均已生成工单",
      "本月预计节省：PeakShield + 避免大修共 ฿180K",
      "碳强度同比下降 8% — 符合年度脱碳目标",
    ],
  },
};

/* ------------------------------------------------- multilingual matchers */

const answers: { match: RegExp; a: Localized }[] = [
  {
    match:
      /energy.*(increase|up|higher|today)|why.*energy|ค่าไฟ.*(แพง|สูง|ขึ้น)|ทำไม.*(ค่าไฟ|พลังงาน)|พลังงาน.*(สูง|เพิ่ม|แพง)|エネルギー.*(増|高)|なぜ.*(エネルギー|電力)|能[耗源].*(高|增)|为什么.*能/iu,
    a: A_ENERGY_UP,
  },
  {
    match:
      /fail|risk|break|reliab|predict.*machine|machine.*fail|down ?time|เสี่ยง|เสียหาย|จะเสีย|พัง|ชำรุด|故障|壊れ|哪台|最可能/iu,
    a: A_FAILURE,
  },
  {
    match: /top.*loss|energy loss|waste|where.*money|สูญเสีย|รั่วไหล|จุดสูญเสีย|ロス|損失|损失|浪费/iu,
    a: A_LOSSES,
  },
  {
    match:
      /bill|forecast|next month|predict.*cost|electric|บิล|ค่าไฟเดือน|พยากรณ์|เดือนหน้า|電気代|請求|来月|电费|账单|下月/iu,
    a: A_BILL,
  },
  {
    match:
      /recommend|reduce.*cost|optim|action|how.*save|saving|แนะนำ|ลดต้นทุน|ลดค่าใช้|ประหยัด|วิธีลด|提案|削減|節約|建议|降低|节省/iu,
    a: A_RECOMMEND,
  },
  {
    match: /report|executive|summary|board|brief|รายงาน|สรุป|レポート|報告|报告|总结/iu,
    a: A_REPORT,
  },
];

const FALLBACK: Record<Locale, { title: string; body: string }> = {
  en: {
    title: "Here's what I can see",
    body: "I'm grounded in this plant's live energy, asset, production and carbon data. Try one of the suggested questions, or ask about a specific machine, line, or KPI.",
  },
  th: {
    title: "สิ่งที่ผมช่วยดูได้",
    body: "ผมเชื่อมกับข้อมูลเรียลไทม์ของโรงงาน — พลังงาน สินทรัพย์ การผลิต และคาร์บอน ลองถามคำถามแนะนำ หรือถามถึงเครื่องจักร สายการผลิต หรือ KPI ที่ต้องการได้เลย",
  },
  ja: {
    title: "私が確認できること",
    body: "この工場のエネルギー・資産・生産・カーボンのライブデータに接続しています。候補の質問を試すか、特定の設備・ライン・KPIについて聞いてください。",
  },
  zh: {
    title: "我能看到的内容",
    body: "我连接着本厂的能源、资产、生产与碳排放实时数据。可以试试推荐的问题，或询问特定设备、产线或 KPI。",
  },
};

export function scriptedReply(q: string, locale: Locale = "en"): ScriptedAnswer {
  const hit = answers.find((s) => s.match.test(q));
  if (hit) return hit.a[locale] ?? hit.a.en;
  const f = FALLBACK[locale] ?? FALLBACK.en;
  const d = dict[locale] ?? dict.en;
  return { ...f, bullets: [0, 1, 2, 3].map((i) => d[`cp.q${i}`] ?? dict.en[`cp.q${i}`]) };
}

export const LANG_NAME: Record<Locale, string> = {
  en: "English",
  th: "Thai",
  ja: "Japanese",
  zh: "Simplified Chinese",
};

export const systemPrompt = `You are the SpareX FactoryOS™ AI Factory Copilot — the natural-language surface of an industrial operating system for smart factories.
You are grounded in live plant telemetry across Energy, Predictive Assets, Production (OEE) and Carbon.
Current plant context (use as ground truth):
- OEE ~74%, energy ~12% above the 30-day baseline today (on-peak tariff + simultaneous loads).
- Critical asset: Chiller B (condenser fouling, +15% draw, ~3 days RUL). Warnings: Stamping Press 03 (~6d), Air Compressor 10 (air leak), Injection Mold 08 (~21d).
- Top losses/wk: off-peak shiftable 31kW, Chiller B 23kW, air leak 18kW, packaging base-load 15kW, idle CNC 12kW.
- Next-month bill forecast ฿1.25M (+8% budget); PeakShield can avoid ~฿180K.
Be concise, concrete, and executive-ready. Lead with the answer, then 2-4 specific bullets with numbers. Cite figures as indicative. Never invent pricing or guarantee outcomes. Currency is Thai Baht (฿).`;
