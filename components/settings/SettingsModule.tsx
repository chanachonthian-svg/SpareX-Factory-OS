"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Shield, ShieldOff, Search, Factory, Zap, RotateCcw, Coins, Sparkles, Bell,
  Users, ShieldCheck, Mail, MessageSquare, Smartphone, MonitorSmartphone, Check, Clock,
  Building2, Upload, Trash2, FileText, Cable, ExternalLink, CircleDot, Send, Loader2,
} from "lucide-react";
import { assets, STATUS_COLOR, STATUS_LABEL, type Asset } from "@/lib/factory";
import { loadLayout, toAssets } from "@/lib/twin-builder";
import { notifyAutonomyChanged, useAiAutoSummary } from "@/lib/autonomy";
import { publicAsset } from "@/lib/paths";
import { tariff } from "@/lib/energy";
import { useBrand, setBrand } from "@/lib/brand";
import { useI18n } from "@/lib/i18n";
import { useTr } from "@/lib/autotranslate";
import { cn } from "@/lib/utils";

/* --------------------------------------------------------------- primitives */

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onClick} className={cn("relative h-5 w-9 shrink-0 rounded-full transition", on ? "bg-emerald-500/80" : "bg-white/15")}>
      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", on ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}

function NumField({ label, value, onChange, prefix, suffix, step = 1 }: { label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string; step?: number }) {
  return (
    <label className="block">
      <span className="text-[11px] text-white/45">{label}</span>
      <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 focus-within:border-brand-400/40">
        {prefix ? <span className="text-white/40">{prefix}</span> : null}
        <input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full bg-transparent text-sm tabular text-white/90 focus:outline-none" />
        {suffix ? <span className="shrink-0 text-xs text-white/40">{suffix}</span> : null}
      </div>
    </label>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] text-white/45">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 text-sm text-white/90 placeholder:text-white/30 focus:border-brand-400/40 focus:outline-none" />
    </label>
  );
}

function Card({ title, subtitle, icon: Icon, children, extra }: { title: string; subtitle?: string; icon: any; children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="panel p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-brand-300"><Icon size={15} /></span>
        <div className="min-w-0">
          <h3 className="font-semibold">{title}</h3>
          {subtitle ? <p className="text-xs text-white/45">{subtitle}</p> : null}
        </div>
        {extra ? <div className="ml-auto">{extra}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** small "saves to localStorage" hook */
function usePersist<T>(key: string, init: T): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [v, setV] = useState<T>(init);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const s = localStorage.getItem(key); if (s) setV({ ...init, ...JSON.parse(s) }); } catch {}
    setReady(true);
  }, []); // eslint-disable-line
  useEffect(() => { if (ready) try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [v, ready]); // eslint-disable-line
  return [v, setV, ready];
}

/* --------------------------------------- 0 · data source (SpareX Connect) */
/* FactoryOS does not configure devices — SpareX Connect owns protocols and raw
 * data. This tab shows the link's health and maps each Connect device onto a
 * FactoryOS machine; unmapped machines run on kVA-based simulation instead. */

const DMKEY = "factoryos:device-map";

const CONNECT_DEVICES = [
  { id: "MTR-001", label: "Power meter · Incomer MDB", proto: "Modbus TCP", ok: true },
  { id: "MTR-002", label: "Power meter · Welding feeder", proto: "Modbus TCP", ok: true },
  { id: "MTR-003", label: "Power meter · Press feeder", proto: "Modbus TCP", ok: true },
  { id: "MTR-004", label: "Power meter · Facility feeder", proto: "Modbus TCP", ok: true },
  { id: "PLC-A", label: "PLC · Line A (Siemens S7-1200)", proto: "OPC-UA", ok: true },
  { id: "PLC-B", label: "PLC · Line B (Mitsubishi FX5U)", proto: "SLMP", ok: true },
  { id: "VIB-001", label: "Vibration sensor · CNC spindle", proto: "MQTT", ok: true },
  { id: "VIB-002", label: "Vibration sensor · press crown", proto: "MQTT", ok: false },
  { id: "TMP-001", label: "Temp probe · furnace zone", proto: "MQTT", ok: true },
  { id: "AIR-001", label: "Flow meter · compressed air", proto: "Modbus RTU", ok: true },
];

