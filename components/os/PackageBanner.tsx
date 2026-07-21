"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, X, ArrowRight, ArrowLeft, Check, Sparkles, Boxes, Server, Cloud,
  Cable, Wifi, User, Building2, Phone, Mail, Gauge,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { publicAsset } from "@/lib/paths";
import { cn } from "@/lib/utils";

type LZ = { en: string; th: string };

/* ── what customers can pick ─────────────────────────────────────────────── */

const OFFERS: { id: string; name: LZ; desc: LZ; fit: LZ }[] = [
  {
    id: "core",
    name: { en: "FactoryOS (Core)", th: "FactoryOS (Core)" },
    desc: { en: "The plant's operating system — dashboards, alarms, work orders, reports and the AI Copilot chat in one place.", th: "ระบบปฏิบัติการของโรงงาน — แดชบอร์ด, การเตือน, ใบสั่งงาน, รายงาน และแชท AI Copilot ในที่เดียว" },
    fit: { en: "Every factory starts here", th: "ทุกโรงงานเริ่มจากตัวนี้" },
  },
  {
    id: "modules",
    name: { en: "Intelligence Modules", th: "Intelligence Modules" },
    desc: { en: "Energy · Power Quality · Vortiq Compressed Air · RPM (machine health) · VisionIQ (AI QC) · Production OEE · Sustainability/ESG — pick only what your plant needs.", th: "Energy · Power Quality · Vortiq ลมอัด · RPM สุขภาพเครื่องจักร · VisionIQ ตรวจคุณภาพด้วยภาพ · Production OEE · Sustainability/ESG — เลือกเฉพาะที่โรงงานใช้จริง" },
    fit: { en: "Fits plants attacking a specific cost: power bills, air leaks, breakdowns, scrap or carbon", th: "เหมาะกับโรงงานที่อยากแก้ต้นทุนเป็นเรื่องๆ: ค่าไฟ ลมรั่ว เครื่องพัง ของเสีย หรือคาร์บอน" },
  },
  {
    id: "ai",
    name: { en: "AI License", th: "AI License" },
    desc: { en: "Unlocks the reasoning layer: root-cause analysis with evidence, failure prediction (days ahead), what-if simulation, and ฿-ranked recommendations with auto work orders.", th: "ปลดล็อกสมองของระบบ: หาสาเหตุพร้อมหลักฐาน, คาดการณ์เครื่องพังล่วงหน้าเป็นวัน, จำลอง what-if, และคำแนะนำเรียงตาม ฿ พร้อมออกใบสั่งงานอัตโนมัติ" },
    fit: { en: "For teams that want the system to tell them what to do next", th: "เหมาะกับทีมที่อยากให้ระบบบอกเลยว่าควรทำอะไรก่อน" },
  },
  {
    id: "twin",
    name: { en: "Digital Twin", th: "Digital Twin" },
    desc: { en: "A live 3D model of the whole plant — see health/energy/cost per machine, replay the last 24 h, and dispatch technicians from the model.", th: "โมเดล 3D ของทั้งโรงงานแบบเรียลไทม์ — เห็นสุขภาพ/พลังงาน/เงินรั่วรายเครื่อง ย้อนดู 24 ชม. และสั่งงานช่างจากในโมเดล" },
    fit: { en: "For war-room screens and plants with many assets", th: "เหมาะกับจอ command center และโรงงานที่เครื่องเยอะ" },
  },
];

