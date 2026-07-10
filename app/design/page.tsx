"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles, Zap, ShieldCheck, Activity, Wrench, Leaf, Boxes, ArrowUpRight,
  ArrowLeft, Check, Copy, TrendingUp,
} from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ tokens */
const BRAND = [
  ["50", "#ecfeff"], ["100", "#cffafe"], ["200", "#a5f3fc"], ["300", "#67e8f9"],
  ["400", "#22d3ee"], ["500", "#06b6d4"], ["600", "#0891b2"], ["700", "#0e7490"],
];
const ACCENT = [["400", "#818cf8"], ["500", "#6366f1"], ["600", "#4f46e5"]];
const INK = [["950", "#05060a"], ["900", "#0a0c12"], ["800", "#11141d"], ["700", "#1a1f2b"], ["600", "#272d3d"]];
const STATUS = [["ok", "#34d399"], ["warn", "#f59e0b"], ["crit", "#f43f5e"]];
const MODULES = [
  ["Energy", "#22d3ee"], ["PeakShield", "#f59e0b"], ["Production", "#34d399"], ["Assets", "#f472b6"],
  ["Maintenance", "#60a5fa"], ["Carbon", "#4ade80"], ["Copilot / AI", "#818cf8"], ["Twin", "#a78bfa"],
];
const DATAVIZ = ["#22d3ee", "#818cf8", "#34d399", "#f59e0b", "#f43f5e", "#f472b6", "#4ade80", "#60a5fa", "#a78bfa"];

/* --------------------------------------------------------------- helpers */
function Section({ n, title, desc, children }: { n: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20 border-t border-white/10 py-12">
      <div className="mb-7 flex items-baseline gap-3">
        <span className="font-mono text-xs text-white/30">{n}</span>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {desc ? <p className="mt-1 text-sm text-white/50">{desc}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Swatch({ name, hex, big }: { name: string; hex: string; big?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(hex);
        setCopied(true);
        setTimeout(() => setCopied(false), 1100);
      }}
      className="group text-left"
    >
      <div
        className={cn("relative w-full overflow-hidden rounded-xl border border-white/10", big ? "h-20" : "h-14")}
        style={{ background: hex }}
      >
        <span className="absolute inset-0 grid place-items-center text-white opacity-0 transition group-hover:opacity-100">
          {copied ? <Check size={15} /> : <Copy size={14} />}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] font-medium">{name}</p>
      <p className="font-mono text-[10px] uppercase text-white/40">{copied ? "copied" : hex}</p>
    </button>
  );
}