function ConnectSection() {
  const { locale } = useI18n();
  const L = (o: { en: string; th: string }) => (locale === "th" ? o.th : o.en);
  const [map, setMap] = usePersist<Record<string, string>>(DMKEY, {});
  const [machines, setMachines] = useState<{ id: string; name: string; type: string }[]>([]);
  useEffect(() => {
    const l = loadLayout();
    const list = l?.active && l.machines.length ? toAssets(l) : assets;
    setMachines(list.map((a) => ({ id: a.id, name: a.name, type: a.type })));
  }, []);

  const okDevices = CONNECT_DEVICES.filter((d) => d.ok).length;
  const mapped = machines.filter((m) => map[m.id]).length;
  const deviceUse = new Map<string, number>();
  Object.values(map).forEach((d) => deviceUse.set(d, (deviceUse.get(d) ?? 0) + 1));

  return (
    <div className="space-y-4">
      {/* link health */}
      <Card
        title={L({ en: "SpareX Connect link", th: "การเชื่อมต่อ SpareX Connect" })}
        subtitle={L({ en: "Is real plant data flowing in", th: "ข้อมูลจริงจากโรงงานไหลเข้าอยู่มั้ย" })}
        icon={Cable}
        extra={
          <a href="https://sparexth.com/connect" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-brand-400/30 bg-brand-400/[0.08] px-3 py-1.5 text-xs font-medium text-brand-200 transition hover:bg-brand-400/[0.15]">
            {L({ en: "Manage devices in Connect", th: "จัดการอุปกรณ์ใน Connect" })} <ExternalLink size={12} />
          </a>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: L({ en: "Status", th: "สถานะ" }), value: L({ en: "Online", th: "ออนไลน์" }), tone: "#34d399", dot: true },
            { label: L({ en: "Last data in", th: "ข้อมูลล่าสุดเข้า" }), value: L({ en: "moments ago", th: "เมื่อครู่" }), tone: "#e2e8f0" },
            { label: L({ en: "Devices reporting", th: "อุปกรณ์ส่งปกติ" }), value: `${okDevices}/${CONNECT_DEVICES.length}`, tone: okDevices === CONNECT_DEVICES.length ? "#34d399" : "#f59e0b" },
            { label: L({ en: "Machines on real data", th: "เครื่องที่ใช้ข้อมูลจริง" }), value: `${mapped}/${machines.length}`, tone: mapped ? "#22d3ee" : "#8b93a7" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
              <p className="text-[11px] uppercase tracking-wider text-white/45">{s.label}</p>
              <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold tabular" style={{ color: s.tone }}>
                {s.dot ? <CircleDot size={13} className="animate-pulse" /> : null}{s.value}
              </p>
            </div>
          ))}
        </div>
        {CONNECT_DEVICES.some((d) => !d.ok) ? (
          <p className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-[12px] text-amber-200">
            ⚠ {CONNECT_DEVICES.filter((d) => !d.ok).map((d) => d.id).join(", ")} {L({ en: "lost signal — check in SpareX Connect", th: "สัญญาณหาย — ไปตรวจใน SpareX Connect" })}
          </p>
        ) : null}
      </Card>

      {/* device ↔ machine mapping */}
      <Card
        title={L({ en: "Device ↔ machine mapping", th: "จับคู่อุปกรณ์ ↔ เครื่องจักร" })}
        subtitle={L({ en: "Which meter feeds which machine's numbers", th: "มิเตอร์ตัวไหนป้อนตัวเลขให้เครื่องไหน" })}
        icon={Factory}
      >
        <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
          {machines.map((m) => {
            const dev = map[m.id];
            const devObj = CONNECT_DEVICES.find((d) => d.id === dev);
            return (
              <div key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                <div className="min-w-[150px] flex-1">
                  <p className="text-[13px] font-medium text-white/85">{m.name}</p>
                  <p className="text-[10.5px] text-white/40">{m.type}</p>
                </div>
                <select
                  value={dev ?? ""}
                  onChange={(e) => setMap((p) => { const n = { ...p }; if (e.target.value) n[m.id] = e.target.value; else delete n[m.id]; return n; })}
                  className="w-[240px] max-w-full rounded-lg border border-white/12 bg-ink-900 px-2 py-1.5 text-[12px] text-white/85 focus:border-brand-400/50 focus:outline-none"
                >
                  <option value="">{L({ en: "— simulated from kVA —", th: "— จำลองจาก kVA —" })}</option>
                  {CONNECT_DEVICES.map((d) => (
                    <option key={d.id} value={d.id}>{d.id} · {d.label} ({d.proto})</option>
                  ))}
                </select>
                {dev ? (
                  <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium", devObj?.ok ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-rose-400/30 bg-rose-400/10 text-rose-300")}>
                    {devObj?.ok ? L({ en: "real data", th: "ข้อมูลจริง" }) : L({ en: "no signal", th: "สัญญาณหาย" })}
                    {(deviceUse.get(dev) ?? 0) > 1 ? ` · ${L({ en: "shared", th: "ใช้ร่วม" })}` : ""}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-white/45">{L({ en: "simulated", th: "จำลอง" })}</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-white/40">
          {L({
            en: "Machines without a device run on kVA-based simulation. One feeder meter may be shared by a whole zone.",
            th: "เครื่องที่ยังไม่จับคู่จะใช้ค่าจำลองจาก kVA ไปก่อน · มิเตอร์ feeder หนึ่งตัวใช้ร่วมทั้งโซนได้",
          })}
        </p>
      </Card>
    </div>
  );
}

/* ------------------------------------------------- 1 · machine criticality */

const CKEY = "factoryos:criticality";
const defaultCritical = (a: Asset) => a.category === "production";

function CriticalitySection() {
  const tr = useTr();
  const [crit, setCrit] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    let saved: Record<string, boolean> = {};
    try { const s = localStorage.getItem(CKEY); if (s) saved = JSON.parse(s); } catch {}
    const merged: Record<string, boolean> = {};
    assets.forEach((a) => { merged[a.id] = saved[a.id] ?? defaultCritical(a); });
    setCrit(merged); setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(CKEY, JSON.stringify(crit)); } catch {} }, [crit, ready]);

  const set = (id: string, v: boolean) => setCrit((p) => ({ ...p, [id]: v }));
  const criticalCount = assets.filter((a) => crit[a.id]).length;
  const nonCount = assets.length - criticalCount;
  const filtered = assets.filter((a) => `${a.name} ${a.type} ${a.line} ${a.id}`.toLowerCase().includes(q.trim().toLowerCase()));
  const resetDefaults = () => setCrit(Object.fromEntries(assets.map((a) => [a.id, defaultCritical(a)])));
  const allProdCritical = () => setCrit((p) => { const n = { ...p }; assets.forEach((a) => { if (a.category === "production") n[a.id] = true; }); return n; });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-5">
          <p className="text-[11px] uppercase tracking-wider text-white/45">{tr("Critical machines")}</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-semibold tabular text-rose-300"><Shield size={22} /> {criticalCount}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/45">{tr("Protected — AI never auto-sheds or standbys this machine")}</p>
        </div>
        <div className="panel p-5">
          <p className="text-[11px] uppercase tracking-wider text-white/45">{tr("Non-Critical machines")}</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-semibold tabular text-emerald-300"><ShieldOff size={22} /> {nonCount}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/45">{tr("Auto-manageable — AI may shed or standby this machine")}</p>
        </div>
        <div className="panel flex flex-col justify-center gap-2 p-5">
          <button onClick={allProdCritical} className="btn justify-center border border-white/12 bg-white/5 py-2 text-xs text-white/80 hover:bg-white/10"><Factory size={13} /> {tr("Set all production as Critical")}</button>
          <button onClick={resetDefaults} className="btn justify-center border border-white/12 bg-white/5 py-2 text-xs text-white/60 hover:bg-white/10"><RotateCcw size={13} /> {tr("Reset defaults")}</button>
        </div>
      </div>

      <div className="panel overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 p-5">
          <Shield size={18} className="text-slate-300" />
          <div className="min-w-0">
            <h3 className="font-semibold">{tr("Machine Criticality")}</h3>
            <p className="mt-0.5 text-xs text-white/45">{tr("Classify machines · Critical are protected from AI auto-management")}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
            <Search size={14} className="shrink-0 text-white/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Search machines…")} className="w-40 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
                <th className="px-5 py-3 font-medium">{tr("Machine name")}</th>
                <th className="px-3 py-3 font-medium">{tr("Asset ID")}</th>
                <th className="px-3 py-3 font-medium">{tr("Machine category")}</th>
                <th className="px-3 py-3 font-medium">{tr("Health status")}</th>
                <th className="px-5 py-3 text-right font-medium">{tr("Criticality")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const isCrit = !!crit[a.id];
                return (
                  <tr key={a.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <p className="flex items-center gap-1.5 font-medium text-white/90">
                        {isCrit ? <Shield size={13} className="shrink-0 text-rose-300" /> : <ShieldOff size={13} className="shrink-0 text-white/30" />}
                        {a.name}
                      </p>
                      <p className="text-xs text-white/40">{a.type} · {a.line}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-block rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[11px] tabular tracking-wide text-white/65">{a.id.toUpperCase()}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-white/60">{a.category === "production" ? <Factory size={12} /> : <Zap size={12} />} {a.category === "production" ? "Production" : "Facility"}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: STATUS_COLOR[a.status] }}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[a.status] }} /> {STATUS_LABEL[a.status]}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
                          <button onClick={() => set(a.id, true)} className={cn("whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition", isCrit ? "bg-rose-500/15 text-rose-300" : "text-white/45 hover:text-white/70")}>Critical</button>
                          <button onClick={() => set(a.id, false)} className={cn("whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition", !isCrit ? "bg-emerald-500/15 text-emerald-300" : "text-white/45 hover:text-white/70")}>Non-Critical</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 border-t border-white/10 bg-white/[0.02] p-4 text-xs text-white/50">
          <Shield size={14} className="shrink-0 text-brand-300" /> {tr("This classification feeds the AI Optimization guardrails.")}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- 2 · tariff & billing */

