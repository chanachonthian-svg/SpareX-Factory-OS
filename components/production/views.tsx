"use client";

import { useState } from "react";
import { Sparkles, Zap, ArrowUp, ArrowRight, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/os/KpiCard";
import { HBars, AreaTrend } from "@/components/os/charts";
import { AskCopilot } from "@/components/os/AskCopilot";
import { openCopilot, formatTHB, cn } from "@/lib/utils";
import { oeeTrend } from "@/lib/telemetry";
import { prodContent, leafLabel, outputByLine } from "@/lib/production";
import { useTr } from "@/lib/autotranslate";

/* helpers */
function Panel({ title, extra, children }: { title?: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="panel p-6">
      {title ? <div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-semibold">{title}</h3>{extra}</div> : null}
      {children}
    </div>
  );
}
function Ring({ value, size = 120, stroke = 9, color, children }: { value: number; size?: number; stroke?: number; color: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ filter: `drop-shadow(0 0 6px ${color}66)` }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------- generic leaf */
export function GenericView({ id }: { id: string }) {
  const tr = useTr();
  const cfg = prodContent(id);
  const title = tr(leafLabel(id));
  return (
    <div className="space-y-6">
      {cfg.kpis.length ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cfg.kpis.map((k) => (
            <KpiCard key={k.label} label={tr(k.label)} value={k.value} unit={k.unit} delta={k.delta} deltaGood={k.good} accent={k.accent ?? "#34d399"} />
          ))}
        </div>
      ) : null}
      <Panel title={title}>
        {cfg.viz.kind === "bars" ? (
          <HBars data={cfg.viz.data} color="#34d399" />
        ) : cfg.viz.kind === "area" ? (
          <AreaTrend data={cfg.viz.data} dataKey="v" color="#34d399" unit="%" />
        ) : (
          <p className="text-sm leading-relaxed text-white/55">
            {title} {tr("runs on the live production model — combining OEE, downtime, cost and profit signals. Ask the Production Copilot to generate this analysis or take action.")}
          </p>
        )}
      </Panel>
      <AskCopilot prompt={`Explain ${title} and recommend actions`} className="btn-ghost px-4 py-2.5 text-sm">
        <Sparkles size={14} /> {tr("Ask AI about")} {title} <ArrowRight size={14} />
      </AskCopilot>
    </div>
  );
}

/* ----------------------------------------------------------- exec overview */
export function ExecutiveOverview() {
  const tr = useTr();
  const oee = oeeTrend();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={tr("Plant OEE")} value="74.2" unit="%" delta="+1.2pp" deltaGood accent="#34d399" spark={oee.slice(-16).map((d) => d.v)} />
        <KpiCard label={tr("Output · Today")} value="4,090" unit="u" delta="+2%" deltaGood accent="#22d3ee" />
        <KpiCard label={tr("Cost / Unit")} value="฿11.84" delta="2.1%" deltaGood accent="#818cf8" />
        <KpiCard label={tr("Profit · Today")} value="฿1.5M" delta="+3%" deltaGood accent="#4ade80" />
      </div>
      <div className="panel relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-status-ok/15 blur-3xl" />
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950"><Sparkles size={16} /></span>
          <h3 className="font-semibold">{tr("AI Production Summary")}</h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          {tr("Output is")} <span className="text-emerald-300">+2%</span> {tr("vs. plan. Line C is exceeding target;")}
          <span className="text-amber-300"> Line B</span> {tr("is dragging plant OEE on changeover losses (~฿15k/day). Cutting Line B changeover recovers ~4 OEE points.")}
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={tr("OEE · 30-day trend")} extra={<span className="chip text-emerald-300">+38% YoY</span>}>
          <AreaTrend data={oee} dataKey="v" color="#34d399" unit="%" height={240} />
        </Panel>
        <Panel title={tr("Output by line · today")}>
          <HBars data={outputByLine} color="#34d399" />
        </Panel>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- OEE dashboard */
export function OeeDashboard() {
  const tr = useTr();
  const oee = oeeTrend();
  const rings = [
    { label: "OEE", v: 74.2, c: "#34d399" },
    { label: "Availability", v: 82.5, c: "#22d3ee" },
    { label: "Performance", v: 91.0, c: "#818cf8" },
    { label: "Quality", v: 98.8, c: "#f472b6" },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {rings.map((r) => (
          <div key={r.label} className="panel flex flex-col items-center p-5">
            <Ring value={r.v} size={104} color={r.c}><div><p className="text-xl font-semibold tabular">{r.v}</p><p className="text-[10px] text-white/40">%</p></div></Ring>
            <p className="mt-2 text-sm font-medium">{tr(r.label)}</p>
          </div>
        ))}
      </div>
      <Panel title={tr("OEE composition · 30-day")} extra={<span className="chip">A × P × Q</span>}>
        <AreaTrend data={oee} dataKey="v" color="#34d399" unit="%" height={260} />
      </Panel>
    </div>
  );
}

/* ----------------------------------------------------------- health score */
export function HealthScore() {
  const tr = useTr();
  const subs = [
    { label: "Schedule Adherence", v: 88, c: "#22d3ee" },
    { label: "Quality", v: 96, c: "#f472b6" },
    { label: "Uptime", v: 82, c: "#34d399" },
    { label: "Cost Control", v: 79, c: "#818cf8" },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <Panel>
        <div className="flex flex-col items-center text-center">
          <p className="text-[11px] uppercase tracking-wider text-white/45">{tr("Production Health Score")}</p>
          <div className="mt-3"><Ring value={85} color="#34d399"><div><p className="text-4xl font-semibold tabular">85</p><p className="text-xs text-white/40">/ 100</p></div></Ring></div>
          <span className="mt-3 chip border-status-ok/30 bg-status-ok/10 text-emerald-300">{tr("Healthy")}</span>
        </div>
      </Panel>
      <div className="grid gap-4 sm:grid-cols-2">
        {subs.map((s) => (
          <div key={s.label} className="panel p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-medium">{tr(s.label)}</p><span className="text-lg font-semibold tabular" style={{ color: s.c }}>{s.v}</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: `${s.v}%`, background: s.c }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- what-if sim */
function Slider({ label, value, onChange, max = 100, unit = "%" }: { label: string; value: number; onChange: (n: number) => void; max?: number; unit?: string }) {
  return (<div><label className="mb-1.5 flex items-center justify-between text-xs text-white/55">{label}<span className="tabular text-brand-300">{value}{unit}</span></label><input type="range" min={0} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-emerald-400" /></div>);
}
export function WhatIfSim() {
  const tr = useTr();
  const [changeover, setChangeover] = useState(40);
  const [scrap, setScrap] = useState(30);
  const [shift, setShift] = useState(0);
  const oeeGain = (changeover * 0.05 + scrap * 0.02).toFixed(1);
  const extraOutput = Math.round(changeover * 6 + shift * 18);
  const profitGain = Math.round(changeover * 5200 + scrap * 3100 + shift * 9000);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title={tr("What-if scenario")}>
        <div className="space-y-5">
          <Slider label={tr("Cut Line B changeover")} value={changeover} onChange={setChangeover} />
          <Slider label={tr("Reduce scrap")} value={scrap} onChange={setScrap} />
          <Slider label={tr("Add overtime shift")} value={shift} onChange={setShift} />
        </div>
        <p className="mt-5 text-xs leading-relaxed text-white/45">{tr("The simulator replays today's production model through your scenario.")}</p>
      </Panel>
      <Panel title={tr("Projected impact")}>
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-status-ok/25 bg-status-ok/[0.07] p-4"><p className="text-[11px] uppercase tracking-wider text-white/45">{tr("Profit gain · monthly")}</p><p className="mt-1 text-3xl font-semibold tabular text-emerald-300">{formatTHB(profitGain * 30)}</p></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-wider text-white/45">{tr("OEE gain")}</p><p className="mt-1 text-xl font-semibold tabular text-brand-300">+{oeeGain} pts</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-wider text-white/45">{tr("Extra output")}</p><p className="mt-1 text-xl font-semibold tabular text-emerald-300">+{extraOutput} u/day</p></div>
          </div>
        </div>
        <AskCopilot prompt="Build a rollout plan for the simulated production scenario" className="btn-ghost mt-4 w-full justify-center py-2 text-sm">{tr("Ask AI to plan the rollout")}</AskCopilot>
      </Panel>
    </div>
  );
}

/* ----------------------------------------------------------- prod copilot */
const PROMPTS = ["Explain today's OEE loss", "Explain the biggest downtime event", "Explain the scrap rate", "Where is the bottleneck?", "Recommend actions to lift output"];
export function ProductionCopilot() {
  const tr = useTr();
  const [input, setInput] = useState("");
  return (
    <Panel>
      <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950"><Sparkles size={18} /></span><div><h3 className="font-semibold">{tr("Production Copilot")}</h3><p className="text-xs text-white/45">{tr("Ask anything about production — grounded in live data")}</p></div></div>
      <div className="mt-4 flex gap-2.5"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950"><TrendingUp size={13} /></span><div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-white/75">{tr("Output is +2% vs plan, but Line B changeover is dragging OEE. Ask me to explain a loss, find the bottleneck, or recommend actions.")}</div></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {PROMPTS.map((p) => (<button key={p} onClick={() => openCopilot(p)} className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-left text-sm text-white/70 transition hover:border-brand-400/30 hover:bg-brand-400/5 hover:text-white">{tr(p)}</button>))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 focus-within:border-brand-400/40">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { openCopilot(input); setInput(""); } }} placeholder={tr("Ask the Production Copilot…")} className="flex-1 bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-white/35 focus:outline-none" />
        <button onClick={() => { if (input.trim()) { openCopilot(input); setInput(""); } }} disabled={!input.trim()} className={cn("grid h-8 w-8 place-items-center rounded-xl transition", input.trim() ? "bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950" : "bg-white/5 text-white/30")}><ArrowUp size={16} /></button>
      </div>
    </Panel>
  );
}
