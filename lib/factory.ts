/** The factory model that powers the 3D Digital Twin, the Command Center,
 *  and every intelligence module. One source of truth for the whole OS.
 *
 *  20 machines: 10 Production + 10 Facility & Utility, laid out in two zones. */

export type AssetStatus = "healthy" | "warning" | "critical";
export type AssetCategory = "production" | "facility";

export const STATUS_COLOR: Record<AssetStatus, string> = {
  healthy: "var(--c-emerald)",
  warning: "var(--c-amber-strong)",
  critical: "var(--c-rose)",
};

/** raw hex for 3D/canvas consumers — THREE.Color cannot resolve CSS variables */
export const STATUS_HEX: Record<AssetStatus, string> = {
  healthy: "#34d399",
  warning: "#f59e0b",
  critical: "#f43f5e",
};

export const STATUS_LABEL: Record<AssetStatus, string> = {
  healthy: "Healthy",
  warning: "Warning",
  critical: "Critical",
};

export const CATEGORY_LABEL: Record<AssetCategory, string> = {
  production: "Production",
  facility: "Facility & Utility",
};

export type BuildingKind = "production" | "utility" | "warehouse" | "office";

export type Building = {
  id: string;
  name: string;
  kind: BuildingKind;
  /** floor-plane center [x, z] and footprint [w, d] with (thin) height h */
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  tint: string;
  accent: string;
};

/** Two zone pads the machines sit on. */
export const buildings: Building[] = [
  { id: "prod", name: "Production Hall", kind: "production", x: -4.6, z: 0, w: 7.8, d: 5.6, h: 0.09, tint: "#0c1a24", accent: "#22d3ee" },
  { id: "util", name: "Facility & Utility", kind: "utility", x: 4.6, z: 0, w: 7.8, d: 5.6, h: 0.09, tint: "#171433", accent: "#818cf8" },
];

export type Asset = {
  id: string;
  name: string;
  type: string;
  category: AssetCategory;
  buildingId: string;
  line: string;
  /** world position on the floor plane */
  x: number;
  z: number;
  status: AssetStatus;
  health: number; // 0..100
  oee: number; // 0..100
  powerKw: number;
  tempC: number;
  vibration: number; // mm/s RMS
  /** days until predicted failure, or null if no prediction */
  rulDays: number | null;
  co2KgH: number;
  detail: string;
};

/* ---------------------------------------------------------- PRODUCTION (10) */
const production: Asset[] = [
  {
    id: "cnc-01", name: "CNC Cell 01", type: "5-axis machining center", category: "production", buildingId: "prod", line: "Line A",
    x: -7.6, z: -1.1, status: "healthy", health: 94, oee: 91, powerKw: 78, tempC: 47, vibration: 1.8, rulDays: null, co2KgH: 31,
    detail: "Spindle load nominal. Zero alarms in last 14 days.",
  },
  {
    id: "cnc-05", name: "CNC Cell 05", type: "3-axis machining center", category: "production", buildingId: "prod", line: "Line A",
    x: -6.1, z: -1.1, status: "healthy", health: 92, oee: 90, powerKw: 64, tempC: 45, vibration: 1.9, rulDays: null, co2KgH: 26,
    detail: "Idle-time reduced 12% after AI standby tuning.",
  },
  {
    id: "robo-02", name: "Palletizer 02", type: "6-axis robotic cell", category: "production", buildingId: "prod", line: "Line A",
    x: -4.6, z: -1.1, status: "healthy", health: 89, oee: 88, powerKw: 42, tempC: 39, vibration: 2.1, rulDays: null, co2KgH: 17,
    detail: "1,240 boxes/hr. Cycle time stable within 0.4%.",
  },
  {
    id: "weld-04", name: "Weld Robot 04", type: "spot-welding robot", category: "production", buildingId: "prod", line: "Line B",
    x: -3.1, z: -1.1, status: "healthy", health: 86, oee: 84, powerKw: 56, tempC: 44, vibration: 2.4, rulDays: null, co2KgH: 22,
    detail: "Weld quality 99.1%. Tip-dress cycle on schedule.",
  },
  {
    id: "qc-07", name: "AI Vision QC 07", type: "computer-vision inspection", category: "production", buildingId: "prod", line: "Line B",
    x: -1.6, z: -1.1, status: "healthy", health: 98, oee: 97, powerKw: 9, tempC: 36, vibration: 0.4, rulDays: null, co2KgH: 4,
    detail: "0 escapes. Defect-detection confidence 99.4%.",
  },
  {
    id: "press-03", name: "Stamping Press 03", type: "630-ton servo press", category: "production", buildingId: "prod", line: "Line B",
    x: -7.6, z: 1.1, status: "warning", health: 71, oee: 74, powerKw: 132, tempC: 63, vibration: 4.6, rulDays: 6, co2KgH: 53,
    detail: "Vibration trending up on main bearing. Service window in ~6 days.",
  },
  {
    id: "inj-08", name: "Injection Mold 08", type: "320-ton IMM", category: "production", buildingId: "prod", line: "Line C",
    x: -6.1, z: 1.1, status: "warning", health: 76, oee: 79, powerKw: 88, tempC: 58, vibration: 3.2, rulDays: 21, co2KgH: 35,
    detail: "Hydraulic temperature drifting +2°C/3d. Watch barrel heaters.",
  },
  {
    id: "assy-13", name: "Assembly Cell 13", type: "automated assembly cell", category: "production", buildingId: "prod", line: "Line C",
    x: -4.6, z: 1.1, status: "healthy", health: 90, oee: 89, powerKw: 34, tempC: 38, vibration: 1.4, rulDays: null, co2KgH: 14,
    detail: "Torque verification 100%. Takt time on target.",
  },
  {
    id: "paint-14", name: "Paint Booth 14", type: "robotic paint booth", category: "production", buildingId: "prod", line: "Line C",
    x: -3.1, z: 1.1, status: "warning", health: 79, oee: 82, powerKw: 72, tempC: 41, vibration: 2.0, rulDays: 30, co2KgH: 28,
    detail: "Exhaust filter loading at 78%. Replace within ~30 days.",
  },
  {
    id: "agv-06", name: "AMR Dock 06", type: "autonomous mobile fleet", category: "production", buildingId: "prod", line: "Logistics",
    x: -1.6, z: 1.1, status: "healthy", health: 96, oee: 95, powerKw: 12, tempC: 33, vibration: 0.9, rulDays: null, co2KgH: 5,
    detail: "Fleet of 8 charged. Routes optimal, zero collisions.",
  },
];

