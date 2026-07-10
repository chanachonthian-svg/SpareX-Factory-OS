"use client";

import { useSyncExternalStore } from "react";

export type LZ = { en: string; th: string };
export type WOStatus = "approved" | "parts" | "scheduled" | "in_progress" | "done" | "verified";
export type WOPriority = "high" | "med" | "low";
/** which intelligence module raised the job — lets each module show its own slice */
export type WOSource = "energy" | "asset" | "production" | "manual";

export type WorkOrder = {
  id: string; // WO-2026-0142
  source: WOSource;
  findingId?: string; // links back to a PM finding
  findingCode?: string; // PQ-05
  title: LZ;
  asset: LZ;
  priority: WOPriority;
  capex: number;
  annualSaving: number;
  partsCount: number;
  created: string; // YYYY-MM-DD
  due: string; // YYYY-MM-DD
  status: WOStatus;
  assignee: string;
  line?: string; // plant section — resolves the owning maintenance team (lib/teams)
};

/** the maintenance lifecycle a corrective job moves through */
export const WO_FLOW: WOStatus[] = ["approved", "parts", "scheduled", "in_progress", "done", "verified"];

export const WO_STATUS: Record<WOStatus, { label: LZ; color: string }> = {
  approved: { label: { en: "Approved · WO issued", th: "อนุมัติ · ออก WO แล้ว" }, color: "var(--c-indigo)" },
  parts: { label: { en: "Ordering parts", th: "กำลังสั่งอะไหล่" }, color: "var(--c-amber-strong)" },
  scheduled: { label: { en: "Technician scheduled", th: "นัดช่างแล้ว" }, color: "var(--c-cyan)" },
  in_progress: { label: { en: "In progress", th: "กำลังดำเนินการ" }, color: "var(--c-cyan)" },
  done: { label: { en: "Work complete", th: "งานเสร็จ" }, color: "var(--c-emerald)" },
  verified: { label: { en: "Verified · M&V", th: "ยืนยันผลแล้ว · M&V" }, color: "var(--c-emerald)" },
};

export const WO_PRIORITY: Record<WOPriority, { label: LZ; color: string }> = {
  high: { label: { en: "High", th: "ด่วน" }, color: "var(--c-rose)" },
  med: { label: { en: "Medium", th: "ปานกลาง" }, color: "var(--c-amber-strong)" },
  low: { label: { en: "Low", th: "ต่ำ" }, color: "var(--c-emerald)" },
};

const KEY = "factoryos:workorders";

const SEED: WorkOrder[] = [
  { id: "WO-2026-0139", source: "energy", findingCode: "PQ-06", title: { en: "Install demand controller · shed non-critical loads at threshold", th: "ติดตั้งตัวควบคุมดีมานด์ · ปลดโหลดไม่วิกฤตเมื่อถึงเพดาน" }, asset: { en: "Plant-wide · main meter", th: "ทั้งโรงงาน · มิเตอร์หลัก" }, priority: "high", capex: 120000, annualSaving: 640000, partsCount: 2, created: "2026-06-28", due: "2026-07-05", status: "in_progress", assignee: "สมชาย · ทีมไฟฟ้า", line: "Electrical" },
  { id: "WO-2026-0138", source: "energy", findingCode: "PQ-01", title: { en: "Add PF correction capacitor bank · lift PF to 0.99", th: "ติดตั้งคาปาซิเตอร์แก้ PF · · PF เป็น 0.99" }, asset: { en: "MDB · incomer", th: "ตู้เมน MDB · จุดรับไฟ" }, priority: "med", capex: 185000, annualSaving: 342000, partsCount: 1, created: "2026-06-20", due: "2026-06-30", status: "verified", assignee: "อรุณ · ทีมไฟฟ้า", line: "Electrical" },
  { id: "WO-2026-0137", source: "energy", findingCode: "PQ-10", title: { en: "Clean condenser & restore chiller setpoints", th: "ล้างคอนเดนเซอร์ & ตั้งค่า Chiller กลับค่าออกแบบ" }, asset: { en: "Chiller plant · CH-2", th: "ห้อง Chiller · CH-2" }, priority: "med", capex: 65000, annualSaving: 288000, partsCount: 2, created: "2026-06-30", due: "2026-07-14", status: "scheduled", assignee: "ทีม HVAC", line: "Cooling" },
];

// tiny external store: seed on server, hydrate from localStorage on client, persist writes
let cache: WorkOrder[] = SEED;
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}
function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const s = window.localStorage.getItem(KEY);
    if (s) {
      // migrate orders saved before `source` existed — all early WOs came from energy findings
      cache = (JSON.parse(s) as WorkOrder[]).map((w) => ({ ...w, source: w.source ?? "energy" }));
      notify();
    }
  } catch {
    /* ignore corrupt storage */
  }
}
function commit(next: WorkOrder[]) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  }
  notify();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  ensureHydrated();
  return () => {
    listeners.delete(cb);
  };
}
function getSnapshot() {
  return cache;
}
function getServerSnapshot() {
  return SEED;
}

export function useWorkOrders(): WorkOrder[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
export function useWorkOrderFor(findingId?: string): WorkOrder | undefined {
  const all = useWorkOrders();
  return findingId ? all.find((w) => w.findingId === findingId) : undefined;
}
/** the slice a single module owns — e.g. EnergyAI shows only its own work orders */
export function useWorkOrdersBySource(source: WOSource): WorkOrder[] {
  return useWorkOrders().filter((w) => w.source === source);
}

const PRIORITY_DUE_DAYS: Record<WOPriority, number> = { high: 3, med: 14, low: 30 };
/** local YYYY-MM-DD (not toISOString, which shifts to UTC and can land a day off) */
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const iso = isoDate;

/** raise a work order from an approved finding (idempotent per finding) */
export function createWorkOrder(
  f: {
    id: string;
    code: string;
    title: LZ;
    asset: LZ;
    severity: "critical" | "warning" | "advisory";
    capex: number;
    annualSaving: number;
    partsCount: number;
  },
  source: WOSource = "energy",
): WorkOrder {
  ensureHydrated();
  const existing = cache.find((w) => w.findingId === f.id);
  if (existing) return existing;
  const priority: WOPriority = f.severity === "critical" ? "high" : f.severity === "warning" ? "med" : "low";
  const now = new Date();
  const due = new Date(now.getTime() + PRIORITY_DUE_DAYS[priority] * 86_400_000);
  const maxSeq = cache.reduce((m, w) => {
    const n = parseInt(w.id.slice(-4), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 139);
  const wo: WorkOrder = {
    id: `WO-${now.getFullYear()}-${String(maxSeq + 1).padStart(4, "0")}`,
    source,
    findingId: f.id,
    findingCode: f.code,
    title: f.title,
    asset: f.asset,
    priority,
    capex: f.capex,
    annualSaving: f.annualSaving,
    partsCount: f.partsCount,
    created: iso(now),
    due: iso(due),
    status: f.partsCount > 0 ? "approved" : "scheduled", // setpoint-only jobs skip the parts stage
    assignee: "—",
  };
  commit([wo, ...cache]);
  return wo;
}

export function advanceWorkOrder(id: string) {
  commit(
    cache.map((w) => {
      if (w.id !== id) return w;
      const i = WO_FLOW.indexOf(w.status);
      return i < WO_FLOW.length - 1 ? { ...w, status: WO_FLOW[i + 1] } : w;
    }),
  );
}
