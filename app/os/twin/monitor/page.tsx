"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings2, RefreshCw, CircleDot, AlertTriangle, Check } from "lucide-react";
import { DigitalTwin } from "@/components/twin/DigitalTwin";
import { monitorModel, lineStats, MONITOR_CARDS, DEFAULT_CARDS } from "@/lib/line-monitor";
import { loadLayout, toAssets, toBuildings, poleOf } from "@/lib/twin-builder";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/* Shop-floor Line Monitor — a TV opens a fixed URL like
 *   /os/twin/monitor?zone=<name>&cards=prod,oee,kw&cycle=15
 * and gets that Line's numbers only, big enough to read from the floor.
 * Card selection is kept in the URL so the TV bookmark carries it. */

function MonitorInner() {
  const { locale } = useI18n();
  const th = locale === "th";
  const router = useRouter();
  const params = useSearchParams();

  const [model, setModel] = useState<ReturnType<typeof monitorModel> | null>(null);
  useEffect(() => { setModel(monitorModel()); }, []);

  // clock — display only, not part of the data sim
  const [now, setNow] = useState("");
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString(th ? "th-TH" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [th]);

  const zones = model?.zones ?? [];
  const zoneParam = params.get("zone") ?? "";
  const zoneIdx = Math.max(0, zones.findIndex((z) => z.id === zoneParam || z.name.toLowerCase() === zoneParam.toLowerCase()));
  const zone = zones[zoneIdx] ?? null;

  // auto-cycle across zones for the central overview TV
  const cycle = Number(params.get("cycle") || 0);
  useEffect(() => {
    if (!cycle || zones.length < 2) return;
    const iv = setInterval(() => {
      const next = zones[(zoneIdx + 1) % zones.length];
      router.replace(`/os/twin/monitor?zone=${encodeURIComponent(next.name)}&cards=${params.get("cards") ?? ""}&cycle=${cycle}`);
    }, Math.max(5, cycle) * 1000);
    return () => clearInterval(iv);
  }, [cycle, zoneIdx, zones, router, params]);

  const cards = useMemo(() => {
    const q = params.get("cards");
    if (!q) return DEFAULT_CARDS;
    const ids = q.split(",").map((s) => s.trim()).filter(Boolean);
    return ids.length ? ids : DEFAULT_CARDS;
  }, [params]);
  const [picker, setPicker] = useState(false);
  const setCards = (ids: string[]) => {
    router.replace(`/os/twin/monitor?zone=${encodeURIComponent(zone?.name ?? "")}&cards=${ids.join(",")}${cycle ? `&cycle=${cycle}` : ""}`);
  };

  const stats = useMemo(() => (model && zone ? lineStats(zone.id, zone.name, model.assets) : null), [model, zone]);
  const zoneAssets = useMemo(() => (model && zone ? model.assets.filter((a) => a.buildingId === zone.id) : []), [model, zone]);
  // 3D scoped to this line only — reuse the twin with a filtered override
  const twinOverride = useMemo(() => {
    if (!model || !zone) return null;
    const layout = loadLayout();
    if (model.custom && layout) {
      return { assets: toAssets(layout).filter((a) => a.buildingId === zone.id), buildings: toBuildings(layout).filter((b) => b.id === zone.id), pole: poleOf(layout) };
    }
    return null; // mock plant: show the full scene
  }, [model, zone]);

  if (!model || !zone || !stats) {
    return <main className="grid min-h-screen place-items-center bg-ink-950 text-white/40">…</main>;
  }

  const show = (id: string) => cards.includes(id);
  const attainTone = stats.attain >= 95 ? "#34d399" : stats.attain >= 85 ? "#f59e0b" : "#f43f5e";

  const Tile = ({ label, value, unit, accent, sub }: { label: string; value: string; unit?: string; accent: string; sub?: string }) => (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
      <p className="text-[13px] font-medium uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-2 tabular text-5xl font-bold leading-none" style={{ color: accent }}>
        {value}
        {unit ? <span className="ml-2 text-xl font-normal text-white/40">{unit}</span> : null}
      </p>
      {sub ? <p className="mt-2 text-[13px] text-white/50">{sub}</p> : null}
    </div>
  );

  return (
    <main className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-ink-950 p-5">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 pb-4">
        <Link href="/os/twin" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white/50 transition hover:text-white"><ArrowLeft size={16} /></Link>
        <span className="h-3 w-3 rounded-full" style={{ background: zone.color }} />
        <h1 className="text-2xl font-bold text-white">{zone.name}</h1>
        <span className="rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/55">{stats.count} {th ? "เครื่อง" : "machines"}</span>
        {/* zone switcher */}
        <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
          {zones.map((z) => (
            <Link key={z.id} href={`/os/twin/monitor?zone=${encodeURIComponent(z.name)}&cards=${cards.join(",")}${cycle ? `&cycle=${cycle}` : ""}`}
              className={cn("rounded-md px-2.5 py-1 text-xs transition", z.id === zone.id ? "bg-white/10 text-white" : "text-white/50 hover:text-white")}>{z.name}</Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {cycle ? <span className="flex items-center gap-1.5 text-[11px] text-white/45"><RefreshCw size={12} className="animate-spin [animation-duration:4s]" /> {th ? `วนทุก ${cycle} วิ` : `cycles ${cycle}s`}</span> : null}
          <span className="tabular text-2xl font-semibold text-white/80">{now}</span>
          <button onClick={() => setPicker((v) => !v)} aria-label={th ? "เลือกการ์ด" : "Choose cards"} className={cn("grid h-9 w-9 place-items-center rounded-lg border transition", picker ? "border-brand-400/50 bg-brand-400/10 text-brand-300" : "border-white/10 text-white/50 hover:text-white")}><Settings2 size={16} /></button>
        </div>
      </div>

      {/* card picker */}
      {picker ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
          <span className="text-[12px] text-white/50">{th ? "แสดงบนจอนี้:" : "Show on this display:"}</span>
          {MONITOR_CARDS.map((c) => {
            const on = cards.includes(c.id);
            return (
              <button key={c.id} onClick={() => setCards(on ? cards.filter((x) => x !== c.id) : [...cards, c.id])}
                className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition", on ? "border-brand-400/50 bg-brand-400/[0.1] text-brand-100" : "border-white/12 bg-white/[0.02] text-white/50 hover:text-white")}>
                {on ? <Check size={12} /> : null}{th ? c.th : c.en}
              </button>
            );
          })}
          <span className="ml-auto text-[10.5px] text-white/35">{th ? "ตัวเลือกฝังใน URL — จอ TV บุ๊กมาร์กแล้วได้แบบนี้ตลอด" : "Choices live in the URL — bookmark it on the TV"}</span>
        </div>
      ) : null}

      {/* body */}
      <div className="flex min-h-0 flex-1 gap-4">
        {show("twin3d") ? (
          <div className="min-w-0 flex-1">
            <DigitalTwin
              height="h-full"
              showInspector={false}
              hideAssetList
              floatInfo
              assetsOverride={twinOverride?.assets}
              buildingsOverride={twinOverride?.buildings}
              poleOverride={twinOverride?.pole}
            />
          </div>
        ) : null}

        <div className={cn("grid content-start gap-3 overflow-y-auto", show("twin3d") ? "w-[400px] shrink-0 grid-cols-1" : "flex-1 grid-cols-2 xl:grid-cols-3")}>
          {show("prod") && stats.prodCount ? (
            <Tile label={th ? "ยอดผลิต · วันนี้" : "Output · today"} value={stats.actualToday.toLocaleString()} unit={`/ ${stats.planToday.toLocaleString()} pcs`} accent={attainTone} sub={`${stats.attain}% ${th ? "ของแผน" : "of plan"}`} />
          ) : null}
          {show("oee") && stats.prodCount ? (
            <Tile label="OEE" value={`${stats.avgOee}`} unit="%" accent="#818cf8" sub={th ? `เฉลี่ย ${stats.prodCount} เครื่องผลิต` : `avg of ${stats.prodCount} machines`} />
          ) : null}
          {show("kw") ? (
            <Tile label={th ? "กำลังไฟ · ขณะนี้" : "Electric load · now"} value={stats.kwNow.toLocaleString()} unit="kW" accent="#22d3ee" sub={`${stats.kwhToday.toLocaleString()} kWh ${th ? "วันนี้" : "today"}`} />
          ) : null}
          {show("cost") ? (
            <Tile label={th ? "ค่าไฟ · วันนี้" : "Energy cost · today"} value={`฿${stats.costToday.toLocaleString()}`} accent="#f59e0b" sub={th ? "อัตรา 4.2 ฿/kWh" : "at 4.2 ฿/kWh"} />
          ) : null}
          {show("co2") ? (
            <Tile label={th ? "คาร์บอน · วันนี้" : "Carbon · today"} value={stats.co2Today.toLocaleString()} unit="kgCO₂e" accent="#34d399" sub={th ? "จากไฟฟ้าที่ใช้" : "from electricity"} />
          ) : null}
          {show("machines") ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <p className="text-[13px] font-medium uppercase tracking-wider text-white/45">{th ? "สถานะเครื่องจักร" : "Machine status"}</p>
              <p className="mt-2 flex items-center gap-2 text-[15px] text-white/80">
                <CircleDot size={14} className="text-emerald-400" /> {zoneAssets.filter((a) => a.status === "healthy").length} {th ? "ปกติ" : "healthy"}
                {stats.issues.length ? <span className="flex items-center gap-1.5 text-amber-300"><AlertTriangle size={14} /> {stats.issues.length} {th ? "ต้องจับตา" : "watch"}</span> : null}
              </p>
              <ul className="mt-3 space-y-2">
                {(stats.issues.length ? stats.issues : null)?.map((i) => (
                  <li key={i.name} className="flex items-center justify-between rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-[13px]">
                    <span className="font-mono font-semibold text-white/85">{i.name}</span>
                    <span className="text-amber-200/80">{i.note}</span>
                  </li>
                )) ?? <li className="text-[13px] text-white/40">{th ? "ทุกเครื่องปกติ" : "All machines healthy"}</li>}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export default function LineMonitorPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-ink-950 text-white/40">…</main>}>
      <MonitorInner />
    </Suspense>
  );
}