function TariffSection() {
  const tr = useTr();
  const [saved, setSaved] = useState(false);
  const [t, setT] = usePersist("factoryos:tariff", {
    provider: "MEA", tou: true,
    onPeak: tariff.onPeakRate, offPeak: tariff.offPeakRate,
    onPeakFrom: "09:00", onPeakTo: "22:00",
    contract: tariff.contractDemand, demandCharge: tariff.demandCharge,
    pfThreshold: 0.85, pfRate: 56.07, billDay: 24,
  });
  const upd = (patch: Partial<typeof t>) => { setT((p) => ({ ...p, ...patch })); setSaved(false); };

  return (
    <div className="space-y-6">
      <Card icon={Coins} title={tr("Electricity Tariff")} subtitle={tr("These rates power Peak & Cost and the Tariff Optimizer.")}
        extra={<button onClick={() => setSaved(true)} className={cn("btn px-3.5 py-2 text-xs", saved ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "btn-glow")}>{saved ? <><Check size={13} /> {tr("Saved")}</> : tr("Save changes")}</button>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="text-[11px] text-white/45">{tr("Utility provider")}</span>
            <select value={t.provider} onChange={(e) => upd({ provider: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 text-sm text-white/90 focus:outline-none">
              <option className="bg-ink-900">MEA</option><option className="bg-ink-900">PEA</option><option className="bg-ink-900">EGAT (direct)</option>
            </select>
          </label>
          <div>
            <span className="text-[11px] text-white/45">{tr("Tariff type")}</span>
            <div className="mt-1 flex gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
              {[[true, "TOU"], [false, tr("Normal")]].map(([v, lab]) => (
                <button key={String(v)} onClick={() => upd({ tou: v as boolean })} className={cn("flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition", t.tou === v ? "bg-brand-400/15 text-brand-200" : "text-white/50")}>{lab as string}</button>
              ))}
            </div>
          </div>
          <NumField label={tr("Billing cycle day")} value={t.billDay} onChange={(v) => upd({ billDay: v })} suffix={tr("of month")} />
          <NumField label={tr("On-peak rate")} value={t.onPeak} onChange={(v) => upd({ onPeak: v })} prefix="฿" suffix="/kWh" step={0.0001} />
          <NumField label={tr("Off-peak rate")} value={t.offPeak} onChange={(v) => upd({ offPeak: v })} prefix="฿" suffix="/kWh" step={0.0001} />
          <div>
            <span className="text-[11px] text-white/45">{tr("On-peak window")}</span>
            <div className="mt-1 flex items-center gap-2">
              <input value={t.onPeakFrom} onChange={(e) => upd({ onPeakFrom: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 text-center text-sm tabular text-white/90 focus:outline-none" />
              <span className="text-white/30">–</span>
              <input value={t.onPeakTo} onChange={(e) => upd({ onPeakTo: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 text-center text-sm tabular text-white/90 focus:outline-none" />
            </div>
          </div>
          <NumField label={tr("Demand contract")} value={t.contract} onChange={(v) => upd({ contract: v })} suffix="kW" step={50} />
          <NumField label={tr("Demand charge")} value={t.demandCharge} onChange={(v) => upd({ demandCharge: v })} prefix="฿" suffix="/kW" step={0.01} />
          <NumField label={tr("PF penalty below")} value={t.pfThreshold} onChange={(v) => upd({ pfThreshold: v })} step={0.01} />
        </div>
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-brand-400/20 bg-brand-400/[0.05] p-3 text-xs text-white/60">
          <Coins size={14} className="shrink-0 text-brand-300" /> {tr("Changing these updates every saving, payback and bill figure across the app.")}
        </p>
      </Card>
    </div>
  );
}

/* --------------------------------------------------- 3 · AI & automation */

const AUTONOMY = [
  { l: "Advisory", d: "AI only recommends — you run every action." },
  { l: "Approve each", d: "AI runs actions after your one-tap approval." },
  { l: "Full-auto", d: "AI runs guardrailed actions automatically — you're notified." },
];

function AutomationSection() {
  const tr = useTr();
  const { locale } = useI18n();
  const L = (o: { en: string; th: string }) => (locale === "th" ? o.th : o.en);
  const [s, setS] = usePersist("factoryos:automation", {
    autonomy: 1, protectCritical: true, logReversible: true,
    tempBand: 1, pfMin: 0.95, pfMax: 0.99, idleMin: 15, peakTarget: 2900, offPeak: "22:00–09:00",
  });
  const upd = (patch: Partial<typeof s>) => setS((p) => ({ ...p, ...patch }));
  const aiAuto = useAiAutoSummary();
  // themed confirm modal — the native window.confirm breaks the dark theme
  const [confirmReq, setConfirmReq] = useState<{ title: string; msg: string; yes: string; apply: () => void } | null>(null);

  const applyLevel = (i: number) => {
    upd({ autonomy: i });
    // the usePersist effect writes after render — write the level now so every
    // AI Auto toggle across the app reacts in this same tick
    try {
      const cur = JSON.parse(localStorage.getItem("factoryos:automation") || "{}");
      localStorage.setItem("factoryos:automation", JSON.stringify({ ...cur, autonomy: i }));
    } catch { /* ignore */ }
    notifyAutonomyChanged();
  };

  const setLevel = (i: number) => {
    if (i === s.autonomy) return;
    if (i === 2) {
      setConfirmReq({
        title: L({ en: "Enable Full-auto?", th: "เปิดโหมด Full-auto?" }),
        msg: L({
          en: "The AI will run guardrailed actions on its own and notify you afterwards. Every action is logged and reversible.",
          th: "AI จะลงมือเองภายใต้ Guardrails ทั้งหมด แล้วแจ้งให้ทราบ — ทุกการกระทำถูกบันทึกและย้อนกลับได้",
        }),
        yes: L({ en: "Enable Full-auto", th: "เปิดใช้ Full-auto" }),
        apply: () => applyLevel(2),
      });
      return;
    }
    if (i === 0 && aiAuto.count > 0) {
      setConfirmReq({
        title: L({ en: "Switch to Advisory?", th: "ลดเป็นโหมด Advisory?" }),
        msg: L({
          en: `${aiAuto.count} AI Auto assignments will be paused — they resume automatically when you raise the level again.`,
          th: `AI Auto ที่เปิดอยู่ ${aiAuto.count} เรื่องจะถูกพักไว้ — และกลับมาทำงานเองเมื่อปรับระดับขึ้นอีกครั้ง`,
        }),
        yes: L({ en: "Switch to Advisory", th: "ลดเป็น Advisory" }),
        apply: () => applyLevel(0),
      });
      return;
    }
    applyLevel(i);
  };

  return (
    <div className="space-y-6">
      <Card icon={Sparkles} title={tr("Autonomy Level")} subtitle={tr("How much the AI is allowed to do on its own — applies to all managers.")}>
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
          {AUTONOMY.map((lv, i) => (
            <button key={lv.l} onClick={() => setLevel(i)} className={cn("flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition", s.autonomy === i ? "bg-brand-400/15 text-brand-200" : "text-white/50 hover:text-white/80")}>{tr(lv.l)}</button>
          ))}
        </div>
        <p className="mt-3 text-sm text-white/60">{tr(AUTONOMY[s.autonomy].d)}</p>
        {/* what the AI is actually assigned right now — the toggles across modules */}
        {s.autonomy === 0 && aiAuto.count > 0 ? (
          <p className="mt-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-[12px] text-amber-200">
            {L({ en: `${aiAuto.count} AI Auto assignments are paused (Advisory mode) — they resume when you raise the level.`, th: `AI Auto ${aiAuto.count} เรื่องถูกพักไว้ (โหมด Advisory) — จะกลับมาทำงานเมื่อปรับระดับขึ้น` })}
          </p>
        ) : aiAuto.count > 0 ? (
          <p className="mt-2 text-[12px] text-white/50">
            🤖 {L({ en: `AI is currently assigned ${aiAuto.count} measures across ${aiAuto.modules.length} modules`, th: `ตอนนี้ AI ดูแลอยู่ ${aiAuto.count} เรื่องใน ${aiAuto.modules.length} โมดูล` })} <span className="text-white/35">({aiAuto.modules.join(" · ")})</span>
          </p>
        ) : null}
      </Card>

      {confirmReq ? createPortal(
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-5 backdrop-blur-sm" onClick={() => setConfirmReq(null)}>
          <div className="w-full max-w-[400px] rounded-2xl border border-white/12 bg-ink-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-brand-400/30 bg-brand-400/10 text-brand-300"><Sparkles size={18} /></span>
            <h3 className="mt-3.5 text-[16px] font-bold text-white">{confirmReq.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">{confirmReq.msg}</p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => { confirmReq.apply(); setConfirmReq(null); }}
                className="btn-glow flex-1 justify-center py-2.5 text-[13.5px]"
              >{confirmReq.yes}</button>
              <button
                onClick={() => setConfirmReq(null)}
                className="rounded-xl border border-white/15 px-5 py-2.5 text-[13.5px] text-white/65 transition hover:bg-white/5 hover:text-white"
              >{L({ en: "Cancel", th: "ยกเลิก" })}</button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      <Card icon={ShieldCheck} title={tr("Guardrails")} subtitle={tr("Always on · hard limits the AI can never cross")}>
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <ShieldCheck size={16} className="shrink-0 text-emerald-300" />
            <span className="flex-1 text-sm text-white/75">{tr("Never shed machines marked Critical")}</span>
            <Toggle on={s.protectCritical} onClick={() => upd({ protectCritical: !s.protectCritical })} />
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <ShieldCheck size={16} className="shrink-0 text-emerald-300" />
            <span className="flex-1 text-sm text-white/75">{tr("Hold process temperature within")}</span>
            <div className="flex items-center gap-1 text-sm"><span className="text-white/40">±</span><input type="number" step={0.5} value={s.tempBand} onChange={(e) => upd({ tempBand: Number(e.target.value) })} className="w-14 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-center tabular text-white/90 focus:outline-none" /><span className="text-white/50">°C</span></div>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <ShieldCheck size={16} className="shrink-0 text-emerald-300" />
            <span className="flex-1 text-sm text-white/75">{tr("Keep power factor between")}</span>
            <div className="flex items-center gap-1 text-sm"><input type="number" step={0.01} value={s.pfMin} onChange={(e) => upd({ pfMin: Number(e.target.value) })} className="w-14 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-center tabular text-white/90 focus:outline-none" /><span className="text-white/30">–</span><input type="number" step={0.01} value={s.pfMax} onChange={(e) => upd({ pfMax: Number(e.target.value) })} className="w-14 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-center tabular text-white/90 focus:outline-none" /></div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <ShieldCheck size={16} className="shrink-0 text-emerald-300" />
            <span className="flex-1 text-sm text-white/75">{tr("Every action is logged & reversible")}</span>
            <Toggle on={s.logReversible} onClick={() => upd({ logReversible: !s.logReversible })} />
          </div>
        </div>
      </Card>

      <Card icon={Zap} title={tr("Manager Defaults")} subtitle={tr("Starting values for the Peak, Idle and Load-shift managers.")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumField label={tr("Idle threshold")} value={s.idleMin} onChange={(v) => upd({ idleMin: v })} suffix={tr("min")} />
          <NumField label={tr("Peak demand target")} value={s.peakTarget} onChange={(v) => upd({ peakTarget: v })} suffix="kW" step={50} />
          <TextField label={tr("Off-peak window")} value={s.offPeak} onChange={(v) => upd({ offPeak: v })} />
        </div>
      </Card>
    </div>
  );
}

/* --------------------------------------------------------- 4 · notifications */

function NotificationsSection() {
  const tr = useTr();
  const { locale } = useI18n();
  const L = (o: { en: string; th: string }) => (locale === "th" ? o.th : o.en);
  const [s, setS] = usePersist("factoryos:notify", {
    email: true, emailAddr: "ops@factory.co.th", line: true, lineId: "@sparex-plant",
    push: true,
    peak: true, peakPct: 90, pq: true, anomaly: true, failure: true,
    quiet: false, quietFrom: "22:00", quietTo: "06:00",
    esc: true, escMin: 15, escFirst: "Somchai P. (Engineer)", escTo: "Chanachon T. (Admin)",
  });
  const upd = (patch: Partial<typeof s>) => setS((p) => ({ ...p, ...patch }));

  // send a real test through the configured channels (email works now; LINE
  // once the server has a channel token) so the customer can verify their setup
  const [testing, setTesting] = useState(false);
  const [testRes, setTestRes] = useState<{ email: string; line: string } | null>(null);
  const chLabel = (r: string) => {
    const map: Record<string, { en: string; th: string; tone: string }> = {
      sent: { en: "sent ✓", th: "ส่งแล้ว ✓", tone: "#34d399" },
      failed: { en: "failed", th: "ส่งไม่สำเร็จ", tone: "#f43f5e" },
      not_configured: { en: "not set up on server", th: "ยังไม่ได้ตั้งค่าบนเซิร์ฟเวอร์", tone: "#f59e0b" },
      bad_address: { en: "invalid address", th: "อีเมลไม่ถูกต้อง", tone: "#f43f5e" },
      skipped: { en: "off", th: "ปิดอยู่", tone: "#8b93a7" },
    };
    return map[r] ?? map.skipped;
  };
  const sendTest = async () => {
    setTesting(true); setTestRes(null);
    try {
      const r = await fetch(publicAsset("/api/notify"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true, email: s.emailAddr, emailOn: s.email, lineOn: s.line, lineId: s.lineId }),
      });
      if (r.status === 429) { setTestRes({ email: "failed", line: "failed" }); }
      else { const d = await r.json(); setTestRes({ email: d.email, line: d.line }); }
    } catch { setTestRes({ email: "failed", line: "failed" }); }
    setTesting(false);
  };

  const channel = (on: boolean, key: any, icon: any, name: string, right: ReactNode) => {
    const Icon = icon;
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-white/60"><Icon size={15} /></span>
        <span className="text-sm font-medium text-white/85">{name}</span>
        <div className="ml-auto flex items-center gap-3">{on ? right : null}<Toggle on={on} onClick={() => upd({ [key]: !on } as any)} /></div>
      </div>
    );
  };
  const smallInput = (v: string, on: (x: string) => void, ph: string) => <input value={v} onChange={(e) => on(e.target.value)} placeholder={ph} className="w-44 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-xs text-white/80 placeholder:text-white/25 focus:outline-none" />;
  const alertRow = (on: boolean, key: any, label: string, right?: ReactNode) => (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <Bell size={15} className={cn("shrink-0", on ? "text-brand-300" : "text-white/30")} />
      <span className="flex-1 text-sm text-white/75">{label}</span>
      {on && right ? right : null}
      <Toggle on={on} onClick={() => upd({ [key]: !on } as any)} />
    </div>
  );

  return (
    <div className="space-y-6">
      <Card
        icon={Bell}
        title={tr("Notification Channels")}
        subtitle={tr("Where alerts are delivered.")}
        extra={
          <button onClick={sendTest} disabled={testing || (!s.email && !s.line)} className="flex items-center gap-1.5 rounded-lg border border-brand-400/30 bg-brand-400/[0.08] px-3 py-1.5 text-xs font-medium text-brand-200 transition hover:bg-brand-400/[0.15] disabled:opacity-50">
            {testing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} {L({ en: "Send a test", th: "ส่งข้อความทดสอบ" })}
          </button>
        }
      >
        <div className="space-y-3">
          {channel(s.email, "email", Mail, "Email", smallInput(s.emailAddr, (x) => upd({ emailAddr: x }), "name@company.com"))}
          {channel(s.line, "line", MessageSquare, "LINE", smallInput(s.lineId, (x) => upd({ lineId: x }), "@line-oa"))}
          {channel(s.push, "push", MonitorSmartphone, tr("Browser push"), null)}
        </div>
        {testRes ? (
          <div className="mt-3 flex flex-wrap gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[12px]">
            <span className="text-white/50">{L({ en: "Test result:", th: "ผลการทดสอบ:" })}</span>
            <span className="flex items-center gap-1"><Mail size={12} className="text-white/40" /> Email <b style={{ color: chLabel(testRes.email).tone }}>{L(chLabel(testRes.email))}</b></span>
            <span className="flex items-center gap-1"><MessageSquare size={12} className="text-white/40" /> LINE <b style={{ color: chLabel(testRes.line).tone }}>{L(chLabel(testRes.line))}</b></span>
            {testRes.line === "not_configured" ? (
              <span className="w-full text-[11px] text-white/40">{L({ en: "LINE just needs a Messaging API channel token — run deploy/setup-line.sh on the server. It broadcasts to everyone who added your LINE Official Account (no group ID needed).", th: "LINE ต้องการแค่ Messaging API token — รัน deploy/setup-line.sh บนเซิร์ฟเวอร์ จะ broadcast หาทุกคนที่แอด LINE OA (ไม่ต้องหา group ID)" })}</span>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card icon={Bell} title={tr("Alert Me About")} subtitle={tr("Which events trigger a notification.")}>
        <div className="grid gap-3 sm:grid-cols-2">
          {alertRow(s.peak, "peak", tr("Peak demand breach"), (
            <span className="flex items-center gap-1 text-[11px] text-white/45">
              {L({ en: "when over", th: "เมื่อเกิน" })}
              <input type="number" min={50} max={100} value={s.peakPct} onChange={(e) => upd({ peakPct: Math.max(50, Math.min(100, Number(e.target.value) || 90)) })}
                className="w-14 rounded-md border border-white/10 bg-white/[0.02] px-1.5 py-1 text-center tabular text-xs text-white/85 focus:outline-none" />
              % {L({ en: "of contract", th: "ของสัญญา" })}
            </span>
          ))}
          {alertRow(s.pq, "pq", tr("Power-quality events (sag/swell)"))}
          {alertRow(s.anomaly, "anomaly", tr("Energy anomalies"))}
          {alertRow(s.failure, "failure", tr("Equipment failure risk"))}
        </div>
      </Card>

      <Card
        icon={ShieldCheck}
        title={L({ en: "Escalation", th: "ส่งต่อเมื่อไม่มีคนรับเรื่อง" })}
        subtitle={L({ en: "Who gets it first, and who gets it if no one acknowledges", th: "แจ้งใครก่อน และถ้าไม่มีใครกดรับจะส่งต่อใคร" })}
        extra={<Toggle on={s.esc} onClick={() => upd({ esc: !s.esc })} />}
      >
        <div className={cn("flex flex-wrap items-center gap-2 text-sm transition", s.esc ? "opacity-100" : "opacity-40")}>
          <span className="text-white/55">{L({ en: "Alert", th: "แจ้ง" })}</span>
          <select value={s.escFirst} onChange={(e) => upd({ escFirst: e.target.value })} className="rounded-lg border border-white/10 bg-ink-900 px-2.5 py-1.5 text-[13px] text-white/85 focus:outline-none">
            {SEED_USERS.filter((u) => u.active).map((u) => <option key={u.id}>{`${u.name} (${u.role})`}</option>)}
          </select>
          <span className="text-white/55">{L({ en: "first — if not acknowledged within", th: "ก่อน — ถ้าไม่กดรับภายใน" })}</span>
          <input type="number" min={5} max={120} value={s.escMin} onChange={(e) => upd({ escMin: Math.max(5, Math.min(120, Number(e.target.value) || 15)) })}
            className="w-16 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5 text-center tabular text-[13px] text-white/90 focus:outline-none" />
          <span className="text-white/55">{L({ en: "min, escalate to", th: "นาที ส่งต่อ" })}</span>
          <select value={s.escTo} onChange={(e) => upd({ escTo: e.target.value })} className="rounded-lg border border-white/10 bg-ink-900 px-2.5 py-1.5 text-[13px] text-white/85 focus:outline-none">
            {SEED_USERS.filter((u) => u.active).map((u) => <option key={u.id}>{`${u.name} (${u.role})`}</option>)}
          </select>
        </div>
        <p className="mt-2.5 text-[11px] text-white/40">{L({ en: "Applies to critical alerts (failure risk, peak breach). Routine info never escalates.", th: "ใช้กับเรื่องวิกฤต (เสี่ยงเครื่องเสีย, ไฟเกินสัญญา) — เรื่องทั่วไปไม่ส่งต่อ" })}</p>
      </Card>

      <Card icon={Clock} title={tr("Quiet Hours")} subtitle={tr("Hold non-critical alerts during these hours.")}
        extra={<Toggle on={s.quiet} onClick={() => upd({ quiet: !s.quiet })} />}>
        <div className={cn("flex items-center gap-2 transition", s.quiet ? "opacity-100" : "opacity-40")}>
          <input value={s.quietFrom} onChange={(e) => upd({ quietFrom: e.target.value })} className="w-24 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 text-center text-sm tabular text-white/90 focus:outline-none" />
          <span className="text-white/30">–</span>
          <input value={s.quietTo} onChange={(e) => upd({ quietTo: e.target.value })} className="w-24 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 text-center text-sm tabular text-white/90 focus:outline-none" />
          <span className="ml-2 text-xs text-white/45">{tr("Critical alerts always go through.")}</span>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------- 5 · users & roles */

const ROLES = ["Admin", "Engineer", "Operator", "Viewer"] as const;
const SEED_USERS = [
  { id: "u1", name: "Chanachon T.", email: "chanachon@sparex.co.th", role: "Admin", active: true },
  { id: "u2", name: "Somchai P.", email: "somchai@factory.co.th", role: "Engineer", active: true },
  { id: "u3", name: "Wanida K.", email: "wanida@factory.co.th", role: "Operator", active: true },
  { id: "u4", name: "Anan S.", email: "anan@factory.co.th", role: "Viewer", active: false },
];
const AUDIT = [
  { at: "14:32", who: "Somchai P.", act: "Approved measure PQ-01 · PF capacitor bank" },
  { at: "11:05", who: "Chanachon T.", act: "Changed demand contract 3,000 → 2,900 kW" },
  { at: "09:48", who: "Wanida K.", act: "Set CNC-05 to Non-Critical" },
  { at: "08:15", who: "AI (Full-auto)", act: "Peak Load Shedding · deferred Air Comp 10" },
  { at: "Yesterday", who: "Chanachon T.", act: "Invited anan@factory.co.th as Viewer" },
];
const PERMS = [
  { role: "Admin", can: "Everything · billing, users, execute" },
  { role: "Engineer", can: "Approve & execute measures · edit thresholds" },
  { role: "Operator", can: "Acknowledge alerts · run manual controls" },
  { role: "Viewer", can: "View dashboards & reports only" },
];

function UsersSection() {
  const tr = useTr();
  const { locale } = useI18n();
  const L = (o: { en: string; th: string }) => (locale === "th" ? o.th : o.en);
  const [users, setUsers] = useState(SEED_USERS);
  const setRole = (id: string, role: string) => setUsers((p) => p.map((u) => (u.id === id ? { ...u, role } : u)));

  return (
    <div className="space-y-6">
      <div className="panel overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 p-5">
          <Users size={18} className="text-slate-300" />
          <div><h3 className="font-semibold">{tr("Team & Access")}</h3><p className="mt-0.5 text-xs text-white/45">{tr("Who can view, approve and execute in this plant.")}</p></div>
          <button className="btn-glow ml-auto px-3.5 py-2 text-xs"><Users size={13} /> {tr("Invite user")}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-white/40"><th className="px-5 py-3 font-medium">{tr("User")}</th><th className="px-3 py-3 font-medium">{tr("Role")}</th><th className="px-5 py-3 text-right font-medium">{tr("Status")}</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-5 py-3"><p className="font-medium text-white/90">{u.name}</p><p className="text-xs text-white/40">{u.email}</p></td>
                <td className="px-3 py-3">
                  <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)} className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1 text-xs text-white/85 focus:outline-none">
                    {ROLES.map((r) => <option key={r} className="bg-ink-900">{r}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={cn("inline-flex items-center gap-1.5 text-xs", u.active ? "text-emerald-300" : "text-white/40")}><span className={cn("h-1.5 w-1.5 rounded-full", u.active ? "bg-emerald-400" : "bg-white/30")} />{u.active ? tr("Active") : tr("Invited")}</span>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card icon={ShieldCheck} title={tr("What Each Role Can Do")}>
          <div className="space-y-2">
            {PERMS.map((p) => (
              <div key={p.role} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <span className="rounded-md bg-brand-400/10 px-2 py-0.5 text-[11px] font-semibold text-brand-200">{p.role}</span>
                <span className="text-[13px] text-white/70">{p.can}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card icon={Clock} title={tr("Recent Activity")} subtitle={L({ en: "Who changed what, and when", th: "ใครแก้อะไร เมื่อไหร่" })}>
          <ul className="space-y-3">
            {AUDIT.map((e, i) => (
              <li key={i} className="flex gap-3 border-b border-white/5 pb-3 text-xs last:border-0 last:pb-0">
                <span className="w-16 shrink-0 tabular text-white/40">{e.at}</span>
                <div className="min-w-0"><p className="text-white/75">{e.act}</p><p className="mt-0.5 text-white/40">{e.who}</p></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- shell */

function BrandingSection() {
  const { locale } = useI18n();
  const L = (o: { en: string; th: string }) => (locale === "th" ? o.th : o.en);
  const brand = useBrand();
  const fileRef = useRef<HTMLInputElement>(null);
  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1_500_000) { alert(L({ en: "Please use an image under 1.5 MB.", th: "กรุณาใช้รูปขนาดไม่เกิน 1.5 MB" })); return; }
    const reader = new FileReader();
    reader.onload = () => setBrand({ logo: reader.result as string });
    reader.readAsDataURL(f);
  };
  return (
    <div className="panel p-6">
      <div className="flex items-center gap-2.5">
        <Building2 size={18} className="text-brand-300" />
        <div>
          <h3 className="font-semibold">{L({ en: "Company & Branding", th: "บริษัท & แบรนด์" })}</h3>
          <p className="mt-0.5 text-xs text-white/45">{L({ en: "Your logo and name appear on every exported PDF report", th: "โลโก้และชื่อบริษัทจะแสดงบนรายงาน PDF ทุกฉบับ" })}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-white/45">{L({ en: "Company name", th: "ชื่อบริษัท" })}</span>
            <input value={brand.companyName} onChange={(e) => setBrand({ companyName: e.target.value })} placeholder={L({ en: "Your company", th: "ชื่อบริษัทของคุณ" })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-brand-400/40 focus:outline-none" />
          </label>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-white/45">{L({ en: "Logo", th: "โลโก้" })}</span>
            <div className="mt-1 flex items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                {brand.logo ? <img src={brand.logo} alt="" className="h-full w-full object-contain" /> : <Building2 size={20} className="text-white/25" />}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} className="hidden" />
              <button onClick={() => fileRef.current?.click()} className="btn-ghost px-3 py-2 text-sm"><Upload size={14} /> {L({ en: "Upload", th: "อัปโหลด" })}</button>
              {brand.logo ? <button onClick={() => setBrand({ logo: null })} className="grid h-9 w-9 place-items-center rounded-lg border border-white/12 bg-white/5 text-white/50 transition hover:text-rose-300"><Trash2 size={15} /></button> : null}
            </div>
            <p className="mt-1.5 text-[11px] text-white/35">{L({ en: "PNG or SVG, transparent background, under 1.5 MB.", th: "PNG หรือ SVG พื้นหลังโปร่งใส ขนาดไม่เกิน 1.5 MB" })}</p>
          </div>
        </div>
        <div>
          <span className="text-[11px] uppercase tracking-wider text-white/45">{L({ en: "Report letterhead preview", th: "ตัวอย่างหัวกระดาษรายงาน" })}</span>
          <div className="mt-1 rounded-xl bg-white p-4 shadow-inner">
            <div style={{ height: 4, borderRadius: 2, background: "linear-gradient(90deg,#22d3ee,#6366f1)", marginBottom: 12 }} />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {brand.logo ? <img src={brand.logo} alt="" style={{ height: 34, width: "auto", maxWidth: 110, objectFit: "contain" }} /> : <div style={{ height: 34, width: 34, borderRadius: 8, background: "#0e7490", color: "#fff", display: "grid", placeItems: "center", fontSize: 15, fontWeight: 700 }}>{brand.companyName.trim().charAt(0).toUpperCase() || "F"}</div>}
                <div><p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1a2233" }}>{brand.companyName || "—"}</p><p style={{ margin: 0, fontSize: 10, color: "#5b6472" }}>Condition monitoring report</p></div>
              </div>
              <div style={{ textAlign: "right" }}><p style={{ margin: 0, fontSize: 9, fontWeight: 600, color: "#0e7490" }}>RPM INTELLIGENCE™</p><p style={{ margin: 0, fontSize: 9, color: "#94a3b8" }}>SpareX FactoryOS</p></div>
            </div>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/40"><FileText size={12} /> {L({ en: "Set it once — used on all report PDFs.", th: "ตั้งครั้งเดียว — ใช้กับรายงาน PDF ทุกฉบับ" })}</p>
        </div>
      </div>
    </div>
  );
}

const SECTIONS = [
  { k: "connect", icon: Cable, label: "Data source · Connect" },
  { k: "machines", icon: Shield, label: "Machines & assets" },
  { k: "tariff", icon: Coins, label: "Tariff & billing" },
  { k: "brand", icon: Building2, label: "Company & branding" },
  { k: "ai", icon: Sparkles, label: "AI & automation" },
  { k: "notify", icon: Bell, label: "Notifications" },
  { k: "users", icon: Users, label: "Users & roles" },
] as const;

export function SettingsModule() {
  const tr = useTr();
  const [section, setSection] = useState<(typeof SECTIONS)[number]["k"]>("connect");

  return (
    <div className="space-y-6">
      <nav className="flex gap-1 overflow-x-auto border-b border-white/10 scrollbar-hide">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = section === s.k;
          return (
            <button key={s.k} onClick={() => setSection(s.k)} className={cn("relative flex shrink-0 items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition", active ? "text-white" : "text-white/50 hover:text-white/85")}>
              <Icon size={15} className={active ? "text-brand-300" : "text-white/45"} />
              <span className="whitespace-nowrap">{tr(s.label)}</span>
              {active ? <span className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-brand-400" /> : null}
            </button>
          );
        })}
      </nav>

      <div className="min-w-0">
        {section === "connect" && <ConnectSection />}
        {section === "machines" && <CriticalitySection />}
        {section === "tariff" && <TariffSection />}
        {section === "brand" && <BrandingSection />}
        {section === "ai" && <AutomationSection />}
        {section === "notify" && <NotificationsSection />}
        {section === "users" && <UsersSection />}
      </div>
    </div>
  );
}
