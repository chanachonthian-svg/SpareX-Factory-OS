"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { publicAsset } from "@/lib/paths";
import { cn, formatTHB } from "@/lib/utils";
import {
  Cpu, Boxes, Brain, Box, HardDrive, Wrench, Sparkles, Send, Check, Plus, Minus,
  ArrowRight, ArrowLeft, ShieldCheck, X, Calculator, Info, Loader2, Wifi, Cable, Server, Cloud,
  ChevronDown, Database, LayoutDashboard, Bell, ClipboardList, FileText, Users,
} from "lucide-react";

type LZ = { en: string; th: string };
type Tr = (o: LZ) => string;

/* ─────────────────────────────────────────────── SpareX-defined price book ──
 * All prices are set by SpareX (THB). The customer only picks options & quantities;
 * the final total is confirmed by the SpareX team after the request is sent. */

const CORE_PRICE = 1_200_000;      // FactoryOS platform (one-time list price)
const SUPPORT_PCT = 0.18;          // one-time model: annual care & updates = 18% of software
const SUBSCRIPTION_PCT = 0.40;     // yearly model: software per-year = 40% of the one-time software price (incl. cloud + support + updates)
const DIGITAL_TWIN_PRICE = 850_000;
const INSTALL_RATE = 3_500;        // per device · one-time
const COMMISSION_RATE = 4_500;     // per device · one-time
const LAN_CABLING_PER_DEVICE = 1_200; // structured cabling per device
const WIFI_AP_PER_GATEWAY = 12_000;   // industrial Wi-Fi bridge per gateway/zone
const ENCLOSURE_PRICE = 45_000;    // a new control cabinet (cabinet + breakers + in-panel wiring)
const ENCLOSURE_CAPACITY = 18;     // ~devices housed per cabinet
const GATEWAY_CAPACITY = 32;       // devices per edge gateway
const LOCAL_SERVER_PRICE = 180_000; // one-time model only · optional on-prem edge/AI server

/** What the Core Platform license actually covers — shown when the customer expands the card. */
const CORE_INCLUDES: { icon: typeof Cpu; name: LZ; desc: LZ }[] = [
  { icon: Database, name: { en: "Data ingestion & Data Lake", th: "รับ & เก็บข้อมูลทั้งโรงงาน (Data Lake)" }, desc: { en: "historian · time-series · retention", th: "historian · time-series · เก็บย้อนหลัง" } },
  { icon: LayoutDashboard, name: { en: "Executive dashboards & app shell", th: "แดชบอร์ดผู้บริหาร & โครงแอป" }, desc: { en: "multi-site · TH/EN · light/dark", th: "หลายโรงงาน · ไทย/อังกฤษ · สว่าง/มืด" } },
  { icon: Sparkles, name: { en: "Copilot chat (ask & answer)", th: "หน้าแชท Copilot (ถาม-ตอบข้อมูล)" }, desc: { en: "factual answers from your data now · AI reasoning = the license", th: "ตอบเชิงข้อเท็จจริงได้เลย · ให้คิดวิเคราะห์/พยากรณ์ = อยู่ที่ไลเซนส์ AI" } },
  { icon: Bell, name: { en: "Alarm · Event · Notification centers", th: "ศูนย์แจ้งเตือน · เหตุการณ์" }, desc: { en: "cross-module alerting", th: "แจ้งเตือนข้ามทุกโมดูล" } },
  { icon: ClipboardList, name: { en: "Work Order Center", th: "ศูนย์ใบสั่งงาน (CAPA)" }, desc: { en: "track every fix to done", th: "ตามงานแก้จนปิดจบ" } },
  { icon: FileText, name: { en: "Report Center", th: "ศูนย์รายงาน" }, desc: { en: "auto reports & export", th: "ออกรายงาน & export อัตโนมัติ" } },
  { icon: Users, name: { en: "User management & roles", th: "จัดการผู้ใช้ & สิทธิ์" }, desc: { en: "role-based access (RBAC)", th: "แบ่งสิทธิ์ตามตำแหน่ง (RBAC)" } },
  { icon: ShieldCheck, name: { en: "Integration & security", th: "เชื่อมต่อ & ความปลอดภัย" }, desc: { en: "ERP/MES · OPC-UA/Modbus · SSO · audit", th: "ERP/MES · OPC-UA/Modbus · SSO · audit log" } },
];

type ModuleItem = { id: string; name: LZ; desc: LZ; accent: string; price: number; kw: RegExp };
const MODULES: ModuleItem[] = [
  { id: "energy", name: { en: "Energy Intelligence", th: "Energy Intelligence" }, desc: { en: "Machine-level metering + cost engine", th: "มิเตอร์ระดับเครื่อง + คิดต้นทุนค่าไฟ" }, accent: "#22d3ee", price: 320_000, kw: /พลังงาน|ค่าไฟ|energy|kwh|\bkw\b|ประหยัดไฟ|ค่าพลังงาน/i },
  { id: "pq", name: { en: "Power Quality Intelligence", th: "Power Quality Intelligence" }, desc: { en: "Harmonics, sag/swell, power factor", th: "ฮาร์มอนิก ไฟตก/เกิน เพาเวอร์แฟกเตอร์" }, accent: "#2dd4bf", price: 280_000, kw: /คุณภาพไฟ|ฮาร์มอน|harmonic|power quality|\bpq\b|ไฟตก|ไฟกระพริบ|ไฟกระชาก|แรงดัน|power factor|เพาเวอร์แฟกเตอร์/i },
  { id: "vortiq", name: { en: "Vortiq Compressed Air", th: "Vortiq Compressed Air" }, desc: { en: "Compressed-air efficiency & leaks", th: "ประสิทธิภาพลมอัด & จุดรั่ว" }, accent: "#38bdf8", price: 240_000, kw: /ลมอัด|อากาศอัด|compressor|คอมเพรสเซอร์|compressed air|ปั๊มลม|air leak|ลมรั่ว/i },
  { id: "rpm", name: { en: "RPM Intelligence", th: "RPM Intelligence" }, desc: { en: "Vibration + predictive maintenance", th: "สั่นสะเทือน + บำรุงรักษาเชิงพยากรณ์" }, accent: "#f472b6", price: 300_000, kw: /มอเตอร์|\bmotor\b|สั่นสะเทือน|vibration|bearing|แบริ่ง|predictive|บำรุงรักษา|maintenance|เครื่องจักรพัง|\bpump\b/i },
  { id: "vision", name: { en: "VisionIQ", th: "VisionIQ" }, desc: { en: "AI visual inspection & defect QC", th: "ตรวจสอบด้วย AI & คัดของเสีย" }, accent: "#c084fc", price: 380_000, kw: /ตรวจสอบ|ตรวจคุณภาพ|defect|ของเสีย|กล้อง|vision|inspect|\bqc\b|ตำหนิ|รอยขีด|ดีเฟกต์/i },
  { id: "production", name: { en: "Production Intelligence", th: "Production Intelligence" }, desc: { en: "Real-time OEE & downtime root-cause", th: "OEE เรียลไทม์ & หาต้นตอดาวน์ไทม์" }, accent: "#f59e0b", price: 260_000, kw: /\boee\b|production|กำลังผลิต|การผลิต|downtime|ดาวน์ไทม์|ประสิทธิภาพการผลิต|throughput/i },
  { id: "sustainability", name: { en: "Sustainability Intelligence", th: "Sustainability Intelligence" }, desc: { en: "Scope 1·2 carbon + audit-ready ESG", th: "คาร์บอน Scope 1·2 + ESG พร้อมออดิท" }, accent: "#4ade80", price: 220_000, kw: /carbon|คาร์บอน|\besg\b|scope|ก๊าซเรือนกระจก|ยั่งยืน|sustainab|net zero|decarbon/i },
];

