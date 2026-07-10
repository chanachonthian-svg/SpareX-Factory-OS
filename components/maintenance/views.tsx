"use client";

import { useState } from "react";
import { Sparkles, ArrowUp, ArrowRight, Wrench, Package, AlertTriangle, ShoppingCart } from "lucide-react";
import { KpiCard } from "@/components/os/KpiCard";
import { HBars } from "@/components/os/charts";
import { AskCopilot } from "@/components/os/AskCopilot";
import { openCopilot, cn } from "@/lib/utils";
import { useTr } from "@/lib/autotranslate";
import { predictedFailures, STATUS_COLOR } from "@/lib/factory";
import { maintContent, maintLeafLabel, spareParts, sparePartStatus } from "@/lib/maintenance";

function Panel({ title, extra, children }: { title?: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="panel p-6">
      {title ? <div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-semibold">{title}</h3>{extra}</div> : null}
      {children}
    </div>
  );
}
function Ring({ value, color, children }: { value: number; color: string; children?: React.ReactNode }) {
  const size = 130, stroke = 10, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ filter: `drop-shadow(0 0 6px ${color}66)` }} /></svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------- generic leaf */
export function GenericView({ id }: { id: string }) {
  const cfg = maintContent(id);
  const title = maintLeafLabel(id);
  return (
    <div className="space-y-6">
      {cfg.kpis.length ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {cfg.kpis.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} unit={k.unit} delta={k.delta} deltaGood={k.good} accent={k.accent ?? "#60a5fa"} />)}
        </div>
      ) : null}
      <Panel title={title}>
        {cfg.viz.kind === "bars" ? <HBars data={cfg.viz.data} color="#60a5fa" /> : <p className="text-sm leading-relaxed text-white/55">{title} runs on the live maintenance model — work orders, asset history and predictive signals. Ask the Maintenance Copilot to generate this analysis.</p>}
      </Panel>
      <AskCopilot prompt={`Explain ${title} and recommend actions`} className="btn-ghost px-4 py-2.5 text-sm"><Sparkles size={14} /> Ask AI about {title} <ArrowRight size={14} /></AskCopilot>
    </div>
  );
}

