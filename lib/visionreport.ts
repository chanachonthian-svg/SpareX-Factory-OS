"use client";

import { useSyncExternalStore } from "react";
import type { ReportSchedule } from "./vision";

/** Auto-delivery cadence per report template — overrides the template default.
 *  Delivery goes to the Email/LINE recipients configured in Settings. */
type ScheduleOverrides = Record<string, ReportSchedule>;
const KEY = "factoryos:visionreport";
let cache: ScheduleOverrides = {};
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
function commit(next: ScheduleOverrides) {
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
const EMPTY: ScheduleOverrides = {};

export function useScheduleOverrides(): ScheduleOverrides {
  return useSyncExternalStore(subscribe, () => cache, () => EMPTY);
}
export function setReportSchedule(id: string, s: ReportSchedule) {
  ensureHydrated();
  commit({ ...cache, [id]: s });
}