type LicenseTier = { id: string; name: LZ; desc: LZ; perYr: number };
const LICENSE_TIERS: LicenseTier[] = [
  { id: "standard", name: { en: "Standard", th: "Standard" }, desc: { en: "Copilot Q&A + rule-based analytics · included", th: "Copilot ถาม-ตอบข้อมูล + วิเคราะห์แบบกฎเกณฑ์ · รวมแล้ว" }, perYr: 0 },
  { id: "pro", name: { en: "Pro · AI", th: "Pro · AI" }, desc: { en: "Copilot reasons — root-cause · forecast · recommend", th: "ปลดล็อก Copilot ให้หาต้นตอ · พยากรณ์ · แนะนำ" }, perYr: 480_000 },
  { id: "enterprise", name: { en: "Enterprise · AI+", th: "Enterprise · AI+" }, desc: { en: "Copilot acts — autonomous + custom models + SLA", th: "Copilot สั่งงานอัตโนมัติ + โมเดลเฉพาะ + SLA" }, perYr: 960_000 },
];

/* Field devices — each category lets the customer pick a BRAND (price follows the brand). */
type BrandOpt = { id: string; label: string; spec: LZ; price: number };
type HwGroup = "power" | "sensor" | "plc" | "gateway";
type HwCat = { id: string; group: HwGroup; name: LZ; tag: LZ; brands: BrandOpt[]; kw?: RegExp; forModule?: string };
const HW_CATS: HwCat[] = [
  // ── power meters, by capability ──
  { id: "pm-basic", group: "power", name: { en: "General monitoring", th: "Monitoring ทั่วไป" }, tag: { en: "energy · kWh · load", th: "พลังงาน · kWh · โหลด" }, forModule: "energy", brands: [
    { id: "pm2230", label: "Schneider PM2230", spec: { en: "PowerLogic basic", th: "PowerLogic พื้นฐาน" }, price: 18_000 },
    { id: "abb-m2m", label: "ABB M2M", spec: { en: "network meter", th: "มิเตอร์เน็ตเวิร์ก" }, price: 16_000 },
    { id: "socomec", label: "Socomec Countis E", spec: { en: "energy meter", th: "มิเตอร์พลังงาน" }, price: 15_000 },
  ] },
  { id: "pm-sag", group: "power", name: { en: "Sag / Swell", th: "ไฟตก / ไฟเกิน" }, tag: { en: "RMS events + THD", th: "จับ RMS + THD" }, forModule: "pq", brands: [
    { id: "pm5340", label: "Schneider PM5340", spec: { en: "THD · H15", th: "THD · H15" }, price: 32_000 },
    { id: "abb-m4m", label: "ABB M4M", spec: { en: "PQ network", th: "PQ เน็ตเวิร์ก" }, price: 30_000 },
    { id: "janitza-96", label: "Janitza UMG96", spec: { en: "Class-A entry", th: "เริ่ม Class-A" }, price: 34_000 },
  ] },
  { id: "pm-flicker", group: "power", name: { en: "Flicker / Transient", th: "ไฟกระพริบ / ไฟกระชาก" }, tag: { en: "waveform + Pst", th: "รูปคลื่น + Pst" }, forModule: "pq", brands: [
    { id: "pm5760", label: "Schneider PM5760", spec: { en: "flicker · H40", th: "flicker · H40" }, price: 65_000 },
    { id: "pm8240", label: "Schneider PM8240", spec: { en: "+ transient · H50", th: "+ transient · H50" }, price: 120_000 },
    { id: "ion9000", label: "Schneider ION9000", spec: { en: "top tier · H63", th: "สูงสุด · H63" }, price: 185_000 },
    { id: "janitza-512", label: "Janitza UMG512", spec: { en: "Class-A full", th: "Class-A เต็ม" }, price: 95_000 },
  ] },
  // ── sensors feeding other modules ──
  { id: "sen-vib", group: "sensor", name: { en: "Vibration sensor", th: "เซนเซอร์สั่นสะเทือน" }, tag: { en: "→ RPM", th: "→ RPM" }, forModule: "rpm", brands: [
    { id: "sparex", label: "SpareX Sense", spec: { en: "triaxial + temp", th: "3 แกน + อุณหภูมิ" }, price: 28_000 },
    { id: "skf", label: "SKF", spec: { en: "industrial", th: "อุตสาหกรรม" }, price: 42_000 },
    { id: "banner", label: "Banner", spec: { en: "wireless", th: "ไร้สาย" }, price: 35_000 },
  ] },
  { id: "sen-cam", group: "sensor", name: { en: "AI inspection camera", th: "กล้องตรวจ AI" }, tag: { en: "→ VisionIQ", th: "→ VisionIQ" }, forModule: "vision", brands: [
    { id: "omron", label: "OMRON STC-HD213DV", spec: { en: "2.1MP", th: "2.1MP" }, price: 95_000 },
    { id: "cognex", label: "Cognex", spec: { en: "smart camera", th: "สมาร์ตแคม" }, price: 140_000 },
    { id: "basler", label: "Basler", spec: { en: "GigE", th: "GigE" }, price: 88_000 },
  ] },
  { id: "sen-air", group: "sensor", name: { en: "Air / flow sensor", th: "เซนเซอร์ลม / Flow" }, tag: { en: "→ Vortiq", th: "→ Vortiq" }, forModule: "vortiq", brands: [
    { id: "sick", label: "SICK", spec: { en: "flow meter", th: "มิเตอร์วัดการไหล" }, price: 55_000 },
    { id: "festo", label: "Festo", spec: { en: "flow sensor", th: "เซนเซอร์การไหล" }, price: 48_000 },
    { id: "vp", label: "VPInstruments", spec: { en: "compressed-air flow", th: "วัดลมอัด" }, price: 62_000 },
  ] },
  { id: "sen-gen", group: "sensor", name: { en: "Temp / current sensor", th: "เซนเซอร์อุณหภูมิ / กระแส" }, tag: { en: "general", th: "ทั่วไป" }, brands: [
    { id: "omron-t", label: "OMRON", spec: { en: "general purpose", th: "ทั่วไป" }, price: 8_000 },
    { id: "ifm", label: "IFM", spec: { en: "IO-Link", th: "IO-Link" }, price: 12_000 },
  ] },
  // ── controllers ──
  { id: "plc", group: "plc", name: { en: "PLC / Controller", th: "PLC / ตัวควบคุม" }, tag: { en: "interlock · first-off", th: "interlock · ตรวจชิ้นแรก" }, brands: [
    { id: "siemens", label: "Siemens S7-1200", spec: { en: "compact PLC", th: "PLC คอมแพกต์" }, price: 45_000 },
    { id: "ab", label: "Allen-Bradley CompactLogix", spec: { en: "Rockwell", th: "Rockwell" }, price: 68_000 },
    { id: "mitsu", label: "Mitsubishi FX5", spec: { en: "iQ-F", th: "iQ-F" }, price: 38_000 },
  ] },
  // ── gateway (rendered under connectivity) ──
  { id: "gateway", group: "gateway", name: { en: "Edge Gateway", th: "Edge Gateway" }, tag: { en: "32 devices each", th: "รองรับ 32 อุปกรณ์/ตัว" }, brands: [
    { id: "sparex", label: "SpareX Connect", spec: { en: "32-device edge", th: "edge 32 อุปกรณ์" }, price: 45_000 },
    { id: "moxa", label: "Moxa", spec: { en: "industrial IoT GW", th: "IoT GW อุตสาหกรรม" }, price: 58_000 },
  ] },
];
const catById = (id: string) => HW_CATS.find((c) => c.id === id)!;
const brandPrice = (cat: HwCat, brandId: string) => cat.brands.find((b) => b.id === brandId)?.price ?? cat.brands[0].price;

