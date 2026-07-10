"use client";

import { motion } from "framer-motion";
import { IdCard, Grid3x3, ListChecks, Recycle, ShieldCheck, Wallet, HardHat } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type LZ = { en: string; th: string };

/** AssetIQ is intentionally gated behind an "under development" state — the full
 *  Asset Performance Management workspace (components/asset/AssetWorkspace.tsx) is
 *  built and can be re-enabled by pointing app/os/assets/page.tsx back at it. */
const PLANNED: { icon: typeof IdCard; label: LZ }[] = [
  { icon: IdCard, label: { en: "Asset passport · 2-lens", th: "โปรไฟล์สินทรัพย์ · 2 มุมมอง" } },
  { icon: Grid3x3, label: { en: "Criticality × condition map", th: "แผนที่ความวิกฤต × สภาพ" } },
  { icon: ListChecks, label: { en: "FMEA & RPN analysis", th: "วิเคราะห์ FMEA & RPN" } },
  { icon: Recycle, label: { en: "Repair-vs-replace (NPV)", th: "ซ่อม-vs-เปลี่ยน (NPV)" } },
  { icon: ShieldCheck, label: { en: "Reliability · MTBF / MTTR", th: "ความน่าเชื่อถือ · MTBF / MTTR" } },
  { icon: Wallet, label: { en: "Asset economics & ฿ risk", th: "เศรษฐศาสตร์สินทรัพย์ & ฿ เสี่ยง" } },
];

export function AssetUnderDevelopment() {
  const { locale } = useI18n();
  const L = (o: LZ) => (locale === "th" ? o.th : o.en);
  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="panel relative w-full max-w-2xl overflow-hidden p-8 text-center sm:p-10"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-amber-500/10 blur-[90px]" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-52 w-52 rounded-full bg-brand-500/10 blur-[90px]" />

        <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950 shadow-glow">
          <HardHat size={28} />
        </div>

        <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3.5 py-1 text-xs font-medium text-amber-300">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" /></span>
          {L({ en: "Under development", th: "อยู่ระหว่างพัฒนา" })}
        </span>

        <h1 className="mt-4 text-2xl font-semibold">AssetIQ™</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/55">
          {L({
            en: "The fleet-wide Asset Performance Management workspace — fusing condition, criticality, reliability and cost into an engineer & executive lens. We're refining it before release.",
            th: "ศูนย์บริหารสมรรถนะสินทรัพย์ทั้งฟลีต — หลอมสภาพเครื่อง ความวิกฤต ความน่าเชื่อถือ และต้นทุน เข้าเป็นมุมมองวิศวกรและผู้บริหาร กำลังปรับให้สมบูรณ์ก่อนเปิดใช้งาน",
          })}
        </p>

        <div className="mt-7 grid grid-cols-1 gap-2.5 text-left sm:grid-cols-2">
          {PLANNED.map((p) => (
            <div key={p.label.en} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-white/45"><p.icon size={16} /></span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-white/70">{L(p.label)}</span>
              <span className="shrink-0 rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-white/40">{L({ en: "soon", th: "เร็วๆ นี้" })}</span>
            </div>
          ))}
        </div>

        <p className="mt-7 text-xs text-white/40">
          {L({ en: "Meanwhile, rotating-equipment health is live in ", th: "ระหว่างนี้ ดูสุขภาพเครื่องหมุนได้ที่ " })}
          <a href="/os/rpm" className="text-brand-300 underline-offset-2 hover:underline">RPM Intelligence™</a>.
        </p>
      </motion.div>
    </main>
  );
}
