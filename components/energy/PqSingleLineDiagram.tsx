"use client";

import { useState, type ReactNode } from "react";
import { Waves, Activity, Gauge, Cpu, ChevronDown, Check, type LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LZ = { en: string; th: string };
type PqMode = "thd" | "events" | "pf";
type PqStatus = "clean" | "watch" | "violation";
type PqEv = "sag" | "overvoltage" | "flicker" | "transient";

const STAT_HEX: Record<PqStatus, string> = { clean: "#34d399", watch: "#f59e0b", violation: "#f43f5e" };
const EV_HEX: Record<PqEv, string> = { sag: "#22d3ee", overvoltage: "#818cf8", flicker: "#f59e0b", transient: "#f43f5e" };
const EV_LABEL: Record<PqEv, LZ> = {
  sag: { en: "Sag", th: "ไฟตก" },
  overvoltage: { en: "Swell", th: "แรงดันเกิน" },
  flicker: { en: "Flicker", th: "ไฟกระพริบ" },
  transient: { en: "Transient", th: "ไฟกระชาก" },
};

/** scale a hex colour's RGB by a factor (isometric extrude faces) */
function shade(hex: string, f: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  const r = c((n >> 16) & 255), g = c((n >> 8) & 255), b = c(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

type Load = { name: string; kind: LZ; contribPct: number; nonlinear: boolean; mtype: string; ithd: number; pf: number; causes?: { ev: PqEv; n: number } };
type PqFeeder = {
  id: string; name: string; sub: LZ;
  ithd: number; vthd: number; dom: string; pf: number; pfDisp: number; unbalance: number;
  status: PqStatus; events: Record<PqEv, number>; sourceOf: PqEv[]; note?: LZ; loads: Load[];
};

/** feeders mirror the Energy SLD topology, annotated with power-quality figures traced
 *  from the AI root-cause set (Chiller B sag, weld flicker, cap-bank transient, low-PF air). */
const FEEDERS: PqFeeder[] = [
  {
    id: "f1", name: "DB-A · Line A", sub: { en: "CNC · Palletizer", th: "CNC · Palletizer" },
    ithd: 3.6, vthd: 2.1, dom: "H5", pf: 0.96, pfDisp: 0.97, unbalance: 0.6, status: "clean",
    events: { sag: 0, overvoltage: 0, flicker: 0, transient: 0 }, sourceOf: [],
    loads: [
      { name: "CNC 01–04", kind: { en: "6-pulse VFD", th: "VFD 6 พัลส์" }, contribPct: 22, nonlinear: true, mtype: "cnc", ithd: 28, pf: 0.94 },
      { name: "Palletizer", kind: { en: "servo drive", th: "เซอร์โวไดรฟ์" }, contribPct: 8, nonlinear: true, mtype: "robot", ithd: 12, pf: 0.96 },
    ],
  },
  {
    id: "f2", name: "DB-B · Line B", sub: { en: "Press · Weld · QC", th: "Press · Weld · QC" },
    ithd: 4.4, vthd: 2.6, dom: "H3", pf: 0.95, pfDisp: 0.97, unbalance: 1.4, status: "watch",
    events: { sag: 0, overvoltage: 2, flicker: 12, transient: 0 }, sourceOf: ["overvoltage", "flicker"],
    note: { en: "Press-line load rejection → swell 112% · arc welders → flicker Pst 0.61", th: "โหลด press หลุด → swell 112% · เครื่องเชื่อมอาร์ก → flicker Pst 0.61" },
    loads: [
      { name: "Weld Robot 04", kind: { en: "arc welder", th: "เครื่องเชื่อมอาร์ก" }, contribPct: 34, nonlinear: true, mtype: "welder", ithd: 18, pf: 0.85, causes: { ev: "flicker", n: 12 } },
      { name: "Stamping Press 03", kind: { en: "motor", th: "มอเตอร์" }, contribPct: 10, nonlinear: false, mtype: "press", ithd: 5, pf: 0.92, causes: { ev: "overvoltage", n: 2 } },
    ],
  },
  {
    id: "f3", name: "DB-C · Line C", sub: { en: "IMM · Paint · AMR", th: "IMM · Paint · AMR" },
    ithd: 4.0, vthd: 2.3, dom: "H5", pf: 0.96, pfDisp: 0.97, unbalance: 0.9, status: "clean",
    events: { sag: 0, overvoltage: 0, flicker: 0, transient: 0 }, sourceOf: [],
    loads: [
      { name: "IMM heaters", kind: { en: "SCR heater", th: "ฮีตเตอร์ SCR" }, contribPct: 14, nonlinear: true, mtype: "imm", ithd: 22, pf: 0.97 },
      { name: "AMR chargers", kind: { en: "rectifier", th: "เรกติไฟเออร์" }, contribPct: 9, nonlinear: true, mtype: "generic", ithd: 30, pf: 0.93 },
    ],
  },
  {
    id: "f4", name: "DB-COOL · Cooling", sub: { en: "Chillers · CT · Pump", th: "Chillers · CT · Pump" },
    ithd: 6.4, vthd: 3.0, dom: "H5", pf: 0.97, pfDisp: 0.98, unbalance: 1.1, status: "violation",
    events: { sag: 5, overvoltage: 0, flicker: 0, transient: 0 }, sourceOf: ["sag"],
    note: { en: "Chiller B DOL start → sag 76% (outside ITIC) + H5 injection", th: "Chiller B สตาร์ท DOL → ไฟตก 76% (หลุด ITIC) + ฉีด H5" },
    loads: [
      { name: "Chiller B", kind: { en: "DOL motor", th: "มอเตอร์ DOL" }, contribPct: 41, nonlinear: false, mtype: "chiller", ithd: 4, pf: 0.86, causes: { ev: "sag", n: 5 } },
      { name: "Chiller A", kind: { en: "6-pulse VFD", th: "VFD 6 พัลส์" }, contribPct: 24, nonlinear: true, mtype: "chiller", ithd: 28, pf: 0.95 },
      { name: "Cooling Tower", kind: { en: "VFD fan", th: "พัดลม VFD" }, contribPct: 12, nonlinear: true, mtype: "coolingTower", ithd: 25, pf: 0.94 },
      { name: "CW Pump", kind: { en: "VFD", th: "VFD" }, contribPct: 8, nonlinear: true, mtype: "pump", ithd: 22, pf: 0.93 },
    ],
  },
  {
    id: "f5", name: "DB-CA · Compressed Air", sub: { en: "Air Station", th: "สถานีลม" },
    ithd: 4.8, vthd: 2.5, dom: "H5", pf: 0.83, pfDisp: 0.86, unbalance: 1.0, status: "watch",
    events: { sag: 0, overvoltage: 0, flicker: 0, transient: 0 }, sourceOf: [],
    note: { en: "PF 0.83 — reactive load + H5 from compressor VFDs", th: "PF 0.83 — โหลดรีแอกทีฟ + H5 จาก VFD คอมเพรสเซอร์" },
    loads: [
      { name: "Air Compressor 1–2", kind: { en: "6-pulse VFD", th: "VFD 6 พัลส์" }, contribPct: 28, nonlinear: true, mtype: "compressor", ithd: 26, pf: 0.83 },
    ],
  },
  {
    id: "f6", name: "DB-FAC · Facilities", sub: { en: "Steam · HVAC · Env", th: "Steam · HVAC · Env" },
    ithd: 2.4, vthd: 1.8, dom: "—", pf: 0.94, pfDisp: 0.95, unbalance: 0.7, status: "clean",
    events: { sag: 0, overvoltage: 0, flicker: 0, transient: 0 }, sourceOf: [],
    loads: [
      { name: "HVAC AHU", kind: { en: "VFD", th: "VFD" }, contribPct: 9, nonlinear: true, mtype: "ahu", ithd: 20, pf: 0.94 },
      { name: "Lighting", kind: { en: "LED driver", th: "LED driver" }, contribPct: 5, nonlinear: true, mtype: "generic", ithd: 15, pf: 0.95 },
    ],
  },
];
const FEEDER_X = [120, 268, 416, 564, 712, 856];

/** the MDB incomer carries the utility-side sag + the cap-bank switching disturbances */
const MDB_PQ = {
  vthd: 3.0, ithd: 6.4, pf: 0.96, pfDisp: 0.98, unbalance: 0.8,
  events: { sag: 2, overvoltage: 4, flicker: 0, transient: 4 } as Record<PqEv, number>,
  sourceOf: ["transient", "overvoltage"] as PqEv[],
  note: { en: "Cap-bank switching → 1.9 kV transients + H7 parallel resonance", th: "การสลับคาปาซิเตอร์ → transient 1.9 kV + เรโซแนนซ์ขนาน H7" },
};
const CAP_BANK = { kvar: 500, dom: "H7", status: "violation" as PqStatus };

const sumEv = (e: Record<PqEv, number>) => e.sag + e.overvoltage + e.flicker + e.transient;

/** MDB-level disturbance sources (cap-bank switching + utility); feeders derive theirs from
 *  each machine's `causes`. Every count is expanded into individually-timestamped rows. */
const MDB_CAUSES: { ev: PqEv; n: number; source: string }[] = [
  { ev: "sag", n: 2, source: "Utility side" },
  { ev: "overvoltage", n: 4, source: "Capacitor Bank" },
  { ev: "transient", n: 4, source: "Capacitor Bank" },
];

type LogRow = { at: string; type: PqEv; detail: LZ; phase: string; source: string; itic: "within" | "violation" };

/** deterministic timestamp spread across the working day (no Math.random → hydrates clean) */
function evTime(i: number, n: number): string {
  const m = Math.floor(6 * 60 + (12 * 60 * (i + 0.5)) / n);
  const ss = (i * 37) % 60;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
/** synthesise one plausible event row (value varies deterministically by index) */
function makeRow(ev: PqEv, i: number, n: number, source: string): LogRow {
  const at = evTime(i, n), ph = ["L1", "L2", "L3"][i % 3];
  if (ev === "flicker") {
    const pst = (0.55 + (i % 7) * 0.02).toFixed(2);
    return { at, type: ev, detail: { en: `Pst ${pst} — arc welding`, th: `Pst ${pst} — งานเชื่อมอาร์ก` }, phase: "3φ", source, itic: "within" };
  }
  if (ev === "overvoltage") {
    const pct = 108 + (i % 5);
    return { at, type: ev, detail: { en: `swell to ${pct}% — load rejection`, th: `แรงดันพุ่ง ${pct}% — โหลดหลุด` }, phase: ph, source, itic: "within" };
  }
  if (ev === "sag") {
    const res = 74 + (i % 8) * 2, ms = 100 + (i % 5) * 40;
    return { at, type: ev, detail: { en: `dipped to ${res}% for ${ms} ms`, th: `ตกเหลือ ${res}% นาน ${ms} ms` }, phase: ph, source, itic: res < 80 ? "violation" : "within" };
  }
  const kv = (1.5 + (i % 5) * 0.1).toFixed(1);
  return { at, type: ev, detail: { en: `${kv} kV impulse — cap switching`, th: `อิมพัลส์ ${kv} kV — สวิตช์คาปาซิเตอร์` }, phase: ph, source, itic: "violation" };
}
/** every disturbance for a branch today, timestamped — gated by what the meter can capture */
function genEvents(causes: { ev: PqEv; n: number; source: string }[], meterRank: number): LogRow[] {
  const rows: LogRow[] = [];
  causes.forEach((c) => {
    if (meterRank < EV_MIN_RANK[c.ev]) return;
    for (let i = 0; i < c.n; i++) rows.push(makeRow(c.ev, i, c.n, c.source));
  });
  return rows.sort((a, b) => (a.at < b.at ? 1 : -1));
}

/** meter rank needed to capture each disturbance (same ladder as Detection Coverage):
 *  sag/swell = PM5340(1), flicker = PM5760(3), transient = PM8240(4). A meter that can't
 *  see a disturbance simply doesn't log it — so the SLD zeroes those counts out. */
const EV_MIN_RANK: Record<PqEv, number> = { sag: 1, overvoltage: 1, flicker: 3, transient: 4 };
const detectedEvents = (e: Record<PqEv, number>, rank: number): Record<PqEv, number> => ({
  sag: rank >= EV_MIN_RANK.sag ? e.sag : 0,
  overvoltage: rank >= EV_MIN_RANK.overvoltage ? e.overvoltage : 0,
  flicker: rank >= EV_MIN_RANK.flicker ? e.flicker : 0,
  transient: rank >= EV_MIN_RANK.transient ? e.transient : 0,
});

/** distortion current — animates from load toward the source (upstream), brighter/faster
 *  the more THD the branch injects. This is the PQ story: harmonics flow back to the PCC. */
function Flow({ d, intensity = 0.4, color = "#818cf8", reverse = false }: { d: string; intensity?: number; color?: string; reverse?: boolean }) {
  const dur = Math.max(0.5, 1.7 - intensity * 1.2);
  return (
    <g>
      <path d={d} stroke="#1f2a3d" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d={d} stroke={color} strokeWidth="2.2" fill="none" strokeDasharray="6 10" strokeLinecap="round" opacity={0.3 + intensity * 0.6}>
        <animate attributeName="stroke-dashoffset" from={reverse ? "0" : "32"} to={reverse ? "32" : "0"} dur={`${dur}s`} repeatCount="indefinite" />
      </path>
      <circle r="3" fill={color} opacity="0.9">
        <animateMotion dur={`${dur * 2}s`} repeatCount="indefinite" path={d} keyPoints={reverse ? "1;0" : "0;1"} keyTimes="0;1" calcMode="linear" />
      </circle>
    </g>
  );
}

/** isometric 3D cabinet — screen shows the active PQ metric instead of kW */
function Cabinet({
  x, y, w = 104, h = 104, label, sub, main, sub2, accent, status, big, selected, onClick, uid, base = "#243044",
}: {
  x: number; y: number; w?: number; h?: number; label: string; sub?: string;
  main: string; sub2?: string; accent: string; status: PqStatus; big?: boolean;
  selected?: boolean; onClick?: () => void; uid: string; base?: string;
}) {
  const led = STAT_HEX[status];
  const top = shade(base, 1.34), side = shade(base, 0.42), edge = shade(base, 1.12);
  const gid = `pqcab-${uid}`;
  return (
    <g onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={base} />
          <stop offset="55%" stopColor={shade(base, 0.66)} />
          <stop offset="100%" stopColor={shade(base, 0.5)} />
        </linearGradient>
      </defs>
      {selected ? <rect x={x - 5} y={y - 14} width={w + 22} height={h + 20} rx="6" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" /> : null}
      <polygon points={`${x},${y} ${x + 12},${y - 9} ${x + w + 12},${y - 9} ${x + w},${y}`} fill={top} />
      <polygon points={`${x + w},${y} ${x + w + 12},${y - 9} ${x + w + 12},${y + h - 9} ${x + w},${y + h}`} fill={side} />
      <rect x={x} y={y} width={w} height={h} rx="3" fill={`url(#${gid})`} stroke={selected ? "#22d3ee" : edge} strokeWidth={selected ? 1.8 : 1} />
      <rect x={x + 7} y={y + 7} width={w - 14} height={h - 14} rx="2" fill="none" stroke="#293650" />
      <circle cx={x + w - 16} cy={y + 17} r="3.5" fill={led} style={{ filter: `drop-shadow(0 0 4px ${led})` }}>
        <animate attributeName="opacity" values={status === "clean" ? "1;0.55;1" : "1;0.25;1"} dur={status === "violation" ? "0.6s" : status === "watch" ? "0.9s" : "2.2s"} repeatCount="indefinite" />
      </circle>
      <rect x={x + 12} y={y + 26} width={w - 24} height={big ? 32 : 26} rx="2" fill="#04070d" stroke="#1f2b3e" />
      <text x={x + w / 2} y={y + 26 + (big ? 20 : 17)} textAnchor="middle" fontSize={big ? 17 : 15} fontWeight="700" fill={accent} fontFamily="var(--font-mono, monospace)">{main}</text>
      {sub2 ? <text x={x + w / 2} y={y + 26 + (big ? 30 : 25)} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.5)">{sub2}</text> : null}
      {[0, 1, 2].map((i) => (
        <line key={i} x1={x + 16} y1={y + h - 24 + i * 5.5} x2={x + w - 16} y2={y + h - 24 + i * 5.5} stroke="#293650" strokeWidth="2" />
      ))}
      <rect x={x + 10} y={y + (big ? 70 : 62)} width="4" height="13" rx="1.5" fill="#4a5b76" />
      <text x={x + w / 2} y={y + h + 17} textAnchor="middle" fontSize="11" fontWeight="600" fill="rgba(255,255,255,0.8)">{label}</text>
      {sub ? <text x={x + w / 2} y={y + h + 30} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">{sub}</text> : null}
    </g>
  );
}

/** per-machine readout under the active lens — measured by its own machine meter.
 *  THD/PF are basic (any meter reads them); an event only shows if the meter can capture it. */
function machineValue(mode: PqMode, m: Load, meterRank: number): { text: string; color: string } {
  if (mode === "thd") return { text: `${m.ithd}%`, color: m.ithd > 25 ? "#f43f5e" : m.ithd > 12 ? "#f59e0b" : "#34d399" };
  if (mode === "pf") return { text: m.pf.toFixed(2), color: m.pf < 0.85 ? "#f43f5e" : m.pf < 0.92 ? "#f59e0b" : "#67e8f9" };
  if (m.causes && meterRank >= EV_MIN_RANK[m.causes.ev]) return { text: String(m.causes.n), color: EV_HEX[m.causes.ev] };
  if (m.causes) return { text: "—", color: "rgba(255,255,255,0.28)" };
  return { text: "0", color: "rgba(255,255,255,0.35)" };
}

/** health status under the active lens — so the cabinet LED matches the value it shows
 *  (a feeder with great PF must read green in PF mode even if its THD is bad). */
function statusFor(mode: PqMode, x: { ithd: number; pf: number; events: Record<PqEv, number> }, meterRank: number): PqStatus {
  if (mode === "thd") return x.ithd > 5 ? "violation" : x.ithd > 4 ? "watch" : "clean";
  if (mode === "pf") return x.pf < 0.85 ? "violation" : x.pf < 0.92 ? "watch" : "clean";
  const tot = sumEv(detectedEvents(x.events, meterRank));
  return tot > 3 ? "violation" : tot > 0 ? "watch" : "clean";
}

/** the screen value + accent colour for a branch under the active lens */
function screenFor(mode: PqMode, f: { ithd: number; pf: number; dom: string; status: PqStatus; events: Record<PqEv, number> }): { main: string; sub2: string; accent: string } {
  if (mode === "thd") return { main: `${f.ithd.toFixed(1)}%`, sub2: `I-THD · ${f.dom}`, accent: STAT_HEX[f.status] };
  if (mode === "pf") return { main: f.pf.toFixed(2), sub2: "PF true", accent: f.pf < 0.85 ? "#f43f5e" : f.pf < 0.92 ? "#f59e0b" : "#67e8f9" };
  const tot = sumEv(f.events);
  return { main: String(tot), sub2: tot ? "events · today" : "clean", accent: tot ? STAT_HEX[f.status] : "#4a5b76" };
}

export function PqSingleLineDiagram({ meterId = "PM5340", meterRank = 5, setMeterId, meters = [] }: { meterId?: string; meterRank?: number; setMeterId?: (id: string) => void; meters?: { id: string; series: LZ; rank: number }[] }) {
  const { locale } = useI18n();
  const L = (o: LZ) => (locale === "th" ? o.th : o.en);
  const [mode, setMode] = useState<PqMode>("thd");
  const [sel, setSel] = useState<string>("f4");
  const [meterOpen, setMeterOpen] = useState(false);
  const detectsFor = (rank: number) => Object.values(EV_MIN_RANK).filter((r) => rank >= r).length;

  const isMdb = sel === "mdb";
  const isCap = sel === "cap";
  const selF = FEEDERS.find((f) => f.id === sel);
  const selPf = isMdb ? MDB_PQ.pf : selF?.pf ?? 0;
  const selUnb = isMdb ? MDB_PQ.unbalance : selF?.unbalance ?? 0;
  // every disturbance from this branch today (expanded from the machine causes), gated by meter
  const branchCauses = isMdb
    ? MDB_CAUSES
    : selF
      ? selF.loads.flatMap((m) => (m.causes ? [{ ev: m.causes.ev, n: m.causes.n, source: m.name }] : []))
      : [];
  const branchEvents = genEvents(branchCauses, meterRank);
  const totalRaw = FEEDERS.reduce((s, f) => s + sumEv(f.events), 0) + sumEv(MDB_PQ.events);
  const totalEvents = FEEDERS.reduce((s, f) => s + sumEv(detectedEvents(f.events, meterRank)), 0) + sumEv(detectedEvents(MDB_PQ.events, meterRank));
  const hiddenEvents = totalRaw - totalEvents;
  const showAnim = mode === "events";
  // harmonic currents genuinely flow upstream (loads inject → PCC); real power / voltage
  // events flow forward to the loads. So only the THD lens reverses the flow.
  const upstream = mode === "thd";
  const trunk = upstream ? "#f43f5e" : "#22d3ee";

  const MODES: [PqMode, LucideIcon, LZ][] = [
    ["thd", Waves, { en: "Harmonics · THD", th: "ฮาร์มอนิก · THD" }],
    ["events", Activity, { en: "Events", th: "เหตุการณ์" }],
    ["pf", Gauge, { en: "Power factor", th: "เพาเวอร์แฟกเตอร์" }],
  ];

  const mdbStatus = statusFor(mode, { ithd: MDB_PQ.ithd, pf: MDB_PQ.pf, events: MDB_PQ.events }, meterRank);
  const mdbScreen = screenFor(mode, { ithd: MDB_PQ.ithd, pf: MDB_PQ.pf, dom: "H7", status: mdbStatus, events: detectedEvents(MDB_PQ.events, meterRank) });

  return (
    <div>
      <div className="dark-screen rounded-xl border border-white/10 p-2" style={{ background: "#0a0f19" }}>
        {/* lens toggle */}
        <div className="mb-1.5 flex flex-wrap items-center gap-2 px-1">
          <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
            {MODES.map(([id, Ico, lab]) => {
              const on = mode === id;
              return (
                <button key={id} onClick={() => setMode(id)} className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition", on ? "bg-brand-400/15 text-brand-200" : "text-white/45 hover:text-white/75")}>
                  <Ico size={13} /> {L(lab)}
                </button>
              );
            })}
          </div>
          <span className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/55">
            <span className="h-2 w-2 rounded-full" style={{ background: upstream ? "#f43f5e" : "#22d3ee" }} /> {upstream ? L({ en: "distortion flows upstream", th: "ความเพี้ยนไหลย้อนขึ้นต้นทาง" }) : L({ en: "power flows to loads", th: "กำลังไฟไหลไปโหลด" })}
          </span>
          <div className="relative">
            <button
              onClick={() => setMeterOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={meterOpen}
              className="flex items-center gap-1.5 rounded-md border border-brand-400/30 bg-brand-400/[0.08] px-2 py-1 text-[11px] text-white/60 transition hover:bg-brand-400/[0.14]"
            >
              <Cpu size={12} className="text-brand-300" /> {L({ en: "PQ meter", th: "มิเตอร์ PQ" })} · <b className="text-brand-200">{meterId}</b>
              <ChevronDown size={12} className={cn("text-white/45 transition", meterOpen && "rotate-180")} />
            </button>
            {meterOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMeterOpen(false)} />
                <div className="absolute left-0 z-20 mt-1 w-64 overflow-hidden rounded-lg border border-white/12 bg-[#0c1420] p-1 shadow-2xl" role="listbox">
                  <p className="px-2 pb-1 pt-1.5 text-[9.5px] uppercase tracking-wider text-white/35">{L({ en: "PQ meter · every feeder & machine", th: "มิเตอร์ PQ · ทุกฟีดเดอร์และเครื่องจักร" })}</p>
                  {meters.map((m) => {
                    const on = m.id === meterId;
                    const det = detectsFor(m.rank);
                    return (
                      <button
                        key={m.id}
                        role="option"
                        aria-selected={on}
                        onClick={() => { setMeterId?.(m.id); setMeterOpen(false); }}
                        className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition", on ? "bg-brand-400/15 text-brand-200" : "text-white/70 hover:bg-white/[0.06]")}
                      >
                        <span className="w-3.5 shrink-0">{on ? <Check size={12} /> : null}</span>
                        <span className="flex-1 truncate"><b className="tabular">{m.id}</b> <span className="text-[10px] text-white/40">{L(m.series)}</span></span>
                        <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-medium", det === 4 ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/12 text-amber-300")}>{L({ en: "detects", th: "จับ" })} {det}/4</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
          <span className="ml-auto flex items-center gap-1.5 text-[11.5px] text-white/50">
            <Activity size={13} className="text-amber-300" /> {L({ en: "Disturbances today", th: "เหตุการณ์วันนี้" })} <b className="tabular text-amber-300">{totalEvents}</b>
            {hiddenEvents > 0 ? <span className="text-amber-300/70">· {hiddenEvents} {L({ en: "not captured", th: "จับไม่ได้" })}</span> : null}
          </span>
        </div>

        <div className="overflow-x-auto">
          <svg viewBox="0 0 960 474" className="min-w-[780px]" style={{ width: "100%" }}>
            {/* utility grid = point of common coupling */}
            <circle cx="60" cy="64" r="24" fill="none" stroke="#3a4a63" strokeWidth="1.5" />
            <path d="M50 72 L58 58 L62 68 L70 55" stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <text x="60" y="106" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.7)">PCC · 24 kV</text>
            <text x="60" y="118" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">{L({ en: "utility grid", th: "การไฟฟ้า" })}</text>

            <Flow d="M 84 64 H 158" intensity={0.5} color={upstream ? "#f59e0b" : "#22d3ee"} reverse={upstream} />

            {/* transformer */}
            <rect x="158" y="26" width="96" height="76" rx="6" fill="#0e1522" stroke="#3a4a63" />
            <circle cx="196" cy="54" r="15" fill="none" stroke="#22d3ee" strokeWidth="1.8" />
            <circle cx="216" cy="74" r="15" fill="none" stroke="#818cf8" strokeWidth="1.8" />
            <text x="206" y="116" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.7)">TR-1 · 1.6 MVA</text>
            <text x="206" y="128" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">24 kV → 416 V</text>

            <Flow d="M 254 64 H 392" intensity={0.7} color={trunk} reverse={upstream} />

            {/* PQ metering point on the incomer */}
            <g>
              <rect x="308" y="44" width="34" height="30" rx="4" fill="#0b1526" stroke="#22d3ee" strokeWidth="1.3" />
              <circle cx="325" cy="59" r="8" fill="none" stroke="#67e8f9" strokeWidth="1.2" />
              <line x1="325" y1="59" x2="329" y2="54" stroke="#67e8f9" strokeWidth="1.2" strokeLinecap="round" />
              <text x="325" y="88" textAnchor="middle" fontSize="9" fontWeight="700" fill="#67e8f9">{meterId}</text>
              <text x="325" y="99" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.4)">{L({ en: "main PQ meter · PCC", th: "มิเตอร์ PQ หลัก · จุดรับไฟ" })}</text>
            </g>

            {/* MDB */}
            <Cabinet x={394} y={14} w={172} h={116} big label="MDB-1" sub={L({ en: "Main Distribution Board", th: "ตู้เมนจ่ายไฟหลัก" })} main={mdbScreen.main} sub2={mdbScreen.sub2} accent={mdbScreen.accent} status={mdbStatus} uid="mdb" selected={isMdb} onClick={() => setSel("mdb")} />

            <Flow d="M 480 132 V 196" intensity={0.7} color={trunk} reverse={upstream} />

            {/* capacitor bank — shunt on the bus, H7 resonance */}
            <g onClick={() => setSel("cap")} style={{ cursor: "pointer" }}>
              {isCap ? <rect x={663} y={106} width={74} height={62} rx="6" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" /> : null}
              <circle cx="700" cy="137" r="30" fill="none" stroke="#f43f5e" strokeWidth="1.2" opacity="0.5">
                <animate attributeName="r" values="24;34" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <rect x="672" y="112" width="56" height="46" rx="4" fill="#160d14" stroke="#f43f5e" strokeWidth="1.1" />
              <line x1="684" y1="126" x2="716" y2="126" stroke="#fda4af" strokeWidth="2" />
              <line x1="684" y1="132" x2="716" y2="132" stroke="#fda4af" strokeWidth="2" />
              <line x1="700" y1="112" x2="700" y2="126" stroke="#fda4af" strokeWidth="1.3" />
              <line x1="700" y1="132" x2="700" y2="146" stroke="#fda4af" strokeWidth="1.3" />
              <text x="700" y="153" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#fda4af">500 kVAR</text>
              <text x="700" y="176" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="rgba(255,255,255,0.75)">{L({ en: "Capacitor Bank", th: "คาปาซิเตอร์แบงก์" })}</text>
              <text x="700" y="188" textAnchor="middle" fontSize="8.5" fill="#f87171">⚠ {L({ en: "H7 resonance", th: "เรโซแนนซ์ H7" })}</text>
            </g>
            <path d="M 700 158 V 196" stroke="#f43f5e" strokeWidth="1.6" strokeDasharray="3 3" opacity="0.7" />

            {/* busbar */}
            <rect x="100" y="196" width="770" height="6" rx="3" fill="#3a4a63" />
            <rect x="100" y="196" width="770" height="6" rx="3" fill="#22d3ee" opacity="0.15">
              <animate attributeName="opacity" values="0.1;0.3;0.1" dur="2.4s" repeatCount="indefinite" />
            </rect>
            <text x="880" y="204" fontSize="9" fill="rgba(255,255,255,0.45)">BUS</text>

            {/* feeder drops + cabinets */}
            {FEEDERS.map((f, i) => {
              const cx = FEEDER_X[i];
              const detFor = detectedEvents(f.events, meterRank);
              const fStatus = statusFor(mode, f, meterRank);
              const sc = screenFor(mode, { ...f, status: fStatus, events: detFor });
              // only disturbances this meter can actually capture surface as a source here
              const srcVisible = f.sourceOf.filter((ev) => meterRank >= EV_MIN_RANK[ev]);
              const intensity = Math.min(1, (f.ithd - 2) / 5);
              const flowColor = fStatus === "violation" ? "#f43f5e" : fStatus === "watch" ? "#f59e0b" : "#818cf8";
              return (
                <g key={f.id}>
                  <Flow d={`M ${cx} 202 V 252`} intensity={intensity} color={flowColor} reverse={upstream} />
                  {/* per-feeder PQ meter — tapped on the drop; this is what localises the source */}
                  <g>
                    <circle cx={cx} cy={224} r="7" fill="#0b1526" stroke="#22d3ee" strokeWidth="1.2" />
                    <line x1={cx - 3.5} y1={227.5} x2={cx + 3.5} y2={220.5} stroke="#67e8f9" strokeWidth="1.1" strokeLinecap="round" />
                  </g>
                  {/* disturbance source markers (events lens) — only what the meter can see */}
                  {showAnim && srcVisible.map((ev) => (
                    <g key={ev}>
                      <circle cx={cx} cy={246} r="6" fill="none" stroke={EV_HEX[ev]} strokeWidth="1.6" opacity="0.8">
                        <animate attributeName="r" values="6;20" dur="1.6s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0" dur="1.6s" repeatCount="indefinite" />
                      </circle>
                    </g>
                  ))}
                  <Cabinet x={cx - 52} y={254} label={f.name} main={sc.main} sub2={sc.sub2} accent={sc.accent} status={fStatus} selected={sel === f.id} onClick={() => setSel(f.id)} uid={f.id} />
                  {/* always-on source tag — hidden if the selected meter can't detect it */}
                  {srcVisible.length ? (
                    <g>
                      <rect x={cx - 52} y={242} width={srcVisible.length * 30 + 6} height={13} rx="3" fill={`${EV_HEX[srcVisible[0]]}22`} stroke={`${EV_HEX[srcVisible[0]]}66`} strokeWidth="0.6" />
                      <text x={cx - 46} y={251.5} fontSize="7.5" fontWeight="700" fill={EV_HEX[srcVisible[0]]}>{srcVisible.map((e) => L(EV_LABEL[e])).join(" ")}</text>
                    </g>
                  ) : null}
                  {/* machine line-diagram — the loads that hang off this feeder, drawn as
                      isometric glyphs tapped onto a sub-bus (routed left of the name label) */}
                  {(() => {
                    const ms = f.loads;
                    const gW = 27, gap = 6;
                    const rowW = ms.length * gW + (ms.length - 1) * gap;
                    const sx = cx - rowW / 2;
                    const busY = 400, meterY = 409, gTop = 421;
                    return (
                      <g>
                        <path d={`M ${cx - 52} 359 V ${busY} H ${sx + 2}`} stroke="#2a3a52" strokeWidth="1.4" fill="none" />
                        <line x1={sx} y1={busY} x2={sx + rowW} y2={busY} stroke="#3a4a63" strokeWidth="2" strokeLinecap="round" />
                        {ms.map((m, mi) => {
                          const mx = sx + mi * (gW + gap);
                          const mcx = mx + gW / 2;
                          const acc = m.nonlinear ? "#f59e0b" : "#34d399";
                          return (
                            <g key={m.name}>
                              <line x1={mcx} y1={busY} x2={mcx} y2={gTop} stroke="#2a3a52" strokeWidth="1.2" />
                              {/* machine-level PQ meter — makes the per-machine contribution measured, not estimated */}
                              <circle cx={mcx} cy={meterY} r="3.6" fill="#0b1526" stroke="#22d3ee" strokeWidth="1" />
                              <line x1={mcx - 2} y1={meterY + 1.6} x2={mcx + 2} y2={meterY - 1.6} stroke="#67e8f9" strokeWidth="0.9" strokeLinecap="round" />
                              <rect x={mx - 1} y={gTop - 1} width={gW + 2} height={gW} rx="3" fill="#0a0f19" stroke={m.nonlinear ? "#f59e0b44" : "#ffffff12"} strokeWidth="0.8" />
                              <g transform={`translate(${mx} ${gTop - 4}) scale(${gW / 64})`}>{machineArt(m.mtype, acc)}</g>
                              {(() => { const mv = machineValue(mode, m, meterRank); return <text x={mcx} y={gTop + gW + 8} textAnchor="middle" fontSize="9" fontWeight="700" fill={mv.color} fontFamily="var(--font-mono, monospace)">{mv.text}</text>; })()}
                            </g>
                          );
                        })}
                      </g>
                    );
                  })()}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* selected-branch readout */}
      <BranchReadout L={L} mode={mode} isMdb={isMdb} isCap={isCap} f={selF} meterId={meterId} meterRank={meterRank} />

      {/* detail — per-branch phasor (folded in from the old Three-Phase panel) + loads */}
      {isCap ? (
        <div className="mt-2 rounded-lg border border-white/8 bg-white/[0.02] p-3 text-[12px] leading-relaxed text-white/55">
          {L({ en: "The capacitor bank is a shunt element — no per-phase phasor. Its issue is H7 parallel resonance; see the mitigation plan (PQ-01).", th: "คาปาซิเตอร์แบงก์เป็นอุปกรณ์ต่อขนาน (shunt) ไม่มี phasor รายเฟส — ปัญหาคือเรโซแนนซ์ขนาน H7 ดูแผนแก้ที่ PQ-01" })}
        </div>
      ) : (
        <div className="mt-2 grid gap-2 lg:grid-cols-[300px_1fr]">
          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{L({ en: "Phasor · V vs I", th: "เฟสเซอร์ · V เทียบ I" })}</p>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {L({ en: "streaming", th: "กำลังสตรีม" })}</span>
            </div>
            <div className="dark-screen rounded-md border border-white/10 p-1" style={{ background: "#0a0f19" }}>
              <FeederPhasor pf={selPf} unbalance={selUnb} />
            </div>
          </div>

          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{L({ en: "Event Log · today", th: "บันทึกเหตุการณ์ · วันนี้" })}</p>
              <span className="chip text-[10px]">{branchEvents.length} {L({ en: "events", th: "เหตุการณ์" })}</span>
            </div>
            {branchEvents.length ? (
              <div className="max-h-[320px] space-y-1.5 overflow-y-auto pr-1 scrollbar-hide">
                {branchEvents.map((e, ei) => (
                  <div key={`${e.source}-${e.at}-${ei}`} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-md border border-white/8 bg-white/[0.02] px-2.5 py-1.5 text-[11.5px]">
                    <span className="tabular text-white/45">{e.at}</span>
                    <span className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium" style={{ color: EV_HEX[e.type], borderColor: `${EV_HEX[e.type]}44`, backgroundColor: `${EV_HEX[e.type]}14` }}>{L(EV_LABEL[e.type])}</span>
                    <span className="min-w-[120px] flex-1 text-white/70">{L(e.detail)}</span>
                    <span className="text-white/40">{e.source} · {e.phase}</span>
                    <span className={cn("rounded-full border px-1.5 py-0.5 text-[9.5px] font-medium", e.itic === "violation" ? "border-rose-400/30 bg-rose-400/10 text-rose-300" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300")}>{e.itic === "violation" ? "ITIC ✗" : "ITIC ✓"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-2 text-[12px] text-white/45">{L({ en: "No disturbances recorded from this point today.", th: "วันนี้ไม่มีเหตุการณ์ผิดปกติจากจุดนี้" })}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BranchReadout({ L, mode, isMdb, isCap, f, meterId, meterRank }: { L: (o: LZ) => string; mode: PqMode; isMdb: boolean; isCap: boolean; f?: PqFeeder; meterId: string; meterRank: number }) {
  const name = isMdb ? "MDB-1" : isCap ? L({ en: "Capacitor Bank · 500 kVAR", th: "คาปาซิเตอร์แบงก์ · 500 kVAR" }) : f?.name ?? "";
  const data = isMdb ? MDB_PQ : f;
  const note = isCap ? { en: "Parallel resonance sits on H7 — switching transients up to 1.9 kV. Fix: 7% detuned reactor (PQ-01).", th: "เรโซแนนซ์ขนานตรงกับ H7 — transient สลับสูงถึง 1.9 kV แก้ด้วย detuned reactor 7% (PQ-01)" } : isMdb ? MDB_PQ.note : f?.note;
  const noteStatus: PqStatus = isCap || isMdb ? "violation" : f?.status ?? "clean";

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-white/8 bg-white/[0.02] px-3.5 py-2 text-[12px]">
      <span className="font-semibold text-white/85">{name}</span>
      {!isCap ? (
        <span className="inline-flex items-center gap-1 rounded-md border border-brand-400/25 bg-brand-400/[0.06] px-1.5 py-0.5 text-[10.5px] font-medium text-brand-200">
          <Cpu size={10} /> {isMdb ? L({ en: "main meter", th: "มิเตอร์หลัก" }) : L({ en: "feeder meter", th: "มิเตอร์ประจำตู้" })} · {meterId}
        </span>
      ) : null}
      {isCap ? (
        <>
          <span className="text-white/50">{L({ en: "Dominant", th: "ฮาร์มอนิกเด่น" })} <b className="tabular text-rose-300">H7</b></span>
          <span className="text-white/50">{L({ en: "Rating", th: "พิกัด" })} <b className="tabular text-white/80">500 kVAR</b></span>
          <span className="text-white/50">{L({ en: "Worst transient", th: "transient หนักสุด" })} <b className="tabular text-rose-300">1.9 kV</b></span>
        </>
      ) : mode === "thd" && data ? (
        <>
          <span className="text-white/50">I-THD <b className={cn("tabular", data.ithd > 5 ? "text-rose-300" : data.ithd > 4 ? "text-amber-300" : "text-white/80")}>{data.ithd.toFixed(1)}%</b></span>
          <span className="text-white/50">V-THD <b className="tabular text-white/80">{data.vthd.toFixed(1)}%</b></span>
          <span className="text-white/50">{L({ en: "Dominant", th: "ฮาร์มอนิกเด่น" })} <b className="tabular text-white/80">{isMdb ? "H7" : f?.dom}</b></span>
          <span className="text-white/50">{L({ en: "Unbalance", th: "ไม่สมดุล" })} <b className="tabular text-white/80">{data.unbalance.toFixed(1)}%</b></span>
        </>
      ) : mode === "pf" && data ? (
        <>
          <span className="text-white/50">PF {L({ en: "true", th: "จริง" })} <b className={cn("tabular", data.pf < 0.85 ? "text-rose-300" : data.pf < 0.92 ? "text-amber-300" : "text-white/80")}>{data.pf.toFixed(2)}</b></span>
          <span className="text-white/50">PF displacement <b className="tabular text-white/80">{data.pfDisp.toFixed(2)}</b></span>
          <span className="text-white/50">{L({ en: "Distortion gap", th: "ส่วนต่างจากความเพี้ยน" })} <b className="tabular text-white/80">{(data.pfDisp - data.pf).toFixed(2)}</b></span>
        </>
      ) : data ? (
        <>
          {(Object.keys(EV_LABEL) as PqEv[]).map((ev) => {
            const det = meterRank >= EV_MIN_RANK[ev];
            return (
              <span key={ev} className="text-white/50">{L(EV_LABEL[ev])} {det ? (
                <b className="tabular" style={{ color: data.events[ev] ? EV_HEX[ev] : "rgba(255,255,255,0.5)" }}>{data.events[ev]}</b>
              ) : (
                <b className="tabular text-white/25" title={L({ en: "not captured by this meter", th: "มิเตอร์รุ่นนี้จับไม่ได้" })}>—</b>
              )}</span>
            );
          })}
        </>
      ) : null}
      {note ? (
        <span className={cn("ml-auto rounded-md px-2 py-0.5 text-[11px] font-medium", noteStatus === "violation" ? "bg-rose-500/12 text-rose-300" : noteStatus === "watch" ? "bg-amber-500/12 text-amber-300" : "bg-emerald-500/12 text-emerald-300")}>{L(note)}</span>
      ) : (
        <span className="ml-auto text-[11px] text-white/35">{L({ en: "click a cabinet / cap bank to inspect", th: "คลิกตู้ หรือคาปาซิเตอร์ เพื่อดูรายละเอียด" })}</span>
      )}
    </div>
  );
}

/** Compact per-branch phasor — solid V vectors, dashed I vectors lagging by φ = acos(PF);
 *  phase magnitudes fan out by the branch's unbalance. Folded in from the standalone
 *  Three-Phase panel so the "phase-angle" view lives contextually on the selected feeder. */
function FeederPhasor({ pf, unbalance }: { pf: number; unbalance: number }) {
  const cx = 110, cy = 108, R = 82;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const pt = (ang: number, r: number) => [r2(cx + r * Math.cos((ang * Math.PI) / 180)), r2(cy - r * Math.sin((ang * Math.PI) / 180))] as const;
  const phi = (Math.acos(Math.min(1, Math.max(0, pf))) * 180) / Math.PI;
  const PH = [
    { id: "L1", color: "#22d3ee", ang: 0, vf: 1 },
    { id: "L2", color: "#818cf8", ang: 120, vf: 1 - unbalance / 100 },
    { id: "L3", color: "#34d399", ang: 240, vf: 1 - unbalance / 60 },
  ];
  const [a1x, a1y] = pt(0, 42);
  const [a2x, a2y] = pt(-phi, 42);
  return (
    <svg viewBox="0 0 220 214" className="w-full">
      <text x="110" y="13" textAnchor="middle" fontSize="11" fontWeight="600" fill="#fbbf24" fontFamily="var(--font-mono, monospace)">φ {phi.toFixed(1)}° · PF {pf.toFixed(2)}</text>
      {[27, 54, R].map((r, i) => (
        <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray={i < 2 ? "2 5" : undefined} />
      ))}
      {Array.from({ length: 36 }, (_, i) => {
        const long = i % 3 === 0;
        const [x1, y1] = pt(i * 10, R + 2);
        const [x2, y2] = pt(i * 10, R + (long ? 7 : 4));
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={long ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.07)"} strokeWidth="1" />;
      })}
      <line x1={cx - 6} y1={cy} x2={cx + 6} y2={cy} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      {PH.map((p) => {
        const vLen = (R - 8) * p.vf;
        const iLen = 52 * p.vf;
        const iAng = p.ang - phi;
        const [vx, vy] = pt(p.ang, vLen);
        const [ix, iy] = pt(iAng, iLen);
        const [lx, ly] = pt(p.ang, R + 15);
        const b = (p.ang * Math.PI) / 180, bi = (iAng * Math.PI) / 180;
        return (
          <g key={p.id}>
            <line x1={cx} y1={cy} x2={vx} y2={vy} stroke={p.color} strokeWidth="5" opacity="0.14" strokeLinecap="round" />
            <line x1={cx} y1={cy} x2={vx} y2={vy} stroke={p.color} strokeWidth="2.2" strokeLinecap="round" />
            <path d={`M${vx},${vy} L${r2(vx - 8 * Math.cos(b - 0.42))},${r2(vy + 8 * Math.sin(b - 0.42))} L${r2(vx - 8 * Math.cos(b + 0.42))},${r2(vy + 8 * Math.sin(b + 0.42))} Z`} fill={p.color} />
            <line x1={cx} y1={cy} x2={ix} y2={iy} stroke={p.color} strokeWidth="1.4" strokeDasharray="5 4" opacity="0.8" />
            <path d={`M${ix},${iy} L${r2(ix - 6 * Math.cos(bi - 0.42))},${r2(iy + 6 * Math.sin(bi - 0.42))} L${r2(ix - 6 * Math.cos(bi + 0.42))},${r2(iy + 6 * Math.sin(bi + 0.42))} Z`} fill={p.color} opacity="0.75" />
            <text x={lx} y={ly + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill={p.color} fontFamily="var(--font-mono, monospace)">{p.id}</text>
          </g>
        );
      })}
      {phi > 1 ? <path d={`M${a1x},${a1y} A42,42 0 0 0 ${a2x},${a2y}`} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" /> : null}
      <text x="110" y="208" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.3)" letterSpacing="1.5">V — SOLID · I — DASHED</text>
    </svg>
  );
}

/** Isometric 3D machine illustrations keyed by type — a chiller reads as a chiller, a
 *  cooling tower as a tower with a fan, a pump as a volute + motor. The `accent` colour
 *  glows the machine's electrical part (amber = non-linear harmonic source). Static SVG
 *  (no random) so it hydrates cleanly. Faces derive from one steel base via shade(). */
/** the raw machine art (0-64 × 0-58 space) — used both as an HTML <svg> card icon and,
 *  via a <g transform>, placed directly inside the SLD's line diagram. */
function machineArt(type: string, accent: string): ReactNode {
  const steel = "#39465a";
  const top = shade(steel, 1.32), side = shade(steel, 0.52), edge = shade(steel, 1.1);
  // isometric box helper: front + top + right faces
  const box = (x: number, y: number, w: number, h: number, d: number, base = steel) => (
    <>
      <polygon points={`${x},${y} ${x + d},${y - d} ${x + w + d},${y - d} ${x + w},${y}`} fill={shade(base, 1.32)} />
      <polygon points={`${x + w},${y} ${x + w + d},${y - d} ${x + w + d},${y + h - d} ${x + w},${y + h}`} fill={shade(base, 0.52)} />
      <rect x={x} y={y} width={w} height={h} fill={base} stroke={edge} strokeWidth="0.5" />
    </>
  );
  const wrap = (children: ReactNode) => children;

  switch (type) {
    case "chiller":
      return wrap(<>
        <rect x="6" y="46" width="46" height="4" rx="1" fill="#161c26" />
        {box(8, 26, 40, 20, 5)}
        <ellipse cx="20" cy="21" rx="6" ry="2.6" fill={shade(steel, 0.7)} /><rect x="14" y="16" width="12" height="6" fill={shade(steel, 0.9)} /><ellipse cx="20" cy="16" rx="6" ry="2.6" fill={top} />
        <ellipse cx="34" cy="21" rx="6" ry="2.6" fill={shade(steel, 0.7)} /><rect x="28" y="16" width="12" height="6" fill={shade(steel, 0.9)} /><ellipse cx="34" cy="16" rx="6" ry="2.6" fill={top} />
        <rect x="12" y="31" width="9" height="9" rx="1" fill="#04121f" stroke={accent} strokeWidth="0.8" />
        <line x1="14" y1="34" x2="19" y2="34" stroke={accent} strokeWidth="0.8" /><line x1="14" y1="37" x2="18" y2="37" stroke={accent} strokeWidth="0.6" opacity="0.6" />
        <circle cx="46" cy="33" r="2.4" fill="none" stroke="#22d3ee" strokeWidth="1.4" /><rect x="47" y="32" width="8" height="2" fill="#22d3ee" opacity="0.8" />
        <circle cx="46" cy="40" r="2.4" fill="none" stroke="#f59e0b" strokeWidth="1.4" /><rect x="47" y="39" width="8" height="2" fill="#f59e0b" opacity="0.8" />
      </>);
    case "coolingTower":
      return wrap(<>
        <rect x="10" y="44" width="40" height="7" rx="1" fill="#0c1a24" /><rect x="12" y="46" width="36" height="3" fill="#22d3ee" opacity="0.5" />
        {box(14, 22, 32, 22, 5)}
        {[0, 1, 2, 3].map((i) => <line key={i} x1="14" y1={26 + i * 4.5} x2="46" y2={26 + i * 4.5} stroke={side} strokeWidth="1.4" />)}
        <ellipse cx="30" cy="20" rx="17" ry="5" fill={shade(steel, 0.8)} /><ellipse cx="30" cy="18" rx="17" ry="5" fill={top} />
        <g transform="translate(30 18)">
          {[0, 60, 120, 180, 240, 300].map((a) => <ellipse key={a} cx="0" cy="0" rx="14" ry="3" fill={accent} opacity="0.85" transform={`rotate(${a})`} />)}
          <circle r="3" fill={shade(steel, 1.15)} />
        </g>
        <path d="M22 12 q3 -4 6 0" stroke="#9fe6ff" strokeWidth="1" fill="none" opacity="0.5" /><path d="M34 11 q3 -4 6 0" stroke="#9fe6ff" strokeWidth="1" fill="none" opacity="0.4" />
      </>);
    case "pump":
      return wrap(<>
        <rect x="6" y="44" width="50" height="6" rx="1" fill="#161c26" />
        <rect x="26" y="28" width="26" height="14" rx="3" fill={steel} /><rect x="26" y="28" width="26" height="4" rx="2" fill={top} />
        {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={30 + i * 4.5} y1="30" x2={30 + i * 4.5} y2="40" stroke={side} strokeWidth="1" opacity="0.6" />)}
        <circle cx="16" cy="36" r="11" fill={shade(steel, 0.85)} /><circle cx="16" cy="36" r="11" fill="none" stroke={accent} strokeWidth="1.4" /><circle cx="16" cy="36" r="4" fill={shade(steel, 0.55)} />
        <rect x="13" y="20" width="6" height="7" fill={shade(steel, 0.7)} /><rect x="2" y="33" width="5" height="6" fill={shade(steel, 0.7)} />
      </>);
    case "compressor":
      return wrap(<>
        <rect x="4" y="46" width="52" height="4" rx="1" fill="#161c26" />
        {box(6, 26, 30, 20, 5)}
        <rect x="10" y="30" width="9" height="7" rx="1" fill="#04121f" stroke={accent} strokeWidth="0.8" />
        {[0, 1, 2].map((i) => <line key={i} x1="22" y1={31 + i * 3.5} x2="33" y2={31 + i * 3.5} stroke={side} strokeWidth="1.2" />)}
        <rect x="42" y="24" width="12" height="22" rx="6" fill={shade(steel, 0.8)} /><ellipse cx="48" cy="24" rx="6" ry="2.4" fill={top} />
        <path d="M36 30 h6" stroke="#9fb4c9" strokeWidth="1.6" fill="none" />
      </>);
    case "welder":
    case "robot":
      return wrap(<>
        <rect x="10" y="46" width="30" height="4" rx="1" fill="#161c26" />
        <rect x="18" y="38" width="14" height="9" rx="2" fill={steel} /><ellipse cx="25" cy="38" rx="7" ry="2.4" fill={top} />
        <rect x="22.5" y="20" width="5" height="20" rx="2.5" fill={shade(accent, 0.9)} transform="rotate(12 25 30)" />
        <rect x="30" y="14" width="4" height="16" rx="2" fill={shade(accent, 1.05)} transform="rotate(58 40 20)" />
        <circle cx="46" cy="24" r="2" fill="#cbd5e1" />
        {type === "welder" ? <><path d="M46 26 l-2 3 l3 -1 l-2 4" stroke="#fde68a" strokeWidth="1.2" fill="none" /><circle cx="45" cy="34" r="3" fill="#fde68a" opacity="0.35" /></> : null}
      </>);
    case "press":
    case "imm":
      return wrap(<>
        <rect x="10" y="48" width="44" height="4" rx="1" fill="#161c26" />
        <path d="M16 12 h28 v10 h-14 v14 h14 v10 h-28 z" fill={steel} stroke={edge} strokeWidth="0.6" />
        <circle cx="40" cy="17" r="6" fill={shade(steel, 0.7)} stroke={accent} strokeWidth="1.2" /><circle cx="40" cy="17" r="2" fill={accent} />
        <rect x="28" y="24" width="12" height="6" fill={shade(accent, 0.85)} />
        <rect x="26" y="38" width="16" height="4" fill={shade(steel, 0.8)} />
      </>);
    case "cnc":
      return wrap(<>
        <rect x="6" y="46" width="48" height="4" rx="1" fill="#161c26" />
        {box(8, 22, 34, 24, 5)}
        <rect x="12" y="26" width="16" height="14" rx="1" fill="#04121f" stroke={edge} strokeWidth="0.6" />
        <rect x="18" y="28" width="4" height="6" fill="#9fb4c9" /><rect x="19" y="34" width="2" height="3" fill={accent} />
        <rect x="44" y="26" width="9" height="12" rx="1" fill="#04121f" stroke={accent} strokeWidth="0.8" />
        <line x1="46" y1="30" x2="51" y2="30" stroke={accent} strokeWidth="0.8" /><line x1="46" y1="33" x2="50" y2="33" stroke={accent} strokeWidth="0.6" opacity="0.6" />
      </>);
    case "ahu":
      return wrap(<>
        <rect x="6" y="46" width="48" height="4" rx="1" fill="#161c26" />
        {box(8, 22, 40, 24, 5)}
        {[0, 1, 2, 3].map((i) => <line key={i} x1="12" y1={26 + i * 4.5} x2="26" y2={26 + i * 4.5} stroke={side} strokeWidth="1.4" />)}
        <g transform="translate(38 34)"><circle r="8" fill="none" stroke={shade(steel, 1.1)} strokeWidth="1.4" />{[0, 90, 180, 270].map((a) => <ellipse key={a} cx="0" cy="0" rx="6" ry="2" fill={accent} opacity="0.8" transform={`rotate(${a})`} />)}<circle r="1.6" fill={shade(steel, 1.2)} /></g>
      </>);
    default:
      return wrap(<>
        <rect x="14" y="48" width="36" height="3" rx="1" fill="#161c26" />
        {box(16, 20, 28, 28, 5)}
        <circle cx="39" cy="24" r="2" fill={accent} style={{ filter: `drop-shadow(0 0 2px ${accent})` }} />
        {[0, 1, 2, 3].map((i) => <line key={i} x1="20" y1={30 + i * 4} x2="40" y2={30 + i * 4} stroke={side} strokeWidth="1.4" />)}
      </>);
  }
}

