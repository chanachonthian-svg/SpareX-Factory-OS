/** Twin Builder — user-authored factory layouts.
 *
 *  The user picks machines from a library, sets Machine ID / name / kVA, drags
 *  them onto the floor and draws Line/Area zones. The saved layout replaces the
 *  mock factory in the 3D twin: `toAssets`/`toBuildings` convert it to the same
 *  Asset/Building shapes the scene already renders, and each machine's kVA
 *  drives simulated load/carbon so the numbers track the customer's real spec. */

import type { Asset, AssetCategory, AssetStatus, Building } from "./factory";

export type LibMachine = {
  id: string;
  labelEn: string;
  labelTh: string;
  /** Asset.type string — its keywords select the 3D body (welding→weld arm, press→C-frame, machining→CNC cabinet…) */
  typeString: string;
  color: string;
  defaultKva: number;
  cat: AssetCategory;
  /** electrical infrastructure (pole) — placed on the floor but not a monitored machine */
  infra?: boolean;
};

export const MACHINE_LIB: LibMachine[] = [
  // ── automotive-parts line, in process order ──
  { id: "stamping", labelEn: "Stamping press", labelTh: "เครื่องปั๊มขึ้นรูป", typeString: "Stamping press", color: "#fb7185", defaultKva: 55, cat: "production" },
  { id: "spot-weld", labelEn: "Spot welding", labelTh: "เครื่องเชื่อมจุด", typeString: "Spot welding machine", color: "#f59e0b", defaultKva: 100, cat: "production" },
  { id: "proj-weld", labelEn: "Projection welding", labelTh: "เครื่องเชื่อมโปรเจคชัน", typeString: "Projection welding machine", color: "#fb923c", defaultKva: 100, cat: "production" },
  { id: "nut-weld", labelEn: "Nut welding", labelTh: "เครื่องเชื่อมนัต", typeString: "Nut welding machine", color: "#fbbf24", defaultKva: 35, cat: "production" },
  { id: "hyd-press", labelEn: "Hydraulic press", labelTh: "เครื่องปั๊มไฮดรอลิก", typeString: "Hydraulic press", color: "#22d3ee", defaultKva: 10, cat: "production" },
  { id: "heat-caulk", labelEn: "Heat caulking", labelTh: "เครื่องย้ำร้อน", typeString: "Heat caulking press", color: "#f43f5e", defaultKva: 420, cat: "production" },
  { id: "lathe", labelEn: "Lathe", labelTh: "เครื่องกลึง", typeString: "Lathe machining", color: "#818cf8", defaultKva: 20, cat: "production" },
  { id: "cnc", labelEn: "CNC machine", labelTh: "เครื่อง CNC", typeString: "CNC machining center", color: "#34d399", defaultKva: 10, cat: "production" },
  { id: "robot", labelEn: "Robot arm", labelTh: "หุ่นยนต์แขนกล", typeString: "Articulated robot", color: "#a78bfa", defaultKva: 15, cat: "production" },
  { id: "grinding", labelEn: "Grinding machine", labelTh: "เครื่องเจียรไน", typeString: "Grinding machine", color: "#64748b", defaultKva: 15, cat: "production" },
  { id: "imm", labelEn: "Injection molding", labelTh: "เครื่องฉีดพลาสติก", typeString: "Injection molding machine", color: "#c084fc", defaultKva: 120, cat: "production" },
  { id: "die-cast", labelEn: "Die casting", labelTh: "เครื่องฉีดอลูมิเนียม", typeString: "Die casting machine", color: "#f97316", defaultKva: 250, cat: "production" },
  { id: "furnace", labelEn: "Heat treatment furnace", labelTh: "เตาอบชุบแข็ง", typeString: "Heat treatment furnace", color: "#ef4444", defaultKva: 300, cat: "production" },
  { id: "paint", labelEn: "Paint booth", labelTh: "ห้องพ่นสี", typeString: "Paint booth line", color: "#ec4899", defaultKva: 60, cat: "production" },
  { id: "assembly", labelEn: "Assembly station", labelTh: "สถานีประกอบ", typeString: "Assembly station", color: "#2dd4bf", defaultKva: 8, cat: "production" },
  { id: "conveyor", labelEn: "Conveyor line", labelTh: "สายพานลำเลียง", typeString: "Conveyor line", color: "#14b8a6", defaultKva: 5, cat: "production" },
  { id: "agv", labelEn: "AGV / AMR", labelTh: "รถขนของอัตโนมัติ AGV", typeString: "Mobile robot (AGV)", color: "#8b5cf6", defaultKva: 2, cat: "production" },
  { id: "qc", labelEn: "Vision / QC", labelTh: "ตรวจสอบคุณภาพ", typeString: "Vision inspection", color: "#e879f9", defaultKva: 5, cat: "production" },
  { id: "leak-test", labelEn: "Leak tester", labelTh: "เครื่องทดสอบรอยรั่ว", typeString: "Leak tester", color: "#06b6d4", defaultKva: 3, cat: "production" },
  { id: "compressor", labelEn: "Air compressor", labelTh: "ปั๊มลม", typeString: "Screw compressor", color: "#38bdf8", defaultKva: 75, cat: "facility" },
  { id: "chiller", labelEn: "Chiller", labelTh: "ชิลเลอร์", typeString: "Water-cooled chiller", color: "#60a5fa", defaultKva: 90, cat: "facility" },
  { id: "coolingtower", labelEn: "Cooling tower", labelTh: "คูลลิ่งทาวเวอร์", typeString: "Cooling tower", color: "#7dd3fc", defaultKva: 15, cat: "facility" },
  { id: "boiler", labelEn: "Boiler", labelTh: "หม้อไอน้ำ", typeString: "Fire-tube boiler", color: "#fbbf24", defaultKva: 40, cat: "facility" },
  { id: "transformer", labelEn: "Transformer", labelTh: "หม้อแปลงไฟฟ้า", typeString: "Distribution transformer", color: "#a1a1aa", defaultKva: 0, cat: "facility" },
  { id: "mdb", labelEn: "MDB / Switchboard", labelTh: "ตู้ไฟหลัก MDB", typeString: "Main switchboard", color: "#94a3b8", defaultKva: 0, cat: "facility" },
  { id: "pole", labelEn: "Utility pole (Grid)", labelTh: "เสาไฟ Grid · MEA", typeString: "Utility pole", color: "#f59e0b", defaultKva: 0, cat: "facility", infra: true },
];

