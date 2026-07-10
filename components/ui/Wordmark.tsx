/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";
import { brand } from "@/lib/site";
import { publicAsset } from "@/lib/paths";

/** The SpareX lockup: official logo (white variant for the dark theme) + FactoryOS™. */
export function Wordmark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span className={cn("shrink-0", className)}>
        <img src={publicAsset("/sparex-white.png?v=2")} alt="SpareX" className="hide-on-light h-10 w-auto object-contain" />
        <img src={publicAsset("/sparex-mark.png?v=2")} alt="SpareX" className="hide-on-dark h-10 w-auto object-contain" />
      </span>
    );
  }
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <img
        src={publicAsset("/sparex-white.png?v=2")}
        alt="SpareX"
        className="hide-on-light h-11 w-auto shrink-0 object-contain"
      />
      <img
        src={publicAsset("/sparex-mark.png?v=2")}
        alt="SpareX"
        className="hide-on-dark h-11 w-auto shrink-0 object-contain"
      />
      <span className="h-7 w-px shrink-0 bg-white/15" />
      <span className="leading-none">
        <span className="block text-sm font-semibold tracking-tight text-white">
          {brand.productMark}
        </span>
        <span className="mt-1 block whitespace-nowrap text-[9px] font-medium tracking-[0.1em] text-white/40">
          Industrial AI OS
        </span>
      </span>
    </span>
  );
}
