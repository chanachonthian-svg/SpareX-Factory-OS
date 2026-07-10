import { rng } from "./utils";
import { assets, countByStatus } from "./factory";

export type Point = { t: string; v: number };
export type MultiPoint = { t: string; [k: string]: number | string };

/** Deterministic time series — identical on server and client (seeded). */
export function series(
  seed: number,
  points: number,
  opts: { base: number; amp: number; trend?: number; noise?: number } = {
    base: 50,
    amp: 10,
  },
): number[] {
  const r = rng(seed);
  const { base, amp, trend = 0, noise = 0.5 } = opts;
  return Array.from({ length: points }, (_, i) => {
    const wave = Math.sin((i / points) * Math.PI * 2) * amp;
    const drift = (i / points) * trend;
    const jitter = (r() - 0.5) * 2 * amp * noise;
    return Math.round((base + wave + drift + jitter) * 10) / 10;
  });
}

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
const DAYS = Array.from({ length: 30 }, (_, i) => `${i + 1}`);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];

/** 24h plant power profile (kW) with a TOU-style on-peak bump. */
export function powerProfile(): MultiPoint[] {
  const load = series(101, 24, { base: 2200, amp: 520, noise: 0.25 });
  return HOURS.map((t, i) => {
    const onPeak = i >= 9 && i < 22;
    return {
      t,
      power: Math.round(load[i] + (onPeak ? 420 : 0)),
      limit: 3000,
      onPeak: onPeak ? 3000 : 0,
    };
  });
}

/** 30-day OEE trend. */
export function oeeTrend(): Point[] {
  const v = series(202, 30, { base: 74, amp: 4, trend: 6, noise: 0.4 });
  return DAYS.map((t, i) => ({ t, v: Math.min(99, Math.round(v[i] * 10) / 10) }));
}

/** 30-day energy cost-per-unit (THB/unit). */
export function costPerUnit(): MultiPoint[] {
  const v = series(303, 30, { base: 12.4, amp: 1.6, trend: -1.8, noise: 0.5 });
  return DAYS.map((t, i) => ({
    t,
    cost: Math.round(v[i] * 100) / 100,
    target: 12,
  }));
}

/** Peak demand: 6 months history + 3 months AI forecast. */
export function peakForecast(): MultiPoint[] {
  const hist = series(404, 6, { base: 2950, amp: 120, noise: 0.4 });
  const fc = series(405, 3, { base: 3050, amp: 90, noise: 0.3 });
  const out: MultiPoint[] = [];
  for (let i = 0; i < 6; i++) out.push({ t: MONTHS[i], actual: Math.round(hist[i]), limit: 3000 });
  for (let i = 0; i < 3; i++)
    out.push({ t: MONTHS[6 + i], forecast: Math.round(fc[i]), limit: 3000 });
  // bridge the line
  out[5].forecast = out[5].actual as number;
  return out;
}

/** 12-month carbon intensity (kgCO₂e / unit). */
export function carbonTrend(): MultiPoint[] {
  const scope1 = series(506, 9, { base: 320, amp: 30, trend: -60, noise: 0.3 });
  const scope2 = series(507, 9, { base: 540, amp: 40, trend: -120, noise: 0.3 });
  return MONTHS.map((t, i) => ({
    t,
    scope1: Math.round(scope1[i]),
    scope2: Math.round(scope2[i]),
  }));
}

/** Top energy losses (for Copilot + Energy Core). */
export const energyLosses = [
  { name: "Chiller B over-draw", kw: 23, thb: 4500 },
  { name: "Compressed-air leak (ring main)", kw: 18, thb: 3200 },
  { name: "Idle CNC standby", kw: 12, thb: 2100 },
  { name: "Off-peak shiftable load", kw: 31, thb: 5400 },
  { name: "Packaging night base-load", kw: 15, thb: 2600 },
];

/** Command Center KPIs derived live from the asset model. */
export function commandKpis() {
  const counts = countByStatus();
  const totalPower = assets.reduce((s, a) => s + a.powerKw, 0);
  const avgOee = Math.round(
    assets.reduce((s, a) => s + a.oee, 0) / assets.length,
  );
  const avgHealth = Math.round(
    assets.reduce((s, a) => s + a.health, 0) / assets.length,
  );
  const co2 = Math.round(assets.reduce((s, a) => s + a.co2KgH, 0));
  return {
    avgOee,
    avgHealth,
    totalPower,
    co2,
    counts,
    energyCostToday: 1_270_290,
    costPerUnit: 11.84,
    peakToday: 2942,
  };
}

export const ENERGY_HOURS = HOURS;
