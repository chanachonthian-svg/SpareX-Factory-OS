"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, MapPin, ArrowRight, CircleCheck, CalendarClock, CalendarDays, List, ListChecks, ChevronLeft, ChevronRight, Users, UserPlus, Crown } from "lucide-react";
import { useTr } from "@/lib/autotranslate";
import { useI18n } from "@/lib/i18n";
import { cn, formatCompact } from "@/lib/utils";
import {
  useWorkOrders,
  advanceWorkOrder,
  isoDate,
  WO_FLOW,
  WO_STATUS,
  WO_PRIORITY,
  type WorkOrder,
  type LZ,
} from "@/lib/workorders";
import { useTeams, usePeople, personForLine, teamOfPerson, type Team, type Person } from "@/lib/teams";
import { MaintenanceTeams } from "./MaintenanceTeams";

type Filter = "all" | "open" | "done";
type View = "list" | "calendar" | "teams";

const MONTHS: LZ[] = [
  { en: "January", th: "มกราคม" }, { en: "February", th: "กุมภาพันธ์" }, { en: "March", th: "มีนาคม" },
  { en: "April", th: "เมษายน" }, { en: "May", th: "พฤษภาคม" }, { en: "June", th: "มิถุนายน" },
  { en: "July", th: "กรกฎาคม" }, { en: "August", th: "สิงหาคม" }, { en: "September", th: "กันยายน" },
  { en: "October", th: "ตุลาคม" }, { en: "November", th: "พฤศจิกายน" }, { en: "December", th: "ธันวาคม" },
];
const DOW: LZ[] = [
  { en: "Su", th: "อา" }, { en: "Mo", th: "จ" }, { en: "Tu", th: "อ" }, { en: "We", th: "พ" },
  { en: "Th", th: "พฤ" }, { en: "Fr", th: "ศ" }, { en: "Sa", th: "ส" },
];