/* selection state */
type Sel = {
  model: "onetime" | "yearly";
  modules: Set<string>;
  license: string;
  twin: boolean;
  hw: Record<string, { brand: string; qty: number }>;
  conn: "lan" | "wifi";
  localServer: boolean;   // one-time only · SpareX provides an on-prem server
  encOverride: number | null;
  extraDevices: number;
};
const emptySel = (): Sel => ({ model: "onetime", modules: new Set(), license: "standard", twin: false, hw: {}, conn: "lan", localServer: false, encOverride: null, extraDevices: 0 });
const hwOf = (sel: Sel, catId: string) => sel.hw[catId] ?? { brand: catById(catId).brands[0].id, qty: 0 };

/* ── SpareX AI requirement evaluator (deterministic keyword model; team confirms the real quote) ── */
function evaluate(text: string): { sel: Sel; reasons: LZ[] } {
  const t = text.toLowerCase();
  const sel = emptySel();
  const reasons: LZ[] = [];
  const setHw = (catId: string, qty: number, brand?: string) => {
    const prev = sel.hw[catId] ?? { brand: catById(catId).brands[0].id, qty: 0 };
    sel.hw[catId] = { brand: brand ?? prev.brand, qty: Math.max(prev.qty, qty) };
  };

  // commercial model
  if (/เช่า|รายปี|subscription|license|คลาวด์|cloud|จ่ายรายเดือน|ไม่อยากลงทุนก้อน/i.test(text)) {
    sel.model = "yearly";
    reasons.push({ en: "Yearly License — SpareX includes the Cloud, lower upfront.", th: "เช่ารายปี — SpareX รวม Cloud ให้ จ่ายก้อนแรกน้อยกว่า" });
  } else {
    reasons.push({ en: "One-time Project — you own it; you provide the data storage.", th: "ซื้อขาด — เป็นเจ้าของเอง และจัดเตรียมที่เก็บข้อมูลเอง" });
  }
  // connectivity
  if (/wifi|wi-fi|ไร้สาย|ไวไฟ|wireless/i.test(text)) { sel.conn = "wifi"; reasons.push({ en: "Wi-Fi transport — no new cabling to run.", th: "ส่งข้อมูลผ่าน Wi-Fi — ไม่ต้องเดินสายใหม่" }); }

  MODULES.forEach((m) => { if (m.kw.test(text)) { sel.modules.add(m.id); reasons.push({ en: `Matched "${m.name.en}".`, th: `เลือก "${m.name.th}"` }); } });
  if (sel.modules.size === 0) { sel.modules.add("energy"); sel.modules.add("rpm"); reasons.push({ en: "No clear signal — started on Energy + RPM.", th: "ยังไม่ชัด — เริ่มด้วย Energy + RPM" }); }

  if (/twin|3d|จำลอง|ดิจิทัลทวิน|โมเดลโรงงาน/i.test(text) || sel.modules.size >= 4) { sel.twin = true; reasons.push({ en: "Added the Digital Twin.", th: "เพิ่ม Digital Twin" }); }

  if (/autonomous|สั่งงานเอง|custom model|โมเดลเฉพาะ|sla|หลายโรงงาน|กลุ่มโรงงาน|enterprise/i.test(text)) { sel.license = "enterprise"; reasons.push({ en: "Enterprise AI license.", th: "ไลเซนส์ Enterprise AI" }); }
  else if (/\bai\b|predict|พยากรณ์|ต้นตอ|copilot|วิเคราะห์|แนะนำ/i.test(text) || sel.modules.has("vision")) { sel.license = "pro"; reasons.push({ en: "Pro AI license.", th: "ไลเซนส์ Pro AI" }); }

  // device count
  const numMatch = t.match(/(\d{1,4})\s*(เครื่อง|machine|มิเตอร์|meter|จุด|point|device|เครื่องจักร)/);
  const count = numMatch ? Math.min(400, parseInt(numMatch[1], 10)) : (/ใหญ่|large|หลายไลน์/i.test(text) ? 40 : /กลาง|medium/i.test(text) ? 20 : 10);

  // seed devices from the picked modules
  if (sel.modules.has("energy")) setHw("pm-basic", Math.max(2, Math.round(count * 0.6)));
  if (sel.modules.has("pq")) { if (/กระพริบ|กระชาก|flicker|transient/i.test(text)) setHw("pm-flicker", Math.max(1, Math.round(count * 0.1))); setHw("pm-sag", Math.max(2, Math.round(count * 0.2))); }
  if (sel.modules.has("rpm")) setHw("sen-vib", Math.max(4, Math.round(count * 0.5)));
  if (sel.modules.has("vision")) setHw("sen-cam", 3);
  if (sel.modules.has("vortiq")) setHw("sen-air", Math.max(2, Math.round(count * 0.1)));
  if (/first-off|ชิ้นแรก|interlock|plc|automation/i.test(text)) setHw("plc", 1);
  // specific meter brand named
  HW_CATS.forEach((c) => c.brands.forEach((b) => { const re = new RegExp(b.label.split(" ").pop()!.replace(/[-\s]/g, "[-\\s]?"), "i"); if ((b.label.split(" ").pop()!).length > 3 && re.test(text)) { setHw(c.id, Math.max(1, hwOf(sel, c.id).qty), b.id); reasons.push({ en: `You named ${b.label}.`, th: `คุณระบุ ${b.label}` }); } }));
  // gateway auto
  const field = HW_CATS.filter((c) => c.group !== "gateway").reduce((s, c) => s + hwOf(sel, c.id).qty, 0);
  if (field > 0) setHw("gateway", Math.max(1, Math.ceil(field / GATEWAY_CAPACITY)));
  reasons.push({ en: `Sized the hardware for roughly ${count} points — tweak any brand or quantity below.`, th: `ประเมินฮาร์ดแวร์สำหรับราว ${count} จุด — ปรับยี่ห้อหรือจำนวนด้านล่างได้` });

  return { sel, reasons };
}

/* wizard steps — one screen at a time, no long scroll */
const STEPS: { key: string; title: LZ }[] = [
  { key: "buy", title: { en: "How you buy", th: "แบบการซื้อ" } },
  { key: "software", title: { en: "Platform & Modules", th: "แพลตฟอร์ม & โมดูล" } },
  { key: "ai", title: { en: "AI License & Twin", th: "ไลเซนส์ AI & Twin" } },
  { key: "devices", title: { en: "Field Devices", th: "อุปกรณ์หน้างาน" } },
  { key: "infra", title: { en: "Connect & Deploy", th: "เชื่อมต่อ & ที่เก็บ" } },
  { key: "review", title: { en: "Install & Review", th: "ติดตั้ง & สรุป" } },
];

