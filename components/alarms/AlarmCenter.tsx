"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BellRing, Check, CheckCheck, Siren } from "lucide-react";
import { KpiCard } from "@/components/os/KpiCard";
import { AskCopilot } from "@/components/os/AskCopilot";
import { cn } from "@/lib/utils";
import { useTr } from "@/lib/autotranslate";

type Severity = "critical" | "warning" | "info";
type Alarm = {
  id: string;
  at: string;
  severity: Severity;
  asset: string;
  message: string;
  acked: boolean;
};

const SEV: Record<Severity, { label: string; color: string; cls: string }> = {
  critical: { label: "Critical", color: "#f43f5e", cls: "border-status-crit/30 bg-status-crit/10 text-rose-300" },
  warning: { label: "Warning", color: "#f59e0b", cls: "border-status-warn/30 bg-status-warn/10 text-amber-300" },
  info: { label: "Info", color: "#22d3ee", cls: "border-brand-400/30 bg-brand-400/10 text-brand-300" },
};

const INITIAL: Alarm[] = [
  { id: "AL-1042", at: "10:52", severity: "critical", asset: "Chiller B", message: "Condenser fouling — vibration 5.8 mm/s over alarm limit. Failure predicted in ~3 days.", acked: false },
  { id: "AL-1041", at: "10:47", severity: "warning", asset: "PeakShield AI", message: "Predicted peak 3,120 kW vs 3,000 kW contract — auto load-shed armed.", acked: false },
  { id: "AL-1040", at: "10:31", severity: "warning", asset: "VisionIQ · V-C2", message: "Paint-finish defect rate trending up on Line C (97.9% station accuracy).", acked: false },
  { id: "AL-1039", at: "09:58", severity: "warning", asset: "Air Compressor 10", message: "Night base-load 20% above target — possible ring-main leak.", acked: true },
  { id: "AL-1038", at: "09:12", severity: "critical", asset: "Weld Robot 04", message: "Weld porosity rejected at V-B2 — quality hold on batch 218.", acked: true },
  { id: "AL-1037", at: "08:40", severity: "info", asset: "Stamping Press 03", message: "Main-bearing service window scheduled in 6 days (WO-1043).", acked: true },
  { id: "AL-1036", at: "07:55", severity: "info", asset: "EnergyAI", message: "Off-peak pre-cooling completed — ฿4,100 saved vs. on-peak baseline.", acked: true },
];

export function AlarmCenter() {
  const tr = useTr();
  const [alarms, setAlarms] = useState(INITIAL);
  const [filter, setFilter] = useState<"all" | Severity>("all");

  const ack = (id: string) => setAlarms((p) => p.map((a) => (a.id === id ? { ...a, acked: true } : a)));
  const ackAll = () => setAlarms((p) => p.map((a) => ({ ...a, acked: true })));

  const active = alarms.filter((a) => !a.acked);
  const shown = alarms.filter((a) => filter === "all" || a.severity === filter);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={tr("Active Alarms")} value={`${active.length}`} accent="#f59e0b" />
        <KpiCard label={tr("Critical")} value={`${active.filter((a) => a.severity === "critical").length}`} accent="#f43f5e" />
        <KpiCard label={tr("Acknowledged · Today")} value={`${alarms.filter((a) => a.acked).length}`} accent="#34d399" />
        <KpiCard label={tr("Mean Time to Ack")} value="4" unit="min" delta="-32%" deltaGood accent="#22d3ee" />
      </section>

      <section className="panel overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 p-5">
          <BellRing size={18} className="text-amber-300" />
          <div>
            <h3 className="font-semibold">{tr("Alarm stream")}</h3>
            <p className="mt-0.5 text-xs text-white/45">{tr("Cross-module events · AI-prioritized")}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {(["all", "critical", "warning", "info"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize transition",
                  filter === f ? "border-brand-400/40 bg-brand-400/15 text-brand-200" : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80",
                )}
              >
                {tr(f)}
              </button>
            ))}
            <button onClick={ackAll} className="btn-ghost ml-2 px-3 py-1.5 text-xs">
              <CheckCheck size={13} /> {tr("Ack all")}
            </button>
          </div>
        </div>

        <ul className="divide-y divide-white/5">
          {shown.map((a) => {
            const sev = SEV[a.severity];
            return (
              <li key={a.id} className={cn("flex items-start gap-3 px-5 py-3.5 transition", !a.acked && "bg-white/[0.015]")}>
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border" style={{ color: sev.color, borderColor: `${sev.color}44`, backgroundColor: `${sev.color}14` }}>
                  {a.severity === "critical" ? <Siren size={15} /> : <BellRing size={15} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{a.asset}</p>
                    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium", sev.cls)}>{tr(sev.label)}</span>
                    <span className="font-mono text-[10px] text-white/30">{a.id} · {a.at}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">{tr(a.message)}</p>
                </div>
                <div className="shrink-0">
                  {a.acked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300/80">
                      <Check size={13} /> {tr("Acked")}
                    </span>
                  ) : (
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => ack(a.id)} className="btn-glow px-3 py-1.5 text-xs">
                      <Check size={13} /> {tr("Acknowledge")}
                    </motion.button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <AskCopilot prompt={tr("Summarize today's alarms and what to do first")} className="btn-ghost px-4 py-2.5 text-sm">
        {tr("Ask AI to triage the alarm queue")}
      </AskCopilot>
    </div>
  );
}
