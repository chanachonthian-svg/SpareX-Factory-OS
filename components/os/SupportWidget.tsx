"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Headset, X, Send, ArrowLeft, Loader2, Check, CircleDot, Star } from "lucide-react";
import { publicAsset } from "@/lib/paths";
import { TICKET_CATEGORIES, type Ticket } from "@/lib/support";
import { cn } from "@/lib/utils";

/** Customer-side support: a floating "แจ้งปัญหา" button (human help — distinct
 *  from the AI Copilot bot) → open a ticket → chat with the SpareX technician who
 *  claims it. Polls every 3 s while the chat is open; no websockets needed at this
 *  volume and it survives the Caddy proxy untouched. */
export function SupportWidget() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "new" | "chat">("new");
  const [me, setMe] = useState({ email: "", name: "", company: "" });
  const [mine, setMine] = useState<Ticket[]>([]);
  const [cat, setCat] = useState(TICKET_CATEGORIES[0].id);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [tid, setTid] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [msg, setMsg] = useState("");
  const [stars, setStars] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const login = JSON.parse(localStorage.getItem("factoryos:demo-login") || "{}");
      const reg = JSON.parse(localStorage.getItem("factoryos:demo-registered") || "null");
      setMe({ email: login.email || "", name: reg?.name || "", company: reg?.company || "" });
      const last = localStorage.getItem("factoryos:support-last");
      if (last) setTid(last);
    } catch { /* ignore */ }
  }, []);

  const loadMine = async (email: string) => {
    try {
      const r = await fetch(publicAsset(`/api/support/tickets?role=customer&email=${encodeURIComponent(email)}`));
      const d = await r.json();
      setMine(d.tickets || []);
      if ((d.tickets || []).length) setView("list");
    } catch { /* ignore */ }
  };

  useEffect(() => { if (open && me.email) loadMine(me.email); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, me.email]);

  // poll the open chat
  useEffect(() => {
    if (!open || view !== "chat" || !tid || !me.email) return;
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch(publicAsset(`/api/support/ticket?id=${encodeURIComponent(tid)}&email=${encodeURIComponent(me.email)}`));
        if (!r.ok) return;
        const d = await r.json();
        if (alive && d.ticket) setTicket(d.ticket);
      } catch { /* ignore */ }
    };
    pull();
    const iv = setInterval(pull, 3000);
    return () => { alive = false; clearInterval(iv); };
  }, [open, view, tid, me.email]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [ticket?.messages.length]);

  const create = async () => {
    if (!subject.trim() || !body.trim()) return;
    setBusy(true);
    const catLabel = TICKET_CATEGORIES.find((c) => c.id === cat)?.th ?? "";
    try {
      const r = await fetch(publicAsset("/api/support/tickets"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: me.email, name: me.name, company: me.company,
          subject: `[${catLabel}] ${subject.trim()}`, body: body.trim(),
          ctx: { path: pathname, module: pathname?.split("/")[2] || "" },
        }),
      });
      const d = await r.json();
      if (d.id) {
        try { localStorage.setItem("factoryos:support-last", d.id); } catch { /* ignore */ }
        setTid(d.id); setSubject(""); setBody(""); setView("chat");
      }
    } catch { /* ignore */ }
    setBusy(false);
  };

  const send = async () => {
    if (!msg.trim() || !tid) return;
    const text = msg.trim();
    setMsg("");
    try {
      await fetch(publicAsset("/api/support/ticket"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "msg", id: tid, from: "customer", email: me.email, name: me.name || me.email, text }),
      });
    } catch { /* ignore */ }
  };

  if (!mounted) return null;

  const statusChip = (s: Ticket["status"]) =>
    s === "open" ? { th: "กำลังหาเจ้าหน้าที่", cls: "border-amber-400/30 bg-amber-400/10 text-amber-300" }
    : s === "claimed" ? { th: "เจ้าหน้าที่รับเรื่องแล้ว", cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" }
    : { th: "ปิดเรื่องแล้ว", cls: "border-white/15 bg-white/5 text-white/50" };

  return createPortal(
    <>
      {/* floating entry — bottom-left, away from the AI Copilot bot on the right */}
      {!open ? (
        <button
          onClick={() => { setOpen(true); setView(tid ? "chat" : "new"); }}
          className="no-print fixed bottom-5 left-5 z-[75] flex items-center gap-2 rounded-2xl border border-white/12 bg-ink-900/95 py-2.5 pl-2.5 pr-3.5 shadow-lg backdrop-blur transition hover:border-brand-400/40"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-brand-400/30 bg-brand-400/10 text-brand-300"><Headset size={16} /></span>
          <span className="text-[12.5px] font-medium text-white/85">แจ้งปัญหา</span>
        </button>
      ) : null}

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="no-print fixed bottom-5 left-5 z-[75] flex h-[540px] max-h-[80vh] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-white/12 bg-ink-900/98 shadow-2xl backdrop-blur"
          >
            {/* header */}
            <div className="flex items-center gap-2.5 border-b border-white/8 px-4 py-3">
              {view !== "new" || tid ? (
                <button onClick={() => setView(view === "chat" ? "list" : "new")} className="text-white/40 transition hover:text-white/80"><ArrowLeft size={15} /></button>
              ) : null}
              <span className="grid h-7 w-7 place-items-center rounded-lg border border-brand-400/30 bg-brand-400/10 text-brand-300"><Headset size={14} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-white">ฝ่ายสนับสนุน SpareX</p>
                <p className="text-[10.5px] text-white/40">{view === "chat" && ticket ? ticket.id : "ทีมงานจริง ตอบภายในเวลาทำการ"}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 transition hover:text-white/80"><X size={16} /></button>
            </div>

            {/* body */}
            {view === "list" ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <button onClick={() => setView("new")} className="btn-glow mb-3 w-full justify-center py-2 text-[12.5px]">+ แจ้งปัญหาใหม่</button>
                {mine.map((t) => {
                  const c = statusChip(t.status);
                  return (
                    <button key={t.id} onClick={() => { setTid(t.id); setView("chat"); }} className="mb-2 w-full rounded-xl border border-white/8 bg-white/[0.02] p-3 text-left transition hover:bg-white/[0.05]">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[12.5px] font-medium text-white/85">{t.subject}</p>
                        <span className={cn("shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-medium", c.cls)}>{c.th}</span>
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] text-white/35">{t.id} · {t.messages.length} ข้อความ</p>
                    </button>
                  );
                })}
              </div>
            ) : view === "new" ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <p className="text-[12.5px] text-white/55">เจอปัญหาตรงไหน บอกเราได้เลย — ทีมเทคนิคจะเข้ามาคุยในแชทนี้</p>
                <label className="mt-4 block text-[11.5px] font-medium text-white/55">เรื่องที่แจ้ง</label>
                <div className="mt-1.5 grid grid-cols-1 gap-1.5">
                  {TICKET_CATEGORIES.map((c) => (
                    <button key={c.id} onClick={() => setCat(c.id)} className={cn("rounded-lg border px-3 py-2 text-left text-[12px] transition", cat === c.id ? "border-brand-400/50 bg-brand-400/[0.08] text-brand-100" : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/[0.05]")}>{c.th}</button>
                  ))}
                </div>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="หัวข้อสั้นๆ เช่น กราฟพลังงานไม่ขึ้น" className="mt-3 w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:border-brand-400/50 focus:outline-none" />
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="เล่าให้ฟังหน่อยว่าเกิดอะไรขึ้น กดตรงไหนแล้วเป็น…" className="mt-2 w-full resize-none rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:border-brand-400/50 focus:outline-none" />
                <p className="mt-2 text-[10.5px] text-white/35">แนบให้อัตโนมัติ: หน้าที่คุณเปิดอยู่ ({pathname}) · อีเมล {me.email || "—"}</p>
                <button onClick={create} disabled={busy || !subject.trim() || !body.trim()} className="btn-glow mt-3 w-full justify-center py-2.5 text-[13px] disabled:opacity-50">
                  {busy ? <><Loader2 size={14} className="animate-spin" /> กำลังส่ง…</> : <>ส่งเรื่อง & เปิดแชท</>}
                </button>
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {!ticket ? (
                    <p className="py-8 text-center text-[12px] text-white/40"><Loader2 size={14} className="mr-1 inline animate-spin" /> กำลังโหลด…</p>
                  ) : (
                    <>
                      <div className="mb-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                        <p className="text-[12.5px] font-medium text-white/85">{ticket.subject}</p>
                        <p className="mt-1 whitespace-pre-wrap text-[11.5px] leading-relaxed text-white/55">{ticket.body}</p>
                        <span className={cn("mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-medium", statusChip(ticket.status).cls)}>
                          <CircleDot size={9} className={ticket.status === "open" ? "animate-pulse" : ""} /> {statusChip(ticket.status).th}
                          {ticket.agent ? ` · ${ticket.agent.name}` : ""}
                        </span>
                      </div>
                      {ticket.messages.map((m, i) => (
                        <div key={i} className={cn("mb-2 flex", m.from === "customer" ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed", m.from === "customer" ? "rounded-br-sm bg-brand-400/15 text-white/90" : "rounded-bl-sm border border-white/10 bg-white/[0.04] text-white/80")}>
                            {m.from === "agent" ? <p className="mb-0.5 text-[10px] font-semibold text-emerald-300">{m.name} · ทีมเทคนิค</p> : null}
                            {m.text}
                          </div>
                        </div>
                      ))}
                      {ticket.status === "closed" ? (
                        ticket.rating ? (
                          <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-white/45">
                            <Check size={12} /> ขอบคุณสำหรับคะแนน
                            {Array.from({ length: ticket.rating.stars }, (_, i) => <Star key={i} size={11} className="fill-amber-400 text-amber-400" />)}
                          </p>
                        ) : (
                          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                            <p className="text-[12px] text-white/70">ปิดเรื่องแล้ว — เจ้าหน้าที่ช่วยได้ดีแค่ไหน?</p>
                            <div className="mt-2 flex justify-center gap-1.5">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button key={n} onClick={() => setStars(n)} aria-label={`${n} ดาว`}>
                                  <Star size={22} className={n <= stars ? "fill-amber-400 text-amber-400" : "text-white/25 transition hover:text-white/50"} />
                                </button>
                              ))}
                            </div>
                            {stars ? (
                              <button
                                onClick={async () => {
                                  try {
                                    await fetch(publicAsset("/api/support/ticket"), {
                                      method: "POST", headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ action: "rate", id: tid, email: me.email, stars }),
                                    });
                                  } catch { /* ignore */ }
                                }}
                                className="btn-glow mx-auto mt-2.5 px-4 py-1.5 text-[12px]"
                              >ส่งคะแนน</button>
                            ) : null}
                          </div>
                        )
                      ) : null}
                      <div ref={endRef} />
                    </>
                  )}
                </div>
                {ticket && ticket.status !== "closed" ? (
                  <div className="flex items-center gap-2 border-t border-white/8 p-2.5">
                    <input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="พิมพ์ข้อความ…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-brand-400/50 focus:outline-none" />
                    <button onClick={send} disabled={!msg.trim()} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950 disabled:opacity-40"><Send size={15} /></button>
                  </div>
                ) : null}
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>,
    document.body,
  );
}
