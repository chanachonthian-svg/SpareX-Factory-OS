"use client";

import { useEffect, useRef, useState } from "react";
import { publicAsset } from "@/lib/paths";
import { LEVELS, bountyMultiplier, type Ticket, type TicketLevel } from "@/lib/support";
import { cn } from "@/lib/utils";
import { Headset, Lock, Loader2, Send, ArrowLeft, RefreshCw, Check, Hand, CircleDot, Clock, Banknote } from "lucide-react";

/* SpareX freelance support console (phase 1).
 * Sign in with the shared support passcode + your name, grab an open ticket,
 * chat, close it. Payment is settled off-system for now (admin exports monthly). */

type BoardRow = {
  id: string; at: string; subject: string; status: Ticket["status"];
  company: string; ctx: { path?: string; module?: string };
  agent?: { name: string; email: string }; msgs: number; lastAt: string;
};

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "เมื่อครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} ชม.ที่แล้ว` : `${Math.floor(h / 24)} วันที่แล้ว`;
};

export default function SupportConsolePage() {
  const [key, setKey] = useState("");
  const [me, setMe] = useState({ name: "", email: "" });
  const [authed, setAuthed] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [msg, setMsg] = useState("");
  const [closing, setClosing] = useState(false);
  const [level, setLevel] = useState<TicketLevel>("L1");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("factoryos:agent") || "null");
      if (s?.key) { setKey(s.key); setMe({ name: s.name || "", email: s.email || "" }); }
    } catch { /* ignore */ }
  }, []);

  const loadBoard = async (k = key) => {
    try {
      const r = await fetch(publicAsset("/api/support/tickets?role=agent"), { headers: { "x-support-key": k } });
      if (r.status === 401) { setErr("รหัสไม่ถูกต้อง"); setAuthed(false); return false; }
      const d = await r.json();
      setRows(d.tickets || []);
      setAuthed(true);
      return true;
    } catch { setErr("โหลดไม่สำเร็จ"); return false; }
  };

  const signIn = async () => {
    if (!key || !me.name.trim() || !me.email.trim()) { setErr("กรอกให้ครบ"); return; }
    setBusy(true); setErr("");
    const ok = await loadBoard(key);
    if (ok) { try { localStorage.setItem("factoryos:agent", JSON.stringify({ key, ...me })); } catch { /* ignore */ } }
    setBusy(false);
  };

  // poll the board / the open chat
  useEffect(() => {
    if (!authed) return;
    const iv = setInterval(() => { if (!openId) loadBoard(); }, 8000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, openId, key]);

  useEffect(() => {
    if (!authed || !openId) return;
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch(publicAsset(`/api/support/ticket?id=${encodeURIComponent(openId)}`), { headers: { "x-support-key": key } });
        if (!r.ok) return;
        const d = await r.json();
        if (alive && d.ticket) setTicket(d.ticket);
      } catch { /* ignore */ }
    };
    pull();
    const iv = setInterval(pull, 3000);
    return () => { alive = false; clearInterval(iv); };
  }, [authed, openId, key]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [ticket?.messages.length]);

  const claim = async (id: string) => {
    const r = await fetch(publicAsset("/api/support/ticket"), {
      method: "POST", headers: { "Content-Type": "application/json", "x-support-key": key },
      body: JSON.stringify({ action: "claim", id, agentName: me.name, agentEmail: me.email }),
    });
    const d = await r.json();
    if (d.won) { setOpenId(id); }
    else { setErr(`ช้าไปนิดเดียว — ${d.agent?.name ?? "คนอื่น"} รับงานนี้ไปแล้ว`); loadBoard(); }
  };

  const send = async () => {
    if (!msg.trim() || !openId) return;
    const text = msg.trim(); setMsg("");
    await fetch(publicAsset("/api/support/ticket"), {
      method: "POST", headers: { "Content-Type": "application/json", "x-support-key": key },
      body: JSON.stringify({ action: "msg", id: openId, from: "agent", name: me.name, text }),
    });
  };

  const close = async (lv: TicketLevel) => {
    if (!openId) return;
    await fetch(publicAsset("/api/support/ticket"), {
      method: "POST", headers: { "Content-Type": "application/json", "x-support-key": key },
      body: JSON.stringify({ action: "close", id: openId, by: me.name, level: lv }),
    });
    setClosing(false);
  };

  /* ── sign-in ── */
  if (!authed) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink-950 px-5">
        <div className="w-full max-w-[380px]">
          <div className="panel p-7">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-brand-400/30 bg-brand-400/10 text-brand-300"><Headset size={20} /></span>
            <h1 className="mt-4 text-[19px] font-bold text-white">SpareX Support Console</h1>
            <p className="mt-1.5 text-[12.5px] text-white/50">สำหรับทีม support (freelance) — รับ ticket จากลูกค้า FactoryOS</p>
            <div className="mt-5 space-y-2.5">
              <input value={me.name} onChange={(e) => setMe((p) => ({ ...p, name: e.target.value }))} placeholder="ชื่อของคุณ (ลูกค้าจะเห็นชื่อนี้)" className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-white placeholder:text-white/30 focus:border-brand-400/50 focus:outline-none" />
              <input value={me.email} onChange={(e) => setMe((p) => ({ ...p, email: e.target.value }))} placeholder="อีเมล (ใช้สรุปยอดจ่าย)" className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-white placeholder:text-white/30 focus:border-brand-400/50 focus:outline-none" />
              <input type="password" value={key} onChange={(e) => { setKey(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && signIn()} placeholder="รหัสทีม support" className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-white placeholder:text-white/30 focus:border-brand-400/50 focus:outline-none" />
            </div>
            {err ? <p className="mt-2 text-[11.5px] text-rose-300">{err}</p> : null}
            <button onClick={signIn} disabled={busy} className="btn-glow mt-4 w-full justify-center py-2.5 text-[14px] disabled:opacity-50">
              {busy ? <><Loader2 size={15} className="animate-spin" /> กำลังตรวจ…</> : <><Lock size={15} /> เข้าใช้งาน</>}
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ── chat ── */
  if (openId && ticket) {
    return (
      <main className="min-h-screen bg-ink-950 px-5 py-6">
        <div className="mx-auto flex h-[calc(100vh-3rem)] max-w-[760px] flex-col">
          <div className="flex items-center gap-3">
            <button onClick={() => { setOpenId(null); setTicket(null); loadBoard(); }} className="inline-flex items-center gap-1 text-[12.5px] text-white/45 transition hover:text-white/80"><ArrowLeft size={14} /> กลับกระดาน</button>
            <span className="font-mono text-[11px] text-white/35">{ticket.id}</span>
            {ticket.status !== "closed" ? (
              <button onClick={() => setClosing(true)} className="ml-auto rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[12px] font-medium text-emerald-300 transition hover:bg-emerald-400/20"><Check size={12} className="mr-1 inline" /> ปิดงาน</button>
            ) : <span className="ml-auto text-[12px] text-white/40">ปิดแล้ว{ticket.level ? ` · ${ticket.level}` : ""}</span>}
          </div>

          <div className="panel mt-3 p-4">
            <p className="text-[14px] font-semibold text-white">{ticket.subject}</p>
            <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-white/60">{ticket.body}</p>
            <div className="mt-2.5 flex flex-wrap gap-2 text-[10.5px] text-white/40">
              <span className="chip">ลูกค้า: {ticket.customer.name}</span>
              {ticket.customer.company ? <span className="chip">{ticket.customer.company}</span> : null}
              <span className="chip">หน้า: {ticket.ctx.path || "-"}</span>
              <span className="chip">{ago(ticket.at)}</span>
            </div>
          </div>

          {closing ? (
            <div className="panel mt-3 border-emerald-400/25 p-4">
              <p className="text-[13.5px] font-semibold text-white">ปิดงาน — งานนี้อยู่ระดับไหน?</p>
              <p className="mt-0.5 text-[11.5px] text-white/45">ระดับกำหนดค่าตอบแทน · admin ตรวจก่อนจ่ายทุกใบ</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {(Object.keys(LEVELS) as TicketLevel[]).map((lv) => {
                  const mult = ticket.agent ? bountyMultiplier(ticket.at, ticket.agent.at) : 1;
                  const pay = Math.round((LEVELS[lv].base * mult) / 10) * 10;
                  return (
                    <button key={lv} onClick={() => setLevel(lv)} className={cn("rounded-xl border p-3 text-left transition", level === lv ? "border-emerald-400/50 bg-emerald-400/[0.08]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]")}>
                      <p className="text-[12px] font-bold text-white">{lv} <span className="ml-1 font-normal text-emerald-300">฿{pay.toLocaleString()}</span></p>
                      <p className="mt-0.5 text-[10.5px] leading-snug text-white/50">{LEVELS[lv].th}</p>
                      {mult > 1 ? <p className="mt-1 text-[9.5px] text-amber-300">รวมโบนัสรอรับงาน ×{mult.toFixed(1)}</p> : null}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => close(level)} className="btn-glow flex-1 justify-center py-2 text-[12.5px]"><Check size={13} /> ยืนยันปิดงาน ({level})</button>
                <button onClick={() => setClosing(false)} className="rounded-lg border border-white/15 px-4 py-2 text-[12.5px] text-white/60 transition hover:bg-white/5">ยกเลิก</button>
              </div>
            </div>
          ) : null}

          <div className="panel mt-3 flex min-h-0 flex-1 flex-col p-0">
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              {ticket.messages.map((m, i) => (
                <div key={i} className={cn("flex", m.from === "agent" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed", m.from === "agent" ? "rounded-br-sm bg-emerald-400/15 text-white/90" : "rounded-bl-sm border border-white/10 bg-white/[0.04] text-white/80")}>
                    {m.from === "customer" ? <p className="mb-0.5 text-[10px] font-semibold text-brand-300">{m.name} · ลูกค้า</p> : null}
                    {m.text}
                  </div>
                </div>
              ))}
              {!ticket.messages.length ? <p className="py-8 text-center text-[12px] text-white/35">ยังไม่มีข้อความ — ทักลูกค้าก่อนได้เลย</p> : null}
              <div ref={endRef} />
            </div>
            {ticket.status !== "closed" ? (
              <div className="flex items-center gap-2 border-t border-white/8 p-3">
                <input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="พิมพ์ตอบลูกค้า…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-white placeholder:text-white/30 focus:border-brand-400/50 focus:outline-none" />
                <button onClick={send} disabled={!msg.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950 disabled:opacity-40"><Send size={16} /></button>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  /* ── board ── */
  const open = rows.filter((r) => r.status === "open");
  const mineRows = rows.filter((r) => r.status === "claimed" && r.agent?.email === me.email);
  const others = rows.filter((r) => !open.includes(r) && !mineRows.includes(r));

  const Card = ({ r, action }: { r: BoardRow; action?: "claim" | "open" }) => (
    <div className="panel flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
      <div className="min-w-[200px] flex-1">
        <p className="text-[13.5px] font-medium text-white">{r.subject}</p>
        <p className="mt-0.5 font-mono text-[10.5px] text-white/35">{r.id} · {r.company || "ไม่ระบุบริษัท"} · หน้า {r.ctx.path || "-"}</p>
      </div>
      <span className="flex items-center gap-1 text-[11px] text-white/40"><Clock size={11} /> {ago(r.at)}</span>
      {r.msgs ? <span className="text-[11px] text-white/40">{r.msgs} ข้อความ</span> : null}
      {action === "claim" ? (() => {
        const mult = bountyMultiplier(r.at, new Date().toISOString());
        return (
          <>
            <span className="flex items-center gap-1 text-[11.5px] font-medium text-emerald-300">
              <Banknote size={12} /> ฿{Math.round((150 * mult) / 10) * 10}–{Math.round((800 * mult) / 10) * 10}
              {mult > 1 ? <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[9px] text-amber-300">โบนัส ×{mult.toFixed(1)}</span> : null}
            </span>
            <button onClick={() => claim(r.id)} className="btn-glow px-3.5 py-2 text-[12.5px]"><Hand size={13} /> รับงานนี้</button>
          </>
        );
      })() : action === "open" ? (
        <button onClick={() => setOpenId(r.id)} className="rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-[12.5px] text-white/80 transition hover:bg-white/10">เปิดแชท</button>
      ) : (
        <span className="text-[11px] text-white/35">{r.agent?.name ?? "—"}</span>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-ink-950 px-5 py-8">
      <div className="mx-auto max-w-[900px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-white">Support Console</h1>
            <p className="text-[12.5px] text-white/45">สวัสดี {me.name} · กดรับ ticket ที่ว่างเพื่อเริ่มงาน</p>
          </div>
          <button onClick={() => loadBoard()} className="btn-ghost px-4 py-2 text-sm"><RefreshCw size={14} /> รีเฟรช</button>
        </div>
        {err ? <p className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] px-3 py-2 text-[12px] text-amber-200">{err}</p> : null}

        <h2 className="mt-6 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-white/50"><CircleDot size={12} className="animate-pulse text-amber-400" /> ว่างอยู่ · รอคนรับ ({open.length})</h2>
        <div className="mt-2 space-y-2">
          {open.length ? open.map((r) => <Card key={r.id} r={r} action="claim" />) : <p className="panel p-6 text-center text-[12.5px] text-white/35">ยังไม่มี ticket ใหม่ — รอสักครู่ ระบบจะอัปเดตเอง</p>}
        </div>

        {mineRows.length ? (
          <>
            <h2 className="mt-7 text-[13px] font-semibold uppercase tracking-wider text-white/50">งานของฉัน ({mineRows.length})</h2>
            <div className="mt-2 space-y-2">{mineRows.map((r) => <Card key={r.id} r={r} action="open" />)}</div>
          </>
        ) : null}

        {others.length ? (
          <>
            <h2 className="mt-7 text-[13px] font-semibold uppercase tracking-wider text-white/40">งานของคนอื่น / ปิดแล้ว ({others.length})</h2>
            <div className="mt-2 space-y-2 opacity-60">{others.slice(0, 12).map((r) => <Card key={r.id} r={r} />)}</div>
          </>
        ) : null}
        <p className="mt-8 text-center text-[11px] text-white/30">SpareX FactoryOS · Support Console · ข้อมูลลูกค้าเป็นความลับ ห้ามเปิดเผย</p>
      </div>
    </main>
  );
}
