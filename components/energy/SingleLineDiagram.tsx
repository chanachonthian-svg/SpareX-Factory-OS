"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Zap, Coins, Palette } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { assets, STATUS_HEX, type Asset } from "@/lib/factory";
import { cn } from "@/lib/utils";

type LZ = { en: string; th: string };
type FlowMode = "kw" | "cost";

/** scale a hex colour's RGB by a factor (for extrude highlight/shadow faces) */
function shade(hex: string, f: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  const r = c((n >> 16) & 255), g = c((n >> 8) & 255), b = c(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** standard cabinet chassis colours; user may also pick a custom one */
const CAB_PRESETS: { id: string; label: LZ; base: string }[] = [
  { id: "steel", label: { en: "Steel", th: "เหล็ก" }, base: "#2c3850" },
  { id: "graphite", label: { en: "Graphite", th: "กราไฟต์" }, base: "#363a42" },
  { id: "navy", label: { en: "Navy", th: "กรมท่า" }, base: "#243657" },
  { id: "teal", label: { en: "Teal", th: "เขียวทะเล" }, base: "#1d4a48" },
  { id: "indigo", label: { en: "Indigo", th: "คราม" }, base: "#342c5e" },
  { id: "copper", label: { en: "Copper", th: "ทองแดง" }, base: "#4a352c" },
];
const CAB_COLOR_KEY = "factoryos:sld-cab-color";

/** feeder cabinets hanging off the main busbar — kW aggregated from the canonical
 *  20-machine fleet in lib/factory, grouped by electrical line */
const sumLines = (lines: string[]) => assets.filter((a) => lines.includes(a.line)).reduce((s, a) => s + a.powerKw, 0);
type FeederStatus = "ok" | "warn" | "crit";
const FEEDERS: { id: string; name: string; sub: LZ; lines: string[]; kw: number; pf: number; status: FeederStatus; note?: LZ }[] = [
  { id: "f1", name: "DB-A · Line A", sub: { en: "CNC · Palletizer", th: "CNC · Palletizer" }, lines: ["Line A"], kw: sumLines(["Line A"]), pf: 0.96, status: "ok" },
  { id: "f2", name: "DB-B · Line B", sub: { en: "Press · Weld · QC", th: "Press · Weld · QC" }, lines: ["Line B"], kw: sumLines(["Line B"]), pf: 0.95, status: "warn", note: { en: "Stamping Press 03 vibration — RUL ~6 d", th: "Stamping Press 03 สั่นผิดปกติ — RUL ~6 วัน" } },
  { id: "f3", name: "DB-C · Line C", sub: { en: "IMM · Paint · AMR", th: "IMM · Paint · AMR" }, lines: ["Line C", "Logistics"], kw: sumLines(["Line C", "Logistics"]), pf: 0.96, status: "ok" },
  { id: "f4", name: "DB-COOL · Cooling", sub: { en: "Chillers · CT · Pump", th: "Chillers · CT · Pump" }, lines: ["Cooling"], kw: sumLines(["Cooling"]), pf: 0.97, status: "crit", note: { en: "Chiller B critical — condenser fouling, RUL ~3 d", th: "Chiller B วิกฤต — คอนเดนเซอร์อุดตัน RUL ~3 วัน" } },
  { id: "f5", name: "DB-CA · Compressed Air", sub: { en: "Air Station", th: "Air Station" }, lines: ["Compressed Air"], kw: sumLines(["Compressed Air"]), pf: 0.83, status: "warn", note: { en: "PF below 0.85 — see Power Quality", th: "PF ต่ำกว่า 0.85 — ดูต่อใน Power Quality" } },
  { id: "f6", name: "DB-FAC · Facilities", sub: { en: "Steam · HVAC · Env", th: "Steam · HVAC · Env" }, lines: ["Steam", "HVAC", "Environmental", "Electrical"], kw: sumLines(["Steam", "HVAC", "Environmental", "Electrical"]), pf: 0.94, status: "ok" },
];
const FEEDER_X = [120, 268, 416, 564, 712, 856];

/** animated flow — dash speed scales with load; power mode = cyan electrons,
 *  cost mode = gold coins draining outward (same physics, monetized) */
function Flow({ d, kw, tone = "ok", mode = "kw" }: { d: string; kw: number; tone?: FeederStatus; mode?: FlowMode }) {
  const dur = Math.max(0.55, 1.7 - kw / 700);
  const cost = mode === "cost";
  const color = cost ? "#fbbf24" : tone === "crit" ? "#f43f5e" : tone === "warn" ? "#f59e0b" : "#22d3ee";
  return (
    <g>
      <path d={d} stroke="#1f2a3d" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d={d} stroke={color} strokeWidth="2.2" fill="none" strokeDasharray="7 9" strokeLinecap="round" opacity="0.9">
        <animate attributeName="stroke-dashoffset" from="32" to="0" dur={`${dur}s`} repeatCount="indefinite" />
      </path>
      {cost ? (
        <circle r="3.6" fill="#fde68a" stroke="#f59e0b" strokeWidth="0.8" opacity="0.95">
          <animateMotion dur={`${dur * 2.2}s`} repeatCount="indefinite" path={d} />
        </circle>
      ) : (
        <circle r="3.2" fill="#a5f3fc" opacity="0.9">
          <animateMotion dur={`${dur * 2.2}s`} repeatCount="indefinite" path={d} />
        </circle>
      )}
    </g>
  );
}

/** isometric 3D electrical cabinet — extruded top/side faces, vents, handle, LED, kW screen */
function Cabinet({
  x, y, w = 104, h = 112, label, sub, kw, status, big, selected, onClick, mode = "kw", rate = 4.19,
  base = "#2c3850", uid,
}: {
  x: number; y: number; w?: number; h?: number; label: string; sub?: string;
  kw: number; status: FeederStatus; big?: boolean; selected?: boolean; onClick?: () => void;
  mode?: FlowMode; rate?: number; base?: string; uid: string;
}) {
  const led = status === "crit" ? "#f43f5e" : status === "warn" ? "#f59e0b" : "#34d399";
  const cost = mode === "cost";
  const screen = cost ? `฿${Math.round(kw * rate).toLocaleString()}/h` : `${Math.round(kw).toLocaleString()} kW`;
  // per-cabinet 3D faces + gradient derived from its own base colour
  const top = shade(base, 1.34), side = shade(base, 0.42), edge = shade(base, 1.12);
  const gid = `cab-${uid}`;
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
        <animate attributeName="opacity" values={status === "ok" ? "1;0.55;1" : "1;0.25;1"} dur={status === "crit" ? "0.6s" : status === "warn" ? "0.9s" : "2.2s"} repeatCount="indefinite" />
      </circle>
      <rect x={x + 12} y={y + 26} width={w - 24} height={big ? 30 : 24} rx="2" fill="#04070d" stroke="#1f2b3e" />
      <text x={x + w / 2} y={y + 26 + (big ? 21 : 17)} textAnchor="middle" fontSize={big ? (cost ? 14 : 16) : (cost ? 12 : 13)} fontWeight="700" fill={cost ? "#fbbf24" : "#67e8f9"} fontFamily="var(--font-mono, monospace)">
        {screen}
      </text>
      {big ? <text x={x + w / 2} y={y + 72} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.45)">ACB 2000 A · 416 V</text> : null}
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1={x + 16} y1={y + h - 28 + i * 5.5} x2={x + w - 16} y2={y + h - 28 + i * 5.5} stroke="#293650" strokeWidth="2" />
      ))}
      <rect x={x + 10} y={y + (big ? 78 : 58)} width="4" height="14" rx="1.5" fill="#4a5b76" />
      <text x={x + w / 2} y={y + h + 17} textAnchor="middle" fontSize="11" fontWeight="600" fill="rgba(255,255,255,0.8)">{label}</text>
      {sub ? <text x={x + w / 2} y={y + h + 30} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">{sub}</text> : null}
    </g>
  );
}

