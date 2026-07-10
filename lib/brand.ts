"use client";

import { useSyncExternalStore } from "react";

/** Customer branding (the factory operator's own name + logo) that appears on every
 *  exported report. Distinct from the SpareX product brand in lib/site.ts.
 *  Client-only, persisted to localStorage. */
export type Brand = { companyName: string; logo: string | null };

const KEY = "factoryos:brand";
const DEFAULT: Brand = { companyName: "Bangkok Plant 1", logo: null };

let cache: Brand = DEFAULT;
let hydrated = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const s = window.localStorage.getItem(KEY);
    if (s) { cache = { ...DEFAULT, ...JSON.parse(s) }; notify(); }
  } catch {
    /* ignore corrupt storage */
  }
}

export function setBrand(patch: Partial<Brand>) {
  ensureHydrated();
  cache = { ...cache, ...patch };
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* quota */ }
  }
  notify();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  ensureHydrated();
  return () => { listeners.delete(cb); };
}

export function useBrand(): Brand {
  return useSyncExternalStore(subscribe, () => cache, () => DEFAULT);
}
