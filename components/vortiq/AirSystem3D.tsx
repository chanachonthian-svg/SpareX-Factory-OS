"use client";

/* AirSystem3D — interactive 3D twin of the plant's compressed-air system.
 * Modeled after the electrical-flow 3D (ProcessFlow3D) + DigitalTwin patterns:
 * left→right chain Compressors → Aftercooler → Dryer → Filter → Receiver →
 * Ring main → zone drops, with animated pulses showing air direction and a
 * click-to-inspect side panel. The customer-wow: add equipment (+compressor,
 * +receiver, +dryer/filter) and watch the system numbers recompute. */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Html } from "@react-three/drei";
import * as THREE from "three";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Maximize2, Minimize2, Minus, MousePointerClick, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LZ = { en: string; th: string };

/* ─────────────────────────────────────────────────────── palette / data ── */

const AIR = "#38bdf8"; // Vortiq module accent
const IDLE = "#64748b";
const WARN = "#f59e0b";
const CRIT = "#f43f5e";
const TANK = "#fbbf24";
const TREAT = "#818cf8";

const PIPE_Y = 0.55;
const DEMAND_CFM = 1240; // generated air (matches the Monitor KPI)
const LEAK_CFM = 300; // ≈32% of generated air bleeding out
const FILTER_DP_WARN = 0.3; // bar — amber above this

/** Compressor catalogue — base machines + the two addable VSD units. */
const COMP_DEFS: Record<string, { kw: number; vsd: boolean; specPower: number; ratedCfm: number }> = {
  "C-01": { kw: 110, vsd: true, specPower: 18.2, ratedCfm: 900 },
  "C-02": { kw: 90, vsd: false, specPower: 20.1, ratedCfm: 450 },
  "C-03": { kw: 75, vsd: false, specPower: 0, ratedCfm: 420 },
  "C-04": { kw: 75, vsd: true, specPower: 17.0, ratedCfm: 420 },
  "C-05": { kw: 75, vsd: true, specPower: 17.0, ratedCfm: 420 },
};

/* floor layout — the chain runs left → right */
const X = { comp: -7.7, cool: -5.4, dry: -3.9, treat2: -2.75, filt: -1.6, r1: -0.25, r2: 0.95, r3: 2.1, hdr: 3.6, zone: 6.3 };
const COMP_Z: Record<string, number> = { "C-01": -1.6, "C-02": 0, "C-03": 1.6, "C-04": 3.2, "C-05": -3.2 };
const HDR_CENTER_Z = 0.75;
const HDR_LEN = 7.7;

const ZONES: { id: string; name: LZ; cfm: number; z: number }[] = [
  { id: "zone-a", name: { en: "Line A", th: "Line A" }, cfm: 320, z: -2.6 },
  { id: "zone-b", name: { en: "Line B", th: "Line B" }, cfm: 280, z: -0.9 },
  { id: "zone-paint", name: { en: "Paint shop", th: "ห้องพ่นสี" }, cfm: 190, z: 0.8 },
  { id: "zone-pack", name: { en: "Packaging", th: "แพ็กกิ้ง" }, cfm: 150, z: 2.5 },
];
const LEAK_Z = 4.1;

type NodeKind = "compressor" | "aftercooler" | "dryer" | "filter" | "receiver" | "header" | "zone" | "leak";

const KIND_LABEL: Record<NodeKind, LZ> = {
  compressor: { en: "Compressor", th: "คอมเพรสเซอร์" },
  aftercooler: { en: "Aftercooler", th: "อาฟเตอร์คูลเลอร์" },
  dryer: { en: "Refrigerated dryer", th: "ดรายเออร์" },
  filter: { en: "Filter set", th: "ชุดกรองลม" },
  receiver: { en: "Receiver tank", th: "ถังลม" },
  header: { en: "Ring main header", th: "ท่อเมนวงแหวน" },
  zone: { en: "Point of use", th: "จุดใช้งาน" },
  leak: { en: "Leakage", th: "จุดรั่วไหล" },
};

type AirNode = {
  id: string;
  kind: NodeKind;
  name: string;
  chip: string;
  pos: [number, number, number];
  color: string;
  running: boolean;
  added?: boolean;
  warn?: boolean;
  params: { label: string; value: string }[];
  bars?: { label: string; pct: number; color: string }[];
};

type PipeSeg = {
  id: string;
  a: [number, number, number];
  b: [number, number, number];
  cfm: number;
  color: string;
  active: boolean;
  bow?: number;
  label?: string;
};

type Added = { comps: string[]; tanks: string[]; treat: boolean };

/* ─────────────────────────────────── system model (deterministic mock) ── */

