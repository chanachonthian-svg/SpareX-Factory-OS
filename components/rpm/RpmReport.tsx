"use client";

import { createPortal } from "react-dom";
import { X, Printer, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useBrand } from "@/lib/brand";
import { assetById } from "@/lib/factory";
import {
  isoZone, rpmFleet, diagnoses, reliability, failurePareto, roiProof, thbCompact, riskTHB,
  reportTemplates, type IsoZone, type LZ,
} from "@/lib/rpm";

export type ReportType = "condition" | "reliability" | "roi" | "board";
type Tr = (o: LZ) => string;

/* document palette — fixed light-paper colors so it looks the same on screen & in print */
const INK = "#1a2233", SUB = "#5b6472", FAINT = "#94a3b8", LINE = "#e6e9ef", CARD = "#f6f8fb";
const ZINK: Record<IsoZone, string> = { A: "#047857", B: "#0e7490", C: "#b45309", D: "#be123c" };
const ZTINT: Record<IsoZone, string> = { A: "#e7f6f0", B: "#e2f2f6", C: "#fbf0e2", D: "#fbe9ee" };

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ background: CARD, borderRadius: 10, padding: "10px 12px" }}>
      <p style={{ margin: 0, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: FAINT }}>{label}</p>
      <p style={{ margin: "3px 0 0", fontSize: 20, fontWeight: 600, color: tone ?? INK }} className="tabular">{value}</p>
    </div>
  );
}
function ZoneTag({ z }: { z: IsoZone }) {
  return <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 5, color: ZINK[z], background: ZTINT[z] }}>{z}</span>;
}
function SecTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: INK, textTransform: "uppercase", letterSpacing: "0.08em", borderLeft: "3px solid #0e7490", paddingLeft: 8 }}>{children}</h3>;
}
const th = { textAlign: "left" as const, fontSize: 10.5, textTransform: "uppercase" as const, letterSpacing: "0.04em", color: FAINT, fontWeight: 500, padding: "0 10px 6px" };
const td = { fontSize: 12.5, color: INK, padding: "7px 10px", borderTop: `1px solid ${LINE}` };

