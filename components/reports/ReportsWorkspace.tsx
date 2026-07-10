"use client";

import { LayoutDashboard, ListChecks, TrendingUp, BarChart3, Download, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTr } from "@/lib/autotranslate";
import { ModuleWorkspace, type WsGroup } from "@/components/os/ModuleWorkspace";
import * as V from "./views";

const GROUPS: WsGroup[] = [
  {
    label: "",
    items: [
      { id: "execDash", icon: LayoutDashboard, label: "Executive Dashboard" },
      { id: "kpi", icon: ListChecks, label: "KPI Reports" },
      { id: "trends", icon: TrendingUp, label: "Trends" },
      { id: "benchmark", icon: BarChart3, label: "Benchmark" },
      { id: "export", icon: Download, label: "Export" },
    ],
  },
];

const VIEWS = {
  execDash: V.ExecDashboardView,
  kpi: V.KpiReportsView,
  trends: V.TrendsView,
  benchmark: V.BenchmarkView,
  export: V.ExportView,
};

export function ReportsWorkspace() {
  const { t } = useI18n();
  const tr = useTr();
  const groups: WsGroup[] = GROUPS.map((g) => ({ ...g, items: g.items.map((it) => ({ ...it, label: tr(it.label) })) }));
  return <ModuleWorkspace groups={groups} views={VIEWS} defaultId="execDash" title={t("nav.reports")} titleIcon={FileText} />;
}
