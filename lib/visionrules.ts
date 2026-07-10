"use client";

import { useSyncExternalStore } from "react";
import type { LZ } from "./vision";

/** Disposition rules — WHAT the gate does when it finds a defect.
 *  Set by the plant's QC engineer (no MES yet, so edited in-app and persisted locally):
 *  · reworkable=false  → every hit is scrapped
 *  · reworkable=true   → severity ≤ scrapAbove goes to rework, above it gets scrapped
 *  · alarm             → also notify the line leader on every scrap */
export type DispositionRule = { reworkable: boolean; scrapAbove: number; alarm: boolean };
export type RuleMeta = { defectId: string; metric: LZ; unit: string; step: number };

/** what the camera actually measures per defect class — the severity axis of the rule */
export const RULE_META: RuleMeta[] = [
  { defectId: "dim", metric: { en: "oversize", th: "ขนาดเกินสเปก" }, unit: "mm", step: 0.01 },
  { defectId: "scratch", metric: { en: "scratch depth", th: "ความลึกรอย" }, unit: "µm", step: 5 },
  { defectId: "paint", metric: { en: "affected area", th: "พื้นที่สีเสีย" }, unit: "%", step: 5 },
  { defectId: "weld", metric: { en: "pore size", th: "ขนาดรูพรุน" }, unit: "mm", step: 0.1 },
  { defectId: "assembly", metric: { en: "fit gap", th: "ช่องว่างประกบ" }, unit: "mm", step: 0.1 },
  { defectId: "contam", metric: { en: "particle count", th: "จำนวนจุดปนเปื้อน" }, unit: "จุด", step: 1 },
  { defectId: "shortshot", metric: { en: "missing fill", th: "เนื้อที่ขาด" }, unit: "%", step: 1 },
];

const DEFAULT_RULES: Record<string, DispositionRule> = {
  dim: { reworkable: true, scrapAbove: 0.3, alarm: false },
  scratch: { reworkable: true, scrapAbove: 40, alarm: false },
  paint: { reworkable: true, scrapAbove: 25, alarm: false },
  weld: { reworkable: true, scrapAbove: 1.5, alarm: true }, // load-bearing seam → always alert
  assembly: { reworkable: true, scrapAbove: 1.0, alarm: false },
  contam: { reworkable: true, scrapAbove: 3, alarm: false },
  shortshot: { reworkable: true, scrapAbove: 8, alarm: false },
};

export const ruleMetaFor = (defectId: string): RuleMeta => RULE_META.find((m) => m.defectId === defectId)!;

type RuleOverrides = Record<string, Partial<DispositionRule>>;
const KEY = "factoryos:visionrules";
let cache: RuleOverrides = {};
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
function commit(next: RuleOverrides) {
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
const EMPTY: RuleOverrides = {};

export function useRuleOverrides(): RuleOverrides {
  return useSyncExternalStore(subscribe, () => cache, () => EMPTY);
}
export function ruleFor(defectId: string, ov: RuleOverrides): DispositionRule {
  return { ...DEFAULT_RULES[defectId], ...(ov[defectId] ?? {}) };
}
export function setRule(defectId: string, patch: Partial<DispositionRule>) {
  ensureHydrated();
  commit({ ...cache, [defectId]: { ...(cache[defectId] ?? {}), ...patch } });
}
export function resetRule(defectId: string) {
  ensureHydrated();
  const next = { ...cache };
  delete next[defectId];
  commit(next);
}
