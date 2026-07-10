import type { Locale } from "./dict";

export type OpTwinTabId =
  | "overview"
  | "map"
  | "production"
  | "energy"
  | "asset"
  | "utility"
  | "carbon"
  | "financial"
  | "process"
  | "heatmap"
  | "simulation"
  | "insights"
  | "action"
  | "copilot";

export const opTwinTabs: {
  id: OpTwinTabId;
  icon: string;
  labels: Record<Locale, string>;
}[] = [
  { id: "overview", icon: "overview", labels: { en: "Factory Overview", th: "ภาพรวมโรงงาน", ja: "工場概要", zh: "工厂概览" } },
  { id: "map", icon: "map", labels: { en: "3D Factory Map", th: "แผนที่โรงงาน 3D", ja: "3Dファクトリーマップ", zh: "3D 工厂地图" } },
  { id: "production", icon: "production", labels: { en: "Production Twin", th: "ทวินการผลิต", ja: "生産ツイン", zh: "生产孪生" } },
  { id: "energy", icon: "energy", labels: { en: "Energy Twin", th: "ทวินพลังงาน", ja: "エネルギーツイン", zh: "能源孪生" } },
  { id: "asset", icon: "asset", labels: { en: "Asset Twin", th: "ทวินสินทรัพย์", ja: "資産ツイン", zh: "资产孪生" } },
  { id: "utility", icon: "utility", labels: { en: "Utility Twin", th: "ทวินระบบสนับสนุน", ja: "ユーティリティツイン", zh: "公用工程孪生" } },
  { id: "carbon", icon: "carbon", labels: { en: "Carbon Twin", th: "ทวินคาร์บอน", ja: "カーボンツイン", zh: "碳孪生" } },
  { id: "financial", icon: "financial", labels: { en: "Financial Twin", th: "ทวินการเงิน", ja: "財務ツイン", zh: "财务孪生" } },
  { id: "process", icon: "process", labels: { en: "Process Flow Twin", th: "ทวินการไหลของกระบวนการ", ja: "プロセスフローツイン", zh: "工艺流孪生" } },
  { id: "heatmap", icon: "heatmap", labels: { en: "Heatmap Center", th: "ศูนย์ฮีตแมป", ja: "ヒートマップ", zh: "热力图中心" } },
  { id: "simulation", icon: "simulation", labels: { en: "Simulation Center", th: "ศูนย์จำลอง", ja: "シミュレーション", zh: "仿真中心" } },
  { id: "insights", icon: "insights", labels: { en: "AI Insights", th: "ข้อมูลเชิงลึก AI", ja: "AIインサイト", zh: "AI 洞察" } },
  { id: "action", icon: "action", labels: { en: "Action Center", th: "ศูนย์ดำเนินการ", ja: "アクションセンター", zh: "操作中心" } },
  { id: "copilot", icon: "copilot", labels: { en: "Factory Copilot", th: "Factory Copilot", ja: "ファクトリーコパイロット", zh: "工厂副驾驶" } },
];

/** Functional groups for the workspace sub-navigation. */
export const optwinGroups: { key: string; labels: Record<Locale, string>; items: OpTwinTabId[] }[] = [
  { key: "overview", labels: { en: "Overview", th: "ภาพรวม", ja: "概要", zh: "概览" }, items: ["overview", "map"] },
  { key: "twins", labels: { en: "Digital Twins", th: "ทวิน", ja: "ツイン", zh: "孪生" }, items: ["production", "energy", "asset", "utility", "carbon", "financial", "process"] },
  { key: "analyze", labels: { en: "Analyze", th: "วิเคราะห์", ja: "分析", zh: "分析" }, items: ["heatmap", "simulation", "insights"] },
  { key: "act", labels: { en: "Act", th: "ดำเนินการ", ja: "アクション", zh: "执行" }, items: ["action", "copilot"] },
];

export const twinInsights = [
  { tag: "Production", title: "Line B is the OEE bottleneck", detail: "Changeover losses on Line B cost ~฿15k/day. Rebalancing to Line A recovers ~4 pts of plant OEE." },
  { tag: "Asset", title: "Chiller B will likely fail in ~3 days", detail: "Vibration + condenser fouling signature. A work order is staged with parts confirmed." },
  { tag: "Energy", title: "On-peak load drove cost +12% today", detail: "Shifting packaging off-peak recovers ~฿7.7k/week with zero capex." },
  { tag: "Carbon", title: "Carbon intensity down 8% YoY", detail: "Scope 2 reductions are on track for the FY decarbonization target." },
  { tag: "Financial", title: "฿6.2M total risk exposure", detail: "Four open risks concentrate in utilities — addressing Chiller B removes the largest." },
];

export type TwinActionStatus = "active" | "pending" | "suggested";
export const twinActions: {
  id: string;
  name: string;
  desc: string;
  impact: string;
  domain: string;
  status: TwinActionStatus;
}[] = [
  { id: "shed", name: "Peak Load Shedding", desc: "Shed non-critical loads to stay under 3,000 kW.", impact: "฿180k/mo", domain: "Energy", status: "active" },
  { id: "precool", name: "Off-Peak Pre-Cooling", desc: "Pre-cool chilled water during off-peak tariff.", impact: "฿95k/mo", domain: "Energy", status: "active" },
  { id: "wo", name: "Stage Chiller B Work Order", desc: "Auto-create the predictive work order with parts.", impact: "฿3.5M risk", domain: "Maintenance", status: "pending" },
  { id: "rebalance", name: "Rebalance Line B Load", desc: "Move lots to Line A to lift OEE and cut changeover loss.", impact: "฿15k/day", domain: "Production", status: "pending" },
  { id: "standby", name: "Idle Auto-Standby", desc: "Put machines idling >15 min into standby.", impact: "฿42k/mo", domain: "Energy", status: "suggested" },
];

export const simDefaults = {
  offPeakShift: 30, // %
  downtimeReduction: 20, // %
  idleCut: 40, // %
};
