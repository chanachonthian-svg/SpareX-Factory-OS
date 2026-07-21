"use client";

/* Digital Twin · Step 4 — AI Recommendation & Action.
   The house Zero-Invest / Invest format (local copy of the PQ/Vortiq pattern):
   Part 1 quick wins the twin runs itself (AI-Auto), Part 2 capital projects
   with a full BOM, an RFQ email to SpareX and Approve → install Work Order. */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Zap, Wallet, Bot, Check, ArrowRight, ChevronDown, Rocket, Wrench,
  Package, AlertTriangle, TrendingUp, FileText, Plus, Send, Paperclip, X, Timer, ShieldCheck,
} from "lucide-react";
import { currentUser, SPAREX_SALES_EMAIL } from "@/lib/user";
import { useI18n } from "@/lib/i18n";
import { Icon3D } from "@/components/os/Icon3D";
import { createWorkOrder, useWorkOrders } from "@/lib/workorders";
import { cn, formatTHB } from "@/lib/utils";
import { twinQuickWins, twinCapitalProjects, type TwinLZ, type TwinQuickWinStatus } from "@/lib/optwin";

type LZ = TwinLZ;
type Lf = (o: LZ) => string;

const CYAN = "#22d3ee";

/** small on/off switch (local copy of the shared Energy Toggle, twin-cyan). */
function Toggle({ on, onChange, color = CYAN }: { on: boolean; onChange: () => void; color?: string }) {
  return (
    <button onClick={onChange} role="switch" aria-checked={on} className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", !on && "bg-white/15")} style={on ? { background: color } : undefined}>
      <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all" style={{ left: on ? "18px" : "2px" }} />
    </button>
  );
}

