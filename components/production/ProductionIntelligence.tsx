"use client";

import { Factory, Target, Coins, GitMerge, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTr } from "@/lib/autotranslate";
import { ModuleWorkspace, type WsGroup } from "@/components/os/ModuleWorkspace";
import * as V from "./views";

const ProductionCost = () => <V.GenericView id="costPerUnit" />;
const Bottlenecks = () => <V.GenericView id="bottleneck" />;

const VIEWS = {
  live: V.ExecutiveOverview,
  oee: V.OeeDashboard,
  cost: ProductionCost,
  bottleneck: Bottlenecks,
  aiopt: V.ProductionCopilot,
};

export function ProductionIntelligence() {
  const { t } = useI18n();
  const tr = useTr();
  const GROUPS: WsGroup[] = [
    {
      label: "",
      items: [
        { id: "live", icon: Factory, label: tr("Live Production") },
        { id: "oee", icon: Target, label: tr("OEE & Downtime") },
        { id: "cost", icon: Coins, label: tr("Production Cost") },
        { id: "bottleneck", icon: GitMerge, label: tr("Bottlenecks") },
        { id: "aiopt", icon: Sparkles, label: tr("AI Optimization") },
      ],
    },
  ];
  return <ModuleWorkspace groups={GROUPS} views={VIEWS} defaultId="live" title={t("nav.operations")} titleIcon={Factory} />;
}
