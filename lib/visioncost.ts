"use client";

import { useSyncExternalStore } from "react";
import { defects, rootCauses } from "./vision";

/** Cost assumptions the plant enters by hand — we are NOT connected to ERP yet.
 *  Four numbers per defect; everything else on the Analyze screen derives live.
 *  Persisted to localStorage so the customer's own figures survive reloads. */
export type CostParams = {
  unitCost: number;   // ฿ sunk in one scrapped part
  reworkCost: number; // ฿ to rework one part
  fixCost: number;    // ฿ to fix the root cause
  riskTHB: number;    // ฿ exposure if nothing is done
};
export type CostOverrides = Record<string, Partial<CostParams>>;

const KEY = "factoryos:visioncost";
let cache: CostOverrides = {};
let hydrated = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const s = window.localStorage.getItem(KEY);
    if (s) { cache = JSON.parse(s); notify(); }
  } catch { /* ignore corrupt storage */ }
}
function commit(next: CostOverrides) {
  cache = next;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
  }
  notify();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  ensureHydrated();
  return () => { listeners.delete(cb); };
}
const EMPTY: CostOverrides = {};

export function useCostOverrides(): CostOverrides {
  return useSyncExternalStore(subscribe, () => cache, () => EMPTY);
}
/** demo defaults — replaced by the customer's own numbers as they type */
export function defaultsFor(defectId: string): CostParams {
  const d = defects.find((x) => x.id === defectId)!;
  const rc = rootCauses.find((r) => r.defectId === defectId)!;
  return { unitCost: d.unitCost, reworkCost: d.reworkCost, fixCost: rc.fix.cost, riskTHB: rc.riskTHB };
}
export function paramsFor(defectId: string, ov: CostOverrides): CostParams {
  return { ...defaultsFor(defectId), ...(ov[defectId] ?? {}) };
}
export function setCostParam(defectId: string, patch: Partial<CostParams>) {
  ensureHydrated();
  commit({ ...cache, [defectId]: { ...(cache[defectId] ?? {}), ...patch } });
}
export function resetCostParams(defectId: string) {
  ensureHydrated();
  const next = { ...cache };
  delete next[defectId];
  commit(next);
}
