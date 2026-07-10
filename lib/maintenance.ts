import type { Locale } from "./dict";
import { predictedFailures } from "./factory";
import { rootCauses, maintByType, riskBars } from "./asset";

/* ----------------------------------------------------------- navigation tree */

export type MaintLeaf = { id: string; label: string };
export type MaintCat = { id: string; icon: string; labels: Record<Locale, string>; items: MaintLeaf[] };

export const maintNav: MaintCat[] = [
  {
    id: "overview", icon: "overview",
    labels: { en: "Overview", th: "ภาพรวม", ja: "概要", zh: "概览" },
    items: [
      { id: "healthScore", label: "Maintenance Health Score" },
      { id: "exec", label: "AI Executive Summary" },
      { id: "criticalWO", label: "Critical Work Orders" },
    ],
  },
  {
    id: "workcenter", icon: "workcenter",
    labels: { en: "Work Center", th: "ศูนย์งานซ่อม", ja: "ワークセンター", zh: "工单中心" },
    items: [
      { id: "workOrders", label: "Work Orders" },
      { id: "pmSchedule", label: "PM Schedule" },
      { id: "calendar", label: "Maintenance Calendar" },
    ],
  },
  {
    id: "assetcare", icon: "assetcare",
    labels: { en: "Asset Care", th: "ดูแลสินทรัพย์", ja: "資産ケア", zh: "资产养护" },
    items: [
      { id: "history", label: "Maintenance History" },
      { id: "timeline", label: "Asset Timeline" },
      { id: "failureRecords", label: "Failure Records" },
    ],
  },
  {
    id: "spares", icon: "spares",
    labels: { en: "Spare Parts", th: "อะไหล่", ja: "スペアパーツ", zh: "备件" },
    items: [
      { id: "inventory", label: "Inventory" },
      { id: "criticalSpare", label: "Critical Spare" },
      { id: "reorder", label: "AI Reorder Recommendation" },
    ],
  },
  {
    id: "ai", icon: "ai",
    labels: { en: "AI Intelligence", th: "AI อัจฉริยะ", ja: "AIインテリジェンス", zh: "AI 智能" },
    items: [
      { id: "priority", label: "Maintenance Priority" },
      { id: "rootCause", label: "Root Cause Analysis" },
      { id: "failurePred", label: "Failure Prediction" },
      { id: "optimization", label: "Maintenance Optimization" },
    ],
  },
  {
    id: "copilot", icon: "copilot",
    labels: { en: "Copilot", th: "Copilot", ja: "コパイロット", zh: "副驾驶" },
    items: [
      { id: "askAI", label: "Ask Maintenance AI" },
      { id: "troubleshoot", label: "Troubleshooting" },
      { id: "sop", label: "SOP & Knowledge" },
      { id: "repairRec", label: "Repair Recommendation" },
    ],
  },
];

const _cat: Record<string, string> = {};
const _label: Record<string, string> = {};
maintNav.forEach((c) => c.items.forEach((it) => { _cat[it.id] = c.id; _label[it.id] = it.label; }));
export const maintLeafCategory = (id: string) => _cat[id];
export const maintLeafLabel = (id: string) => _label[id] ?? id;

/* ----------------------------------------------------------------- spares */

export type SparePart = { name: string; stock: number; min: number; lead: string; crit: boolean };
export const spareParts: SparePart[] = [
  { name: "Chiller condenser coil", stock: 2, min: 1, lead: "14d", crit: true },
  { name: "Press main bearing", stock: 0, min: 2, lead: "21d", crit: true },
  { name: "Compressor air-end kit", stock: 3, min: 2, lead: "10d", crit: false },
  { name: "VFD module 75 kW", stock: 1, min: 1, lead: "30d", crit: true },
  { name: "Cooling tower fan belt", stock: 8, min: 4, lead: "5d", crit: false },
  { name: "Hydraulic seal kit", stock: 5, min: 3, lead: "7d", crit: false },
  { name: "Bearing 6210-2RS", stock: 12, min: 6, lead: "3d", crit: false },
  { name: "Aeration blower seal", stock: 1, min: 2, lead: "12d", crit: true },
];
export const sparePartStatus = (p: SparePart) => (p.stock <= p.min ? (p.stock === 0 ? "out" : "low") : "ok");

