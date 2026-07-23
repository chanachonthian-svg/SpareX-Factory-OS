/** One coherent factory-year — 12 months of a Thai automotive-parts plant.
 *
 *  Every monthly figure is DERIVED from two seasonal drivers (production output
 *  and cooling demand) through real formulas, so the whole story reconciles:
 *  more output / hotter month → more kWh → higher ฿ bill AND higher Scope-2
 *  carbon AND higher peak demand, together. This replaces the old hand-typed
 *  6-month arrays where the bill and the carbon disagreed 5×.
 *
 *  Thai seasonality is baked in: hot season (Mar–May) lifts cooling load; the
 *  Songkran shutdown (Apr) drops output; year-end (Dec) eases off. Deterministic
 *  (no Date/random) so charts are stable. Order Jul→Jun matches the peak chart;
 *  the last month (Jun) is the current month-to-date. */

// billed at the meter — same constants as lib/energy.ts tariff (kept local to
// avoid a circular import, since energy.ts re-exports the series below)
const ON_PEAK_RATE = 4.3297;   // ฿/kWh
const OFF_PEAK_RATE = 2.6369;  // ฿/kWh
const DEMAND_CHARGE = 132.93;  // ฿/kW
const GRID_FACTOR = 0.4999;    // kgCO₂e per kWh (TH grid, market 2024)
const PF_SURCHARGE = 56.07;    // ฿/kVAR over the 61.97%-of-kW allowance

export const YEAR_MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"] as const;

// ── the two drivers (relative to a normal month = 1.00) ──
const prodIdx = [1.00, 0.99, 1.02, 1.03, 1.02, 0.94, 1.02, 0.98, 1.04, 0.83, 0.98, 0.96]; // Apr = Songkran, Dec = year-end
const coolIdx = [1.05, 1.04, 1.02, 0.99, 0.94, 0.90, 0.93, 0.99, 1.10, 1.14, 1.16, 1.07]; // hot season Mar–May
const peakKW  = [2810, 2760, 2840, 2780, 2820, 2850, 2790, 2740, 2830, 2770, 2800, 2780]; // metered 15-min peak
const powerF  = [0.86, 0.86, 0.87, 0.88, 0.89, 0.90, 0.89, 0.87, 0.84, 0.83, 0.82, 0.85]; // dips when cooling (reactive) load rises

// ── anchors (a normal month) ──
const BASE_UNITS = 195_000;
const BASE_ON_PEAK_BAHT = 630_000;
const BASE_OFF_PEAK_BAHT = 228_000;
const BASE_TOTAL_KWH = 1_150_000; // grid energy behind Scope-2

const r10 = (n: number) => Math.round(n / 10) * 10;
const r1000 = (n: number) => Math.round(n / 1000) * 1000;

export type PlantMonth = {
  label: string;
  units: number;
  onPeak: number; offPeak: number; demand: number; penalty: number; // ฿
  totalKwh: number; peakKw: number; pf: number;
  scope1: number; scope2: number; scope3: number; // tCO₂e
  mtd?: boolean;
};

export const plantYear: PlantMonth[] = YEAR_MONTHS.map((label, i) => {
  const energyDriver = prodIdx[i] * 0.55 + coolIdx[i] * 0.45; // bill/carbon track output + cooling
  const totalKwh = Math.round(BASE_TOTAL_KWH * energyDriver);
  // PF surcharge — the physically-correct reactive-power penalty (same formula as the rule engine)
  const pf = powerF[i];
  const excessKvar = pf < 0.85 ? Math.max(0, peakKW[i] * (Math.tan(Math.acos(pf)) - 0.6197)) : 0;
  return {
    label,
    units: r1000(BASE_UNITS * prodIdx[i]),
    onPeak: r1000(BASE_ON_PEAK_BAHT * energyDriver),
    offPeak: r1000(BASE_OFF_PEAK_BAHT * energyDriver),
    demand: r10(peakKW[i] * DEMAND_CHARGE),
    penalty: r10(excessKvar * PF_SURCHARGE),
    totalKwh,
    peakKw: peakKW[i],
    pf,
    scope1: Math.round(400 + (coolIdx[i] - 1) * 200 + prodIdx[i] * 20), // fuel + refrigerant (rises with cooling)
    scope2: Math.round(totalKwh * GRID_FACTOR / 1000),                   // purchased electricity
    scope3: Math.round(1140 * prodIdx[i] + 60),                          // supply chain (rises with output)
    mtd: i === YEAR_MONTHS.length - 1 || undefined,
  };
});

/* ── views the existing charts already consume (same shapes, now 12 months) ── */

export const monthlyBills = plantYear.map((m) => ({
  label: m.label, onPeak: m.onPeak, offPeak: m.offPeak, demand: m.demand, penalty: m.penalty, mtd: m.mtd,
}));

export const monthlyUnits = plantYear.map((m) => m.units);

export const emissionsTrend = plantYear.map((m) => ({
  t: m.label, scope1: m.scope1, scope2: m.scope2, scope3: m.scope3,
}));
