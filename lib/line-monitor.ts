/** Line Monitor — per-Line/Area aggregation for the shop-floor display.
 *
 *  A "line" is a zone from the user's Twin Builder layout (or, on the mock
 *  plant, one of the two building pads). Numbers derive from the machines
 *  inside: their kVA-based load drives kW → kWh → ฿ → CO₂, so what the TV
 *  shows tracks the customer's real machine spec. Deterministic (no Date.now
 *  in the math) so a TV that reboots shows the same story. */

import { assets as mockAssets, buildings as mockBuildings, type Asset } from "./factory";
import { loadLayout, toAssets, toBuildings } from "./twin-builder";

export type MonitorZone = { id: string; name: string; color: string };

export type LineStats = {
  count: number;
  prodCount: number;
  kwNow: number;
  kwhToday: number;
  costToday: number;
  co2Today: number;
  avgOee: number;
  avgHealth: number;
  planToday: number;
  actualToday: number;
  attain: number; // %
  issues: { name: string; health: number; note: string }[];
};

const HOURS_ELAPSED = 8.5; // 06:00 shift start → "now" 14:30, matches the rest of the mock day
const THB_PER_KWH = 4.2;
const CO2_PER_KWH = 0.4999;

function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

/** zones + assets for the monitor — the user layout when active, else the mock plant */
export function monitorModel(): { zones: MonitorZone[]; assets: Asset[]; custom: boolean } {
  const layout = typeof window !== "undefined" ? loadLayout() : null;
  if (layout?.active && layout.machines.length) {
    return {
      zones: toBuildings(layout).map((b) => ({ id: b.id, name: b.name, color: b.accent })),
      assets: toAssets(layout),
      custom: true,
    };
  }
  return {
    zones: mockBuildings.map((b) => ({ id: b.id, name: b.name, color: b.accent })),
    assets: mockAssets,
    custom: false,
  };
}

export function lineStats(zoneId: string, zoneName: string, all: Asset[]): LineStats {
  const ms = all.filter((a) => a.buildingId === zoneId);
  const prod = ms.filter((a) => a.category === "production");
  const kwNow = Math.round(ms.reduce((s, a) => s + a.powerKw, 0) * 10) / 10;
  const kwhToday = Math.round(kwNow * HOURS_ELAPSED);
  const avgOee = prod.length ? Math.round(prod.reduce((s, a) => s + a.oee, 0) / prod.length) : 0;
  const avgHealth = ms.length ? Math.round(ms.reduce((s, a) => s + a.health, 0) / ms.length) : 0;

  // production sim: ~20 pcs/hr per production machine, attainment tracks OEE
  const planRate = prod.length * 20;
  const attain = prod.length ? Math.max(62, Math.min(98, avgOee + Math.round(hash01(zoneId) * 10) - 3)) : 0;
  const planToday = Math.round(planRate * HOURS_ELAPSED);
  const actualToday = Math.round((planToday * attain) / 100);

  const issues = ms
    .filter((a) => a.health < 84 || a.status !== "healthy")
    .sort((a, b) => a.health - b.health)
    .slice(0, 4)
    .map((a) => ({
      name: a.name,
      health: a.health,
      note: a.status === "critical" ? "วิกฤต — ต้องดูทันที" : a.vibration > 3.4 ? `สั่นสูง ${a.vibration} mm/s` : `อุณหภูมิ ${a.tempC}°C`,
    }));

  return {
    count: ms.length,
    prodCount: prod.length,
    kwNow,
    kwhToday,
    costToday: Math.round(kwhToday * THB_PER_KWH),
    co2Today: Math.round(kwhToday * CO2_PER_KWH),
    avgOee,
    avgHealth,
    planToday,
    actualToday,
    attain,
    issues,
  };
}

/** cards the TV can show — the picker toggles these ids */
export const MONITOR_CARDS: { id: string; en: string; th: string }[] = [
  { id: "prod", en: "Output vs plan", th: "ยอดผลิต vs แผน" },
  { id: "oee", en: "OEE", th: "OEE" },
  { id: "kw", en: "Electric load now", th: "กำลังไฟขณะนี้" },
  { id: "cost", en: "Energy cost today", th: "ค่าไฟวันนี้" },
  { id: "co2", en: "Carbon today", th: "คาร์บอนวันนี้" },
  { id: "machines", en: "Machine status", th: "สถานะเครื่องจักร" },
  { id: "twin3d", en: "3D view", th: "ภาพ 3D" },
];

export const DEFAULT_CARDS = ["prod", "oee", "kw", "co2", "machines", "twin3d"];