function buildSystem(L: (o: LZ) => string, added: Added) {
  const compIds = ["C-01", "C-02", "C-03", ...added.comps];
  // fixed-speed C-02 carries base load; VSD units split the remaining demand
  const vsdPool = compIds.filter((id) => COMP_DEFS[id].vsd).reduce((s, id) => s + COMP_DEFS[id].ratedCfm, 0);
  const vsdLoad = Math.min(1, (DEMAND_CFM - COMP_DEFS["C-02"].ratedCfm) / vsdPool);
  const ratedTotal = compIds.reduce((s, id) => s + COMP_DEFS[id].ratedCfm, 0);
  const headroomPct = Math.round(((ratedTotal - DEMAND_CFM) / DEMAND_CFM) * 100);
  const bufferS = 45 + added.tanks.length * 30;
  const treatDp = 0.4 + (added.treat ? 0.12 : 0);
  const zoneBar = added.treat ? 6.4 : 6.5;

  const nodes: AirNode[] = [];
  const pipes: PipeSeg[] = [];

  /* compressor room */
  for (const id of compIds) {
    const d = COMP_DEFS[id];
    const standby = id === "C-03";
    const loadPct = standby ? 0 : d.vsd ? Math.round(vsdLoad * 100) : 100;
    const flow = standby ? 0 : d.vsd ? Math.round(d.ratedCfm * vsdLoad) : d.ratedCfm;
    const kw = standby ? 0 : d.vsd ? Math.round(d.kw * (0.12 + 0.88 * vsdLoad)) : d.kw;
    const vib = standby ? 0.4 : d.vsd ? (id === "C-01" ? 2.4 : 1.8) : 3.1;
    const temp = standby ? 31 : Math.round(58 + 26 * (loadPct / 100));
    nodes.push({
      id,
      kind: "compressor",
      name: `${id} · ${d.kw} kW ${d.vsd ? "VSD" : "fixed"}`,
      chip: standby ? L({ en: "standby", th: "สแตนด์บาย" }) : `${loadPct}% · ${kw} kW`,
      pos: [X.comp, 0, COMP_Z[id]],
      color: standby ? IDLE : AIR,
      running: !standby,
      added: added.comps.includes(id),
      params: [
        { label: L({ en: "Load", th: "โหลด" }), value: `${loadPct}%` },
        { label: L({ en: "Power", th: "กำลังไฟ" }), value: `${kw} kW` },
        { label: L({ en: "Discharge", th: "ความดันจ่าย" }), value: standby ? "—" : "7.2 bar" },
        { label: L({ en: "Flow", th: "อัตราไหล" }), value: `${flow.toLocaleString()} cfm` },
        { label: L({ en: "Discharge temp", th: "อุณหภูมิจ่าย" }), value: `${temp} °C` },
        { label: L({ en: "Vibration", th: "การสั่นสะเทือน" }), value: `${vib.toFixed(1)} mm/s · ISO ${vib > 2.8 ? "B/C" : "A/B"}` },
        { label: L({ en: "Specific power", th: "กำลังจำเพาะ" }), value: d.specPower > 0 && !standby ? `${d.specPower} kW/100cfm` : "—" },
      ],
    });
    pipes.push({ id: `p-${id}`, a: [X.comp + 0.7, PIPE_Y, COMP_Z[id]], b: [X.cool, PIPE_Y, 0], cfm: flow, color: standby ? IDLE : AIR, active: !standby, bow: 0.1 });
  }

  /* treatment + storage chain (z = 0) */
  nodes.push({
    id: "cooler",
    kind: "aftercooler",
    name: L({ en: "Aftercooler AC-01", th: "อาฟเตอร์คูลเลอร์ AC-01" }),
    chip: "92→38 °C",
    pos: [X.cool, 0, 0],
    color: AIR,
    running: true,
    params: [
      { label: L({ en: "Inlet temp", th: "อุณหภูมิเข้า" }), value: "92 °C" },
      { label: L({ en: "Outlet temp", th: "อุณหภูมิออก" }), value: "38 °C" },
      { label: "ΔP", value: "0.05 bar" },
      { label: L({ en: "Fan", th: "พัดลม" }), value: L({ en: "running", th: "ทำงานอยู่" }) },
    ],
  });

  nodes.push({
    id: "dryer",
    kind: "dryer",
    name: L({ en: "Refrigerated dryer DR-01", th: "ดรายเออร์ DR-01" }),
    chip: "DP +3 °C",
    pos: [X.dry, 0, 0],
    color: TREAT,
    running: true,
    params: [
      { label: L({ en: "Dew point", th: "จุดน้ำค้าง" }), value: "+3 °C PDP" },
      { label: "ΔP", value: "0.15 bar" },
      { label: L({ en: "Inlet temp", th: "อุณหภูมิเข้า" }), value: "38 °C" },
      { label: L({ en: "Outlet temp", th: "อุณหภูมิออก" }), value: "25 °C" },
    ],
  });

  if (added.treat) {
    nodes.push({
      id: "TR-02",
      kind: "dryer",
      name: L({ en: "TR-02 · Dryer/Filter set", th: "TR-02 · ชุดดรายเออร์/ฟิลเตอร์" }),
      chip: "DP −20 °C",
      pos: [X.treat2, 0, 0],
      color: TREAT,
      running: true,
      added: true,
      params: [
        { label: L({ en: "Dew point", th: "จุดน้ำค้าง" }), value: "−20 °C PDP" },
        { label: "ΔP", value: "0.12 bar" },
        { label: L({ en: "Air quality", th: "คุณภาพลม" }), value: "ISO 8573 Class 1" },
      ],
      bars: [{ label: L({ en: "Element life", th: "อายุไส้กรอง" }), pct: 100, color: "#34d399" }],
    });
  }

  const filtDp = 0.25;
  const filtWarn = filtDp > FILTER_DP_WARN;
  nodes.push({
    id: "filter",
    kind: "filter",
    name: L({ en: "Filter set FL-01 · pre + fine", th: "ชุดกรองลม FL-01 · pre + fine" }),
    chip: `ΔP ${filtDp.toFixed(2)} bar`,
    pos: [X.filt, 0, 0],
    color: filtWarn ? WARN : AIR,
    running: true,
    warn: filtWarn,
    params: [
      { label: "ΔP", value: `${filtDp.toFixed(2)} bar` },
      { label: L({ en: "Warn above", th: "เกณฑ์เตือน" }), value: `${FILTER_DP_WARN.toFixed(2)} bar` },
      { label: L({ en: "Stages", th: "ชั้นกรอง" }), value: "pre + fine" },
    ],
    bars: [{ label: L({ en: "Element life", th: "อายุไส้กรอง" }), pct: 68, color: filtWarn ? WARN : "#34d399" }],
  });

  const tankIds = ["R-01", ...added.tanks.slice().sort()];
  for (const id of tankIds) {
    const main = id === "R-01";
    nodes.push({
      id,
      kind: "receiver",
      name: `${id} · ${main ? "3,000" : "2,000"} L`,
      chip: `6.9 bar · ${main ? "45" : "+30"} s`,
      pos: [main ? X.r1 : id === "R-02" ? X.r2 : X.r3, 0, 0],
      color: TANK,
      running: true,
      added: !main,
      params: [
        { label: L({ en: "Pressure", th: "ความดัน" }), value: "6.9 bar" },
        { label: L({ en: "Volume", th: "ปริมาตร" }), value: `${main ? "3,000" : "2,000"} L` },
        { label: L({ en: "Buffer", th: "ลมสำรอง" }), value: `${main ? "45" : "+30"} s` },
        { label: L({ en: "Auto drain", th: "ระบายน้ำอัตโนมัติ" }), value: L({ en: "working", th: "ทำงานปกติ" }) },
      ],
    });
  }

  nodes.push({
    id: "header",
    kind: "header",
    name: L({ en: "Ring main header", th: "ท่อเมนวงแหวน" }),
    chip: "6.7 bar · 1,240 cfm",
    pos: [X.hdr, 0, HDR_CENTER_Z],
    color: AIR,
    running: true,
    params: [
      { label: L({ en: "Pressure", th: "ความดัน" }), value: "6.7 bar" },
      { label: L({ en: "Flow", th: "อัตราไหล" }), value: "1,240 cfm" },
      { label: L({ en: "Pipe length", th: "ความยาวท่อ" }), value: "≈180 m" },
      { label: L({ en: "Zone drops", th: "จุดจ่าย" }), value: "4" },
    ],
  });

  /* chain pipes — pressure falls along the chain 7.2 → 6.9 → ~6.5 at zones */
  const chainPts: { id: string; x: number; z: number }[] = [
    { id: "cooler", x: X.cool, z: 0 },
    { id: "dryer", x: X.dry, z: 0 },
    ...(added.treat ? [{ id: "TR-02", x: X.treat2, z: 0 }] : []),
    { id: "filter", x: X.filt, z: 0 },
    { id: "R-01", x: X.r1, z: 0 },
    ...added.tanks.slice().sort().map((t) => ({ id: t, x: t === "R-02" ? X.r2 : X.r3, z: 0 })),
    { id: "header", x: X.hdr, z: 0 },
  ];
  const segLabel: Record<string, string> = {
    dryer: "7.2 bar",
    "TR-02": "7.1 bar",
    filter: added.treat ? "7.0 bar" : "7.05 bar",
    "R-01": "6.9 bar",
    header: "6.8 bar",
  };
  for (let i = 1; i < chainPts.length; i++) {
    const p = chainPts[i - 1];
    const c = chainPts[i];
    pipes.push({
      id: `chain-${p.id}-${c.id}`,
      a: [p.x, PIPE_Y, p.z],
      b: [c.x, PIPE_Y, c.z],
      cfm: DEMAND_CFM,
      color: AIR,
      active: true,
      bow: 0,
      label: segLabel[c.id],
    });
  }

  /* zone drops off the ring main — pulse density ∝ cfm */
  for (const zn of ZONES) {
    const share = Math.round((zn.cfm / DEMAND_CFM) * 100);
    nodes.push({
      id: zn.id,
      kind: "zone",
      name: L(zn.name),
      chip: `${zn.cfm} cfm · ${zoneBar.toFixed(1)} bar`,
      pos: [X.zone, 0, zn.z],
      color: AIR,
      running: true,
      params: [
        { label: L({ en: "Flow", th: "อัตราไหล" }), value: `${zn.cfm} cfm` },
        { label: L({ en: "Pressure at use", th: "ความดันใช้งาน" }), value: `${zoneBar.toFixed(1)} bar` },
        { label: L({ en: "ΔP from header", th: "ΔP จากท่อเมน" }), value: `${(6.7 - zoneBar).toFixed(1)} bar` },
        { label: L({ en: "Share of total", th: "สัดส่วนการใช้" }), value: `${share}%` },
      ],
    });
    pipes.push({ id: `pz-${zn.id}`, a: [X.hdr, PIPE_Y, zn.z], b: [X.zone, PIPE_Y, zn.z], cfm: zn.cfm, color: AIR, active: true, bow: 0 });
  }

  /* leaks — the ghost bleed node */
  nodes.push({
    id: "leak",
    kind: "leak",
    name: L({ en: "Leaks 32%", th: "รั่วไหล 32%" }),
    chip: `≈${LEAK_CFM} cfm · ฿506K/${L({ en: "yr", th: "ปี" })}`,
    pos: [X.zone, 0, LEAK_Z],
    color: CRIT,
    running: true,
    params: [
      { label: L({ en: "Leak flow", th: "อัตรารั่ว" }), value: `≈${LEAK_CFM} cfm` },
      { label: L({ en: "Share of air", th: "สัดส่วนลมที่ผลิต" }), value: "32%" },
      { label: L({ en: "Cost", th: "ต้นทุน" }), value: "฿506K/" + L({ en: "yr", th: "ปี" }) },
      { label: L({ en: "Tagged points", th: "จุดที่แท็กไว้" }), value: "5" },
    ],
  });
  pipes.push({ id: "pz-leak", a: [X.hdr, PIPE_Y, LEAK_Z], b: [X.zone, PIPE_Y, LEAK_Z], cfm: LEAK_CFM, color: CRIT, active: true, bow: 0 });

  return {
    nodes,
    pipes,
    summary: {
      headroomPct,
      bufferS,
      treatDp,
      zoneBar,
      vsdLoadPct: Math.round(vsdLoad * 100),
    },
  };
}

