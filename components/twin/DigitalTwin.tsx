"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  RoundedBox,
  ContactShadows,
  Environment,
  Html,
} from "@react-three/drei";
import * as THREE from "three";
import type { Mesh, MeshStandardMaterial, Group } from "three";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { MousePointerClick, Wrench, Check, Crown, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  CREW, CREW_PHASES, CREW_OVERTIME, crewPhase, crewElapsedLabel, crewMember,
  useCrewAssignments, assignJob, completeJob,
  type CrewAssignment, type CrewMember, type LZ,
} from "@/lib/crew";
import { useTeams, usePeople, personForAsset, teamOfPerson } from "@/lib/teams";
import {
  assets,
  buildings,
  twinLayers,
  STATUS_COLOR,
  STATUS_HEX,
  STATUS_LABEL,
  CATEGORY_LABEL,
  type Asset,
  type AssetStatus,
  type TwinLayer,
} from "@/lib/factory";
import { cn } from "@/lib/utils";
import { uibus } from "@/lib/uibus";
import { useTr } from "@/lib/autotranslate";

/* ------------------------------------------------------------------ helpers */

function carbonColor(co2: number) {
  return co2 > 50 ? "#f43f5e" : co2 > 30 ? "#f59e0b" : "#34d399";
}

function nodeColor(a: Asset, layer: TwinLayer) {
  if (layer === "carbon") return carbonColor(a.co2KgH);
  // STATUS_HEX, not STATUS_COLOR — THREE.Color cannot resolve CSS variables,
  // which silently rendered every machine white regardless of status
  return STATUS_HEX[a.status];
}

const STATUS_DOT: Record<AssetStatus, string> = {
  healthy: "bg-status-ok",
  warning: "bg-status-warn",
  critical: "bg-status-crit",
};

/* ------------------------------------------------------------------ building */

