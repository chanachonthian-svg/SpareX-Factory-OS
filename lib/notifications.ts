"use client";

import { useSyncExternalStore } from "react";

export type LZ = { en: string; th: string };
export type NotifSource = "energy" | "asset" | "production" | "maintenance" | "system";
export type NotifKind = "verified" | "alert" | "info";

export type Notification = {
  id: string;
  source: NotifSource;
  kind: NotifKind;
  title: LZ;
  body: LZ;
  at: string; // YYYY-MM-DD HH:MM
  read: boolean;
  href?: string;
};

const KEY = "factoryos:notifications";

// tiny external store — mirrors lib/workorders (seed on server, hydrate client, persist)
let cache: Notification[] = [];
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
      cache = JSON.parse(s) as Notification[];
      notify();
    }
  } catch {
    /* ignore corrupt storage */
  }
}
function commit(next: Notification[]) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  }
  notify();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  ensureHydrated();
  return () => listeners.delete(cb);
}

export function useNotifications(): Notification[] {
  return useSyncExternalStore(subscribe, () => cache, () => cache);
}

/** add a notification (idempotent per id — same event won't stack) */
export function pushNotification(n: Notification) {
  ensureHydrated();
  if (cache.some((x) => x.id === n.id)) return;
  commit([n, ...cache]);
}

export function markNotificationRead(id: string) {
  commit(cache.map((n) => (n.id === id ? { ...n, read: true } : n)));
}