/* ────────────────────────────────────────────────────────── 3D pieces ── */

/** Low-poly equipment body per node kind — one shared shell material so the
 *  status "breathing" emissive animates the whole model (DigitalTwin pattern). */
function NodeBody({ node, shell, dark, steel, animRef }: {
  node: AirNode;
  shell: MeshStandardMaterial;
  dark: MeshStandardMaterial;
  steel: MeshStandardMaterial;
  animRef: React.RefObject<Group | null>;
}) {
  switch (node.kind) {
    case "compressor": // cabinet + vertical receiver bottle
      return (
        <group>
          <RoundedBox args={[1.0, 0.95, 0.85]} radius={0.05} smoothness={3} position={[-0.15, 0.48, 0]} material={shell} />
          <mesh material={dark} position={[-0.15, 0.5, 0.435]}><boxGeometry args={[0.68, 0.52, 0.015]} /></mesh>
          <mesh material={steel} position={[0.55, 0.4, 0]}><cylinderGeometry args={[0.17, 0.17, 0.8, 14]} /></mesh>
          <mesh material={steel} position={[0.55, 0.82, 0]}><sphereGeometry args={[0.17, 14, 10]} /></mesh>
        </group>
      );
    case "aftercooler": { // finned block with a spinning fan facing the aisle
      return (
        <group>
          <RoundedBox args={[0.9, 0.8, 0.7]} radius={0.04} smoothness={3} position={[0, 0.4, 0]} material={shell} />
          <mesh material={dark} position={[0, 0.42, 0.36]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.29, 0.29, 0.02, 22]} /></mesh>
          <group ref={animRef} position={[0, 0.42, 0.38]}>
            {[0, 1, 2].map((i) => (
              <mesh key={i} material={steel} rotation={[0, 0, (i * Math.PI) / 3]}><boxGeometry args={[0.5, 0.06, 0.015]} /></mesh>
            ))}
          </group>
        </group>
      );
    }
    case "dryer": // cabinet + twin towers on top
      return (
        <group>
          <RoundedBox args={[0.85, 1.05, 0.75]} radius={0.04} smoothness={3} position={[0, 0.53, 0]} material={shell} />
          <mesh material={dark} position={[0, 0.5, 0.38]}><boxGeometry args={[0.5, 0.4, 0.015]} /></mesh>
          <mesh material={steel} position={[-0.18, 1.2, 0]}><cylinderGeometry args={[0.1, 0.1, 0.35, 12]} /></mesh>
          <mesh material={steel} position={[0.18, 1.2, 0]}><cylinderGeometry args={[0.1, 0.1, 0.35, 12]} /></mesh>
        </group>
      );
    case "filter": // pre + fine elements on a stand
      return (
        <group>
          <mesh material={dark} position={[0, 0.05, 0]}><boxGeometry args={[0.8, 0.1, 0.5]} /></mesh>
          <mesh material={shell} position={[-0.2, 0.45, 0]}><cylinderGeometry args={[0.13, 0.13, 0.62, 14]} /></mesh>
          <mesh material={shell} position={[0.2, 0.45, 0]}><cylinderGeometry args={[0.13, 0.13, 0.62, 14]} /></mesh>
          <mesh material={steel} position={[-0.2, 0.79, 0]}><sphereGeometry args={[0.13, 12, 8]} /></mesh>
          <mesh material={steel} position={[0.2, 0.79, 0]}><sphereGeometry args={[0.13, 12, 8]} /></mesh>
        </group>
      );
    case "receiver": // the vertical tank
      return (
        <group>
          {[-0.25, 0.25].map((zx, i) => (
            <mesh key={i} material={dark} position={[zx, 0.1, 0]}><boxGeometry args={[0.08, 0.2, 0.34]} /></mesh>
          ))}
          <mesh material={shell} position={[0, 0.95, 0]}><cylinderGeometry args={[0.4, 0.4, 1.4, 20]} /></mesh>
          <mesh material={shell} position={[0, 1.65, 0]}><sphereGeometry args={[0.4, 20, 12]} /></mesh>
          <mesh material={shell} position={[0, 0.25, 0]}><sphereGeometry args={[0.4, 20, 12]} /></mesh>
          <mesh material={steel} position={[0, 1.95, 0]}><cylinderGeometry args={[0.05, 0.05, 0.2, 8]} /></mesh>
        </group>
      );
    case "header": // long horizontal main along z + support posts
      return (
        <group>
          <mesh material={shell} position={[0, PIPE_Y, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.08, 0.08, HDR_LEN, 14]} /></mesh>
          {[-2.8, 0, 2.8].map((z, i) => (
            <mesh key={i} material={dark} position={[0, PIPE_Y / 2, z]}><boxGeometry args={[0.06, PIPE_Y, 0.06]} /></mesh>
          ))}
        </group>
      );
    case "zone": // point-of-use pedestal with an emissive service bar
      return (
        <group>
          <RoundedBox args={[0.5, 0.55, 0.45]} radius={0.04} smoothness={3} position={[0, 0.28, 0]} material={shell} />
          <mesh position={[0, 0.59, 0]}>
            <boxGeometry args={[0.42, 0.06, 0.06]} />
            <meshBasicMaterial color={node.color} toneMapped={false} />
          </mesh>
        </group>
      );
    case "leak": // ghost bleed — translucent red sphere (opacity pulses in useFrame)
      return (
        <group>
          <mesh material={shell} position={[0, 0.45, 0]}><sphereGeometry args={[0.27, 16, 12]} /></mesh>
          <mesh material={dark} position={[0, 0.06, 0]}><boxGeometry args={[0.4, 0.12, 0.4]} /></mesh>
        </group>
      );
  }
}