/* ───────────────────────────────────────────────────────────── component ── */
export function Estimator() {
  const { locale } = useI18n();
  const L: Tr = (o) => (locale === "th" ? o.th : o.en);
  const [sel, setSel] = useState<Sel>(emptySel());
  const [req, setReq] = useState("");
  const [thinking, setThinking] = useState(false);
  const [reasons, setReasons] = useState<LZ[]>([]);
  const [showSend, setShowSend] = useState(false);
  const [coreOpen, setCoreOpen] = useState(false);
  const [step, setStep] = useState(0);

  const setHwQty = (id: string, qty: number) => setSel((s) => ({ ...s, hw: { ...s.hw, [id]: { brand: hwOf(s, id).brand, qty: Math.max(0, qty) } } }));
  const setHwBrand = (id: string, brand: string) => setSel((s) => ({ ...s, hw: { ...s.hw, [id]: { brand, qty: hwOf(s, id).qty } } }));
  const toggleModule = (id: string) => setSel((s) => { const m = new Set(s.modules); m.has(id) ? m.delete(id) : m.add(id); return { ...s, modules: m }; });

  const runAi = () => {
    if (!req.trim() || thinking) return;
    setThinking(true);
    setTimeout(() => { const { sel: s, reasons: r } = evaluate(req); setSel(s); setReasons(r); setThinking(false); }, 900);
  };

  const t = useMemo(() => {
    const yearly = sel.model === "yearly";
    const moduleSum = MODULES.filter((m) => sel.modules.has(m.id)).reduce((s, m) => s + m.price, 0);
    const twin = sel.twin ? DIGITAL_TWIN_PRICE : 0;
    const software = CORE_PRICE + moduleSum + twin;

    const hwSum = HW_CATS.reduce((s, c) => { const h = hwOf(sel, c.id); return s + h.qty * brandPrice(c, h.brand); }, 0);
    const fieldDevices = HW_CATS.filter((c) => c.group !== "gateway").reduce((s, c) => s + hwOf(sel, c.id).qty, 0) + (sel.extraDevices || 0);
    const gateways = hwOf(sel, "gateway").qty;
    const deviceCount = fieldDevices + gateways;

    const connectivity = sel.conn === "lan" ? deviceCount * LAN_CABLING_PER_DEVICE : gateways * WIFI_AP_PER_GATEWAY;
    const encAuto = deviceCount > 0 ? Math.max(1, Math.ceil(deviceCount / ENCLOSURE_CAPACITY)) : 0;
    const enclosures = sel.encOverride ?? encAuto;
    const enclosureCost = enclosures * ENCLOSURE_PRICE;
    const install = deviceCount * INSTALL_RATE;
    const commission = deviceCount * COMMISSION_RATE;
    const serverCost = !yearly && sel.localServer ? LOCAL_SERVER_PRICE : 0;

    const physical = hwSum + connectivity + install + commission + enclosureCost + serverCost;
    const licenseYr = LICENSE_TIERS.find((x) => x.id === sel.license)?.perYr ?? 0;

    let capexSoftware: number, softwareYr: number, supportYr: number;
    if (yearly) { capexSoftware = 0; softwareYr = Math.round(software * SUBSCRIPTION_PCT); supportYr = 0; }
    else { capexSoftware = software; softwareYr = 0; supportYr = Math.round(software * SUPPORT_PCT); }

    const oneTime = capexSoftware + physical;
    const perYear = softwareYr + supportYr + licenseYr;
    return { yearly, software, moduleSum, twin, hwSum, fieldDevices, gateways, deviceCount, connectivity, encAuto, enclosures, enclosureCost, install, commission, serverCost, physical, capexSoftware, softwareYr, supportYr, licenseYr, perYear, oneTime, firstYear: oneTime + perYear };
  }, [sel]);

  const gwSuggest = t.fieldDevices > 0 ? Math.max(1, Math.ceil(t.fieldDevices / GATEWAY_CAPACITY)) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="min-w-0">
        <StepperNav step={step} setStep={setStep} L={L} />
        <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: "easeOut" }} className="mt-4 space-y-6">
        {step === 0 && (<>
        {/* AI requirement box */}
        <section className="panel overflow-hidden p-5" style={{ background: "linear-gradient(180deg, rgba(34,211,238,0.06), transparent 70%)" }}>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-brand-200"><Sparkles size={16} /> {L({ en: "Describe your plant — let SpareX AI scope it", th: "อธิบายโรงงานของคุณ — ให้ AI ของ SpareX ประเมินให้" })}</div>
          <p className="mt-1 text-[12px] text-white/50">{L({ en: "e.g. \"a 30-machine plant, want energy savings, motor-failure prediction, camera QC — yearly license on the cloud\"", th: "เช่น \"โรงงาน 30 เครื่อง อยากประหยัดพลังงาน ทำนายมอเตอร์พัง ตรวจ QC ด้วยกล้อง — เช่ารายปีบน cloud\"" })}</p>
          <textarea value={req} onChange={(e) => setReq(e.target.value)} rows={3} placeholder={L({ en: "Type your requirements…", th: "พิมพ์ความต้องการของคุณ…" })} className="mt-3 w-full resize-none rounded-xl border border-white/12 bg-white/[0.03] px-3.5 py-2.5 text-[13.5px] text-white placeholder:text-white/30 focus:border-brand-400/50 focus:outline-none focus:ring-1 focus:ring-brand-400/30" />
          <div className="mt-3 flex items-center justify-between gap-3">
            <button onClick={() => { setSel(emptySel()); setReasons([]); setReq(""); }} className="text-[12px] text-white/45 transition hover:text-white/75">{L({ en: "Reset", th: "ล้างค่า" })}</button>
            <button onClick={runAi} disabled={!req.trim() || thinking} className="btn-glow px-4 py-2 text-[13px] disabled:opacity-50">{thinking ? <><Loader2 size={14} className="animate-spin" /> {L({ en: "AI is scoping…", th: "AI กำลังประเมิน…" })}</> : <><Sparkles size={14} /> {L({ en: "Let AI choose for me", th: "ให้ AI เลือกให้" })}</>}</button>
          </div>
          {reasons.length ? (
            <div className="mt-3 rounded-xl border border-brand-400/20 bg-brand-400/[0.05] p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-300"><Brain size={12} /> {L({ en: "What SpareX AI picked & why", th: "AI ของ SpareX เลือกอะไร & เพราะอะไร" })}</p>
              <ul className="space-y-1">{reasons.map((r, i) => <li key={i} className="flex items-start gap-1.5 text-[12px] leading-relaxed text-white/70"><ArrowRight size={11} className="mt-1 shrink-0 text-brand-300" /> {L(r)}</li>)}</ul>
            </div>
          ) : null}
        </section>

        {/* 0 · Commercial model */}
        <Group icon={Calculator} title={L({ en: "How you want to buy", th: "รูปแบบการซื้อ" })} sub={L({ en: "changes what's included — and where the data lives", th: "เปลี่ยนสิ่งที่รวมให้ — และที่เก็บข้อมูล" })} accent="#34d399">
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ["onetime", { en: "One-time Project", th: "ซื้อขาด (จ่ายครั้งเดียว)" }, { en: "Own it outright · you provide the data storage (local server or your cloud)", th: "เป็นเจ้าของเลย · ลูกค้าจัดเตรียมที่เก็บข้อมูลเอง (Local Server หรือ Cloud ของคุณ)" }],
              ["yearly", { en: "Yearly License", th: "เช่ารายปี" }, { en: "Pay per year · SpareX includes Cloud hosting — nothing extra to buy", th: "จ่ายรายปี · SpareX รวม Cloud ให้ — ไม่ต้องซื้อเพิ่ม" }],
            ] as ["onetime" | "yearly", LZ, LZ][]).map(([id, name, desc]) => { const on = sel.model === id; return (
              <button key={id} onClick={() => setSel((s) => ({ ...s, model: id }))} className={cn("rounded-xl border p-3.5 text-left transition", on ? "border-emerald-400/50 bg-emerald-400/[0.09] ring-1 ring-emerald-400/25" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]")}>
                <div className="flex items-center justify-between"><p className={cn("text-[13px] font-semibold", on ? "text-emerald-200" : "text-white/85")}>{L(name)}</p>{on ? <Check size={14} className="text-emerald-300" /> : null}</div>
                <p className="mt-1 text-[11px] leading-snug text-white/50">{L(desc)}</p>
              </button>
            ); })}
          </div>
        </Group>

        </>)}

        {step === 1 && (<>
        {/* Core */}
        <Group icon={Cpu} title={L({ en: "Core Platform", th: "แพลตฟอร์มหลัก" })} sub={L({ en: "the FactoryOS base — required", th: "ฐานของ FactoryOS — จำเป็นต้องมี" })} accent="#22d3ee">
          <button onClick={() => setCoreOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-brand-400/25 bg-brand-400/[0.06] px-3.5 py-3 text-left transition hover:bg-brand-400/[0.09]">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-400/15 text-brand-200"><Check size={15} /></span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-white">{L({ en: "FactoryOS Platform License", th: "ไลเซนส์แพลตฟอร์ม FactoryOS" })}</p>
                <p className="flex items-center gap-1 text-[11px] font-medium text-brand-300/85">{coreOpen ? L({ en: "Hide details", th: "ซ่อนรายละเอียด" }) : L({ en: `See what's included · ${CORE_INCLUDES.length} items`, th: `แตะดูว่ารวมอะไรบ้าง · ${CORE_INCLUDES.length} อย่าง` })} <ChevronDown size={12} className={cn("transition-transform", coreOpen && "rotate-180")} /></p>
              </div>
            </div>
            <span className="shrink-0 tabular text-[13px] font-semibold text-white/85">{t.yearly ? `${formatTHB(Math.round(CORE_PRICE * SUBSCRIPTION_PCT))}/${L({ en: "yr", th: "ปี" })}` : formatTHB(CORE_PRICE)}</span>
          </button>
          {coreOpen ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {CORE_INCLUDES.map((it) => (
                <div key={it.name.en} className="flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-400/10 text-brand-300"><it.icon size={14} /></span>
                  <div className="min-w-0"><p className="text-[12px] font-medium text-white/85">{L(it.name)}</p><p className="text-[10.5px] leading-snug text-white/45">{L(it.desc)}</p></div>
                </div>
              ))}
            </div>
          ) : null}
        </Group>

        {/* Modules */}
        <Group icon={Boxes} title={L({ en: "Intelligence Modules", th: "โมดูลอัจฉริยะ" })} sub={L({ en: "pick the cores your plant needs", th: "เลือกแกนที่โรงงานต้องใช้" })} accent="#818cf8" count={`${sel.modules.size}/${MODULES.length}`}>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODULES.map((m) => { const on = sel.modules.has(m.id); return (
              <button key={m.id} onClick={() => toggleModule(m.id)} className={cn("flex items-start gap-2.5 rounded-xl border p-3 text-left transition", on ? "border-brand-400/45 bg-brand-400/[0.08]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]")}>
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border" style={on ? { borderColor: m.accent, background: m.accent, color: "#0b1220" } : { borderColor: "rgba(148,163,184,0.4)" }}>{on ? <Check size={13} /> : null}</span>
                <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5 text-[12.5px] font-medium text-white/90"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: m.accent }} />{L(m.name)}</span><span className="mt-0.5 block text-[11px] leading-snug text-white/45">{L(m.desc)}</span></span>
                <span className="shrink-0 tabular text-[11.5px] font-semibold text-white/70">{formatTHB(m.price)}</span>
              </button>
            ); })}
          </div>
        </Group>

        </>)}

        {step === 2 && (<>
        {/* License */}
        <Group icon={Brain} title={L({ en: "Intelligence License", th: "ไลเซนส์ AI" })} sub={L({ en: "chat is free — this makes Copilot actually reason", th: "แชทถามฟรีอยู่แล้ว — ตัวนี้ทำให้ Copilot คิดวิเคราะห์เป็น" })} accent="#c084fc">
          <div className="grid gap-2 sm:grid-cols-3">
            {LICENSE_TIERS.map((tr) => { const on = sel.license === tr.id; return (
              <button key={tr.id} onClick={() => setSel((s) => ({ ...s, license: tr.id }))} className={cn("rounded-xl border p-3 text-left transition", on ? "border-brand-400/50 bg-brand-400/[0.08] ring-1 ring-brand-400/25" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]")}>
                <div className="flex items-center justify-between"><p className={cn("text-[12.5px] font-semibold", on ? "text-brand-200" : "text-white/85")}>{L(tr.name)}</p>{on ? <Check size={13} className="text-brand-300" /> : null}</div>
                <p className="mt-1 text-[11px] leading-snug text-white/45">{L(tr.desc)}</p>
                <p className="mt-2 tabular text-[12px] font-semibold text-white/80">{tr.perYr ? `${formatTHB(tr.perYr)}/${L({ en: "yr", th: "ปี" })}` : L({ en: "included", th: "รวมแล้ว" })}</p>
              </button>
            ); })}
          </div>
        </Group>

        {/* Digital twin */}
        <Group icon={Box} title={L({ en: "Digital Twin", th: "Digital Twin" })} sub={L({ en: "live 3D model of the whole plant", th: "โมเดล 3 มิติเรียลไทม์ของทั้งโรงงาน" })} accent="#a78bfa">
          <button onClick={() => setSel((s) => ({ ...s, twin: !s.twin }))} className={cn("flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition", sel.twin ? "border-brand-400/45 bg-brand-400/[0.08]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]")}>
            <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: sel.twin ? "rgba(167,139,250,0.18)" : "rgba(148,163,184,0.12)", color: sel.twin ? "#c4b5fd" : "#94a3b8" }}><Box size={15} /></span><div><p className="text-[13px] font-medium text-white">{L({ en: "3D Digital Twin add-on", th: "แอดออน Digital Twin 3 มิติ" })}</p><p className="text-[11px] text-white/45">{L({ en: "rotate · click any asset · layered health/energy/carbon", th: "หมุนดู · คลิกทุกจุด · เลเยอร์สุขภาพ/พลังงาน/คาร์บอน" })}</p></div></div>
            <span className="tabular text-[13px] font-semibold text-white/85">{t.yearly ? `${formatTHB(Math.round(DIGITAL_TWIN_PRICE * SUBSCRIPTION_PCT))}/${L({ en: "yr", th: "ปี" })}` : formatTHB(DIGITAL_TWIN_PRICE)}</span>
          </button>
        </Group>

        </>)}

        {step === 3 && (<>
        {/* Field devices — power / sensors / plc, brand-selectable */}
        <Group icon={HardDrive} title={L({ en: "Field Devices — Sensor · Power Meter · PLC", th: "อุปกรณ์หน้างาน — Sensor · Power Meter · PLC" })} sub={L({ en: "choose the brand & quantity for each need", th: "เลือกยี่ห้อ & จำนวนตามสิ่งที่ต้องวัด" })} accent="#38bdf8" count={`${t.fieldDevices - (sel.extraDevices || 0)} ${L({ en: "units", th: "ชิ้น" })}`}>
          {(["power", "sensor", "plc"] as HwGroup[]).map((g) => (
            <div key={g} className="mb-3 last:mb-0">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{L(g === "power" ? { en: "Power meters", th: "มิเตอร์ไฟ" } : g === "sensor" ? { en: "Sensors", th: "เซนเซอร์" } : { en: "Controllers", th: "ตัวควบคุม" })}</p>
              <div className="space-y-2">
                {HW_CATS.filter((c) => c.group === g).map((c) => <HwRow key={c.id} cat={c} cur={hwOf(sel, c.id)} onBrand={(b) => setHwBrand(c.id, b)} onQty={(q) => setHwQty(c.id, q)} L={L} />)}
              </div>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
            <div className="min-w-0"><p className="text-[12.5px] font-medium text-white/85">{L({ en: "Existing devices to integrate", th: "อุปกรณ์เดิมที่ต้องเชื่อมเข้าระบบ" })}</p><p className="text-[11px] text-white/45">{L({ en: "already on site — still need setup & commissioning", th: "มีอยู่แล้ว — ยังต้องติดตั้ง & คอมมิชชัน" })}</p></div>
            <Stepper n={sel.extraDevices} onChange={(v) => setSel((s) => ({ ...s, extraDevices: v }))} />
          </div>
        </Group>

        </>)}

        {step === 4 && (<>
        {/* Connectivity */}
        <Group icon={Wifi} title={L({ en: "Connectivity — how data travels", th: "การเชื่อมต่อ — ส่งข้อมูลยังไง" })} sub={L({ en: "transport + edge gateways", th: "ช่องทางส่ง + edge gateway" })} accent="#22d3ee">
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ["lan", Cable, { en: "Wired LAN", th: "LAN (สาย)" }, { en: "most reliable · structured cabling per device", th: "นิ่งสุด · เดินสายต่ออุปกรณ์" }],
              ["wifi", Wifi, { en: "Wi-Fi", th: "Wi-Fi (ไร้สาย)" }, { en: "faster to deploy · industrial AP per zone", th: "ติดตั้งไว · AP อุตสาหกรรมต่อโซน" }],
            ] as ["lan" | "wifi", typeof Cable, LZ, LZ][]).map(([id, Icon, name, desc]) => { const on = sel.conn === id; return (
              <button key={id} onClick={() => setSel((s) => ({ ...s, conn: id }))} className={cn("flex items-start gap-2.5 rounded-xl border p-3 text-left transition", on ? "border-brand-400/45 bg-brand-400/[0.08]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]")}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: on ? "rgba(34,211,238,0.16)" : "rgba(148,163,184,0.12)", color: on ? "#67e8f9" : "#94a3b8" }}><Icon size={15} /></span>
                <span className="min-w-0"><span className="flex items-center gap-1.5 text-[13px] font-medium text-white/90">{L(name)}{on ? <Check size={12} className="text-brand-300" /> : null}</span><span className="mt-0.5 block text-[11px] leading-snug text-white/45">{L(desc)}</span></span>
              </button>
            ); })}
          </div>
          <div className="mt-2.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Gateway</p>
            <HwRow cat={catById("gateway")} cur={hwOf(sel, "gateway")} onBrand={(b) => setHwBrand("gateway", b)} onQty={(q) => setHwQty("gateway", q)} L={L} hint={gwSuggest ? L({ en: `suggest ${gwSuggest}`, th: `แนะนำ ${gwSuggest}` }) : undefined} />
          </div>
        </Group>

        {/* Deployment */}
        <Group icon={Server} title={L({ en: "Deployment — where the data lives", th: "แหล่งเก็บข้อมูล" })} sub={L({ en: "tied to how you buy", th: "ขึ้นกับรูปแบบการซื้อ" })} accent="#818cf8">
          {t.yearly ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] px-3.5 py-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-400/15 text-emerald-300"><Cloud size={15} /></span>
              <div className="min-w-0 flex-1"><p className="text-[13px] font-medium text-white">{L({ en: "SpareX Cloud — included", th: "SpareX Cloud — รวมแล้ว" })}</p><p className="text-[11px] text-white/50">{L({ en: "hosted, backed up & secured by SpareX under your yearly license", th: "SpareX โฮสต์ สำรอง และดูแลความปลอดภัยให้ ภายใต้ค่ารายปี" })}</p></div>
              <span className="chip text-emerald-300">฿0</span>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-3.5 py-3">
                <Info size={14} className="mt-0.5 shrink-0 text-amber-300" />
                <p className="text-[12px] leading-relaxed text-white/65">{L({ en: "One-time project: you provide the data storage — an on-prem Local Server or your own Cloud. SpareX doesn't charge a hosting fee.", th: "โปรเจคซื้อขาด: ลูกค้าจัดเตรียมที่เก็บข้อมูลเอง — Local Server ในโรงงาน หรือ Cloud ของคุณ · SpareX ไม่คิดค่า host" })}</p>
              </div>
              <button onClick={() => setSel((s) => ({ ...s, localServer: !s.localServer }))} className={cn("mt-2 flex w-full items-center justify-between rounded-xl border p-3 text-left transition", sel.localServer ? "border-brand-400/45 bg-brand-400/[0.08]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]")}>
                <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: sel.localServer ? "rgba(129,140,248,0.18)" : "rgba(148,163,184,0.12)", color: sel.localServer ? "#a5b4fc" : "#94a3b8" }}><Server size={15} /></span><div><p className="text-[13px] font-medium text-white">{L({ en: "Add an on-prem Local Server (optional)", th: "ให้ SpareX จัดหา Local Server ให้ (ไม่บังคับ)" })}</p><p className="text-[11px] text-white/45">{L({ en: "edge / AI server if you'd rather SpareX supply it", th: "เครื่อง edge / AI ถ้าอยากให้ SpareX จัดให้" })}</p></div></div>
                <span className="tabular text-[13px] font-semibold text-white/85">{formatTHB(LOCAL_SERVER_PRICE)}</span>
              </button>
            </>
          )}
        </Group>

        {/* Enclosure */}
        <Group icon={Box} title={L({ en: "New Control Cabinet", th: "ตู้คอนโทรลใหม่" })} sub={L({ en: "a separate enclosure housing meters, gateway & PLC", th: "ตู้แยกที่รวมมิเตอร์ · gateway · PLC" })} accent="#f59e0b">
          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3">
            <div className="min-w-0"><p className="text-[13px] font-medium text-white/85">{L({ en: "Control cabinet (built separately)", th: "ตู้คอนโทรล (ทำใหม่แยกออกมา)" })}</p><p className="mt-0.5 tabular text-[11px] text-white/45">{formatTHB(ENCLOSURE_PRICE)}/{L({ en: "cabinet", th: "ตู้" })} · {L({ en: `~${ENCLOSURE_CAPACITY} devices each · auto ${t.encAuto}`, th: `~${ENCLOSURE_CAPACITY} อุปกรณ์/ตู้ · ประเมิน ${t.encAuto}` })}</p></div>
            <Stepper n={t.enclosures} onChange={(v) => setSel((s) => ({ ...s, encOverride: v }))} />
          </div>
        </Group>

        </>)}

        {step === 5 && (<>
        {/* Install & commission */}
        <Group icon={Wrench} title={L({ en: "Installation & Commissioning", th: "ติดตั้ง & Commissioning" })} sub={L({ en: "per-device rate · scales with device count", th: "คิดตามจำนวนอุปกรณ์ · ต่อชิ้น" })} accent="#f472b6">
          <div className="grid gap-2 sm:grid-cols-2">
            <RateRow label={L({ en: "Installation Hardware", th: "ติดตั้งฮาร์ดแวร์" })} rate={INSTALL_RATE} count={t.deviceCount} total={t.install} L={L} />
            <RateRow label={L({ en: "Set-Up & Commissioning", th: "เซ็ตอัพ & Commissioning" })} rate={COMMISSION_RATE} count={t.deviceCount} total={t.commission} L={L} />
          </div>
          {t.deviceCount === 0 ? <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/40"><Info size={12} /> {L({ en: "Add devices above to size installation.", th: "เพิ่มอุปกรณ์ด้านบนเพื่อคิดค่าติดตั้ง" })}</p> : null}
        </Group>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-3.5 py-3 text-[12.5px] text-white/70"><Check size={15} className="shrink-0 text-emerald-300" /> {L({ en: "That's everything — check the estimate on the right and send it to the SpareX team.", th: "ครบแล้ว — ตรวจราคาประเมินทางขวา แล้วกดส่งให้ทีม SpareX ได้เลย" })}</div>
        </>)}
        </motion.div>
        </AnimatePresence>

        {/* back / next */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn-ghost px-4 py-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft size={14} /> {L({ en: "Back", th: "ย้อนกลับ" })}</button>
          {step < STEPS.length - 1
            ? <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} className="btn-glow px-5 py-2 text-[13px]">{L({ en: "Next", th: "ถัดไป" })} · {L(STEPS[step + 1].title)} <ArrowRight size={14} /></button>
            : <span className="flex items-center gap-1.5 text-[12px] font-medium text-brand-200"><ArrowRight size={13} /> {L({ en: "Send it on the right →", th: "กดส่งทางขวา →" })}</span>}
        </div>
      </div>

      {/* summary */}
      <aside className="lg:sticky lg:top-6">
        <div className="panel overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-white"><Calculator size={16} className="text-brand-300" /> {L({ en: "Estimate summary", th: "สรุปราคาประเมิน" })}</div>
            <span className="chip text-[10px]" style={{ color: t.yearly ? "#818cf8" : "#34d399" }}>{t.yearly ? L({ en: "Yearly", th: "รายปี" }) : L({ en: "One-time", th: "ซื้อขาด" })}</span>
          </div>

          <div className="mt-3 space-y-1.5 border-b border-white/10 pb-3 text-[12px]">
            {!t.yearly ? <Row label={L({ en: "Software (platform + modules)", th: "ซอฟต์แวร์ (แพลตฟอร์ม + โมดูล)" })} v={formatTHB(t.capexSoftware)} /> : null}
            {t.hwSum ? <Row label={`${L({ en: "Hardware", th: "ฮาร์ดแวร์" })} (${t.deviceCount})`} v={formatTHB(t.hwSum)} /> : null}
            {t.connectivity ? <Row label={sel.conn === "lan" ? L({ en: "LAN cabling", th: "เดินสาย LAN" }) : L({ en: "Wi-Fi bridges", th: "อุปกรณ์ Wi-Fi" })} v={formatTHB(t.connectivity)} /> : null}
            {t.enclosureCost ? <Row label={`${L({ en: "Control cabinets", th: "ตู้คอนโทรล" })} (${t.enclosures})`} v={formatTHB(t.enclosureCost)} /> : null}
            {t.install ? <Row label={`${L({ en: "Install + Commission", th: "ติดตั้ง + Commission" })} (${t.deviceCount})`} v={formatTHB(t.install + t.commission)} /> : null}
            {t.serverCost ? <Row label={L({ en: "Local Server", th: "Local Server" })} v={formatTHB(t.serverCost)} /> : null}
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-[11px] uppercase tracking-wider text-white/45">{L({ en: "One-time (CAPEX)", th: "ครั้งเดียว (CAPEX)" })}</span>
            <span className="tabular text-lg font-bold text-white">{formatTHB(t.oneTime)}</span>
          </div>

          <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-[12px]">
            {t.yearly ? <Row label={L({ en: "Software subscription · incl. Cloud", th: "ค่าซอฟต์แวร์รายปี · รวม Cloud" })} v={formatTHB(t.softwareYr)} /> : null}
            <Row label={`${L({ en: "AI License", th: "ไลเซนส์ AI" })} · ${L(LICENSE_TIERS.find((x) => x.id === sel.license)!.name)}`} v={t.licenseYr ? formatTHB(t.licenseYr) : L({ en: "included", th: "รวมแล้ว" })} muted={!t.licenseYr} />
            {!t.yearly ? <Row label={L({ en: "Care & updates (18%)", th: "ดูแล & อัปเดต (18%)" })} v={formatTHB(t.supportYr)} /> : null}
            <div className="flex items-center justify-between pt-1"><span className="text-[11px] uppercase tracking-wider text-white/45">{L({ en: "Per year", th: "ต่อปี" })}</span><span className="tabular text-[15px] font-bold text-white/90">{formatTHB(t.perYear)}<span className="text-[10px] font-normal text-white/40">/{L({ en: "yr", th: "ปี" })}</span></span></div>
          </div>

          <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-3">
            <p className="text-[11px] text-emerald-300/80">{L({ en: "Estimated first-year total", th: "ประมาณการรวมปีแรก" })}</p>
            <p className="tabular mt-0.5 text-2xl font-bold text-emerald-200">{formatTHB(t.firstYear)}</p>
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-white/40"><Info size={12} className="mt-0.5 shrink-0" /> {L({ en: "A rough estimate from SpareX's price book — final pricing (volume discount, site survey, custom scope) is confirmed by the SpareX team.", th: "ราคาประเมินคร่าวๆ จากราคากลางของ SpareX — ราคาจริง (ส่วนลดตามจำนวน สำรวจหน้างาน สโคปเฉพาะ) ทีม SpareX จะยืนยันอีกครั้ง" })}</p>

          <button onClick={() => setShowSend(true)} className="btn-glow mt-4 w-full justify-center py-2.5 text-[13.5px]"><Send size={15} /> {L({ en: "Send to SpareX team for a quote", th: "ส่งให้ทีม SpareX ทำใบเสนอราคา" })}</button>
        </div>
      </aside>

      {showSend ? <SendModal L={L} sel={sel} totals={t} onClose={() => setShowSend(false)} /> : null}
    </div>
  );
}

