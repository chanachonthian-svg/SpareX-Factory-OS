"use client";

import { useEffect, useRef, useState, forwardRef, type CSSProperties } from "react";
import { FileText, Printer, FileSpreadsheet, SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn, formatCompact, formatTHB } from "@/lib/utils";
import { assets, assetBurnPerHr, countByStatus } from "@/lib/factory";
import {
  twinRoi, twinAiInsights, twinActions, replayEvents,
  type TwinSeverity, type TwinActionStatus, type ReplayTone,
} from "@/lib/optwin";

type LZ = { en: string; th: string };
type Lf = (o: LZ) => string;

/* ─────────────────────────────────────────────────────────────── data ── */

/** Plant aggregates from the live asset model — deterministic mock, so safe at module scope. */
const avg = (xs: number[]) => Math.round(xs.reduce((s, n) => s + n, 0) / (xs.length || 1));
const PLANT = {
  oee: avg(assets.map((a) => a.oee)),
  health: avg(assets.map((a) => a.health)),
  powerKw: assets.reduce((s, a) => s + a.powerKw, 0),
  co2KgH: Math.round(assets.reduce((s, a) => s + a.co2KgH, 0)),
  burnHr: assets.reduce((s, a) => s + assetBurnPerHr(a), 0),
  status: countByStatus(),
};

/** Fixed period labels (demo stays deterministic — same convention as PqWorkflow). */
const REPORT_PERIOD: Record<"today" | "month", LZ> = {
  today: { en: "12 July 2026", th: "12 กรกฎาคม 2026" },
  month: { en: "July 2026", th: "กรกฎาคม 2026" },
};

type SectionKey = "summary" | "roi" | "findings" | "actions" | "log";
const SECTION_DEFS: { key: SectionKey; title: LZ; sub: LZ }[] = [
  { key: "summary", title: { en: "Executive summary", th: "บทสรุปผู้บริหาร" }, sub: { en: "plant health & ฿ burn at a glance", th: "สุขภาพโรงงาน + เงินที่รั่วต่อชม." } },
  { key: "roi", title: { en: "What the twin paid back", th: "เงินที่ทวินช่วยไว้" }, sub: { en: "downtime avoided, priced in ฿", th: "ดาวน์ไทม์ที่เลี่ยงได้ ตีเป็นเงิน" } },
  { key: "findings", title: { en: "AI findings", th: "สิ่งที่ AI เจอ" }, sub: { en: "what to fix first, ranked by ฿", th: "ควรแก้อะไรก่อน เรียงตามเงิน" } },
  { key: "actions", title: { en: "Automation status", th: "สถานะระบบอัตโนมัติ" }, sub: { en: "what's running vs awaiting approval", th: "อะไรรันอยู่ อะไรรออนุมัติ" } },
  { key: "log", title: { en: "Event log · last 24 h", th: "บันทึกเหตุการณ์ · 24 ชม." }, sub: { en: "how the last day unfolded", th: "วันที่ผ่านมาเกิดอะไรบ้าง" } },
];

/** Severity / status copy on the paper mirrors the in-app labels (views.tsx). */
const SEV_META: Record<TwinSeverity, { label: LZ; hex: string }> = {
  "act-now": { label: { en: "Act now", th: "ด่วน — ทำเลย" }, hex: "#e11d48" },
  "this-week": { label: { en: "This week", th: "สัปดาห์นี้" }, hex: "#d97706" },
  opportunity: { label: { en: "Opportunity", th: "โอกาส" }, hex: "#0891b2" },
  good: { label: { en: "On track", th: "ข่าวดี" }, hex: "#059669" },
};

const ACT_META: Record<TwinActionStatus, { label: LZ; hex: string }> = {
  active: { label: { en: "Running", th: "กำลังทำงาน" }, hex: "#059669" },
  pending: { label: { en: "Pending approval", th: "รออนุมัติ" }, hex: "#d97706" },
  suggested: { label: { en: "Suggested", th: "AI แนะนำ" }, hex: "#64748b" },
};

