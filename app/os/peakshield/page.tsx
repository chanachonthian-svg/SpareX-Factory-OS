import { Topbar } from "@/components/os/Topbar";
import { ModuleHeader } from "@/components/os/ModuleHeader";
import { KpiCard } from "@/components/os/KpiCard";
import { PeakBars, HBars } from "@/components/os/charts";
import { modules } from "@/lib/site";
import { peakForecast, series } from "@/lib/telemetry";
import { ShieldCheck, Zap, Clock } from "lucide-react";

export const metadata = { title: "PeakShield AI" };

const contributors = [
  { name: "Chiller B", value: 156 },
  { name: "Air Comp #2", value: 110 },
  { name: "Stamping Press 03", value: 132 },
  { name: "Injection Mold 08", value: 88 },
  { name: "Weld Robot 04", value: 56 },
];

export default function PeakShieldPage() {
  const m = modules.find((x) => x.id === "peakshield")!;
  const peaks = peakForecast();

  return (
    <>
      <Topbar title="PeakShield AI™" subtitle="Predict and prevent demand peaks" />
      <main className="space-y-6 p-5 lg:p-8">
        <ModuleHeader module={m} copilotPrompt="Predict next month's electricity bill" />

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Contract Demand" value="3,000" unit="kW" accent="#f59e0b" />
          <KpiCard label="Predicted Peak" value="3,120" unit="kW" delta="High risk" deltaGood={false} accent="#f43f5e" spark={series(31, 16, { base: 50, amp: 14 })} />
          <KpiCard label="Headroom" value="-120" unit="kW" delta="Shedding" deltaGood={false} accent="#f59e0b" spark={series(32, 16, { base: 50, amp: 8 })} />
          <KpiCard label="Penalties Avoided" value="฿4.5M" unit="/yr" delta="+฿180K mo" deltaGood accent="#34d399" spark={series(33, 16, { base: 40, amp: 6, trend: 8 })} />
        </section>

        {/* Auto-pilot banner */}
        <section className="panel relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-status-warn/20 blur-3xl" />
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-status-warn/40 bg-status-warn/10 text-amber-300">
              <ShieldCheck size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Automated Load Shedding</h3>
                <span className="chip border-status-ok/30 bg-status-ok/10 text-emerald-300">
                  Auto-Pilot ON
                </span>
              </div>
              <p className="mt-1 text-sm text-white/65">
                AI is delaying the startup of Chiller #3 and Air Comp #2 by 15 minutes to stay
                below the 3,000 kW peak limit. Projected demand-charge saving:{" "}
                <span className="font-semibold text-emerald-300">฿180,000</span> this month.
              </p>
            </div>
            <button className="btn-ghost px-4 py-2 text-sm">View shed schedule</button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="panel p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Peak demand · 6-mo history + 3-mo AI forecast</h3>
              <span className="chip text-rose-300">limit 3,000 kW</span>
            </div>
            <div className="mt-4">
              <PeakBars data={peaks} />
            </div>
            <div className="mt-3 flex gap-4 text-xs text-white/50">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-400" /> Actual</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent-400" /> AI forecast</span>
            </div>
          </div>

          <div className="panel p-6">
            <h3 className="font-semibold">Top peak contributors</h3>
            <p className="mt-1 text-xs text-white/45">kW at coincident peak</p>
            <div className="mt-4">
              <HBars data={contributors} color="#f59e0b" />
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Zap, title: "Peak forecasting", body: "ML predicts coincident peaks 30+ min ahead from load shape and schedule." },
            { icon: Clock, title: "Load shifting", body: "Non-critical loads auto-shift to off-peak windows with zero operator effort." },
            { icon: ShieldCheck, title: "Demand-charge guard", body: "Hard ceiling enforcement prevents costly contract-demand breaches." },
          ].map((c) => (
            <div key={c.title} className="panel p-5">
              <c.icon size={18} className="text-amber-300" />
              <p className="mt-3 font-semibold">{c.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">{c.body}</p>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