/* ── report bodies ─────────────────────────────────────────────────────────── */
function ConditionBody({ L }: { L: Tr }) {
  const ranked = [...rpmFleet].sort((a, b) => b.vibration - a.vibration);
  const alerts = rpmFleet.filter((a) => a.vibration >= 2.8).length;
  const avg = Math.round((rpmFleet.reduce((s, a) => s + a.vibration, 0) / rpmFleet.length) * 10) / 10;
  const cd = rpmFleet.filter((a) => ["C", "D"].includes(isoZone(a.vibration))).length;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 22 }}>
        <Stat label={L({ en: "Monitored", th: "มอนิเตอร์" })} value={`${rpmFleet.length}`} />
        <Stat label={L({ en: "Alerts", th: "แจ้งเตือน" })} value={`${alerts}`} tone="#b45309" />
        <Stat label={L({ en: "Avg vibration", th: "สั่นเฉลี่ย" })} value={`${avg} mm/s`} />
        <Stat label={L({ en: "In zone C/D", th: "โซน C/D" })} value={`${cd}`} tone="#be123c" />
      </div>
      <SecTitle>{L({ en: "Fleet condition register", th: "ทะเบียนสภาพเครื่องหมุน" })}</SecTitle>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>
          <th style={th}>{L({ en: "Asset", th: "เครื่อง" })}</th><th style={th}>{L({ en: "ISO", th: "ISO" })}</th>
          <th style={th}>{L({ en: "Vibration", th: "ความสั่น" })}</th><th style={th}>{L({ en: "Failure mode", th: "ชนิดความเสียหาย" })}</th>
          <th style={{ ...th, textAlign: "right" }}>{L({ en: "฿ at risk", th: "฿ ที่เสี่ยง" })}</th>
        </tr></thead>
        <tbody>{ranked.map((a) => { const z = isoZone(a.vibration); const dg = diagnoses.find((d) => d.assetId === a.id); return (
          <tr key={a.id}>
            <td style={td}><span style={{ fontWeight: 600 }}>{a.name}</span><span style={{ color: SUB }}> · {a.type}</span></td>
            <td style={td}><ZoneTag z={z} /></td>
            <td style={{ ...td, color: ZINK[z], fontWeight: 600 }} className="tabular">{a.vibration} mm/s</td>
            <td style={{ ...td, color: dg ? "#be123c" : FAINT }}>{dg ? L(dg.fault) : L({ en: "—", th: "—" })}</td>
            <td style={{ ...td, textAlign: "right", fontWeight: 600, color: dg ? "#be123c" : SUB }} className="tabular">{thbCompact(riskTHB(a))}</td>
          </tr>
        ); })}</tbody>
      </table>
      <p style={{ marginTop: 12, fontSize: 11, color: FAINT }}>{L({ en: "Severity per ISO 10816: A good · B acceptable · C watch · D act now.", th: "ระดับความรุนแรงตาม ISO 10816: A ดี · B รับได้ · C เฝ้าระวัง · D ต้องทำ" })}</p>
    </>
  );
}
function ReliabilityBody({ L }: { L: Tr }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 22 }}>
        <Stat label="MTBF" value={`${reliability.mtbfDays} ${L({ en: "days", th: "วัน" })}`} />
        <Stat label="MTTR" value={`${reliability.mttrHours} h`} />
        <Stat label={L({ en: "Availability", th: "ความพร้อมใช้" })} value={`${reliability.availabilityPct}%`} tone="#047857" />
      </div>
      <SecTitle>{L({ en: "Failure Pareto — cost by root mode", th: "Pareto ความเสียหาย — ต้นทุนตามต้นเหตุ" })}</SecTitle>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={th}>{L({ en: "Failure mode", th: "ชนิดความเสียหาย" })}</th><th style={th}>{L({ en: "Events", th: "จำนวนครั้ง" })}</th><th style={{ ...th, width: "45%" }}>{L({ en: "Share of cost", th: "สัดส่วนต้นทุน" })}</th></tr></thead>
        <tbody>{failurePareto.map((f) => (
          <tr key={f.mode.en}>
            <td style={{ ...td, fontWeight: 600 }}>{L(f.mode)}</td>
            <td style={td} className="tabular">{f.count}</td>
            <td style={td}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1, height: 8, background: LINE, borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: `${f.costShare}%`, background: "#d85a30", borderRadius: 4 }} /></div><span className="tabular" style={{ fontSize: 12, fontWeight: 600 }}>{f.costShare}%</span></div></td>
          </tr>
        ))}</tbody>
      </table>
    </>
  );
}
function RoiBody({ L }: { L: Tr }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 22 }}>
        <Stat label={L({ en: "Prevented", th: "กันพังได้" })} value={`${roiProof.caughtEarly}`} />
        <Stat label={L({ en: "Saved", th: "ประหยัด" })} value={thbCompact(roiProof.savedTHB)} tone="#047857" />
        <Stat label={L({ en: "Downtime avoided", th: "เลี่ยงดาวน์ไทม์" })} value={`${roiProof.downtimeHoursAvoided} h`} />
        <Stat label={L({ en: "Unplanned", th: "ไม่วางแผน" })} value={`−${roiProof.unplannedReductionPct}%`} tone="#047857" />
      </div>
      <SecTitle>{L({ en: "Failures caught early — ฿ impact", th: "งานที่จับก่อนพัง — ผลกระทบ ฿" })}</SecTitle>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={th}>{L({ en: "Machine", th: "เครื่อง" })}</th><th style={th}>{L({ en: "Fault", th: "ความเสียหาย" })}</th><th style={{ ...th, textAlign: "right" }}>{L({ en: "Run-to-fail", th: "ปล่อยจนพัง" })}</th><th style={{ ...th, textAlign: "right" }}>{L({ en: "Fixed for", th: "ซ่อมด้วย" })}</th><th style={{ ...th, textAlign: "right" }}>{L({ en: "Saved", th: "ประหยัด" })}</th></tr></thead>
        <tbody>{diagnoses.map((d) => { const a = assetById(d.assetId)!; return (
          <tr key={d.assetId}>
            <td style={{ ...td, fontWeight: 600 }}>{a.name}</td>
            <td style={{ ...td, color: SUB }}>{L(d.fault)}</td>
            <td style={{ ...td, textAlign: "right", color: "#be123c" }} className="tabular">{thbCompact(d.runToFailure)}</td>
            <td style={{ ...td, textAlign: "right" }} className="tabular">{thbCompact(d.fixNow)}</td>
            <td style={{ ...td, textAlign: "right", fontWeight: 600, color: "#047857" }} className="tabular">{thbCompact(d.runToFailure - d.fixNow)}</td>
          </tr>
        ); })}</tbody>
      </table>
    </>
  );
}
function BoardBody({ L }: { L: Tr }) {
  const avg = Math.round(rpmFleet.reduce((s, a) => s + a.health, 0) / rpmFleet.length);
  const atRisk = diagnoses.reduce((s, d) => s + d.runToFailure, 0);
  const top = [...rpmFleet].filter((a) => ["C", "D"].includes(isoZone(a.vibration))).sort((a, b) => riskTHB(b) - riskTHB(a)).slice(0, 3);
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: 14, background: CARD, borderRadius: 10 }}>
        <div style={{ textAlign: "center" }}><p style={{ margin: 0, fontSize: 34, fontWeight: 700, color: avg >= 85 ? "#047857" : avg >= 70 ? "#b45309" : "#be123c" }} className="tabular">{avg}</p><p style={{ margin: 0, fontSize: 10, color: FAINT }}>/ 100</p></div>
        <div><p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: INK }}>{L({ en: "Rotating fleet health", th: "สุขภาพเครื่องหมุนโดยรวม" })}</p><p style={{ margin: "2px 0 0", fontSize: 12, color: SUB }}>{L({ en: "8 rotating machines · availability", th: "เครื่องหมุน 8 ตัว · ความพร้อมใช้" })} {reliability.availabilityPct}%</p></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 22 }}>
        <Stat label="MTBF" value={`${reliability.mtbfDays}d`} />
        <Stat label={L({ en: "Saved (Q)", th: "ประหยัด (ไตรมาส)" })} value={thbCompact(roiProof.savedTHB)} tone="#047857" />
        <Stat label={L({ en: "At risk now", th: "เสี่ยงตอนนี้" })} value={thbCompact(atRisk)} tone="#be123c" />
        <Stat label={L({ en: "Prevented", th: "กันพังได้" })} value={`${roiProof.caughtEarly}`} />
      </div>
      <SecTitle>{L({ en: "Top risks — act this week", th: "ความเสี่ยงสูงสุด — แตะสัปดาห์นี้" })}</SecTitle>
      {top.map((a) => { const z = isoZone(a.vibration); const dg = diagnoses.find((d) => d.assetId === a.id); return (
        <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${LINE}` }}>
          <ZoneTag z={z} />
          <div style={{ flex: 1 }}><span style={{ fontSize: 13, fontWeight: 600, color: INK }}>{a.name}</span>{dg ? <span style={{ fontSize: 12, color: SUB }}> · {L(dg.fault)}</span> : null}</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#be123c" }} className="tabular">{thbCompact(riskTHB(a))}</span>
        </div>
      ); })}
      <p style={{ marginTop: 16, padding: 10, background: "#e7f6f0", borderRadius: 8, fontSize: 12, color: "#065f46" }}>{L({ en: `Predictive maintenance prevented ${roiProof.caughtEarly} failures this quarter and saved ${thbCompact(roiProof.savedTHB)} versus run-to-failure.`, th: `งานบำรุงเชิงพยากรณ์กันความเสียหายได้ ${roiProof.caughtEarly} ครั้งไตรมาสนี้ และประหยัด ${thbCompact(roiProof.savedTHB)} เทียบกับปล่อยจนพัง` })}</p>
    </>
  );
}

/* ── modal (preview + print to PDF) ────────────────────────────────────────── */
export function RpmReport({ type, dateStr, onClose }: { type: ReportType; dateStr: string; onClose: () => void }) {
  const { locale } = useI18n();
  const L: Tr = (o) => (locale === "th" ? o.th : o.en);
  const brand = useBrand();
  const tpl = reportTemplates.find((r) => r.id === type)!;
  const Body = type === "condition" ? ConditionBody : type === "reliability" ? ReliabilityBody : type === "roi" ? RoiBody : BoardBody;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col bg-ink-950/85 backdrop-blur-sm">
      <div className="no-print flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <p className="text-sm font-semibold text-white/90">{L(tpl.name)} · {L({ en: "preview", th: "ตัวอย่าง" })}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn-glow px-3.5 py-2 text-sm"><Printer size={15} /> {L({ en: "Save as PDF", th: "บันทึกเป็น PDF" })}</button>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-white/12 bg-white/5 text-white/60 transition hover:bg-white/10"><X size={16} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="report-sheet mx-auto max-w-[820px] rounded-lg p-9 shadow-2xl" style={{ background: "#ffffff", color: INK }}>
          {/* accent bar */}
          <div style={{ height: 5, borderRadius: 3, background: "linear-gradient(90deg,#22d3ee,#6366f1)", marginBottom: 22 }} />

          {/* letterhead */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, paddingBottom: 18, borderBottom: `1.5px solid ${LINE}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {brand.logo
                ? <img src={brand.logo} alt="" style={{ height: 46, width: "auto", maxWidth: 160, objectFit: "contain" }} />
                : <div style={{ height: 46, width: 46, borderRadius: 10, background: "#0e7490", color: "#fff", display: "grid", placeItems: "center", fontSize: 20, fontWeight: 700 }}>{brand.companyName.trim().charAt(0).toUpperCase() || "F"}</div>}
              <div>
                <p style={{ margin: 0, fontSize: 19, fontWeight: 700, color: INK }}>{brand.companyName}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: SUB }}>{L(tpl.name)}</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#0e7490" }}>RPM INTELLIGENCE™</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: FAINT }}>{dateStr} · Bangkok Plant 1</p>
              <p style={{ margin: "1px 0 0", fontSize: 11, color: FAINT }}>{L({ en: "Powered by SpareX FactoryOS", th: "ขับเคลื่อนโดย SpareX FactoryOS" })}</p>
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <p style={{ margin: "0 0 18px", fontSize: 12.5, color: SUB }}>{L(tpl.desc)}</p>
            <Body L={L} />
          </div>

          {/* footer */}
          <div style={{ marginTop: 28, paddingTop: 14, borderTop: `1.5px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ margin: 0, fontSize: 10.5, color: FAINT }}>{L({ en: "Generated by", th: "สร้างโดย" })} SpareX FactoryOS AI · {dateStr} · {L({ en: "Confidential", th: "เป็นความลับ" })}</p>
            <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "#047857" }}><ShieldCheck size={12} /> {L({ en: "Data traceable to installed sensors", th: "ข้อมูลตรวจสอบย้อนถึงเซนเซอร์ที่ติดตั้ง" })}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