/* --------------------------------------------------- FACILITY & UTILITY (10) */
const facility: Asset[] = [
  {
    id: "chiller-09", name: "Chiller B", type: "water-cooled chiller", category: "facility", buildingId: "util", line: "Cooling",
    x: 1.6, z: -1.1, status: "critical", health: 58, oee: 61, powerKw: 156, tempC: 74, vibration: 5.8, rulDays: 3, co2KgH: 62,
    detail: "Condenser fouling. +15% energy draw, peak-demand risk in 3 days.",
  },
  {
    id: "chiller-15", name: "Chiller A", type: "water-cooled chiller", category: "facility", buildingId: "util", line: "Cooling",
    x: 3.1, z: -1.1, status: "healthy", health: 88, oee: 93, powerKw: 138, tempC: 52, vibration: 1.6, rulDays: null, co2KgH: 55,
    detail: "COP 5.9. Lead chiller, carrying base cooling load.",
  },
  {
    id: "comp-10", name: "Air Compressor 10", type: "VSD screw compressor", category: "facility", buildingId: "util", line: "Compressed Air",
    x: 4.6, z: -1.1, status: "warning", health: 73, oee: 80, powerKw: 110, tempC: 61, vibration: 3.9, rulDays: 14, co2KgH: 44,
    detail: "Night base-load 20% above target. Possible air leak in ring main.",
  },
  {
    id: "comp-16", name: "Air Compressor 11", type: "VSD screw compressor", category: "facility", buildingId: "util", line: "Compressed Air",
    x: 6.1, z: -1.1, status: "healthy", health: 87, oee: 91, powerKw: 96, tempC: 49, vibration: 1.5, rulDays: null, co2KgH: 38,
    detail: "Trim compressor. Specific power 6.1 kW/100cfm — efficient.",
  },
  {
    id: "boiler-12", name: "Steam Boiler", type: "fire-tube boiler", category: "facility", buildingId: "util", line: "Steam",
    x: 7.6, z: -1.1, status: "healthy", health: 84, oee: 92, powerKw: 38, tempC: 88, vibration: 1.1, rulDays: null, co2KgH: 71,
    detail: "Combustion efficiency 89%. O₂ trim active.",
  },
  {
    id: "mdb-11", name: "Main Distribution", type: "MDB switchboard", category: "facility", buildingId: "util", line: "Electrical",
    x: 1.6, z: 1.1, status: "healthy", health: 90, oee: 99, powerKw: 0, tempC: 41, vibration: 0.2, rulDays: null, co2KgH: 0,
    detail: "Power quality nominal. THD within IEEE-519 limits.",
  },
  {
    id: "ct-17", name: "Cooling Tower 1", type: "open cooling tower", category: "facility", buildingId: "util", line: "Cooling",
    x: 3.1, z: 1.1, status: "warning", health: 74, oee: 83, powerKw: 24, tempC: 35, vibration: 3.1, rulDays: 25, co2KgH: 12,
    detail: "Fan bearing vibration rising. Inspect fill & gearbox in ~25 days.",
  },
  {
    id: "pump-18", name: "Chilled-Water Pump", type: "centrifugal pump", category: "facility", buildingId: "util", line: "Cooling",
    x: 4.6, z: 1.1, status: "healthy", health: 91, oee: 96, powerKw: 45, tempC: 40, vibration: 1.2, rulDays: null, co2KgH: 18,
    detail: "VFD-driven. Differential pressure stable across loop.",
  },
  {
    id: "ahu-19", name: "AHU / HVAC", type: "air-handling unit", category: "facility", buildingId: "util", line: "HVAC",
    x: 6.1, z: 1.1, status: "healthy", health: 85, oee: 90, powerKw: 28, tempC: 37, vibration: 1.0, rulDays: null, co2KgH: 11,
    detail: "Supply-air setpoint met. Filter ΔP within range.",
  },
  {
    id: "wwt-20", name: "Wastewater Treatment", type: "aeration blower", category: "facility", buildingId: "util", line: "Environmental",
    x: 7.6, z: 1.1, status: "warning", health: 77, oee: 85, powerKw: 33, tempC: 39, vibration: 2.6, rulDays: 18, co2KgH: 9,
    detail: "Dissolved-oxygen control hunting. Blower service in ~18 days.",
  },
];

