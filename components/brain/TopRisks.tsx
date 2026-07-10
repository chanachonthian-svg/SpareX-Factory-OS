"use client";

import { ShieldAlert } from "lucide-react";
import { topRisks } from "@/lib/brain";
import { formatCompact } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { AskCopilot } from "@/components/os/AskCopilot";

function riskColor(r: number) {
  return r >= 80 ? "#f43f5e" : r >= 65 ? "#f59e0b" : "#22d3ee";
}

export function TopRisks() {
  const { t } = useI18n();
  const totalImpact = topRisks.reduce((s, r) => s + r.impact, 0);
  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-rose-300" />
          <h3 className="font-semibold">{t("risk.title")}</h3>
        </div>
        <span className="chip text-rose-200">฿{formatCompact(totalImpact)} {t("risk.exposure")}</span>
      </div>
      <p className="mt-1 text-xs text-white/45">{t("risk.ranked")}</p>

      <ul className="mt-4 space-y-3">
        {topRisks.map((r, i) => {
          const color = riskColor(r.risk);
          return (
            <li key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/5 text-xs font-semibold text-white/50">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium leading-tight">{t(`risk.${i}.name`)}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/50">{t(`risk.${i}.detail`)}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular" style={{ color }}>฿{formatCompact(r.impact)}</p>
                  <p className="text-[11px] text-white/40">{t("risk.impact")}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${r.risk}%`, backgroundColor: color }} />
                </div>
                <span className="w-14 shrink-0 text-right text-xs font-semibold tabular" style={{ color }}>{r.risk}%</span>
              </div>
            </li>
          );
        })}
      </ul>

      <AskCopilot
        prompt="Walk me through the top risks and how to mitigate each"
        className="btn-ghost mt-4 w-full justify-center py-2 text-sm"
      >
        {t("risk.mitigate")}
      </AskCopilot>
    </div>
  );
}
