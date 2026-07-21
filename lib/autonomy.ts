"use client";

/** Single source of truth for "how much may the AI do on its own".
 *
 *  Two layers, wired together here:
 *  - the plant-wide Autonomy Level from Settings (factoryos:automation.autonomy:
 *    0 = Advisory, 1 = Approve each, 2 = Full-auto) — the company policy;
 *  - the per-measure "AI Auto" toggles scattered across modules — the
 *    assignments. Their states live centrally (factoryos:ai-auto) so Settings
 *    can show "AI is managing N things" and Advisory mode can force them off.
 *
 *  In Advisory the toggles read as OFF and refuse to switch on; the stored
 *  assignments survive, so raising the level brings them right back. */

import { useSyncExternalStore } from "react";

const AKEY = "factoryos:automation";
const QKEY = "factoryos:ai-auto";

export type AutonomyLevel = 0 | 1 | 2; // Advisory | Approve each | Full-auto

type Reg = Record<string, Record<string, boolean>>; // module -> toggle id -> on
type Snap = { level: AutonomyLevel; reg: Reg };

const SERVER_SNAP: Snap = { level: 1, reg: {} };
let cache: Snap | null = null;
const listeners = new Set<() => void>();

function read(): Snap {
  let level: AutonomyLevel = 1;
  let reg: Reg = {};
  try {
    const a = JSON.parse(localStorage.getItem(AKEY) || "{}");
    if (a.autonomy === 0 || a.autonomy === 1 || a.autonomy === 2) level = a.autonomy;
  } catch { /* default */ }
  try { reg = JSON.parse(localStorage.getItem(QKEY) || "{}") ?? {}; } catch { /* default */ }
  return { level, reg };
}

function snapshot(): Snap {
  if (!cache) cache = read();
  return cache;
}

function notify() {
  cache = read();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = () => notify(); // other tabs
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
}

/** call after writing factoryos:automation (Settings) so toggles react in-tab */
export function notifyAutonomyChanged() { notify(); }

export function useAutonomyLevel(): AutonomyLevel {
  return useSyncExternalStore(subscribe, snapshot, () => SERVER_SNAP).level;
}

/** Drop-in for the modules' old `useState<Record<string, boolean>>(defaults)`.
 *  Same [state, setState] contract, but persisted centrally and gated by the
 *  plant autonomy level: Advisory forces everything off and ignores writes. */
export function useAiAutoQw(
  module: string,
  defaults: Record<string, boolean>,
): [Record<string, boolean>, (u: React.SetStateAction<Record<string, boolean>>) => void, AutonomyLevel] {
  const s = useSyncExternalStore(subscribe, snapshot, () => SERVER_SNAP);
  const merged = { ...defaults, ...(s.reg[module] ?? {}) };
  const effective =
    s.level === 0 ? Object.fromEntries(Object.keys(merged).map((k) => [k, false])) : merged;
  const set = (u: React.SetStateAction<Record<string, boolean>>) => {
    const now = snapshot();
    if (now.level === 0) return; // Advisory — the policy layer wins
    const cur = { ...defaults, ...(now.reg[module] ?? {}) };
    const next = typeof u === "function" ? u(cur) : u;
    try { localStorage.setItem(QKEY, JSON.stringify({ ...now.reg, [module]: next })); } catch { /* ignore */ }
    notify();
  };
  return [effective, set, s.level];
}

/** for Settings: how many measures the AI is currently assigned, and where */
export function useAiAutoSummary(): { count: number; modules: string[]; level: AutonomyLevel } {
  const s = useSyncExternalStore(subscribe, snapshot, () => SERVER_SNAP);
  let count = 0;
  const modules: string[] = [];
  for (const [mod, m] of Object.entries(s.reg)) {
    const on = Object.values(m).filter(Boolean).length;
    if (on) { count += on; modules.push(mod); }
  }
  return { count, modules, level: s.level };
}
