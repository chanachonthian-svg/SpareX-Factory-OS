"use client";

import { Sparkles, Download, FileText, Zap, Factory, Wrench, Leaf, Coins, Clock, CalendarDays, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/os/KpiCard";
import { AreaTrend, HBars } from "@/components/os/charts";
import { AskCopilot } from "@/components/os/AskCopilot";
import { useTr } from "@/lib/autotranslate";
import { oeeTrend, costPerUnit, series } from "@/lib/telemetry";

function Panel({ title, extra, children }: { title?: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="panel p-6">
      {title ? <div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-semibold">{title}</h3>{extra}</div> : null}
      {children}
    </div>
  );
}
const outputByLine = [
  { name: "Line A", value: 1240 },
  { name: "Line B", value: 585 },
  { name: "Line C", value: 1715 },
  { name: "Line D", value: 590 },
];

/* ----------------------------------------------------- executive dashboard */
export function ExecDashboardView() {
  const tr = useTr();
  const oee = oeeTrend();
  const cpu = costPerUnit();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={tr("Plant OEE")} value="74.2" unit="%" delta="+1.2pp" deltaGood accent="#34d399" spark={oee.slice(-16).map((d) => d.v)} />
        <KpiCard label={tr("Energy Cost")} value="฿1.27M" unit="/day" delta="3.4%" deltaGood={false} accent="#22d3ee" />
        <KpiCard label={tr("Asset Health")} value="84" unit="/100" deltaGood accent="#f472b6" />
        <KpiCard label={tr("Carbon")} value="404" unit="kg/h" delta="1.5%" deltaGood accent="#4ade80" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={tr("OEE · 30-day")}><AreaTrend data={oee} dataKey="v" color="#34d399" unit="%" /></Panel>
        <Panel title={tr("Energy cost / unit · 30-day")}><AreaTrend data={cpu} dataKey="cost" color="#22d3ee" unit="฿" /></Panel>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- kpi reports */
const KPIS = [
  { name: "OEE", value: "74.2%", trend: "+1.2pp", c: "#34d399" },
  { name: "Energy cost / unit", value: "฿11.84", trend: "-2.1%", c: "#22d3ee" },
  { name: "Unplanned downtime", value: "6.4 h", trend: "-12%", c: "#60a5fa" },
  { name: "Carbon intensity", value: "0.42 kg/u", trend: "-8%", c: "#4ade80" },
  { name: "MTBF", value: "412 h", trend: "+8%", c: "#818cf8" },
  { name: "First-pass yield", value: "98.8%", trend: "+0.4pp", c: "#f472b6" },
];
export function KpiReportsView() {
  const tr = useTr();
  return (
    <Panel title={tr("KPI reports")} extra={<AskCopilot prompt="Generate a KPI report pack" className="btn-ghost px-3 py-1.5 text-xs"><Sparkles size={13} /> {tr("Generate")}</AskCopilot>}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {KPIS.map((k) => (
          <div key={k.name} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-sm text-white/55">{tr(k.name)}</p>
            <div className="mt-1 flex items-end justify-between"><p className="text-2xl font-semibold tabular" style={{ color: k.c }}>{k.value}</p><span className="text-xs tabular text-emerald-300">{k.trend}</span></div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* --------------------------------------------------------------- trends */
export function TrendsView() {
  const tr = useTr();
  const oee = oeeTrend();
  const cpu = costPerUnit();
  const carbon = series(31, 30, { base: 420, amp: 18, trend: -40 }).map((v, i) => ({ t: `${i + 1}`, v: Math.round(v) }));
  return (
    <div className="space-y-6">
      <Panel title={tr("OEE trend · 30-day")}><AreaTrend data={oee} dataKey="v" color="#34d399" unit="%" height={220} /></Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={tr("Cost / unit trend")}><AreaTrend data={cpu} dataKey="cost" color="#22d3ee" unit="฿" height={200} /></Panel>
        <Panel title={tr("Carbon intensity trend")}><AreaTrend data={carbon} dataKey="v" color="#4ade80" height={200} /></Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- benchmark */
export function BenchmarkView() {
  const tr = useTr();
  return (
    <div className="space-y-6">
      <Panel title={tr("Output by line · vs target")}><HBars data={outputByLine} color="#34d399" /></Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={tr("OEE by line")}><HBars data={[{ name: "Line A", value: 78 }, { name: "Line B", value: 71 }, { name: "Line C", value: 82 }, { name: "Line D", value: 74 }]} color="#22d3ee" /></Panel>
        <Panel title={tr("Cost / unit by line")}><HBars data={[{ name: "Line A", value: 11.2 }, { name: "Line B", value: 13.4 }, { name: "Line C", value: 10.6 }, { name: "Line D", value: 12.1 }]} color="#818cf8" /></Panel>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- export */
const templates = [
  { icon: FileText, name: "Executive Briefing", accent: "#22d3ee", prompt: "Generate the executive briefing report" },
  { icon: Zap, name: "Energy & Cost", accent: "#818cf8", prompt: "Generate the energy & cost report" },
  { icon: Factory, name: "Production / OEE", accent: "#34d399", prompt: "Generate the production OEE report" },
  { icon: Wrench, name: "Maintenance", accent: "#60a5fa", prompt: "Generate the maintenance reliability report" },
  { icon: Leaf, name: "Carbon / ESG", accent: "#4ade80", prompt: "Generate the carbon ESG report" },
  { icon: Coins, name: "Financial Impact", accent: "#f59e0b", prompt: "Generate the financial impact report" },
];
const scheduled = [
  { name: "Daily Executive Summary", when: "Every day · 07:00", on: true },
  { name: "Weekly Energy Report", when: "Mondays · 08:00", on: true },
  { name: "Monthly ESG Report", when: "1st of month", on: true },
];
const recent = [
  { name: "Executive Briefing — June", date: "2026-06-24" },
  { name: "Energy & Cost — Week 25", date: "2026-06-23" },
  { name: "Maintenance — Week 25", date: "2026-06-23" },
];
export function ExportView() {
  const tr = useTr();
  return (
    <div className="space-y-6">
      <Panel title={tr("Generate & export")}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <div key={tpl.name} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl border" style={{ color: tpl.accent, borderColor: `${tpl.accent}44`, backgroundColor: `${tpl.accent}14` }}><tpl.icon size={18} /></span>
              <p className="mt-3 text-sm font-medium">{tr(tpl.name)}</p>
              <div className="mt-3 flex gap-2">
                <AskCopilot prompt={tpl.prompt} className="btn-glow px-3 py-1.5 text-xs"><Sparkles size={13} /> {tr("Generate")}</AskCopilot>
                <button className="btn border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white/75 hover:bg-white/10"><Download size={13} /> PDF</button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={tr("Scheduled")}>
          <ul className="space-y-2.5">
            {scheduled.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <div><p className="text-sm font-medium">{tr(s.name)}</p><p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/45"><CalendarDays size={12} /> {tr(s.when)}</p></div>
                <span className="chip border-status-ok/30 bg-status-ok/10 text-emerald-300">{tr("Active")}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={tr("Recent")}>
          <ul className="space-y-2">
            {recent.map((r) => (
              <li key={r.name} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <div><p className="truncate text-sm font-medium">{tr(r.name)}</p><p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/45"><Clock size={12} /> {r.date}</p></div>
                <button className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/55 hover:bg-white/5 hover:text-white" aria-label={tr("Download")}><Download size={15} /></button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