function BuildingBlock({ b }: { b: (typeof buildings)[number] }) {
  return (
    <group position={[b.x, 0, b.z]}>
      {/* zone pad */}
      <mesh position={[0, b.h / 2, 0]} receiveShadow>
        <boxGeometry args={[b.w, b.h, b.d]} />
        <meshStandardMaterial
          color={b.tint}
          metalness={0.3}
          roughness={0.7}
          transparent
          opacity={0.6}
        />
      </mesh>
      {/* accent top glow */}
      <mesh position={[0, b.h + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[b.w - 0.12, b.d - 0.12]} />
        <meshStandardMaterial
          color={b.accent}
          emissive={b.accent}
          emissiveIntensity={0.3}
          transparent
          opacity={0.07}
        />
      </mesh>
      {/* zone label floating above the back edge */}
      <Html position={[0, 1.5, -b.d / 2 - 0.1]} center distanceFactor={15} occlude={false}>
        <div
          className="select-none whitespace-nowrap rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur"
          style={{
            color: b.accent,
            borderColor: `${b.accent}55`,
            backgroundColor: "rgba(0,0,0,0.55)",
          }}
        >
          {b.name}
        </div>
      </Html>
    </group>
  );
}

/* ------------------------------------------------------- machine 3D bodies
   Recognisable low-poly silhouettes per machine type (chiller, compressor,
   CNC, …) built from primitives so the scene stays light. All shell parts
   share ONE material per node, so the status-colour "breathing" emissive
   keeps working across the whole model. */

type MachineKind =
  | "cnc" | "weld" | "robot" | "qc" | "press" | "imm" | "assembly" | "paint" | "agv"
  | "chiller" | "compressor" | "boiler" | "mdb" | "coolingtower" | "pump" | "ahu" | "wwt" | "generic";

function machineKind(a: Asset): MachineKind {
  const t = a.type.toLowerCase();
  if (t.includes("paint")) return "paint";
  if (t.includes("welding")) return "weld";
  if (t.includes("robot")) return "robot";
  if (t.includes("vision")) return "qc";
  if (t.includes("press")) return "press";
  if (t.includes("machining")) return "cnc";
  if (t.includes("imm") || t.includes("injection")) return "imm";
  if (t.includes("assembly")) return "assembly";
  if (t.includes("mobile")) return "agv";
  if (t.includes("chiller")) return "chiller";
  if (t.includes("compressor")) return "compressor";
  if (t.includes("boiler")) return "boiler";
  if (t.includes("switchboard")) return "mdb";
  if (t.includes("cooling tower")) return "coolingtower";
  if (t.includes("pump")) return "pump";
  if (t.includes("air-handling")) return "ahu";
  if (t.includes("blower")) return "wwt";
  return "generic";
}

function MachineBody({ kind, shell, dark, steel, color, animRef }: {
  kind: MachineKind;
  shell: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  color: string;
  animRef: React.RefObject<Group | null>;
}) {
  switch (kind) {
    case "cnc": // enclosed machining centre — cabinet + viewing window + side control panel
      return (
        <group>
          <RoundedBox args={[0.42, 0.3, 0.3]} radius={0.035} smoothness={4} position={[0, 0.15, 0]} castShadow receiveShadow material={shell} />
          <mesh material={dark} position={[-0.03, 0.17, 0.152]}><boxGeometry args={[0.24, 0.15, 0.012]} /></mesh>
          <mesh material={steel} position={[0.17, 0.17, 0.13]} rotation={[0, -0.35, 0]}><boxGeometry args={[0.09, 0.13, 0.03]} /></mesh>
          <mesh material={steel} position={[0, 0.315, -0.05]}><boxGeometry args={[0.16, 0.03, 0.16]} /></mesh>
        </group>
      );
    case "weld":
    case "robot": { // pedestal + articulated arm (sways); weld tip glows
      const isWeld = kind === "weld";
      return (
        <group>
          <mesh material={steel} position={[0, 0.05, 0]} castShadow><cylinderGeometry args={[0.1, 0.12, 0.1, 20]} /></mesh>
          <group ref={animRef} position={[0, 0.1, 0]}>
            <mesh material={shell} position={[0, 0.04, 0]}><cylinderGeometry args={[0.07, 0.08, 0.08, 20]} /></mesh>
            <mesh material={shell} position={[0.05, 0.16, 0]} rotation={[0, 0, -0.55]} castShadow><boxGeometry args={[0.06, 0.22, 0.06]} /></mesh>
            <mesh material={shell} position={[0.12, 0.26, 0]}><sphereGeometry args={[0.045, 16, 16]} /></mesh>
            <mesh material={shell} position={[0.17, 0.2, 0]} rotation={[0, 0, 0.9]} castShadow><boxGeometry args={[0.05, 0.17, 0.05]} /></mesh>
            {isWeld ? (
              <mesh position={[0.215, 0.135, 0]}>
                <sphereGeometry args={[0.025, 12, 12]} />
                <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={2.2} toneMapped={false} />
              </mesh>
            ) : (
              <mesh material={dark} position={[0.215, 0.13, 0]}><boxGeometry args={[0.05, 0.05, 0.07]} /></mesh>
            )}
          </group>
        </group>
      );
    }
    case "qc": // conveyor + camera gantry, lens looking down
      return (
        <group>
          <mesh material={shell} position={[0, 0.07, 0]} castShadow receiveShadow><boxGeometry args={[0.44, 0.08, 0.18]} /></mesh>
          <mesh material={steel} position={[-0.12, 0.21, 0]}><boxGeometry args={[0.03, 0.22, 0.03]} /></mesh>
          <mesh material={steel} position={[0.12, 0.21, 0]}><boxGeometry args={[0.03, 0.22, 0.03]} /></mesh>
          <mesh material={steel} position={[0, 0.32, 0]}><boxGeometry args={[0.3, 0.03, 0.05]} /></mesh>
          <mesh material={shell} position={[0, 0.27, 0]}><boxGeometry args={[0.08, 0.07, 0.08]} /></mesh>
          <mesh position={[0, 0.228, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.02, 12]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.8} toneMapped={false} />
          </mesh>
        </group>
      );
    case "press": // C-frame press — columns + crown + ram + die
      return (
        <group>
          <mesh material={shell} position={[0, 0.04, 0]} receiveShadow><boxGeometry args={[0.36, 0.08, 0.3]} /></mesh>
          <mesh material={shell} position={[-0.145, 0.21, 0]} castShadow><boxGeometry args={[0.07, 0.26, 0.24]} /></mesh>
          <mesh material={shell} position={[0.145, 0.21, 0]} castShadow><boxGeometry args={[0.07, 0.26, 0.24]} /></mesh>
          <mesh material={shell} position={[0, 0.38, 0]} castShadow><boxGeometry args={[0.36, 0.09, 0.28]} /></mesh>
          <mesh material={steel} position={[0, 0.26, 0]}><boxGeometry args={[0.18, 0.07, 0.2]} /></mesh>
          <mesh material={dark} position={[0, 0.1, 0]}><boxGeometry args={[0.2, 0.04, 0.22]} /></mesh>
        </group>
      );
    case "imm": // injection moulding — clamp block + barrel + hopper on a long bed
      return (
        <group>
          <mesh material={shell} position={[0, 0.05, 0]} receiveShadow><boxGeometry args={[0.52, 0.08, 0.2]} /></mesh>
          <mesh material={shell} position={[-0.15, 0.18, 0]} castShadow><boxGeometry args={[0.18, 0.18, 0.18]} /></mesh>
          <mesh material={steel} position={[0.1, 0.19, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.035, 0.035, 0.26, 16]} /></mesh>
          <mesh material={shell} position={[0.24, 0.16, 0]} castShadow><boxGeometry args={[0.1, 0.13, 0.14]} /></mesh>
          <mesh material={steel} position={[0.06, 0.28, 0]}><coneGeometry args={[0.05, 0.1, 14]} /></mesh>
        </group>
      );
    case "assembly": // workbench + SCARA-style arm + parts tray
      return (
        <group>
          <mesh material={shell} position={[0, 0.07, 0]} castShadow receiveShadow><boxGeometry args={[0.36, 0.14, 0.2]} /></mesh>
          <mesh material={shell} position={[0, 0.155, 0]}><boxGeometry args={[0.4, 0.03, 0.24]} /></mesh>
          <mesh material={steel} position={[-0.1, 0.23, 0]}><cylinderGeometry args={[0.025, 0.025, 0.14, 12]} /></mesh>
          <mesh material={shell} position={[-0.02, 0.29, 0]}><boxGeometry args={[0.16, 0.03, 0.04]} /></mesh>
          <mesh material={steel} position={[0.05, 0.25, 0]}><cylinderGeometry args={[0.012, 0.012, 0.06, 8]} /></mesh>
          <mesh material={dark} position={[0.12, 0.18, 0.02]}><boxGeometry args={[0.1, 0.02, 0.12]} /></mesh>
        </group>
      );
    case "paint": // spray booth — enclosure + dark opening + roof stack
      return (
        <group>
          <RoundedBox args={[0.4, 0.32, 0.3]} radius={0.03} smoothness={4} position={[0, 0.16, 0]} castShadow receiveShadow material={shell} />
          <mesh material={dark} position={[0, 0.15, 0.152]}><boxGeometry args={[0.2, 0.2, 0.012]} /></mesh>
          <mesh material={steel} position={[0.1, 0.37, -0.05]}><cylinderGeometry args={[0.04, 0.045, 0.12, 14]} /></mesh>
        </group>
      );
    case "agv": // charging dock + AMR that shuttles back and forth
      return (
        <group>
          <mesh material={shell} position={[0, 0.02, -0.06]} receiveShadow><boxGeometry args={[0.32, 0.04, 0.16]} /></mesh>
          <mesh material={shell} position={[0, 0.1, -0.13]} castShadow><boxGeometry args={[0.32, 0.14, 0.02]} /></mesh>
          <group ref={animRef}>
            <RoundedBox args={[0.18, 0.07, 0.13]} radius={0.02} smoothness={3} position={[0, 0.075, 0.03]} castShadow material={steel} />
            <mesh position={[0.05, 0.125, 0.03]}>
              <cylinderGeometry args={[0.012, 0.012, 0.03, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} toneMapped={false} />
            </mesh>
          </group>
        </group>
      );
    case "chiller": // water-cooled chiller — two stacked barrels on a skid + risers + panel
      return (
        <group>
          <mesh material={shell} position={[0, 0.03, 0]} receiveShadow><boxGeometry args={[0.5, 0.06, 0.26]} /></mesh>
          <mesh material={shell} position={[-0.02, 0.13, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.09, 0.09, 0.44, 20]} /></mesh>
          <mesh material={shell} position={[-0.02, 0.28, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.075, 0.075, 0.4, 20]} /></mesh>
          <mesh material={shell} position={[0.22, 0.16, 0]} castShadow><boxGeometry args={[0.08, 0.26, 0.22]} /></mesh>
          <mesh material={steel} position={[-0.14, 0.38, 0.05]}><cylinderGeometry args={[0.022, 0.022, 0.12, 10]} /></mesh>
          <mesh material={steel} position={[-0.06, 0.38, 0.05]}><cylinderGeometry args={[0.022, 0.022, 0.12, 10]} /></mesh>
        </group>
      );
    case "compressor": // VSD screw compressor — cabinet + vertical receiver tank + line
      return (
        <group>
          <RoundedBox args={[0.28, 0.28, 0.24]} radius={0.02} smoothness={3} position={[-0.08, 0.14, 0]} castShadow receiveShadow material={shell} />
          <mesh material={dark} position={[-0.08, 0.15, 0.122]}><boxGeometry args={[0.18, 0.16, 0.01]} /></mesh>
          <mesh material={steel} position={[0.17, 0.13, 0]} castShadow><cylinderGeometry args={[0.06, 0.06, 0.24, 16]} /></mesh>
          <mesh material={steel} position={[0.17, 0.26, 0]}><sphereGeometry args={[0.06, 16, 12]} /></mesh>
          <mesh material={steel} position={[0.05, 0.24, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.015, 0.015, 0.14, 8]} /></mesh>
        </group>
      );
    case "boiler": // fire-tube boiler — horizontal shell on saddles + chimney + front door
      return (
        <group>
          <mesh material={shell} position={[-0.12, 0.05, 0]}><boxGeometry args={[0.06, 0.1, 0.22]} /></mesh>
          <mesh material={shell} position={[0.12, 0.05, 0]}><boxGeometry args={[0.06, 0.1, 0.22]} /></mesh>
          <mesh material={shell} position={[0, 0.17, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.12, 0.12, 0.4, 22]} /></mesh>
          <mesh material={dark} position={[0.2, 0.17, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.09, 0.09, 0.02, 22]} /></mesh>
          <mesh material={steel} position={[-0.14, 0.33, -0.04]}><cylinderGeometry args={[0.032, 0.036, 0.2, 14]} /></mesh>
        </group>
      );
    case "mdb": // switchboard row — three cabinets with status pilot lights
      return (
        <group>
          {[-0.13, 0, 0.13].map((x, i) => (
            <group key={i}>
              <mesh material={shell} position={[x, 0.17, 0]} castShadow receiveShadow><boxGeometry args={[0.12, 0.34, 0.12]} /></mesh>
              <mesh material={dark} position={[x, 0.16, 0.062]}><boxGeometry args={[0.09, 0.24, 0.008]} /></mesh>
              <mesh position={[x, 0.305, 0.065]}>
                <boxGeometry args={[0.02, 0.02, 0.008]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} toneMapped={false} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "coolingtower": // basin + casing + shroud with a spinning fan
      return (
        <group>
          <mesh material={shell} position={[0, 0.05, 0]} receiveShadow><boxGeometry args={[0.36, 0.1, 0.36]} /></mesh>
          <mesh material={shell} position={[0, 0.23, 0]} castShadow><boxGeometry args={[0.32, 0.18, 0.32]} /></mesh>
          <mesh material={steel} position={[0, 0.35, 0]}><cylinderGeometry args={[0.13, 0.145, 0.06, 24]} /></mesh>
          <group ref={animRef} position={[0, 0.36, 0]}>
            {[0, 1, 2].map((i) => (
              <mesh key={i} material={dark} rotation={[0, (i * Math.PI) / 3, 0]}><boxGeometry args={[0.22, 0.008, 0.03]} /></mesh>
            ))}
          </group>
          <mesh material={dark} position={[0, 0.2, 0.162]}><boxGeometry args={[0.26, 0.1, 0.008]} /></mesh>
        </group>
      );
    case "pump": // motor + volute + vertical discharge pipe
      return (
        <group>
          <mesh material={shell} position={[0, 0.02, 0]} receiveShadow><boxGeometry args={[0.3, 0.04, 0.16]} /></mesh>
          <mesh material={shell} position={[-0.06, 0.11, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.06, 0.06, 0.17, 16]} /></mesh>
          <mesh material={steel} position={[0.08, 0.11, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.078, 0.078, 0.05, 18]} /></mesh>
          <mesh material={steel} position={[0.08, 0.21, 0]}><cylinderGeometry args={[0.024, 0.024, 0.14, 10]} /></mesh>
        </group>
      );
    case "ahu": // long sectioned duct unit + outlet
      return (
        <group>
          <RoundedBox args={[0.52, 0.2, 0.24]} radius={0.02} smoothness={3} position={[0, 0.1, 0]} castShadow receiveShadow material={shell} />
          <mesh material={dark} position={[-0.09, 0.1, 0]}><boxGeometry args={[0.006, 0.21, 0.25]} /></mesh>
          <mesh material={dark} position={[0.09, 0.1, 0]}><boxGeometry args={[0.006, 0.21, 0.25]} /></mesh>
          <mesh material={steel} position={[0.19, 0.25, 0]}><boxGeometry args={[0.1, 0.1, 0.1]} /></mesh>
          <mesh material={dark} position={[-0.262, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, 0.006, 18]} /></mesh>
        </group>
      );
    case "wwt": // aeration tank + blower skid + air line
      return (
        <group>
          <mesh material={steel} position={[-0.05, 0.1, 0]} castShadow receiveShadow><cylinderGeometry args={[0.15, 0.15, 0.2, 24]} /></mesh>
          <mesh material={dark} position={[-0.05, 0.201, 0]}><cylinderGeometry args={[0.125, 0.125, 0.006, 24]} /></mesh>
          <mesh material={shell} position={[0.19, 0.06, 0.02]} castShadow><boxGeometry args={[0.12, 0.11, 0.11]} /></mesh>
          <mesh material={steel} position={[0.1, 0.14, 0.02]} rotation={[0, 0, 1.1]}><cylinderGeometry args={[0.014, 0.014, 0.14, 8]} /></mesh>
        </group>
      );
    default: // fallback — the original rounded block
      return <RoundedBox args={[0.34, 0.3, 0.34]} radius={0.05} smoothness={4} position={[0, 0.16, 0]} castShadow receiveShadow material={shell} />;
  }
}

/* ------------------------------------------------------------------ machine */

function MachineNode({
  a,
  layer,
  selected,
  onSelect,
}: {
  a: Asset;
  layer: TwinLayer;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const ringRef = useRef<Mesh>(null);
  const ringMat = useRef<MeshStandardMaterial>(null);
  const beacon = useRef<MeshStandardMaterial>(null);
  const barRef = useRef<Mesh>(null);
  const barMat = useRef<MeshStandardMaterial>(null);
  const animRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  const color = nodeColor(a, layer);
  const isPredictiveFocus = layer === "predictive" && a.rulDays !== null;
  const dimmed = layer === "predictive" && a.rulDays === null;
  const alerting = a.status !== "healthy";
  const kind = useMemo(() => machineKind(a), [a]);

  // one shell material per node — every body part shares it, so the status
  // "breathing" emissive animates the whole model; dark/steel are static details
  const shellMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#161a26", metalness: 0.6, roughness: 0.35, transparent: true }), []);
  const darkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0b0f16", metalness: 0.4, roughness: 0.6, transparent: true }), []);
  const steelMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#66707f", metalness: 0.85, roughness: 0.3, transparent: true }), []);
  useEffect(() => () => { shellMat.dispose(); darkMat.dispose(); steelMat.dispose(); }, [shellMat, darkMat, steelMat]);
  useEffect(() => { shellMat.emissive.set(color); }, [color, shellMat]);
  useEffect(() => {
    shellMat.color.set(selected ? "#1d2333" : "#161a26");
    const op = dimmed ? 0.55 : 1;
    shellMat.opacity = op; darkMat.opacity = op; steelMat.opacity = op;
  }, [selected, dimmed, shellMat, darkMat, steelMat]);

  useEffect(() => () => void (document.body.style.cursor = "auto"), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const urgency =
      a.status === "critical" ? 3.4 : a.status === "warning" ? 2.4 : 1.5;
    const speed = isPredictiveFocus ? 4 : urgency;
    const pulse = (Math.sin(t * speed) + 1) / 2;
    if (ringRef.current) {
      const s = 1 + pulse * (isPredictiveFocus ? 0.6 : a.status === "critical" ? 0.55 : 0.32);
      ringRef.current.scale.set(s, s, s);
    }
    if (ringMat.current) ringMat.current.opacity = (dimmed ? 0.18 : a.status === "critical" ? 0.75 : 0.55) - pulse * 0.4;
    // intensities kept ≤ ~1.5 so status colours read as colour, not blown-out white
    if (beacon.current) beacon.current.emissiveIntensity = 0.7 + pulse * (alerting ? 0.8 : 0.4);
    // the machine body itself glows (and breathes) in its status colour
    {
      const base = a.status === "critical" ? 0.5 : a.status === "warning" ? 0.28 : selected ? 0.25 : 0.1;
      shellMat.emissiveIntensity = dimmed ? 0.04 : base + (alerting ? pulse * 0.35 : 0);
    }
    // per-type life: cooling-tower fan spins, robot arms sweep, the AMR shuttles
    if (animRef.current) {
      if (kind === "coolingtower") animRef.current.rotation.y = t * (a.status === "critical" ? 1.2 : 4);
      else if (kind === "robot" || kind === "weld") animRef.current.rotation.y = Math.sin(t * 0.7) * 0.5;
      else if (kind === "agv") animRef.current.position.x = Math.sin(t * 0.6) * 0.07;
    }
    // energy layer: animate the power bar height slightly
    if (barRef.current) {
      const base = THREE.MathUtils.clamp(a.powerKw / 160, 0.05, 1);
      barRef.current.scale.y = base * (1 + pulse * 0.06);
    }
    if (barMat.current) barMat.current.emissiveIntensity = (a.status === "critical" ? 1.0 : a.status === "warning" ? 0.85 : 0.65) + (alerting ? pulse * 0.45 : 0);
  });

  return (
    <group
      position={[a.x, 0, a.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(a.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      {/* pulsing ground ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[0.22, 0.3, 40]} />
        <meshStandardMaterial
          ref={ringMat}
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>

      {/* selection footprint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.009, 0]}>
        <circleGeometry args={[0.34, 40]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={selected ? 0.2 : hovered ? 0.1 : 0.04}
          depthWrite={false}
        />
      </mesh>

      {/* body — a recognisable low-poly model per machine type */}
      <MachineBody kind={kind} shell={shellMat} dark={darkMat} steel={steelMat} color={color} animRef={animRef} />

      {/* energy power bar (only meaningful on energy layer, subtle otherwise) */}
      {layer === "energy" && a.powerKw > 0 ? (
        <mesh ref={barRef} position={[0, 0.42, 0]} scale={[1, 0.4, 1]}>
          <boxGeometry args={[0.08, 1, 0.08]} />
          <meshStandardMaterial
            ref={barMat}
            color={color}
            emissive={color}
            emissiveIntensity={0.75}
            toneMapped={false}
          />
        </mesh>
      ) : (
        /* status beacon tip — floats just above the tallest models */
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.09, 20]} />
          <meshStandardMaterial
            ref={beacon}
            color={color}
            emissive={color}
            emissiveIntensity={1.3}
            toneMapped={false}
          />
        </mesh>
      )}

      {(selected || hovered) && (
        <Html position={[0, 0.72, 0]} center distanceFactor={9} occlude={false}>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-full border border-white/20 bg-black/70 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
            <span
              className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
              style={{ backgroundColor: color }}
            />
            {a.name}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ------------------------------------------------------------ energy flow */

/* Electrical routing laid out like a Single Line Diagram: the grid drops straight
 * down the pole into the MDB, the MDB feeds one horizontal busbar, and every feeder
 * taps off it at a right angle. Everything is axis-aligned — no diagonal spaghetti. */
const MDB_X = 1.6; // MDB switchboard column (mdb-11 sits here)
const BUS_Z = 1.1; // the main busbar runs along X at this depth (through the MDB)
const BUS_Y = 0.14; // bus duct height above the floor
const MDB_POS = new THREE.Vector3(MDB_X, 0, BUS_Z);
const POLE_POS = new THREE.Vector3(MDB_X, 0, 5.0); // pole is in-line with the MDB, so power drops straight in
const POLE_ARM = new THREE.Vector3(MDB_X, 1.95, 5.0);
const P = (x: number, z: number) => new THREE.Vector3(x, BUS_Y, z);
const FEEDERS = [
  { x: -4.6, z: -1.8 }, // production zone A
  { x: -1.8, z: -1.0 }, // production zone B
  { x: 4.6, z: -1.8 }, // facility zone
];

type FlowKind = "incoming" | "bus" | "feeder";
type FlowSeg = { a: THREE.Vector3; b: THREE.Vector3; kind: FlowKind };
const FLOW_SEGMENTS: FlowSeg[] = [
  // incoming: straight down the pole, then straight along the ground into the MDB
  { a: POLE_ARM, b: P(MDB_X, POLE_POS.z), kind: "incoming" },
  { a: P(MDB_X, POLE_POS.z), b: P(MDB_X, BUS_Z), kind: "incoming" },
  // main busbar — one straight run each way out of the MDB
  { a: P(MDB_X, BUS_Z), b: P(-5.4, BUS_Z), kind: "bus" },
  { a: P(MDB_X, BUS_Z), b: P(6.6, BUS_Z), kind: "bus" },
  // feeders drop off the busbar at right angles into each zone
  ...FEEDERS.map((f) => ({ a: P(f.x, BUS_Z), b: P(f.x, f.z), kind: "feeder" as const })),
];

/** a thin emissive cylinder between two points — used for wires and buses */
function Segment({ a, b, radius = 0.012, color, emissive, intensity = 0.5, opacity = 0.5 }: { a: THREE.Vector3; b: THREE.Vector3; radius?: number; color: string; emissive?: string; intensity?: number; opacity?: number }) {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const len = a.distanceTo(b);
  const dir = b.clone().sub(a).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return (
    <mesh position={mid} quaternion={quat}>
      <cylinderGeometry args={[radius, radius, len, 8]} />
      <meshStandardMaterial color={color} emissive={emissive ?? color} emissiveIntensity={intensity} transparent opacity={opacity} toneMapped={false} />
    </mesh>
  );
}

function FlowPulses({ active }: { active: boolean }) {
  const group = useRef<Group>(null);
  const pulses = useMemo(
    () =>
      FLOW_SEGMENTS.flatMap((seg, si) =>
        [0, 0.33, 0.66].map((o) => ({ seg, offset: o, key: `${si}-${o}` })),
      ),
    [],
  );
  const refs = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    pulses.forEach((p, i) => {
      const m = refs.current[i];
      if (!m) return;
      const speed = p.seg.kind === "incoming" ? 0.3 : 0.24;
      const tt = (t * speed + p.offset) % 1;
      m.position.lerpVectors(p.seg.a, p.seg.b, tt);
      const mat = m.material as MeshStandardMaterial;
      mat.opacity = (active ? 0.95 : 0.28) * Math.sin(tt * Math.PI);
    });
  });

  const isIncoming = (k: FlowKind) => k === "incoming";
  return (
    <group ref={group}>
      {/* static conductors — amber grid feed, thick cyan busbar, thin cyan feeders */}
      {FLOW_SEGMENTS.map((seg, i) => (
        <Segment
          key={i}
          a={seg.a}
          b={seg.b}
          radius={seg.kind === "bus" ? 0.022 : isIncoming(seg.kind) ? 0.013 : 0.011}
          color={isIncoming(seg.kind) ? "#f59e0b" : "#22d3ee"}
          intensity={active ? (seg.kind === "bus" ? 0.7 : 0.5) : 0.18}
          opacity={active ? (seg.kind === "bus" ? 0.6 : 0.45) : 0.14}
        />
      ))}
      {/* breaker nodes where feeders tap the busbar (SLD symbols) */}
      {FEEDERS.map((f, i) => (
        <mesh key={`n${i}`} position={[f.x, BUS_Y, BUS_Z]}>
          <boxGeometry args={[0.08, 0.08, 0.08]} />
          <meshStandardMaterial color="#0b1220" emissive="#22d3ee" emissiveIntensity={active ? 0.9 : 0.3} metalness={0.4} roughness={0.5} toneMapped={false} />
        </mesh>
      ))}
      {/* moving pulses show flow direction */}
      {pulses.map((p, i) => (
        <mesh key={p.key} ref={(el) => { refs.current[i] = el; }}>
          <sphereGeometry args={[isIncoming(p.seg.kind) ? 0.055 : 0.05, 12, 12]} />
          <meshStandardMaterial
            color={isIncoming(p.seg.kind) ? "#fcd34d" : "#67e8f9"}
            emissive={isIncoming(p.seg.kind) ? "#f59e0b" : "#22d3ee"}
            emissiveIntensity={2}
            transparent
            opacity={0.85}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------- grid pole + MDB + people */

/** Utility distribution pole outside the plant — where MEA/PEA power enters. */
function UtilityPole() {
  const arm = "#6b5136";
  return (
    <group position={[POLE_POS.x, 0, POLE_POS.z]}>
      {/* pole */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.075, 2.1, 10]} />
        <meshStandardMaterial color="#57606f" metalness={0.3} roughness={0.75} />
      </mesh>
      {/* two crossarms */}
      <mesh position={[0, 1.92, 0]}><boxGeometry args={[0.92, 0.06, 0.08]} /><meshStandardMaterial color={arm} roughness={0.85} /></mesh>
      <mesh position={[0, 1.72, 0]}><boxGeometry args={[0.66, 0.055, 0.08]} /><meshStandardMaterial color={arm} roughness={0.85} /></mesh>
      {/* insulators */}
      {[-0.4, 0, 0.4].map((x, i) => (
        <mesh key={i} position={[x, 1.98, 0]}><cylinderGeometry args={[0.028, 0.036, 0.08, 8]} /><meshStandardMaterial color="#0f172a" roughness={0.5} /></mesh>
      ))}
      {/* pole-mount transformer can */}
      <mesh position={[0.14, 1.42, 0]} castShadow><cylinderGeometry args={[0.085, 0.085, 0.22, 12]} /><meshStandardMaterial color="#3b4657" metalness={0.5} roughness={0.5} /></mesh>
      {/* incoming grid feeders — droop off toward the utility grid (+z, off-plant) */}
      {[-0.4, 0, 0.4].map((x, i) => (
        <Segment key={`g${i}`} a={new THREE.Vector3(POLE_POS.x + x, 1.98, POLE_POS.z)} b={new THREE.Vector3(POLE_POS.x + x * 1.15, 1.35, POLE_POS.z + 1.4)} radius={0.008} color="#94a3b8" intensity={0.15} opacity={0.5} />
      ))}
      {/* the straight service drop into the MDB is drawn by FlowPulses (incoming segments) */}
      <Html position={[0, 2.28, 0]} center distanceFactor={9} occlude={false}>
        <div className="pointer-events-none select-none whitespace-nowrap rounded-full border border-amber-400/30 bg-black/70 px-2 py-0.5 text-[9px] font-medium text-amber-200 backdrop-blur">
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 align-middle" /> Grid · MEA
        </div>
      </Html>
    </group>
  );
}

/** MDB switchboard cabinet at its real floor position — the distribution hub. */
function MdbCabinet({ active }: { active: boolean }) {
  const tr = useTr();
  return (
    <group position={[MDB_POS.x, 0, MDB_POS.z]}>
      <RoundedBox args={[0.36, 0.5, 0.26]} radius={0.03} smoothness={4} position={[0, 0.25, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.55} roughness={0.4} emissive="#22d3ee" emissiveIntensity={active ? 0.22 : 0.08} />
      </RoundedBox>
      {/* glowing front panel */}
      <mesh position={[0, 0.33, 0.135]}>
        <planeGeometry args={[0.22, 0.13]} />
        <meshStandardMaterial color="#0b1220" emissive="#22d3ee" emissiveIntensity={active ? 1.1 : 0.45} toneMapped={false} />
      </mesh>
      {/* breaker indicator dots */}
      {[-0.06, 0, 0.06].map((x, i) => (
        <mesh key={i} position={[x, 0.16, 0.135]}><boxGeometry args={[0.03, 0.05, 0.01]} /><meshStandardMaterial color="#334155" emissive="#34d399" emissiveIntensity={active ? 0.9 : 0.3} toneMapped={false} /></mesh>
      ))}
      <Html position={[0, 0.66, 0]} center distanceFactor={9} occlude={false}>
        <div className="pointer-events-none select-none whitespace-nowrap rounded-full border border-cyan-400/30 bg-black/70 px-2 py-0.5 text-[9px] font-semibold text-cyan-200 backdrop-blur">
          MDB · {tr("Main Distribution")}
        </div>
      </Html>
    </group>
  );
}

/** A maintenance technician who walks in from the building entrance to inspect a
 *  machine that has a problem, then stands beside it (helmet colour = severity). */
function Inspector({ a, index }: { a: Asset; index: number }) {
  const g = useRef<Group>(null);
  const start = useRef<number | null>(null);
  const b = buildings.find((x) => x.id === a.buildingId);
  const entrance = useMemo(() => new THREE.Vector3(b ? b.x : a.x, 0, 3.3), [a.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const stand = useMemo(() => new THREE.Vector3(a.x + 0.05, 0, a.z + 0.5), [a.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const machine = useMemo(() => new THREE.Vector3(a.x, 0, a.z), [a.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const tone = a.status === "critical" ? "#f43f5e" : "#f59e0b";

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (start.current === null) start.current = t + index * 0.55; // stagger arrivals
    const p = THREE.MathUtils.clamp((t - start.current) / 3.2, 0, 1);
    const eased = p * p * (3 - 2 * p); // smoothstep walk-in
    const pos = entrance.clone().lerp(stand, eased);
    const walking = p > 0.02 && p < 0.98;
    const bob = walking ? Math.abs(Math.sin(t * 7 + index)) * 0.035 : Math.sin(t * 2.2 + index) * 0.008;
    if (!g.current) return;
    g.current.position.set(pos.x, bob, pos.z);
    const dir = walking ? stand.clone().sub(entrance) : machine.clone().sub(pos);
    g.current.rotation.y = Math.atan2(dir.x, dir.z);
  });

  return (
    <group ref={g}>
      {/* coverall body */}
      <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[0.055, 0.075, 0.24, 10]} /><meshStandardMaterial color="#1f3a5f" roughness={0.75} /></mesh>
      {/* hi-vis chest band */}
      <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.062, 0.062, 0.03, 10]} /><meshStandardMaterial color="#eab308" emissive="#eab308" emissiveIntensity={0.4} roughness={0.5} /></mesh>
      {/* head */}
      <mesh position={[0, 0.28, 0]}><sphereGeometry args={[0.048, 12, 12]} /><meshStandardMaterial color="#caa47c" roughness={0.6} /></mesh>
      {/* hard hat */}
      <mesh position={[0, 0.31, 0]} scale={[1, 0.62, 1]}><sphereGeometry args={[0.056, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={0.5} roughness={0.4} /></mesh>
      {/* urgency beacon overhead */}
      <mesh position={[0, 0.44, 0]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={2} toneMapped={false} /></mesh>
    </group>
  );
}

/** Spawn technicians for the machines that currently have a problem (capped).
 *  Machines with an ASSIGNED engineer get a named CrewFigure instead. */
function Inspectors({ assetList, skipIds }: { assetList: Asset[]; skipIds: Set<string> }) {
  const injured = useMemo(
    () =>
      assetList
        .filter((a) => a.status !== "healthy" && a.id !== "mdb-11" && !skipIds.has(a.id))
        .sort((x, y) => (x.status === "critical" ? 0 : 1) - (y.status === "critical" ? 0 : 1))
        .slice(0, 8),
    [assetList, skipIds],
  );
  return <>{injured.map((a, i) => <Inspector key={a.id} a={a} index={i} />)}</>;
}

/* --------------------------------------------- assigned maintenance crew
   Game-style: the assigned engineer stands at the machine with an overhead
   tag — name · live elapsed bar vs plan · what they're doing right now. */

/** DOM name-tag above the technician's head; ticks every second. */
function CrewTag({ asg, eng }: { asg: CrewAssignment; eng: CrewMember }) {
  const { locale } = useI18n();
  const L = (o: LZ) => (locale === "th" ? o.th : o.en);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const ph = crewPhase(asg, now);
  const phase = CREW_PHASES[ph.key];
  const barColor = ph.overtime ? "#f43f5e" : phase.color;
  return (
    <Html position={[0, 0.66, 0]} center distanceFactor={8} occlude={false}>
      <div className="pointer-events-none w-[132px] select-none rounded-lg border bg-black/80 px-2 py-1.5 backdrop-blur" style={{ borderColor: `${eng.color}66` }}>
        <div className="flex items-center justify-between gap-1.5">
          <span className="flex min-w-0 items-center gap-1 text-[9.5px] font-semibold text-white">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: eng.color }} />
            <span className="truncate">{L(eng.short)}</span>
          </span>
          <span className="tabular shrink-0 text-[9px] text-white/70">{crewElapsedLabel(asg, now)}</span>
        </div>
        <div className="mt-1 h-[5px] overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(ph.pct * 100)}%`, backgroundColor: barColor }} />
        </div>
        <p className="mt-0.5 text-[8.5px] font-medium" style={{ color: barColor }}>
          {L(phase.label)}{ph.overtime ? ` · ${L(CREW_OVERTIME)}` : ""}
        </p>
      </div>
    </Html>
  );
}

/** The assigned engineer — walks in, stands at the machine, swings a wrench while repairing. */
function CrewFigure({ a, asg, index }: { a: Asset; asg: CrewAssignment; index: number }) {
  const g = useRef<Group>(null);
  const wrench = useRef<Group>(null);
  const start = useRef<number | null>(null);
  const b = buildings.find((x) => x.id === a.buildingId);
  const entrance = useMemo(() => new THREE.Vector3(b ? b.x : a.x, 0, 3.3), [a.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const stand = useMemo(() => new THREE.Vector3(a.x - 0.42, 0, a.z + 0.34), [a.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const machine = useMemo(() => new THREE.Vector3(a.x, 0, a.z), [a.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const eng = crewMember(asg.engId);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (start.current === null) start.current = t + index * 0.4;
    const p = THREE.MathUtils.clamp((t - start.current) / 2.8, 0, 1);
    const eased = p * p * (3 - 2 * p);
    const pos = entrance.clone().lerp(stand, eased);
    const walking = p > 0.02 && p < 0.98;
    const bob = walking ? Math.abs(Math.sin(t * 7 + index)) * 0.035 : Math.sin(t * 2.2 + index) * 0.008;
    if (!g.current) return;
    g.current.position.set(pos.x, bob, pos.z);
    const dir = walking ? stand.clone().sub(entrance) : machine.clone().sub(pos);
    g.current.rotation.y = Math.atan2(dir.x, dir.z);
    if (wrench.current) {
      const ph = crewPhase(asg);
      wrench.current.rotation.x = !walking && ph.key === "repair" ? Math.sin(t * 9) * 0.55 - 0.25 : -0.1;
    }
  });

  return (
    <group ref={g}>
      {/* coverall body */}
      <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[0.055, 0.075, 0.24, 10]} /><meshStandardMaterial color="#1f3a5f" roughness={0.75} /></mesh>
      {/* hi-vis chest band */}
      <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.062, 0.062, 0.03, 10]} /><meshStandardMaterial color="#eab308" emissive="#eab308" emissiveIntensity={0.4} roughness={0.5} /></mesh>
      {/* head */}
      <mesh position={[0, 0.28, 0]}><sphereGeometry args={[0.048, 12, 12]} /><meshStandardMaterial color="#caa47c" roughness={0.6} /></mesh>
      {/* hard hat in the engineer's colour */}
      <mesh position={[0, 0.31, 0]} scale={[1, 0.62, 1]}><sphereGeometry args={[0.056, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={eng.color} emissive={eng.color} emissiveIntensity={0.5} roughness={0.4} /></mesh>
      {/* wrench in hand — swings while repairing */}
      <group ref={wrench} position={[0.08, 0.15, 0.05]}>
        <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.008, 0.008, 0.1, 6]} /><meshStandardMaterial color="#9aa4b2" metalness={0.9} roughness={0.25} /></mesh>
        <mesh position={[0, 0, 0.11]}><boxGeometry args={[0.03, 0.012, 0.025]} /><meshStandardMaterial color="#9aa4b2" metalness={0.9} roughness={0.25} /></mesh>
      </group>
      {/* game-style overhead tag */}
      <CrewTag asg={asg} eng={eng} />
    </group>
  );
}

function CrewFigures({ assignments }: { assignments: CrewAssignment[] }) {
  return (
    <>
      {assignments.map((asg, i) => {
        const a = assets.find((x) => x.id === asg.assetId);
        return a ? <CrewFigure key={`${asg.assetId}-${asg.startedAt}`} a={a} asg={asg} index={i} /> : null;
      })}
    </>
  );
}

/* ------------------------------------------- supervisor assignment panel */

const ETA_CHOICES: { min: number; label: LZ }[] = [
  { min: 30, label: { en: "30 min", th: "30 นาที" } },
  { min: 60, label: { en: "1 hr", th: "1 ชม." } },
  { min: 120, label: { en: "2 hr", th: "2 ชม." } },
  { min: 240, label: { en: "4 hr", th: "4 ชม." } },
];

/** Inspector-panel section: assign the selected machine to an engineer, or
 *  track who is on it now (status · live timer · progress vs plan). */
function CrewPanel({ a }: { a: Asset }) {
  const { locale } = useI18n();
  const L = (o: LZ) => (locale === "th" ? o.th : o.en);
  const asgs = useCrewAssignments();
  const asg = asgs.find((x) => x.assetId === a.id);
  const teams = useTeams();
  const people = usePeople();
  const ownerPerson = personForAsset(a.line, people);
  const ownerTeam = ownerPerson ? teamOfPerson(ownerPerson.id, teams) : undefined;
  const ownerColor = ownerTeam?.color ?? "#64748b";
  const ownerIsLead = ownerTeam?.leaderId === ownerPerson?.id;

  // who oversees this machine — the engineer who personally covers its section (+ their team)
  const ownerBanner = ownerPerson ? (
    <div className="mt-4 flex items-center gap-2 rounded-xl border p-2.5" style={{ borderColor: `${ownerColor}33`, backgroundColor: `${ownerColor}0a` }}>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-ink-950" style={{ backgroundColor: ownerColor }}>{[...L(ownerPerson.name)][0]}</span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[10px] uppercase tracking-wide text-white/45">{L({ en: "Overseen by", th: "ดูแลโดย" })}</p>
        <p className="flex items-center gap-1 truncate text-[12.5px] font-medium text-white/90">{ownerIsLead ? <Crown size={11} className="shrink-0" style={{ color: ownerColor }} /> : null}{L(ownerPerson.name)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-[11px] leading-tight text-white/60">
        {ownerTeam ? <span className="truncate">{L(ownerTeam.name)}</span> : null}
        {ownerPerson.phone ? <a href={`tel:${ownerPerson.phone}`} className="flex items-center gap-1 text-white/45 transition hover:text-white/75"><Phone size={10} /> {ownerPerson.phone}</a> : null}
      </div>
    </div>
  ) : null;
  const [engId, setEngId] = useState(CREW[0].id);
  const [eta, setEta] = useState(60);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!asg) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [asg]);

  if (asg) {
    const eng = crewMember(asg.engId);
    const ph = crewPhase(asg, now);
    const phase = CREW_PHASES[ph.key];
    const barColor = ph.overtime ? "#f43f5e" : phase.color;
    return (
      <>
      {ownerBanner}
      <div className="mt-4 rounded-xl border p-3" style={{ borderColor: `${eng.color}44`, backgroundColor: `${eng.color}0d` }}>
        <div className="flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold text-white/90">
            <Wrench size={13} className="shrink-0" style={{ color: eng.color }} />
            <span className="truncate">{L(eng.name)}</span>
          </p>
          <span className="tabular shrink-0 text-[12px] font-semibold text-white/80">{crewElapsedLabel(asg, now)}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(ph.pct * 100)}%`, backgroundColor: barColor }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium" style={{ color: barColor }}>
            {L(phase.label)}{ph.overtime ? ` · ${L(CREW_OVERTIME)}` : ""}
          </p>
          <p className="text-[10px] text-white/40">{L({ en: "plan", th: "แผน" })} {asg.etaMin >= 60 ? `${asg.etaMin / 60} ${L({ en: "hr", th: "ชม." })}` : `${asg.etaMin} ${L({ en: "min", th: "นาที" })}`}</p>
        </div>
        <button onClick={() => completeJob(a.id)} className="btn-glow mt-2.5 w-full justify-center px-3 py-1.5 text-[12px]">
          <Check size={13} /> {L({ en: "Job done · close it out", th: "เสร็จงาน · ปิดใบซ่อม" })}
        </button>
      </div>
      </>
    );
  }

  return (
    <>
    {ownerBanner}
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/55">
        <Wrench size={12} className="text-brand-300" /> {L({ en: "Assign maintenance", th: "มอบหมายงานซ่อม" })}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {CREW.map((c) => {
          const busy = asgs.some((x) => x.engId === c.id);
          const on = engId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setEngId(c.id)}
              disabled={busy}
              title={busy ? L({ en: "busy on another machine", th: "กำลังทำเครื่องอื่นอยู่" }) : L(c.trade)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition",
                busy ? "cursor-not-allowed border-white/5 text-white/25"
                  : on ? "text-white/90" : "border-white/10 text-white/55 hover:text-white/80",
              )}
              style={on && !busy ? { borderColor: `${c.color}88`, backgroundColor: `${c.color}1a` } : undefined}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: busy ? "#475569" : c.color }} />
              {L(c.short)}{busy ? " ·⏳" : ""}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[10px] text-white/40">{L({ en: "plan", th: "แผน" })}</span>
        {ETA_CHOICES.map((e) => (
          <button
            key={e.min}
            onClick={() => setEta(e.min)}
            className={cn(
              "rounded-md border px-1.5 py-0.5 text-[10.5px] tabular transition",
              eta === e.min ? "border-brand-400/50 bg-brand-400/10 text-brand-200" : "border-white/10 text-white/45 hover:text-white/70",
            )}
          >
            {L(e.label)}
          </button>
        ))}
      </div>
      <button
        onClick={() => assignJob(a.id, engId, eta)}
        className="btn-glow mt-2.5 w-full justify-center px-3 py-1.5 text-[12px]"
      >
        <Wrench size={13} /> {L({ en: `Assign to ${crewMember(engId).short.en}`, th: `มอบหมายให้${crewMember(engId).short.th}` })}
      </button>
    </div>
    </>
  );
}

/* ------------------------------------------------------------------ scene */

function Scene({
  layer,
  selectedId,
  onSelect,
  reduce,
  coarse,
  assetList,
  assignments,
}: {
  layer: TwinLayer;
  selectedId: string | null;
  onSelect: (id: string) => void;
  reduce: boolean;
  coarse: boolean;
  assetList: Asset[];
  assignments: CrewAssignment[];
}) {
  const assignedIds = useMemo(() => new Set(assignments.map((x) => x.assetId)), [assignments]);
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 10, 5]} intensity={1.15} castShadow />
      <directionalLight position={[-7, 5, -5]} intensity={0.45} color="#6366f1" />
      <Environment preset="city" />

      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 13]} />
          <meshStandardMaterial color="#070811" metalness={0.3} roughness={0.85} />
        </mesh>
        <gridHelper args={[20, 36, "#1d3a44", "#141a26"]} position={[0, 0.002, 0]} />

        {buildings.map((b) => (
          <BuildingBlock key={b.id} b={b} />
        ))}

        <UtilityPole />
        <MdbCabinet active={layer === "energy"} />
        <FlowPulses active={layer === "energy"} />
        <Inspectors assetList={assetList} skipIds={assignedIds} />
        <CrewFigures assignments={assignments} />

        {assetList.map((a) => (
          <MachineNode
            key={a.id}
            a={a}
            layer={layer}
            selected={a.id === selectedId}
            onSelect={onSelect}
          />
        ))}

        <ContactShadows
          position={[0, 0.008, 0]}
          opacity={0.5}
          scale={24}
          blur={2.8}
          far={5}
          color="#000000"
        />
      </group>

      <OrbitControls
        enablePan={false}
        enableZoom
        enableRotate={!coarse}
        autoRotate={!reduce}
        autoRotateSpeed={0.4}
        minPolarAngle={Math.PI / 7}
        maxPolarAngle={Math.PI / 2.3}
        minDistance={8}
        maxDistance={26}
        target={[0, 0.6, 0]}
      />
    </>
  );
}

/* -------------------------------------------------------------- experience */

export function DigitalTwin({
  height = "h-[460px] sm:h-[560px]",
  showInspector = true,
  defaultLayer = "health",
  layers,
  electrical = false,
  overlay,
  liveStatuses,
  hideAssetList = false,
}: {
  height?: string;
  showInspector?: boolean;
  /** initial data layer */
  defaultLayer?: TwinLayer;
  /** restrict the layer switcher to these layers (hidden when only one) */
  layers?: TwinLayer[];
  /** inspector shows electrical parameters (V · A · PF · kWh) */
  electrical?: boolean;
  /** HUD content floated over the lower part of the 3D scene */
  overlay?: React.ReactNode;
  /** live status overrides (event simulation) — id → status */
  liveStatuses?: Record<string, AssetStatus>;
  /** hide the "factory floor" list — click a machine in the 3D scene instead;
   *  the detail panel then fills the full inspector height */
  hideAssetList?: boolean;
}) {
  const tr = useTr();
  const [mounted, setMounted] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [layer, setLayer] = useState<TwinLayer>(defaultLayer);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;
  const inView = useInView(wrapRef, { margin: "200px" });

  const defaultId = useMemo(
    () => assets.find((a) => a.status === "critical")?.id ?? assets[0]?.id ?? null,
    [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(defaultId);
  // active maintenance assignments — drives the named crew figures in the scene
  const crewAsgs = useCrewAssignments();
  // apply live event-simulation overrides on top of the static model
  const liveAssets = useMemo(
    () =>
      liveStatuses
        ? assets.map((a) => (liveStatuses[a.id] ? { ...a, status: liveStatuses[a.id] } : a))
        : assets,
    [liveStatuses],
  );

  const selected = useMemo(
    () => liveAssets.find((a) => a.id === selectedId) ?? null,
    [selectedId, liveAssets],
  );

  const layerDefs = layers ? twinLayers.filter((l) => layers.includes(l.id)) : twinLayers;

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && window.matchMedia) {
      setCoarse(window.matchMedia("(pointer: coarse)").matches);
    }
  }, []);

  // deep-link: focus an asset requested from another workspace tab
  useEffect(() => {
    const apply = (id: string) => {
      if (assets.some((a) => a.id === id)) setSelectedId(id);
    };
    if (uibus.pendingAsset) {
      apply(uibus.pendingAsset);
      uibus.pendingAsset = null;
    }
    const onFocus = (e: Event) => {
      const id = (e as CustomEvent).detail?.id;
      if (id) apply(id);
    };
    window.addEventListener("factoryos:focus-asset", onFocus as EventListener);
    return () => window.removeEventListener("factoryos:focus-asset", onFocus as EventListener);
  }, []);

  const frameloop = reduce ? "demand" : inView ? "always" : "never";

  return (
    <div
      className={cn(
        "grid gap-5",
        showInspector ? "lg:grid-cols-[1.7fr_1fr]" : "grid-cols-1",
      )}
    >
      {/* Canvas + controls */}
      <div className="twin-stage relative overflow-hidden rounded-3xl border border-white/10 bg-ink-900/60">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" />

        {/* layer switcher */}
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
          {layerDefs.length > 1 && layerDefs.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayer(l.id)}
              title={l.hint}
              className={cn(
                "whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur transition",
                layer === l.id
                  ? "border-brand-400/40 bg-brand-400/15 text-brand-200"
                  : "border-white/10 bg-black/30 text-white/55 hover:text-white/80",
              )}
            >
              {tr(l.label)}
            </button>
          ))}
        </div>

        <div ref={wrapRef} className={cn("relative w-full", height)}>
          {mounted ? (
            <Canvas
              shadows
              dpr={[1, 2]}
              frameloop={frameloop}
              camera={{ position: [10.5, 6, 10.5], fov: 36 }}
              onPointerMissed={() => {}}
            >
              <Scene
                layer={layer}
                selectedId={selectedId}
                onSelect={setSelectedId}
                reduce={reduce}
                coarse={coarse}
                assetList={liveAssets}
                assignments={crewAsgs}
              />
            </Canvas>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-white/45">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />
                {tr("Initializing digital twin…")}
              </div>
            </div>
          )}
        </div>

        {/* HUD overlay (e.g. live energy summary) */}
        {overlay ? (
          <div className="pointer-events-none absolute inset-x-3 bottom-9 z-10 flex flex-wrap items-center justify-center gap-1.5">
            {overlay}
          </div>
        ) : null}

        {/* legend */}
        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-3 text-[11px] text-white/55">
          {layer === "carbon" ? (
            <>
              <Legend dot="bg-status-ok" label={tr("Low")} />
              <Legend dot="bg-status-warn" label={tr("Medium")} />
              <Legend dot="bg-status-crit" label={tr("High CO₂")} />
            </>
          ) : layer === "energy" ? (
            <>
              <Legend dot="bg-status-ok" label={tr("Normal")} />
              <Legend dot="bg-status-warn" label={tr("Load rising")} />
              <Legend dot="bg-status-crit" label={tr("Over-draw")} />
              <span className="text-white/40">{tr("bar height = kW")}</span>
            </>
          ) : (
            (["healthy", "warning", "critical"] as AssetStatus[]).map((s) => (
              <Legend key={s} dot={STATUS_DOT[s]} label={tr(STATUS_LABEL[s])} />
            ))
          )}
        </div>

        <div className="pointer-events-none absolute bottom-3 right-3 text-[10px] text-white/35">
          {tr("drag to rotate · scroll to zoom")}
        </div>
      </div>

      {/* Inspector — bounded to the canvas height; lists scroll inside */}
      {showInspector ? (
        <div className={cn("flex flex-col gap-4", height)}>
          <div
            className={cn(
              "panel overflow-y-auto p-5",
              hideAssetList ? "min-h-0 flex-1" : "max-h-[65%] shrink-0",
            )}
          >
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-white/50">
                      {tr("Selected asset")}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{selected.name}</h3>
                    <p className="text-xs text-white/45">{selected.type}</p>
                    <span className="chip mt-2 text-[10px]">
                      {tr(CATEGORY_LABEL[selected.category])} · {selected.line}
                    </span>
                  </div>
                  <span
                    className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium"
                    style={{
                      color: STATUS_COLOR[selected.status],
                      borderColor: `color-mix(in srgb, ${STATUS_COLOR[selected.status]} 33%, transparent)`,
                      backgroundColor: `color-mix(in srgb, ${STATUS_COLOR[selected.status]} 10%, transparent)`,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: STATUS_COLOR[selected.status] }}
                    />
                    {tr(STATUS_LABEL[selected.status])}
                  </span>
                </div>

                {electrical ? (
                  (() => {
                    // deterministic electrical parameters derived from the asset
                    const seed = (selected.id.charCodeAt(0) * 7 + selected.id.length * 13) % 100;
                    const pf = (90 + (seed % 8)) / 100;
                    const volts = 398 + (seed % 5);
                    const amps =
                      selected.powerKw > 0
                        ? Math.round((selected.powerKw * 1000) / (Math.sqrt(3) * volts * pf))
                        : 0;
                    return (
                      <div className="mt-4 grid grid-cols-2 gap-2.5">
                        <Metric label={tr("Power")} value={`${selected.powerKw}`} unit="kW" />
                        <Metric label={tr("Current")} value={`${amps}`} unit="A" />
                        <Metric label={tr("Voltage L-L")} value={`${volts}`} unit="V" />
                        <Metric label={tr("Power Factor")} value={pf.toFixed(2)} />
                        <Metric label={tr("Energy · today")} value={`${(selected.powerKw * 20).toLocaleString()}`} unit="kWh" />
                        <Metric label="CO₂" value={`${selected.co2KgH}`} unit="kg/h" />
                      </div>
                    );
                  })()
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <Metric label={tr("Health")} value={`${selected.health}`} unit="/100" />
                    <Metric label="OEE" value={`${selected.oee}`} unit="%" />
                    <Metric label={tr("Power")} value={`${selected.powerKw}`} unit="kW" />
                    <Metric label={tr("Vibration")} value={`${selected.vibration}`} unit="mm/s" />
                    <Metric label={tr("Temp")} value={`${selected.tempC}`} unit="°C" />
                    <Metric label="CO₂" value={`${selected.co2KgH}`} unit="kg/h" />
                  </div>
                )}

                {selected.rulDays !== null ? (
                  <div className="mt-4 rounded-xl border border-status-crit/30 bg-status-crit/10 p-3 text-xs text-rose-200">
                    <span className="font-semibold">{tr("Predicted failure")}</span> {tr("in ~")}
                    {selected.rulDays} {tr("days — AI recommends a work order now.")}
                  </div>
                ) : null}

                {/* maintenance crew — assign / track who's on this machine */}
                <CrewPanel a={selected} />

                <p className="mt-4 text-sm leading-relaxed text-white/60">
                  {selected.detail}
                </p>
              </motion.div>
            ) : hideAssetList ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-brand-400/30 bg-brand-400/10 text-brand-300">
                  <MousePointerClick size={22} />
                </span>
                <p className="text-sm font-medium text-white/70">{tr("Click a machine in the 3D view")}</p>
                <p className="max-w-[220px] text-xs text-white/45">
                  {tr("Select any asset to inspect its live electrical parameters — power, current, voltage, PF and energy.")}
                </p>
              </div>
            ) : (
              <p className="text-sm text-white/55">{tr("Select an asset to inspect.")}</p>
            )}
          </div>

          {!hideAssetList ? (
            <div className="panel flex min-h-0 flex-1 flex-col p-5">
              <p className="shrink-0 text-[11px] uppercase tracking-wider text-white/50">
                {tr("Factory floor")} · {assets.length} {tr("assets")}
              </p>
              <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-auto pr-1">
                {liveAssets.map((a) => {
                  const active = a.id === selectedId;
                  return (
                    <li key={a.id}>
                      <button
                        onClick={() => setSelectedId(a.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition",
                          active
                            ? "border-white/20 bg-white/10"
                            : "border-transparent text-white/70 hover:bg-white/5",
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: STATUS_COLOR[a.status] }}
                          />
                          <span className="truncate">{a.name}</span>
                        </span>
                        <span className="shrink-0 tabular text-white/45">{a.oee}%</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      {label}
    </span>
  );
}

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular">
        {value}
        {unit ? <span className="ml-0.5 text-xs text-white/45">{unit}</span> : null}
      </p>
    </div>
  );
}