export const assets: Asset[] = [...production, ...facility];

export function assetById(id: string | null) {
  return assets.find((a) => a.id === id) ?? null;
}

export function countByStatus() {
  return assets.reduce(
    (acc, a) => {
      acc[a.status] += 1;
      return acc;
    },
    { healthy: 0, warning: 0, critical: 0 } as Record<AssetStatus, number>,
  );
}

export function countByCategory() {
  return assets.reduce(
    (acc, a) => {
      acc[a.category] += 1;
      return acc;
    },
    { production: 0, facility: 0 } as Record<AssetCategory, number>,
  );
}

/** Assets with an active failure prediction, most urgent first. */
export function predictedFailures() {
  return assets
    .filter((a) => a.rulDays !== null)
    .sort((a, b) => (a.rulDays ?? 999) - (b.rulDays ?? 999));
}

/** Live energy flow chain: Grid → Substation → MDB → Lines → Equipment. */
export type FlowNode = {
  id: string;
  label: string;
  tier: number; // 0..4 left→right
  kw: number;
  row?: number;
};
export type FlowLink = { from: string; to: string };

export const flowNodes: FlowNode[] = [
  { id: "grid", label: "Grid", tier: 0, kw: 1292 },
  { id: "substation", label: "Substation", tier: 1, kw: 1292 },
  { id: "mdb", label: "MDB", tier: 2, kw: 1255 },
  { id: "prod", label: "Production", tier: 3, kw: 587, row: 0 },
  { id: "util", label: "Facility", tier: 3, kw: 668, row: 1 },
];

export const flowLinks: FlowLink[] = [
  { from: "grid", to: "substation" },
  { from: "substation", to: "mdb" },
  { from: "mdb", to: "prod" },
  { from: "mdb", to: "util" },
];

export type TwinLayer = "health" | "predictive" | "energy" | "carbon" | "cost";

export const twinLayers: { id: TwinLayer; label: string; hint: string }[] = [
  { id: "health", label: "Asset Health", hint: "Green · Yellow · Red status" },
  { id: "predictive", label: "Predictive Risk", hint: "Machines likely to fail" },
  { id: "energy", label: "Energy Flow", hint: "Live power draw per asset" },
  { id: "carbon", label: "Carbon", hint: "CO₂ emissions intensity" },
  { id: "cost", label: "Cost Burn", hint: "฿ burning per hour, per asset" },
];

/** ฿ an asset is burning per hour vs its healthy baseline — excess power from
 *  degraded condition (blended tariff ฿4.2/kWh) plus a risk-weighted downtime
 *  premium for warning/critical machines. */
export function assetBurnPerHr(a: Asset): number {
  const excessPct = a.status === "critical" ? 0.16 : a.status === "warning" ? 0.07 : 0.015;
  const riskPremium = a.status === "critical" ? 380 : a.status === "warning" ? 120 : 0;
  return Math.round(a.powerKw * excessPct * 4.2 + riskPremium);
}
