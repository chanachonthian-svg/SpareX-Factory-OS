import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Compact number formatter: 1.2K / 3.4M. */
export function formatCompact(n: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** Thai Baht, no decimals — the platform's default operating currency. */
export function formatTHB(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Deterministic PRNG (mulberry32) — same seed → same sequence on server & client.
 *  Use this everywhere instead of Math.random() to avoid hydration mismatches. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Global event channel for opening the AI Copilot from anywhere (decoupled). */
export const COPILOT_EVENT = "factoryos:copilot";

export function openCopilot(prompt?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(COPILOT_EVENT, { detail: { prompt } }));
  }
}
