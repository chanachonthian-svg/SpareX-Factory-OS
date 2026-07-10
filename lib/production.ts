import type { Locale } from "./dict";
import { oeeTrend } from "./telemetry";

/* ----------------------------------------------------------- navigation tree */

export type ProdLeaf = { id: string; label: string };
export type ProdCategory = {
  id: string;
  icon: string;
  labels: Record<Locale, string>;
  items: ProdLeaf[];
};

export const prodNav: ProdCategory[] = [
  {
    id: "overview", icon: "overview",
    labels: { en: "Overview", th: "ภาพรวม", ja: "概要", zh: "概览" },
    items: [
      { id: "exec", label: "Executive Summary" },
      { id: "healthScore", label: "Production Health Score" },
    ],
  },
  {
    id: "live", icon: "live",
    labels: { en: "Live Production", th: "การผลิตเรียลไทม์", ja: "ライブ生産", zh: "实时生产" },
    items: [
      { id: "byLine", label: "Production by Line" },
      { id: "byMachine", label: "Production by Machine" },
      { id: "shiftPerf", label: "Shift Performance" },
    ],
  },
  {
    id: "oee", icon: "oee",
    labels: { en: "OEE", th: "OEE", ja: "OEE", zh: "OEE" },
    items: [
      { id: "availability", label: "Availability" },
      { id: "performance", label: "Performance" },
      { id: "quality", label: "Quality" },
    ],
  },
  {
    id: "downtime", icon: "downtime",
    labels: { en: "Downtime", th: "ดาวน์ไทม์", ja: "ダウンタイム", zh: "停机" },
    items: [
      { id: "dtAnalysis", label: "Downtime Analysis" },
      { id: "rootCause", label: "Root Cause" },
      { id: "bottleneck", label: "Bottleneck" },
    ],
  },
  {
    id: "costprofit", icon: "cost",
    labels: { en: "Cost & Profit", th: "ต้นทุน & กำไร", ja: "原価と利益", zh: "成本与利润" },
    items: [
      { id: "costPerUnit", label: "Cost per Unit" },
      { id: "profitPerProduct", label: "Profit per Product" },
      { id: "prodCost", label: "Production Cost" },
    ],
  },
  {
    id: "ai", icon: "ai",
    labels: { en: "AI Insights", th: "ข้อมูลเชิงลึก AI", ja: "AIインサイト", zh: "AI 洞察" },
    items: [
      { id: "dailySummary", label: "Daily AI Summary" },
      { id: "oppDetect", label: "Opportunity Detection" },
      { id: "recActions", label: "Recommended Actions" },
    ],
  },
  {
    id: "sim", icon: "sim",
    labels: { en: "Simulation", th: "ซิมูเลชัน", ja: "シミュレーション", zh: "仿真" },
    items: [
      { id: "whatif", label: "What-if Analysis" },
      { id: "capacitySim", label: "Capacity Simulation" },
      { id: "roiSim", label: "ROI Simulation" },
    ],
  },
  {
    id: "copilot", icon: "copilot",
    labels: { en: "Copilot", th: "Copilot", ja: "コパイロット", zh: "副驾驶" },
    items: [
      { id: "copilot", label: "AI Chat" },
      { id: "askAI", label: "Ask Production AI" },
    ],
  },
];

/* leaf → category lookup + label */
const _leafCat: Record<string, string> = {};
const _leafLabel: Record<string, string> = {};
prodNav.forEach((c) => c.items.forEach((it) => { _leafCat[it.id] = c.id; _leafLabel[it.id] = it.label; }));
export const leafCategory = (id: string) => _leafCat[id];
export const leafLabel = (id: string) => _leafLabel[id] ?? id;

/* ------------------------------------------------------------------- data */