function AirNodeMesh({ node, selected, onSelect }: { node: AirNode; selected: boolean; onSelect: (id: string) => void }) {
  const g = useRef<Group>(null);
  const body = useRef<Group>(null);
  const animRef = useRef<Group>(null);
  const grow = useRef(node.added ? 0.01 : 1);
  const [hovered, setHovered] = useState(false);
  const seed = useMemo(() => node.pos[0] * 0.7 + node.pos[2] * 1.3, [node.pos]);

  const shell = useMemo(() => new THREE.MeshStandardMaterial({ color: "#141a28", metalness: 0.55, roughness: 0.38, transparent: true }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0b0f16", metalness: 0.4, roughness: 0.6 }), []);
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: "#66707f", metalness: 0.85, roughness: 0.3 }), []);
  useEffect(() => () => { shell.dispose(); dark.dispose(); steel.dispose(); }, [shell, dark, steel]);
  useEffect(() => {
    shell.emissive.set(node.color);
    if (node.kind === "leak") { shell.opacity = 0.4; shell.color.set("#3a0d16"); }
    else { shell.opacity = 1; shell.color.set(selected ? "#1d2436" : "#141a28"); }
  }, [node.color, node.kind, selected, shell]);

  useEffect(() => () => void (document.body.style.cursor = "auto"), []);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    // scale-in for freshly added equipment
    if (grow.current < 1 && g.current) {
      grow.current = Math.min(1, grow.current + delta * 2.6);
      const s = 1 - (1 - grow.current) * (1 - grow.current); // ease-out
      g.current.scale.setScalar(s);
    }
    // status breathing + subtle vibration on running machines
    const pulse = (Math.sin(t * (node.kind === "leak" ? 3.2 : 1.8) + seed) + 1) / 2;
    const base = node.kind === "leak" ? 0.7 : node.warn ? 0.4 : node.running ? 0.22 : 0.05;
    shell.emissiveIntensity = base + pulse * (node.kind === "leak" ? 0.5 : node.running ? 0.22 : 0.04);
    if (node.kind === "leak") shell.opacity = 0.3 + pulse * 0.25;
    if (body.current && node.kind === "compressor") {
      body.current.position.y = node.running ? Math.sin(t * 26 + seed) * 0.009 : 0;
    }
    if (animRef.current && node.kind === "aftercooler") animRef.current.rotation.z = t * 3.2;
  });

  return (
    <group
      ref={g}
      position={node.pos}
      onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
    >
      {/* selection / hover footprint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[node.kind === "header" ? 0.5 : 0.75, 32]} />
        <meshBasicMaterial color={node.color} transparent opacity={selected ? 0.22 : hovered ? 0.12 : 0.035} depthWrite={false} />
      </mesh>

      <group ref={body}>
        <NodeBody node={node} shell={shell} dark={dark} steel={steel} animRef={animRef} />
      </group>

      {/* always-on headline chip */}
      <Html
        center
        distanceFactor={12}
        position={[0, node.kind === "receiver" ? 2.35 : node.kind === "dryer" ? 1.75 : node.kind === "compressor" ? 1.5 : node.kind === "zone" || node.kind === "leak" ? 1.15 : node.kind === "header" ? 1.2 : 1.35, 0]}
        zIndexRange={[20, 0]}
      >
        <motion.div
          initial={node.added ? { opacity: 0, scale: 0.4 } : false}
          animate={{ opacity: 1, scale: 1 }}
          className="pointer-events-none select-none text-center"
          style={{ width: 130 }}
        >
          <div
            className="inline-block whitespace-nowrap rounded-md border bg-black/70 px-1.5 py-0.5 backdrop-blur"
            style={{ borderColor: selected ? `${node.color}aa` : `${node.color}33` }}
          >
            <div className="text-[10px] font-semibold leading-tight text-white/85">{node.name}</div>
            <div className="text-[10.5px] font-bold leading-tight" style={{ color: node.color }}>{node.chip}</div>
          </div>
        </motion.div>
      </Html>
    </group>
  );
}

