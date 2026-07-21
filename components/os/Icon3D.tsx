import type { LucideIcon } from "lucide-react";

/** Glossy "3D app icon" tile — layered gradient, top highlight, and a soft colored
 *  glow. Inline styles only, so light-mode CSS overrides never wash it out. */
export function Icon3D({
  icon: Icon,
  color,
  size = 34,
  iconSize,
  rounded = 12,
}: {
  icon: LucideIcon;
  color: string;
  size?: number;
  iconSize?: number;
  rounded?: number;
}) {
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        background: `linear-gradient(145deg, ${color} -25%, ${color}b3 45%, #0b1018 145%)`,
        boxShadow: `0 6px 14px -4px ${color}59, inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1.5px 2px rgba(0,0,0,0.35)`,
      }}
    >
      <span
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 75% at 30% 0%, rgba(255,255,255,0.38), transparent 55%)" }}
      />
      <Icon
        size={iconSize ?? Math.round(size * 0.52)}
        strokeWidth={2.2}
        color="#fff"
        style={{ position: "relative", filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.45))" }}
      />
    </span>
  );
}
