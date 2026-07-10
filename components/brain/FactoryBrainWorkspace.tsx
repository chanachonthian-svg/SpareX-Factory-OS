"use client";

import { ExecutiveBriefing } from "./ExecutiveBriefing";

/** The Executive Dashboard is one focused briefing page — the old side views
 *  (Factory Health / Critical Issues / Opportunities / AI Copilot) were removed:
 *  their content already lives inside the briefing or in dedicated modules. */
export function FactoryBrainWorkspace() {
  return (
    <main className="p-5 lg:p-8">
      <ExecutiveBriefing />
    </main>
  );
}
