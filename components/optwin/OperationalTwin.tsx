"use client";

import { Boxes, Network, Wrench, LayoutGrid, FlaskConical } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTr } from "@/lib/autotranslate";
import { ModuleWorkspace, type WsGroup } from "@/components/os/ModuleWorkspace";
import * as V from "./views";

// these sub-modules are temporarily under maintenance — the originals (e.g.
// V.ProcessFlowTwinView / V.UtilityTwinView / …) are kept for easy restoration.
const maint = (feature: string) => function MaintView() { return <V.UnderMaintenance feature={feature} />; };
const MAINT_IDS = ["flow", "utilities", "heatmap", "sim"];

const VIEWS = {
  factory: V.MapView,
  flow: maint("Process Flow"),
  utilities: maint("Utilities"),
  heatmap: maint("Heatmap"),
  sim: maint("Simulation"),
};

export function OperationalTwin() {
  const { t } = useI18n();
  const tr = useTr();
  const groups: WsGroup[] = [
    {
      label: "",
      items: [
        { id: "factory", icon: Boxes, label: tr("Factory View") },
        { id: "flow", icon: Network, label: tr("Process Flow") },
        { id: "utilities", icon: Wrench, label: tr("Utilities") },
        { id: "heatmap", icon: LayoutGrid, label: tr("Heatmap") },
        { id: "sim", icon: FlaskConical, label: tr("Simulation") },
      ],
    },
  ];
  return <ModuleWorkspace groups={groups} views={VIEWS} defaultId="factory" maintenanceIds={MAINT_IDS} title={t("nav.twin")} titleIcon={Boxes} />;
}
