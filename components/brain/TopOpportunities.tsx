"use client";

import { Sparkles, TrendingUp } from "lucide-react";
import { opportunities, totalOpportunity } from "@/lib/brain";
import { formatCompact } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { AskCopilot } from "@/components/os/AskCopilot";

export function TopOpportunities() {
  const { t } = useI18n();
  const max = Math.max(...opportunities.map((o) => o.saving));
  return (
    <div className="panel p-6">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-emerald-300" />
        <h3 className="font-semibold">{t("opp.title")}</h3>
        <span className="chip ml-auto border-status-ok/30 bg-status-ok/10 text-emerald-300">{t("opp.ai")}</span>
      </div>
      <p className="mt-1 text-xs text-white/45">{t("opp.sub")}</p>

      <ul className="mt-4 space-y-2.5">
        {opportunities.map((o, i) => (
          <li key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{t(`opp.${i}.name`)}</p>
              <p className="shrink-0 text-sm font-semibold tabular text-emerald-300">
                ฿{formatCompact(o.saving)}<span className="text-xs font-normal text-white/40">/yr</span>
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-brand-400" style={{ width: `${(o.saving / max) * 100}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-white/45">{t(`opp.${i}.detail`)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-status-ok/25 bg-status-ok/[0.07] p-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-300" />
          <span className="text-sm font-medium">{t("opp.total")}</span>
        </div>
        <span className="text-xl font-semibold tabular text-emerald-300">฿{formatCompact(totalOpportunity)}/yr</span>
      </div>

      <AskCopilot
        prompt="How much money can we save this month and where?"
        className="btn-ghost mt-3 w-full justify-center py-2 text-sm"
      >
        {t("opp.start")}
      </AskCopilot>
    </div>
  );
}
