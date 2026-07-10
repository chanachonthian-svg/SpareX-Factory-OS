import { Icon } from "@/components/ui/Icon";
import { AskCopilot } from "@/components/os/AskCopilot";
import { Sparkles } from "lucide-react";
import type { Module } from "@/lib/site";

export function ModuleHeader({
  module,
  copilotPrompt,
}: {
  module: Module;
  copilotPrompt: string;
}) {
  return (
    <section className="panel relative overflow-hidden p-6">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-3xl"
        style={{ background: module.accent }}
      />
      <div className="flex flex-wrap items-start gap-5">
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border"
          style={{
            color: module.accent,
            borderColor: `${module.accent}44`,
            backgroundColor: `${module.accent}14`,
          }}
        >
          <Icon name={module.icon} size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">
            Module {String(module.index).padStart(2, "0")} · {module.tagline}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{module.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
            {module.description}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <p className="text-3xl font-semibold tabular" style={{ color: module.accent }}>
              {module.metric.value}
            </p>
            <p className="text-[11px] uppercase tracking-wider text-white/40">
              {module.metric.label}
            </p>
          </div>
          <AskCopilot prompt={copilotPrompt} className="btn-ghost px-3.5 py-2 text-sm">
            <Sparkles size={14} /> Ask Copilot
          </AskCopilot>
        </div>
      </div>
    </section>
  );
}

export function moduleById(id: string, modules: Module[]) {
  return modules.find((m) => m.id === id)!;
}