/* ----------------------------------------------------------------- page */
export default function DesignSystem() {
  return (
    <div className="min-h-screen bg-ink-950 text-white">
      {/* ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="grid-bg absolute inset-0 opacity-[0.15]" />
        <div className="absolute left-1/2 top-0 h-96 w-[760px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[140px]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-6">
          <Wordmark />
          <span className="chip ml-1">Design System · v1.0</span>
          <Link href="/os" className="ml-auto flex items-center gap-1.5 text-sm text-white/55 hover:text-white">
            <ArrowLeft size={14} /> FactoryOS
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        {/* hero */}
        <div className="py-14">
          <span className="eyebrow">SpareX Design System</span>
          <h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            The visual language of{" "}
            <span className="text-brand-gradient">intelligent industry</span>.
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-white/60">
            A dark, glassmorphic, command-center design language — built for premium industrial AI
            software. Calm surface, dense signal: near-black canvas, frosted glass, status-coded color,
            and restrained motion.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Calm surface, dense signal", "Near-black canvas so data and status carry meaning."],
              ["Glass over grid", "Translucent panels float above a faint engineering grid."],
              ["Color = status", "Cyan/indigo brand; green·amber·red strictly for health."],
              ["Motion clarifies", "Reveals, slide-overs, pulses guide — never decorate."],
            ].map(([t, d]) => (
              <div key={t} className="panel p-4">
                <p className="text-sm font-semibold">{t}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-white/55">{d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 01 color */}
        <Section n="01" title="Color" desc="Click any swatch to copy its hex.">
          <div className="space-y-6">
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/40">Brand · Cyan</p>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
                {BRAND.map(([n, h]) => <Swatch key={n} name={`brand-${n}`} hex={h} />)}
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/40">Accent · Indigo (AI)</p>
                <div className="grid grid-cols-3 gap-3">{ACCENT.map(([n, h]) => <Swatch key={n} name={`accent-${n}`} hex={h} />)}</div>
              </div>
              <div>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/40">Status</p>
                <div className="grid grid-cols-3 gap-3">{STATUS.map(([n, h]) => <Swatch key={n} name={`status-${n}`} hex={h} />)}</div>
              </div>
            </div>
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/40">Ink · Surfaces</p>
              <div className="grid grid-cols-5 gap-3">{INK.map(([n, h]) => <Swatch key={n} name={`ink-${n}`} hex={h} />)}</div>
            </div>
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/40">Module accents</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{MODULES.map(([n, h]) => <Swatch key={n} name={n} hex={h} />)}</div>
            </div>
          </div>
        </Section>

        {/* 02 typography */}
        <Section n="02" title="Typography" desc="Anuphan for UI (Thai + Latin) · JetBrains Mono for code, IDs & tabular figures.">
          <div className="panel space-y-4 p-6">
            <div className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-4">
              <span className="text-4xl font-semibold tracking-tight sm:text-5xl">Display 5xl</span>
              <span className="font-mono text-[11px] text-white/40">Anuphan · 600 · -0.02em</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-3">
              <span className="text-3xl font-semibold tracking-tight">Heading 3xl</span>
              <span className="font-mono text-[11px] text-white/40">Anuphan · 600</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-3">
              <span className="text-lg font-semibold">Subhead lg</span>
              <span className="font-mono text-[11px] text-white/40">Anuphan · 600</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-3">
              <span className="text-base text-white/80">Body base — turn factories into self-optimizing systems.</span>
              <span className="font-mono text-[11px] text-white/40">Anuphan · 400</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-3">
              <span className="text-sm text-white/60">Body sm — secondary supporting text.</span>
              <span className="font-mono text-[11px] text-white/40">Anuphan · 400</span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">Eyebrow · uppercase</span>
              <span className="font-mono text-[11px] text-white/40">tracking 0.18em</span>
            </div>
            <p className="pt-1 font-mono text-sm text-white/70">Mono — OEE 74.2% · ฿1,270,290 · CNC-01</p>
          </div>
        </Section>

        {/* 03 surfaces */}
        <Section n="03" title="Surfaces & Elevation" desc="Glassmorphism over a faint grid.">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="glass rounded-2xl p-5"><p className="text-sm font-semibold">.glass</p><p className="mt-1 text-xs text-white/50">Translucent + blur. Nav, sidebar, copilot.</p></div>
            <div className="panel p-5"><p className="text-sm font-semibold">.panel</p><p className="mt-1 text-xs text-white/50">Primary content card + inset highlight.</p></div>
            <div className="card p-5 shadow-glow"><p className="text-sm font-semibold">.card + glow</p><p className="mt-1 text-xs text-white/50">Cyan glow for hero / 3D twin.</p></div>
          </div>
        </Section>

        {/* 04 buttons + components */}
        <Section n="04" title="Buttons & Controls">
          <div className="panel flex flex-wrap items-center gap-3 p-6">
            <button className="btn-glow px-4 py-2 text-sm"><Sparkles size={15} /> btn-glow</button>
            <button className="btn-primary px-4 py-2 text-sm">btn-primary</button>
            <button className="btn-ghost px-4 py-2 text-sm">btn-ghost</button>
            <span className="chip">chip</span>
            <span className="chip border-status-ok/30 bg-status-ok/10 text-emerald-300">Healthy</span>
            <span className="chip border-status-warn/30 bg-status-warn/10 text-amber-300">Warning</span>
            <span className="chip border-status-crit/30 bg-status-crit/10 text-rose-300">Critical</span>
            <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/50">⌘K</kbd>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
              <input placeholder="Ask anything…" className="w-40 bg-transparent px-2 py-1 text-sm placeholder:text-white/35 focus:outline-none" />
            </div>
          </div>
        </Section>

        {/* 05 components */}
        <Section n="05" title="Patterns" desc="The recurring building blocks.">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* KPI card */}
            <div className="panel group relative overflow-hidden p-4">
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-brand-400 opacity-20 blur-2xl" />
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/45">Plant OEE</p>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-status-ok/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300"><TrendingUp size={11} />+1.2pp</span>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular">74.2<span className="ml-1 text-sm text-white/45">%</span></p>
              <svg width="100%" height="34" viewBox="0 0 220 34" className="mt-3"><path d="M0 26 L40 20 L80 24 L120 12 L160 16 L220 6" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" /></svg>
            </div>
            {/* ring */}
            <div className="panel grid place-items-center p-4">
              <div className="relative grid h-28 w-28 place-items-center">
                <svg width="112" height="112" className="-rotate-90"><circle cx="56" cy="56" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" /><circle cx="56" cy="56" r="50" fill="none" stroke="#34d399" strokeWidth="9" strokeLinecap="round" strokeDasharray={2 * Math.PI * 50} strokeDashoffset={2 * Math.PI * 50 * 0.11} style={{ filter: "drop-shadow(0 0 6px #34d39966)" }} /></svg>
                <div className="absolute text-center"><p className="text-2xl font-semibold tabular">89</p><p className="text-[10px] text-white/40">/ 100</p></div>
              </div>
              <p className="mt-2 text-xs text-white/50">Score ring</p>
            </div>
            {/* hbars */}
            <div className="panel p-4">
              <p className="mb-3 text-[11px] uppercase tracking-wider text-white/45">Top energy losses</p>
              {[["Off-peak shift", 100], ["Chiller B", 83], ["Air leak", 64], ["Idle CNC", 44]].map(([n, w]) => (
                <div key={n as string} className="mb-2">
                  <div className="flex justify-between text-[11px]"><span className="text-white/70">{n}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: `${w}%`, background: "linear-gradient(90deg,#22d3ee,#6366f1)" }} /></div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 06 data viz */}
        <Section n="06" title="Data Visualization" desc="Categorical palette for charts.">
          <div className="flex flex-wrap gap-2">
            {DATAVIZ.map((h) => <div key={h} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3"><span className="h-5 w-5 rounded-full" style={{ background: h }} /><span className="font-mono text-[11px] text-white/55">{h}</span></div>)}
          </div>
        </Section>

        {/* 07 motion + icons */}
        <Section n="07" title="Motion & Iconography">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="panel flex items-center gap-6 p-6">
              <div className="relative grid h-14 w-14 place-items-center">
                <span className="absolute inset-0 animate-pulse-ring rounded-xl bg-brand-400/40" />
                <span className="relative grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950 shadow-glow"><Sparkles size={22} /></span>
              </div>
              <div className="text-sm">
                <p className="font-semibold">Pulse · glow</p>
                <p className="mt-1 text-xs text-white/50">Severity-scaled pulse, cyan glow on primary & AI.</p>
              </div>
            </div>
            <div className="panel p-6">
              <p className="mb-3 text-sm font-semibold">Iconography · lucide</p>
              <div className="flex flex-wrap gap-3 text-white/70">
                {[Boxes, Zap, ShieldCheck, Activity, Wrench, Leaf, Sparkles, ArrowUpRight].map((I, i) => (
                  <span key={i} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.03]"><I size={17} /></span>
                ))}
              </div>
              <p className="mt-3 text-xs text-white/45">1.75 stroke · semantic mapping via the Icon registry.</p>
            </div>
          </div>
        </Section>

        <p className="border-t border-white/10 pt-8 text-center text-xs text-white/35">
          SpareX Design System · powers SpareX FactoryOS™ and every SpareX product.
        </p>
      </main>
    </div>
  );
}
