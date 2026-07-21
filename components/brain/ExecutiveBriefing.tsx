"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles, Volume2, Square, MessageSquare, AlertTriangle, ArrowRight, Printer,
  Check, ArrowUp, ArrowDown, ShieldCheck, Radar, Zap, Target, Clock, UserCog, PlayCircle,
} from "lucide-react";
import { briefing, voiceScripts, voiceLang } from "@/lib/brain";
import {
  execRoles, moneyToday, execKpis, production, execIncidents, execActions,
  execPredictions, benchmark, scenarioLines, thbCompact, execAiBrief,
  type ExecRole, type ExecKpi, type LZ,
} from "@/lib/exec";
import { AiInsight } from "@/components/os/AiInsight";
import { openCopilot, formatTHB, cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useTr } from "@/lib/autotranslate";
import { Sparkline } from "@/components/ui/Sparkline";
import { publicAsset } from "@/lib/paths";

/* -------------------------------------------------------------- helpers */
function scoreColor(s: number) {
  return s >= 90 ? "#34d399" : s >= 80 ? "#22d3ee" : s >= 70 ? "#f59e0b" : "#f43f5e";
}
function Ring({ value, size = 88, stroke = 8 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = scoreColor(value);
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-white/8" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - value / 100) }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} style={{ filter: `drop-shadow(0 0 6px ${color}66)` }} />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-semibold tabular leading-none text-white">{value}</p>
        <p className="text-[9px] text-white/40">/ 100</p>
      </div>
    </div>
  );
}
function SectionHead({ n, title, extra }: { n: string; title: string; extra?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="grid h-6 w-6 place-items-center rounded-md bg-white/[0.06] font-mono text-[11px] text-brand-300">{n}</span>
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/70">{title}</h3>
      <span className="h-px flex-1 bg-white/10" />
      {extra}
    </div>
  );
}
function TrendChip({ pct, good }: { pct: number; good: boolean }) {
  if (pct === 0) return null;
  return (
    <span className={cn("inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold", good ? "bg-emerald-500/12 text-emerald-400" : "bg-rose-500/12 text-rose-400")}>
      {pct >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}{Math.abs(pct)}%
    </span>
  );
}

