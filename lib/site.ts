export type IconName =
  | "command"
  | "brain"
  | "reports"
  | "vision"
  | "alarm"
  | "twin"
  | "energy"
  | "shield"
  | "production"
  | "asset"
  | "wrench"
  | "carbon"
  | "copilot"
  | "iot"
  | "apm"
  | "workorder"
  | "event"
  | "notification"
  | "pq"
  | "air"
  | "settings";

export const brand = {
  name: "SPAREX",
  product: "FactoryOS",
  productMark: "FactoryOS™",
  full: "SpareX FactoryOS™",
  tagline: "The Operating System for Intelligent Factories.",
  mission:
    "Transform traditional factories into autonomous, AI-driven, energy-efficient, and predictive manufacturing environments.",
  positioning:
    "FactoryOS is not a monitoring dashboard. It is the central nervous system of the factory — sensing, reasoning, and acting across energy, assets, production, and carbon in real time.",
  email: "factoryos@sparexth.com",
  domain: "factoryos.sparex.ai",
};

export type Module = {
  id: string;
  slug: string;
  index: number;
  name: string;
  short: string;
  tagline: string;
  description: string;
  icon: IconName;
  accent: string; // hex used for 3D + UI accent coding
  bullets: string[];
  metric: { value: string; label: string };
};

/** The eight pillars of FactoryOS. The Command Center + Digital Twin form the cockpit;
 *  the intelligence cores do the reasoning; the Copilot is the natural-language surface. */
export const modules: Module[] = [
  {
    id: "command",
    slug: "os",
    index: 1,
    name: "Command Center",
    short: "Command Center",
    tagline: "The executive war room",
    description:
      "A single pane of glass over the entire plant — live KPIs, the 3D digital twin, AI risk radar, and the next best actions for every leader.",
    icon: "command",
    accent: "#22d3ee",
    bullets: [
      "Plant-wide KPI cockpit",
      "AI situational briefing",
      "Cross-module risk radar",
      "Executive war-room view",
    ],
    metric: { value: "1", label: "pane of glass" },
  },
  {
    id: "energy",
    slug: "energy",
    index: 2,
    name: "Energy Intelligence™",
    short: "Energy Intelligence",
    tagline: "Every kilowatt, accounted for",
    description:
      "Machine-level metering, time-of-use cost modeling, and AI anomaly detection that turn raw power data into money saved.",
    icon: "energy",
    accent: "#22d3ee",
    bullets: [
      "Machine-level power metering",
      "Time-of-use cost engine",
      "AI anomaly & hidden-load detection",
      "Cost-per-unit attribution",
    ],
    metric: { value: "-22%", label: "energy cost" },
  },
  {
    id: "peakshield",
    slug: "peakshield",
    index: 3,
    name: "PeakShield AI™",
    short: "PeakShield",
    tagline: "Predict and prevent demand peaks",
    description:
      "Forecasts peak demand before it happens and automatically sheds or shifts load to dodge demand-charge penalties.",
    icon: "shield",
    accent: "#f59e0b",
    bullets: [
      "Peak-demand forecasting",
      "Automated load shedding",
      "Simultaneous-load detection",
      "Demand-charge avoidance",
    ],
    metric: { value: "฿4.5M", label: "penalties avoided / yr" },
  },
  {
    id: "production",
    slug: "production",
    index: 4,
    name: "Production Intelligence™",
    short: "Production",
    tagline: "OEE, in real time",
    description:
      "Real-time OEE, downtime root-cause, and production tracking that connect the floor to the boardroom.",
    icon: "production",
    accent: "#34d399",
    bullets: [
      "Live OEE (A · P · Q)",
      "Downtime root-cause analysis",
      "Production vs. plan tracking",
      "Shift & line benchmarking",
    ],
    metric: { value: "+38%", label: "average OEE gain" },
  },
  {
    id: "assets",
    slug: "assets",
    index: 5,
    name: "Asset Intelligence™",
    short: "Asset Intelligence",
    tagline: "Failure, foreseen",
    description:
      "Sensor fusion across vibration, thermal, and current to predict failures days ahead and rank assets by risk.",
    icon: "asset",
    accent: "#f472b6",
    bullets: [
      "Vibration · thermal · current fusion",
      "Remaining-useful-life estimation",
      "Failure-probability ranking",
      "Health-score per asset",
    ],
    metric: { value: "-45%", label: "unplanned downtime" },
  },
  {
    id: "maintenance",
    slug: "maintenance",
    index: 6,
    name: "Maintenance Intelligence™",
    short: "Maintenance",
    tagline: "From reactive to prescriptive",
    description:
      "Auto-generated work orders, spare-parts readiness, and prescriptive schedules that turn predictions into action.",
    icon: "wrench",
    accent: "#60a5fa",
    bullets: [
      "Prescriptive work orders",
      "Spare-parts readiness",
      "Technician scheduling",
      "MTBF / MTTR analytics",
    ],
    metric: { value: "3.2×", label: "wrench-time efficiency" },
  },
  {
    id: "carbon",
    slug: "carbon",
    index: 7,
    name: "Carbon Intelligence Suite™",
    short: "Carbon Suite",
    tagline: "ESG you can audit",
    description:
      "Real-time Scope 1 & 2 accounting, carbon-per-unit, and audit-ready ESG reporting generated automatically.",
    icon: "carbon",
    accent: "#4ade80",
    bullets: [
      "Scope 1 & 2 accounting",
      "Carbon intensity per unit",
      "Audit-ready ESG reports",
      "Decarbonization roadmap",
    ],
    metric: { value: "100%", label: "ESG traceability" },
  },
  {
    id: "copilot",
    slug: "os",
    index: 8,
    name: "AI Factory Copilot™",
    short: "Copilot",
    tagline: "Ask your factory anything",
    description:
      "A natural-language copilot grounded in your live plant data — explains, predicts, and recommends in plain language.",
    icon: "copilot",
    accent: "#818cf8",
    bullets: [
      "Natural-language plant queries",
      "Root-cause explanations",
      "Forecasts & recommendations",
      "One-click executive reports",
    ],
    metric: { value: "24/7", label: "always on" },
  },
];

