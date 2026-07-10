import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import { Sparkline } from "@/components/ui/Sparkline";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  unit,
  delta,
  deltaGood,
  spark,
  accent = "#22d3ee",
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaGood?: boolean;
  spark?: number[];
  accent?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="panel group relative overflow-hidden p-4">
      <div
        className="kpi-halo pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-20 blur-2xl transition group-hover:opacity-30"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? (
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border"
              style={{ color: accent, borderColor: `${accent}44`, backgroundColor: `${accent}14` }}
            >
              <Icon size={14} />
            </span>
          ) : null}
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-white/45">
            {label}
          </p>
        </div>
        {delta ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              deltaGood
                ? "bg-status-ok/15 text-emerald-300"
                : "bg-status-crit/15 text-rose-300",
            )}
          >
            {deltaGood ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {delta}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular">
        {value}
        {unit ? <span className="ml-1 text-sm font-normal text-white/45">{unit}</span> : null}
      </p>
      {spark ? (
        <div className="mt-3">
          <Sparkline data={spark} color={accent} width={220} height={34} />
        </div>
      ) : null}
    </div>
  );
}