export const outputByLine = [
  { name: "Line A", value: 1240 },
  { name: "Line B", value: 585 },
  { name: "Line C", value: 1715 },
  { name: "Line D", value: 590 },
];
export const byMachineData = [
  { name: "CNC Cell 01", value: 78 },
  { name: "Palletizer 02", value: 42 },
  { name: "Stamping 03", value: 132 },
  { name: "Weld 04", value: 56 },
  { name: "Injection 08", value: 88 },
];
export const downtimeCauses = [
  { name: "Changeover", value: 142 },
  { name: "Material wait", value: 96 },
  { name: "Minor stops", value: 73 },
  { name: "Breakdowns", value: 58 },
  { name: "Quality holds", value: 31 },
];
export const stationLoad = [
  { name: "CNC", value: 78 },
  { name: "Press", value: 94 },
  { name: "Weld", value: 71 },
  { name: "Assembly", value: 88 },
  { name: "Paint", value: 82 },
];
export const defectTypes = [
  { name: "Dimensional", value: 42 },
  { name: "Surface", value: 31 },
  { name: "Assembly", value: 18 },
  { name: "Electrical", value: 9 },
];
export const laborByShift = [
  { name: "Day A", value: 512 },
  { name: "Day B", value: 486 },
  { name: "Night A", value: 441 },
  { name: "Night B", value: 398 },
];
export const costBreakdown = [
  { name: "Machine", value: 4.2 },
  { name: "Labor", value: 3.1 },
  { name: "Utility", value: 2.4 },
  { name: "Material OH", value: 2.14 },
];
export const profitByProduct = [
  { name: "Model A", value: 420 },
  { name: "Model B", value: 180 },
  { name: "Model C", value: 610 },
  { name: "Model D", value: 230 },
];
export const oppBars = [
  { name: "Reduce changeover", value: 540 },
  { name: "Lift Line B OEE", value: 380 },
  { name: "Cut scrap", value: 260 },
  { name: "Off-peak energy", value: 210 },
];

/* ----------------------------------------------------------- content config */

export type Kpi = { label: string; value: string; unit?: string; accent?: string; delta?: string; good?: boolean };
export type Viz =
  | { kind: "bars"; data: { name: string; value: number }[] }
  | { kind: "area"; data: { t: string; v: number }[] }
  | { kind: "none" };
export type LeafConfig = { kpis: Kpi[]; viz: Viz };

const oee = oeeTrend();
const C = "#34d399";

const catDefault: Record<string, LeafConfig> = {
  live: { kpis: [{ label: "Output · Today", value: "4,090", unit: "u", accent: C, delta: "+2%", good: true }, { label: "Throughput", value: "512", unit: "u/h", accent: "#22d3ee" }, { label: "Target Attainment", value: "98", unit: "%", accent: "#818cf8" }], viz: { kind: "bars", data: outputByLine } },
  oee: { kpis: [{ label: "OEE", value: "74.2", unit: "%", accent: C, delta: "+1.2pp", good: true }, { label: "Availability", value: "82.5", unit: "%", accent: "#22d3ee" }, { label: "Performance", value: "91.0", unit: "%", accent: "#818cf8" }, { label: "Quality", value: "98.8", unit: "%", accent: "#f472b6" }], viz: { kind: "area", data: oee } },
  downtime: { kpis: [{ label: "Total Downtime", value: "6.4", unit: "h", accent: "#f43f5e" }, { label: "Events", value: "23", accent: "#f59e0b" }, { label: "MTTR", value: "2.4", unit: "h", accent: "#22d3ee" }], viz: { kind: "bars", data: downtimeCauses } },
  costprofit: { kpis: [{ label: "Cost / Unit", value: "฿11.84", accent: "#818cf8", delta: "2.1%", good: true }, { label: "Gross Margin", value: "31", unit: "%", accent: C }, { label: "Profit · Today", value: "฿1.5M", accent: "#34d399" }], viz: { kind: "bars", data: costBreakdown } },
  ai: { kpis: [{ label: "Production Health", value: "85", unit: "/100", accent: C }, { label: "Hidden Loss", value: "฿0.9M", unit: "/yr", accent: "#f43f5e" }, { label: "Opportunities", value: "6", accent: "#818cf8" }], viz: { kind: "bars", data: oppBars } },
  sim: { kpis: [{ label: "Baseline OEE", value: "74.2", unit: "%", accent: C }, { label: "Projected Gain", value: "+4.0", unit: "pts", accent: "#34d399" }, { label: "Payback", value: "8", unit: "mo", accent: "#818cf8" }], viz: { kind: "none" } },
};