export function ExecutiveBriefing() {
  const { t, locale } = useI18n();
  const tr = useTr();
  const L = (o: LZ) => (locale === "th" ? o.th : o.en);
  const [speaking, setSpeaking] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceNotice, setVoiceNotice] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [dateStr, setDateStr] = useState("");
  const [role, setRole] = useState<ExecRole>("CEO");
  const [decided, setDecided] = useState<Record<string, "approved" | "delegated" | "prevented">>({});
  // watchlist card: "about to break" and "opportunities" share one card as tabs —
  // they're both just sources feeding the Decisions queue above
  const [watch, setWatch] = useState<"break" | "opp">("break");

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }));
    const ok = typeof window !== "undefined" && "speechSynthesis" in window;
    setCanSpeak(ok);
    if (!ok) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const NAME_KW: Record<string, string[]> = {
    th: ["thai", "ไทย"],
    ja: ["japanese", "日本", "にほん"],
    zh: ["chinese", "mandarin", "中文", "普通话", "汉语", "國語", "粤"],
    en: ["english"],
  };
  function pickVoice(loc: typeof locale) {
    const prefix = voiceLang[loc].split("-")[0].toLowerCase();
    return voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(prefix)) ||
      voices.find((v) => (NAME_KW[loc] || []).some((k) => v.name.toLowerCase().includes(k))) || null;
  }
  const missingVoice = canSpeak && locale !== "en" && voices.length > 0 && !pickVoice(locale);
  function stopVoice() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setSpeaking(false);
  }

  async function playServerVoice() {
    const url =
      locale === "th"
        ? publicAsset("/factoryos-briefing-th.wav")
        : publicAsset(`/api/tts?locale=${encodeURIComponent(locale)}&text=${encodeURIComponent(voiceScripts[locale])}`);
    const audio = new Audio(url);
    audio.preload = "auto";
    audioRef.current = audio;
    audio.onended = () => stopVoice();
    audio.onplaying = () => {
      setSpeaking(true);
      setVoiceNotice("");
    };
    audio.onwaiting = () => setVoiceNotice(locale === "th" ? "กำลังโหลดเสียงไทย..." : "Generating voice...");
    audio.onerror = () => {
      setVoiceNotice(locale === "th" ? "ยังเล่นเสียงไทยไม่ได้ กรุณาลองใหม่อีกครั้ง" : "Audio playback failed. Please try again.");
      stopVoice();
    };
    setSpeaking(true);
    await audio.play();
  }

  async function toggleVoice() {
    if (speaking) { stopVoice(); return; }
    const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
    synth?.cancel();
    setVoiceNotice("");
    if (locale === "th") {
      try {
        await playServerVoice();
      } catch {
        setVoiceNotice("ยังเล่นเสียงไทยไม่ได้ กรุณาลองใหม่อีกครั้ง");
      }
      return;
    }

    const v = pickVoice(locale);

    if (!synth || (locale !== "en" && !v)) {
      try {
        await playServerVoice();
      } catch {
        setVoiceNotice("Text-to-speech is temporarily unavailable. Please try again.");
      }
      return;
    }

    const u = new SpeechSynthesisUtterance(voiceScripts[locale]);
    u.lang = voiceLang[locale];
    if (v) u.voice = v;
    u.rate = locale === "en" ? 1.02 : 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  }

  const roleMeta = execRoles.find((r) => r.id === role)!;
  const kpis = roleMeta.kpiOrder.map((id) => execKpis.find((k) => k.id === id)!).filter(Boolean) as ExecKpi[];

  // production vs plan
  const projPct = Math.round((production.projectedMonthEnd / production.target) * 100);
  const actualPct = Math.round((production.actualMtd / production.target) * 100);
  const shortfall = production.target - production.projectedMonthEnd;

  const decide = (id: string, kind: "approved" | "delegated" | "prevented") => setDecided((p) => ({ ...p, [id]: kind }));

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="report-sheet relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] shadow-card"
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-brand-400 via-accent-500 to-brand-400" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/10 blur-[110px]" />

      <div className="relative p-6 sm:p-9">
        {/* header */}
        <div className="flex flex-col gap-6 border-b border-white/10 pb-7 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950 shadow-glow"><Sparkles size={17} /></span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">SpareX FactoryOS™ · {tr("Executive Summary")}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/40">
                  <span className="tabular">{dateStr || "—"}</span> · Bangkok Plant 1 ·
                  <span className="inline-flex items-center gap-1 text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-status-ok" /> {tr("Live")}</span>
                </p>
              </div>
            </div>
            <h2 className="mt-5 max-w-xl text-balance text-2xl font-semibold leading-snug tracking-tight sm:text-[27px]">
              {t("brief.greeting")}. {t("brief.head1")} <span className="text-brand-gradient">{briefing.health}/100</span> {t("brief.head2")}
              <span className="text-white/55"> {t("brief.head3")}</span>
            </h2>
            {/* My Focus role toggle */}
            <div className="no-print mt-4 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40"><UserCog size={13} /> {L({ en: "My Focus", th: "มุมมองของฉัน" })}</span>
              <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
                {execRoles.map((r) => (
                  <button key={r.id} onClick={() => setRole(r.id)} className={cn("rounded-md px-2.5 py-1 text-[12px] font-semibold transition", role === r.id ? "bg-white/10 text-white/90" : "text-white/45 hover:text-white/70")}>{L(r.label)}</button>
                ))}
              </div>
              <span className="text-[12px] text-white/45">· {L(roleMeta.headline)}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <Ring value={briefing.health} />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/45">{tr("Factory Health")}</p>
              <p className="text-lg font-semibold text-emerald-300">{tr("Good")}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-300"><ArrowUp size={11} /> {benchmark.vsYesterday} {L({ en: "vs yesterday", th: "เทียบเมื่อวาน" })}</p>
              <p className="text-[11px] text-white/40">+{benchmark.vsLastMonth} {L({ en: "vs last month", th: "เทียบเดือนก่อน" })}</p>
            </div>
          </div>
        </div>

        {/* Money today — 3 lenses */}
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-rose-400/25 bg-rose-500/[0.07] p-4">
            <p className="text-[11px] uppercase tracking-wider text-rose-300/80">{L({ en: "At risk today", th: "เสี่ยงวันนี้" })}</p>
            <p className="mt-1 tabular text-2xl font-semibold text-rose-300">−{thbCompact(moneyToday.atRisk)}</p>
            <p className="mt-0.5 text-[11px] text-white/40">{L({ en: "if today's issues go unresolved", th: "หากปัญหาวันนี้ไม่ถูกแก้" })}</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.07] p-4">
            <p className="text-[11px] uppercase tracking-wider text-emerald-300/80">{L({ en: "AI captured today", th: "AI ประหยัดให้แล้ววันนี้" })}</p>
            <p className="mt-1 tabular text-2xl font-semibold text-emerald-300">+{thbCompact(moneyToday.savedByAi)}</p>
            <p className="mt-0.5 text-[11px] text-white/40">{L({ en: "from autonomous actions", th: "จากการทำงานอัตโนมัติ" })}</p>
          </div>
          <div className="rounded-2xl border border-brand-400/25 bg-brand-400/[0.07] p-4">
            <p className="text-[11px] uppercase tracking-wider text-brand-200/80">{L({ en: "Opportunity waiting", th: "โอกาสรอเก็บ" })}</p>
            <p className="mt-1 tabular text-2xl font-semibold text-brand-200">+{thbCompact(moneyToday.opportunityYr)}<span className="text-sm font-normal text-white/40">/{L({ en: "yr", th: "ปี" })}</span></p>
            <p className="mt-0.5 text-[11px] text-white/40">{L({ en: "3 actions need your decision", th: "3 การดำเนินการรอคุณตัดสินใจ" })}</p>
          </div>
        </div>

        {/* KPI band — value + trend + so-what */}
        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-5">
          {kpis.map((m) => {
            const good = m.goodWhenUp ? m.trendPct >= 0 : m.trendPct <= 0;
            return (
              <div key={m.id} className="flex flex-col bg-ink-900 p-4">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">{L(m.label)}</p>
                  <TrendChip pct={m.trendPct} good={good} />
                </div>
                <p className="mt-1 text-lg font-semibold tabular text-white">{m.value}{m.unit ? <span className="text-xs font-normal text-white/40"> {m.unit}</span> : null}</p>
                {m.spark ? <div className="mt-1.5"><Sparkline data={m.spark} color={m.accent} width={150} height={22} /></div> : <div className="mt-1.5 h-[22px]" />}
                <p className="mt-1.5 text-[10px] leading-snug text-white/45">{L(m.soWhat)}</p>
              </div>
            );
          })}
        </div>

        {/* AI briefing · standard 5-part voice */}
        <div className="mt-8">
          <AiInsight brief={execAiBrief} L={L} onAction={() => document.querySelector('[data-section="decisions"]')?.scrollIntoView({ behavior: "smooth", block: "start" })} />
        </div>

        {/* Production vs plan */}
        <div className="mt-8">
          <SectionHead n="01" title={L({ en: "Will We Hit The Month?", th: "เดือนนี้จะทำยอดทันไหม?" })} extra={<span className={cn("chip whitespace-nowrap tabular", projPct >= 100 ? "text-emerald-300" : "text-amber-300")}>{L({ en: "projected", th: "คาดการณ์" })} {projPct}%</span>} />
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] text-white/45">{L({ en: "Month-to-date", th: "สะสมเดือนนี้" })} · {L({ en: "day", th: "วันที่" })} {production.dayOfMonth}/{production.daysInMonth}</p>
                <p className="mt-0.5 tabular text-2xl font-semibold text-white">{production.actualMtd.toLocaleString()}<span className="text-sm font-normal text-white/40"> / {production.target.toLocaleString()} {L(production.unit)}</span></p>
              </div>
              <p className={cn("text-sm font-semibold", shortfall > 0 ? "text-amber-300" : "text-emerald-300")}>
                {shortfall > 0 ? <>{L({ en: "Projected shortfall", th: "คาดว่าจะขาด" })} {shortfall.toLocaleString()} {L(production.unit)}</> : L({ en: "On track to hit target", th: "มีแนวโน้มทำได้ตามเป้า" })}
              </p>
            </div>
            <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-white/8">
              <div className="absolute inset-y-0 left-0 rounded-full bg-brand-400/40" style={{ width: `${projPct}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full bg-brand-400" style={{ width: `${actualPct}%` }} />
              <div className="absolute inset-y-0 w-0.5 bg-white/80" style={{ left: "100%" }} title="target" />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-white/35">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-brand-400 align-middle" />{L({ en: "actual", th: "ทำได้จริง" })} {actualPct}%</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-brand-400/40 align-middle" />{L({ en: "projected month-end", th: "คาดการณ์สิ้นเดือน" })} {projPct}%</span>
            </div>
          </div>
        </div>

        {/* Decision Queue — incidents sorted by ฿, approvable inline */}
        <div className="mt-8" data-section="decisions">
          <SectionHead n="02" title={L({ en: "Decisions Today", th: "ต้องตัดสินใจวันนี้" })} extra={<span className="chip whitespace-nowrap text-white/45">{L({ en: "sorted by ฿ impact", th: "เรียงตามผลกระทบ ฿" })}</span>} />
          <div className="space-y-2">
            {execIncidents.map((c) => {
              const d = decided[c.id];
              return (
                <div key={c.id} className={cn("flex flex-col gap-3 rounded-2xl border bg-white/[0.02] p-4 sm:flex-row sm:items-center", c.severity === "critical" ? "border-l-[3px] border-l-rose-400 border-white/10" : "border-l-[3px] border-l-amber-400 border-white/10")}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className={c.severity === "critical" ? "text-rose-300" : "text-amber-300"} />
                      <p className="text-sm font-medium text-white/90">{L(c.name)}</p>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-white/45">
                      <span>{L(c.asset)}</span><span>· <Clock size={10} className="inline" /> {L(c.elapsed)}</span>
                    </p>
                    <p className="mt-1 text-[12px] text-white/60"><span className="text-white/40">{L({ en: "AI:", th: "AI:" })}</span> {L(c.action)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-white/35">{L({ en: "loss today", th: "เสียวันนี้" })}</p>
                      <p className="tabular text-base font-semibold text-rose-300">−{thbCompact(c.lossToday)}</p>
                    </div>
                    {d ? (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-semibold text-emerald-300"><Check size={13} /> {d === "approved" ? L({ en: "Approved", th: "อนุมัติแล้ว" }) : L({ en: "Delegated", th: "มอบหมายแล้ว" })}</span>
                    ) : (
                      <div className="no-print flex items-center gap-1.5">
                        <button onClick={() => decide(c.id, "approved")} className="btn-glow whitespace-nowrap px-3 py-1.5 text-[12px]">{L({ en: "Approve", th: "อนุมัติ" })}</button>
                        <button onClick={() => decide(c.id, "delegated")} className="whitespace-nowrap rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 text-[12px] text-white/70 transition hover:bg-white/10">{L({ en: "Delegate", th: "มอบหมาย" })}</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Watchlist — the two raw feeds behind the Decisions queue, one card, two tabs */}
        <div className="mt-8">
          <SectionHead
            n="03"
            title={L({ en: "Watchlist", th: "จับตาวันนี้" })}
            extra={
              <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
                <button onClick={() => setWatch("break")} className={cn("whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition", watch === "break" ? "bg-white/10 text-white" : "text-white/45 hover:text-white/75")}>
                  {L({ en: "About to break · 7d", th: "กำลังจะพัง · 7 วัน" })} <span className="tabular text-rose-300">{execPredictions.length}</span>
                </button>
                <button onClick={() => setWatch("opp")} className={cn("whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition", watch === "opp" ? "bg-white/10 text-white" : "text-white/45 hover:text-white/75")}>
                  {L({ en: "Opportunities", th: "โอกาส" })} <span className="tabular text-emerald-300">+{thbCompact(execActions.reduce((s, a) => s + a.roiYr, 0))}/{L({ en: "yr", th: "ปี" })}</span>
                </button>
              </div>
            }
          />
          {watch === "break" ? (
            <div className="grid gap-2 lg:grid-cols-2">
              {execPredictions.map((p) => {
                const d = decided[p.id];
                return (
                  <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-white/90"><Radar size={13} className="shrink-0 text-brand-300" /> {L(p.issue)}</p>
                        <p className="mt-0.5 text-[11px] text-white/45">{L(p.asset)} · {L({ en: "in", th: "ภายใน" })} {p.etaDays} {L({ en: "days", th: "วัน" })}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-white/8 px-2 py-0.5 text-[11px] font-semibold tabular text-white/70">{p.probability}%</span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <p className="text-[12px] text-white/55">{L({ en: "Impact", th: "กระทบ" })} <span className="font-semibold text-rose-300">{thbCompact(p.impact)}</span> · {L({ en: "prevent", th: "กันไว้" })} <span className="text-white/75">{thbCompact(p.preventCost)}</span></p>
                      {d === "prevented" ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-semibold text-emerald-300"><Check size={13} /> {L({ en: "Prevention scheduled", th: "นัดป้องกันแล้ว" })}</span>
                      ) : (
                        <button onClick={() => decide(p.id, "prevented")} className="no-print whitespace-nowrap rounded-lg border border-brand-400/30 bg-brand-400/10 px-3 py-1.5 text-[12px] font-semibold text-brand-200 transition hover:bg-brand-400/20"><ShieldCheck size={13} className="mr-1 inline" />{L({ en: "Prevent now", th: "กันไว้ก่อน" })}</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-2 lg:grid-cols-2">
              {execActions.map((a) => {
                const d = decided[a.id];
                return (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5">
                    <Zap size={14} className="shrink-0 text-emerald-300" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-white/85">{L(a.action)}</p>
                      <p className="text-[11px] text-white/40">{L(a.area)} · {L(a.effort)}</p>
                    </div>
                    <span className="shrink-0 tabular text-[13px] font-semibold text-emerald-300">+{thbCompact(a.roiYr)}</span>
                    {d ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-emerald-300"><Check size={13} /></span>
                    ) : (
                      <button onClick={() => decide(a.id, "approved")} className="no-print shrink-0 whitespace-nowrap rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 text-[12px] text-white/75 transition hover:bg-white/10">{L({ en: "Approve", th: "อนุมัติ" })}</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Benchmark (compact) + pointer to the real what-if simulators */}
        <div className="mt-8 grid gap-7 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <SectionHead n="04" title={L({ en: "Benchmark", th: "เทียบกับเกณฑ์" })} />
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[11px] text-white/45">{L({ en: "Health vs other plants", th: "สุขภาพเทียบโรงอื่น" })}</p>
              <div className="mt-2.5 space-y-2">
                {[...benchmark.plants].sort((a, b) => b.health - a.health).map((pl) => (
                  <div key={pl.id} className="flex items-center gap-2.5">
                    <span className={cn("w-20 shrink-0 break-words leading-tight text-[12px]", pl.self ? "font-semibold text-white/85" : "text-white/55")}>{L(pl.name)}{pl.self ? " ●" : ""}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                      <div className={cn("h-full rounded-full", pl.self ? "bg-brand-400" : "bg-white/25")} style={{ width: `${pl.health}%` }} />
                    </div>
                    <span className="w-7 shrink-0 text-right tabular text-[12px] font-semibold text-white/75">{pl.health}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <SectionHead n="05" title={L({ en: "Scenario · What If?", th: "จำลองสถานการณ์ · ถ้าเกิด?" })} />
            <div className="flex h-[calc(100%-2.25rem)] flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[12.5px] leading-relaxed text-white/60">
                {L({
                  en: "Try decisions before the real plant pays for them — toggle fixes and watch today's plan recover in Production Intelligence, or stress-test the whole plant in the Digital Twin.",
                  th: "ลองตัดสินใจก่อนของจริงต้องจ่าย — ติ๊กแก้ทีละเรื่องแล้วดูแผนวันนี้ฟื้นใน Production Intelligence หรือทดสอบทั้งโรงงานใน Digital Twin",
                })}
              </p>
              <div className="no-print mt-3 flex flex-wrap gap-2">
                <Link href="/os/production" className="btn-glow px-3.5 py-2 text-[12.5px]">
                  <PlayCircle size={14} /> {L({ en: "What-if · Production", th: "จำลองการผลิต" })} <ArrowRight size={13} />
                </Link>
                <Link href="/os/twin" className="rounded-lg border border-white/12 bg-white/5 px-3.5 py-2 text-[12.5px] text-white/70 transition hover:bg-white/10">
                  {L({ en: "What-if · Digital Twin", th: "จำลองทั้งโรงงาน · Twin" })}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* footer / signature */}
        <div className="mt-9 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] leading-relaxed text-white/40">{tr("Generated by")} <span className="font-medium text-white/60">SpareX FactoryOS AI</span> · {dateStr} · {tr("Confidential")}</p>
          <div className="no-print flex flex-wrap gap-2.5">
            <button onClick={toggleVoice} className={cn("btn px-4 py-2 text-sm", speaking ? "border border-status-crit/40 bg-status-crit/20 text-rose-200" : "btn-glow")}>
              {speaking ? <Square size={15} /> : <Volume2 size={15} />}{speaking ? t("brief.voiceStop") : t("brief.voice")}
            </button>
            <button onClick={() => openCopilot("Give me the full executive briefing for today")} className="btn-ghost px-4 py-2 text-sm"><MessageSquare size={15} /> {t("brief.ask")} <ArrowRight size={14} /></button>
            <button onClick={() => window.print()} className="btn-ghost px-4 py-2 text-sm"><Printer size={15} /> {L({ en: "Board report", th: "รายงานเข้าบอร์ด" })} · PDF</button>
          </div>
        </div>

        {missingVoice || voiceNotice ? (
          <p className="no-print mt-3 text-[11px] leading-relaxed text-amber-300/80">{voiceNotice || "ไม่พบเสียงไทยในเบราว์เซอร์ จึงใช้ไฟล์เสียงไทยที่สร้างไว้ให้แล้ว กดปุ่มเพื่อฟังได้เลย"}</p>
        ) : null}
      </div>
    </motion.section>
  );
}
