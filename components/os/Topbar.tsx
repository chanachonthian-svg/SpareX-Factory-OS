"use client";

import { Sparkles, Search, ChevronDown } from "lucide-react";
import { openCopilot } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Topbar({
  title,
  subtitle,
  subtitleKey,
}: {
  title: string;
  subtitle?: string;
  subtitleKey?: string;
}) {
  const { t } = useI18n();
  const sub = subtitleKey ? t(subtitleKey) : subtitle;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/10 bg-ink-950/70 px-5 backdrop-blur-xl lg:px-8">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{title}</h1>
        {sub ? <p className="truncate text-xs text-white/45">{sub}</p> : null}
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-ok opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-status-ok" />
          </span>
          {t("topbar.live")}
        </span>

        <button className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/55 transition hover:text-white/80 md:flex">
          <span className="grid h-4 w-4 place-items-center rounded bg-brand-400/20 text-[9px] font-bold text-brand-300">
            B1
          </span>
          {t("topbar.plant")}
          <ChevronDown size={13} />
        </button>

        <ThemeToggle />
        <LanguageSwitcher />

        <button
          onClick={() => openCopilot()}
          className="hidden h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/55 transition hover:text-white sm:grid"
          aria-label="Search"
        >
          <Search size={15} />
        </button>

        <button onClick={() => openCopilot()} className="btn-glow px-3.5 py-2 text-sm">
          <Sparkles size={15} />
          <span className="hidden sm:inline">{t("topbar.ask")}</span>
        </button>
      </div>
    </header>
  );
}
