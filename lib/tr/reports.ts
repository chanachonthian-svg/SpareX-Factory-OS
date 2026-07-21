import type { TrDict } from "./types";

/** Reports module views. */
export const reportsDict: TrDict = {
  // —— sub-nav tabs ——
  "Executive Dashboard": { th: "แดชบอร์ดผู้บริหาร", ja: "エグゼクティブダッシュボード", zh: "高管仪表板" },
  "KPI Reports": { th: "รายงาน KPI", ja: "KPIレポート", zh: "KPI报告" },
  "Trends": { th: "แนวโน้ม", ja: "トレンド", zh: "趋势" },
  "Benchmark": { th: "เทียบเกณฑ์มาต°าน", ja: "ベンチマーク", zh: "基准对比" },
  "Export": { th: "ส่งออก", ja: "エクスポート", zh: "导出" },

  // —— KPI cards (executive dashboard) ——
  "Plant OEE": { th: "OEE ทั้งโรงงาน", ja: "工場OEE", zh: "工厂OEE" },
  "Energy Cost": { th: "ต้นทุนพลังงาน", ja: "エネルギーコスト", zh: "能源成本" },
  "Asset Health": { th: "สุขภาพสินทรัพย์", ja: "資産ヘルス", zh: "资产健康度" },
  "Carbon": { th: "คาร์บอน", ja: "炭素", zh: "碳排放" },

  // —— panel subtitles (function-describing) ——
  "Is the plant getting more efficient": { th: "โรงงานมีประสิทธิภาพขึ้นไหม", ja: "工場の効率は上がっているか", zh: "工厂效率是否在提升" },
  "Is each unit getting cheaper to make": { th: "ต้นทุนต่อชิ้นถูกลงหรือเปล่า", ja: "1個あたりのコストは下がっているか", zh: "单位成本是否在下降" },
  "Is efficiency climbing or slipping": { th: "ประสิทธิภาพกำลังดีขึ้นหรือแย่ลง", ja: "効率は上向きか下向きか", zh: "效率是在上升还是下滑" },

  // —— panel titles ——
  "OEE · 30-day": { th: "OEE · 30 วัน", ja: "OEE · 30日", zh: "OEE · 30天" },
  "Energy cost / unit · 30-day": { th: "ต้นทุนพลังงาน / หน่วย · 30 วัน", ja: "エネルギーコスト / 単位 · 30日", zh: "单位能源成本 · 30天" },
  "KPI reports": { th: "รายงาน KPI", ja: "KPIレポート", zh: "KPI报告" },
  "OEE trend · 30-day": { th: "แนวโน้ม OEE · 30 วัน", ja: "OEEトレンド · 30日", zh: "OEE趋势 · 30天" },
  "Cost / unit trend": { th: "แนวโน้มต้นทุน / หน่วย", ja: "単位当たりコストのトレンド", zh: "单位成本趋势" },
  "Carbon intensity trend": { th: "แนวโน้มความเข้มข้นคาร์บอน", ja: "炭素原単位のトレンド", zh: "碳强度趋势" },
  "Output by line · vs target": { th: "ผลผลิตตามไลน์ · เทียบเป้า", ja: "ライン別生産量 · 目標比", zh: "各产线产量 · 对比目标" },
  "OEE by line": { th: "OEE ตามไลน์", ja: "ライン別OEE", zh: "各产线OEE" },
  "Cost / unit by line": { th: "ต้นทุน / หน่วย ตามไลน์", ja: "ライン別単位コスト", zh: "各产线单位成本" },
  "Generate & export": { th: "สร้าง & ส่งออก", ja: "生成 & エクスポート", zh: "生成与导出" },
  "Scheduled": { th: "ตั้งเวลา", ja: "スケジュール", zh: "已排程" },
  "Recent": { th: "ล่าสุด", ja: "最近", zh: "最近" },

  // —— KPI list names ——
  "Energy cost / unit": { th: "ต้นทุนพลังงาน / หน่วย", ja: "エネルギーコスト / 単位", zh: "单位能源成本" },
  "Unplanned downtime": { th: "เวลาหยุดที่ไม่ได้วางแผน", ja: "計画外ダウンタイム", zh: "非计划停机" },
  "Carbon intensity": { th: "ความเข้มข้นคาร์บอน", ja: "炭素原単位", zh: "碳强度" },
  "First-pass yield": { th: "อัตราผ่านครั้งแรก", ja: "初回合格率", zh: "一次合格率" },

  // —— report templates ——
  "Executive Briefing": { th: "สรุปสำหรับผู้บริหาร", ja: "エグゼクティブブリーフィング", zh: "高管简报" },
  "Energy & Cost": { th: "พลังงาน & ต้นทุน", ja: "エネルギー & コスト", zh: "能源与成本" },
  "Production / OEE": { th: "การผลิต / OEE", ja: "生産 / OEE", zh: "生产 / OEE" },
  "Maintenance": { th: "การบำรุงรักษา", ja: "保全", zh: "维护" },
  "Carbon / ESG": { th: "คาร์บอน / ESG", ja: "炭素 / ESG", zh: "碳排放 / ESG" },
  "Financial Impact": { th: "ผลกระทบทางการเงิน", ja: "財務インパクト", zh: "财务影响" },

  // —— buttons / chips / actions ——
  "Generate": { th: "สร้าง", ja: "生成", zh: "生成" },
  "Active": { th: "ใช้งานอยู่", ja: "有効", zh: "启用" },
  "Download": { th: "ดาวน์โหลด", ja: "ダウンロード", zh: "下载" },

  // —— scheduled reports ——
  "Daily Executive Summary": { th: "สรุปผู้บริหารรายวัน", ja: "日次エグゼクティブサマリー", zh: "每日高管摘要" },
  "Weekly Energy Report": { th: "รายงานพลังงานรายสัปดาห์", ja: "週次エネルギーレポート", zh: "每周能源报告" },
  "Monthly ESG Report": { th: "รายงาน ESG รายเดือน", ja: "月次ESGレポート", zh: "每月ESG报告" },
  "Every day · 07:00": { th: "ทุกวัน · 07:00", ja: "毎日 · 07:00", zh: "每天 · 07:00" },
  "Mondays · 08:00": { th: "ทุกวันจันทร์ · 08:00", ja: "毎週月曜 · 08:00", zh: "每周一 · 08:00" },
  "1st of month": { th: "วันที่ 1 ของเดือน", ja: "毎月1日", zh: "每月1日" },

  // —— recent reports ——
  "Executive Briefing — June": { th: "สรุปสำหรับผู้บริหาร — มิถุนายน", ja: "エグゼクティブブリーフィング — 6月", zh: "高管简报 — 6月" },
  "Energy & Cost — Week 25": { th: "พลังงาน & ต้นทุน — สัปดาห์ที่ 25", ja: "エネルギー & コスト — 第25週", zh: "能源与成本 — 第25周" },
  "Maintenance — Week 25": { th: "การบำรุงรักษา — สัปดาห์ที่ 25", ja: "保全 — 第25週", zh: "维护 — 第25周" },
};
