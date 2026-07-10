"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import { Lock, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type WsItem = { id: string; icon: LucideIcon; label: string };
export type WsGroup = { label: string; items: WsItem[] };

/** Module workspace with a horizontal tab bar on top (one tab per sub-module)
 *  and the active view below. The main product sidebar sits to the left, so the
 *  two navs are on different axes and never read as stacked. */
export function ModuleWorkspace({
  groups,
  views,
  defaultId,
  headerRight,
  lockedIds,
  maintenanceIds,
}: {
  groups: WsGroup[];
  views: Record<string, ComponentType>;
  defaultId: string;
  /** accepted for compatibility — no longer rendered (the Topbar shows the module name) */
  title?: string;
  titleIcon?: LucideIcon;
  /** rendered at the far right of the tab bar (e.g. a mode toggle) */
  headerRight?: React.ReactNode;
  /** tab ids that show a lock badge (their content is gated) */
  lockedIds?: string[];
  /** tab ids that show an "under maintenance" badge */
  maintenanceIds?: string[];
}) {
  const items = groups.flatMap((g) => g.items);
  const [active, setActive] = useState(defaultId);
  const View = views[active];

  // allow other views to switch tabs (e.g. "locate in Digital Twin")
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => {
    const onSwitch = (e: Event) => {
      const id = (e as CustomEvent).detail?.id;
      if (id && itemsRef.current.some((it) => it.id === id)) setActive(id);
    };
    window.addEventListener("factoryos:switch-tab", onSwitch as EventListener);
    return () => window.removeEventListener("factoryos:switch-tab", onSwitch as EventListener);
  }, []);

  return (
    <div>
      {/* top tab bar */}
      <div className="mb-6 flex items-center gap-3 border-b border-white/10">
        <div className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto scrollbar-hide">
          {items.map((it) => {
            const on = active === it.id;
            const locked = lockedIds?.includes(it.id);
            const maint = maintenanceIds?.includes(it.id);
            return (
              <button
                key={it.id}
                onClick={() => setActive(it.id)}
                className={cn(
                  "relative flex shrink-0 items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition",
                  on ? "text-white" : "text-white/50 hover:text-white/80",
                )}
              >
                <it.icon size={15} className={on ? "text-brand-300" : "text-white/40"} />
                <span className="whitespace-nowrap">{it.label}</span>
                {locked ? <Lock size={11} className="text-amber-300/80" /> : null}
                {maint ? <Wrench size={11} className="text-amber-300/70" /> : null}
                {on ? (
                  <motion.span
                    layoutId="ws-tab-underline"
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-400"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
        {headerRight ? <div className="shrink-0 pb-1.5">{headerRight}</div> : null}
      </div>

      <View />
    </div>
  );
}
