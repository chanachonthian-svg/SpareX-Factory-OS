"use client";

import { cn } from "@/lib/utils";

/** Broadcast-style LIVE indicator — red pill with a pulsing dot, the universal
 *  "this is streaming right now" mark. Inline glow so light mode keeps the look. */
export function LiveBadge({ label = "LIVE", size = "md", className }: { label?: string; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-rose-400/30 bg-rose-500/12 font-bold uppercase text-rose-300",
        size === "sm" ? "gap-1 px-2 py-0.5 text-[9px] tracking-[0.14em]" : "gap-1.5 px-2.5 py-1 text-[10px] tracking-[0.16em]",
        className,
      )}
      style={{ boxShadow: "0 0 10px rgba(244,63,94,0.22)" }}
    >
      <span className={cn("relative flex", size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2")}>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
        <span className={cn("relative inline-flex rounded-full bg-rose-400", size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2")} />
      </span>
      {label}
    </span>
  );
}
