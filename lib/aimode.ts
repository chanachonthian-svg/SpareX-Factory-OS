"use client";

import { useSyncExternalStore } from "react";

/** System capability mode — the sales/demo toggle that separates what raw meters
 *  give you from what the AI layer adds on top.
 *   · "ai"    → full product: every insight, forecast and autonomous action unlocked
 *   · "meter" → meters & thresholds only; AI-driven panels are locked (upsell teaser)
 *  Persisted per-device so a demo keeps its state across reloads. */
export type AiMode = "ai" | "meter";
const KEY = "factoryos:aimode";

let cache: AiMode = "ai"; // default to the full experience
let hydrated = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const s = window.localStorage.getItem(KEY);
    if (s === "meter" || s === "ai") { cache = s; notify(); }
  } catch { /* ignore corrupt storage */ }
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  ensureHydrated();
  return () => { listeners.delete(cb); };
}

export function useAiMode(): AiMode {
  return useSyncExternalStore(subscribe, () => cache, () => "ai");
}
/** convenience — true when the AI layer is on */
export function useIsAiOn(): boolean {
  return useAiMode() === "ai";
}
export function setAiMode(m: AiMode) {
  ensureHydrated();
  cache = m;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(KEY, m); } catch { /* quota */ }
  }
  notify();
}
