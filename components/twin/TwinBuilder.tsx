"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Save, Trash2, Wand2, MousePointer2, SquareDashed, Undo2 } from "lucide-react";
import {
  MACHINE_LIB, ZONE_COLORS, libById, loadLayout, saveLayout, sampleLayout, sampleAutomotiveLayout, newUid, zoneOf,
  type TwinLayout, type PlacedMachine, type ZoneRect,
} from "@/lib/twin-builder";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/* Top-down layout editor for the 3D twin. World = the scene floor plane:
 * x −10..10, z −6.5..6.5. Click a library type → click the floor to place;
 * drag machines to move; zone mode drags a rectangle that becomes a Line/Area.
 * Saved layouts replace the mock factory in the 3D view (lib/twin-builder). */

const W = 20, D = 13; // floor extents (must match the scene's planeGeometry)

type Sel = { kind: "m" | "z"; uid: string } | null;

export function TwinBuilder({ onClose, onSaved }: { onClose: () => void; onSaved: (l: TwinLayout | null) => void }) {
  const { locale } = useI18n();
  const L = (o: { en: string; th: string }) => (locale === "th" ? o.th : o.en);
  const [layout, setLayout] = useState<TwinLayout>({ machines: [], zones: [], active: true });
  const [sel, setSel] = useState<Sel>(null);
  const [armed, setArmed] = useState<string | null>(null); // lib id waiting for placement
  const [zoneMode, setZoneMode] = useState(false);
  const [zoneDraft, setZoneDraft] = useState<{ x1: number; z1: number; x2: number; z2: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<string | null>(null);
  const resizing = useRef<{ uid: string; edge: "l" | "r" | "t" | "b" } | null>(null);

  useEffect(() => {
    const saved = loadLayout();
    if (saved) setLayout(saved);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setArmed(null); setZoneMode(false); setZoneDraft(null); }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, []);

  // client px → world coords via the SVG's own transform matrix — exact under
  // preserveAspectRatio letterboxing, so drawing starts precisely at the cursor
  const toWorld = (e: { clientX: number; clientY: number }): [number, number] => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return [Math.round(p.x * 5) / 5, Math.round(p.y * 5) / 5]; // snap 0.2
  };
  const clamp = (x: number, z: number): [number, number] => [
    Math.max(-W / 2 + 0.6, Math.min(W / 2 - 0.6, x)),
    Math.max(-D / 2 + 0.6, Math.min(D / 2 - 0.6, z)),
  ];

  const selM = sel?.kind === "m" ? layout.machines.find((m) => m.uid === sel.uid) : undefined;
  const selZ = sel?.kind === "z" ? layout.zones.find((z) => z.uid === sel.uid) : undefined;
  const patchM = (uid: string, p: Partial<PlacedMachine>) =>
    setLayout((l) => ({ ...l, machines: l.machines.map((m) => (m.uid === uid ? { ...m, ...p } : m)) }));
  const patchZ = (uid: string, p: Partial<ZoneRect>) =>
    setLayout((l) => ({ ...l, zones: l.zones.map((z) => (z.uid === uid ? { ...z, ...p } : z)) }));

  const placeAt = (libId: string, x: number, z: number) => {
    const lib = libById(libId);
    if (!lib) return;
    const n = layout.machines.filter((m) => m.libId === libId).length + 1;
    const uid = newUid();
    const [cx, cz] = clamp(x, z);
    setLayout((l) => ({
      ...l,
      machines: [...l.machines, { uid, libId, machineId: `${lib.labelEn.slice(0, 3).toUpperCase()}-${String(n).padStart(2, "0")}`, name: lib.labelEn, kva: lib.defaultKva, x: cx, z: cz }],
    }));
    setSel({ kind: "m", uid });
  };

  const onFloorDown = (e: React.PointerEvent) => {
    const [x, z] = toWorld(e);
    if (armed) { placeAt(armed, x, z); return; }
    if (zoneMode) { setZoneDraft({ x1: x, z1: z, x2: x, z2: z }); return; }
    setSel(null);
  };
  const onMove = (e: React.PointerEvent) => {
    if (resizing.current) {
      const [x, z] = toWorld(e);
      const r = resizing.current;
      setLayout((l) => ({
        ...l,
        zones: l.zones.map((zn) => {
          if (zn.uid !== r.uid) return zn;
          let { x: cx, z: cz, w, d } = zn;
          if (r.edge === "l") { const right = cx + w / 2; const left = Math.min(x, right - 1.2); w = right - left; cx = (left + right) / 2; }
          if (r.edge === "r") { const left = cx - w / 2; const right = Math.max(x, left + 1.2); w = right - left; cx = (left + right) / 2; }
          if (r.edge === "t") { const bot = cz + d / 2; const top = Math.min(z, bot - 1.2); d = bot - top; cz = (top + bot) / 2; }
          if (r.edge === "b") { const top = cz - d / 2; const bot = Math.max(z, top + 1.2); d = bot - top; cz = (top + bot) / 2; }
          return { ...zn, x: cx, z: cz, w, d };
        }),
      }));
      return;
    }
    if (dragging.current) {
      const [x, z] = toWorld(e);
      const [cx, cz] = clamp(x, z);
      patchM(dragging.current, { x: cx, z: cz });
    } else if (zoneDraft) {
      const [x, z] = toWorld(e);
      setZoneDraft((zd) => (zd ? { ...zd, x2: x, z2: z } : zd));
    }
  };
  const onUp = () => {
    dragging.current = null;
    resizing.current = null;
    if (zoneDraft) {
      const w = Math.abs(zoneDraft.x2 - zoneDraft.x1);
      const d = Math.abs(zoneDraft.z2 - zoneDraft.z1);
      if (w >= 1.2 && d >= 1.2) {
        const uid = newUid();
        setLayout((l) => ({
          ...l,
          zones: [...l.zones, {
            uid,
            name: `Line ${String.fromCharCode(65 + l.zones.length)}`,
            x: (zoneDraft.x1 + zoneDraft.x2) / 2, z: (zoneDraft.z1 + zoneDraft.z2) / 2, w, d,
            color: ZONE_COLORS[l.zones.length % ZONE_COLORS.length],
          }],
        }));
        setSel({ kind: "z", uid });
        setZoneMode(false);
      }
      setZoneDraft(null);
    }
  };

  const save = () => {
    const l = { ...layout, active: true };
    saveLayout(l);
    onSaved(l.machines.length ? l : null);
    onClose();
  };
  const useMock = () => {
    const l = { ...layout, active: false };
    saveLayout(l);
    onSaved(null);
    onClose();
  };

  const inputCls = "w-full rounded-lg border border-white/12 bg-white/[0.03] px-2.5 py-1.5 text-[12.5px] text-white focus:border-brand-400/50 focus:outline-none";
  const label = "mt-2.5 block text-[10.5px] font-medium uppercase tracking-wider text-white/45";

  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col bg-ink-950">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/8 px-4 py-2.5">
        <p className="text-[14px] font-bold text-white">{L({ en: "Factory Layout Builder", th: "จัดผังโรงงานของคุณ" })}</p>
        <p className="hidden text-[11px] text-white/40 sm:block">{L({ en: "pick a machine → click the floor · drag to move · draw zones for Lines/Areas", th: "เลือกเครื่อง → คลิกวาง · ลากเพื่อย้าย · วาดโซนเป็นไลน์/พื้นที่" })}</p>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button onClick={() => { setLayout(sampleLayout()); setSel(null); }} className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/70 transition hover:text-white"><Wand2 size={13} /> {L({ en: "Sample: 15 real machines", th: "ตัวอย่าง: 15 เครื่องจริง" })}</button>
          <button onClick={() => { setLayout(sampleAutomotiveLayout()); setSel(null); }} className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/70 transition hover:text-white"><Wand2 size={13} /> {L({ en: "Sample: full automotive line", th: "ตัวอย่าง: สาย Automotive เต็มไลน์" })}</button>
          <button onClick={() => { setLayout({ machines: [], zones: [], active: true }); setSel(null); }} className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/70 transition hover:text-white"><Trash2 size={13} /> {L({ en: "Clear", th: "ล้างผัง" })}</button>
          <button onClick={useMock} className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/70 transition hover:text-white"><Undo2 size={13} /> {L({ en: "Use default demo plant", th: "ใช้โรงงานตัวอย่างเดิม" })}</button>
          <button onClick={save} className="btn-glow px-4 py-1.5 text-[12.5px]"><Save size={13} /> {L({ en: "Save & show in 3D", th: "บันทึก & แสดงใน 3D" })}</button>
          <button onClick={onClose} aria-label={L({ en: "Close", th: "ปิด" })} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/60 transition hover:text-white"><X size={15} /></button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* library palette */}
        <aside className="w-[210px] shrink-0 space-y-1 overflow-y-auto border-r border-white/8 p-2.5">
          <p className="px-1 text-[10.5px] font-medium uppercase tracking-wider text-white/45">{L({ en: "Machine library", th: "คลังเครื่องจักร" })}</p>
          <p className="px-1 text-[9.5px] text-white/35">{L({ en: "Drag onto the floor, or click then click the floor", th: "ลากไปวางบนพื้น หรือคลิกเลือกแล้วคลิกพื้น" })}</p>
          {MACHINE_LIB.map((m, i) => (<Fragment key={m.id}>
          {i > 0 && MACHINE_LIB[i - 1].cat !== m.cat ? (
            <p className="px-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-white/40">{L({ en: "Facility & Electrical", th: "ระบบสนับสนุน & ไฟฟ้า" })}</p>
          ) : null}
            <button
              draggable
              onDragStart={(e) => { e.dataTransfer.setData("text/lib", m.id); e.dataTransfer.effectAllowed = "copy"; setArmed(null); setZoneMode(false); }}
              onClick={() => { setArmed(armed === m.id ? null : m.id); setZoneMode(false); }}
              className={cn("flex w-full cursor-grab items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition active:cursor-grabbing",
                armed === m.id ? "border-brand-400/60 bg-brand-400/[0.1]" : "border-white/8 bg-white/[0.02] hover:bg-white/[0.05]")}
            >
              <span className="h-3.5 w-3.5 shrink-0 rounded" style={{ background: m.color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] text-white/85">{L({ en: m.labelEn, th: m.labelTh })}</span>
                <span className="block text-[9.5px] text-white/35">{m.infra ? L({ en: "infrastructure", th: "โครงสร้างไฟฟ้า" }) : m.defaultKva ? `~${m.defaultKva} kVA` : "—"}</span>
              </span>
            </button>
          </Fragment>))}
          <div className="pt-2">
            <button
              onClick={() => { setZoneMode(!zoneMode); setArmed(null); }}
              className={cn("flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-[12px] transition",
                zoneMode ? "border-emerald-400/60 bg-emerald-400/[0.1] text-emerald-200" : "border-white/8 bg-white/[0.02] text-white/70 hover:bg-white/[0.05]")}
            ><SquareDashed size={14} /> {L({ en: "Draw Line / Area zone", th: "วาดโซนไลน์ / พื้นที่" })}</button>
          </div>
        </aside>

        {/* floor canvas */}
        <div className="relative min-w-0 flex-1 p-3">
          <svg
            ref={svgRef}
            viewBox={`${-W / 2} ${-D / 2} ${W} ${D}`}
            className={cn("h-full w-full rounded-xl border border-white/10 bg-[#070811]", (armed || zoneMode) ? "cursor-crosshair" : "cursor-default")}
            onPointerDown={onFloorDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const libId = e.dataTransfer.getData("text/lib");
              if (libId) { const [x, z] = toWorld(e); placeAt(libId, x, z); }
            }}
          >
            <defs>
              <pattern id="tb-grid" width="1" height="1" patternUnits="userSpaceOnUse">
                <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#16202e" strokeWidth="0.02" />
              </pattern>
            </defs>
            <rect x={-W / 2} y={-D / 2} width={W} height={D} fill="url(#tb-grid)" />
            {/* zones */}
            {layout.zones.map((zn) => {
              const zsel = sel?.kind === "z" && sel.uid === zn.uid;
              return (
                <g key={zn.uid} onPointerDown={(e) => { e.stopPropagation(); setSel({ kind: "z", uid: zn.uid }); }}>
                  <rect x={zn.x - zn.w / 2} y={zn.z - zn.d / 2} width={zn.w} height={zn.d} rx={0.2}
                    fill={`${zn.color}14`} stroke={zn.color} strokeOpacity={zsel ? 1 : 0.45}
                    strokeWidth={0.06} strokeDasharray="0.3 0.16" />
                  <text x={zn.x - zn.w / 2 + 0.25} y={zn.z - zn.d / 2 + 0.55} fontSize={0.42} fontWeight={700} fill={zn.color} style={{ fontFamily: "monospace" }}>{zn.name}</text>
                  {/* resize handles — drag any edge of the selected zone */}
                  {zsel ? (["l", "r", "t", "b"] as const).map((edge) => {
                    const horiz = edge === "l" || edge === "r";
                    const hx = edge === "l" ? zn.x - zn.w / 2 : edge === "r" ? zn.x + zn.w / 2 : zn.x;
                    const hz = edge === "t" ? zn.z - zn.d / 2 : edge === "b" ? zn.z + zn.d / 2 : zn.z;
                    const grab = (e: React.PointerEvent) => {
                      e.stopPropagation();
                      setSel({ kind: "z", uid: zn.uid });
                      resizing.current = { uid: zn.uid, edge };
                      (e.target as Element).setPointerCapture?.(e.pointerId);
                    };
                    return (
                      <g key={edge}>
                        {/* wide invisible hit bar along the whole edge */}
                        <rect
                          x={horiz ? hx - 0.2 : zn.x - zn.w / 2} y={horiz ? zn.z - zn.d / 2 : hz - 0.2}
                          width={horiz ? 0.4 : zn.w} height={horiz ? zn.d : 0.4}
                          fill="transparent" style={{ cursor: horiz ? "ew-resize" : "ns-resize" }}
                          onPointerDown={grab}
                        />
                        {/* visible knob at the edge midpoint */}
                        <rect x={hx - 0.14} y={hz - 0.14} width={0.28} height={0.28} rx={0.06}
                          fill={zn.color} stroke="#ffffff" strokeWidth={0.035} pointerEvents="none" />
                      </g>
                    );
                  }) : null}
                </g>
              );
            })}
            {zoneDraft ? (
              <rect x={Math.min(zoneDraft.x1, zoneDraft.x2)} y={Math.min(zoneDraft.z1, zoneDraft.z2)}
                width={Math.abs(zoneDraft.x2 - zoneDraft.x1)} height={Math.abs(zoneDraft.z2 - zoneDraft.z1)}
                fill="#34d39912" stroke="#34d399" strokeWidth={0.05} strokeDasharray="0.25 0.14" />
            ) : null}
            {/* machines */}
            {layout.machines.map((m) => {
              const lib = libById(m.libId);
              const selected = sel?.kind === "m" && sel.uid === m.uid;
              return (
                <g key={m.uid} className="cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => { e.stopPropagation(); setSel({ kind: "m", uid: m.uid }); dragging.current = m.uid; (e.target as Element).setPointerCapture?.(e.pointerId); }}
                >
                  <rect x={m.x - 0.55} y={m.z - 0.55} width={1.1} height={1.1} rx={0.14}
                    fill={`${lib?.color ?? "#94a3b8"}2a`} stroke={selected ? "#ffffff" : lib?.color ?? "#94a3b8"} strokeWidth={selected ? 0.07 : 0.045} />
                  <rect x={m.x - 0.3} y={m.z - 0.3} width={0.6} height={0.6} rx={0.08} fill={lib?.color ?? "#94a3b8"} opacity={0.85} />
                  <text x={m.x} y={m.z + 0.92} fontSize={0.34} fontWeight={600} textAnchor="middle" fill="#e2e8f0" style={{ fontFamily: "monospace" }}>{m.machineId}</text>
                </g>
              );
            })}
          </svg>
          {armed ? <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-brand-400/40 bg-ink-950/90 px-3.5 py-1.5 text-[11.5px] text-brand-200">{L({ en: "Click the floor to place · Esc to stop", th: "คลิกบนพื้นเพื่อวาง · Esc เพื่อเลิกวาง" })}</p> : null}
          {zoneMode ? <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-emerald-400/40 bg-ink-950/90 px-3.5 py-1.5 text-[11.5px] text-emerald-200">{L({ en: "Drag a rectangle around the machines of one Line/Area", th: "ลากกรอบครอบเครื่องของไลน์/พื้นที่นั้น" })}</p> : null}
        </div>

        {/* properties */}
        <aside className="w-[240px] shrink-0 overflow-y-auto border-l border-white/8 p-3">
          {selM ? (
            <>
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-white"><MousePointer2 size={12} /> {L({ en: "Machine", th: "เครื่องจักร" })}</p>
              <label className={label}>Machine ID</label>
              <input className={inputCls} value={selM.machineId} onChange={(e) => patchM(selM.uid, { machineId: e.target.value.slice(0, 16) })} />
              <label className={label}>{L({ en: "Machine name", th: "ชื่อเครื่อง" })}</label>
              <input className={inputCls} value={selM.name} onChange={(e) => patchM(selM.uid, { name: e.target.value.slice(0, 60) })} />
              <label className={label}>{L({ en: "Power (kVA)", th: "พิกัดไฟ (kVA)" })}</label>
              <input className={inputCls} type="number" min={0} value={selM.kva} onChange={(e) => patchM(selM.uid, { kva: Math.max(0, Number(e.target.value) || 0) })} />
              <label className={label}>{L({ en: "Remark", th: "หมายเหตุ" })}</label>
              <input className={inputCls} value={selM.note ?? ""} onChange={(e) => patchM(selM.uid, { note: e.target.value.slice(0, 80) })} placeholder={L({ en: "e.g. 2 power supply (50+50)", th: "เช่น 2 power supply (50+50)" })} />
              <p className="mt-2 text-[10.5px] text-white/40">{L({ en: "Zone", th: "สังกัดโซน" })}: <span className="text-white/70">{zoneOf(selM, layout.zones)?.name ?? L({ en: "none — drop inside a zone", th: "ยังไม่อยู่ในโซน" })}</span></p>
              <button onClick={() => { setLayout((l) => ({ ...l, machines: l.machines.filter((m) => m.uid !== selM.uid) })); setSel(null); }} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-400/10 py-2 text-[12px] text-rose-300 transition hover:bg-rose-400/20"><Trash2 size={13} /> {L({ en: "Remove machine", th: "ลบเครื่องนี้" })}</button>
            </>
          ) : selZ ? (
            <>
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-white"><SquareDashed size={12} /> {L({ en: "Line / Area zone", th: "โซนไลน์ / พื้นที่" })}</p>
              <label className={label}>{L({ en: "Zone name", th: "ชื่อโซน" })}</label>
              <input className={inputCls} value={selZ.name} onChange={(e) => patchZ(selZ.uid, { name: e.target.value.slice(0, 30) })} />
              <label className={label}>{L({ en: "Color", th: "สี" })}</label>
              <div className="mt-1 flex gap-1.5">
                {ZONE_COLORS.map((c) => (
                  <button key={c} onClick={() => patchZ(selZ.uid, { color: c })} aria-label={c} className={cn("h-6 w-6 rounded-md border-2", selZ.color === c ? "border-white" : "border-transparent")} style={{ background: c }} />
                ))}
              </div>
              <p className="mt-2 text-[10.5px] text-white/40">{layout.machines.filter((m) => zoneOf(m, layout.zones)?.uid === selZ.uid).length} {L({ en: "machines inside", th: "เครื่องในโซนนี้" })}</p>
              <button onClick={() => { setLayout((l) => ({ ...l, zones: l.zones.filter((z) => z.uid !== selZ.uid) })); setSel(null); }} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-400/10 py-2 text-[12px] text-rose-300 transition hover:bg-rose-400/20"><Trash2 size={13} /> {L({ en: "Remove zone (machines stay)", th: "ลบโซน (เครื่องไม่หาย)" })}</button>
            </>
          ) : (
            <div className="pt-6 text-center text-[11.5px] leading-relaxed text-white/40">
              <p>{L({ en: "Select a machine or zone to edit its details", th: "คลิกเครื่องหรือโซนเพื่อแก้รายละเอียด" })}</p>
              <p className="mt-3 text-[10.5px]">{layout.machines.length} {L({ en: "machines", th: "เครื่อง" })} · {layout.zones.length} {L({ en: "zones", th: "โซน" })}</p>
            </div>
          )}
        </aside>
      </div>
    </div>,
    document.body,
  );
}