export const libById = (id: string) => MACHINE_LIB.find((m) => m.id === id);

export type PlacedMachine = {
  uid: string;
  libId: string;
  machineId: string; // e.g. TWS176
  name: string; // e.g. Spot welding machine
  kva: number;
  x: number;
  z: number;
  note?: string;
};

export type ZoneRect = {
  uid: string;
  name: string; // e.g. Line A
  x: number; // center
  z: number;
  w: number;
  d: number;
  color: string;
};

export type TwinLayout = { machines: PlacedMachine[]; zones: ZoneRect[]; active: boolean };

export const ZONE_COLORS = ["#22d3ee", "#818cf8", "#f59e0b", "#34d399", "#f43f5e", "#e879f9"];

const LAYOUT_KEY = "factoryos:twin-layout";

export function loadLayout(): TwinLayout | null {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return null;
    const l = JSON.parse(raw) as TwinLayout;
    if (!Array.isArray(l.machines) || !Array.isArray(l.zones)) return null;
    return l;
  } catch { return null; }
}

export function saveLayout(l: TwinLayout) {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(l)); } catch { /* ignore */ }
}

export function clearLayout() {
  try { localStorage.removeItem(LAYOUT_KEY); } catch { /* ignore */ }
}

export const newUid = () => `u${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

/* deterministic 0..1 from a string — simulated stats stay stable across reloads */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

export function zoneOf(m: PlacedMachine, zones: ZoneRect[]): ZoneRect | null {
  return zones.find((zn) => Math.abs(m.x - zn.x) <= zn.w / 2 && Math.abs(m.z - zn.z) <= zn.d / 2) ?? null;
}

/** the user's utility pole placement, if they chose to add one */
export function poleOf(l: TwinLayout): { x: number; z: number } | null {
  const p = l.machines.find((m) => libById(m.libId)?.infra);
  return p ? { x: p.x, z: p.z } : null;
}

/** layout machines → the Asset shape the 3D scene renders. kVA drives the
 *  simulated electrical + carbon numbers so the twin tracks the real spec.
 *  Infrastructure (pole) is excluded — it renders as scenery, not a machine. */
export function toAssets(l: TwinLayout): Asset[] {
  return l.machines.filter((m) => !libById(m.libId)?.infra).map((m) => {
    const lib = libById(m.libId) ?? MACHINE_LIB[0];
    const r = hash01(m.uid + m.machineId);
    const health = Math.round(76 + r * 21); // 76..97
    const status: AssetStatus = health < 80 ? "warning" : "healthy";
    const load = 0.45 + hash01(m.machineId) * 0.35; // 45–80% of rated
    const powerKw = Math.round(m.kva * 0.8 * load * 10) / 10; // pf≈0.8
    const zn = zoneOf(m, l.zones);
    return {
      id: m.uid,
      name: m.machineId || m.name,
      type: lib.typeString,
      category: lib.cat,
      buildingId: zn?.uid ?? "",
      line: zn?.name ?? "—",
      x: m.x,
      z: m.z,
      status,
      health,
      oee: Math.round(68 + r * 24),
      powerKw,
      tempC: Math.round(42 + r * 26),
      vibration: Math.round((1.2 + r * 3.4) * 10) / 10,
      rulDays: null,
      co2KgH: Math.round(powerKw * 0.4999 * 10) / 10, // TH grid factor ≈0.5 kg/kWh
      detail: `${m.name}${m.note ? ` · ${m.note}` : ""} · ${m.kva} kVA`,
    };
  });
}

export function toBuildings(l: TwinLayout): Building[] {
  return l.zones.map((zn) => ({
    id: zn.uid,
    name: zn.name,
    kind: "production" as const,
    x: zn.x, z: zn.z, w: zn.w, d: zn.d, h: 0.09,
    tint: "#0c1a24",
    accent: zn.color,
  }));
}

/** sample layout = the customer's real machine list (15 เครื่อง) laid out in 3 zones */
export function sampleLayout(): TwinLayout {
  const rows: [string, string, string, number, string?][] = [
    ["spot-weld", "TWS176", "Spot welding machine", 100],
    ["spot-weld", "TWS190", "Spot welding machine", 100],
    ["spot-weld", "TWS191", "Spot welding machine", 100, "2 power supply (50+50)"],
    ["spot-weld", "TWS192", "Spot welding machine", 100, "2 power supply (50+50)"],
    ["spot-weld", "TWS193", "Spot welding machine", 160, "2 power supply (80+80)"],
    ["nut-weld", "TWS400", "Nut welding machine", 35],
    ["hyd-press", "THP101", "Hydraulic press machine", 6.5],
    ["hyd-press", "THP102", "Hydraulic press machine", 6.5],
    ["hyd-press", "THP106", "Hydraulic press machine", 6.5],
    ["lathe", "TLA171", "Lathe machine", 21],
    ["lathe", "TLA172", "Lathe machine", 15],
    ["proj-weld", "TWP113", "Projection welding machine", 85],
    ["heat-caulk", "TWP130", "Heat caulking machine", 420],
    ["proj-weld", "TWP131", "Projection welding machine", 150],
    ["cnc", "TDR101", "CNC machine", 10],
    ["mdb", "MDB-01", "Main switchboard", 0],
    ["pole", "POLE-01", "Utility pole (Grid)", 0],
  ];
  const zones: ZoneRect[] = [
    { uid: "zn-weld", name: "Welding Line", x: -5.2, z: -1.6, w: 8.4, d: 3.4, color: "#f59e0b" },
    { uid: "zn-press", name: "Press & Machining", x: -5.2, z: 3.0, w: 8.4, d: 3.0, color: "#22d3ee" },
    { uid: "zn-fac", name: "Facility", x: 4.8, z: 0.6, w: 6.0, d: 5.2, color: "#818cf8" },
  ];
  const pos: [number, number][] = [
    // Welding Line (6)
    [-8.2, -2.2], [-6.6, -2.2], [-5.0, -2.2], [-3.4, -2.2], [-8.2, -0.8], [-6.6, -0.8],
    // Press & Machining (9 → 5 press/lathe row + TWP row)
    [-8.2, 2.4], [-6.8, 2.4], [-5.4, 2.4], [-4.0, 2.4], [-2.6, 2.4],
    [-8.2, 3.8], [-6.4, 3.8], [-4.6, 3.8], [-2.8, 3.8],
    // electrical infrastructure — MDB in the Facility zone, pole off-pad by the grid
    [4.2, 0.6], [8.4, 4.6],
  ];
  const machines: PlacedMachine[] = rows.map(([libId, mid, name, kva, note], i) => ({
    uid: `sm-${mid.toLowerCase()}`,
    libId, machineId: mid, name, kva,
    x: pos[i][0], z: pos[i][1], note,
  }));
  return { machines, zones, active: true };
}

/** demo layout: a full tier-1 automotive-parts line — stamping → welding →
 *  machining → heat treat & paint → assembly & QC, plus the utility corner.
 *  For pitching new customers who don't have their machine list ready yet. */
export function sampleAutomotiveLayout(): TwinLayout {
  const zones: ZoneRect[] = [
    { uid: "az-stamp", name: "Stamping", x: -6.6, z: -4.3, w: 4.6, d: 3.4, color: "#fb7185" },
    { uid: "az-weld", name: "Welding Line", x: -1.2, z: -4.3, w: 5.4, d: 3.4, color: "#f59e0b" },
    { uid: "az-mach", name: "Machining", x: 4.0, z: -4.3, w: 4.4, d: 3.4, color: "#818cf8" },
    { uid: "az-heat", name: "Heat Treat & Paint", x: -6.6, z: 0.8, w: 4.6, d: 3.2, color: "#ef4444" },
    { uid: "az-asm", name: "Assembly & QC", x: -1.2, z: 0.8, w: 5.4, d: 3.2, color: "#2dd4bf" },
    { uid: "az-fac", name: "Facility", x: 4.6, z: 1.6, w: 4.2, d: 4.4, color: "#38bdf8" },
  ];
  const rows: [string, string, string, number, number, number][] = [
    // libId, machineId, name, kva, x, z
    ["stamping", "STP-01", "Stamping press 200T", 55, -8.2, -5.2],
    ["stamping", "STP-02", "Stamping press 200T", 55, -6.6, -5.2],
    ["stamping", "STP-03", "Stamping press 400T", 90, -5.0, -5.2],
    ["conveyor", "CON-01", "Transfer conveyor", 5, -6.6, -3.4],
    ["spot-weld", "TWS-01", "Spot welding machine", 100, -3.4, -5.2],
    ["spot-weld", "TWS-02", "Spot welding machine", 100, -2.0, -5.2],
    ["spot-weld", "TWS-03", "Spot welding machine", 160, -0.6, -5.2],
    ["robot", "ROB-01", "Welding robot cell", 25, 0.9, -5.2],
    ["proj-weld", "TWP-01", "Projection welding", 85, -2.6, -3.4],
    ["nut-weld", "NUT-01", "Nut welding machine", 35, -1.0, -3.4],
    ["cnc", "CNC-01", "CNC machining center", 15, 2.4, -5.2],
    ["cnc", "CNC-02", "CNC machining center", 15, 3.8, -5.2],
    ["lathe", "LAT-01", "CNC lathe", 21, 5.2, -5.2],
    ["grinding", "GRD-01", "Cylindrical grinder", 15, 3.4, -3.4],
    ["furnace", "FUR-01", "Heat treatment furnace", 300, -8.0, 0.2],
    ["paint", "PNT-01", "Paint booth line", 60, -6.0, 0.2],
    ["assembly", "ASM-01", "Assembly station", 8, -3.4, 0.0],
    ["assembly", "ASM-02", "Assembly station", 8, -2.0, 0.0],
    ["conveyor", "CON-02", "Assembly conveyor", 5, -0.6, 0.0],
    ["leak-test", "LKT-01", "Leak tester", 3, -3.0, 1.8],
    ["qc", "VIS-01", "Vision inspection", 5, -1.6, 1.8],
    ["agv", "AGV-01", "AGV tugger", 2, 0.5, 1.8],
    ["compressor", "CMP-01", "Screw compressor 75kW", 75, 3.2, 0.2],
    ["chiller", "CHL-01", "Water-cooled chiller", 90, 4.6, 0.2],
    ["coolingtower", "CTW-01", "Cooling tower", 15, 6.0, 0.2],
    ["boiler", "BLR-01", "Fire-tube boiler", 40, 3.2, 2.2],
    ["transformer", "TRF-01", "Distribution transformer", 0, 5.2, 3.2],
    ["mdb", "MDB-01", "Main switchboard", 0, 6.2, 2.2],
    ["pole", "POLE-01", "Utility pole (Grid)", 0, 8.6, 4.6],
  ];
  return {
    machines: rows.map(([libId, machineId, name, kva, x, z]) => ({ uid: `am-${machineId.toLowerCase()}`, libId, machineId, name, kva, x, z })),
    zones,
    active: true,
  };
}