const TONE_META: Record<ReplayTone, { label: LZ; hex: string }> = {
  ok: { label: { en: "OK", th: "ปกติ" }, hex: "#059669" },
  warn: { label: { en: "Warning", th: "เตือน" }, hex: "#d97706" },
  crit: { label: { en: "Critical", th: "วิกฤต" }, hex: "#e11d48" },
};

/* ─────────────────────────────────────────────────────────────── paper ── */

/** The report renders as a light "printed page" in BOTH app themes — a document looks the
 *  same on screen as on paper — so it uses explicit colors, not the theme-remapped utility
 *  classes. The very same inline styles ride into the PDF via the node's outerHTML. */
const PAPER = { bg: "#ffffff", ink: "#0f172a", body: "#334155", muted: "#64748b", faint: "#94a3b8", line: "#e2e8f0", soft: "#f1f5f9", brand: "#0e7490" };

type ReportPaperProps = { L: Lf; range: "today" | "month"; sec: Record<SectionKey, boolean>; genAt: string };

/** The document itself — a self-contained light page. All styling is inline so the exact
 *  rendered DOM (`node.outerHTML`) prints faithfully to PDF without any external CSS. */
const ReportPaper = forwardRef<HTMLDivElement, ReportPaperProps>(function ReportPaper({ L, range, sec, genAt }, ref) {
  const period = L(REPORT_PERIOD[range]);

  const thS: CSSProperties = { textAlign: "left", padding: "7px 8px", background: PAPER.soft, color: PAPER.muted, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${PAPER.line}`, whiteSpace: "nowrap" };
  const tdS: CSSProperties = { padding: "7px 8px", color: PAPER.body, borderBottom: `1px solid ${PAPER.soft}`, verticalAlign: "top" };
  const tdNum: CSSProperties = { ...tdS, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700 };
  const tableS: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 11.5 };
  const wrapS: CSSProperties = { padding: "16px 26px", borderTop: `1px solid ${PAPER.line}` };

  const chip = (text: string, c: string) => <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, color: c, background: `${c}18`, border: `1px solid ${c}45`, whiteSpace: "nowrap" }}>{text}</span>;
  const meta = (k: string, v: string) => <div style={{ marginBottom: 3 }}><span style={{ color: PAPER.faint }}>{k}: </span><span style={{ color: PAPER.ink, fontWeight: 600 }}>{v}</span></div>;
  const kpi = (label: string, value: string, unit: string, color: string) => (
    <div style={{ border: `1px solid ${PAPER.line}`, borderRadius: 9, padding: "9px 11px", background: "#fff" }}>
      <div style={{ fontSize: 9.5, color: PAPER.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span style={{ fontSize: 19, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{value}</span>
        <span style={{ fontSize: 10.5, color: PAPER.faint, fontWeight: 600 }}>{unit}</span>
      </div>
    </div>
  );
  let n = 0;
  const secHead = (title: string, sub: string) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 10 }}>
      <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: PAPER.brand }}>{String(++n).padStart(2, "0")}</span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: PAPER.ink }}>{title}</span>
      <span style={{ fontSize: 10.5, color: PAPER.muted }}>· {sub}</span>
    </div>
  );

  return (
    <div ref={ref} style={{ width: "100%", background: PAPER.bg, color: PAPER.body, fontFamily: "'Sarabun','Segoe UI',system-ui,-apple-system,sans-serif", fontSize: 12 }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, padding: "20px 26px", borderBottom: `2px solid ${PAPER.brand}` }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-grid", placeItems: "center", width: 26, height: 26, borderRadius: 7, background: PAPER.brand, color: "#fff", fontWeight: 800, fontSize: 13 }}>S</span>
            <span style={{ fontWeight: 800, color: PAPER.ink, fontSize: 14 }}>SpareX <span style={{ color: PAPER.brand }}>FactoryOS</span></span>
          </div>
          <h1 style={{ margin: "12px 0 2px", fontSize: 20, fontWeight: 800, color: PAPER.ink }}>{L({ en: "Digital Twin™ Report", th: "รายงาน Digital Twin™" })}</h1>
          <div style={{ color: PAPER.muted, fontSize: 11.5 }}>{L({ en: "Bangkok Plant 1 · Powered by SpareX", th: "โรงงานกรุงเทพ 1 · Powered by SpareX" })}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11 }}>
          {meta(L({ en: "Period", th: "ช่วงเวลา" }), period)}
          {meta(L({ en: "Plant", th: "โรงงาน" }), "Bangkok Plant 1")}
          {meta(L({ en: "Generated", th: "ออกรายงาน" }), genAt || period)}
          {meta(L({ en: "Coverage", th: "ครอบคลุม" }), L({ en: `${assets.length} assets · 2 zones`, th: `${assets.length} เครื่อง · 2 โซน` }))}
        </div>
      </div>

      {/* exec summary */}
      {sec.summary && (
        <div style={{ padding: "16px 26px", background: "#fbfdff" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: PAPER.brand, marginBottom: 9 }}>{L({ en: "Executive summary", th: "บทสรุปผู้บริหาร" })}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 9 }}>
            {kpi(L({ en: "Plant OEE", th: "OEE โรงงาน" }), String(PLANT.oee), "%", "#059669")}
            {kpi(L({ en: "Avg health", th: "สุขภาพเฉลี่ย" }), String(PLANT.health), "/100", PAPER.brand)}
            {kpi(L({ en: "Total power", th: "กำลังไฟรวม" }), formatCompact(PLANT.powerKw), "kW", "#0891b2")}
            {kpi(L({ en: "CO₂ now", th: "CO₂ ตอนนี้" }), String(PLANT.co2KgH), "kg/h", "#059669")}
            {kpi(L({ en: "Burn rate", th: "เงินที่รั่ว" }), `฿${formatCompact(PLANT.burnHr)}`, L({ en: "/hr", th: "/ชม." }), "#e11d48")}
          </div>
          <p style={{ margin: "11px 0 0", color: PAPER.body, fontSize: 12, lineHeight: 1.55 }}>
            {L({
              en: `The plant is running at ${PLANT.oee}% OEE with ${PLANT.status.critical} critical and ${PLANT.status.warning} warning assets; degraded machines are burning ~฿${formatCompact(PLANT.burnHr)}/hr above their healthy baseline. The twin's early catches saved ${formatTHB(twinRoi.avoidedBaht)} this month — the priority is Chiller B, predicted to fail in ~3 days.`,
              th: `โรงงานเดินอยู่ที่ OEE ${PLANT.oee}% มีเครื่องวิกฤต ${PLANT.status.critical} เครื่อง เตือน ${PLANT.status.warning} เครื่อง — เครื่องที่เสื่อมสภาพกำลังเผาเงินเกินฐานปกติ ~฿${formatCompact(PLANT.burnHr)}/ชม. เดือนนี้ทวินจับปัญหาได้ก่อนพัง ช่วยไว้ ${formatTHB(twinRoi.avoidedBaht)} — เรื่องด่วนสุดคือ Chiller B ที่คาดว่าจะพังใน ~3 วัน`,
            })}
          </p>
        </div>
      )}

      {/* ROI — what the twin paid back */}
      {sec.roi && (
        <div style={wrapS}>
          {secHead(L({ en: "What the Twin Paid Back", th: "เงินที่ทวินช่วยไว้" }), `${L({ en: "downtime avoided before it happened", th: "ดาวน์ไทม์ที่เลี่ยงได้ก่อนเกิดจริง" })} · ${L(twinRoi.month)}`)}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 10 }}>
            {kpi(L({ en: "Saved", th: "รักษาไว้ได้" }), formatTHB(twinRoi.avoidedBaht), "", "#059669")}
            {kpi(L({ en: "Downtime avoided", th: "ดาวน์ไทม์ที่เลี่ยงได้" }), String(twinRoi.avoidedHrs), L({ en: "hrs", th: "ชม." }), PAPER.brand)}
            {kpi(L({ en: "Failures caught early", th: "จับได้ก่อนพัง" }), String(twinRoi.catches.length), L({ en: "cases", th: "เคส" }), "#0891b2")}
          </div>
          <table style={tableS}>
            <thead><tr>
              {[L({ en: "Asset", th: "เครื่อง" }), L({ en: "What the twin caught", th: "ทวินจับอะไรได้" }), L({ en: "Hrs avoided", th: "ชม. ที่เลี่ยงได้" }), L({ en: "฿ saved", th: "เงินที่รักษาไว้" })].map((h, i) => <th key={i} style={{ ...thS, textAlign: i >= 2 ? "right" : "left" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {twinRoi.catches.map((c) => (
                <tr key={c.asset}>
                  <td style={{ ...tdS, fontWeight: 600, color: PAPER.ink, whiteSpace: "nowrap" }}>{c.asset}</td>
                  <td style={tdS}>{L(c.what)}</td>
                  <td style={tdNum}>{c.hrs}</td>
                  <td style={{ ...tdNum, color: "#059669" }}>{formatTHB(c.baht)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...tdS, fontWeight: 700, color: PAPER.ink }}>{L({ en: "Total", th: "รวม" })}</td>
                <td style={tdS} />
                <td style={{ ...tdNum, color: PAPER.ink }}>{twinRoi.avoidedHrs}</td>
                <td style={{ ...tdNum, color: "#059669" }}>{formatTHB(twinRoi.avoidedBaht)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* AI findings */}
      {sec.findings && (
        <div style={wrapS}>
          {secHead(L({ en: "AI Findings", th: "สิ่งที่ AI เจอ" }), L({ en: "ranked by money at stake", th: "เรียงตามเงินที่เดิมพัน" }))}
          <table style={tableS}>
            <thead><tr>
              {["#", L({ en: "Finding", th: "สิ่งที่เจอ" }), L({ en: "Severity", th: "ระดับ" }), L({ en: "Impact", th: "ผลกระทบ" }), L({ en: "Confidence", th: "ความมั่นใจ" })].map((h, i) => <th key={i} style={{ ...thS, textAlign: i === 4 ? "right" : "left" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {twinAiInsights.map((f, i) => {
                const sev = SEV_META[f.severity];
                return (
                  <tr key={f.tag + i}>
                    <td style={{ ...tdS, fontFamily: "monospace", fontWeight: 700, color: PAPER.brand }}>{i + 1}</td>
                    <td style={tdS}>
                      <div style={{ fontWeight: 600, color: PAPER.ink }}>{L(f.title)}</div>
                      <div style={{ marginTop: 2, fontSize: 10.5, color: PAPER.muted }}>{f.tag} · {L(f.detail)}</div>
                    </td>
                    <td style={tdS}>{chip(L(sev.label), sev.hex)}</td>
                    <td style={{ ...tdS, fontWeight: 700, color: f.severity === "good" ? "#059669" : sev.hex, whiteSpace: "nowrap" }}>{L(f.impact)}</td>
                    <td style={tdNum}>{f.confidence}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* automation status */}
      {sec.actions && (
        <div style={wrapS}>
          {secHead(L({ en: "Automation Status", th: "สถานะระบบอัตโนมัติ" }), L({ en: "what's running vs awaiting approval", th: "อะไรรันอยู่ อะไรรออนุมัติ" }))}
          <table style={tableS}>
            <thead><tr>
              {[L({ en: "Action", th: "การทำงาน" }), L({ en: "Domain", th: "หมวด" }), L({ en: "Impact", th: "มูลค่า" }), L({ en: "Status", th: "สถานะ" })].map((h, i) => <th key={i} style={thS}>{h}</th>)}
            </tr></thead>
            <tbody>
              {twinActions.map((a) => {
                const st = ACT_META[a.status];
                return (
                  <tr key={a.id}>
                    <td style={tdS}>
                      <div style={{ fontWeight: 600, color: PAPER.ink }}>{a.name}</div>
                      <div style={{ marginTop: 2, fontSize: 10.5, color: PAPER.muted }}>{a.desc}</div>
                    </td>
                    <td style={{ ...tdS, color: PAPER.muted }}>{a.domain}</td>
                    <td style={{ ...tdS, fontVariantNumeric: "tabular-nums", fontWeight: 700, whiteSpace: "nowrap" }}>{a.impact}</td>
                    <td style={tdS}>{chip(L(st.label), st.hex)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* event log */}
      {sec.log && (
        <div style={wrapS}>
          {secHead(L({ en: "Event Log · last 24 h", th: "บันทึกเหตุการณ์ · 24 ชม." }), L({ en: "every state change the twin recorded", th: "ทุกการเปลี่ยนสถานะที่ทวินบันทึกไว้" }))}
          <table style={tableS}>
            <thead><tr>
              {[L({ en: "Time", th: "เวลา" }), L({ en: "Event", th: "เหตุการณ์" }), L({ en: "Level", th: "ระดับ" })].map((h, i) => <th key={i} style={thS}>{h}</th>)}
            </tr></thead>
            <tbody>
              {replayEvents.map((e) => {
                const tone = TONE_META[e.tone];
                return (
                  <tr key={e.time}>
                    <td style={{ ...tdS, fontVariantNumeric: "tabular-nums", color: PAPER.muted, whiteSpace: "nowrap" }}>{e.time}</td>
                    <td style={tdS}>{L(e.label)}</td>
                    <td style={tdS}>{chip(L(tone.label), tone.hex)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* footer */}
      <div style={{ padding: "12px 26px", borderTop: `1px solid ${PAPER.line}`, color: PAPER.faint, fontSize: 10, display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span>{L({ en: `Every figure streams from the live asset model — ${assets.length} machines in one twin, no estimates.`, th: `ทุกตัวเลขมาจากโมเดลเครื่องจักรปัจจุบัน — ${assets.length} เครื่องในทวินเดียว ไม่มีการประมาณ` })}</span>
        <span style={{ whiteSpace: "nowrap" }}>SpareX FactoryOS · Digital Twin™</span>
      </div>
    </div>
  );
});

/* ─────────────────────────────────────────────────────── 05 · report ── */

/** Step 5 · Report — the house report-builder: builder panel on the left,
 *  a live light-paper preview on the right that IS the exported document. */
export function TwinReportStep() {
  const { locale } = useI18n();
  const L: Lf = (o) => (locale === "th" ? o.th : o.en);
  const [range, setRange] = useState<"today" | "month">("month");
  const [sec, setSec] = useState<Record<SectionKey, boolean>>({ summary: true, roi: true, findings: true, actions: true, log: true });
  const [genAt, setGenAt] = useState("");
  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // client-only stamp so it never trips hydration; a real "generated at" time for the report
    const d = new Date();
    setGenAt(d.toLocaleString(locale === "th" ? "th-TH" : "en-GB", { dateStyle: "medium", timeStyle: "short" }));
  }, [locale]);

  /** PDF export — the preview's own DOM is printed via a hidden iframe, so what you see is
   *  exactly what saves. Reliable even when pop-ups are blocked (window.open usually is). */
  const printReport = () => {
    const node = reportRef.current;
    if (!node) return;
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) { iframe.remove(); return; }
    doc.open();
    doc.write(
      `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>SpareX · Digital Twin Report</title>` +
      `<style>@page{size:A4;margin:11mm}html,body{margin:0;background:#fff;font-family:'Sarabun','Segoe UI',system-ui,-apple-system,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}*{box-sizing:border-box}table{page-break-inside:auto}tr{page-break-inside:avoid}</style>` +
      `</head><body>${node.outerHTML}</body></html>`,
    );
    doc.close();
    // give the iframe a tick to lay out its content, then open the print dialog
    setTimeout(() => {
      const win = iframe.contentWindow;
      if (!win) { iframe.remove(); return; }
      win.focus();
      win.print();
      setTimeout(() => iframe.remove(), 1000);
    }, 350);
  };

  /** Excel export — an .xls (HTML-table flavoured) with a UTF-8 BOM and Tahoma font so Thai
   *  text opens straight in Excel. Only the sections the user kept switched on are written. */
  const downloadExcel = () => {
    const esc = (s: unknown) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const th = (t: string) => `<th style="background:#0e7490;color:#fff;padding:6px 9px;text-align:left;border:1px solid #0b5566">${esc(t)}</th>`;
    const td = (t: unknown) => `<td style="padding:5px 9px;border:1px solid #d8dee6">${esc(t)}</td>`;
    const period = L(REPORT_PERIOD[range]);
    const tbl = "border-collapse:collapse;font-family:Tahoma,sans-serif;font-size:12px";
    let body = `<h2 style="font-family:Tahoma;margin:0 0 4px">${esc(L({ en: "Digital Twin Report", th: "รายงาน Digital Twin" }))}</h2>`;
    body += `<p style="font-family:Tahoma;font-size:12px;color:#475569;margin:0 0 12px">${esc(L({ en: "Plant", th: "โรงงาน" }))}: Bangkok Plant 1 &nbsp;|&nbsp; ${esc(L({ en: "Period", th: "ช่วงเวลา" }))}: ${esc(period)} &nbsp;|&nbsp; Powered by SpareX</p>`;

    if (sec.summary) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "Executive Summary", th: "บทสรุปผู้บริหาร" }))}</h3><table style="${tbl}"><tr>${[L({ en: "Metric", th: "ตัวชี้วัด" }), L({ en: "Value", th: "ค่า" })].map(th).join("")}</tr>`;
      ([
        [L({ en: "Plant OEE", th: "OEE โรงงาน" }), `${PLANT.oee}%`],
        [L({ en: "Avg health", th: "สุขภาพเฉลี่ย" }), `${PLANT.health}/100`],
        [L({ en: "Total power", th: "กำลังไฟรวม" }), `${PLANT.powerKw.toLocaleString()} kW`],
        [L({ en: "CO₂ now", th: "CO₂ ตอนนี้" }), `${PLANT.co2KgH} kg/h`],
        [L({ en: "Burn rate", th: "เงินที่รั่ว" }), `${formatTHB(PLANT.burnHr)}/${L({ en: "hr", th: "ชม." })}`],
        [L({ en: "Assets healthy / warning / critical", th: "เครื่องปกติ / เตือน / วิกฤต" }), `${PLANT.status.healthy} / ${PLANT.status.warning} / ${PLANT.status.critical}`],
      ] as [string, string][]).forEach(([k, v]) => { body += `<tr>${td(k)}${td(v)}</tr>`; });
      body += `</table><br/>`;
    }
    if (sec.roi) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "What the Twin Paid Back", th: "เงินที่ทวินช่วยไว้" }))} — ${esc(L(twinRoi.month))}</h3><table style="${tbl}"><tr>${[L({ en: "Asset", th: "เครื่อง" }), L({ en: "What the twin caught", th: "ทวินจับอะไรได้" }), L({ en: "Hrs avoided", th: "ชม. ที่เลี่ยงได้" }), L({ en: "฿ saved", th: "เงินที่รักษาไว้" })].map(th).join("")}</tr>`;
      twinRoi.catches.forEach((c) => { body += `<tr>${td(c.asset)}${td(L(c.what))}${td(c.hrs)}${td(formatTHB(c.baht))}</tr>`; });
      body += `<tr>${td(L({ en: "Total", th: "รวม" }))}${td("")}${td(twinRoi.avoidedHrs)}${td(formatTHB(twinRoi.avoidedBaht))}</tr></table><br/>`;
    }
    if (sec.findings) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "AI Findings", th: "สิ่งที่ AI เจอ" }))}</h3><table style="${tbl}"><tr>${["#", L({ en: "Finding", th: "สิ่งที่เจอ" }), L({ en: "Detail", th: "รายละเอียด" }), L({ en: "Severity", th: "ระดับ" }), L({ en: "Impact", th: "ผลกระทบ" }), L({ en: "Confidence", th: "ความมั่นใจ" })].map(th).join("")}</tr>`;
      twinAiInsights.forEach((f, i) => { body += `<tr>${td(i + 1)}${td(L(f.title))}${td(L(f.detail))}${td(L(SEV_META[f.severity].label))}${td(L(f.impact))}${td(f.confidence + "%")}</tr>`; });
      body += `</table><br/>`;
    }
    if (sec.actions) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "Automation Status", th: "สถานะระบบอัตโนมัติ" }))}</h3><table style="${tbl}"><tr>${[L({ en: "Action", th: "การทำงาน" }), L({ en: "Detail", th: "รายละเอียด" }), L({ en: "Domain", th: "หมวด" }), L({ en: "Impact", th: "มูลค่า" }), L({ en: "Status", th: "สถานะ" })].map(th).join("")}</tr>`;
      twinActions.forEach((a) => { body += `<tr>${td(a.name)}${td(a.desc)}${td(a.domain)}${td(a.impact)}${td(L(ACT_META[a.status].label))}</tr>`; });
      body += `</table><br/>`;
    }
    if (sec.log) {
      body += `<h3 style="font-family:Tahoma">${esc(L({ en: "Event Log — last 24 h", th: "บันทึกเหตุการณ์ — 24 ชม." }))}</h3><table style="${tbl}"><tr>${[L({ en: "Time", th: "เวลา" }), L({ en: "Event", th: "เหตุการณ์" }), L({ en: "Level", th: "ระดับ" })].map(th).join("")}</tr>`;
      replayEvents.forEach((e) => { body += `<tr>${td(e.time)}${td(L(e.label))}${td(L(TONE_META[e.tone].label))}</tr>`; });
      body += `</table>`;
    }
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Twin Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>${body}</body></html>`;
    const blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `SpareX-Twin-Report-${range}.xls`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[300px_1fr]">
      {/* report builder */}
      <div className="panel space-y-5 p-5 xl:sticky xl:top-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-brand-400/30 bg-brand-400/10 text-brand-300"><SlidersHorizontal size={16} /></span>
          <div><h3 className="text-sm font-semibold text-white">{L({ en: "Build report", th: "สร้างรายงาน" })}</h3><p className="text-[11px] text-white/45">{L({ en: "pick range & sections", th: "เลือกช่วงเวลาและหัวข้อ" })}</p></div>
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-white/40">{L({ en: "Time range", th: "ช่วงเวลา" })}</label>
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
            {(["today", "month"] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)} className={cn("rounded-md px-2 py-1.5 text-[12px] font-medium transition", range === r ? "bg-brand-400/20 text-brand-100" : "text-white/50 hover:text-white/80")}>
                {r === "today" ? L({ en: "Today", th: "วันนี้" }) : L({ en: "This month", th: "เดือนนี้" })}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-white/40">{L({ en: "Sections", th: "หัวข้อในรายงาน" })}</label>
          <div className="mt-2 space-y-1.5">
            {SECTION_DEFS.map((s) => (
              <button key={s.key} onClick={() => setSec((v) => ({ ...v, [s.key]: !v[s.key] }))} className="flex w-full items-center gap-2.5 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2 text-left transition hover:bg-white/[0.04]">
                <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", sec[s.key] ? "bg-brand-400/70" : "bg-white/15")}>
                  <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", sec[s.key] ? "left-[18px]" : "left-0.5")} />
                </span>
                <span className="min-w-0"><span className="block text-[12px] font-medium text-white/80">{L(s.title)}</span><span className="block text-[10.5px] text-white/40">{L(s.sub)}</span></span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-white/10 pt-4">
          <button onClick={printReport} className="btn-glow w-full justify-center py-2.5 text-[13px]"><Printer size={15} /> {L({ en: "Download PDF", th: "ดาวน์โหลด PDF" })}</button>
          <button onClick={downloadExcel} className="btn-ghost w-full justify-center py-2 text-[13px]"><FileSpreadsheet size={15} /> {L({ en: "Download Excel", th: "ดาวน์โหลด Excel" })}</button>
          <p className="text-center text-[10.5px] leading-relaxed text-white/35">{L({ en: "PDF opens your print dialog · Excel is an .xls file", th: "PDF เปิดหน้าต่างพิมพ์ · Excel เป็นไฟล์ .xls" })}</p>
        </div>
      </div>

      {/* live paper preview — identical to the exported PDF */}
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-white/40"><FileText size={13} /> {L({ en: "Live preview — exactly what downloads", th: "ตัวอย่างจริง — ตรงกับไฟล์ที่ดาวน์โหลด" })}</div>
        <div className="overflow-hidden rounded-2xl border border-white/10" style={{ boxShadow: "0 24px 70px rgba(0,0,0,0.45)" }}>
          <ReportPaper ref={reportRef} L={L} range={range} sec={sec} genAt={genAt} />
        </div>
      </div>
    </div>
  );
}
