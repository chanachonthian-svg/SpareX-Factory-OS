"use client";

import { useState } from "react";
import { publicAsset } from "@/lib/paths";
import { Lock, Users, Clock, MousePointerClick, ChevronDown, RefreshCw, Loader2, ShieldCheck } from "lucide-react";

/* SpareX-only demo analytics. Not linked anywhere in the product — reach it at
 * /admin/analytics and unlock with the ADMIN_KEY passphrase. */

type Tab = { label: string; ms: number };
type Row = {
  sid: string; email: string; name: string; company: string; phone: string;
  firstAt: string; lastAt: string; totalMs: number; views: number;
  tabCount: number; tabs: Tab[]; timeline: string[];
};
type Data = { summary: { sessions: number; withContact: number; avgMs: number; topTabs: Tab[] }; rows: Row[] };

const fmtMs = (ms: number) => {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
};
const fmtWhen = (iso: string) => {
  try { return new Date(iso).toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
};

export default function AdminAnalyticsPage() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = async (k: string) => {
    setBusy(true); setErr("");
    try {
      const res = await fetch(publicAsset("/api/admin/analytics"), {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": k },
      });
      if (res.status === 401) { setErr("รหัสผ่านไม่ถูกต้อง"); setBusy(false); return; }
      const d = await res.json();
      setData(d);
    } catch { setErr("โหลดข้อมูลไม่สำเร็จ"); }
    setBusy(false);
  };

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink-950 px-5">
        <div className="w-full max-w-[360px]">
          <div className="panel p-7">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-brand-400/30 bg-brand-400/10 text-brand-300"><Lock size={20} /></span>
            <h1 className="mt-4 text-[19px] font-bold text-white">SpareX Admin · Demo Analytics</h1>
            <p className="mt-1.5 text-[12.5px] text-white/50">สำหรับทีม SpareX เท่านั้น — ใส่รหัสผ่านเพื่อดูข้อมูลผู้เข้าชม Demo</p>
            <input
              type="password" value={key} autoFocus
              onChange={(e) => { setKey(e.target.value); setErr(""); }}
              onKeyDown={(e) => e.key === "Enter" && key && load(key)}
              placeholder="Admin passphrase"
              className="mt-5 w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:border-brand-400/50 focus:outline-none"
            />
            {err ? <p className="mt-2 text-[11.5px] text-rose-300">{err}</p> : null}
            <button onClick={() => key && load(key)} disabled={busy || !key} className="btn-glow mt-4 w-full justify-center py-2.5 text-[14px] disabled:opacity-50">
              {busy ? <><Loader2 size={15} className="animate-spin" /> กำลังตรวจ…</> : <><ShieldCheck size={15} /> เข้าดูข้อมูล</>}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const { summary, rows } = data;
  return (
    <main className="min-h-screen bg-ink-950 px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-[1100px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-white">Demo Analytics</h1>
            <p className="text-[12.5px] text-white/45">ใครเข้ามาดู Demo บ้าง · เปิดแท็บไหน · อยู่นานแค่ไหน</p>
          </div>
          <button onClick={() => load(key)} disabled={busy} className="btn-ghost px-4 py-2 text-sm">{busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} รีเฟรช</button>
        </div>

        {/* summary */}
        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: Users, label: "Session ทั้งหมด", value: `${summary.sessions}`, accent: "#22d3ee" },
            { icon: Users, label: "มีข้อมูลติดต่อ", value: `${summary.withContact}`, accent: "#34d399" },
            { icon: Clock, label: "เวลาเฉลี่ย/คน", value: fmtMs(summary.avgMs), accent: "#a78bfa" },
            { icon: MousePointerClick, label: "แท็บยอดนิยม", value: summary.topTabs[0]?.label ?? "—", accent: "#f59e0b" },
          ].map((s) => (
            <div key={s.label} className="panel p-4">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/45"><s.icon size={12} /> {s.label}</p>
              <p className="mt-1.5 text-xl font-semibold tabular" style={{ color: s.accent }}>{s.value}</p>
            </div>
          ))}
        </section>

        {/* most-viewed tabs */}
        {summary.topTabs.length ? (
          <section className="panel mt-4 p-5">
            <p className="text-[12px] font-medium uppercase tracking-wider text-white/45">แท็บที่ลูกค้าดูรวมนานสุด</p>
            <div className="mt-3 space-y-2">
              {summary.topTabs.map((t) => {
                const max = summary.topTabs[0].ms || 1;
                return (
                  <div key={t.label} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-[12px] text-white/70">{t.label}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-brand-400" style={{ width: `${(t.ms / max) * 100}%` }} /></div>
                    <span className="w-16 shrink-0 text-right tabular text-[12px] font-semibold text-white/75">{fmtMs(t.ms)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* sessions table */}
        <section className="panel mt-4 overflow-hidden p-0">
          <div className="border-b border-white/8 px-5 py-3 text-[12px] font-medium uppercase tracking-wider text-white/45">ผู้เข้าชมรายคน ({rows.length})</div>
          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-white/40">ยังไม่มีข้อมูลการเข้าชม</p>
          ) : (
            <ul className="divide-y divide-white/6">
              {rows.map((r) => (
                <li key={r.sid}>
                  <button onClick={() => setOpen(open === r.sid ? null : r.sid)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-left transition hover:bg-white/[0.02]">
                    <div className="min-w-[180px] flex-1">
                      <p className="text-[13.5px] font-medium text-white">{r.name || <span className="text-white/40">— ไม่ระบุชื่อ —</span>} {r.company ? <span className="text-[11px] font-normal text-white/40">· {r.company}</span> : null}</p>
                      <p className="text-[11px] text-white/45">{r.email || "ไม่มีอีเมล"}{r.phone ? ` · ${r.phone}` : ""}</p>
                    </div>
                    <span className="w-24 shrink-0 text-[11px] text-white/45">{fmtWhen(r.lastAt)}</span>
                    <span className="w-16 shrink-0 text-right tabular text-[12px] text-white/60">{r.tabCount} แท็บ</span>
                    <span className="w-20 shrink-0 text-right tabular text-[13px] font-semibold text-brand-300">{fmtMs(r.totalMs)}</span>
                    <ChevronDown size={15} className={`shrink-0 text-white/40 transition ${open === r.sid ? "rotate-180" : ""}`} />
                  </button>
                  {open === r.sid ? (
                    <div className="border-t border-white/6 bg-white/[0.015] px-5 py-3.5">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">เวลาที่ใช้แต่ละแท็บ</p>
                      <div className="mt-2 space-y-1.5">
                        {r.tabs.map((t) => {
                          const max = r.tabs[0]?.ms || 1;
                          return (
                            <div key={t.label} className="flex items-center gap-3">
                              <span className="w-32 shrink-0 truncate text-[12px] text-white/65">{t.label}</span>
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-emerald-400/70" style={{ width: `${(t.ms / max) * 100}%` }} /></div>
                              <span className="w-14 shrink-0 text-right tabular text-[11.5px] text-white/70">{fmtMs(t.ms)}</span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-[11px] text-white/40">ลำดับที่เปิด: <span className="text-white/55">{r.timeline.join(" → ")}</span></p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="mt-4 text-center text-[11px] text-white/30">SpareX FactoryOS · Internal · ข้อมูลนี้เห็นเฉพาะทีม SpareX</p>
      </div>
    </main>
  );
}
