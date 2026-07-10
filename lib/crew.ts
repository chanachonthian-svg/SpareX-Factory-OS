"use client";

import { useSyncExternalStore } from "react";

/**
 * Maintenance crew — supervisors assign a machine job to an engineer; the twin
 * then shows a technician standing at the machine with a game-style overhead
 * tag (name · live timer bar · current step). Persisted in localStorage so the
 * whole team sees the same board on this device.
 */

export type LZ = { en: string; th: string };

export type CrewMember = { id: string; name: LZ; short: LZ; trade: LZ; color: string };

/** the engineering team a supervisor can assign from */
export const CREW: CrewMember[] = [
  { id: "somchai", name: { en: "Somchai · Electrical", th: "สมชาย · ช่างไฟฟ้า" }, short: { en: "Somchai", th: "สมชาย" }, trade: { en: "Electrical", th: "ไฟฟ้า" }, color: "#22d3ee" },
  { id: "preecha", name: { en: "Preecha · Mechanical", th: "ปรีชา · ช่างเครื่องกล" }, short: { en: "Preecha", th: "ปรีชา" }, trade: { en: "Mechanical", th: "เครื่องกล" }, color: "#f59e0b" },
  { id: "anan", name: { en: "Anan · HVAC / Chiller", th: "อนันต์ · ช่างระบบทำความเย็น" }, short: { en: "Anan", th: "อนันต์" }, trade: { en: "HVAC", th: "ทำความเย็น" }, color: "#34d399" },
  { id: "kanya", name: { en: "Kanya · Instrumentation", th: "กัญญา · ช่างเครื่องมือวัด" }, short: { en: "Kanya", th: "กัญญา" }, trade: { en: "Instrumentation", th: "เครื่องมือวัด" }, color: "#a78bfa" },
  { id: "wichai", name: { en: "Wichai · Utilities", th: "วิชัย · ช่างระบบสาธารณูปโภค" }, short: { en: "Wichai", th: "วิชัย" }, trade: { en: "Utilities", th: "สาธารณูปโภค" }, color: "#f472b6" },
];

export type CrewAssignment = {
  assetId: string;
  engId: string;
  startedAt: number; // epoch ms
  etaMin: number; // planned duration
};

export type CrewPhaseKey = "diagnose" | "repair" | "test";

export const CREW_PHASES: Record<CrewPhaseKey, { label: LZ; color: string }> = {
  diagnose: { label: { en: "Diagnosing", th: "กำลังวินิจฉัย" }, color: "#22d3ee" },
  repair: { label: { en: "Repairing", th: "กำลังซ่อม" }, color: "#f59e0b" },
  test: { label: { en: "Testing & restart", th: "กำลังทดสอบเดินเครื่อง" }, color: "#34d399" },
};
export const CREW_OVERTIME: LZ = { en: "overtime", th: "เกินเวลา" };

/** where the job stands right now, derived from elapsed vs plan */
export function crewPhase(asg: CrewAssignment, now = Date.now()) {
  const elapsedMin = Math.max(0, (now - asg.startedAt) / 60000);
  const frac = elapsedMin / asg.etaMin;
  const key: CrewPhaseKey = frac < 0.3 ? "diagnose" : frac < 0.8 ? "repair" : "test";
  return { key, pct: Math.min(1, frac), overtime: frac > 1, elapsedMin };
}

export function crewElapsedLabel(asg: CrewAssignment, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - asg.startedAt) / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return hh > 0 ? `${hh}:${p(mm)}:${p(ss)}` : `${p(mm)}:${p(ss)}`;
}

export const crewMember = (id: string): CrewMember => CREW.find((c) => c.id === id) ?? CREW[0];

/* ------------------------------------------------------------------- store */

const KEY = "factoryos:crew";
const EMPTY: CrewAssignment[] = [];
let cache: CrewAssignment[] | null = null;
const subs = new Set<() => void>();

function load(): CrewAssignment[] {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as CrewAssignment[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function save(next: CrewAssignment[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  subs.forEach((f) => f());
}

function subscribe(fn: () => void) {
  subs.add(fn);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; fn(); } };
  window.addEventListener("storage", onStorage);
  return () => { subs.delete(fn); window.removeEventListener("storage", onStorage); };
}

export function useCrewAssignments(): CrewAssignment[] {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}

/** supervisor hands the job to an engineer (one active job per machine) */
export function assignJob(assetId: string, engId: string, etaMin: number) {
  const rest = load().filter((a) => a.assetId !== assetId);
  save([...rest, { assetId, engId, startedAt: Date.now(), etaMin }]);
}

/** job finished — the technician leaves the machine */
export function completeJob(assetId: string) {
  save(load().filter((a) => a.assetId !== assetId));
}