/** the seven intelligence modules — asked one-by-one when the customer ticks "Modules" */
const MODULES: { id: string; name: string; desc: LZ }[] = [
  { id: "energy", name: "Energy Intelligence", desc: { en: "Cut the power bill · peak control · ฿-ranked savings", th: "ลดค่าไฟ · คุมพีค · หาจุดประหยัดเรียงตาม ฿" } },
  { id: "pq", name: "Power Quality", desc: { en: "Sags, surges, harmonics — protect machines from bad power", th: "ไฟตก ไฟกระชาก ฮาร์มอนิก — กันเครื่องพังจากไฟไม่ดี" } },
  { id: "vortiq", name: "Vortiq Compressed Air", desc: { en: "Find air leaks · right-size compressors", th: "หาลมรั่ว · จัดคอมเพรสเซอร์ให้พอดีโหลด" } },
  { id: "rpm", name: "RPM Intelligence", desc: { en: "Vibration health of rotating machines — fix before failure", th: "สุขภาพเครื่องหมุนจากความสั่น — ซ่อมก่อนพัง" } },
  { id: "vision", name: "VisionIQ", desc: { en: "AI camera QC — catch defects before they ship", th: "AI ตรวจคุณภาพด้วยกล้อง — จับของเสียก่อนถึงมือลูกค้า" } },
  { id: "production", name: "Production Intelligence", desc: { en: "OEE, downtime & hourly plan vs actual", th: "OEE เวลาหยุด และแผนผลิตรายชั่วโมงเทียบผลจริง" } },
  { id: "sustain", name: "Sustainability / ESG", desc: { en: "Carbon Scope 1·2·3 · CBAM · audit-ready reports", th: "คาร์บอน Scope 1·2·3 · CBAM · รายงานพร้อมตรวจ" } },
];

const POINTS = ["1–10", "11–30", "31–50", "51–100", "100+"];

const DEPLOYS: { id: "cloud" | "local"; icon: typeof Cloud; name: LZ; pros: LZ; cons: LZ }[] = [
  {
    id: "cloud", icon: Cloud,
    name: { en: "Cloud (SpareX-hosted)", th: "Cloud (SpareX ดูแลให้)" },
    pros: { en: "No server to buy or maintain · access from anywhere · updates handled by SpareX · included with yearly license", th: "ไม่ต้องซื้อ/ดูแลเซิร์ฟเวอร์เอง · เปิดดูจากที่ไหนก็ได้ · SpareX อัปเดตให้ · รวมในไลเซนส์รายปีแล้ว" },
    cons: { en: "Needs reliable internet · data lives off-site (encrypted)", th: "ต้องมีเน็ตที่นิ่ง · ข้อมูลอยู่นอกโรงงาน (เข้ารหัส)" },
  },
  {
    id: "local", icon: Server,
    name: { en: "Local Server (on-premise)", th: "Local Server (ในโรงงาน)" },
    pros: { en: "Data never leaves the plant · works without internet · one-time install", th: "ข้อมูลไม่ออกนอกโรงงาน · เน็ตล่มก็ยังใช้ได้ · ติดตั้งครั้งเดียว" },
    cons: { en: "You provide & maintain the server hardware · remote access needs your IT setup", th: "ต้องจัดหา/ดูแลเครื่องเซิร์ฟเวอร์เอง · เปิดดูจากนอกโรงงานต้องให้ IT ตั้งค่า" },
  },
];

const CONNECTS: { id: "lan" | "wifi"; icon: typeof Cable; name: LZ; pros: LZ; cons: LZ }[] = [
  {
    id: "lan", icon: Cable,
    name: { en: "Wired LAN", th: "เดินสาย LAN" },
    pros: { en: "Most stable & secure — the factory standard", th: "นิ่งและปลอดภัยสุด — มาตรฐานโรงงาน" },
    cons: { en: "Cabling work adds install time/cost", th: "มีงานเดินสาย เพิ่มเวลาหรือค่าติดตั้ง" },
  },
  {
    id: "wifi", icon: Wifi,
    name: { en: "Wi-Fi / Wireless", th: "Wi-Fi / ไร้สาย" },
    pros: { en: "Fast to install, no cabling — great for far-apart points", th: "ติดตั้งเร็ว ไม่ต้องเดินสาย — เหมาะกับจุดที่อยู่กระจัดกระจาย" },
    cons: { en: "Needs good signal coverage in the plant", th: "ต้องมีสัญญาณครอบคลุมพื้นที่โรงงาน" },
  },
];

/* ── the floating banner + wizard ────────────────────────────────────────── */

/* v2 keys — everyone (including earlier testers) sees the new banner once more.
 * Dismiss = sessionStorage (comes back next visit, as a marketing banner should);
 * Sent = localStorage (a customer who already sent interest is never nagged again). */
const DISMISS_KEY = "factoryos:pkg-banner-dismissed:v2";
const SENT_KEY = "factoryos:pkg-interest-sent:v2";

