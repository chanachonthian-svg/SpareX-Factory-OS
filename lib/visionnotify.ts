"use client";

import { useSyncExternalStore } from "react";
import type { LZ } from "./vision";

/** Who gets told when the gate finds trouble — email + LINE per person, per event.
 *  Real delivery goes through the plant's SMTP and a LINE Official Account once connected;
 *  until then the list lives on this device so the demo behaves like the real thing. */
export type NotifyEventId = "scrap" | "spike" | "predict" | "daily";
export const NOTIFY_EVENTS: { id: NotifyEventId; name: LZ; desc: LZ }[] = [
  { id: "scrap", name: { en: "Scrap found", th: "คัดออก (Scrap)" }, desc: { en: "fires only for defects with the 'alert on scrap' flag turned on in the disposition rules", th: "ส่งเฉพาะดีเฟกต์ที่เปิดธง 'แจ้งเตือนเมื่อคัดออก' ไว้ในกติกาการคัด" } },
  { id: "spike", name: { en: "Defect spike", th: "ดีเฟกต์พุ่งผิดปกติ" }, desc: { en: "any defect running above 2× its normal rate", th: "ดีเฟกต์ตัวไหนก็ตามที่เกิดเกิน 2 เท่าของอัตราปกติ" } },
  { id: "predict", name: { en: "AI prediction", th: "AI คาดการณ์ความเสี่ยง" }, desc: { en: "look-ahead risks — tool wear, process about to fail", th: "ความเสี่ยงล่วงหน้า เช่น ทูลใกล้ครบอายุ กระบวนการใกล้มีปัญหา" } },
  { id: "daily", name: { en: "Daily summary", th: "สรุปท้ายวัน" }, desc: { en: "one message at day end — pieces, defects, money lost", th: "ส่งครั้งเดียวท้ายวัน — ยอดผลิต ดีเฟกต์ เงินที่เสีย" } },
];

export type Recipient = {
  id: string;
  name: string;
  role: string;
  email: string;
  lineId: string;
  viaEmail: boolean;
  viaLine: boolean;
  events: NotifyEventId[];
};

/** demo starting point — replaced by the plant's own people as they edit */
const DEFAULTS: Recipient[] = [
  { id: "r1", name: "สมชาย ใจดี", role: "หัวหน้าไลน์ B", email: "", lineId: "somchai.line", viaEmail: false, viaLine: true, events: ["scrap", "spike"] },
  { id: "r2", name: "พรทิพย์ ตั้งใจ", role: "วิศวกร QC", email: "pornthip.qc@plant.co.th", lineId: "pornthip.qa", viaEmail: true, viaLine: true, events: ["scrap", "spike", "predict"] },
  { id: "r3", name: "เกริกไกร ภูมิดี", role: "ผู้จัดการโรงงาน", email: "plant.mgr@plant.co.th", lineId: "", viaEmail: true, viaLine: false, events: ["predict", "daily"] },
];

const KEY = "factoryos:visionnotify";
let cache: Recipient[] | null = null;
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
function commit(next: Recipient[]) {
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

export function useRecipients(): Recipient[] {
  return useSyncExternalStore(subscribe, () => cache ?? DEFAULTS, () => DEFAULTS);
}
export function addRecipient() {
  ensureHydrated();
  const list = cache ?? DEFAULTS;
  const n = list.reduce((m, r) => Math.max(m, Number(r.id.replace(/\D/g, "")) || 0), 0) + 1;
  commit([...list, { id: `r${n}`, name: "", role: "", email: "", lineId: "", viaEmail: true, viaLine: false, events: ["scrap"] }]);
}
export function updateRecipient(id: string, patch: Partial<Omit<Recipient, "id">>) {
  ensureHydrated();
  commit((cache ?? DEFAULTS).map((r) => (r.id === id ? { ...r, ...patch } : r)));
}
export function removeRecipient(id: string) {
  ensureHydrated();
  commit((cache ?? DEFAULTS).filter((r) => r.id !== id));
}
export function toggleRecipientEvent(id: string, ev: NotifyEventId) {
  ensureHydrated();
  commit((cache ?? DEFAULTS).map((r) => (r.id === id ? { ...r, events: r.events.includes(ev) ? r.events.filter((e) => e !== ev) : [...r.events, ev] } : r)));
}