/** Left-rail navigation for the OS shell. `tKey` resolves the label via i18n.
 *  `poweredBy` shows the SpareX AI engine(s) under the item; `action` makes the
 *  item an in-place trigger (e.g. open the Copilot) instead of a route. */
export const osNav: {
  label: string;
  tKey: string;
  href?: string;
  action?: "copilot";
  icon: IconName;
  accent: string;
  poweredBy?: string[];
  subKey?: string; // short plain-language description shown under the name
  dev?: boolean; // module is still under development — shown with a "dev" badge
  maintenance?: boolean; // module is temporarily under maintenance
  section: "core" | "modules";
}[] = [
  { label: "Executive Dashboard", tKey: "nav.exec", href: "/os", icon: "brain", accent: "#22d3ee", section: "core" },
  { label: "Alarm Center", tKey: "nav.alarms", href: "/os/alarms", icon: "alarm", accent: "#f59e0b", section: "core" },
  { label: "Event Center", tKey: "nav.events", href: "/os/events", icon: "event", accent: "#38bdf8", section: "core" },
  { label: "Work Order Center", tKey: "nav.workorderCenter", href: "/os/workorders", icon: "workorder", accent: "#60a5fa", section: "core" },
  { label: "Notification Center", tKey: "nav.notifications", href: "/os/notifications", icon: "notification", accent: "#a78bfa", section: "core" },
  // Report Center removed from the sidebar (user request 2026-07-13) — every
  // module now carries its own Step-5 report builder; the /os/reports route
  // still exists for direct links.
  { label: "Settings", tKey: "nav.settings", href: "/os/settings", icon: "settings", accent: "#94a3b8", subKey: "nav.settings.sub", section: "core" },
  { label: "Energy Intelligence", tKey: "nav.energyai", href: "/os/energy", icon: "energy", accent: "#22d3ee", subKey: "nav.energyai.sub", section: "modules" },
  { label: "Power Quality Intelligence", tKey: "nav.pq", href: "/os/power-quality", icon: "pq", accent: "#2dd4bf", subKey: "nav.pq.sub", section: "modules" },
  { label: "Vortiq Compressed Air", tKey: "nav.vortiq", href: "/os/vortiq", icon: "air", accent: "#38bdf8", subKey: "nav.vortiq.sub", section: "modules" },
  { label: "RPM Intelligence", tKey: "nav.rpm", href: "/os/rpm", icon: "apm", accent: "#f472b6", subKey: "nav.rpm.sub", section: "modules" },
  { label: "VisionIQ", tKey: "nav.visioniq", href: "/os/vision", icon: "vision", accent: "#c084fc", subKey: "nav.visioniq.sub", section: "modules" },
  { label: "Production Intelligence", tKey: "nav.oee", href: "/os/production", icon: "production", accent: "#f59e0b", subKey: "nav.oee.sub", section: "modules" },
  { label: "Sustainability Intelligence", tKey: "nav.esg", href: "/os/carbon", icon: "carbon", accent: "#4ade80", section: "modules" },
  { label: "Digital Twin", tKey: "nav.twin", href: "/os/twin", icon: "twin", accent: "#a78bfa", section: "modules" },
  // Copilot page removed from the rail — the floating chat widget (bottom-right) covers it on every page
];

export const benchmarks = [
  "Palantir Foundry",
  "Tesla Mission Control",
  "Siemens Xcelerator",
  "ABB Ability",
  "Schneider EcoStruxure",
  "OpenAI Platform",
  "Vercel",
];

export type Customer = { industry: string; blurb: string; icon: IconName };
export const industries: Customer[] = [
  { industry: "Automotive", blurb: "Stamping, paint, body & assembly", icon: "production" },
  { industry: "Electronics", blurb: "SMT lines & clean-room utilities", icon: "iot" },
  { industry: "Petrochemical", blurb: "Continuous process & rotating assets", icon: "energy" },
  { industry: "Food & Beverage", blurb: "Cold chain, CIP & packaging", icon: "carbon" },
  { industry: "Pulp & Paper", blurb: "Energy-intensive continuous lines", icon: "apm" },
  { industry: "Steel & Metals", blurb: "Furnaces, mills & heavy drives", icon: "shield" },
];

export const personas = [
  { role: "CEO", value: "Plant performance & ESG, board-ready in one view." },
  { role: "Plant Director", value: "Cross-line situational awareness and risk." },
  { role: "Operations Manager", value: "OEE, throughput, and daily loss recovery." },
  { role: "Production Manager", value: "Schedule adherence and downtime root-cause." },
  { role: "Maintenance Manager", value: "Prescriptive work orders and parts readiness." },
  { role: "Reliability Engineer", value: "RUL, failure modes, and asset health trends." },
  { role: "Energy Manager", value: "Peak demand, cost-per-unit, and anomalies." },
];

export const stats = [
  { value: "120+", label: "Factories on FactoryOS" },
  { value: "-45%", label: "Unplanned downtime" },
  { value: "-22%", label: "Energy cost" },
  { value: "$48M", label: "Annual savings unlocked" },
];