/* ── building blocks ── */
function StepperNav({ step, setStep, L }: { step: number; setStep: (n: number) => void; L: Tr }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {STEPS.map((s, i) => {
        const st = i === step ? "cur" : i < step ? "done" : "todo";
        return (
          <button key={s.key} onClick={() => setStep(i)} className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11.5px] font-medium transition", st === "cur" ? "border-brand-400/50 bg-brand-400/15 text-brand-100" : st === "done" ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300" : "border-white/10 bg-white/[0.02] text-white/45 hover:text-white/70")}>
            <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold", st === "cur" ? "bg-brand-400 text-ink-950" : st === "done" ? "bg-emerald-400 text-ink-950" : "bg-white/10 text-white/60")}>{st === "done" ? <Check size={11} /> : i + 1}</span>
            <span className="whitespace-nowrap">{L(s.title)}</span>
          </button>
        );
      })}
    </div>
  );
}
function Group({ icon: Icon, title, sub, accent, count, children }: { icon: typeof Cpu; title: string; sub: string; accent: string; count?: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border" style={{ color: accent, borderColor: `${accent}44`, background: `${accent}14` }}><Icon size={17} /></span>
        <div className="min-w-0 flex-1"><h3 className="text-[14px] font-semibold text-white">{title}</h3><p className="text-[11.5px] text-white/45">{sub}</p></div>
        {count ? <span className="chip shrink-0 text-white/60">{count}</span> : null}
      </div>
      {children}
    </section>
  );
}
function HwRow({ cat, cur, onBrand, onQty, L, hint }: { cat: HwCat; cur: { brand: string; qty: number }; onBrand: (b: string) => void; onQty: (q: number) => void; L: Tr; hint?: string }) {
  const on = cur.qty > 0;
  const brand = cat.brands.find((b) => b.id === cur.brand) ?? cat.brands[0];
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2.5 transition", on ? "border-brand-400/30 bg-brand-400/[0.05]" : "border-white/8 bg-white/[0.02]")}>
      <div className="min-w-[140px] flex-1">
        <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-white/90">{L(cat.name)} <span className="text-[10px] font-normal text-brand-300/80">{L(cat.tag)}</span></p>
        <p className="text-[11px] text-white/45">{L(brand.spec)}{hint ? <span className="ml-1.5 text-amber-300/80">· {hint}</span> : null}</p>
      </div>
      <div className="relative">
        <select value={cur.brand} onChange={(e) => onBrand(e.target.value)} className="appearance-none rounded-lg border border-white/12 bg-white/[0.04] py-1.5 pl-2.5 pr-7 text-[12px] text-white focus:border-brand-400/50 focus:outline-none">
          {cat.brands.map((b) => <option key={b.id} value={b.id} className="bg-ink-900 text-white">{b.label}</option>)}
        </select>
        <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/45" />
      </div>
      <span className="w-20 shrink-0 text-right tabular text-[11.5px] text-white/60">{formatTHB(brand.price)}</span>
      <Stepper n={cur.qty} onChange={onQty} />
    </div>
  );
}
function Stepper({ n, onChange }: { n: number; onChange: (v: number) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button onClick={() => onChange(n - 1)} disabled={n <= 0} className="grid h-7 w-7 place-items-center rounded-lg border border-white/12 bg-white/[0.03] text-white/60 transition hover:bg-white/[0.08] disabled:opacity-30"><Minus size={13} /></button>
      <input value={n} onChange={(e) => onChange(Math.max(0, Math.min(999, parseInt(e.target.value.replace(/\D/g, "") || "0", 10))))} className="w-9 bg-transparent text-center text-[13px] font-semibold tabular text-white focus:outline-none" />
      <button onClick={() => onChange(n + 1)} className="grid h-7 w-7 place-items-center rounded-lg border border-white/12 bg-white/[0.03] text-white/60 transition hover:bg-white/[0.08]"><Plus size={13} /></button>
    </div>
  );
}
function RateRow({ label, rate, count, total, L }: { label: string; rate: number; count: number; total: number; L: Tr }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
      <p className="text-[12.5px] font-medium text-white/85">{label}</p>
      <p className="mt-0.5 tabular text-[11px] text-white/45">{formatTHB(rate)}/{L({ en: "device", th: "ชิ้น" })} × {count}</p>
      <p className="mt-1 tabular text-[14px] font-semibold text-white/90">{formatTHB(total)}</p>
    </div>
  );
}
function Row({ label, v, muted }: { label: string; v: string; muted?: boolean }) {
  return <div className="flex items-center justify-between gap-2"><span className={cn("truncate", muted ? "text-white/35" : "text-white/55")}>{label}</span><span className={cn("shrink-0 tabular font-medium", muted ? "text-white/40" : "text-white/85")}>{v}</span></div>;
}

