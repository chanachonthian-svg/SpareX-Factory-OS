"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { WorkflowBar } from "@/components/os/WorkflowNav";
import { TwinReportStep } from "./TwinReportStep";
import { TwinActionStep } from "./TwinActionStep";
import * as V from "./views";

type LZ = { en: string; th: string };

/** Operational Twin — the standard FactoryOS 5-step workflow:
 *  01 Monitor (live 3D twin) → 02 Insight → 03 AI Analysis →
 *  04 AI Recommendation & Action (Zero-Invest / Invest) → 05 Report builder. */
export function OperationalTwin() {
  const { locale } = useI18n();
  const L = (o: LZ) => (locale === "th" ? o.th : o.en);
  const [step, setStep] = useState(0);

  return (
    <div className="space-y-6">
      <WorkflowBar step={step} setStep={setStep} L={L} />

      {step === 0 && <V.MapView />}
      {step === 1 && <V.TwinInsightView />}
      {step === 2 && (
        <div className="space-y-6">
          {/* what-if first — trying decisions in the twin before the real plant
              is the analysis customers buy this module for */}
          <V.SimulationView onPlan={() => setStep(3)} />
          <V.AIInsightsView onAct={() => setStep(3)} />
          <V.TwinRootCauseCard onAct={() => setStep(3)} onSee3d={() => setStep(0)} />
        </div>
      )}
      {step === 3 && <TwinActionStep />}
      {step === 4 && <TwinReportStep />}
    </div>
  );
}
