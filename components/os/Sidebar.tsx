"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { osNav } from "@/lib/site";
import { Icon } from "@/components/ui/Icon";
import { Wordmark } from "@/components/ui/Wordmark";
import { openCopilot, cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { ArrowUpRight, PanelLeftClose } from "lucide-react";

const KEY = "factoryos:sidebar";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    const s = localStorage.getItem(KEY);
    if (s === "icons") setPinned(false);
  }, []);

  function toggle() {
    setPinned((p) => {
      const next = !p;
      localStorage.setItem(KEY, next ? "pinned" : "icons");
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-white/10 bg-ink-900/70 backdrop-blur-xl transition-[width] duration-200 ease-out lg:flex",
        pinned ? "w-64" : "w-[76px]",
      )}
    >
      {/* header */}
      <div className={cn("flex h-16 items-center border-b border-white/10", pinned ? "px-5" : "justify-center px-2")}>
        {pinned ? (
          <>
            <Link href="/os">
              <Wordmark />
            </Link>
            <button
              onClick={toggle}
              title="Unpin sidebar"
              aria-label="Unpin sidebar"
              className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-white/40 transition hover:bg-white/5 hover:text-white"
            >
              <PanelLeftClose size={16} />
            </button>
          </>
        ) : (
          <button onClick={toggle} title="Pin sidebar" aria-label="Pin sidebar" className="transition hover:opacity-80">
            <Wordmark compact />
          </button>
        )}
      </div>

      {/* nav */}
      <nav className={cn("flex-1 space-y-0.5 overflow-y-auto py-3", pinned ? "px-3" : "px-2.5")}>
        {osNav.map((item) => {
          const active = item.href ? (item.href === "/os" ? pathname === "/os" : pathname.startsWith(item.href)) : false;
          const rowClass = cn(
            "group flex rounded-xl text-sm transition",
            pinned ? "items-start gap-3 px-3 py-2" : "items-center justify-center px-0 py-2.5",
            active ? "bg-white/[0.07] text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white/90",
          );
          const inner = (
            <>
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition"
                style={{
                  borderColor: active ? `${item.accent}55` : "rgba(255,255,255,0.1)",
                  backgroundColor: active ? `${item.accent}1f` : "transparent",
                  color: active ? item.accent : undefined,
                }}
              >
                <Icon name={item.icon} size={15} />
              </span>
              {pinned ? (
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate">{t(item.tKey)}</span>
                    {item.maintenance ? (
                      <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-300">DEV</span>
                    ) : item.dev ? (
                      <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-300">dev</span>
                    ) : null}
                    {active ? <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.maintenance ? "#f59e0b" : item.accent }} /> : null}
                  </span>
                  {item.subKey ? <span className="truncate text-[10px] leading-tight text-white/40">{t(item.subKey)}</span> : null}
                  {item.poweredBy?.map((p, i) => (
                    <span key={i} className="truncate text-[10px] leading-tight text-white/35">
                      {i === 0 ? "Powered by " : ""}
                      {p}
                    </span>
                  ))}
                </span>
              ) : null}
            </>
          );

          return item.action === "copilot" ? (
            <button key={item.tKey} onClick={() => openCopilot()} title={pinned ? undefined : t(item.tKey)} className={cn(rowClass, "w-full text-left")}>
              {inner}
            </button>
          ) : (
            <Link key={item.href} href={item.href!} title={pinned ? undefined : t(item.tKey)} className={rowClass}>
              {inner}
            </Link>
          );
        })}
      </nav>

      {/* footer */}
      <div className={cn("border-t border-white/10 py-3", pinned ? "px-3" : "px-2.5")}>
        <Link
          href="/"
          title={pinned ? undefined : t("shell.back")}
          className={cn(
            "flex items-center rounded-xl text-xs text-white/45 transition hover:text-white/70",
            pinned ? "gap-2 px-3 py-2" : "justify-center px-0 py-2",
          )}
        >
          <ArrowUpRight size={13} className="shrink-0" />
          {pinned ? <span className="truncate">{t("shell.back")}</span> : null}
        </Link>
      </div>
    </aside>
  );
}
