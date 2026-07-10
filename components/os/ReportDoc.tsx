"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Download, FileText, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared industrial report paper — the same A4 look VisionIQ ships, reusable by any module.
 *  All strings arrive pre-localized; every colour inside the paper is a fixed hex
 *  (the paper is ALWAYS white, so theme-flipped utilities must never be used here). */

/* ── print building blocks ── */
export function DocSec({ no, title, children }: { no: string; title: string; children: React.ReactNode }) {
  return (
    <div className="px-8 pt-5" style={{ breakInside: "avoid" }}>
      <div className="flex items-baseline gap-2 border-b-2 border-[#0f172a] pb-1">
        <span className="text-[11px] font-bold tabular text-[#0e7490]">{no}</span>
        <h2 className="text-[12px] font-bold uppercase tracking-wider text-[#0f172a]">{title}</h2>
      </div>
      <div className="pt-2.5">{children}</div>
    </div>
  );
}
export function DocP({ children }: { children: React.ReactNode }) {
  return <p className="text-[11.5px] leading-relaxed text-[#334155]">{children}</p>;
}
export function DocB({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-[#0f172a]">{children}</span>;
}
export function DocKpis({ items }: { items: { label: string; value: string; sub: string; color?: string }[] }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))` }}>
      {items.map((k) => (
        <div key={k.label} className="border border-[#e2e8f0] p-2.5">
          <p className="text-[8.5px] uppercase tracking-wider text-[#94a3b8]">{k.label}</p>
          <p className="tabular text-[18px] font-bold leading-tight" style={{ color: k.color ?? "#0f172a" }}>{k.value}</p>
          <p className="text-[9px] text-[#94a3b8]">{k.sub}</p>
        </div>
      ))}
    </div>
  );
}
export function DocTbl({ head, right = [], rows }: { head: string[]; right?: number[]; rows: React.ReactNode[][] }) {
  return (
    <table className="w-full">
      <thead><tr className="bg-[#f1f5f9] text-[9px] uppercase tracking-wider text-[#64748b]">
        {head.map((h, i) => <th key={h} className={cn("px-2 py-1.5 align-middle font-semibold leading-[1.4]", right.includes(i) ? "text-right" : "text-left")}>{h}</th>)}
      </tr></thead>
      <tbody>{rows.map((r, ri) => (
        <tr key={ri} className="border-b border-[#e2e8f0] text-[11px] text-[#334155]">
          {r.map((c, ci) => <td key={ci} className={cn("px-2 py-1.5 align-middle leading-[1.4]", right.includes(ci) && "tabular text-right")}>{c}</td>)}
        </tr>
      ))}</tbody>
    </table>
  );
}
export function DocNum({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-1.5">{items.map((it, i) => (
      <li key={i} className="flex items-start gap-2 text-[11px] text-[#334155]"><span className="tabular mt-px shrink-0 font-bold text-[#0e7490]">{i + 1}.</span><span className="min-w-0">{it}</span></li>
    ))}</ol>
  );
}
export function DocChip({ tone, children }: { tone: "ok" | "warn" | "bad"; children: React.ReactNode }) {
  const cls = tone === "ok" ? "bg-[#dcfce7] text-[#15803d]" : tone === "warn" ? "bg-[#fef3c7] text-[#b45309]" : "bg-[#fee2e2] text-[#b91c1c]";
  return <span className={cn("whitespace-nowrap rounded px-1.5 py-px text-[8.5px] font-bold", cls)}>{children}</span>;
}

/* ── the viewer modal + real PDF download ── */
export function ReportDoc({
  fname, docNo, dateLine, moduleLine, title, subtitle, stampTitle, stampValue,
  meta, signatures, footerLeft, footerRight, ui, onClose, children,
}: {
  fname: string;
  docNo: string;
  dateLine: string;
  moduleLine: string;
  title: string;
  subtitle: string;
  stampTitle: string;
  stampValue: string;
  meta: { label: string; value: string }[];
  signatures: string[];
  footerLeft: string;
  footerRight: string;
  ui: { download: string; generating: string; downloaded: string; close: string; tag: string };
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [dl, setDl] = useState<"idle" | "busy" | "done">("idle");
  const paperRef = useRef<HTMLDivElement>(null);
  // page = A4 width × the content's own height → the file looks exactly like the preview
  const download = async () => {
    if (dl !== "idle" || !paperRef.current) return;
    setDl("busy");
    try {
      const el = paperRef.current;
      const pageW = 210;
      const pageH = Math.max(148, (el.scrollHeight / el.offsetWidth) * pageW + 1);
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf().set({
        margin: 0,
        filename: fname,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: [pageW, pageH], orientation: "portrait" },
      }).from(el).save();
      setDl("done");
      setTimeout(() => setDl("idle"), 2500);
    } catch {
      setDl("idle");
    }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.25 }} className="flex max-h-[92vh] w-full max-w-[760px] flex-col" onClick={(e) => e.stopPropagation()}>
        {/* viewer toolbar */}
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-white/15 bg-[#0b1220]/95 px-3 py-2">
          <FileText size={14} style={{ color: "rgba(255,255,255,0.6)" }} />
          <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: "rgba(255,255,255,0.85)" }}>{fname}</span>
          <span className="hidden text-[10.5px] sm:block" style={{ color: "rgba(255,255,255,0.4)" }}>{ui.tag}</span>
          <button onClick={download} disabled={dl === "busy"} className="btn-glow whitespace-nowrap px-2.5 py-1 text-[11px]">
            {dl === "busy" ? <><RefreshCw size={12} className="animate-spin" /> {ui.generating}</>
              : dl === "done" ? <><Check size={12} /> {ui.downloaded}</>
              : <><Download size={12} /> {ui.download}</>}
          </button>
          <button onClick={onClose} title={ui.close} className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/20 transition hover:bg-white/10" style={{ color: "rgba(255,255,255,0.7)" }}><X size={13} /></button>
        </div>

        {/* the paper */}
        <div className="overflow-y-auto rounded-lg shadow-2xl">
          <div ref={paperRef} className="relative overflow-hidden bg-white" style={{ fontFeatureSettings: '"tnum"' }}>
            <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-28deg] select-none whitespace-nowrap text-[92px] font-black" style={{ color: "rgba(15,23,42,0.035)" }}>SPAREX</p>

            {/* header band */}
            <div className="flex items-start justify-between px-8 py-5" style={{ backgroundColor: "#0b1220" }}>
              <div>
                <p className="text-[15px] font-bold tracking-wide" style={{ color: "#ffffff" }}>SpareX <span style={{ color: "#22d3ee" }}>FactoryOS™</span></p>
                <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.24em]" style={{ color: "rgba(255,255,255,0.5)" }}>{moduleLine}</p>
              </div>
              <div className="text-right">
                <p className="tabular text-[12px] font-semibold" style={{ color: "#ffffff" }}>{docNo}</p>
                <p className="mt-1 text-[9.5px]" style={{ color: "rgba(255,255,255,0.45)" }}>{dateLine}</p>
              </div>
            </div>
            <div style={{ height: 6, background: "repeating-linear-gradient(45deg,#f59e0b 0 10px,#0b1220 10px 20px)" }} />

            {/* title block */}
            <div className="px-8 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-[21px] font-bold leading-tight text-[#0f172a]">{title}</h1>
                  <p className="mt-0.5 text-[11px] text-[#64748b]">{subtitle}</p>
                </div>
                <div className="shrink-0 rotate-[-4deg] rounded border-2 border-[#0e7490] px-3 py-1 text-center">
                  <p className="text-[8.5px] font-bold uppercase tracking-[0.2em] text-[#0e7490]">{stampTitle}</p>
                  <p className="tabular text-[12px] font-bold text-[#0e7490]">{stampValue}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-px overflow-hidden rounded border border-[#e2e8f0] bg-[#e2e8f0]" style={{ gridTemplateColumns: `repeat(${meta.length}, minmax(0, 1fr))` }}>
                {meta.map((m) => (
                  <div key={m.label} className="bg-white px-3 py-2"><p className="text-[8.5px] uppercase tracking-wider text-[#94a3b8]">{m.label}</p><p className="text-[11px] font-medium text-[#0f172a]">{m.value}</p></div>
                ))}
              </div>
            </div>

            {children}

            {/* signatures */}
            <div className="grid grid-cols-3 gap-6 px-8 pt-8">
              {signatures.map((s) => (
                <div key={s} className="pt-6 text-center">
                  <div className="mx-auto h-px w-full max-w-[150px] bg-[#94a3b8]" />
                  <p className="mt-1 text-[9px] text-[#64748b]">{s}</p>
                </div>
              ))}
            </div>

            {/* footer */}
            <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#e2e8f0] px-8 py-3">
              <p className="text-[8.5px] text-[#94a3b8]">{footerLeft}</p>
              <p className="tabular shrink-0 text-[8.5px] text-[#94a3b8]">{footerRight}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
