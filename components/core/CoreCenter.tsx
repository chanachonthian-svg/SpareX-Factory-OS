"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CalendarClock, CheckCircle2, Clock3, Mail, MessageSquare, Settings2 } from "lucide-react";
import { KpiCard } from "@/components/os/KpiCard";
import { useNotifications } from "@/lib/notifications";
import { useI18n } from "@/lib/i18n";

type CenterKind = "events" | "notifications";

const copy = {
  events: {
    title: "Factory Event Stream",
    subtitle: "Operational events collected across every Factory OS module",
    icon: CalendarClock,
    items: [
      ["10:52", "Chiller B", "Condition threshold exceeded", "Critical"],
      ["10:47", "PeakShield AI", "Peak-demand prevention armed", "Warning"],
      ["10:31", "VisionIQ", "Quality inspection event recorded", "Review"],
    ],
  },
  notifications: {
    title: "Alerts delivered",
    subtitle: "What fired, who it reached, and through which channel",
    icon: Bell,
    items: [
      ["10:53", "Maintenance team", "Chiller B critical alert delivered", "Delivered"],
      ["10:48", "Energy manager", "Peak-demand warning delivered", "Delivered"],
      ["10:32", "Quality team", "VisionIQ review request queued", "Queued"],
    ],
  },
} as const;

export function CoreCenter({ kind }: { kind: CenterKind }) {
  const data = copy[kind];
  const CenterIcon = data.icon;
  const notifs = useNotifications();
  const { locale } = useI18n();
  const tr = (o: { en: string; th: string }) => (locale === "th" ? o.th : o.en);
  // which channels are switched on in Settings → shown as delivery proof per alert
  const [ch, setCh] = useState({ email: true, line: true });
  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem("factoryos:notify") || "{}");
      setCh({ email: c.email !== false, line: c.line !== false });
    } catch { /* defaults */ }
  }, []);
  const isNotif = kind === "notifications";
  // live notifications (e.g. verified work orders reporting back) lead the list
  const liveItems: [string, string, string, string][] =
    kind === "notifications"
      ? notifs.map((n) => [n.at.slice(-5), tr(n.title), tr(n.body), n.kind === "verified" ? (locale === "th" ? "ยืนยันผล" : "Verified") : locale === "th" ? "ส่งแล้ว" : "Delivered"])
      : [];
  const items: (readonly [string, string, string, string])[] = [...liveItems, ...data.items];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Open" value="7" accent="#f59e0b" />
        <KpiCard label="Critical" value="2" accent="#f43f5e" />
        <KpiCard label="Completed today" value="26" accent="#34d399" />
        <KpiCard label="Average response" value="4" unit="min" accent="#22d3ee" />
      </section>
      <section className="panel overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b border-white/10 p-5">
          <CenterIcon size={18} className="text-brand-300" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{data.title}</h2>
            <p className="mt-0.5 text-xs text-white/45">{data.subtitle}</p>
          </div>
          {isNotif ? (
            <Link href="/os/settings?tab=notify" className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.02] px-3 py-1.5 text-[12px] text-white/60 transition hover:border-brand-400/40 hover:text-white">
              <Settings2 size={13} /> {tr({ en: "Notification setup", th: "ตั้งค่าการแจ้งเตือน" })}
            </Link>
          ) : null}
        </div>
        <ul className="divide-y divide-white/5">
          {items.map(([time, target, message, status]) => (
            <li key={`${time}-${target}`} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-4">
              <Clock3 size={15} className="shrink-0 text-white/35" />
              <span className="w-12 shrink-0 font-mono text-xs text-white/45">{time}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{target}</p>
                <p className="truncate text-xs text-white/50">{message}</p>
              </div>
              {/* delivery proof — which channels carried this alert */}
              {isNotif && status !== (locale === "th" ? "รอส่ง" : "Queued") ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  {ch.email ? <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-white/55"><Mail size={10} /> ✓</span> : null}
                  {ch.line ? <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/20 bg-emerald-400/[0.06] px-1.5 py-0.5 text-[10px] text-emerald-200/80"><MessageSquare size={10} /> ✓</span> : null}
                </div>
              ) : null}
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/65">
                <CheckCircle2 size={12} className="text-emerald-300" /> {status}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