/* ----------------------------------------------------------- health score */
export function MaintHealthScore() {
  const tr = useTr();
  const subs = [
    { label: "PM Compliance", v: 96, c: "#34d399" },
    { label: "Schedule Adherence", v: 88, c: "#22d3ee" },
    { label: "Parts Readiness", v: 82, c: "#f472b6" },
    { label: "Backlog Control", v: 74, c: "#f59e0b" },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <Panel>
        <div className="flex flex-col items-center text-center">
          <p className="text-[11px] uppercase tracking-wider text-white/45">{tr("Maintenance Health Score")}</p>
          <div className="mt-3"><Ring value={86} color="#60a5fa"><div><p className="text-4xl font-semibold tabular">86</p><p className="text-xs text-white/40">/ 100</p></div></Ring></div>
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

/* ----------------------------------------------------------- exec summary */
export function MaintExecSummary() {
  const tr = useTr();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={tr("Open Work Orders")} value={`${predictedFailures().length}`} accent="#60a5fa" />
        <KpiCard label="MTBF" value="412" unit="h" delta="+8%" deltaGood accent="#34d399" />
        <KpiCard label="MTTR" value="2.4" unit="h" delta="-12%" deltaGood accent="#22d3ee" />
        <KpiCard label={tr("Parts at Risk")} value="4" accent="#f43f5e" />
      </div>
      <div className="panel relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-status-warn/15 blur-3xl" />
        <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950"><Sparkles size={16} /></span><h3 className="font-semibold">{tr("AI Maintenance Summary")}</h3></div>
        <p className="mt-3 text-sm leading-relaxed text-white/70">{tr("One")} <span className="text-rose-300">P1</span> {tr("work order: Chiller B condenser clean (parts in stock).")} <span className="text-amber-300">{tr("Press main bearing")}</span> {tr("is out of stock with a 21-day lead — reorder now to cover the predicted failure in ~6 days. Wrench-time efficiency is up 3.2× after prescriptive scheduling.")}</p>
        <div className="mt-4 flex gap-2.5">
          <AskCopilot prompt="What should maintenance prioritize this week?" className="btn-glow px-4 py-2 text-sm"><Sparkles size={14} /> {tr("Prioritize this week")}</AskCopilot>
          <AskCopilot prompt="Which spare parts should we reorder now?" className="btn-ghost px-4 py-2 text-sm">{tr("Reorder check")}</AskCopilot>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- work orders */
function taskFor(t: string) {
  const s = t.toLowerCase();
  if (s.includes("chiller")) return "Condenser clean + refrigerant check";
  if (s.includes("press")) return "Main-bearing inspection & regrease";
  if (s.includes("compressor")) return "Air-end service + leak survey";
  if (s.includes("mold") || s.includes("imm")) return "Hydraulic temperature diagnostic";
  if (s.includes("cooling tower")) return "Fan-bearing & fill inspection";
  if (s.includes("paint")) return "Exhaust-filter replacement";
  if (s.includes("wastewater") || s.includes("blower")) return "Aeration blower service";
  return "Predictive inspection";
}
export function WorkOrdersView() {
  const tr = useTr();
  const wos = predictedFailures().map((a, i) => ({ id: `WO-${1042 + i}`, asset: a.name, status: a.status, task: taskFor(`${a.type} ${a.name}`), due: `${a.rulDays}d`, prio: a.status === "critical" ? "P1" : "P2", parts: i === 3 || i === 5 ? "1 on order" : "In stock" }));
  return (
    <Panel title={tr("Work orders")} extra={<span className="chip border-accent-500/30 bg-accent-500/10 text-accent-400">{tr("AI-scheduled")}</span>}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-white/40"><th className="px-2 py-3 font-medium">WO</th><th className="px-2 py-3 font-medium">{tr("Asset / Task")}</th><th className="px-2 py-3 font-medium">{tr("Priority")}</th><th className="px-2 py-3 font-medium">{tr("Parts")}</th><th className="px-2 py-3 font-medium text-right">{tr("Due")}</th></tr></thead>
          <tbody>
            {wos.map((w) => (
              <tr key={w.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-2 py-2.5 tabular text-white/70">{w.id}</td>
                <td className="px-2 py-2.5"><p className="flex items-center gap-2 font-medium"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[w.status] }} />{w.asset}</p><p className="text-xs text-white/45">{tr(w.task)}</p></td>
                <td className="px-2 py-2.5"><span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", w.prio === "P1" ? "bg-status-crit/15 text-rose-300" : "bg-status-warn/15 text-amber-300")}>{w.prio}</span></td>
                <td className="px-2 py-2.5 text-xs"><span className="flex items-center gap-1.5 text-white/60"><Package size={13} /> {tr(w.parts)}</span></td>
                <td className="px-2 py-2.5 text-right tabular text-white/70">{w.due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ----------------------------------------------------------- spare parts */
const STOCK_STYLE: Record<string, { cls: string; label: string }> = {
  out: { cls: "text-rose-300", label: "Out of stock" },
  low: { cls: "text-amber-300", label: "Below min" },
  ok: { cls: "text-emerald-300", label: "In stock" },
};
function SparesTable({ items }: { items: typeof spareParts }) {
  const tr = useTr();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-[11px] uppercase tracking-wider text-white/40"><th className="px-2 py-3 font-medium">{tr("Part")}</th><th className="px-2 py-3 font-medium">{tr("Stock")}</th><th className="px-2 py-3 font-medium">{tr("Min")}</th><th className="px-2 py-3 font-medium">{tr("Lead")}</th><th className="px-2 py-3 font-medium text-right">{tr("Status")}</th></tr></thead>
        <tbody>
          {items.map((p) => {
            const st = STOCK_STYLE[sparePartStatus(p)];
            return (
              <tr key={p.name} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-2 py-2.5"><p className="flex items-center gap-2 font-medium">{p.crit ? <AlertTriangle size={12} className="text-amber-300" /> : null}{p.name}</p></td>
                <td className="px-2 py-2.5 tabular text-white/70">{p.stock}</td>
                <td className="px-2 py-2.5 tabular text-white/50">{p.min}</td>
                <td className="px-2 py-2.5 text-white/50">{p.lead}</td>
                <td className={cn("px-2 py-2.5 text-right text-xs font-medium", st.cls)}>{tr(st.label)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
export function InventoryView() {
  const tr = useTr();
  return <Panel title={tr("Spare-parts inventory")} extra={<span className="chip">{spareParts.length} SKUs</span>}><SparesTable items={spareParts} /></Panel>;
}
export function CriticalSpareView() {
  const tr = useTr();
  const items = spareParts.filter((p) => p.crit || sparePartStatus(p) !== "ok");
  return <Panel title={tr("Critical spares")} extra={<span className="chip text-rose-200">{items.length} {tr("flagged")}</span>}><SparesTable items={items} /></Panel>;
}
export function ReorderView() {
  const tr = useTr();
  const reorder = spareParts.filter((p) => p.stock <= p.min);
  const total = reorder.length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard label={tr("Reorder Now")} value={`${total}`} unit="SKUs" accent="#f43f5e" />
        <KpiCard label={tr("Out of Stock")} value={`${spareParts.filter((p) => p.stock === 0).length}`} accent="#f59e0b" />
        <KpiCard label={tr("Est. PO Value")} value="฿420k" accent="#60a5fa" />
      </div>
      <Panel title={tr("AI reorder recommendation")} extra={<span className="chip border-accent-500/30 bg-accent-500/10 text-accent-400">{tr("auto-drafted")}</span>}>
        <ul className="space-y-2.5">
          {reorder.map((p) => (
            <li key={p.name} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><p className="flex items-center gap-2 text-sm font-medium">{p.crit ? <AlertTriangle size={13} className="text-amber-300" /> : null}{p.name}</p><p className="mt-0.5 text-xs text-white/50">{tr("Stock")} {p.stock} / {tr("min")} {p.min} · {tr("lead")} {p.lead}{p.crit ? ` · ${tr("covers a predicted failure")}` : ""}</p></div>
              <span className="text-sm font-semibold tabular text-emerald-300">{tr("Qty")} {Math.max(p.min * 2 - p.stock, p.min)}</span>
              <button className="btn-glow px-3 py-1.5 text-xs"><ShoppingCart size={13} /> {tr("Draft PO")}</button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ----------------------------------------------------------- copilot */
const PROMPTS = ["What should maintenance prioritize today?", "How do I troubleshoot the Chiller B fault?", "Show the SOP for bearing replacement", "Recommend a repair for Stamping Press 03", "Which spare parts should we reorder?"];
export function MaintCopilot() {
  const tr = useTr();
  const [input, setInput] = useState("");
  return (
    <Panel>
      <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950"><Sparkles size={18} /></span><div><h3 className="font-semibold">{tr("Maintenance Copilot")}</h3><p className="text-xs text-white/45">{tr("Troubleshoot, recall SOPs, and plan repairs — grounded in live data")}</p></div></div>
      <div className="mt-4 flex gap-2.5"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950"><Wrench size={13} /></span><div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-white/75">{tr("There's 1 P1 work order open and a spare part out of stock. Ask me to troubleshoot a fault, pull an SOP, or recommend a repair.")}</div></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{PROMPTS.map((p) => (<button key={p} onClick={() => openCopilot(p)} className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-left text-sm text-white/70 transition hover:border-brand-400/30 hover:bg-brand-400/5 hover:text-white">{tr(p)}</button>))}</div>
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 focus-within:border-brand-400/40">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { openCopilot(input); setInput(""); } }} placeholder={tr("Ask the Maintenance Copilot…")} className="flex-1 bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-white/35 focus:outline-none" />
        <button onClick={() => { if (input.trim()) { openCopilot(input); setInput(""); } }} disabled={!input.trim()} className={cn("grid h-8 w-8 place-items-center rounded-xl transition", input.trim() ? "bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950" : "bg-white/5 text-white/30")}><ArrowUp size={16} /></button>
      </div>
    </Panel>
  );
}
