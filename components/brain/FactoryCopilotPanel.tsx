"use client";

import { useState } from "react";
import { Sparkles, ArrowUp } from "lucide-react";
import { openCopilot, cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

// Canonical English prompts sent to the Copilot (so grounding/matching works),
// while the visible label is localized.
const PROMPTS = [
  { en: "Why is energy consumption higher today?", k: "cop.q0" },
  { en: "Which machine is most likely to fail?", k: "cop.q1" },
  { en: "How much money can we save this month?", k: "cop.q2" },
  { en: "Should we invest in a robot cell?", k: "cop.q3" },
];

export function FactoryCopilotPanel() {
  const { t } = useI18n();
  const [input, setInput] = useState("");

  return (
    <section className="panel overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-white/10 p-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950">
          <Sparkles size={18} />
        </span>
        <div>
          <h3 className="font-semibold">{t("cop.title")}</h3>
          <p className="text-xs text-white/45">{t("cop.sub")}</p>
        </div>
      </div>

      <div className="p-5">
        <div className="flex gap-2.5">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950">
            <Sparkles size={13} />
          </span>
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-white/75">
            {t("cop.intro")}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {PROMPTS.map((p) => (
            <button
              key={p.k}
              onClick={() => openCopilot(p.en)}
              className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-left text-sm text-white/70 transition hover:border-brand-400/30 hover:bg-brand-400/5 hover:text-white"
            >
              {t(p.k)}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 focus-within:border-brand-400/40">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) {
                openCopilot(input);
                setInput("");
              }
            }}
            placeholder={t("cop.placeholder")}
            className="flex-1 bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-white/35 focus:outline-none"
          />
          <button
            onClick={() => {
              if (input.trim()) {
                openCopilot(input);
                setInput("");
              }
            }}
            disabled={!input.trim()}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-xl transition",
              input.trim() ? "bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950" : "bg-white/5 text-white/30",
            )}
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