export function WorkOrdersModule() {
  const tr = useTr();
  const { locale } = useI18n();
  const L = (o: LZ) => (locale === "th" ? o.th : o.en);
  const orders = useWorkOrders();
  const teams = useTeams();
  const people = usePeople();
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("list");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const today = mounted ? isoDate(new Date()) : "";

  const isOpen = (w: WorkOrder) => w.status !== "done" && w.status !== "verified";
  const openCount = orders.filter(isOpen).length;
  const capexOpen = orders.filter(isOpen).reduce((s, w) => s + w.capex, 0);
  const savingSecured = orders.filter((w) => w.status === "verified").reduce((s, w) => s + w.annualSaving, 0);
  const overdue = mounted ? orders.filter((w) => isOpen(w) && w.due < today).length : 0;

  const list = orders.filter((w) => (filter === "all" ? true : filter === "open" ? isOpen(w) : !isOpen(w)));

  const FILTERS: { k: Filter; label: string }[] = [
    { k: "all", label: tr("All") },
    { k: "open", label: tr("Open") },
    { k: "done", label: tr("Completed") },
  ];

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={tr("Open orders")} value={String(openCount)} accent="var(--c-indigo)" />
        <Kpi label={tr("Capex committed")} value={`฿${formatCompact(capexOpen)}`} accent="var(--c-amber-strong)" />
        <Kpi label={tr("Saving secured")} value={`฿${formatCompact(savingSecured)}/${tr("yr")}`} accent="var(--c-emerald)" />
        <Kpi label={tr("Overdue")} value={String(overdue)} accent={overdue ? "var(--c-rose)" : "#64748b"} />
      </div>

      {/* toolbar: filters (list only) + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {view === "list" ? (
          <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
            {FILTERS.map((f) => (
              <button key={f.k} onClick={() => setFilter(f.k)} className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition", filter === f.k ? "bg-brand-400/15 text-brand-200" : "text-white/50 hover:text-white/80")}>{f.label}</button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
          <button onClick={() => setView("list")} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition", view === "list" ? "bg-brand-400/15 text-brand-200" : "text-white/50 hover:text-white/80")}><List size={13} /> {tr("List")}</button>
          <button onClick={() => setView("calendar")} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition", view === "calendar" ? "bg-brand-400/15 text-brand-200" : "text-white/50 hover:text-white/80")}><CalendarDays size={13} /> {tr("Calendar")}</button>
          <button onClick={() => setView("teams")} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition", view === "teams" ? "bg-brand-400/15 text-brand-200" : "text-white/50 hover:text-white/80")}><Users size={13} /> {L({ en: "Departments", th: "แผนกดูแล" })}</button>
        </div>
      </div>

      {view === "teams" ? (
        <MaintenanceTeams />
      ) : view === "calendar" ? (
        <CalendarView orders={orders} tr={tr} L={L} />
      ) : list.length === 0 ? (
        <div className="panel grid place-items-center p-12 text-center">
          <ClipboardCheck size={26} className="text-white/30" />
          <p className="mt-3 text-sm font-medium text-white/70">{tr("No work orders yet")}</p>
          <p className="mt-1 text-xs text-white/40">{tr("Approve a finding to raise its work order.")}</p>
        </div>
      ) : (
        <div className="panel overflow-hidden p-0">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col style={{ width: "12%" }} />{/* WO */}
              <col />{/* Job — flexes to fill */}
              <col style={{ width: "13%" }} />{/* Assignee */}
              <col style={{ width: "9%" }} />{/* Progress */}
              <col style={{ width: "8.5%" }} />{/* Money */}
              <col style={{ width: "9%" }} />{/* Due */}
              <col style={{ width: "12.5%" }} />{/* Status */}
              <col style={{ width: "52px" }} />{/* Action */}
            </colgroup>
            <thead>
              <tr className="border-b border-white/10 text-left text-[10px] font-medium uppercase tracking-wider text-white/40">
                <th className="px-3 py-3 pl-4">WO</th>
                <th className="px-2 py-3">{L({ en: "Job", th: "งาน" })}</th>
                <th className="px-2 py-3">{L({ en: "Assignee", th: "ผู้รับผิดชอบ" })}</th>
                <th className="px-2 py-3">{L({ en: "Progress", th: "ความคืบหน้า" })}</th>
                <th className="px-2 py-3 text-right">{L({ en: "Capex · Saving", th: "งบ · ประหยัด" })}</th>
                <th className="px-2 py-3">{L({ en: "Due", th: "กำหนดเสร็จ" })}</th>
                <th className="px-2 py-3">{L({ en: "Status", th: "สถานะ" })}</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.map((w) => {
                const sc = WO_STATUS[w.status];
                const pc = WO_PRIORITY[w.priority];
                const curIdx = WO_FLOW.indexOf(w.status);
                const next = WO_FLOW[curIdx + 1];
                const overdueRow = mounted && isOpen(w) && w.due < today;
                const shortStatus = L(sc.label).split("·")[0].trim();
                return (
                  <tr key={w.id} className="border-b border-white/5 align-middle transition last:border-0 hover:bg-white/[0.02]">
                    {/* WO id + finding code + priority */}
                    <td className="px-3 py-3 pl-4">
                      <span className="block truncate font-mono text-[12px] font-semibold text-white/85">{w.id}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1">
                        {w.findingCode ? <span className="rounded bg-white/[0.06] px-1 py-0.5 text-[9px] font-medium tabular text-white/55">{w.findingCode}</span> : null}
                        <span className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-medium" style={{ color: pc.color, backgroundColor: `color-mix(in srgb, ${pc.color} 13%, transparent)` }}>
                          <span className="h-1 w-1 rounded-full" style={{ backgroundColor: pc.color }} />{L(pc.label)}
                        </span>
                      </span>
                    </td>
                    {/* Job title + location + parts */}
                    <td className="px-2 py-3">
                      <p className="truncate text-[13px] font-medium text-white/90" title={L(w.title)}>{L(w.title)}</p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-white/45"><MapPin size={10} className="shrink-0" /> <span className="truncate">{L(w.asset)} · {w.partsCount} {tr("parts")}</span></p>
                    </td>
                    {/* Assignee — the engineer who personally covers this section (+ their team) */}
                    <td className="min-w-0 px-2 py-3">
                      <OwnerCell line={w.line} teams={teams} people={people} L={L} />
                    </td>
                    {/* Progress stepper */}
                    <td className="px-2 py-3">
                      <div className="flex gap-0.5">
                        {WO_FLOW.map((s, i) => (
                          <div key={s} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: i <= curIdx ? sc.color : "rgba(255,255,255,0.08)" }} />
                        ))}
                      </div>
                      <p className="mt-1 whitespace-nowrap text-[10px] text-white/40">{tr("Stage")} {curIdx + 1}/{WO_FLOW.length}</p>
                    </td>
                    {/* Capex + Saving (merged) */}
                    <td className="px-2 py-3 text-right">
                      <span className="block whitespace-nowrap tabular text-[11px] text-white/55">฿{formatCompact(w.capex)}</span>
                      <span className="block whitespace-nowrap tabular text-[12.5px] font-semibold text-emerald-300">฿{formatCompact(w.annualSaving)}/{tr("yr")}</span>
                    </td>
                    {/* Due */}
                    <td className="px-2 py-3">
                      <span className={cn("inline-flex items-center gap-1 whitespace-nowrap text-[11px] tabular", overdueRow ? "text-rose-300" : "text-white/55")}>
                        <CalendarClock size={11} className="shrink-0" /> {w.due}
                      </span>
                      {overdueRow ? <span className="mt-0.5 block text-[10px] text-rose-300">{tr("overdue")}</span> : null}
                    </td>
                    {/* Status (short label, full on hover) */}
                    <td className="px-2 py-3">
                      <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2 py-0.5 text-[10.5px] font-medium" title={L(sc.label)} style={{ color: sc.color, backgroundColor: `color-mix(in srgb, ${sc.color} 12%, transparent)` }}>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: sc.color }} /><span className="truncate">{shortStatus}</span>
                      </span>
                    </td>
                    {/* Action — icon only, tooltip explains */}
                    <td className="px-2 py-3 pr-4 text-right">
                      {next ? (
                        <button onClick={() => advanceWorkOrder(w.id)} title={`${tr("Continue")} → ${L(WO_STATUS[next].label)}`} className="btn-glow ml-auto grid h-8 w-8 place-items-center p-0"><ArrowRight size={14} /></button>
                      ) : (
                        <span title={tr("Completed")} className="ml-auto grid h-8 w-8 place-items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"><CircleCheck size={15} /></span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------- responsible team + leader cell
   Resolved from the maintenance-team coverage (lib/teams) — the single source
   of truth a supervisor sets under the "Teams" tab. */
function OwnerCell({ line, teams, people, L }: { line?: string; teams: Team[]; people: Person[]; L: (o: LZ) => string }) {
  const person = line ? personForLine(line, people) : undefined;
  const team = person ? teamOfPerson(person.id, teams) : undefined;
  if (!person) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] text-white/40" title={L({ en: "no engineer covers this section — assign one under Departments", th: "ยังไม่มีช่างดูแลส่วนนี้ — มอบหมา·ี่แท็บแผนกดูแล" })}>
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-dashed border-white/25"><UserPlus size={12} /></span>
        {L({ en: "Unassigned", th: "ยังไม่มอบหมาย" })}
      </span>
    );
  }
  const color = team?.color ?? "#64748b";
  const isLead = team?.leaderId === person.id;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-ink-950" style={{ backgroundColor: color }}>{[...L(person.name)][0]}</span>
      <span className="min-w-0 leading-tight">
        <span className="flex items-center gap-1 truncate text-[12.5px] font-medium text-white/90">{isLead ? <Crown size={10} className="shrink-0" style={{ color }} /> : null}{L(person.name)}</span>
        <span className="block truncate text-[10.5px] text-white/45">{team ? L(team.name) : L(person.trade)}</span>
      </span>
    </span>
  );
}

