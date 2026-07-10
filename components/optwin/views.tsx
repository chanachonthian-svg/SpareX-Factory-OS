"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, ArrowUp, Bot, Check, Pause, Play, ShieldCheck, Sparkles, Zap,
  Construction, Wrench,
} from "lucide-react";
import { DigitalTwin } from "@/components/twin/DigitalTwin";
import { ProcessFlow3D } from "@/components/optwin/ProcessFlow3D";
import { KpiCard } from "@/components/os/KpiCard";
import { HBars } from "@/components/os/charts";
import { AskCopilot } from "@/components/os/AskCopilot";
import { useTr } from "@/lib/autotranslate";
import { useI18n } from "@/lib/i18n";
import { formatTHB, formatCompact, openCopilot, cn } from "@/lib/utils";
import {
  assets, countByStatus, countByCategory, predictedFailures,
  STATUS_COLOR, STATUS_LABEL, CATEGORY_LABEL,
} from "@/lib/factory";
import { machineEnergy } from "@/lib/energy";
import { opportunities, totalOpportunity, topRisks } from "@/lib/brain";
import {
  twinInsights, twinActions, simDefaults, type TwinActionStatus,
} from "@/lib/optwin";

/* helpers */
function Panel({ title, extra, children }: { title?: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="panel p-6">
      {title ? (<div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-semibold">{title}</h3>{extra}</div>) : null}
      {children}
    </div>
  );
}
const avg = (arr: number[]) => Math.round(arr.reduce((s, n) => s + n, 0) / (arr.length || 1));

/** placeholder shown for sub-modules that are temporarily offline for maintenance */
export function UnderMaintenance({ feature }: { feature?: string }) {
  const tr = useTr();
  const { locale } = useI18n();
  const th = locale === "th";
  return (
    <Panel>
      <div className="flex flex-col items-center justify-center gap-5 px-6 py-20 text-center">
        <span className="relative grid h-16 w-16 place-items-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
          <Construction size={30} />
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400" />
        </span>
        <div>
          <h3 className="text-lg font-semibold">{feature ? `${tr(feature)} · ` : ""}{th ? "อยู่ระหว่างปรับปรุง" : "Under maintenance"}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/55">
            {th
              ? "ฟีเจอร์นี้กำลังพัฒนา/ปรับปรุง จะกลับมาให้ใช้งานเร็วๆ นี้ — ส่วนอื่นของดิจิทัลทวินยังใช้งานได้ตามปกติ"
              : "We're upgrading this view. It'll be back online shortly — the rest of the twin is fully available."}
          </p>
        </div>
        <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-300"><Wrench size={12} /> {th ? "ปิดปรับปรุงชั่วคราว" : "Temporarily unavailable"}</span>
      </div>
    </Panel>
  );
}

/* ----------------------------------------------------------- 1 overview */
export function FactoryOverviewView() {
  const tr = useTr();
  const c = countByStatus();
  const cat = countByCategory();
  const oee = avg(assets.map((a) => a.oee));
  const health = avg(assets.map((a) => a.health));
  const power = assets.reduce((s, a) => s + a.powerKw, 0);
  const co2 = Math.round(assets.reduce((s, a) => s + a.co2KgH, 0));
  const prodOee = avg(assets.filter((a) => a.category === "production").map((a) => a.oee));
  const facOee = avg(assets.filter((a) => a.category === "facility").map((a) => a.oee));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={tr("Plant OEE")} value={`${oee}`} unit="%" delta="+1.2pp" deltaGood accent="#34d399" />
        <KpiCard label={tr("Total Power")} value={power.toLocaleString()} unit="kW" accent="#22d3ee" />
        <KpiCard label={tr("Avg Health")} value={`${health}`} unit="/100" deltaGood accent="#f472b6" />
        <KpiCard label={tr("Carbon · Now")} value={`${co2}`} unit="kg/h" delta="1.5%" deltaGood accent="#4ade80" />
      </div>
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm">
        <span className="chip border-status-ok/30 bg-status-ok/10 text-emerald-300">{c.healthy} {tr("Healthy")}</span>
        <span className="chip border-status-warn/30 bg-status-warn/10 text-amber-300">{c.warning} {tr("Warning")}</span>
        <span className="chip border-status-crit/30 bg-status-crit/10 text-rose-300">{c.critical} {tr("Critical")}</span>
        <span className="ml-auto flex items-center gap-2 text-white/50"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" /> 20 {tr("assets streaming")}</span>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="panel p-5">
          <p className="text-sm font-semibold">{tr("Production Hall")}</p>
          <p className="mt-1 text-xs text-white/45">{cat.production} {tr("machines · avg OEE")} {prodOee}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-accent-500" style={{ width: `${prodOee}%` }} /></div>
        </div>
        <div className="panel p-5">
          <p className="text-sm font-semibold">{tr("Facility & Utility")}</p>
          <p className="mt-1 text-xs text-white/45">{cat.facility} {tr("machines · avg OEE")} {facOee}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-accent-400 to-brand-400" style={{ width: `${facOee}%` }} /></div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- 2 3D map */
export function MapView() {
  return <DigitalTwin height="h-[540px] sm:h-[660px]" />;
}

/* ----------------------------------------------------------- 3 production */
export function ProductionTwinView() {
  const tr = useTr();
  const prod = assets.filter((a) => a.category === "production");
  const lines = [...new Set(prod.map((a) => a.line))];
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {lines.map((ln) => {
          const items = prod.filter((a) => a.line === ln);
          const o = avg(items.map((a) => a.oee));
          return (
            <div key={ln} className="panel p-4">
              <p className="text-sm font-semibold">{ln}</p>
              <p className="mt-1 text-xs text-white/45">{items.length} {tr("assets")}</p>
              <p className="mt-2 text-2xl font-semibold tabular text-emerald-300">{o}%<span className="text-xs text-white/40"> OEE</span></p>
            </div>
          );
        })}
      </div>
      <Panel title={tr("Production assets")}>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {prod.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[a.status] }} />
                <div><p className="text-sm font-medium">{a.name}</p><p className="text-[11px] text-white/40">{a.line}</p></div>
              </div>
              <span className="tabular text-sm text-white/60">{a.oee}%</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ----------------------------------------------------------- 4 energy */
export function EnergyTwinView() {
  const tr = useTr();
  const prodKw = assets.filter((a) => a.category === "production").reduce((s, a) => s + a.powerKw, 0);
  const facKw = assets.filter((a) => a.category === "facility").reduce((s, a) => s + a.powerKw, 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard label={tr("Total Draw")} value={(prodKw + facKw).toLocaleString()} unit="kW" accent="#22d3ee" />
        <KpiCard label={tr("Production")} value={prodKw.toLocaleString()} unit="kW" accent="#34d399" />
        <KpiCard label={tr("Facility")} value={facKw.toLocaleString()} unit="kW" accent="#818cf8" />
      </div>
      <Panel title={tr("Energy by asset · live kW")}>
        <HBars data={machineEnergy.slice(0, 10).map((m) => ({ name: m.name, value: m.powerKw }))} color="#22d3ee" />
      </Panel>
    </div>
  );
}

/* ----------------------------------------------------------- 5 asset */
export function AssetTwinView() {
  const tr = useTr();
  const ranked = [...assets].sort((a, b) => a.health - b.health);
  return (
    <Panel title={tr("Asset health register")} extra={<span className="chip">{assets.length} {tr("assets")}</span>}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
            <th className="px-2 py-3 font-medium">{tr("Asset")}</th><th className="px-2 py-3 font-medium">{tr("Status")}</th><th className="px-2 py-3 font-medium">{tr("Health")}</th><th className="px-2 py-3 font-medium">{tr("Vib")}</th><th className="px-2 py-3 font-medium text-right">RUL</th>
          </tr></thead>
          <tbody>
            {ranked.map((a) => (
              <tr key={a.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-2 py-2.5"><p className="font-medium">{a.name}</p><p className="text-[11px] text-white/40">{a.type}</p></td>
                <td className="px-2 py-2.5"><span className="inline-flex items-center gap-1.5 text-xs" style={{ color: STATUS_COLOR[a.status] }}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[a.status] }} />{STATUS_LABEL[a.status]}</span></td>
                <td className="px-2 py-2.5"><div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: `${a.health}%`, backgroundColor: STATUS_COLOR[a.status] }} /></div><span className="tabular text-xs text-white/55">{a.health}</span></div></td>
                <td className="px-2 py-2.5 tabular text-white/60">{a.vibration}</td>
                <td className="px-2 py-2.5 text-right tabular">{a.rulDays !== null ? <span className="text-rose-300">~{a.rulDays}d</span> : <span className="text-white/35">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ----------------------------------------------------------- 6 utility */
export function UtilityTwinView() {
  const tr = useTr();
  const fac = assets.filter((a) => a.category === "facility");
  const facKw = fac.reduce((s, a) => s + a.powerKw, 0);
  const crit = fac.filter((a) => a.status !== "healthy").length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard label={tr("Utility Power")} value={facKw.toLocaleString()} unit="kW" accent="#818cf8" />
        <KpiCard label={tr("Utility Assets")} value={`${fac.length}`} accent="#22d3ee" />
        <KpiCard label={tr("Needs Attention")} value={`${crit}`} accent="#f59e0b" />
      </div>
      <Panel title={tr("Facility & Utility systems")}>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {fac.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[a.status] }} />
                <div><p className="text-sm font-medium">{a.name}</p><p className="text-[11px] text-white/40">{a.type}</p></div>
              </div>
              <span className="tabular text-sm text-white/60">{a.powerKw} kW</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ----------------------------------------------------------- 7 carbon */
export function CarbonTwinView() {
  const tr = useTr();
  const prodCo2 = assets.filter((a) => a.category === "production").reduce((s, a) => s + a.co2KgH, 0);
  const facCo2 = assets.filter((a) => a.category === "facility").reduce((s, a) => s + a.co2KgH, 0);
  const top = [...assets].filter((a) => a.co2KgH > 0).sort((a, b) => b.co2KgH - a.co2KgH).slice(0, 8);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard label={tr("Total CO₂")} value={`${prodCo2 + facCo2}`} unit="kg/h" delta="1.5%" deltaGood accent="#4ade80" />
        <KpiCard label={tr("Production")} value={`${prodCo2}`} unit="kg/h" accent="#34d399" />
        <KpiCard label={tr("Facility")} value={`${facCo2}`} unit="kg/h" accent="#818cf8" />
      </div>
      <Panel title={tr("Top carbon emitters · kg/h")}>
        <HBars data={top.map((a) => ({ name: a.name, value: a.co2KgH }))} color="#4ade80" />
      </Panel>
    </div>
  );
}

/* ----------------------------------------------------------- 8 financial */
export function FinancialTwinView() {
  const tr = useTr();
  const exposure = topRisks.reduce((s, r) => s + r.impact, 0);
  const topCost = [...machineEnergy].sort((a, b) => b.thbDay - a.thbDay).slice(0, 6);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard label={tr("Risk Exposure")} value={`฿${formatCompact(exposure)}`} accent="#f43f5e" />
        <KpiCard label={tr("Savings Found")} value={`฿${formatCompact(totalOpportunity)}`} unit="/yr" deltaGood accent="#34d399" />
        <KpiCard label={tr("Energy Cost")} value={formatTHB(1270290)} unit="/day" accent="#818cf8" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={tr("Value at risk · by issue")}>
          <ul className="space-y-2.5">
            {topRisks.map((r, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <span className="text-sm">{r.name}</span>
                <span className="tabular text-sm font-semibold text-rose-300">฿{formatCompact(r.impact)}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={tr("Daily energy cost · top assets")}>
          <HBars data={topCost.map((m) => ({ name: m.name, value: m.thbDay }))} color="#818cf8" />
        </Panel>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- 9 process flow */
export function ProcessFlowTwinView() {
  const tr = useTr();
  return (
    <Panel title={tr("Process & energy flow · Grid → Equipment")}>
      <ProcessFlow3D />
    </Panel>
  );
}

/* ----------------------------------------------------------- 10 heatmap */
const METRICS = [
  { id: "health", label: "Health" },
  { id: "energy", label: "Energy" },
  { id: "carbon", label: "Carbon" },
  { id: "risk", label: "Risk" },
] as const;
type Metric = (typeof METRICS)[number]["id"];
function heatColor(t: number) {
  // t 0..1 → green→amber→red
  if (t < 0.4) return "#34d399";
  if (t < 0.7) return "#f59e0b";
  return "#f43f5e";
}
export function HeatmapView() {
  const tr = useTr();
  const [metric, setMetric] = useState<Metric>("health");
  const maxKw = Math.max(...assets.map((a) => a.powerKw));
  const maxCo2 = Math.max(...assets.map((a) => a.co2KgH));
  function cell(a: (typeof assets)[number]) {
    if (metric === "health") return { t: 1 - a.health / 100, v: a.health };
    if (metric === "energy") return { t: a.powerKw / maxKw, v: a.powerKw };
    if (metric === "carbon") return { t: maxCo2 ? a.co2KgH / maxCo2 : 0, v: a.co2KgH };
    return { t: a.rulDays !== null ? 1 - Math.min(1, a.rulDays / 30) : 0.1, v: a.rulDays ?? 0 };
  }
  return (
    <Panel title={tr("Factory heatmap")} extra={
      <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
        {METRICS.map((m) => (
          <button key={m.id} onClick={() => setMetric(m.id)} className={cn("rounded-md px-2.5 py-1 text-xs", metric === m.id ? "bg-white/10 text-white" : "text-white/50 hover:text-white")}>{tr(m.label)}</button>
        ))}
      </div>
    }>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {assets.map((a) => {
          const { t, v } = cell(a);
          const color = heatColor(t);
          return (
            <div key={a.id} className="rounded-xl border p-3 text-center" style={{ borderColor: `${color}55`, backgroundColor: `${color}1f` }}>
              <p className="truncate text-[11px] font-medium text-white/80">{a.name}</p>
              <p className="mt-1 text-lg font-semibold tabular" style={{ color }}>{metric === "risk" && a.rulDays === null ? "—" : v}{metric === "energy" ? "kW" : metric === "carbon" ? "" : ""}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-3 text-[11px] text-white/50">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-status-ok" /> {tr("Good")}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-status-warn" /> {tr("Watch")}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-status-crit" /> {tr("Critical")}</span>
      </div>
    </Panel>
  );
}

/* ----------------------------------------------------------- 11 simulation */
function SimSlider({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (<div><label className="mb-1.5 flex items-center justify-between text-xs text-white/55">{label}<span className="tabular text-brand-300">{value}%</span></label><input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-cyan-400" /></div>);
}
export function SimulationView() {
  const tr = useTr();
  const [shift, setShift] = useState(simDefaults.offPeakShift);
  const [downtime, setDowntime] = useState(simDefaults.downtimeReduction);
  const [idle, setIdle] = useState(simDefaults.idleCut);
  const baseEnergy = 1270000;
  const save = Math.round(baseEnergy * 0.08 * (shift / 100) + 300000 * (downtime / 100) + 80000 * (idle / 100));
  const co2 = Math.round(290000 * (shift * 0.0006 + idle * 0.0009));
  const oee = ((downtime / 100) * 5).toFixed(1);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title={tr("What-if scenario")}>
        <div className="space-y-5">
          <SimSlider label={tr("Shift load to off-peak")} value={shift} onChange={setShift} />
          <SimSlider label={tr("Reduce unplanned downtime")} value={downtime} onChange={setDowntime} />
          <SimSlider label={tr("Cut idle waste")} value={idle} onChange={setIdle} />
        </div>
        <p className="mt-5 text-xs leading-relaxed text-white/45">{tr("The twin replays current telemetry through your scenario to project monthly impact.")}</p>
      </Panel>
      <Panel title={tr("Projected monthly impact")}>
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-status-ok/25 bg-status-ok/[0.07] p-4"><p className="text-[11px] uppercase tracking-wider text-white/45">{tr("Cost saving")}</p><p className="mt-1 text-3xl font-semibold tabular text-emerald-300">{formatTHB(save)}<span className="text-sm text-white/40">/mo</span></p></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-wider text-white/45">{tr("CO₂ avoided")}</p><p className="mt-1 text-xl font-semibold tabular text-brand-300">{(co2 / 1000).toFixed(1)} t/mo</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-wider text-white/45">{tr("OEE gain")}</p><p className="mt-1 text-xl font-semibold tabular text-emerald-300">+{oee} pts</p></div>
          </div>
        </div>
        <AskCopilot prompt="Build a rollout plan for the simulated scenario" className="btn-ghost mt-4 w-full justify-center py-2 text-sm">{tr("Ask AI to plan the rollout")}</AskCopilot>
      </Panel>
    </div>
  );
}

/* ----------------------------------------------------------- 12 AI insights */
export function AIInsightsView() {
  const tr = useTr();
  return (
    <Panel title={tr("AI insights · across the twin")}>
      <div className="grid gap-3 sm:grid-cols-2">
        {twinInsights.map((it) => (
          <div key={it.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950"><Sparkles size={13} /></span><span className="chip">{tr(it.tag)}</span></div>
            <p className="mt-2.5 text-sm font-medium">{tr(it.title)}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/55">{tr(it.detail)}</p>
          </div>
        ))}
      </div>
      <AskCopilot prompt="Summarize the most important things happening in the factory right now" className="btn-ghost mt-4 w-full justify-center py-2 text-sm">{tr("Ask the Copilot for the full picture")}</AskCopilot>
    </Panel>
  );
}

/* ----------------------------------------------------------- 13 action center */
const A_STYLE: Record<TwinActionStatus, { cls: string; dot: string; label: string }> = {
  active: { cls: "border-status-ok/30 bg-status-ok/10 text-emerald-300", dot: "bg-status-ok", label: "Running" },
  pending: { cls: "border-status-warn/30 bg-status-warn/10 text-amber-300", dot: "bg-status-warn", label: "Pending approval" },
  suggested: { cls: "border-white/15 bg-white/5 text-white/60", dot: "bg-white/40", label: "Suggested" },
};
export function ActionCenterView() {
  const tr = useTr();
  const [actions, setActions] = useState(twinActions);
  const set = (id: string, status: TwinActionStatus) => setActions((p) => p.map((a) => (a.id === id ? { ...a, status } : a)));
  const running = actions.filter((a) => a.status === "active").length;
  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950"><Bot size={18} /></span>
        <div><h3 className="font-semibold">{tr("Action Center")}</h3><p className="text-xs text-white/45">{tr("Cross-domain actions the AI can run — with approval")}</p></div>
        <span className="chip ml-auto border-status-ok/30 bg-status-ok/10 text-emerald-300">{running} {tr("running")}</span>
      </div>
      <ul className="mt-5 space-y-2.5">
        {actions.map((a) => {
          const m = A_STYLE[a.status];
          return (
            <li key={a.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{tr(a.name)}</p>
                  <span className="chip text-[10px]">{tr(a.domain)}</span>
                  <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium", m.cls)}><span className={cn("h-1.5 w-1.5 rounded-full", m.dot, a.status === "active" && "animate-pulse")} />{tr(m.label)}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-white/55">{tr(a.desc)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-semibold tabular text-emerald-300">{a.impact}</span>
                {a.status === "active" ? (
                  <button onClick={() => set(a.id, "pending")} className="btn border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"><Pause size={13} /> {tr("Pause")}</button>
                ) : (
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => set(a.id, "active")} className="btn-glow px-3 py-1.5 text-xs">{a.status === "pending" ? <Check size={13} /> : <Play size={13} />}{a.status === "pending" ? tr("Approve") : tr("Enable")}</motion.button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 flex items-center gap-2 text-[11px] text-white/40"><ShieldCheck size={13} /> {tr("Guardrailed with a full audit trail. Critical actions always need approval.")}</p>
    </Panel>
  );
}

/* ----------------------------------------------------------- 14 copilot */
const PROMPTS = ["What's happening in the factory right now?", "Which asset needs attention first?", "Simulate shifting Line B to off-peak", "Show today's biggest financial risk"];
export function TwinCopilotView() {
  const tr = useTr();
  const [input, setInput] = useState("");
  return (
    <Panel>
      <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950"><Sparkles size={18} /></span><div><h3 className="font-semibold">{tr("Factory Copilot")}</h3><p className="text-xs text-white/45">{tr("Ask the twin anything — grounded in live data")}</p></div></div>
      <div className="mt-4 flex gap-2.5"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950"><Zap size={13} /></span><div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-white/75">{tr("I have the whole plant modeled — production, energy, assets, carbon and finance. Ask me to explain, simulate, or recommend.")}</div></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {PROMPTS.map((p) => (<button key={p} onClick={() => openCopilot(p)} className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-left text-sm text-white/70 transition hover:border-brand-400/30 hover:bg-brand-400/5 hover:text-white">{tr(p)}</button>))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 focus-within:border-brand-400/40">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { openCopilot(input); setInput(""); } }} placeholder={tr("Ask the Factory Copilot…")} className="flex-1 bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-white/35 focus:outline-none" />
        <button onClick={() => { if (input.trim()) { openCopilot(input); setInput(""); } }} disabled={!input.trim()} className={cn("grid h-8 w-8 place-items-center rounded-xl transition", input.trim() ? "bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950" : "bg-white/5 text-white/30")}><ArrowUp size={16} /></button>
      </div>
    </Panel>
  );
}
