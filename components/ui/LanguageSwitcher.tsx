"use client";

import { Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LOCALES } from "@/lib/dict";
import { cn } from "@/lib/utils";

/** Cycles EN → TH → JA → ZH → EN on each click (no dropdown). */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  const idx = Math.max(0, LOCALES.findIndex((l) => l.code === locale));
  const current = LOCALES[idx];
  const next = LOCALES[(idx + 1) % LOCALES.length];

  return (
    <button
      onClick={() => setLocale(next.code)}
      title={`${current.native} → ${next.native}`}
      aria-label={`Switch language to ${next.native}`}
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 transition hover:text-white",
        className,
      )}
    >
      <Globe size={14} />
      <span className="w-5 text-center font-semibold tabular">{current.short}</span>
    </button>
  );
}