/* ----------------------------------------------------------- content config */

export type Kpi = { label: string; value: string; unit?: string; accent?: string; delta?: string; good?: boolean };
export type Viz = { kind: "bars"; data: { name: string; value: number }[] } | { kind: "none" };
export type LeafConfig = { kpis: Kpi[]; viz: Viz };

const M = "#60a5fa"; // maintenance accent
const failuresByAsset = riskBars; // predicted-failure risk per asset

const content: Record<string, LeafConfig> = {
  pmSchedule: { kpis: [{ label: "Due · 7d", value: "5", accent: "#f59e0b" }, { label: "Overdue", value: "1", accent: "#f43f5e" }, { label: "Compliance", value: "96", unit: "%", accent: "#34d399" }], viz: { kind: "bars", data: maintByType } },
  calendar: { kpis: [{ label: "This Week", value: "9", unit: "jobs", accent: M }, { label: "Planned Downtime", value: "6.5", unit: "h", accent: "#f59e0b" }, { label: "Crews", value: "3", accent: "#22d3ee" }], viz: { kind: "bars", data: maintByType } },
  history: { kpis: [{ label: "WOs · 30d", value: "47", accent: M }, { label: "MTBF", value: "412", unit: "h", accent: "#34d399" }, { label: "MTTR", value: "2.4", unit: "h", accent: "#22d3ee" }], viz: { kind: "bars", data: maintByType } },
  timeline: { kpis: [{ label: "Events · 30d", value: "63", accent: M }, { label: "Last Failure", value: "4d ago", accent: "#f59e0b" }, { label: "Uptime", value: "97.6", unit: "%", accent: "#34d399" }], viz: { kind: "bars", data: failuresByAsset } },
  failureRecords: { kpis: [{ label: "Failures · 90d", value: "11", accent: "#f43f5e" }, { label: "Repeat", value: "3", accent: "#f59e0b" }, { label: "Avg Repair", value: "2.4", unit: "h", accent: "#22d3ee" }], viz: { kind: "bars", data: rootCauses } },
  priority: { kpis: [{ label: "P1 Critical", value: "1", accent: "#f43f5e" }, { label: "P2 High", value: "6", accent: "#f59e0b" }, { label: "Backlog", value: "12", accent: M }], viz: { kind: "bars", data: failuresByAsset } },
  rootCause: { kpis: [{ label: "Top Cause", value: "Bearing wear", accent: "#f59e0b" }, { label: "Share", value: "38", unit: "%", accent: "#f43f5e" }, { label: "Addressable", value: "78", unit: "%", accent: "#34d399" }], viz: { kind: "bars", data: rootCauses } },
  failurePred: { kpis: [{ label: "Predicted · 30d", value: "7", accent: "#f43f5e" }, { label: "Highest Prob", value: "85", unit: "%", accent: "#f59e0b" }, { label: "Soonest", value: "3", unit: "d", accent: M }], viz: { kind: "bars", data: failuresByAsset } },
  optimization: { kpis: [{ label: "Wrench-time", value: "3.2", unit: "×", accent: "#34d399" }, { label: "Cost Saving", value: "฿0.9M", unit: "/yr", accent: "#22d3ee" }, { label: "PM Tuned", value: "8", unit: "assets", accent: M }], viz: { kind: "bars", data: maintByType } },
};

export function maintContent(id: string): LeafConfig {
  return content[id] ?? { kpis: [], viz: { kind: "none" } };
}

export { predictedFailures };
