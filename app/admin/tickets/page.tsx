"use client";

import { useState } from "react";
import { publicAsset } from "@/lib/paths";
import { payoutOf, type Ticket } from "@/lib/support";
import { cn } from "@/lib/utils";
import { Lock, Loader2, RefreshCw, ShieldCheck, ChevronDown, Ticket as TicketIcon, Clock, UserCheck, Star, Banknote, Check } from "lucide-react";

/* SpareX-only ticket overview (phase 1): every ticket, who claimed it, the full
 * conversation, and a per-agent tally to settle freelance payment by hand. */

const fmt = (iso: string) => { try { return new Date(iso).toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return iso; } };
const mins = (a: string, b: string) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));

export default function AdminTicketsPage() {
  const [key, setKey] = useState("");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = async (k: string) => {
    setBusy(true); setErr("");
    try {
      const r = await fetch(publicAsset("/api/support/tickets?role=admin"), { headers: { "x-admin-key": k } });
      if (r.status === 401) { setErr("รหัสผ่านไม่ถูกต้อง"); setBusy(false); return; }
      const d = await r.json();
      setTickets(d.tickets || []);
    } catch { setErr("โหลดข้อมูลไม่สำเร็จ"); }
    setBusy(false);
  };

  const approve = async (id: string) => {
    await fetch(publicAsset("/api/support/ticket"), {
      method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": key },
      body: JSON.stringify({ action: "approve", id, by: "admin" }),
    });
    load(key);
  };

  if (!tickets) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink-950 px-5">
        <div className="w-full max-w-[360px]">
          <div className="panel p-7">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-brand-400/30 bg-brand-400/10 text-brand-300"><Lock size={20} /></span>
            <h1 className="mt-4 text-[19px] font-bold text-white">SpareX Admin · Tickets</h1>
            <p className="mt-1.5 text-[12.5px] text-white/50">ดู ticket ทั้งหมด · ใครรับงาน · ยอดงานรายคน</p>
            <input type="password" value={key} autoFocus onChange={(e) => { setKey(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && key && load(key)} placeholder="Admin passphrase" className="mt-5 w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:border-brand-400/50 focus:outline-none" />
            {err ? <p className="mt-2 text-[11.5px] text-rose-300">{err}</p> : null}
            <button onClick={() => key && load(key)} disabled={busy || !key} className="btn-glow mt-4 w-full justify-center py-2.5 text-[14px] disabled:opacity-50">
              {busy ? <><Loader2 size={15} className="animate-spin" /> กำลังตรวจ…</> : <><ShieldCheck size={15} /> เข้าดูข้อมูล</>}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const openCnt = tickets.filter((t) => t.status === "open").length;
  const closed = tickets.filter((t) => t.status === "closed");
  // per-agent tally — the numbers used to settle freelance payment each month
  const byAgent = new Map<string, { name: string; done: number; active: number; pending: number; approved: number }>();
  for (const t of tickets) {
    if (!t.agent) continue;
    const k = t.agent.email || t.agent.name;
    const a = byAgent.get(k) ?? { name: t.agent.name, done: 0, active: 0, pending: 0, approved: 0 };
    if (t.status === "closed") {
      a.done += 1;
      const pay = payoutOf(t) ?? 0;
      if (t.approvedBy) a.approved += pay; else a.pending += pay;
    } else a.active += 1;
    byAgent.set(k, a);
  }

  return (
    <main className="min-h-screen bg-ink-950 px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-[1000px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-white">Support Tickets</h1>
            <p className="text-[12.5px] text-white/45">ทุก ticket · ใครรับ · บทสนทนา · ยอดงานรายคน</p>
          </div>
          <button onClick={() => load(key)} disabled={busy} className="btn-ghost px-4 py-2 text-sm">{busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} รีเฟรช</button>
        </div>

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: TicketIcon, label: "ticket ทั้งหมด", value: `${tickets.length}`, accent: "#22d3ee" },
            { icon: Clock, label: "รอคนรับ", value: `${openCnt}`, accent: openCnt ? "#f59e0b" : "#8b93a7" },
            { icon: UserCheck, label: "ปิดแล้ว", value: `${closed.length}`, accent: "#34d399" },
            { icon: UserCheck, label: "ทีม support ที่ทำงาน", value: `${byAgent.size}`, accent: "#a78bfa" },
          ].map((s) => (
            <div key={s.label} className="panel p-4">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/45"><s.icon size={12} /> {s.label}</p>
              <p className="mt-1.5 text-xl font-semibold tabular" style={{ color: s.accent }}>{s.value}</p>
            </div>
          ))}
        </section>

        {byAgent.size ? (
          <section className="panel mt-4 p-5">
            <p className="text-[12px] font-medium uppercase tracking-wider text-white/45">ยอดงานรายคน (ใช้สรุปจ่ายสิ้นเดือน)</p>
            <ul className="mt-3 space-y-2">
              {[...byAgent.entries()].sort((a, b) => b[1].done - a[1].done).map(([k, a]) => (
                <li key={k} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/85">{a.name} <span className="text-[11px] font-normal text-white/35">{k}</span></span>
                  <span className="tabular text-[12px] text-white/50">{a.active} กำลังทำ · {a.done} ปิดแล้ว</span>
                  <span className="tabular text-[12px] text-amber-300">รออนุมัติ ฿{a.pending.toLocaleString()}</span>
                  <span className="tabular text-[13px] font-semibold text-emerald-300">อนุมัติแล้ว ฿{a.approved.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="panel mt-4 overflow-hidden p-0">
          <div className="border-b border-white/8 px-5 py-3 text-[12px] font-medium uppercase tracking-wider text-white/45">ticket ทั้งหมด ({tickets.length})</div>
          {!tickets.length ? <p className="px-5 py-10 text-center text-[13px] text-white/40">ยังไม่มี ticket</p> : (
            <ul className="divide-y divide-white/6">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setOpen(open === t.id ? null : t.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-left transition hover:bg-white/[0.02]">
                    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-medium",
                      t.status === "open" ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                      : t.status === "claimed" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      : "border-white/15 bg-white/5 text-white/45")}>
                      {t.status === "open" ? "รอคนรับ" : t.status === "claimed" ? "กำลังทำ" : "ปิดแล้ว"}
                    </span>
                    <div className="min-w-[200px] flex-1">
                      <p className="truncate text-[13.5px] font-medium text-white">{t.subject}</p>
                      <p className="font-mono text-[10.5px] text-white/35">{t.id} · {t.customer.name} · {t.customer.email}</p>
                    </div>
                    <span className="w-24 shrink-0 text-[11px] text-white/40">{fmt(t.at)}</span>
                    <span className="w-28 shrink-0 truncate text-[11.5px] text-white/55">{t.agent?.name ?? "—"}</span>
                    <span className="w-20 shrink-0 text-right">
                      {t.rating ? (
                        <span className={cn("inline-flex items-center gap-0.5 tabular text-[11.5px]", t.rating.stars <= 2 ? "text-rose-300" : "text-amber-300")}>
                          <Star size={11} className="fill-current" /> {t.rating.stars}
                        </span>
                      ) : <span className="text-[10px] text-white/25">ยังไม่ให้ดาว</span>}
                    </span>
                    <span className="w-24 shrink-0 text-right tabular text-[12px]">
                      {payoutOf(t) != null ? (
                        <span className={t.approvedBy ? "text-emerald-300" : "text-amber-300"}>{t.level} ฿{payoutOf(t)!.toLocaleString()}</span>
                      ) : <span className="text-white/25">—</span>}
                    </span>
                    <ChevronDown size={15} className={cn("shrink-0 text-white/40 transition", open === t.id && "rotate-180")} />
                  </button>
                  {open === t.id ? (
                    <div className="border-t border-white/6 bg-white/[0.015] px-5 py-4">
                      <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-white/65">{t.body}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10.5px] text-white/40">
                        <span className="chip">หน้า {t.ctx.path || "-"}</span>
                        {t.agent ? <span className="chip">รับงานใน {mins(t.at, t.agent.at)} นาที</span> : null}
                        {t.closedAt ? <span className="chip">ปิดใน {mins(t.at, t.closedAt)} นาที</span> : null}
                        <span className="chip">{t.messages.length} ข้อความ</span>
                        {t.rating?.comment ? <span className="chip">ลูกค้า: “{t.rating.comment}”</span> : null}
                      </div>
                      {t.status === "closed" && payoutOf(t) != null && !t.approvedBy ? (
                        <button onClick={() => approve(t.id)} className={cn("mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-medium transition",
                          t.rating && t.rating.stars <= 2
                            ? "border-rose-400/30 bg-rose-400/10 text-rose-300 hover:bg-rose-400/20"
                            : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20")}>
                          <Banknote size={13} /> อนุมัติจ่าย ฿{payoutOf(t)!.toLocaleString()}
                          {t.rating && t.rating.stars <= 2 ? " (ลูกค้าให้ดาวต่ำ — ตรวจก่อน)" : ""}
                        </button>
                      ) : t.approvedBy ? (
                        <p className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-emerald-300/80"><Check size={12} /> อนุมัติจ่ายแล้ว ฿{(payoutOf(t) ?? 0).toLocaleString()}</p>
                      ) : null}
                      <div className="mt-3 space-y-1.5">
                        {t.messages.map((m, i) => (
                          <div key={i} className={cn("flex", m.from === "agent" ? "justify-end" : "justify-start")}>
                            <div className={cn("max-w-[70%] rounded-xl px-3 py-1.5 text-[12px]", m.from === "agent" ? "bg-emerald-400/12 text-white/85" : "border border-white/10 bg-white/[0.04] text-white/75")}>
                              <span className="mr-1.5 text-[9.5px] text-white/40">{m.name}</span>{m.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="mt-4 text-center text-[11px] text-white/30">SpareX FactoryOS · Internal</p>
      </div>
    </main>
  );
}
