"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Html } from "@react-three/drei";
import * as THREE from "three";
import { useTr } from "@/lib/autotranslate";

/* the plant's power topology: Grid/Substation → MDB → Lines/Utility → Machines.
   Values match the 2D flow (kW). Rebuilt as a live 3D energy-flow scene. */
type FNode = { id: string; label: string; kw: number; color: string; pos: [number, number, number] };

const COL = { src: -6.8, mdb: -2.3, line: 2.4, mach: 6.9 };

function useFlow() {
  const tr = useTr();
  const nodes: FNode[] = [
    { id: "grid", label: tr("Grid"), kw: 2840, color: "#22d3ee", pos: [COL.src, 1.35, 0] },
    { id: "sub", label: tr("Substation"), kw: 2840, color: "#22d3ee", pos: [COL.src, -1.35, 0] },
    { id: "mdb", label: "MDB", kw: 2810, color: "#818cf8", pos: [COL.mdb, 0, 0] },
    { id: "lineA", label: "Line A", kw: 196, color: "#34d399", pos: [COL.line, 1.9, 0] },
    { id: "lineB", label: "Line B", kw: 376, color: "#34d399", pos: [COL.line, 0, 0] },
    { id: "util", label: tr("Utility"), kw: 668, color: "#f59e0b", pos: [COL.line, -1.9, 0] },
    { id: "cnc", label: tr("CNC / Robots"), kw: 296, color: "#22d3ee", pos: [COL.mach, 1.9, 0] },
    { id: "press", label: tr("Press / Mold"), kw: 220, color: "#22d3ee", pos: [COL.mach, 0, 0] },
    { id: "chill", label: tr("Chillers / Air"), kw: 510, color: "#f472b6", pos: [COL.mach, -1.9, 0] },
  ];
  const links: [string, string][] = [
    ["grid", "mdb"], ["sub", "mdb"],
    ["mdb", "lineA"], ["mdb", "lineB"], ["mdb", "util"],
    ["lineA", "cnc"], ["lineB", "press"], ["util", "chill"],
  ];
  return { nodes, links, tr };
}

/** a distribution/equipment cabinet — breathing emissive + a screen-facing label */
function FlowNode3D({ n }: { n: FNode }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const seed = useMemo(() => n.pos[0] * 0.6 + n.pos[1] * 1.3, [n]);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.emissiveIntensity = 0.55 + 0.35 * Math.sin(clock.getElapsedTime() * 1.8 + seed);
  });
  return (
    <group position={n.pos}>
      <RoundedBox args={[2.25, 1.2, 0.5]} radius={0.14} smoothness={4}>
        <meshStandardMaterial ref={mat} color="#0d1526" emissive={n.color} emissiveIntensity={0.6} metalness={0.35} roughness={0.35} />
      </RoundedBox>
      {/* accent bar */}
      <mesh position={[0, -0.52, 0.27]}>
        <boxGeometry args={[2.0, 0.07, 0.02]} />
        <meshBasicMaterial color={n.color} toneMapped={false} />
      </mesh>
      <Html center distanceFactor={10} position={[0, 0, 0.3]} pointerEvents="none" zIndexRange={[10, 0]}>
        <div style={{ width: 120, textAlign: "center", userSelect: "none" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e6ecf5", whiteSpace: "nowrap" }}>{n.label}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: n.color }}>{n.kw.toLocaleString()} kW</div>
        </div>
      </Html>
    </group>
  );
}

/** an energy conduit with glowing pulses travelling source → sink */
function FlowLink({ a, b, color, count, speed }: { a: [number, number, number]; b: [number, number, number]; color: string; count: number; speed: number }) {
  const curve = useMemo(() => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const mid = A.clone().lerp(B, 0.5);
    mid.z += 0.9; // bow the conduit forward for depth
    mid.y += 0.12;
    return new THREE.QuadraticBezierCurve3(A, mid, B);
  }, [a, b]);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.02, 8, false), [curve]);
  const pulses = useRef<(THREE.Mesh | null)[]>([]);
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
        <meshBasicMaterial color={color} transparent opacity={0.22} toneMapped={false} />
      </mesh>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} ref={(el) => { pulses.current[i] = el; }}>
          <sphereGeometry args={[0.085, 12, 12]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export function ProcessFlow3D() {
  const { nodes, links, tr } = useFlow();
  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])) as Record<string, FNode>, [nodes]);
  return (
    <div className="twin-stage relative h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-[#070b14] sm:h-[460px]">
      <Canvas camera={{ position: [0, 2.6, 14.5], fov: 40 }} dpr={[1, 2]}>
        <color attach="background" args={["#070b14"]} />
        <fog attach="fog" args={["#070b14", 17, 36]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[6, 9, 7]} intensity={0.7} />
        <pointLight position={[COL.mdb, 0, 4]} intensity={26} color="#818cf8" distance={22} />
        <gridHelper args={[46, 46, "#16233b", "#0d1626"]} position={[0, -3, 0]} />
        {nodes.map((n) => <FlowNode3D key={n.id} n={n} />)}
        {links.map(([f, tId], i) => {
          const B = byId[tId];
          return <FlowLink key={i} a={byId[f].pos} b={B.pos} color={B.color} count={Math.min(8, Math.max(2, Math.round(B.kw / 110)))} speed={0.25 + B.kw / 9000} />;
        })}
        <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.5} minPolarAngle={Math.PI * 0.28} maxPolarAngle={Math.PI * 0.6} minDistance={9} maxDistance={22} />
      </Canvas>
      <div className="pointer-events-none absolute bottom-3 left-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/55">
        <Legend color="#22d3ee" label={tr("Grid")} />
        <Legend color="#818cf8" label="MDB" />
        <Legend color="#34d399" label={tr("Lines")} />
        <Legend color="#f59e0b" label={tr("Utility")} />
        <Legend color="#f472b6" label={tr("Cooling")} />
      </div>
      <div className="pointer-events-none absolute right-4 top-3 rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[10.5px] text-white/65">
        {tr("Drag to orbit · live power flow")}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