export function PackageBanner() {
  const { locale } = useI18n();
  const L = (o: LZ) => (locale === "th" ? o.th : o.en);
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0); // index into stepIds (dynamic — "modules" appears only when ticked)
  const [offers, setOffers] = useState<Set<string>>(new Set());
  const [mods, setMods] = useState<Set<string>>(new Set());
  const [points, setPoints] = useState("");
  const [deploy, setDeploy] = useState<"cloud" | "local" | "">("");
  const [connect, setConnect] = useState<"lan" | "wifi" | "">("");
  const [f, setF] = useState({ name: "", company: "", phone: "" });
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setHidden(!!sessionStorage.getItem(DISMISS_KEY) || !!localStorage.getItem(SENT_KEY));
      const r = JSON.parse(localStorage.getItem("factoryos:demo-registered") || "null");
      if (r?.name) setF({ name: r.name || "", company: r.company || "", phone: r.phone || "" });
    } catch { /* ignore */ }
  }, []);

  const toggleOffer = (id: string) =>
    setOffers((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleMod = (id: string) =>
    setMods((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // the module-picker step exists only when the customer ticked "Modules"
  const stepIds = ["offers", ...(offers.has("modules") ? ["modules"] : []), "points", "deploy", "connect", "contact"] as const;
  const cur = stepIds[Math.min(step, stepIds.length - 1)];
  const canNext = {
    offers: offers.size > 0,
    modules: mods.size > 0,
    points: !!points,
    deploy: !!deploy,
    connect: !!connect,
    contact: !!(f.name.trim() && f.phone.trim()),
  }[cur];

  const submit = () => {
    let email = "";
    try { email = JSON.parse(localStorage.getItem("factoryos:demo-login") || "{}").email || ""; } catch { /* ignore */ }
    const names = OFFERS.filter((o) => offers.has(o.id)).map((o) => o.name.en).join(", ");
    const modNames = MODULES.filter((m) => mods.has(m.id)).map((m) => m.name).join(", ");
    const note = [
      `สนใจ: ${names}`,
      offers.has("modules") && modNames ? `โมดูลที่เลือก: ${modNames}` : "",
      `จุด Monitor: ${points}`,
      `ติดตั้ง: ${deploy === "cloud" ? "Cloud (SpareX-hosted)" : "Local Server (on-premise)"}`,
      `เชื่อมต่อ: ${connect === "lan" ? "เดินสาย LAN" : "Wi-Fi"}`,
    ].filter(Boolean).join("\n");
    try {
      fetch(publicAsset("/api/lead"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ ...f, email, source: "package-banner", note }),
      }).catch(() => {});
    } catch { /* ignore */ }
    try { localStorage.setItem(SENT_KEY, JSON.stringify({ at: Date.now() })); } catch { /* ignore */ }
    setSent(true);
    setTimeout(() => { setOpen(false); setHidden(true); }, 1800);
  };

  const dismiss = () => {
    setHidden(true);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
  };

  if (!mounted) return null;

  const stepTitle: Record<string, LZ> = {
    offers: { en: "What are you interested in?", th: "สนใจส่วนไหนบ้าง?" },
    modules: { en: "Which modules does your plant need?", th: "ต้องการใช้โมดูลไหนบ้าง?" },
    points: { en: "How many monitoring points?", th: "ต้องการ Monitor กี่จุด?" },
    deploy: { en: "Where should it run?", th: "ติดตั้งระบบไว้ที่ไหน?" },
    connect: { en: "How do devices connect?", th: "เชื่อมต่ออุปกรณ์แบบไหน?" },
    contact: { en: "Where can we reach you?", th: "ให้ทีมงานติดต่อกลับที่ไหน?" },
  };

  return createPortal(
    <>
      {/* floating banner — bottom-left (Copilot bot owns bottom-right) */}
      <AnimatePresence>
        {!hidden && !open ? (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: [0, -7, 0], opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ y: { repeat: Infinity, duration: 2.2, ease: "easeInOut" }, opacity: { duration: 0.4 } }}
            className="no-print fixed bottom-24 right-5 z-[70]"
          >
            <div className="relative">
              <span className="pointer-events-none absolute -inset-1 rounded-2xl bg-brand-400/25 blur-md" />
              <button
                onClick={() => { setOpen(true); setStep(0); }}
                className="relative flex items-center gap-2.5 rounded-2xl border border-brand-400/40 bg-ink-900/95 py-2.5 pl-3 pr-4 text-left shadow-glow backdrop-blur transition hover:border-brand-300/60"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950"><Package size={17} /></span>
                <span>
                  <span className="block text-[12.5px] font-semibold text-white">{L({ en: "Build your FactoryOS package", th: "จัดแพ็กเกจ FactoryOS ของคุณ" })}</span>
                  <span className="block text-[10.5px] text-brand-200/90">{L({ en: "Pick modules · get a callback from SpareX", th: "เลือกที่สนใจ · ทีม SpareX ติดต่อกลับ" })}</span>
                </span>
              </button>
              <button onClick={dismiss} aria-label="dismiss" className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-white/20 bg-ink-900 text-white/50 transition hover:text-white"><X size={11} /></button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* wizard modal */}
      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-[85] flex items-center justify-center p-5">
            <div className="absolute inset-0 bg-ink-950/75 backdrop-blur-md" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }} className="panel relative max-h-[88vh] w-full max-w-[560px] overflow-y-auto p-6">
              <button onClick={() => setOpen(false)} className="absolute right-4 top-4 text-white/40 transition hover:text-white/80"><X size={17} /></button>

              {sent ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"><Check size={28} /></span>
                  <p className="mt-4 text-[15px] font-semibold text-white">{L({ en: "Sent to the SpareX team 🙏", th: "ส่งให้ทีม SpareX แล้ว 🙏" })}</p>
                  <p className="mt-1 text-[12.5px] text-white/50">{L({ en: "We'll call you back within 1 business day.", th: "ทีมงานจะติดต่อกลับภายใน 1 วันทำการ" })}</p>
                </div>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-400/25 bg-brand-400/[0.08] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-brand-200"><Sparkles size={12} /> {L({ en: "Package builder", th: "จัดแพ็กเกจที่ใช่" })} · {step + 1}/{stepIds.length}</span>
                  <h2 className="mt-3 text-[19px] font-bold leading-tight text-white">{L(stepTitle[cur])}</h2>

                  {cur === "offers" ? (
                    <div className="mt-4 space-y-2.5">
                      {OFFERS.map((o) => {
                        const on = offers.has(o.id);
                        return (
                          <button key={o.id} onClick={() => toggleOffer(o.id)} className={cn("w-full rounded-xl border p-3.5 text-left transition", on ? "border-brand-400/50 bg-brand-400/[0.08]" : "border-white/12 bg-white/[0.02] hover:bg-white/[0.05]")}>
                            <span className="flex items-center gap-2">
                              <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-md border", on ? "border-brand-400/60 bg-brand-400/25 text-brand-200" : "border-white/25 text-transparent")}><Check size={12} /></span>
                              <span className="text-[13.5px] font-semibold text-white">{L(o.name)}</span>
                            </span>
                            <p className="mt-1.5 pl-7 text-[11.5px] leading-relaxed text-white/55">{L(o.desc)}</p>
                            <p className="mt-1 pl-7 text-[10.5px] text-brand-200/80">✦ {L(o.fit)}</p>
                          </button>
                        );
                      })}
                    </div>
                  ) : cur === "modules" ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {MODULES.map((m) => {
                        const on = mods.has(m.id);
                        return (
                          <button key={m.id} onClick={() => toggleMod(m.id)} className={cn("rounded-xl border p-3 text-left transition", on ? "border-brand-400/50 bg-brand-400/[0.08]" : "border-white/12 bg-white/[0.02] hover:bg-white/[0.05]")}>
                            <span className="flex items-center gap-2">
                              <span className={cn("grid shrink-0 place-items-center rounded border", on ? "border-brand-400/60 bg-brand-400/25 text-brand-200" : "border-white/25 text-transparent")} style={{ width: 18, height: 18 }}><Check size={11} /></span>
                              <span className="text-[12.5px] font-semibold text-white">{m.name}</span>
                            </span>
                            <p className="mt-1 pl-[26px] text-[10.5px] leading-relaxed text-white/50">{L(m.desc)}</p>
                          </button>
                        );
                      })}
                    </div>
                  ) : cur === "points" ? (
                    <div className="mt-4">
                      <p className="text-[12px] text-white/50">{L({ en: "Machines / meters / cameras you want FactoryOS to watch", th: "จำนวนเครื่องจักร/มิเตอร์/กล้อง ที่อยากให้ FactoryOS เฝ้าดู" })}</p>
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {POINTS.map((p) => (
                          <button key={p} onClick={() => setPoints(p)} className={cn("rounded-xl border py-3 text-center transition", points === p ? "border-brand-400/50 bg-brand-400/[0.1]" : "border-white/12 bg-white/[0.02] hover:bg-white/[0.05]")}>
                            <Gauge size={15} className={cn("mx-auto", points === p ? "text-brand-300" : "text-white/35")} />
                            <span className={cn("mt-1 block tabular text-[13px] font-semibold", points === p ? "text-brand-200" : "text-white/70")}>{p}</span>
                            <span className="block text-[9.5px] text-white/40">{L({ en: "points", th: "จุด" })}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : cur === "deploy" || cur === "connect" ? (
                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                      {(cur === "deploy" ? DEPLOYS : CONNECTS).map((d) => {
                        const on = cur === "deploy" ? deploy === d.id : connect === d.id;
                        const set = () => (cur === "deploy" ? setDeploy(d.id as "cloud" | "local") : setConnect(d.id as "lan" | "wifi"));
                        return (
                          <button key={d.id} onClick={set} className={cn("rounded-xl border p-3.5 text-left transition", on ? "border-brand-400/50 bg-brand-400/[0.08]" : "border-white/12 bg-white/[0.02] hover:bg-white/[0.05]")}>
                            <span className="flex items-center gap-2">
                              <d.icon size={16} className={on ? "text-brand-300" : "text-white/45"} />
                              <span className="text-[13px] font-semibold text-white">{L(d.name)}</span>
                            </span>
                            <p className="mt-2 text-[11px] leading-relaxed text-emerald-300/85">✓ {L(d.pros)}</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-amber-300/75">△ {L(d.cons)}</p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2.5">
                      {([
                        { key: "name", icon: User, ph: L({ en: "Your name", th: "ชื่อ-นามสกุล" }) },
                        { key: "company", icon: Building2, ph: L({ en: "Company / factory", th: "บริษัท / โรงงาน" }) },
                        { key: "phone", icon: Phone, ph: L({ en: "Phone", th: "เบอร์โทร" }) },
                      ] as const).map(({ key, icon: Icon, ph }) => (
                        <div key={key} className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 focus-within:border-brand-400/50">
                          <Icon size={16} className="shrink-0 text-white/35" />
                          <input value={f[key]} onChange={(e) => setF((p) => ({ ...p, [key]: e.target.value }))} placeholder={ph} className="w-full bg-transparent text-[14px] text-white placeholder:text-white/30 focus:outline-none" />
                        </div>
                      ))}
                      <p className="flex items-center gap-1.5 text-[11px] text-white/40"><Mail size={12} /> {L({ en: "Your login email is attached automatically", th: "อีเมลที่ใช้เข้าระบบจะแนบไปให้อัตโนมัติ" })}</p>
                    </div>
                  )}

                  <div className="mt-6 flex items-center justify-between">
                    {step > 0 ? (
                      <button onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-1 text-[12.5px] text-white/45 transition hover:text-white/80"><ArrowLeft size={13} /> {L({ en: "Back", th: "ย้อนกลับ" })}</button>
                    ) : <span />}
                    {step < stepIds.length - 1 ? (
                      <button onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="btn-glow px-5 py-2.5 text-[13.5px] disabled:cursor-not-allowed disabled:opacity-50">{L({ en: "Next", th: "ถัดไป" })} <ArrowRight size={14} /></button>
                    ) : (
                      <button onClick={submit} disabled={!canNext} className="btn-glow px-5 py-2.5 text-[13.5px] disabled:cursor-not-allowed disabled:opacity-50"><Boxes size={14} /> {L({ en: "Send to SpareX team", th: "ส่งให้ทีม SpareX" })}</button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>,
    document.body,
  );
}