/** A pipe with glowing pulses travelling source → use; density/speed ∝ cfm. */
function AirPipe({ seg }: { seg: PipeSeg }) {
  const curve = useMemo(() => {
    const A = new THREE.Vector3(...seg.a);
    const B = new THREE.Vector3(...seg.b);
    const mid = A.clone().lerp(B, 0.5);
    mid.y += seg.bow ?? 0;
    return new THREE.QuadraticBezierCurve3(A, mid, B);
  }, [seg.a, seg.b, seg.bow]);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 20, 0.035, 8, false), [curve]);
  useEffect(() => () => tube.dispose(), [tube]);

  const count = seg.active ? Math.max(2, Math.min(8, Math.round(seg.cfm / 160))) : 0;
  const speed = 0.16 + seg.cfm / 5200;
  const pulses = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed;
    for (let i = 0; i < count; i++) {
      const m = pulses.current[i];
      if (!m) continue;
      const p = (t + i / count) % 1;
      m.position.copy(curve.getPoint(p));
      m.scale.setScalar(0.7 + 0.35 * Math.sin(p * Math.PI));
    }
  });

  return (
    <group>
      <mesh geometry={tube}>
        <meshStandardMaterial
          color={seg.color}
          emissive={seg.color}
          emissiveIntensity={seg.active ? 0.3 : 0.06}
          metalness={0.4}
          roughness={0.4}
          transparent
          opacity={seg.active ? 0.55 : 0.18}
        />
      </mesh>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} ref={(el) => { pulses.current[i] = el; }}>
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshBasicMaterial color={seg.color} toneMapped={false} />
        </mesh>
      ))}
      {seg.label ? (
        <Html center distanceFactor={13} position={[(seg.a[0] + seg.b[0]) / 2, PIPE_Y + 0.32, (seg.a[2] + seg.b[2]) / 2]} zIndexRange={[10, 0]}>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-full border border-white/12 bg-black/60 px-1.5 py-px text-[9px] font-semibold tabular text-white/65 backdrop-blur">
            {seg.label}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function AirScene({ nodes, pipes, selectedId, onSelect, autoRotate, roomLabel }: {
  nodes: AirNode[];
  pipes: PipeSeg[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  autoRotate: boolean;
  roomLabel: string;
}) {
  return (
    <>
      <color attach="background" args={["#070b14"]} />
      <fog attach="fog" args={["#070b14", 18, 40]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 10, 7]} intensity={0.8} />
      <pointLight position={[X.comp, 3, 0]} intensity={20} color={AIR} distance={16} />
      <pointLight position={[X.hdr, 3, 1]} intensity={14} color={AIR} distance={14} />

      {/* factory floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]}>
        <planeGeometry args={[30, 18]} />
        <meshStandardMaterial color="#070811" metalness={0.3} roughness={0.9} />
      </mesh>
      <gridHelper args={[30, 30, "#16233b", "#0d1626"]} position={[0, 0.002, 0]} />

      {/* compressor room pad + label */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[X.comp + 0.05, 0.006, 0]}>
        <planeGeometry args={[3.2, 9.4]} />
        <meshBasicMaterial color={AIR} transparent opacity={0.045} depthWrite={false} />
      </mesh>
      <Html center distanceFactor={15} position={[X.comp, 2.35, 0]} zIndexRange={[5, 0]}>
        <div className="pointer-events-none select-none whitespace-nowrap rounded-md border border-sky-400/30 bg-black/55 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-sky-200 backdrop-blur">
          {roomLabel}
        </div>
      </Html>

      {pipes.map((p) => <AirPipe key={p.id} seg={p} />)}
      {nodes.map((n) => (
        <AirNodeMesh key={n.id} node={n} selected={n.id === selectedId} onSelect={onSelect} />
      ))}

      <OrbitControls
        enablePan={false}
        autoRotate={autoRotate}
        autoRotateSpeed={0.4}
        minPolarAngle={Math.PI * 0.16}
        maxPolarAngle={Math.PI * 0.46}
        minDistance={8}
        maxDistance={26}
        target={[-0.4, 0.3, 0.4]}
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────────── UI pieces ── */

/** Segmented add/remove control: [−] label count/cap [+] — what you add, you can take out. */
function AddBtn({ label, count, cap, onAdd, onRemove }: { label: string; count: number; cap: number; onAdd: () => void; onRemove: () => void }) {
  const full = count >= cap;
  const empty = count === 0;
  return (
    <div className="flex items-center overflow-hidden whitespace-nowrap rounded-full border border-white/12 bg-black/40 text-[11px] font-medium backdrop-blur">
      <button
        onClick={onRemove}
        disabled={empty}
        aria-label={`remove ${label}`}
        title={label}
        className={cn("grid h-7 w-7 place-items-center transition", empty ? "cursor-not-allowed text-white/20" : "text-rose-300 hover:bg-rose-400/15")}
      >
        <Minus size={12} />
      </button>
      <span className={cn("px-0.5", count > 0 ? "text-sky-200" : "text-white/60")}>
        {label} <span className="tabular text-[9.5px] text-white/40">{count}/{cap}</span>
      </span>
      <button
        onClick={onAdd}
        disabled={full}
        aria-label={`add ${label}`}
        title={label}
        className={cn("grid h-7 w-7 place-items-center transition", full ? "cursor-not-allowed text-white/20" : "text-sky-300 hover:bg-sky-400/15")}
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

function SummaryStat({ label, value, base, accent, fromLabel }: { label: string; value: string; base: string; accent: string; fromLabel: string }) {
  const changed = value !== base;
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
      <p className="truncate text-[10px] uppercase tracking-wider text-white/45">{label}</p>
      <motion.p key={value} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-0.5 tabular text-lg font-semibold leading-tight" style={{ color: accent }}>
        {value}
      </motion.p>
      <p className="mt-0.5 h-3.5 text-[9.5px] text-white/35">{changed ? `${fromLabel} ${base}` : " "}</p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────── the twin ── */

export function AirSystem3D() {
  const { locale } = useI18n();
  const L = (o: LZ) => (locale === "th" ? o.th : o.en);

  const [mounted, setMounted] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [added, setAdded] = useState<Added>({ comps: [], tanks: [], treat: false });
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;
  const inView = useInView(wrapRef, { margin: "200px" });

  useEffect(() => { setMounted(true); }, []);

  // maximize — CSS overlay rather than the native Fullscreen API (which
  // embedded webviews silently ignore); Esc exits and body scroll locks
  useEffect(() => {
    if (!isFs) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsFs(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [isFs]);

  const { nodes, pipes, summary } = useMemo(() => buildSystem(L, added), [locale, added]); // eslint-disable-line react-hooks/exhaustive-deps
  const selected = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);

  const addComp = () => setAdded((s) => {
    if (s.comps.length >= 2) return s;
    return { ...s, comps: [...s.comps, s.comps.includes("C-04") ? "C-05" : "C-04"] };
  });
  const addTank = () => setAdded((s) => {
    if (s.tanks.length >= 2) return s;
    return { ...s, tanks: [...s.tanks, s.tanks.includes("R-02") ? "R-03" : "R-02"] };
  });
  const addTreat = () => setAdded((s) => (s.treat ? s : { ...s, treat: true }));
  // symmetric removal — take out the most recently added unit of that type
  const removeLastComp = () => setAdded((s) => (s.comps.length ? { ...s, comps: s.comps.slice(0, -1) } : s));
  const removeLastTank = () => setAdded((s) => (s.tanks.length ? { ...s, tanks: s.tanks.slice(0, -1) } : s));
  const removeTreat = () => setAdded((s) => (s.treat ? { ...s, treat: false } : s));
  const removeUnit = (id: string) => {
    setAdded((s) => ({
      comps: s.comps.filter((c) => c !== id),
      tanks: s.tanks.filter((t) => t !== id),
      treat: id === "TR-02" ? false : s.treat,
    }));
    setSelectedId(null);
  };

  const frameloop: "always" | "never" | "demand" = reduce ? "demand" : inView ? "always" : "never";
  const fromLabel = L({ en: "was", th: "จาก" });

  return (
    <div className="space-y-4">
      {/* summary strip — recomputed system effects of the equipment you add */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryStat label={L({ en: "Capacity headroom", th: "กำลังผลิตเผื่อ" })} value={`${summary.headroomPct}%`} base="43%" accent={AIR} fromLabel={fromLabel} />
        <SummaryStat label={L({ en: "VSD load / unit", th: "โหลดต่อเครื่อง (VSD)" })} value={`${summary.vsdLoadPct}%`} base="88%" accent="#34d399" fromLabel={fromLabel} />
        <SummaryStat label={L({ en: "Receiver buffer", th: "ลมสำรองในถัง" })} value={`${summary.bufferS} s`} base="45 s" accent={TANK} fromLabel={fromLabel} />
        <SummaryStat label={L({ en: "Treatment ΔP", th: "ΔP ชุดปรับคุณภาพลม" })} value={`${summary.treatDp.toFixed(2)} bar`} base="0.40 bar" accent={TREAT} fromLabel={fromLabel} />
        <SummaryStat label={L({ en: "Pressure at use", th: "ความดันที่จุดใช้งาน" })} value={`${summary.zoneBar.toFixed(1)} bar`} base="6.5 bar" accent="#818cf8" fromLabel={fromLabel} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        {/* stage */}
        <div className={cn("twin-stage overflow-hidden border border-white/10", isFs ? "fixed inset-0 z-[100] rounded-none bg-[#070b14]" : "relative rounded-2xl bg-[#070b14]")}>
          {/* add-equipment toolbar */}
          <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
            <AddBtn label={L({ en: "Compressor", th: "คอมเพรสเซอร์" })} count={added.comps.length} cap={2} onAdd={addComp} onRemove={removeLastComp} />
            <AddBtn label={L({ en: "Receiver tank", th: "ถังลม" })} count={added.tanks.length} cap={2} onAdd={addTank} onRemove={removeLastTank} />
            <AddBtn label={L({ en: "Dryer/Filter", th: "ดรายเออร์/ฟิลเตอร์" })} count={added.treat ? 1 : 0} cap={1} onAdd={addTreat} onRemove={removeTreat} />
          </div>

          {/* fullscreen toggle */}
          <button
            onClick={() => setIsFs((v) => !v)}
            title={L(isFs ? { en: "Exit fullscreen", th: "ออกจากเต็มจอ" } : { en: "Fullscreen", th: "เต็มจอ" })}
            aria-label={L(isFs ? { en: "Exit fullscreen", th: "ออกจากเต็มจอ" } : { en: "Fullscreen", th: "เต็มจอ" })}
            className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/30 text-white/60 backdrop-blur transition hover:border-white/25 hover:text-white"
          >
            {isFs ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <div ref={wrapRef} className={cn("relative w-full", isFs ? "h-full" : "h-[440px] sm:h-[500px]")}>
            {mounted ? (
              <Canvas
                dpr={[1, 2]}
                frameloop={frameloop}
                camera={{ position: [0.5, 7, 15.5], fov: 40 }}
                onPointerMissed={() => setSelectedId(null)}
              >
                <AirScene
                  nodes={nodes}
                  pipes={pipes}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  autoRotate={!reduce}
                  roomLabel={L({ en: "Compressor room", th: "ห้องคอมเพรสเซอร์" })}
                />
              </Canvas>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-white/45">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
                  {L({ en: "Building the air-system twin…", th: "กำลังสร้างแบบจำลองระบบลม…" })}
                </div>
              </div>
            )}
          </div>

          {/* legend — pulse = air direction · colour = equipment status */}
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/55">
            <LegendDot color={AIR} label={L({ en: "moving dots = air direction", th: "จุดวิ่ง = ทิศทางลม" })} />
            <LegendDot color="#34d399" label={L({ en: "colour = status", th: "สี = สถานะ" })} />
            <LegendDot color={IDLE} label={L({ en: "standby", th: "สแตนด์บาย" })} />
            <LegendDot color={WARN} label={L({ en: "ΔP high", th: "ΔP สูง" })} />
            <LegendDot color={CRIT} label={L({ en: "leaks", th: "รั่วไหล" })} />
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 text-[10px] text-white/35">
            {L({ en: "drag to rotate · scroll to zoom", th: "ลากเพื่อหมุน · เลื่อนเพื่อซูม" })}
          </div>
        </div>

        {/* inspector */}
        <div className="panel max-h-[420px] overflow-y-auto p-4 lg:max-h-none lg:h-[500px]">
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <p className="text-[10.5px] uppercase tracking-wider text-white/45">{L({ en: "Selected equipment", th: "อุปกรณ์ที่เลือก" })}</p>
              <div className="mt-1 flex items-start justify-between gap-2">
                <h3 className="text-[15px] font-semibold leading-snug text-white">{selected.name}</h3>
                <span
                  className="mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                  style={{ color: selected.color, borderColor: `${selected.color}44`, backgroundColor: `${selected.color}14` }}
                >
                  {selected.kind === "leak"
                    ? L({ en: "bleeding", th: "รั่วอยู่" })
                    : selected.running
                      ? L({ en: "running", th: "ทำงานอยู่" })
                      : L({ en: "standby", th: "สแตนด์บาย" })}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-white/45">
                {L(KIND_LABEL[selected.kind])}
                {selected.added ? ` · ${L({ en: "just added", th: "เพิ่งเพิ่มเข้าระบบ" })}` : ""}
              </p>

              <div className="mt-3.5 grid grid-cols-2 gap-2">
                {selected.params.map((p) => (
                  <div key={p.label} className="rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2">
                    <p className="truncate text-[9.5px] uppercase tracking-wider text-white/45">{p.label}</p>
                    <p className="mt-0.5 tabular text-[13px] font-semibold text-white/90">{p.value}</p>
                  </div>
                ))}
              </div>

              {selected.bars?.map((b) => (
                <div key={b.label} className="mt-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/55">{b.label}</span>
                    <span className="tabular font-semibold" style={{ color: b.color }}>{b.pct}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full transition-all" style={{ width: `${b.pct}%`, background: b.color }} />
                  </div>
                </div>
              ))}

              {selected.added ? (
                <button
                  onClick={() => removeUnit(selected.id)}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-1.5 text-[12px] font-medium text-rose-300 transition hover:bg-rose-400/20"
                >
                  <Trash2 size={13} /> {L({ en: "Remove this unit", th: "ลบอุปกรณ์นี้" })}
                </button>
              ) : null}
            </motion.div>
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 py-8 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-sky-400/30 bg-sky-400/10 text-sky-300">
                <MousePointerClick size={22} />
              </span>
              <p className="text-sm font-medium text-white/70">{L({ en: "Click any unit in the 3D view", th: "คลิกอุปกรณ์ในภาพ 3D" })}</p>
              <p className="max-w-[230px] text-xs leading-relaxed text-white/45">
                {L({
                  en: "Inspect each compressor, dryer, filter, tank and zone — or use the + buttons to add equipment and see the system numbers recompute.",
                  th: "ดูค่าของคอมเพรสเซอร์ ดรายเออร์ ชุดกรอง ถังลม และจุดใช้งานแต่ละตัว — หรือกดปุ่ม + เพื่อเพิ่มอุปกรณ์แล้วดูตัวเลขระบบคำนวณใหม่",
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