export function SingleLineDiagram() {
  const { locale } = useI18n();
  const L = (o: LZ) => (locale === "th" ? o.th : o.en);
  const [kws, setKws] = useState<Record<string, number>>(() => Object.fromEntries(FEEDERS.map((f) => [f.id, f.kw])));
  const [sel, setSel] = useState<string>("f1");
  const [mode, setMode] = useState<FlowMode>("kw");
  const [rate, setRate] = useState(4.19); // ฿/kWh at the current TOU block; real value set on client
  const [cabColors, setCabColors] = useState<Record<string, string>>({}); // per-cabinet chassis colour, persisted

  useEffect(() => {
    const saved = localStorage.getItem(CAB_COLOR_KEY);
    if (!saved) return;
    try {
      const o = JSON.parse(saved);
      if (o && typeof o === "object" && !Array.isArray(o)) setCabColors(o);
    } catch {
      /* legacy single-colour value — ignore */
    }
  }, []);
  const DEFAULT_CAB = "#2c3850";
  const colorOf = (id: string) => cabColors[id] ?? DEFAULT_CAB;
  // paint the currently-selected cabinet only
  const pickColor = (hex: string) =>
    setCabColors((m) => {
      const next = { ...m, [sel]: hex };
      localStorage.setItem(CAB_COLOR_KEY, JSON.stringify(next));
      return next;
    });

  useEffect(() => {
    const tick = () => {
      setKws(() => Object.fromEntries(FEEDERS.map((f) => [f.id, f.kw * (1 + (Math.random() - 0.5) * 0.07)])));
      const h = new Date().getHours();
      setRate(h >= 9 && h < 22 ? 4.19 : 2.6);
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, []);

  const cost = mode === "cost";
  const peakNow = rate >= 4;
  const total = FEEDERS.reduce((s, f) => s + (kws[f.id] ?? f.kw), 0);
  const totalCostHr = Math.round(total * rate);
  // selection can be the MDB or any feeder — both are colourable, only feeders inspect machines
  const isMdb = sel === "mdb";
  const selF = FEEDERS.find((f) => f.id === sel);
  const selName = isMdb ? "MDB-1" : selF?.name ?? "";
  const selKw = isMdb ? total : kws[sel] ?? selF?.kw ?? 0;
  const amps = selF ? Math.round((selKw * 1000) / (1.732 * 400 * selF.pf)) : 0;
  // preview of what's inside the selected cabinet — its member machines, scaled by the live factor
  const liveFactor = selF ? selKw / selF.kw : 1;
  const members: Asset[] = selF ? assets.filter((a) => selF.lines.includes(a.line) && a.powerKw > 0).sort((a, b) => b.powerKw - a.powerKw) : [];
  const maxMemberKw = members[0]?.powerKw ?? 1;

  return (
    <div>
      {/* the diagram keeps its own dark "control room" surface in both themes */}
      <div className="dark-screen rounded-xl border border-white/10 p-2" style={{ background: "#0a0f19" }}>
        {/* kW ⇄ ฿ flow toggle */}
        <div className="mb-1.5 flex flex-wrap items-center gap-2 px-1">
          <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
            {([["kw", Zap, { en: "Power · kW", th: "กำลังไฟ · kW" }], ["cost", Coins, { en: "Money · ฿", th: "เงิน · ฿" }]] as [FlowMode, typeof Zap, LZ][]).map(([id, Ico, lab]) => {
              const on = mode === id;
              return (
                <button key={id} onClick={() => setMode(id)} className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition", on ? (id === "cost" ? "bg-amber-400/15 text-amber-200" : "bg-brand-400/15 text-brand-200") : "text-white/45 hover:text-white/75")}>
                  <Ico size={13} /> {L(lab)}
                </button>
              );
            })}
          </div>
          {cost ? (
            <span className="flex items-center gap-2 text-[11px]">
              <span className={cn("rounded-md px-1.5 py-0.5 font-medium", peakNow ? "bg-amber-500/12 text-amber-300" : "text-white/35")}>On-peak ฿4.19{peakNow ? ` · ${L({ en: "now", th: "ตอนนี้" })}` : ""}</span>
              <span className={cn("rounded-md px-1.5 py-0.5 font-medium", !peakNow ? "bg-emerald-500/12 text-emerald-300" : "text-white/35")}>Off-peak ฿2.60{!peakNow ? ` · ${L({ en: "now", th: "ตอนนี้" })}` : ""}</span>
            </span>
          ) : null}

          {/* cabinet chassis colour — applies to the SELECTED cabinet only */}
          <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1">
            <Palette size={13} className="text-white/45" />
            <span className="whitespace-nowrap text-[10.5px] text-white/45">{L({ en: "Colour", th: "สีตู้" })}: <b className="text-white/70">{selName}</b></span>
            {CAB_PRESETS.map((p) => {
              const on = colorOf(sel).toLowerCase() === p.base.toLowerCase();
              return (
                <button
                  key={p.id}
                  onClick={() => pickColor(p.base)}
                  title={L(p.label)}
                  aria-label={L(p.label)}
                  className={cn("h-4 w-4 rounded-full border transition", on ? "border-white ring-1 ring-white/60" : "border-white/25 hover:border-white/60")}
                  style={{ background: `linear-gradient(145deg, ${shade(p.base, 1.3)}, ${shade(p.base, 0.55)})` }}
                />
              );
            })}
            <label className="relative h-4 w-4 cursor-pointer overflow-hidden rounded-full border border-dashed border-white/40 transition hover:border-white/70" title={L({ en: "Custom colour", th: "สีกำหนดเอง" })}>
              <span className="pointer-events-none absolute inset-0" style={{ background: "conic-gradient(from 0deg, #f43f5e, #f59e0b, #34d399, #22d3ee, #818cf8, #f43f5e)" }} />
              <input type="color" value={colorOf(sel)} onChange={(e) => pickColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
          </span>

          <span className="ml-auto flex items-center gap-1.5 text-[11.5px] text-white/50">
            {cost ? <Coins size={13} className="text-amber-300" /> : <Zap size={13} className="text-brand-300" />}
            {L({ en: "Total draw", th: "รวมทั้งโรงงาน" })} <b className={cn("tabular", cost ? "text-amber-300" : "text-brand-300")}>{cost ? `฿${totalCostHr.toLocaleString()}/${L({ en: "h", th: "ชม." })}` : `${Math.round(total).toLocaleString()} kW`}</b>
          </span>
        </div>
        <div className="overflow-x-auto">
        <svg viewBox="0 0 960 408" className="min-w-[760px]" style={{ width: "100%" }}>
          {/* utility grid source */}
          <circle cx="60" cy="64" r="24" fill="none" stroke="#3a4a63" strokeWidth="1.5" />
          <path d="M50 72 L58 58 L62 68 L70 55" stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <text x="60" y="106" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.7)">PEA · 24 kV</text>
          <text x="60" y="118" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">{L({ en: "utility grid", th: "การไฟฟ้า" })}</text>

          <Flow d="M 84 64 H 158" kw={total} mode={mode} />

          {/* transformer TR-1 */}
          <rect x="158" y="26" width="96" height="76" rx="6" fill="#0e1522" stroke="#3a4a63" />
          <circle cx="196" cy="54" r="15" fill="none" stroke="#22d3ee" strokeWidth="1.8" />
          <circle cx="216" cy="74" r="15" fill="none" stroke="#818cf8" strokeWidth="1.8" />
          <text x="206" y="116" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.7)">TR-1 · 1.6 MVA</text>
          <text x="206" y="128" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">24 kV → 416 V</text>

          <Flow d="M 254 64 H 392" kw={total} mode={mode} />

          {/* main MDB cabinet */}
          <Cabinet x={394} y={14} w={172} h={116} big label="MDB-1" sub={L({ en: "Main Distribution Board", th: "ตู้เมนจ่ายไฟหลัก" })} kw={total} status="ok" mode={mode} rate={rate} uid="mdb" base={colorOf("mdb")} selected={isMdb} onClick={() => setSel("mdb")} />

          {/* MDB → busbar */}
          <Flow d="M 480 132 V 196" kw={total} mode={mode} />

          {/* busbar */}
          <rect x="100" y="196" width="770" height="6" rx="3" fill="#3a4a63" />
          <rect x="100" y="196" width="770" height="6" rx="3" fill="#22d3ee" opacity="0.15">
            <animate attributeName="opacity" values="0.1;0.3;0.1" dur="2.4s" repeatCount="indefinite" />
          </rect>
          <text x="880" y="204" fontSize="9" fill="rgba(255,255,255,0.45)">BUS</text>

          {/* feeder drops + cabinets */}
          {FEEDERS.map((f, i) => {
            const cx = FEEDER_X[i];
            const kw = kws[f.id] ?? f.kw;
            return (
              <g key={f.id}>
                <Flow d={`M ${cx} 202 V 252`} kw={kw} tone={f.status} mode={mode} />
                <Cabinet
                  x={cx - 52}
                  y={254}
                  label={f.name}
                  sub={L(f.sub)}
                  kw={kw}
                  status={f.status}
                  selected={sel === f.id}
                  onClick={() => setSel(f.id)}
                  mode={mode}
                  rate={rate}
                  uid={f.id}
                  base={colorOf(f.id)}
                />
              </g>
            );
          })}
        </svg>
        </div>
      </div>

      {/* selected cabinet readout */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-white/8 bg-white/[0.02] px-3.5 py-2 text-[12px]">
        <span className="font-semibold text-white/85">{selName}</span>
        {isMdb ? (
          <>
            <span className="text-white/50">{cost ? L({ en: "Cost now", th: "ค่าไฟตอนนี้" }) : L({ en: "Total load", th: "โหลดรวม" })} <b className={cn("tabular", cost ? "text-amber-300" : "text-brand-300")}>{cost ? `฿${Math.round(selKw * rate).toLocaleString()}/${L({ en: "h", th: "ชม." })}` : `${Math.round(selKw).toLocaleString()} kW`}</b></span>
            <span className="text-white/50">{L({ en: "Feeders", th: "ตู้ย่อย" })} <b className="tabular text-white/80">{FEEDERS.length}</b></span>
            <span className="ml-auto text-[11px] text-white/35">{L({ en: "click a feeder cabinet to inspect its machines", th: "คลิกตู้ย่อยเพื่อดูเครื่องข้างใน" })}</span>
          </>
        ) : cost ? (
          <>
            <span className="text-white/50">{L({ en: "Cost now", th: "ค่าไฟตอนนี้" })} <b className="tabular text-amber-300">฿{Math.round(selKw * rate).toLocaleString()}/{L({ en: "h", th: "ชม." })}</b></span>
            <span className="text-white/50">{L({ en: "≈ per day", th: "≈ ต่อวัน" })} <b className="tabular text-white/80">฿{Math.round(selKw * rate * 24).toLocaleString()}</b></span>
            <span className="text-white/50">{L({ en: "Share", th: "สัดส่วน" })} <b className="tabular text-white/80">{Math.round((selKw / total) * 100)}%</b></span>
            {selF?.note ? <span className={cn("ml-auto rounded-md px-2 py-0.5 text-[11px] font-medium", selF.status === "crit" ? "bg-rose-500/12 text-rose-300" : "bg-amber-500/12 text-amber-300")}>{L(selF.note)}</span> : <span className="ml-auto text-[11px] text-white/35">{L({ en: "click a cabinet to inspect", th: "คลิกตู้เพื่อดูรายละเอียด" })}</span>}
          </>
        ) : (
          <>
            <span className="text-white/50">{L({ en: "Load", th: "โหลด" })} <b className="tabular text-brand-300">{Math.round(selKw).toLocaleString()} kW</b></span>
            <span className="text-white/50">{L({ en: "Current", th: "กระแส" })} <b className="tabular text-white/80">{amps.toLocaleString()} A</b></span>
            <span className="text-white/50">PF <b className={cn("tabular", (selF?.pf ?? 1) < 0.85 ? "text-amber-300" : "text-white/80")}>{(selF?.pf ?? 0).toFixed(2)}</b></span>
            <span className="text-white/50">{L({ en: "Share", th: "สัดส่วน" })} <b className="tabular text-white/80">{Math.round((selKw / total) * 100)}%</b></span>
            {selF?.note ? <span className={cn("ml-auto rounded-md px-2 py-0.5 text-[11px] font-medium", selF.status === "crit" ? "bg-rose-500/12 text-rose-300" : "bg-amber-500/12 text-amber-300")}>{L(selF.note)}</span> : <span className="ml-auto text-[11px] text-white/35">{L({ en: "click a cabinet to inspect", th: "คลิกตู้เพื่อดูรายละเอียด" })}</span>}
          </>
        )}
      </div>

      {/* inside the cabinet — member machines with live draw (feeders only) */}
      {isMdb ? null : (
      <div className="mt-2 rounded-lg border border-white/8 bg-white/[0.02] p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
            {L({ en: "Inside this cabinet", th: "ภายในตู้นี้" })} · {members.length} {L({ en: "machines", th: "เครื่อง" })}
          </p>
          <Link href="/os/assets" className="inline-flex items-center gap-1 text-[11px] text-brand-300 transition hover:text-brand-200">
            {L({ en: "Open in AssetIQ", th: "เปิดใน AssetIQ" })} <ArrowUpRight size={11} />
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {members.map((m) => {
            const mKw = Math.round(m.powerKw * liveFactor);
            return (
              <div key={m.id} className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STATUS_HEX[m.status], boxShadow: `0 0 5px ${STATUS_HEX[m.status]}88` }} />
                  <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-white/85">{m.name}</p>
                  {cost ? (
                    <span className="shrink-0 tabular text-[12px] font-semibold text-amber-300">฿{Math.round(mKw * rate).toLocaleString()}<span className="text-[9px] font-normal text-white/40">/{L({ en: "h", th: "ชม." })}</span></span>
                  ) : (
                    <span className="shrink-0 tabular text-[12px] font-semibold text-brand-300">{mKw} <span className="text-[9px] font-normal text-white/40">kW</span></span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[10px] text-white/40">{m.type}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full" style={{ width: `${(m.powerKw / maxMemberKw) * 100}%`, backgroundColor: STATUS_HEX[m.status], opacity: 0.75 }} />
                  </div>
                  <span className={cn("shrink-0 tabular text-[10px]", m.health >= 85 ? "text-emerald-300" : m.health >= 70 ? "text-amber-300" : "text-rose-300")}>{m.health}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