/* ── send-to-SpareX modal ── */
function SendModal({ L, sel, totals, onClose }: { L: Tr; sel: Sel; totals: { firstYear: number; oneTime: number; perYear: number; deviceCount: number; yearly: boolean }; onClose: () => void }) {
  const [f, setF] = useState({ name: "", company: "", email: "", phone: "", note: "" });
  const [sent, setSent] = useState(false);
  const valid = f.name.trim() && f.company.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim());
  const submit = () => {
    if (!valid) return;
    const payload = { contact: f, model: sel.model, modules: [...sel.modules], license: sel.license, twin: sel.twin, hardware: sel.hw, connectivity: sel.conn, localServer: sel.localServer, estimate: { oneTime: totals.oneTime, perYear: totals.perYear, firstYear: totals.firstYear, devices: totals.deviceCount }, at: Date.now() };
    try { localStorage.setItem("factoryos:quote-request", JSON.stringify(payload)); } catch { /* ignore */ }
    // ship to the SpareX team — email alert + server log, with the full scope in the note
    try {
      const note = [
        `สโคป: ${payload.modules.join(", ") || "-"} · license ${payload.license} · twin ${payload.twin ? "yes" : "no"}`,
        `ราคาประเมิน: ปีแรก ฿${totals.firstYear.toLocaleString()} (one-time ฿${totals.oneTime.toLocaleString()} + รายปี ฿${totals.perYear.toLocaleString()}) · อุปกรณ์ ${totals.deviceCount} จุด`,
        f.note.trim() ? `ข้อความ: ${f.note.trim()}` : "",
      ].filter(Boolean).join("\n");
      fetch(publicAsset("/api/lead"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ name: f.name, company: f.company, phone: f.phone, email: f.email, source: "estimator", note }),
      }).catch(() => {});
    } catch { /* ignore */ }
    setSent(true);
  };
  const fields: [keyof typeof f, LZ, string][] = [
    ["name", { en: "Your name", th: "ชื่อของคุณ" }, "text"],
    ["company", { en: "Company / factory", th: "บริษัท / โรงงาน" }, "text"],
    ["email", { en: "Work email", th: "อีเมลที่ทำงาน" }, "email"],
    ["phone", { en: "Phone (optional)", th: "เบอร์โทร (ไม่บังคับ)" }, "tel"],
  ];
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-ink-950/75 backdrop-blur-md" onClick={onClose} />
      <div className="panel relative w-full max-w-[440px] overflow-hidden p-6">
        <button onClick={onClose} className="absolute right-4 top-4 text-white/40 transition hover:text-white/80"><X size={17} /></button>
        {!sent ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-400/25 bg-brand-400/[0.08] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-brand-200"><ShieldCheck size={12} /> {L({ en: "Request a formal quote", th: "ขอใบเสนอราคาจริง" })}</span>
            <h2 className="mt-3 text-[19px] font-bold leading-tight text-white">{L({ en: "Send this scope to the SpareX team", th: "ส่งสโคปนี้ให้ทีม SpareX" })}</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/50">{L({ en: "We'll review your selection, run a site survey and confirm the real price.", th: "เราจะรีวิวสิ่งที่คุณเลือก สำรวจหน้างาน แล้วยืนยันราคาจริงให้" })}</p>
            <div className="my-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
              <span className="text-[12px] text-white/55">{L({ en: "Your estimate · first year", th: "ราคาประเมิน · ปีแรก" })} · {totals.yearly ? L({ en: "Yearly", th: "รายปี" }) : L({ en: "One-time", th: "ซื้อขาด" })}</span>
              <span className="tabular text-[15px] font-bold text-emerald-300">{formatTHB(totals.firstYear)}</span>
            </div>
            <div className="space-y-2.5">
              {fields.map(([k, ph, type]) => <input key={k} type={type} value={f[k]} onChange={(e) => setF((s) => ({ ...s, [k]: e.target.value }))} placeholder={L(ph)} className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3.5 py-2.5 text-[13.5px] text-white placeholder:text-white/30 focus:border-brand-400/50 focus:outline-none focus:ring-1 focus:ring-brand-400/30" />)}
              <textarea value={f.note} onChange={(e) => setF((s) => ({ ...s, note: e.target.value }))} rows={2} placeholder={L({ en: "Anything else? (optional)", th: "มีอะไรอยากบอกเพิ่ม? (ไม่บังคับ)" })} className="w-full resize-none rounded-xl border border-white/12 bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:border-brand-400/50 focus:outline-none focus:ring-1 focus:ring-brand-400/30" />
            </div>
            <button onClick={submit} disabled={!valid} className="btn-glow mt-4 w-full justify-center py-2.5 text-[13.5px] disabled:cursor-not-allowed disabled:opacity-50"><Send size={15} /> {L({ en: "Send request", th: "ส่งคำขอ" })}</button>
            <p className="mt-2.5 text-center text-[11px] text-white/35">{L({ en: "No commitment — this just starts the conversation.", th: "ยังไม่ผูกมัด — แค่เริ่มพูดคุยกัน" })}</p>
          </>
        ) : (
          <div className="flex flex-col items-center py-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"><Check size={28} /></span>
            <p className="mt-4 text-[16px] font-semibold text-white">{L({ en: "Sent — thank you! 🙏", th: "ส่งแล้ว — ขอบคุณครับ 🙏" })}</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/50">{L({ en: "The SpareX team will reach out with a formal quote shortly.", th: "ทีม SpareX จะติดต่อกลับพร้อมใบเสนอราคาจริงเร็วๆ นี้" })}</p>
            <button onClick={onClose} className="btn-ghost mt-5 px-5 py-2 text-[13px]">{L({ en: "Close", th: "ปิด" })}</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