const QW_STATUS: Record<TwinQuickWinStatus, { label: LZ; cls: string; dot: string }> = {
  running: { label: { en: "Running", th: "ทำงานอยู่" }, cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300", dot: "bg-emerald-400" },
  pending: { label: { en: "Pending approval", th: "รออนุมัติ" }, cls: "border-amber-400/30 bg-amber-400/10 text-amber-300", dot: "bg-amber-400" },
  suggested: { label: { en: "Suggested", th: "แนะนำ" }, cls: "border-white/15 bg-white/5 text-white/60", dot: "bg-white/40" },
};

const CP_SEV: Record<"critical" | "warning" | "recommend", { label: LZ; cls: string }> = {
  critical: { label: { en: "Critical", th: "วิกฤต" }, cls: "border-rose-400/40 bg-rose-500/12 text-rose-300" },
  warning: { label: { en: "Warning", th: "เตือน" }, cls: "border-amber-400/40 bg-amber-500/12 text-amber-300" },
  recommend: { label: { en: "Recommend", th: "แนะนำ" }, cls: "border-emerald-400/40 bg-emerald-500/12 text-emerald-300" },
};

/** Outlook-style compose window — a Request-for-Quotation email to SpareX with the
 *  project's BOM pre-filled and the signed-in user's signature. Send is simulated. */
function QuoteEmailModal({ project, L, onClose, onSent }: { project: (typeof twinCapitalProjects)[number]; L: Lf; onClose: () => void; onSent: () => void }) {
  const title = L(project.title);
  const bom = project.bom.map((b, i) => `${i + 1}. ${L(b.item)} · ${b.qty} × ${formatTHB(b.unitPrice)} · ${formatTHB(b.qty * b.unitPrice)}`).join("\n");
  const sig = L({
    en: `—\n${currentUser.name}\n${currentUser.title} · ${currentUser.plant}\n${currentUser.company}\n${currentUser.email} · ${currentUser.phone}`,
    th: `—\n${currentUser.name}\n${currentUser.titleTh} · ${currentUser.plant}\n${currentUser.company}\n${currentUser.email} · ${currentUser.phone}`,
  });
  const risk = project.riskAvoided
    ? L({ en: `\nRisk avoided: ${formatTHB(project.riskAvoided)} one-time failure cost${project.urgency ? ` (${L(project.urgency)})` : ""}`, th: `\nความเสี่ยงที่กันได้: ${formatTHB(project.riskAvoided)} หากเครื่องพัง${project.urgency ? ` (${L(project.urgency)})` : ""}` })
    : "";
  const [subject, setSubject] = useState(L({ en: `Request for Quotation · ${title}`, th: `ขอใบเสนอราคา · ${title}` }));
  const [body, setBody] = useState(L({
    en: `Dear SpareX Sales team,\n\nWe would like to request a formal quotation for the following digital-twin improvement project:\n\nProject: ${title}\nLocation: ${L(project.asset)}\nEstimated budget: ${formatTHB(project.capex)}\nReturn: ${formatTHB(project.benefitYr)}/yr · payback ~${project.paybackMo} months${risk}\n\nBill of materials:\n${bom}\n\nPlease include unit prices, lead time, warranty and installation. Equivalent brands are welcome if the specs are met.\n\nThank you,\n\n${sig}`,
    th: `เรียน ทีมขาย SpareX,\n\nทางเราขอใบเสนอราคาอย่างเป็นทางการสำหรับโครงการปรับปรุงจาก Digital Twin ดังนี้:\n\nโครงการ: ${title}\nจุดติดตั้ง: ${L(project.asset)}\nงบประมาณโดยประมาณ: ${formatTHB(project.capex)}\nผลตอบแทน: ${formatTHB(project.benefitYr)}/ปี · คืนทุน ~${project.paybackMo} เดือน${risk}\n\nรายการอะไหล่ (BOM):\n${bom}\n\nรบกวนเสนอราคาต่อหน่วย ระยะเวลาส่งมอบ การรับประกัน และค่าติดตั้ง (เสนอรุ่นเทียบเท่าได้หากสเปคตรง)\n\nขอบคุณครับ/ค่ะ\n\n${sig}`,
  }));
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = () => {
    setSending(true);
    setTimeout(() => { setSending(false); setSent("SPX-Q-" + Date.now().toString(36).slice(-6).toUpperCase()); onSent(); }, 900);
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white text-slate-800 shadow-2xl">
        <div className="flex items-center justify-between bg-[#0f6cbd] px-4 py-2.5 text-white">
          <span className="flex items-center gap-2 text-[13px] font-semibold"><Send size={14} /> {L({ en: "New message · Request for Quotation", th: "ข้อความใหม่ · ขอใบเสนอราคา" })}</span>
          <button onClick={onClose} className="grid h-6 w-6 place-items-center rounded transition hover:bg-white/20"><X size={15} /></button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check size={28} /></span>
            <p className="text-[15px] font-semibold text-slate-800">{L({ en: "Quotation request sent", th: "ส่งคำขอใบเสนอราคาแล้ว" })}</p>
            <p className="text-[12.5px] text-slate-500">{L({ en: "Sent to", th: "ส่งถึง" })} <b className="text-slate-700">{SPAREX_SALES_EMAIL}</b><br />{L({ en: "Ref", th: "เลขอ้างอิง" })}: <b className="font-mono text-slate-700">{sent}</b></p>
            <p className="max-w-sm text-[12px] text-slate-400">{L({ en: "The SpareX sales team will reply within 1 business day.", th: "ทีมขาย SpareX จะติดต่อกลับภายใน 1 วันทำการ" })}</p>
            <button onClick={onClose} className="mt-2 rounded-lg bg-[#0f6cbd] px-5 py-2 text-[13px] font-medium text-white transition hover:bg-[#0c5aa0]">{L({ en: "Close", th: "ปิด" })}</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2">
              <button onClick={send} disabled={sending} className="flex items-center gap-1.5 rounded bg-[#0f6cbd] px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#0c5aa0] disabled:opacity-60"><Send size={13} /> {sending ? L({ en: "Sending…", th: "กำลังส่ง…" }) : L({ en: "Send", th: "ส่ง" })}</button>
              <span className="grid h-8 w-8 place-items-center rounded text-slate-400"><Paperclip size={15} /></span>
            </div>
            <div className="border-b border-slate-100 px-4 py-2 text-[13px]">
              <div className="flex items-center gap-2 border-b border-slate-100 py-1.5"><span className="w-14 shrink-0 text-slate-400">{L({ en: "To", th: "ถึง" })}</span><span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[12px] font-medium text-[#0f6cbd]">SpareX Sales &lt;{SPAREX_SALES_EMAIL}&gt;</span></div>
              <div className="flex items-center gap-2 py-1.5"><span className="w-14 shrink-0 text-slate-400">{L({ en: "Subject", th: "เรื่อง" })}</span><input value={subject} onChange={(e) => setSubject(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-slate-800 outline-none" /></div>
            </div>
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
              <span className="flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11.5px] text-slate-600"><Paperclip size={12} /> BOM-{project.code}.pdf <span className="text-slate-400">· {(project.bom.length * 12 + 40)} KB</span></span>
            </div>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[240px] flex-1 resize-none px-4 py-3 text-[12.5px] leading-relaxed text-slate-700 outline-none" spellCheck={false} />
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ──────────────────────────────────────────────── 04 recommend & act ── */

export function TwinActionStep() {
  const { locale } = useI18n();
  const L: Lf = (o) => (locale === "th" ? o.th : o.en);

  const [lit, setLit] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLit(true), 90); return () => clearTimeout(t); }, []);
  const [qwStatus, setQwStatus] = useState<Record<string, TwinQuickWinStatus>>(() => Object.fromEntries(twinQuickWins.map((q) => [q.id, q.status])));
  const [qwAuto, setQwAuto] = useState<Record<string, boolean>>(() => Object.fromEntries(twinQuickWins.map((q) => [q.id, q.autoDefault])));
  const [openId, setOpenId] = useState<string | null>(twinCapitalProjects[0]?.id ?? null);
  // exec-card filter — click a side to see only that part; click again for both
  const [view, setView] = useState<"all" | "zero" | "invest">("all");
  const [poDone, setPoDone] = useState<Set<string>>(new Set());
  const [quoteFor, setQuoteFor] = useState<(typeof twinCapitalProjects)[number] | null>(null);
  const [quoteSent, setQuoteSent] = useState<Set<string>>(new Set());
  const orders = useWorkOrders();

  const zeroYr = twinQuickWins.reduce((s, q) => s + q.savingYr, 0); // ≈ ฿9.2M/yr
  const investYr = twinCapitalProjects.reduce((s, c) => s + c.benefitYr, 0); // ฿3.18M/yr
  const capexTotal = twinCapitalProjects.reduce((s, c) => s + c.capex, 0);
  const riskAvoided = twinCapitalProjects.reduce((s, c) => s + (c.riskAvoided ?? 0), 0); // ฿3.5M one-time
  const grand = zeroYr + investYr; // ≈ ฿12.4M/yr
  const blendedPayback = Math.round((capexTotal / investYr) * 12 * 10) / 10;
  const zeroPct = Math.round((zeroYr / grand) * 100);
  const runningYr = twinQuickWins.filter((q) => qwStatus[q.id] === "running").reduce((s, q) => s + q.savingYr, 0);

  const woFor = (id: string) => orders.find((w) => w.findingId === id);
  const hasWO = (id: string) => poDone.has(id) || !!woFor(id);

  // capital project → install & commissioning Work Order (raised on budget approval)
  const approveProject = (c: (typeof twinCapitalProjects)[number]) => {
    createWorkOrder({ id: c.id, code: c.code, title: { en: `Install & commission · ${L(c.title)}`, th: `ติดตั้ง & Commissioning · ${L(c.title)}` }, asset: c.asset, severity: c.severity === "recommend" ? "advisory" : c.severity, capex: c.capex, annualSaving: c.benefitYr, partsCount: c.bom.length }, "asset");
    setPoDone((s) => new Set(s).add(c.id));
  };
  // quick win → the twin takes over and runs it (config only, no capex)
  const enableQuickWin = (id: string) => setQwStatus((s) => ({ ...s, [id]: "running" }));

  return (
    <div className="space-y-6">
      {/* Executive summary — the ฿ decision in one glance */}
      <section className="panel p-5" style={{ background: "linear-gradient(180deg, rgba(34,211,238,0.06), transparent 82%)" }}>
        <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
          <Icon3D icon={Sparkles} color={CYAN} size={28} rounded={9} /> {L({ en: "Twin action plan · recoverable this year", th: "แผนลงมือจากทวิน · เก็บคืนได้ปีนี้" })}
        </div>
        <p className="mt-3 tabular text-4xl font-bold text-white">{formatTHB(grand)}<span className="ml-2 text-sm font-normal text-white/45">/{L({ en: "yr", th: "ปี" })}</span></p>
        <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-white/50"><ShieldCheck size={12} className="text-rose-300" /> {L({ en: `plus ${formatTHB(riskAvoided)} of one-time failure risk avoided (Chiller B)`, th: `บวกกันความเสี่ยงพังครั้งเดียวอีก ${formatTHB(riskAvoided)} (Chiller B)` })}</p>
        <div className="mt-3 max-w-lg">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-white/8">
            <div style={{ width: lit ? `${zeroPct}%` : "0%", background: "linear-gradient(90deg,#22d3ee,#0891b2)", transition: "width 1000ms ease" }} />
            <div style={{ width: lit ? `${100 - zeroPct}%` : "0%", background: "linear-gradient(90deg,#818cf8,#4f46e5)", transition: "width 1000ms ease" }} />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setView((v) => (v === "zero" ? "all" : "zero"))}
            aria-pressed={view === "zero"}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3.5 text-left transition",
              view === "zero" ? "border-cyan-400/60 bg-cyan-400/[0.12] ring-1 ring-cyan-400/40" : "border-cyan-400/25 bg-cyan-400/[0.06] hover:bg-cyan-400/[0.09]",
              view === "invest" && "opacity-50",
            )}
          >
            <Icon3D icon={Zap} color={CYAN} size={34} rounded={10} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">{L({ en: "Zero-invest · start today", th: "ไม่ต้องลงทุน · เริ่มได้วันนี้" })}</p>
              <p className="tabular text-xl font-bold text-cyan-200">{formatTHB(zeroYr)}<span className="text-[11px] font-normal text-white/45">/{L({ en: "yr", th: "ปี" })}</span></p>
              <p className="text-[10.5px] text-white/45">{twinQuickWins.length} {L({ en: "AI actions · ฿0 capex", th: "รายการ AI ทำให้ · ลงทุน ฿0" })}</p>
            </div>
            <span className={cn("shrink-0 text-[10px]", view === "zero" ? "text-cyan-200" : "text-white/35")}>{view === "zero" ? L({ en: "showing · tap for all", th: "กำลังดู · กดอีกทีดูทั้งหมด" }) : L({ en: "tap to view", th: "กดดูเฉพาะส่วนนี้" })}</span>
          </button>
          <button
            onClick={() => setView((v) => (v === "invest" ? "all" : "invest"))}
            aria-pressed={view === "invest"}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3.5 text-left transition",
              view === "invest" ? "border-indigo-400/60 bg-indigo-400/[0.12] ring-1 ring-indigo-400/40" : "border-indigo-400/25 bg-indigo-400/[0.06] hover:bg-indigo-400/[0.09]",
              view === "zero" && "opacity-50",
            )}
          >
            <Icon3D icon={Wallet} color="#818cf8" size={34} rounded={10} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300">{L({ en: "Invest · fast payback", th: "ต้องลงทุน · คืนทุนไว" })}</p>
              <p className="tabular text-xl font-bold text-indigo-200">+{formatTHB(investYr)}<span className="text-[11px] font-normal text-white/45">/{L({ en: "yr", th: "ปี" })}</span></p>
              <p className="text-[10.5px] text-white/45">{L({ en: "budget", th: "งบ" })} {formatTHB(capexTotal)} · {L({ en: "payback", th: "คืนทุน" })} ~{blendedPayback} {L({ en: "mo", th: "เดือน" })}</p>
            </div>
            <span className={cn("shrink-0 text-[10px]", view === "invest" ? "text-indigo-200" : "text-white/35")}>{view === "invest" ? L({ en: "showing · tap for all", th: "กำลังดู · กดอีกทีดูทั้งหมด" }) : L({ en: "tap to view", th: "กดดูเฉพาะส่วนนี้" })}</span>
          </button>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-white/60"><ArrowRight size={13} className="shrink-0 text-cyan-300" /> {L({ en: "Start the left side today — it's free. The right side pays back in months. Tap a card to focus on one side.", th: "เริ่มจากฝั่งซ้ายวันนี้ — ฟรี ไม่ต้องรองบ · ฝั่งขวาคืนทุนภายในไม่กี่เดือน · กดการ์ดเพื่อดูเฉพาะฝั่งนั้น" })}</p>
      </section>

      {/* Part 1 · Quick wins — the twin's autonomous actions (฿0 capex) */}
      {view !== "invest" ? (
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <Icon3D icon={Rocket} color={CYAN} size={30} rounded={9} />
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-white">{L({ en: "1 · Zero-invest — the twin runs these", th: "1 · ไม่ต้องลงทุน — ทวินรันให้เอง" })}</h3>
            <p className="text-[11px] text-white/45">{L({ en: "Approve once · AI keeps the savings coming", th: "อนุมัติครั้งเดียว · AI เก็บเงินคืนให้ต่อเนื่อง" })}</p>
          </div>
          <span className="ml-auto chip text-cyan-300">{formatTHB(zeroYr)}/{L({ en: "yr", th: "ปี" })} · ฿0 capex</span>
          <span className="chip text-emerald-300"><Bot size={11} /> {L({ en: "running now", th: "รันอยู่ตอนนี้" })} {formatTHB(runningYr)}/{L({ en: "yr", th: "ปี" })}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {twinQuickWins.map((q) => {
            const st = qwStatus[q.id];
            const m = QW_STATUS[st];
            return (
              <div key={q.id} className={cn("flex flex-col rounded-2xl border p-4 transition", st === "running" ? "border-cyan-400/30 bg-cyan-400/[0.04]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]")}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-medium leading-snug text-white">{L(q.title)}</p>
                  <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9.5px] font-medium", m.cls)}><span className={cn("h-1.5 w-1.5 rounded-full", m.dot, st === "running" && "animate-pulse")} />{L(m.label)}</span>
                </div>
                <p className="mt-1 text-[10.5px] text-white/40">{L(q.asset)}</p>
                <p className="mt-2 flex-1 text-[11px] leading-relaxed text-white/55">{L(q.how)}</p>
                <div className="mt-2.5">
                  <p className="tabular text-lg font-bold text-cyan-300">{formatTHB(q.savingMo)}<span className="text-[10px] font-normal text-white/40">/{L({ en: "mo", th: "เดือน" })}</span></p>
                  <p className="tabular text-[10px] text-white/40">= {formatTHB(q.savingYr)}/{L({ en: "yr", th: "ปี" })}</p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-2.5">
                  <span className="flex items-center gap-1.5 text-[10.5px] text-white/55"><Bot size={12} className={qwAuto[q.id] ? "text-cyan-300" : "text-white/40"} /> AI Auto</span>
                  <Toggle on={qwAuto[q.id]} onChange={() => setQwAuto((a) => ({ ...a, [q.id]: !a[q.id] }))} />
                </div>
                {st === "running" ? (
                  <span className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/25 bg-cyan-400/[0.06] px-3 py-1.5 text-[11px] font-medium text-cyan-200"><Bot size={12} /> {L({ en: "AI is running this now", th: "AI กำลังรันอยู่ตอนนี้" })}</span>
                ) : (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => enableQuickWin(q.id)} className="btn-glow mt-2 justify-center px-3 py-1.5 text-[11.5px]">
                    {st === "pending"
                      ? <><Check size={12} /> {qwAuto[q.id] ? L({ en: "Approve · AI runs it", th: "อนุมัติ · ให้ AI รัน" }) : L({ en: "Approve & schedule", th: "อนุมัติ & จัดตาราง" })}</>
                      : <><Bot size={12} /> {qwAuto[q.id] ? L({ en: "Enable · AI runs it", th: "เปิดใช้ · ให้ AI รัน" }) : L({ en: "Enable manually", th: "เปิดใช้แบบคุมเอง" })}</>}
                  </motion.button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      ) : null}

      {/* Part 2 · Capital projects (capex + BOM) */}
      {view !== "zero" ? (
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <Icon3D icon={Wrench} color="#818cf8" size={30} rounded={9} />
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-white">{L({ en: "2 · Invest — projects with a full BOM", th: "2 · ต้องลงทุน — โครงการพร้อม BOM ครบ" })}</h3>
            <p className="text-[11px] text-white/45">{L({ en: "Expand for an orderable parts list", th: "กางดูรายการอะไหล่ที่สั่งซื้อได้ทันที" })}</p>
          </div>
          <span className="ml-auto chip text-indigo-300">+{formatTHB(investYr)}/{L({ en: "yr", th: "ปี" })} · {L({ en: "budget", th: "งบ" })} {formatTHB(capexTotal)}</span>
        </div>
        <div className="space-y-3">
          {twinCapitalProjects.map((c) => {
            const open = openId === c.id;
            const bomSum = c.bom.reduce((s, b) => s + b.qty * b.unitPrice, 0);
            const done = hasWO(c.id);
            return (
              <div key={c.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                <button onClick={() => setOpenId(open ? null : c.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left transition hover:bg-white/[0.02]">
                  <div className="min-w-[180px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide", CP_SEV[c.severity].cls)}>{L(CP_SEV[c.severity].label)}</span>
                      <span className="shrink-0 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9.5px] font-semibold tabular text-white/55">{c.code}</span>
                      {c.urgency ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/12 px-2 py-0.5 text-[9px] font-semibold text-rose-300"><Timer size={10} /> {L(c.urgency)}</span> : null}
                      <p className="text-[13.5px] font-medium text-white">{L(c.title)}</p>
                    </div>
                    <p className="mt-0.5 text-[10.5px] text-white/40">{L(c.asset)} · {c.bom.length} {L({ en: "BOM lines", th: "รายการอะไหล่" })}</p>
                  </div>
                  {c.riskAvoided ? (
                    <div className="text-right"><p className="tabular text-[13px] font-bold text-rose-300">{formatTHB(c.riskAvoided)}</p><p className="text-[9px] uppercase text-white/35">{L({ en: "risk avoided", th: "กันความเสี่ยง" })}</p></div>
                  ) : null}
                  <div className="text-right"><p className="tabular text-[13px] font-bold text-emerald-300">+{formatTHB(c.benefitYr)}</p><p className="text-[9px] uppercase text-white/35">/{L({ en: "yr benefit", th: "ปี ที่ได้คืน" })}</p></div>
                  <div className="text-right"><p className="tabular text-[13px] font-bold text-amber-300">{formatTHB(c.capex)}</p><p className="text-[9px] uppercase text-white/35">{L({ en: "budget", th: "งบ" })}</p></div>
                  <span className="rounded-lg bg-white/[0.06] px-2 py-1 text-center text-[11px] tabular text-white/70">{L({ en: "payback", th: "คืนทุน" })} ~{c.paybackMo}{L({ en: "mo", th: "ด" })}</span>
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.06]"><ChevronDown size={15} className={cn("text-white/60 transition-transform", open && "rotate-180")} /></span>
                </button>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div key="bom" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: "hidden" }}>
                      <div className="border-t border-white/8 px-4 pb-4 pt-3">
                        {/* why + evidence — the diagnosis that justifies the spend */}
                        <div className="mb-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3">
                          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300"><AlertTriangle size={12} /> {L({ en: "Why this is needed", th: "ทำไมต้องทำ" })}</div>
                          <p className="text-[12px] leading-relaxed text-white/75">{L(c.why)}</p>
                        </div>
                        {/* expected result if the project is done */}
                        <div className="mb-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3">
                          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300"><TrendingUp size={12} /> {L({ en: "If you do it — the result", th: "ถ้าทำ — ผลลัพธ์" })}</div>
                          <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-white/75"><ArrowRight size={11} className="mt-0.5 shrink-0 text-emerald-400" /> {L(c.outcome)}</p>
                        </div>
                        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300"><Package size={12} /> {L({ en: "Bill of materials", th: "รายการอะไหล่ (BOM)" })}</div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[480px] text-left text-[11.5px]">
                            <thead><tr className="border-b border-white/10 text-[9.5px] uppercase tracking-wide text-white/40">
                              <th className="py-1.5 pr-2 font-medium">{L({ en: "Item", th: "รายการ" })}</th>
                              <th className="px-2 py-1.5 text-center font-medium">{L({ en: "Qty", th: "จำนวน" })}</th>
                              <th className="px-2 py-1.5 text-right font-medium">{L({ en: "Unit ฿", th: "฿/หน่วย" })}</th>
                              <th className="px-2 py-1.5 text-right font-medium">{L({ en: "Total", th: "รวม" })}</th>
                            </tr></thead>
                            <tbody className="tabular">
                              {c.bom.map((b, i) => (
                                <tr key={i} className="border-b border-white/5">
                                  <td className="py-2 pr-2 font-medium text-white/85">{L(b.item)}</td>
                                  <td className="px-2 py-2 text-center text-white/60">{b.qty}</td>
                                  <td className="px-2 py-2 text-right text-white/60">{formatTHB(b.unitPrice)}</td>
                                  <td className="px-2 py-2 text-right text-white/80">{formatTHB(b.qty * b.unitPrice)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="tabular text-[11px]">
                              {bomSum !== c.capex ? <tr><td colSpan={3} className="py-1.5 pr-2 text-right text-white/45">{L({ en: "BOM subtotal", th: "รวมค่าอะไหล่" })}</td><td className="px-2 py-1.5 text-right text-white/70">{formatTHB(bomSum)}</td></tr> : null}
                              <tr><td colSpan={3} className="py-1.5 pr-2 text-right text-[12px] font-semibold text-white/70">{L({ en: "Total budget", th: "งบรวม" })}</td><td className="px-2 py-1.5 text-right text-[12px] font-bold text-amber-300">{formatTHB(c.capex)}</td></tr>
                            </tfoot>
                          </table>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span className="chip text-white/50"><Package size={11} /> {c.bom.length} {L({ en: "line items", th: "รายการ" })}</span>
                          <div className="ml-auto flex items-center gap-2">
                            {/* quote → SpareX — procurement runs alongside the WO */}
                            {quoteSent.has(c.id) ? (
                              <button onClick={() => setQuoteFor(c)} className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[12px] font-medium text-amber-200 transition hover:bg-amber-400/15"><Check size={13} /> {L({ en: "RFQ sent · awaiting quote", th: "ส่งขอราคาแล้ว · รอใบเสนอราคา" })}</button>
                            ) : (
                              <button onClick={() => setQuoteFor(c)} className="inline-flex items-center gap-1 rounded-lg border border-brand-400/30 bg-brand-400/10 px-2.5 py-1.5 text-[12px] font-medium text-brand-200 transition hover:bg-brand-400/20"><FileText size={13} /> {L({ en: "Request quote → SpareX", th: "ขอใบเสนอราคา → SpareX" })}</button>
                            )}
                            {/* approve budget → install WO */}
                            {done ? (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-[12px] font-medium text-emerald-300"><Check size={13} /> {L({ en: "Install WO raised", th: "สร้าง WO ติดตั้งแล้ว" })}{woFor(c.id) ? ` · ${woFor(c.id)!.id}` : ""}</span>
                            ) : (
                              <motion.button whileTap={{ scale: 0.97 }} onClick={() => approveProject(c)} className="btn-glow px-3 py-1.5 text-[12px]"><Plus size={13} /> {L({ en: "Approve → install WO", th: "อนุมัติงบ → WO ติดตั้ง" })}</motion.button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
      ) : null}

      {quoteFor ? <QuoteEmailModal project={quoteFor} L={L} onClose={() => setQuoteFor(null)} onSent={() => setQuoteSent((s) => new Set(s).add(quoteFor.id))} /> : null}
    </div>
  );
}
