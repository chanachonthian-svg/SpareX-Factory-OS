"use client";

import { Gauge, Activity, Waves, Coins, Sparkles, Bot, Zap, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { ModuleWorkspace, type WsGroup } from "@/components/os/ModuleWorkspace";
import { useIsAiOn } from "@/lib/aimode";
import * as V from "./views";

const GROUPS: WsGroup[] = [
  {
    label: "",
    items: [
      { id: "overview", icon: Gauge, label: "Energy Overview" },
      { id: "live", icon: Activity, label: "Live Monitoring" },
      { id: "pq", icon: Waves, label: "Power Quality Intelligence" },
      { id: "peakcost", icon: Coins, label: "Peak & Cost" },
      { id: "savings", icon: Sparkles, label: "Savings" },
      { id: "aiopt", icon: Bot, label: "AI Optimization" },
      { id: "report", icon: FileText, label: "Report" },
    ],
  },
];

const VIEWS = {
  overview: V.OverviewView,
  live: V.LiveView,
  pq: V.PowerQualityView,
  peakcost: V.CostView,
  savings: V.OpportunityView,
  aiopt: V.AutonomousView,
  report: V.EnergyReportView,
};

export function EnergyIntelligence() {
  const { t } = useI18n();
  const aiOn = useIsAiOn();
  return (
    <ModuleWorkspace
      groups={GROUPS}
      views={VIEWS}
      defaultId="overview"
      title={t("nav.energy")}
      titleIcon={Zap}
      lockedIds={aiOn ? [] : ["aiopt"]}
    />
  );
}