function CalendarView({ orders, tr, L }: { orders: WorkOrder[]; tr: (s: string) => string; L: (o: LZ) => string }) {
  const [mounted, setMounted] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="panel h-96 animate-pulse opacity-40" />;

  const isOpen = (w: WorkOrder) => w.status !== "done" && w.status !== "verified";
  const now = new Date();
  const today = isoDate(now);
  const shift = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return isoDate(d);
  };
  const in7 = shift(7);
  const endOfMonth = isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  // "to-do" = still-open work, grouped by when it's due
  const buckets = {
    overdue: orders.filter((w) => isOpen(w) && w.due < today),
    today: orders.filter((w) => isOpen(w) && w.due === today),
    week: orders.filter((w) => isOpen(w) && w.due > today && w.due <= in7),
    month: orders.filter((w) => isOpen(w) && w.due > in7 && w.due <= endOfMonth),
  };

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const cells = Array.from({ length: 42 }, (_, i) => new Date(year, month, i - firstDow + 1));

  const SECTIONS: { key: keyof typeof buckets; label: LZ; color: string }[] = [
    { key: "overdue", label: { en: "Overdue", th: "เกินกำหนด" }, color: "var(--c-rose)" },
    { key: "today", label: { en: "Today", th: "วันนี้" }, color: "var(--c-indigo)" },
    { key: "week", label: { en: "This week", th: "สัปดาห์นี้" }, color: "var(--c-cyan)" },
    { key: "month", label: { en: "This month", th: "เดือนนี้" }, color: "var(--c-amber-strong)" },
  ];

  return (
    <div className="space-y-4">
      {/* quick buckets */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SECTIONS.map((s) => (
          <div key={s.key} className="rounded-xl border p-3" style={{ borderColor: `color-mix(in srgb, ${s.color} 20%, transparent)`, backgroundColor: `color-mix(in srgb, ${s.color} 7%, transparent)` }}>
            <p className="text-[11px] text-white/50">{L(s.label)}</p>
            <p className="mt-0.5 text-2xl font-semibold tabular" style={{ color: s.color }}>{buckets[s.key].length}</p>
          </div>
        ))}
      </div>

      {/* calendar (left) + to-do list (right) */}
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr] lg:items-start">
        {/* LEFT: month grid */}
        <div className="panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">{L(MONTHS[month])} {year}</h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-white/60 transition hover:bg-white/5"><ChevronLeft size={15} /></button>
              <button onClick={() => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))} className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/60 transition hover:bg-white/5">{tr("Today")}</button>
              <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-white/60 transition hover:bg-white/5"><ChevronRight size={15} /></button>
            </div>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1">
            {DOW.map((d, i) => (
              <div key={i} className="py-1 text-center text-[10px] font-medium uppercase tracking-wider text-white/35">{L(d)}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              const dISO = isoDate(date);
              const inMonth = date.getMonth() === month;
              const isToday = dISO === today;
              const due = orders.filter((w) => w.due === dISO);
              return (
                <div key={i} className={cn("min-h-[62px] rounded-lg border p-1", isToday ? "border-brand-400/60 bg-brand-400/[0.06]" : "border-white/6 bg-white/[0.015]", !inMonth && "opacity-35")}>
                  <p className={cn("text-right text-[10px] tabular", isToday ? "font-semibold text-brand-200" : "text-white/40")}>{date.getDate()}</p>
                  <div className="mt-0.5 space-y-0.5">
                    {due.slice(0, 2).map((w) => {
                      const c = WO_STATUS[w.status].color;
                      const late = isOpen(w) && dISO < today;
                      return (
                        <div key={w.id} className="truncate rounded px-1 py-0.5 text-[9px] font-medium leading-tight" style={{ color: c, backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)`, boxShadow: late ? "inset 0 0 0 1px var(--c-rose)" : undefined }} title={`${w.id} · ${L(w.title)}`}>
                          {w.findingCode ?? w.id.slice(-4)}
                        </div>
                      );
                    })}
                    {due.length > 2 ? <p className="px-1 text-[9px] text-white/40">+{due.length - 2}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: to-do list — open work grouped by due window */}
        <div className="panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg border border-brand-400/30 bg-brand-400/10 text-brand-300"><ListChecks size={14} /></span>
            <h3 className="font-semibold">{tr("To-do list")}</h3>
          </div>
          {SECTIONS.some((s) => buckets[s.key].length > 0) ? (
            <div className="space-y-4">
              {SECTIONS.filter((s) => buckets[s.key].length > 0).map((s) => (
                <div key={s.key}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <h4 className="text-[13px] font-semibold text-white/85">{L(s.label)}</h4>
                    <span className="chip tabular text-[10px]">{buckets[s.key].length}</span>
                  </div>
                  <div className="space-y-0.5">
                    {buckets[s.key].map((w) => {
                      const sc = WO_STATUS[w.status];
                      return (
                        <div key={w.id} className="flex items-start gap-2 rounded-lg px-1.5 py-1.5 transition hover:bg-white/[0.03]">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: sc.color }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] leading-snug text-white/85">{L(w.title)}</p>
                            <p className="truncate text-[10px] text-white/40">{w.findingCode ? `${w.findingCode} · ` : ""}{L(sc.label)}</p>
                          </div>
                          <span className={cn("shrink-0 whitespace-nowrap text-[10px] tabular", s.key === "overdue" ? "text-rose-300" : "text-white/40")}>{w.due.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid place-items-center py-10 text-center">
              <CircleCheck size={22} className="text-emerald-400/60" />
              <p className="mt-2 text-xs text-white/45">{tr("All clear · nothing to do")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="panel p-4">
      <p className="text-[11px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular" style={{ color: accent }}>{value}</p>
    </div>
  );
}
