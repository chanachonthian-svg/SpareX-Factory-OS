"use client";

import { ClipboardList, CalendarCheck, Package, Activity, Sparkles, Wrench } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTr } from "@/lib/autotranslate";
import { ModuleWorkspace, type WsGroup } from "@/components/os/ModuleWorkspace";
import * as V from "./views";

const PreventiveMaintenance = () => <V.GenericView id="pmSchedule" />;
const Performance = () => <V.GenericView id="history" />;

const VIEWS = {
  wo: V.WorkOrdersView,
  pm: PreventiveMaintenance,
  spares: V.InventoryView,
  perf: Performance,
  planner: V.MaintCopilot,
};

export function MaintenanceIntelligence() {
  const { t } = useI18n();
  const tr = useTr();
  const GROUPS: WsGroup[] = [
    {
      label: "",
      items: [
        { id: "wo", icon: ClipboardList, label: tr("Work Orders") },
        { id: "pm", icon: CalendarCheck, label: tr("Preventive Maintenance") },
        { id: "spares", icon: Package, label: tr("Spare Parts") },
        { id: "perf", icon: Activity, label: tr("Performance") },
        { id: "planner", icon: Sparkles, label: tr("AI Planner") },
      ],
    },
  ];
  return <ModuleWorkspace groups={GROUPS} views={VIEWS} defaultId="wo" title={t("nav.maintenance")} titleIcon={Wrench} />;
}
