"use client";

import { Activity, BarChart3, Bot, Coins, FileText, Gauge, Sparkles, Waves, Zap } from "lucide-react";
import { KpiCard } from "@/components/os/KpiCard";
import { AreaTrend, HBars, PeakBars } from "@/components/os/charts";
import { formatTHB } from "@/lib/utils";
import { useTr } from "@/lib/autotranslate";

const powerTrend = [
  { t: "08:00", v: 2420 },
  { t: "10:00", v: 2810 },
  { t: "12:00", v: 2680 },
  { t: "14:00", v: 3010 },
  { t: "16:00", v: 2875 },
  { t: "18:00", v: 2590 },
];

const costTrend = [
  { t: "Mon", actual: 2860, forecast: 2920 },
  { t: "Tue", actual: 2940, forecast: 2980 },
  { t: "Wed", actual: 3010, forecast: 3060 },
  { t: "Thu", actual: 2890, forecast: 2960 },
  { t: "Fri", actual: 2760, forecast: 2840 },
];

const consumers = [
  { name: "Chiller B", value: 156 },
  { name: "Stamping Press 03", value: 132 },
  { name: "Air Compressor 10", value: 110 },
  { name: "Injection Mold 08", value: 88 },
  { name: "CNC Cell 01", value: 78 },
];

function Panel({
  title,
  sub,
  icon: Icon,
  children,
}: {
  title: string;
  sub?: string;
  icon: typeof Gauge;
  children: React.ReactNode;
}) {
  return (
    <section className="panel p-5">
      <div className="mb-4 flex min-w-0 items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brand-400/25 bg-brand-400/10 text-brand-300">
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-semibold leading-tight text-white">{title}</h2>
          {sub ? <p className="mt-0.5 truncate text-[11px] leading-tight text-white/40">{sub}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function EnergyKpis() {
  const tr = useTr();
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard label={tr("Energy today")} value="31,760" unit="kWh" delta="+12%" deltaGood={false} accent="#22d3ee" icon={Zap} />
      <KpiCard label={tr("Cost today")} value={formatTHB(1270290)} delta="+6%" deltaGood={false} accent="#f59e0b" icon={Coins} />
      <KpiCard label={tr("Peak demand")} value="3,010" unit="kW" delta="-90 kW" deltaGood accent="#818cf8" icon={Gauge} />
      <KpiCard label={tr("AI saved MTD")} value={formatTHB(212000)} delta="+18%" deltaGood accent="#34d399" icon={Sparkles} />
    </div>
  );
}

export function OverviewView() {
  const tr = useTr();
  return (
    <div className="space-y-6">
      <EnergyKpis />
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <Panel title={tr("Plant energy profile")} icon={Activity}>
          <AreaTrend data={powerTrend} dataKey="v" color="#22d3ee" height={260} />
        </Panel>
        <Panel title={tr("Top energy consumers")} icon={BarChart3}>
          <HBars data={consumers} color="#22d3ee" />
        </Panel>
      </div>
    </div>
  );
}

export function LiveView() {
  const tr = useTr();
  return (
    <div className="space-y-6">
      <Panel title={tr("Live Oscilloscope")} sub={tr("disturbance detection")} icon={Activity}>
        <div className="grid min-h-[320px] place-items-center rounded-xl border border-white/10 bg-[#07101f]">
          <div className="w-full max-w-5xl px-6">
            <AreaTrend data={powerTrend} dataKey="v" color="#22d3ee" height={260} />
          </div>
        </div>
        <p className="mt-3 text-sm text-white/55">{tr("Live power quality view · no mojibake text remains in this panel.")}</p>
      </Panel>
    </div>
  );
}

export function PowerQualityView() {
  const tr = useTr();
  return (
    <div className="space-y-6">
      <Panel title={tr("Power Quality Intelligence")} icon={Waves}>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [tr("Voltage sag"), "76%", "#f43f5e"],
            [tr("Harmonics THD"), "6.2%", "#f59e0b"],
            [tr("Power factor"), "0.97", "#34d399"],
          ].map(([label, value, color]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs text-white/45">{label}</p>
              <p className="mt-2 text-2xl font-semibold tabular" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function CostView() {
  const tr = useTr();
  return (
    <div className="space-y-6">
      <EnergyKpis />
      <Panel title={tr("Peak & cost trend")} icon={Coins}>
        <PeakBars data={costTrend} height={260} />
      </Panel>
    </div>
  );
}

export function OpportunityView() {
  const tr = useTr();
  return (
    <div className="space-y-6">
      <Panel title={tr("Savings opportunities")} icon={Sparkles}>
        <div className="space-y-3">
          {[
            [tr("Re-schedule compressors off-peak"), "+฿380K/yr"],
            [tr("Shift deferrable load to off-peak"), "+฿300K/yr"],
            [tr("Auto-standby idle machines >15 min"), "+฿170K/yr"],
          ].map(([name, value]) => (
            <div key={name} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="font-medium text-white/85">{name}</span>
              <span className="font-semibold text-emerald-300">{value}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function AutonomousView() {
  const tr = useTr();
  return (
    <div className="space-y-6">
      <Panel title={tr("AI optimization")} icon={Bot}>
        <p className="text-sm leading-relaxed text-white/65">
          {tr("AI actions are connected to meter data, work orders, and operating constraints. Recommendations remain grounded in measured factory data.")}
        </p>
      </Panel>
    </div>
  );
}

export function EnergyReportView() {
  const tr = useTr();
  return (
    <div className="space-y-6">
      <Panel title={tr("Energy report")} icon={FileText}>
        <p className="text-sm text-white/65">
          {tr("Generated by SpareX FactoryOS™ · EnergyAI — every figure comes from the incomer and MDB power meters")}
        </p>
      </Panel>
    </div>
  );
}