const overrides: Record<string, LeafConfig> = {
  byMachine: { kpis: [{ label: "Output · Today", value: "4,090", unit: "u", accent: C }, { label: "Top Machine", value: "CNC 01", accent: "#22d3ee" }, { label: "Slowest", value: "Stamping 03", accent: "#f59e0b" }], viz: { kind: "bars", data: byMachineData } },
  shiftPerf: { kpis: [{ label: "Best Shift", value: "Day A", accent: C }, { label: "Productivity", value: "512", unit: "u/op", accent: "#22d3ee" }, { label: "Efficiency", value: "91", unit: "%", accent: "#818cf8" }], viz: { kind: "bars", data: laborByShift } },
  availability: { kpis: [{ label: "Availability", value: "82.5", unit: "%", accent: "#22d3ee", delta: "+1.5pp", good: true }, { label: "Planned Stops", value: "3.1", unit: "h", accent: "#f59e0b" }, { label: "Unplanned Stops", value: "3.3", unit: "h", accent: "#f43f5e" }], viz: { kind: "bars", data: downtimeCauses } },
  performance: { kpis: [{ label: "Performance", value: "91.0", unit: "%", accent: "#818cf8", delta: "+0.4pp", good: true }, { label: "Ideal Cycle", value: "7.0", unit: "s", accent: "#22d3ee" }, { label: "Speed Loss", value: "9", unit: "%", accent: "#f59e0b" }], viz: { kind: "area", data: oee } },
  quality: { kpis: [{ label: "Quality", value: "98.8", unit: "%", accent: "#f472b6" }, { label: "Defects", value: "142", unit: "ppm", accent: "#f59e0b" }, { label: "Scrap", value: "1.2", unit: "%", accent: "#f43f5e" }], viz: { kind: "bars", data: defectTypes } },
  rootCause: { kpis: [{ label: "Top Cause", value: "Changeover", accent: "#f59e0b" }, { label: "Share", value: "35", unit: "%", accent: "#f43f5e" }, { label: "Avoidable", value: "62", unit: "%", accent: "#34d399" }], viz: { kind: "bars", data: downtimeCauses } },
  bottleneck: { kpis: [{ label: "Bottleneck", value: "Press", accent: "#f43f5e" }, { label: "Utilization", value: "94", unit: "%", accent: "#f59e0b" }, { label: "WIP", value: "1,240", unit: "u", accent: "#22d3ee" }], viz: { kind: "bars", data: stationLoad } },
  costPerUnit: { kpis: [{ label: "Cost / Unit", value: "฿11.84", accent: "#818cf8", delta: "2.1%", good: true }, { label: "Best Line", value: "Line C", accent: "#34d399" }, { label: "Worst Line", value: "Line B", accent: "#f59e0b" }], viz: { kind: "area", data: oee } },
  profitPerProduct: { kpis: [{ label: "Top Product", value: "Model C", accent: C }, { label: "Best Margin", value: "34", unit: "%", accent: "#34d399" }, { label: "Profit · Today", value: "฿1.5M", accent: "#22d3ee" }], viz: { kind: "bars", data: profitByProduct } },
  prodCost: { kpis: [{ label: "Cost · MTD", value: "฿38.2M", accent: "#818cf8" }, { label: "Cost / Unit", value: "฿11.84", accent: "#22d3ee" }, { label: "vs Budget", value: "+3", unit: "%", accent: "#f59e0b" }], viz: { kind: "bars", data: costBreakdown } },
  oppDetect: { kpis: [{ label: "Opportunities", value: "6", accent: "#818cf8" }, { label: "Total Upside", value: "฿1.4M", unit: "/yr", accent: "#34d399" }, { label: "Quick Wins", value: "3", accent: "#22d3ee" }], viz: { kind: "bars", data: oppBars } },
  recActions: { kpis: [{ label: "Actions", value: "5", accent: C }, { label: "Est. Benefit", value: "฿0.9M", unit: "/yr", accent: "#34d399" }, { label: "Auto-applicable", value: "2", accent: "#22d3ee" }], viz: { kind: "bars", data: oppBars } },
};

export function prodContent(id: string): LeafConfig {
  return overrides[id] ?? catDefault[leafCategory(id)] ?? { kpis: [], viz: { kind: "none" } };
}
