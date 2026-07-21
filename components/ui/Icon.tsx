import {
  LayoutDashboard,
  BrainCircuit,
  FileText,
  ScanEye,
  BellRing,
  Boxes,
  Zap,
  ShieldCheck,
  Factory,
  Activity,
  Wrench,
  Leaf,
  Sparkles,
  Cpu,
  Gauge,
  Settings,
  ClipboardCheck,
  CalendarClock,
  Bell,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { IconName } from "@/lib/site";

const MAP: Record<IconName, LucideIcon> = {
  command: LayoutDashboard,
  brain: BrainCircuit,
  reports: FileText,
  vision: ScanEye,
  alarm: BellRing,
  twin: Boxes,
  energy: Zap,
  shield: ShieldCheck,
  production: Factory,
  asset: Activity,
  wrench: Wrench,
  carbon: Leaf,
  copilot: Sparkles,
  iot: Cpu,
  apm: Gauge,
  workorder: ClipboardCheck,
  event: CalendarClock,
  notification: Bell,
  settings: Settings,
  pq: Waves,
  air: Wind,
};

export function Icon({
  name,
  className,
  size,
  strokeWidth = 1.75,
}: {
  name: IconName;
  className?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const C = MAP[name] ?? LayoutDashboard;
  return <C className={className} size={size} strokeWidth={strokeWidth} />;
}
