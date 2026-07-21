"use client";

import { useState, useMemo, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Leaf, Sprout, TreePine, Globe2, Recycle, Sun, Factory, Zap, Flame, Truck,
  Gauge, Target, TrendingDown, TrendingUp, Award, BadgeCheck, ShieldCheck,
  FileText, Download, Plus, Check, Car, House, Plane,
  Eye, ExternalLink, FileDown, Database,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { WorkflowBar } from "@/components/os/WorkflowNav";
import { KpiCard } from "@/components/os/KpiCard";
import { StackedBars, HBars, MultiLine } from "@/components/os/charts";
import { createWorkOrder, useWorkOrders } from "@/lib/workorders";
import { cn } from "@/lib/utils";
import {
  type CZ, kpi, sparks, reportPeriod, emissionsTrend, bySource, scope3, scope2Dual, scope1Categories, activityData,
  glidepath, target2030, hotspots, macc, products, credits, abatedYtd, equivalents,
  standards, baht, decouplingTrend, creditPipeline, cbamExposure,
} from "@/lib/carbon";
import { DigitalTwin } from "@/components/twin/DigitalTwin";
import {
  enms, energyPolicy, energySources, seus, enpis, enpiTrend, actionPlans, mv,
  managementReview, enmsStandards,
} from "@/lib/iso50001";

const ECO = "#34d399";
const SCOPE = { s1: "#f59e0b", s2: "#22d3ee", s3: "#a78bfa" };

export function CarbonSuite() {
  const { locale } = useI18n();
  const L = (o: CZ) => (locale === "th" ? o.th : o.en);
  const [step, setStep] = useState(0);

  return (
    <div className="space-y-6">
      <EcoHero L={L} locale={locale} />

      {/* 5-step FactoryOS workflow: 01 Monitor · 02 Insight · 03 AI Analysis · 04 AI Recommendation & Action · 05 Report */}
      <WorkflowBar step={step} setStep={setStep} L={L} />

      {step === 0 && <MonitorTab L={L} />}
      {step === 1 && <OverviewTab L={L} />}
      {step === 2 && <AnalyzeTab L={L} />}
      {step === 3 && <ActTab L={L} locale={locale} />}
      {step === 4 && <ReportTab L={L} locale={locale} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── eco hero ── */

function EcoHero({ L, locale }: { L: (o: CZ) => string; locale: string }) {
  return (
    <section className="panel relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-8 -top-10 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" />
      <EcoEmblem className="pointer-events-none absolute -right-6 top-1/2 hidden -translate-y-1/2 opacity-70 md:block" />
      <div className="relative flex flex-wrap items-start gap-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-emerald-400/40 bg-emerald-400/10 text-emerald-300">
          <Leaf size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/70">{L({ en: "Carbon Intelligence Suite · ESG you can audit", th: "Carbon Intelligence Suite · ESG ที่ตรวจสอบได้จริง" })}</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">Sustainability Intelligence<span className="text-sm text-emerald-300">™</span></h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">{L({ en: "Real-time Scope 1·2·3 accounting, product carbon footprint, and audit-ready ESG reporting — with an AI roadmap that turns emissions into ranked reduction projects and verified carbon credits.", th: "บัญชีคาร์บอน Scope 1·2·3 เรียลไทม์, คาร์บอนต่อสินค้า และรายงาน ESG พร้อมตรวจสอบ — พร้อม AI ที่เปลี่ยนการปล่อยคาร์บอนเป็นโครงการลดที่จัดอันดับแล้ว และคาร์บอนเครดิตที่รับรองได้" })}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-3xl font-semibold tabular text-emerald-300">{kpi.traceability}%</p>
            <p className="text-[11px] uppercase tracking-wider text-white/40">{L({ en: "ESG traceability", th: "ตรวจสอบย้อนกลับได้" })}</p>
          </div>
          <button onClick={() => printReport(buildReportHtml(locale))} className="btn-glow px-3.5 py-2 text-sm">
            <FileDown size={14} /> {L({ en: "PDF report", th: "รายงาน PDF" })}
          </button>
        </div>
      </div>
    </section>
  );
}

function EcoEmblem({ className }: { className?: string }) {
  return (
    <svg width="240" height="240" viewBox="0 0 240 240" fill="none" className={className} aria-hidden>
      <defs>
        <radialGradient id="ecoG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="118" fill="url(#ecoG)" />
      {[46, 66, 86, 106].map((r) => (
        <circle key={r} cx="120" cy="120" r={r} stroke="#34d399" strokeOpacity="0.18" strokeWidth="1.5" strokeDasharray="3 5" />
      ))}
      <path d="M120 74c26 8 40 30 38 56-26-4-46-24-46-52 0-1 3-4 8-4z" fill="#34d399" fillOpacity="0.55" />
      <path d="M120 74c-26 8-40 30-38 56 26-4 46-24 46-52 0-1-3-4-8-4z" fill="#22c55e" fillOpacity="0.4" />
      <line x1="120" y1="150" x2="120" y2="86" stroke="#065f46" strokeOpacity="0.5" strokeWidth="2" />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────── overview ── */

function OverviewTab({ L }: { L: (o: CZ) => string }) {
  const eq = equivalents(abatedYtd);
  const creditValue = credits.earnedYtd * credits.bahtPerCredit;
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={L({ en: "Scope 1 · MTD", th: "Scope 1 · เดือนนี้" })} value={`${kpi.scope1}`} unit="tCO₂e" delta="-9%" deltaGood accent={SCOPE.s1} spark={sparks.scope1} icon={Flame} />
        <KpiCard label={L({ en: "Scope 2 · MTD", th: "Scope 2 · เดือนนี้" })} value={`${kpi.scope2}`} unit="tCO₂e" delta="-18%" deltaGood accent={SCOPE.s2} spark={sparks.scope2} icon={Zap} />
        <KpiCard label={L({ en: "Scope 3 · MTD", th: "Scope 3 · เดือนนี้" })} value={`${kpi.scope3.toLocaleString()}`} unit="tCO₂e" delta="-4%" deltaGood accent={SCOPE.s3} spark={sparks.scope3} icon={Truck} />
        <KpiCard label={L({ en: "Carbon intensity", th: "ความเข้มคาร์บอน" })} value={`${kpi.intensity}`} unit="kg/u" delta="-12%" deltaGood accent={ECO} spark={sparks.intensity} icon={Gauge} />
      </section>

      {/* carbon-credit spotlight — the headline promise */}
      <section className="panel relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <span className="chip border-emerald-400/30 bg-emerald-400/10 text-emerald-300"><Award size={13} /> {L({ en: "Carbon credits", th: "คาร์บอนเครดิต" })} · {credits.registry}</span>
            <h3 className="mt-3 text-lg font-semibold">{L({ en: "Run on SpareX → Your Carbon Credits Grow", th: "ใช้ SpareX แล้ว คาร์บอนเครดิตเพิ่มขึ้น" })}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/60">{L({ en: "Every verified tonne you abate becomes a registrable T-VER credit. SpareX finds, executes and measures more reductions — so you register far more credits than business-as-usual.", th: "ทุกตันที่ลดได้และรับรองแล้ว = เครดิต T-VER ที่ขึ้นทะเบียนได้ SpareX ช่วยหา ลงมือ และวัดผลได้มากกว่าเดิม คุณจึงได้เครดิตมากกว่าการทำแบบเดิมมาก" })}</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Metric big={`${credits.earnedYtd.toLocaleString()}`} unit="tCO₂e" sub={L({ en: "Credits YTD", th: "เครดิตสะสมปีนี้" })} accent={ECO} />
              <Metric big={baht(creditValue)} sub={L({ en: "Credit value", th: "มูลค่าเครดิต" })} accent="#4ade80" />
              <Metric big={`+${credits.upliftPct}%`} sub={L({ en: "vs. baseline", th: "เทียบไม่ใช้ระบบ" })} accent="#22d3ee" up />
            </div>
          </div>
          <div>
            <MultiLine
              data={credits.series}
              height={220}
              lines={[
                { key: "sparex", color: ECO, name: L({ en: "With SpareX", th: "ใช้ SpareX" }) },
                { key: "baseline", color: "#64748b", name: L({ en: "Baseline", th: "ไม่ใช้ระบบ" }), dashed: true },
              ]}
            />
            <div className="mt-1 flex items-center justify-center gap-4 text-[11px]">
              <Legend color={ECO} label={L({ en: "With SpareX", th: "ใช้ SpareX" })} />
              <Legend color="#64748b" label={L({ en: "Baseline", th: "ไม่ใช้ระบบ" })} dashed />
              <span className="text-white/35">{L({ en: "cumulative credits · e = forecast", th: "เครดิตสะสม · e = คาดการณ์" })}</span>
            </div>
          </div>
        </div>
      </section>

      {/* credit pipeline + decoupling — the two "so what" reads investors ask for */}
      <section className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <Card title={L({ en: "Credit Pipeline", th: "เครดิตอยู่ขั้นไหนแล้ว" })} sub={L({ en: "How far each verified tonne is from sellable", th: "แต่ละตันห่างจากขายได้อีกกี่ขั้น" })}>
          <div className="space-y-3">
            {creditPipeline.map((p, i) => {
              const max = Math.max(...creditPipeline.map((x) => x.tco2e));
              return (
                <div key={p.stage.en}>
                  <div className="flex items-baseline justify-between text-[12px]">
                    <span className="font-medium text-white/75">{L(p.stage)}</span>
                    <span className="tabular font-semibold" style={{ color: i === 0 ? ECO : "#94a3b8" }}>{p.tco2e.toLocaleString()} tCO₂e</span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full" style={{ width: `${(p.tco2e / max) * 100}%`, backgroundColor: i === 0 ? ECO : i === 1 ? "#22d3ee" : "#64748b" }} />
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-white/40">{L(p.note)}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-[12px] text-emerald-200">
            {L({
              en: `Issued credits worth ${baht(creditPipeline[0].tco2e * credits.bahtPerCredit)} · ${(creditPipeline[1].tco2e + creditPipeline[2].tco2e).toLocaleString()} tCO₂e more in the pipe`,
              th: `เครดิตที่ออกแล้วมูลค่า ${baht(creditPipeline[0].tco2e * credits.bahtPerCredit)} · รออีก ${(creditPipeline[1].tco2e + creditPipeline[2].tco2e).toLocaleString()} tCO₂e ในไปป์ไลน์`,
            })}
          </p>
        </Card>
        <Card title={L({ en: "Growth–Carbon Decoupling", th: "โตขึ้นแต่คาร์บอนลด" })} sub={L({ en: "Output climbs while emissions fall — growth ≠ carbon", th: "ผลผลิตขึ้น การปล่อยลง — พิสูจน์ว่าโตได้โดยไม่เพิ่มคาร์บอน" })}>
          <MultiLine
            data={decouplingTrend}
            height={210}
            lines={[
              { key: "output", color: "#22d3ee", name: L({ en: "Output (index)", th: "ผลผลิต (ดัชนี)" }) },
              { key: "emissions", color: ECO, name: L({ en: "Emissions (index)", th: "การปล่อย (ดัชนี)" }) },
            ]}
          />
          <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px]">
            <Legend color="#22d3ee" label={L({ en: "Output (Jan = 100)", th: "ผลผลิต (ม.ค. = 100)" })} />
            <Legend color={ECO} label={L({ en: "Emissions (Jan = 100)", th: "การปล่อย (ม.ค. = 100)" })} />
            <span className="ml-auto text-white/50">
              {L({
                en: `+${decouplingTrend[decouplingTrend.length - 1].output - 100}% output · −${100 - decouplingTrend[decouplingTrend.length - 1].emissions}% carbon since Jan`,
                th: `ตั้งแต่ ม.ค.: ผลผลิต +${decouplingTrend[decouplingTrend.length - 1].output - 100}% · คาร์บอน −${100 - decouplingTrend[decouplingTrend.length - 1].emissions}%`,
              })}
            </span>
          </div>
        </Card>
      </section>

      {/* product carbon footprint — the number EU customers actually ask for */}
      <Card title={L({ en: "Product Carbon Footprint", th: "คาร์บอนต่อชิ้นสินค้า (PCF)" })} sub={L({ en: "Which product carries the most carbon per unit", th: "สินค้าไหนแบกคาร์บอนต่อชิ้นสูงสุด — ตัวเลขที่ลูกค้า EU ขอ" })}>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {[...products].sort((a, b) => b.kg - a.kg).map((p) => (
            <div key={p.sku} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-medium">{L(p.name)}</p>
                  {p.cbam ? <span className="chip border-amber-400/30 bg-amber-400/10 text-[10px] text-amber-300">CBAM</span> : null}
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-white/35">{p.sku} · {L({ en: "market", th: "ตลาด" })}: {L(p.market)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="tabular text-lg font-semibold" style={{ color: p.kg >= 5 ? "#f59e0b" : ECO }}>{p.kg.toFixed(2)}</p>
                <p className="text-[10px] text-white/40">kgCO₂e/{L({ en: "unit", th: "ชิ้น" })}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-white/40">
          {L({ en: "Cradle-to-gate · energy + materials allocated per unit from the same meters as Scope 1·2", th: "แบบ cradle-to-gate · ปันส่วนพลังงาน + วัตถุดิบต่อชิ้น จากมิเตอร์ชุดเดียวกับ Scope 1·2" })}
        </p>
      </Card>

      {/* real-world impact */}
      <section className="panel relative overflow-hidden p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"><Globe2 size={20} /></span>
          <div>
            <h3 className="font-semibold">{L({ en: "What Your Reductions Mean for the Planet", th: "สิ่งที่การลดคาร์บอนของคุณช่วยโลก" })}</h3>
            <p className="text-xs text-white/45">{L({ en: `${abatedYtd.toLocaleString()} tCO₂e abated year-to-date · equivalent to`, th: `ลดได้ ${abatedYtd.toLocaleString()} tCO₂e ปีนี้ · เทียบเท่ากับ` })}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <EquivCard icon={TreePine} value={eq.trees.toLocaleString()} label={L({ en: "trees planted (1 yr)", th: "ต้นไม้ที่ปลูก (1 ปี)" })} />
          <EquivCard icon={Car} value={eq.cars.toLocaleString()} label={L({ en: "cars off the road (1 yr)", th: "รถที่หายไปจากถนน (1 ปี)" })} />
          <EquivCard icon={House} value={eq.homes.toLocaleString()} label={L({ en: "homes powered (1 yr)", th: "บ้านที่ใช้ไฟได้ (1 ปี)" })} />
          <EquivCard icon={Plane} value={eq.flights.toLocaleString()} label={L({ en: "long-haul flights", th: "เที่ยวบินไกล" })} />
        </div>
      </section>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── monitor ── */

/** A muted "where this number comes from" line — shows customers the data provenance
 *  (in a live deployment these are real meters / ERP feeds; in the demo they're mocked). */
function SourceNote({ L, note }: { L: (o: CZ) => string; note: CZ }) {
  return (
    <p className="mt-3 flex items-start gap-1.5 border-t border-white/8 pt-2.5 text-[10.5px] leading-snug text-white/40">
      <Database size={11} className="mt-0.5 shrink-0 text-emerald-300/70" />
      <span><span className="font-medium text-white/50">{L({ en: "Source", th: "แหล่งข้อมูล" })}:</span> {L(note)}</span>
    </p>
  );
}

function MonitorTab({ L }: { L: (o: CZ) => string }) {
  const src = bySource.map((s) => ({ name: `${L(s.name)} (Scope ${s.scope})`, value: s.value }));
  const s3 = scope3.map((s) => ({ name: L(s.name), value: s.value }));
  return (
    <div className="space-y-6">
      {/* the same live 3D plant as Digital Twin, opened on the carbon layer —
          emissions stop being a spreadsheet and become a place on the floor */}
      <Card
        title={L({ en: "Carbon Twin · Live 3D", th: "Carbon Twin · แผนที่ 3D เรียลไทม์" })}
        sub={L({ en: "Where CO₂ leaves the plant, machine by machine", th: "คาร์บอนออกจากตรงไหน ดูเป็นรายเครื่องบนผังโรงงาน" })}
      >
        <DigitalTwin defaultLayer="carbon" layers={["carbon", "energy", "cost"]} showInspector={false} height="h-[380px] sm:h-[460px]" />
      </Card>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card title={L({ en: "Emissions Trend", th: "แนวโน้มการปล่อย" })} sub={L({ en: "Is total carbon trending down · Scope 1·2·3", th: "คาร์บอนรวมลดลงไหม · Scope 1·2·3" })} right={<span className="chip text-emerald-300">-8% YoY</span>}>
          <StackedBars
            data={emissionsTrend}
            height={280}
            bars={[
              { key: "scope1", color: SCOPE.s1, name: "Scope 1" },
              { key: "scope2", color: SCOPE.s2, name: "Scope 2" },
              { key: "scope3", color: SCOPE.s3, name: "Scope 3" },
            ]}
          />
          <div className="mt-2 flex items-center gap-4 text-[11px]">
            <Legend color={SCOPE.s1} label="Scope 1" /><Legend color={SCOPE.s2} label="Scope 2" /><Legend color={SCOPE.s3} label="Scope 3" />
          </div>
          <SourceNote L={L} note={{ en: "fuel meters + PM power meters + ERP — each × its TGO emission factor", th: "มิเตอร์เชื้อเพลิง + มิเตอร์ไฟ PM + ERP — แต่ละตัวคูณ emission factor (TGO)" }} />
        </Card>
        <Card title={L({ en: "Emissions by Source", th: "แหล่งปล่อย" })} sub={L({ en: "Which processes emit the most", th: "กระบวนการไหนปล่อยมากสุด" })}>
          <HBars data={src} color={ECO} />
          <SourceNote L={L} note={{ en: "per-point meters & fuel logs, tagged to each process", th: "มิเตอร์รายจุด & บันทึกเชื้อเพลิง แท็กตามแต่ละกระบวนการ" }} />
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card title="Scope 1" sub={L({ en: "Direct emissions · combustion & fugitive", th: "การปล่อยตรง · เผาไหม้ & รั่วไหล" })}>
          <div className="flex items-baseline gap-1.5"><p className="tabular text-3xl font-semibold" style={{ color: SCOPE.s1 }}>{kpi.scope1}</p><span className="text-sm text-white/40">tCO₂e</span></div>
          <p className="text-[11px] text-white/45">{L({ en: "month-to-date · your own combustion", th: "เดือนนี้ · เผาไหม้ในโรงงานเอง" })}</p>
          <p className="mt-4 mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">{L({ en: "By GHG category", th: "แยกตามหมวด GHG" })}</p>
          <HBars data={scope1Categories.map((c) => ({ name: L(c.name), value: c.value }))} color={SCOPE.s1} height={0} />
          <p className="mt-4 mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">{L({ en: "Activity data · MTD", th: "ปริมาณที่วัดได้จริง · เดือนนี้" })}</p>
          <div className="space-y-1.5">
            {activityData.scope1.map((a) => (
              <div key={a.name.en} className="flex items-baseline justify-between gap-3 text-[12px]">
                <span className="text-white/55">{L(a.name)}</span>
                <span className="tabular shrink-0 font-medium text-white/75">{a.qty} <span className="text-[10px] font-normal text-white/40">{a.unit}</span></span>
              </div>
            ))}
          </div>
          <SourceNote L={L} note={{ en: "fuel/steam meters + refrigerant logs · × TGO combustion factors", th: "มิเตอร์เชื้อเพลิง/ไอน้ำ + บันทึกสารทำความเย็น · × แฟกเตอร์เผาไหม้ (TGO)" }} />
        </Card>
        <Card title="Scope 2" sub={L({ en: "Market vs Location · GHG Protocol dual reporting", th: "market vs location · รายงานคู่ตาม GHG Protocol" })}>
          <div className="grid grid-cols-2 gap-3">
            <Metric big={`${scope2Dual.locationBased}`} unit="tCO₂e" sub={L({ en: "Location-based", th: "อิงค่าเฉลี่ยกริด" })} accent="#94a3b8" />
            <Metric big={`${scope2Dual.marketBased}`} unit="tCO₂e" sub={L({ en: "Market-based", th: "หลังหักพลังงานสะอาด" })} accent={ECO} down />
          </div>
          <p className="mt-4 mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">{L({ en: "Electricity mix", th: "สัดส่วนพลังงานไฟฟ้า" })}</p>
          <div className="flex h-3 overflow-hidden rounded-full">
            {scope2Dual.mix.map((m) => <div key={m.name.en} style={{ width: `${m.value}%`, backgroundColor: m.color }} title={`${L(m.name)} ${m.value}%`} />)}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
            {scope2Dual.mix.map((m) => <Legend key={m.name.en} color={m.color} label={`${L(m.name)} ${m.value}%`} />)}
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1.5 text-[12px] text-emerald-200">
            <Sun size={13} /> {scope2Dual.renewablePct}% {L({ en: "renewable electricity (RE100 track)", th: "พลังงานสะอาด (เส้นทาง RE100)" })}
          </div>
          <p className="mt-4 mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">{L({ en: "Activity data · MTD", th: "ปริมาณที่วัดได้จริง · เดือนนี้" })}</p>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="text-white/55">{L({ en: "Electricity consumed", th: "ไฟฟ้าที่ใช้" })}</span>
              <span className="tabular shrink-0 font-medium text-white/75">{activityData.scope2.mwh} <span className="text-[10px] font-normal text-white/40">MWh</span></span>
            </div>
            <div className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="text-white/55">{L({ en: "Grid emission factor", th: "แฟกเตอร์กริดไฟฟ้า" })}</span>
              <span className="tabular shrink-0 font-medium text-white/75">{activityData.scope2.gridFactor} <span className="text-[10px] font-normal text-white/40">kgCO₂e/kWh · {activityData.scope2.factorSource}</span></span>
            </div>
          </div>
          <SourceNote L={L} note={{ en: "the same PM power meters as Energy Intelligence + grid factor · PPA/I-REC certificates for market-based", th: "มิเตอร์ไฟ PM ตัวเดียวกับ Energy Intelligence + grid factor · ใบ PPA/I-REC สำหรับ market-based" }} />
        </Card>
        <Card title="Scope 3" sub={L({ en: "Carbon across your supply chain · CSRD / ISSB disclosable", th: "คาร์บอนจากซัพพลายเชน · เปิดเผยตาม CSRD / ISSB" })}>
          <HBars data={s3} color={SCOPE.s3} />
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-violet-400/25 bg-violet-400/10 px-2.5 py-1.5 text-[12px] text-violet-200">
            <BadgeCheck size={13} /> {L({ en: `${activityData.scope3Coverage.measured} of ${activityData.scope3Coverage.total} GHG categories measured · ${activityData.scope3Coverage.spendPct}% of spend`, th: `วัดแล้ว ${activityData.scope3Coverage.measured} จาก ${activityData.scope3Coverage.total} หมวด GHG · ครอบคลุม ${activityData.scope3Coverage.spendPct}% ของยอดจัดซื้อ` })}
          </div>
          <SourceNote L={L} note={{ en: "ERP / procurement + logistics records · spend- & activity-based factors", th: "ERP/จัดซื้อ + บันทึกขนส่ง · แฟกเตอร์แบบ spend & activity" }} />
        </Card>
      </section>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── analyze ── */

function AnalyzeTab({ L }: { L: (o: CZ) => string }) {
  const ahead = target2030.tco2e - glidepath[glidepath.length - 1].forecast!; // +ve = ahead of target
  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card title={L({ en: "Net-Zero Glidepath", th: "เส้นทางสู่ Net-Zero" })} sub={L({ en: `SBTi · Science-based target: -${target2030.reductionPct}% by 2030`, th: `SBTi · เป้าตามหลักวิทยาศาสตร์: ลด ${target2030.reductionPct}% ภายในปี 2030` })}>
          <MultiLine
            data={glidepath}
            height={280}
            lines={[
              { key: "target", color: "#94a3b8", name: L({ en: "SBTi target", th: "เป้า SBTi" }), dashed: true },
              { key: "actual", color: ECO, name: L({ en: "Actual", th: "จริง" }) },
              { key: "forecast", color: "#22d3ee", name: L({ en: "AI forecast", th: "AI คาดการณ์" }), dashed: true },
            ]}
          />
          <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px]">
            <Legend color="#94a3b8" label={L({ en: "SBTi target", th: "เป้า SBTi" })} dashed />
            <Legend color={ECO} label={L({ en: "Actual", th: "จริง" })} />
            <Legend color="#22d3ee" label={L({ en: "AI forecast", th: "AI คาดการณ์" })} dashed />
          </div>
        </Card>
        <div className="space-y-4">
          <div className="panel border-emerald-400/25 bg-emerald-400/[0.06] p-5">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-400/40 bg-emerald-400/10 text-emerald-300"><Target size={18} /></span>
            <p className="mt-3 text-[13px] font-semibold text-emerald-200">{L({ en: "On track — ahead of target", th: "อยู่ในเส้นทาง — นำหน้าเป้า" })}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/60">{L({ en: `AI projects 2030 emissions ~${ahead} tCO₂e below the SBTi trajectory if the Act pipeline is delivered.`, th: `AI คาดว่าปี 2030 จะปล่อยต่ำกว่าเป้า SBTi ~${ahead} tCO₂e หากทำโครงการในแท็บ "ลงมือ" ครบ` })}</p>
          </div>
          <div className="panel p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">{L({ en: "Reduction so far", th: "ลดได้แล้ว" })}</p>
            <p className="mt-1 text-2xl font-semibold tabular text-emerald-300">-{target2030.reductionPct - 3}%<span className="ml-1 text-sm font-normal text-white/45">{L({ en: "vs base year", th: "เทียบปีฐาน" })}</span></p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/8">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${((target2030.reductionPct - 3) / target2030.reductionPct) * 100}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-white/40">{L({ en: `Target: -${target2030.reductionPct}% by 2030`, th: `เป้า: ลด ${target2030.reductionPct}% ภายในปี 2030` })}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <ScenarioSim L={L} />
        <CbamCard L={L} />
      </section>

      <Card title={L({ en: "AI Emission Hotspots", th: "จุดร้อนการปล่อยที่ AI ตรวจพบ" })} sub={L({ en: "Where carbon is coming from — and what's driving it", th: "คาร์บอนมาจากไหน และอะไรเป็นตัวขับ" })}>
        <div className="grid gap-3 md:grid-cols-3">
          {hotspots.map((h) => (
            <div key={h.title.en} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <span className={cn("grid h-8 w-8 place-items-center rounded-lg border", h.trend === "up" ? "border-rose-400/30 bg-rose-400/10 text-rose-300" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300")}>
                  {h.trend === "up" ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                </span>
                <span className={cn("tabular text-sm font-semibold", h.trend === "up" ? "text-rose-300" : "text-emerald-300")}>{h.trend === "up" ? "+" : ""}{h.tco2e} tCO₂e</span>
              </div>
              <p className="mt-2.5 text-[13px] font-medium">{L(h.title)}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-white/55">{L(h.detail)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/** Net-Zero what-if — toggle abatement projects and watch the 2030 forecast
 *  move against the SBTi target. The AI forecast (6,080) assumes the full Act
 *  pipeline; switching a project off adds its tonnes back. */
function ScenarioSim({ L }: { L: (o: CZ) => string }) {
  const [off, setOff] = useState<Set<string>>(new Set());
  const base2030 = glidepath[glidepath.length - 1].forecast!;
  const allT = macc.reduce((s, p) => s + p.tco2e, 0);
  const sel = macc.filter((p) => !off.has(p.id));
  const selT = sel.reduce((s, p) => s + p.tco2e, 0);
  const proj = base2030 + (allT - selT);
  const onTrack = proj <= target2030.tco2e;
  const capex = sel.reduce((s, p) => s + p.capex, 0);
  const saving = sel.reduce((s, p) => s + p.saving, 0);
  const toggle = (id: string) =>
    setOff((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  return (
    <Card title={L({ en: "Net-Zero Scenario Simulator", th: "จำลองเส้นทาง Net-Zero" })} sub={L({ en: "Switch projects on/off — watch 2030 move vs the SBTi line", th: "เปิด/ปิดโครงการ แล้วดูปี 2030 ขยับเทียบเป้า SBTi" })}>
      <div className={cn("rounded-2xl border p-4", onTrack ? "border-emerald-400/25 bg-emerald-400/[0.06]" : "border-rose-400/25 bg-rose-400/[0.06]")}>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/45">{L({ en: "Projected 2030 emissions", th: "คาดการณ์การปล่อยปี 2030" })}</p>
            <p className={cn("tabular text-3xl font-semibold", onTrack ? "text-emerald-300" : "text-rose-300")}>{proj.toLocaleString()}<span className="ml-1 text-sm font-normal text-white/40">tCO₂e</span></p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[11px] text-white/45">{L({ en: "SBTi target", th: "เป้า SBTi" })} {target2030.tco2e.toLocaleString()}</p>
            <span className={cn("mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium", onTrack ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-rose-400/30 bg-rose-400/10 text-rose-300")}>
              {onTrack
                ? <>✓ {L({ en: `ahead by ${(target2030.tco2e - proj).toLocaleString()} tCO₂e`, th: `นำหน้าเป้า ${(target2030.tco2e - proj).toLocaleString()} tCO₂e` })}</>
                : <>✕ {L({ en: `misses by ${(proj - target2030.tco2e).toLocaleString()} tCO₂e`, th: `พลาดเป้า ${(proj - target2030.tco2e).toLocaleString()} tCO₂e` })}</>}
            </span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-white/45">
          {L({ en: `Selected: ${sel.length}/${macc.length} projects · abates ${selT.toLocaleString()} tCO₂e/yr · capex ${baht(capex)} · saves ${baht(saving)}/yr`, th: `เลือกอยู่ ${sel.length}/${macc.length} โครงการ · ลด ${selT.toLocaleString()} tCO₂e/ปี · ลงทุน ${baht(capex)} · ประหยัด ${baht(saving)}/ปี` })}
        </p>
      </div>
      <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
        {macc.map((p) => {
          const on = !off.has(p.id);
          return (
            <button key={p.id} onClick={() => toggle(p.id)} className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition", on ? "border-emerald-400/30 bg-emerald-400/[0.07]" : "border-white/10 bg-white/[0.02] opacity-60 hover:opacity-90")}>
              <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-md border", on ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-300" : "border-white/20 text-transparent")}><Check size={12} /></span>
              <span className="min-w-0 flex-1 truncate text-[12px]">{L(p.name)}</span>
              <span className="tabular shrink-0 text-[11px] text-white/45">−{p.tco2e}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/** CBAM exposure — EU-bound carbon priced in ฿, and what the plan saves */
function CbamCard({ L }: { L: (o: CZ) => string }) {
  const rows = cbamExposure.items.map((it) => {
    const p = products.find((x) => x.sku === it.sku)!;
    const tco2e = Math.round((it.unitsYr * p.kg) / 1000);
    return { p, unitsYr: it.unitsYr, tco2e, bahtYr: Math.round(tco2e * cbamExposure.etsEur * cbamExposure.fxThb) };
  });
  const total = rows.reduce((s, r) => s + r.bahtYr, 0);
  const saved = Math.round((total * cbamExposure.planReductionPct) / 100);
  return (
    <Card title={L({ en: "CBAM Exposure", th: "ความเสี่ยง CBAM" })} sub={L({ en: "What EU-bound carbon costs in certificates", th: "ของที่ส่งเข้า EU ต้องจ่ายค่าใบรับรองเท่าไหร่" })}>
      <div className="flex items-baseline gap-1.5">
        <p className="tabular text-3xl font-semibold text-rose-300">{baht(total)}</p>
        <span className="text-sm text-white/40">/{L({ en: "yr", th: "ปี" })}</span>
      </div>
      <p className="text-[11px] text-white/45">{L({ en: `at €${cbamExposure.etsEur}/tCO₂e (EU ETS) · today's product footprint`, th: `ที่ราคา €${cbamExposure.etsEur}/tCO₂e (EU ETS) · จากคาร์บอนต่อชิ้นปัจจุบัน` })}</p>
      <div className="mt-4 space-y-2">
        {rows.map((r) => (
          <div key={r.p.sku} className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[12.5px] font-medium">{L(r.p.name)}</p>
              <p className="tabular text-[13px] font-semibold text-rose-300">{baht(r.bahtYr)}</p>
            </div>
            <p className="mt-0.5 text-[10.5px] text-white/40">{r.unitsYr.toLocaleString()} {L({ en: "units/yr", th: "ชิ้น/ปี" })} × {r.p.kg} kg = {r.tco2e.toLocaleString()} tCO₂e</p>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-[12px] leading-relaxed text-emerald-200">
        {L({ en: `Deliver the Act pipeline → product footprint −${cbamExposure.planReductionPct}% → save ~${baht(saved)}/yr in certificates`, th: `ทำโครงการในแท็บ "ลงมือ" ครบ → คาร์บอนต่อชิ้นลด ${cbamExposure.planReductionPct}% → ประหยัดค่าใบรับรอง ~${baht(saved)}/ปี` })}
      </p>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────── act ── */

function ActTab({ L, locale }: { L: (o: CZ) => string; locale: string }) {
  const orders = useWorkOrders();
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());
  const ranked = [...macc].sort((a, b) => a.bahtPerTon - b.bahtPerTon);
  const totalTco2e = macc.reduce((s, p) => s + p.tco2e, 0);
  const totalCredits = macc.reduce((s, p) => s + p.credits, 0);
  const totalSaving = macc.reduce((s, p) => s + p.saving, 0);

  const hasWO = (id: string) => justAdded.has(id) || orders.some((w) => w.findingId === id);
  const raise = (p: (typeof macc)[number]) => {
    createWorkOrder(
      {
        id: p.id,
        code: p.code,
        title: p.name,
        asset: { en: "Plant-wide · decarbonization", th: "ทั้งโรงงาน · ลดคาร์บอน" },
        severity: "warning",
        capex: p.capex,
        annualSaving: p.saving,
        partsCount: 1,
      },
      "energy",
    );
    setJustAdded((s) => new Set(s).add(p.id));
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric card big={`${totalTco2e}`} unit="tCO₂e/yr" sub={L({ en: "Total abatement potential", th: "ศักยภาพลดคาร์บอนรวม" })} accent={ECO} icon={Recycle} />
        <Metric card big={baht(totalSaving)} sub={L({ en: "Annual ฿ saving", th: "ประหยัดต่อปี" })} accent="#4ade80" icon={TrendingDown} />
        <Metric card big={`+${totalCredits}`} unit="credits" sub={L({ en: "Extra T-VER credits/yr", th: "เครดิต T-VER เพิ่ม/ปี" })} accent="#22d3ee" icon={Award} />
        <Metric card big={`${macc.length}`} sub={L({ en: "Ranked projects", th: "โครงการจัดอันดับ" })} accent="#a78bfa" icon={Sprout} />
      </section>

      <Card
        title={L({ en: "Abatement Roadmap (MACC)", th: "แผนลดคาร์บอน (MACC)" })}
        sub={L({ en: "Ranked by ฿ per tonne — turn any project into a Work Order", th: "จัดอันดับตาม ฿ ต่อตัน — กดสร้าง Work Order ได้เลย" })}
      >
        <div className="space-y-2.5">
          {ranked.map((p, i) => {
            const done = hasWO(p.id);
            const selfFunding = p.bahtPerTon < 0;
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-[12px] font-semibold text-white/70">{i + 1}</span>
                <div className="min-w-[180px] flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium">{L(p.name)}</p>
                    <span className="chip text-[10px] text-white/55">{L(p.category)}</span>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-white/35">{p.code} · {p.paybackYr === 0 ? L({ en: "no capex (PPA)", th: "ไม่ต้องลงทุน (PPA)" }) : L({ en: `payback ${p.paybackYr} yr`, th: `คืนทุน ${p.paybackYr} ปี` })}</p>
                </div>
                <Cell v={`${p.tco2e}`} u="tCO₂e/yr" />
                <Cell v={p.capex === 0 ? "฿0" : baht(p.capex)} u={L({ en: "capex", th: "ลงทุน" })} />
                <Cell v={`${selfFunding ? "" : "+"}${p.bahtPerTon}`} u="฿/tCO₂e" tone={selfFunding ? "good" : "muted"} />
                <Cell v={`+${p.credits}`} u={L({ en: "credits", th: "เครดิต" })} tone="good" />
                <div className="shrink-0">
                  {done ? (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-[12px] font-medium text-emerald-300"><Check size={13} /> {L({ en: "Work Order raised", th: "สร้าง WO แล้ว" })}</span>
                  ) : (
                    <motion.button whileTap={{ scale: 0.96 }} onClick={() => raise(p)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-[12px] font-medium text-emerald-200 transition hover:bg-emerald-400/20"><Plus size={13} /> {L({ en: "Create Work Order", th: "สร้าง Work Order" })}</motion.button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-[12px] text-emerald-200">
          <Leaf size={13} /> {L({ en: "Deliver this pipeline and register the verified reductions → +" + totalCredits + " T-VER credits/yr (≈ " + baht(totalCredits * credits.bahtPerCredit) + ").", th: "ทำครบทั้งแผนแล้วขึ้นทะเบียนผลที่รับรอง → เครดิต T-VER +" + totalCredits + "/ปี (≈ " + baht(totalCredits * credits.bahtPerCredit) + ")" })}
        </p>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── report ── */

function ReportTab({ L, locale }: { L: (o: CZ) => string; locale: string }) {
  const [kind, setKind] = useState<"esg" | "iso">("esg");
  const esg = kind === "esg";
  const reportHtml = useMemo(() => (esg ? buildReportHtml(locale) : buildIso50001Html(locale)), [esg, locale]);
  const stds = esg ? standards : enmsStandards;
  const accent = esg ? "#34d399" : "#38bdf8";
  const download = () => triggerDownload(esg ? "SpareX-ESG-Carbon-Report-2026-07.html" : "SpareX-ISO50001-Energy-Report-2026-07.html", reportHtml);

  const KINDS: { id: "esg" | "iso"; label: CZ; sub: CZ; icon: typeof Leaf; color: string }[] = [
    { id: "esg", label: { en: "ESG & Carbon", th: "ESG & คาร์บอน" }, sub: { en: "GHG Protocol · CBAM · GRI 305 · assured", th: "GHG Protocol · CBAM · GRI 305 · รับรอง" }, icon: Leaf, color: "#34d399" },
    { id: "iso", label: { en: "ISO 50001 · Energy", th: "ISO 50001 · พลังงาน" }, sub: { en: "EnMS · EnB · EnPI · IPMVP M&V", th: "ระบบพลังงาน · EnB · EnPI · M&V" }, icon: Gauge, color: "#38bdf8" },
  ];

  return (
    <div className="space-y-6">
      {/* report picker */}
      <div className="grid gap-3 sm:grid-cols-2">
        {KINDS.map((k) => {
          const on = kind === k.id;
          const Ico = k.icon;
          return (
            <button key={k.id} onClick={() => setKind(k.id)} className={cn("flex items-center gap-3 rounded-2xl border p-4 text-left transition", on ? "" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]")} style={on ? { borderColor: `${k.color}66`, backgroundColor: `${k.color}14` } : undefined}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border" style={{ color: k.color, borderColor: `${k.color}55`, backgroundColor: `${k.color}1f` }}><Ico size={20} /></span>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[14px] font-semibold">{L(k.label)} {on ? <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9.5px] font-medium" style={{ color: k.color, backgroundColor: `${k.color}1f` }}><Check size={10} /> {L({ en: "Selected", th: "เลือก" })}</span> : null}</p>
                <p className="text-[11.5px] text-white/45">{L(k.sub)}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* export hero */}
      <section className="panel relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full blur-3xl" style={{ backgroundColor: `${accent}26` }} />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border" style={{ color: accent, borderColor: `${accent}66`, backgroundColor: `${accent}1f` }}><FileText size={24} /></span>
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-2 font-semibold">{esg ? L({ en: "Audit-Ready ESG & Carbon Report", th: "รายงาน ESG & คาร์บอน พร้อมตรวจสอบ" }) : L({ en: "ISO 50001 Energy Performance Report", th: "รายงานสมรรถนะพลังงาน ISO 50001" })} <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium" style={{ color: accent, backgroundColor: `${accent}1f` }}><BadgeCheck size={12} /> {esg ? L({ en: "Assured", th: "รับรองแล้ว" }) : L({ en: "Conformity", th: "สอดคล้อง" })}</span></h3>
            <p className="mt-1 max-w-2xl text-sm text-white/60">{esg ? L({ en: "7-page report with basis of reporting, GRI 305 index and an independent limited-assurance statement. Download a real A4 PDF (selectable text) — every figure traces to a source meter.", th: "รายงาน 7 หน้า มีหลักเกณฑ์การจัดทำ ดัชนี GRI 305 และคำรับรองความเชื่อมั่นอย่างจำกัดโดยอิสระ ดาวน์โหลดเป็น PDF A4 จริง (คัดลอกข้อความได้) ทุกตัวเลขอ้างอิงมิเตอร์ต้นทาง" }) : L({ en: "6-page ISO 50001:2018 report: energy review, baseline (EnB), EnPIs, action plans and IPMVP-verified savings. Download a real A4 PDF.", th: "รายงาน ISO 50001:2018 6 หน้า: ทบทวนพลังงาน เส้นฐาน (EnB) EnPI แผนปฏิบัติการ และผลประหยัดตาม IPMVP · ดาวน์โหลดเป็น PDF A4 จริง" })}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button onClick={download} title={L({ en: "Download raw HTML", th: "ดาวน์โหลดไฟล์ HTML" })} className="btn-ghost px-2.5 py-2.5 text-[12px] text-white/50"><Download size={13} /> HTML</button>
            <button onClick={() => openHtml(reportHtml)} className="btn-ghost px-3.5 py-2.5 text-sm"><ExternalLink size={14} /> {L({ en: "Open", th: "เปิดเต็มจอ" })}</button>
            <button onClick={() => printReport(reportHtml)} className="btn-glow px-4 py-2.5 text-sm"><FileDown size={15} /> {L({ en: "Download PDF", th: "ดาวน์โหลด PDF" })}</button>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2">
          {stds.map((s) => <span key={s.en} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/60"><ShieldCheck size={11} style={{ color: accent }} /> {L(s)}</span>)}
        </div>
      </section>

      {/* live template preview */}
      <Card title={esg ? L({ en: "ESG Report Template Preview", th: "ตัวอย่างเทมเพลต ESG" }) : L({ en: "ISO 50001 Report Template Preview", th: "ตัวอย่างเทมเพลต ISO 50001" })} sub={esg ? L({ en: "Cover → summary → 7 sections + assurance · scroll inside", th: "หน้าปก → สรุป → 7 หมวด + คำรับรอง · เลื่อนดูในกรอบ" }) : L({ en: "Cover → summary → energy review · EnB · EnPI · M&V", th: "หน้าปก → สรุป → ทบทวนพลังงาน · EnB · EnPI · M&V" })} right={<span className="chip text-emerald-300"><Eye size={12} /> {L({ en: "Live", th: "เรียลไทม์" })}</span>}>
        <div className="rounded-xl border border-white/10 bg-[#eceff2] p-3">
          <iframe key={kind} title="report preview" srcDoc={reportHtml} className="h-[620px] w-full rounded-lg border-0 bg-white" />
        </div>
      </Card>

      {/* CBAM / product carbon footprint (ESG only) */}
      {esg ? (
        <Card title={L({ en: "Product Carbon Footprint", th: "คาร์บอนต่อสินค้า" })} sub={L({ en: "CBAM-Ready · Per-unit embedded carbon — attach as a certificate to customer POs / EU imports", th: "พร้อม CBAM · คาร์บอนฝังตัวต่อหน่วย — แนบเป็นใบรับรองกับออเดอร์ลูกค้า / การนำเข้า EU" })}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10.5px] uppercase tracking-wide text-white/40">
                  <th className="px-2 py-2 font-medium">{L({ en: "Product", th: "สินค้า" })}</th>
                  <th className="px-2 py-2 font-medium">SKU</th>
                  <th className="px-2 py-2 text-right font-medium">kgCO₂e/{L({ en: "unit", th: "หน่วย" })}</th>
                  <th className="px-2 py-2 font-medium">{L({ en: "Market", th: "ตลาด" })}</th>
                  <th className="px-2 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.sku} className="border-b border-white/5 last:border-0">
                    <td className="px-2 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-lg border border-emerald-400/25 bg-emerald-400/10 text-emerald-300"><Factory size={13} /></span>
                        <span className="font-medium">{L(p.name)}</span>
                        {p.cbam ? <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-300 text-[9.5px]">CBAM</span> : null}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 font-mono text-[11px] text-white/45">{p.sku}</td>
                    <td className="px-2 py-2.5 text-right tabular font-semibold text-emerald-300">{p.kg.toFixed(2)}</td>
                    <td className="px-2 py-2.5 text-white/60">{L(p.market)}</td>
                    <td className="px-2 py-2.5 text-right">
                      <button onClick={() => downloadCert(p.sku, L(p.name), p.kg, locale)} className="inline-flex items-center gap-1 rounded-lg border border-white/12 px-2 py-1 text-[11px] text-white/60 transition hover:text-white/90"><Download size={11} /> {L({ en: "Certificate", th: "ใบรับรอง" })}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── small parts ── */

function Card({ title, sub, right, children }: { title: string; sub?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="panel p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {sub ? <p className="mt-0.5 text-xs text-white/45">{sub}</p> : null}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Metric({ big, unit, sub, accent, up, down, card, icon: Icon }: { big: string; unit?: string; sub: string; accent: string; up?: boolean; down?: boolean; card?: boolean; icon?: typeof Gauge }) {
  const body = (
    <>
      {Icon ? <span className="grid h-8 w-8 place-items-center rounded-lg border" style={{ color: accent, borderColor: `${accent}44`, backgroundColor: `${accent}14` }}><Icon size={15} /></span> : null}
      <p className={cn("font-semibold tabular", card ? "mt-2 text-xl" : "text-2xl")} style={{ color: accent }}>
        {up ? "▲ " : down ? "▼ " : ""}{big}{unit ? <span className="ml-1 text-xs font-normal text-white/45">{unit}</span> : null}
      </p>
      <p className="mt-0.5 text-[11px] text-white/50">{sub}</p>
    </>
  );
  return card ? <div className="panel p-4">{body}</div> : <div>{body}</div>;
}

function EquivCard({ icon: Icon, value, label }: { icon: typeof TreePine; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4 text-center">
      <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"><Icon size={20} /></span>
      <p className="mt-2 text-xl font-semibold tabular text-emerald-200">{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-white/55">{label}</p>
    </div>
  );
}

function Cell({ v, u, tone }: { v: string; u: string; tone?: "good" | "muted" }) {
  return (
    <div className="shrink-0 text-right">
      <p className={cn("tabular text-[13px] font-semibold", tone === "good" ? "text-emerald-300" : tone === "muted" ? "text-white/55" : "text-white/85")}>{v}</p>
      <p className="text-[9.5px] uppercase tracking-wide text-white/35">{u}</p>
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-white/55">
      <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: color, backgroundImage: dashed ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)` : undefined }} />
      {label}
    </span>
  );
}

/* ─────────────────────────────────────── report template + inline charts ── */

function esc(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

/** inline stacked-column chart (emissions trend) */
function svgStack(rows: Record<string, number | string>[], series: { key: string; color: string }[], w = 560, h = 190): string {
  const pad = { l: 32, r: 8, t: 10, b: 20 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const totals = rows.map((r) => series.reduce((s, k) => s + (r[k.key] as number), 0));
  const max = Math.max(...totals) * 1.05;
  const step = iw / rows.length, bw = step * 0.56;
  let bars = "", labels = "";
  rows.forEach((r, i) => {
    const x = pad.l + step * i + (step - bw) / 2;
    let y = pad.t + ih;
    series.forEach((s) => {
      const sh = ((r[s.key] as number) / max) * ih;
      y -= sh;
      bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${sh.toFixed(1)}" fill="${s.color}"/>`;
    });
    labels += `<text x="${(x + bw / 2).toFixed(1)}" y="${h - 6}" text-anchor="middle" font-size="9" fill="#94a3b8">${r.t}</text>`;
  });
  let grid = "";
  for (let g = 0; g <= 4; g++) {
    const gy = pad.t + ih - (ih * g) / 4;
    grid += `<line x1="${pad.l}" y1="${gy.toFixed(1)}" x2="${w - pad.r}" y2="${gy.toFixed(1)}" stroke="#eef2f7"/><text x="${pad.l - 4}" y="${(gy + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="#cbd5e1">${Math.round((max * g) / 4)}</text>`;
  }
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet">${grid}${bars}${labels}</svg>`;
}

/** inline donut (electricity mix) */
function svgDonut(segs: { value: number; color: string }[], size = 120): string {
  const cx = size / 2, cy = size / 2, r = size / 2 - 4, ri = r * 0.62;
  const total = segs.reduce((s, x) => s + x.value, 0);
  let a = -Math.PI / 2, out = "";
  const p = (rad: number, ang: number) => `${(cx + rad * Math.cos(ang)).toFixed(1)} ${(cy + rad * Math.sin(ang)).toFixed(1)}`;
  segs.forEach((s) => {
    const a1 = a + (s.value / total) * Math.PI * 2;
    const large = a1 - a > Math.PI ? 1 : 0;
    out += `<path d="M ${p(r, a)} A ${r} ${r} 0 ${large} 1 ${p(r, a1)} L ${p(ri, a1)} A ${ri} ${ri} 0 ${large} 0 ${p(ri, a)} Z" fill="${s.color}"/>`;
    a = a1;
  });
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${out}</svg>`;
}

/** inline multi-line (net-zero glidepath) */
function svgLine(rows: Record<string, number | string | undefined>[], series: { key: string; color: string; dashed?: boolean }[], w = 560, h = 190): string {
  const pad = { l: 40, r: 10, t: 12, b: 20 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const vals: number[] = [];
  rows.forEach((r) => series.forEach((s) => { if (r[s.key] != null) vals.push(r[s.key] as number); }));
  const max = Math.max(...vals), min = Math.min(...vals) * 0.96;
  const X = (i: number) => pad.l + (iw * i) / (rows.length - 1);
  const Y = (v: number) => pad.t + ih - ((v - min) / (max - min)) * ih;
  let paths = "";
  series.forEach((s) => {
    let d = "", on = false;
    rows.forEach((r, i) => { if (r[s.key] == null) { on = false; return; } d += (on ? " L " : "M ") + X(i).toFixed(1) + " " + Y(r[s.key] as number).toFixed(1); on = true; });
    paths += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.2" ${s.dashed ? 'stroke-dasharray="5 4"' : ""}/>`;
  });
  let grid = "", labels = "";
  for (let g = 0; g <= 4; g++) { const gy = pad.t + ih - (ih * g) / 4; grid += `<line x1="${pad.l}" y1="${gy.toFixed(1)}" x2="${w - pad.r}" y2="${gy.toFixed(1)}" stroke="#eef2f7"/><text x="${pad.l - 4}" y="${(gy + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="#cbd5e1">${Math.round(min + (max - min) * g / 4)}</text>`; }
  rows.forEach((r, i) => { labels += `<text x="${X(i).toFixed(1)}" y="${h - 6}" text-anchor="middle" font-size="8" fill="#94a3b8">${r.t}</text>`; });
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet">${grid}${paths}${labels}</svg>`;
}

const COVER_RINGS = `<svg width="380" height="380" viewBox="0 0 380 380" fill="none"><circle cx="190" cy="190" r="150" stroke="#fff" stroke-opacity="0.18" stroke-width="1.5"/><circle cx="190" cy="190" r="115" stroke="#fff" stroke-opacity="0.22" stroke-width="1.5" stroke-dasharray="4 7"/><circle cx="190" cy="190" r="80" stroke="#fff" stroke-opacity="0.28" stroke-width="1.5"/><path d="M190 120c34 10 52 40 49 74-34-5-60-31-60-68 0-2 4-6 11-6z" fill="#fff" fill-opacity="0.18"/><path d="M190 120c-34 10-52 40-49 74 34-5 60-31 60-68 0-2-4-6-11-6z" fill="#fff" fill-opacity="0.13"/><line x1="190" y1="200" x2="190" y2="132" stroke="#fff" stroke-opacity="0.25" stroke-width="2"/></svg>`;

const REPORT_CSS = `:root{--g:#0d9f6e;--g2:#047857;--g3:#065f46;--ink:#0f172a;--mut:#64748b;--line:#e6ebf1;--soft:#f1f7f4;--amber:#b45309}
*{box-sizing:border-box}body{font-family:'Segoe UI',system-ui,-apple-system,'Sarabun',sans-serif;margin:0;color:var(--ink);background:#eceff2;font-size:12.5px;line-height:1.55}
.page{width:800px;max-width:100%;margin:0 auto 22px;background:#fff;box-shadow:0 6px 30px rgba(15,23,42,.10);border-radius:8px;overflow:hidden}
.pad{padding:42px 48px}
.cover{background:linear-gradient(160deg,#064e3b,#0d9f6e 62%,#10b981);color:#fff;min-height:920px;position:relative;padding:54px 52px;display:flex;flex-direction:column;overflow:hidden}
.cover .rings{position:absolute;right:-70px;top:150px}
.brand{font-weight:600;font-size:15px;display:flex;align-items:center;gap:9px;position:relative}
.brand b{background:#fff;color:#0d9f6e;border-radius:7px;padding:3px 9px;font-size:13px;font-weight:800}
.cover .eyebrow{text-transform:uppercase;letter-spacing:.22em;font-size:12px;opacity:.8}
.cover h1{font-size:44px;line-height:1.08;margin:8px 0 12px;font-weight:800;letter-spacing:-.6px;position:relative}
.cover .lead{font-size:15px;opacity:.9;max-width:440px;position:relative}
.cover .meta{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;position:relative}
.cover .k{font-size:10.5px;opacity:.7;text-transform:uppercase;letter-spacing:.12em}.cover .v{font-size:15px;font-weight:600}
.seal{width:98px;height:98px;border:2px solid rgba(255,255,255,.55);border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;line-height:1.4}
.seal b{font-size:20px;letter-spacing:0;margin:1px 0}
h2.sec{display:flex;align-items:center;gap:10px;font-size:16px;color:var(--g2);margin:0 0 6px}
h2.sec .n{background:var(--g);color:#fff;border-radius:8px;min-width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}
.sub{color:var(--mut);font-size:11.5px;margin:0 0 12px 36px}
.block{margin-bottom:28px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.kpi{border:1px solid var(--line);border-radius:12px;padding:14px;background:var(--soft)}
.kpi .v{font-size:23px;font-weight:800;color:var(--g2)}.kpi .u{font-size:11px;color:var(--mut);font-weight:500}.kpi .l{font-size:10px;color:var(--mut);text-transform:uppercase;letter-spacing:.05em;margin-top:2px}
.calls{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}
.call{border:1px solid #a7f3d0;background:#ecfdf5;border-radius:12px;padding:13px 14px}.call .v{font-size:21px;font-weight:800;color:var(--g2)}.call .l{font-size:10.5px;color:#047857;margin-top:2px}
.credit{background:linear-gradient(135deg,#065f46,#0d9f6e);color:#fff;border-radius:14px;padding:19px 24px;margin-top:16px}
.credit .cl{font-size:10.5px;opacity:.85;text-transform:uppercase;letter-spacing:.08em}.credit .big{font-size:31px;font-weight:800;margin:2px 0}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{padding:8px 10px;text-align:left;border-bottom:1px solid var(--line)}
th{background:var(--soft);color:var(--g2);text-transform:uppercase;font-size:9.5px;letter-spacing:.04em;font-weight:700}
td.num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}td.num.good{color:var(--g2)}tr:last-child td{border-bottom:none}
.mono{font-family:ui-monospace,monospace;color:var(--mut);font-size:9.5px;margin-top:2px}
td.bar span{display:block;height:8px;border-radius:5px;background:linear-gradient(90deg,#34d399,#0d9f6e)}
.tag{background:#e2e8f0;color:#475569;border-radius:5px;padding:1px 6px;font-size:9px;margin-left:4px}.tag.amber{background:#fef3c7;color:var(--amber)}
.two{display:grid;grid-template-columns:1.3fr 1fr;gap:22px;align-items:center}
.chip{display:inline-block;background:var(--soft);border:1px solid #bbf7d0;color:var(--g2);border-radius:20px;padding:4px 11px;font-size:11px;margin:0 6px 6px 0;font-weight:600}
.lg{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--mut);margin-right:12px}.lg i{width:10px;height:10px;border-radius:3px;display:inline-block}
.verdict{border:1px solid #a7f3d0;background:#ecfdf5;border-radius:12px;padding:13px 16px;font-size:11.5px;color:#334155}
.assure{border:1px dashed var(--g);border-radius:12px;padding:16px;background:var(--soft);font-size:11.5px;color:#334155}
.sign{display:flex;gap:40px;margin-top:26px}.sign div{flex:1;border-top:1px solid #94a3b8;padding-top:6px;font-size:10.5px;color:var(--mut)}
.pfoot{display:flex;justify-content:space-between;font-size:9.5px;color:var(--mut);border-top:1px solid var(--line);padding-top:10px;margin-top:14px}
@page{size:A4;margin:0}
@media print{html,body{background:#fff}.page{box-shadow:none;border-radius:0;margin:0;width:100%;min-height:auto;page-break-after:always}.page:last-child{page-break-after:auto}.cover{min-height:297mm}}`;

function buildReportHtml(locale: string): string {
  const th = locale === "th";
  const L = (o: CZ) => (th ? o.th : o.en);
  const t = (en: string, ths: string) => (th ? ths : en);
  const now = new Date().toLocaleDateString(th ? "th-TH" : "en-GB", { year: "numeric", month: "long", day: "numeric" });
  const creditValue = baht(credits.earnedYtd * credits.bahtPerCredit);
  const totalScope = kpi.scope1 + kpi.scope2 + kpi.scope3;
  const reduction = target2030.reductionPct - 3;
  const srcMax = Math.max(...bySource.map((s) => s.value));
  const mT = macc.reduce((a, p) => ({ tco2e: a.tco2e + p.tco2e, credits: a.credits + p.credits, saving: a.saving + p.saving }), { tco2e: 0, credits: 0, saving: 0 });

  const srcRows = bySource.map((s) => `<tr><td>${esc(L(s.name))} <span class="tag">S${s.scope}</span></td><td class="bar" style="width:32%"><span style="width:${((s.value / srcMax) * 100).toFixed(0)}%"></span></td><td class="num">${s.value}</td></tr>`).join("");
  const maccRows = [...macc].sort((a, b) => a.bahtPerTon - b.bahtPerTon).map((p, i) => `<tr><td class="num">${i + 1}</td><td>${esc(L(p.name))}<div class="mono">${p.code} · ${esc(L(p.category))}</div></td><td class="num">${p.tco2e}</td><td class="num">${p.capex === 0 ? "฿0" : baht(p.capex)}</td><td class="num">${p.paybackYr === 0 ? "PPA" : p.paybackYr + "y"}</td><td class="num ${p.bahtPerTon < 0 ? "good" : ""}">${p.bahtPerTon}</td><td class="num good">+${p.credits}</td></tr>`).join("");
  const prodRows = products.map((p) => `<tr><td>${esc(L(p.name))} ${p.cbam ? '<span class="tag amber">CBAM</span>' : ""}</td><td class="mono" style="margin:0">${p.sku}</td><td class="num">${p.kg.toFixed(2)}</td><td>${esc(L(p.market))}</td></tr>`).join("");
  const stds = standards.map((s) => `<span class="chip">✓ ${esc(L(s))}</span>`).join("");
  const trendSvg = svgStack(emissionsTrend, [{ key: "scope1", color: "#f59e0b" }, { key: "scope2", color: "#22b8cf" }, { key: "scope3", color: "#a78bfa" }]);
  const mixSvg = svgDonut(scope2Dual.mix.map((m) => ({ value: m.value, color: m.color })));
  const glideSvg = svgLine(glidepath, [{ key: "target", color: "#94a3b8", dashed: true }, { key: "actual", color: "#0d9f6e" }, { key: "forecast", color: "#22b8cf", dashed: true }]);
  const mixLegend = scope2Dual.mix.map((m) => `<span class="lg"><i style="background:${m.color}"></i>${esc(L(m.name))} ${m.value}%</span>`).join("");
  const foot = (n: number) => `<div class="pfoot"><span>SpareX FactoryOS™ · ${t("ESG & Carbon Report", "รายงาน ESG & คาร์บอน")}</span><span>${t("Page", "หน้า")} ${n} / 7</span></div>`;
  const gri = [
    ["305-1", t("Direct (Scope 1) GHG emissions", "การปล่อย GHG ทางตรง (Scope 1)"), `${kpi.scope1} tCO₂e`],
    ["305-2", t("Energy indirect (Scope 2)", "ทางอ้อมจากพลังงาน (Scope 2)"), `${kpi.scope2} tCO₂e`],
    ["305-3", t("Other indirect (Scope 3)", "ทางอ้อมอื่น (Scope 3)"), `${kpi.scope3.toLocaleString()} tCO₂e`],
    ["305-4", t("GHG emissions intensity", "ความเข้มการปล่อย GHG"), `${kpi.intensity} kgCO₂e/unit`],
    ["305-5", t("Reduction of GHG emissions", "การลดการปล่อย GHG"), `-${target2030.reductionPct - 3}% ${t("vs 2021", "เทียบ 2021")}`],
  ].map((r) => `<tr><td class="mono" style="font-family:inherit;font-weight:600">GRI ${r[0]}</td><td>${esc(r[1])}</td><td class="num good">${esc(r[2])}</td></tr>`).join("");

  return `<!doctype html><html lang="${th ? "th" : "en"}"><head><meta charset="utf-8"><title>SpareX ESG & Carbon Report</title><style>${REPORT_CSS}</style></head><body>

<div class="page cover"><div class="rings">${COVER_RINGS}</div>
<div class="brand"><b>SpareX</b> FactoryOS™</div>
<div style="margin-top:96px;position:relative">
<div class="eyebrow">${t("Sustainability Report", "รายงานความยั่งยืน")}</div>
<h1>${t("ESG &amp; Carbon<br>Intelligence Report", "รายงานอัจฉริยะ<br>ESG &amp; คาร์บอน")}</h1>
<div class="lead">${t("Real-time Scope 1·2·3 accounting, product carbon footprint, and audit-ready ESG disclosure — generated from calibrated source meters.", "บัญชีคาร์บอน Scope 1·2·3 เรียลไทม์ คาร์บอนต่อสินค้า และการเปิดเผย ESG ที่พร้อมตรวจสอบ — สร้างจากมิเตอร์ต้นทางที่สอบเทียบแล้ว")}</div></div>
<div class="meta"><div>
<div class="k">${t("Facility", "โรงงาน")}</div><div class="v">${t("Bangkok Plant 1", "โรงงานกรุงเทพ 1")}</div>
<div class="k" style="margin-top:12px">${t("Reporting period", "รอบรายงาน")}</div><div class="v">${L(reportPeriod)}</div>
<div class="k" style="margin-top:12px">${t("Issued", "ออกเมื่อ")}</div><div class="v">${now}</div></div>
<div class="seal">${t("Audit", "ออดิต")}<b>${kpi.traceability}%</b>${t("Traceable", "ตรวจสอบได้")}</div></div></div>

<div class="page"><div class="pad">
<h2 class="sec"><span class="n">§</span>${t("Executive summary", "บทสรุปผู้บริหาร")}</h2>
<p style="color:#334155;margin:2px 0 16px">${t("Total footprint this period is " + totalScope.toLocaleString() + " tCO₂e across Scope 1·2·3, down 8% year-on-year and " + reduction + "% below the 2021 base year — on track for the science-based -" + target2030.reductionPct + "% target by 2030. The AI abatement pipeline unlocks a further " + mT.tco2e + " tCO₂e/yr and grows registrable carbon credits by " + credits.upliftPct + "% versus business-as-usual.", "การปล่อยรวมงวดนี้ " + totalScope.toLocaleString() + " tCO₂e ครอบคลุม Scope 1·2·3 ลดลง 8% เทียบปีก่อน และต่ำกว่าปีฐาน 2021 อยู่ " + reduction + "% — อยู่ในเส้นทางเป้าตามหลักวิทยาศาสตร์ ลด " + target2030.reductionPct + "% ภายในปี 2030 แผนลดคาร์บอนด้วย AI ช่วยลดเพิ่มอีก " + mT.tco2e + " tCO₂e/ปี และเพิ่มคาร์บอนเครดิตที่ขึ้นทะเบียนได้ " + credits.upliftPct + "% เทียบการทำแบบเดิม")}</p>
<div class="kpis">
<div class="kpi"><div class="v">${kpi.scope1}<span class="u"> tCO₂e</span></div><div class="l">Scope 1 · MTD</div></div>
<div class="kpi"><div class="v">${kpi.scope2}<span class="u"> tCO₂e</span></div><div class="l">Scope 2 · MTD</div></div>
<div class="kpi"><div class="v">${kpi.scope3.toLocaleString()}<span class="u"> tCO₂e</span></div><div class="l">Scope 3 · MTD</div></div>
<div class="kpi"><div class="v">${kpi.intensity}<span class="u"> kg/u</span></div><div class="l">${t("Carbon intensity", "ความเข้มคาร์บอน")}</div></div></div>
<div class="calls">
<div class="call"><div class="v">-8%</div><div class="l">${t("Emissions year-on-year", "ปล่อยลดลง เทียบปีก่อน")}</div></div>
<div class="call"><div class="v">-${reduction}%</div><div class="l">${t("vs 2021 base · SBTi on track", "เทียบปีฐาน 2021 · ตามเป้า SBTi")}</div></div>
<div class="call"><div class="v">+${credits.upliftPct}%</div><div class="l">${t("Carbon credits vs baseline", "คาร์บอนเครดิตเพิ่มขึ้น")}</div></div></div>
<div class="credit"><div class="cl">${t("Verified carbon credits", "คาร์บอนเครดิตที่รับรอง")} · ${credits.registry}</div>
<div class="big">${credits.earnedYtd.toLocaleString()} tCO₂e</div>
<div style="opacity:.92">${t("Estimated value", "มูลค่าประมาณ")} <b>${creditValue}</b> · +${credits.upliftPct}% ${t("vs. business-as-usual with SpareX", "เทียบการทำแบบเดิม เมื่อใช้ SpareX")}</div></div>
${foot(2)}</div></div>

<div class="page"><div class="pad">
<div class="block"><h2 class="sec"><span class="n">01</span>${t("GHG inventory · Scope 1·2·3", "บัญชีก๊าซเรือนกระจก · Scope 1·2·3")}</h2>
<div class="sub">GHG Protocol · tCO₂e ${t("per month", "ต่อเดือน")}</div>
${trendSvg}
<div style="margin:8px 0 12px"><span class="lg"><i style="background:#f59e0b"></i>Scope 1</span><span class="lg"><i style="background:#22b8cf"></i>Scope 2</span><span class="lg"><i style="background:#a78bfa"></i>Scope 3</span></div>
<table><thead><tr><th>${t("Scope", "ขอบเขต")}</th><th>${t("Description", "รายละเอียด")}</th><th style="text-align:right">tCO₂e</th></tr></thead><tbody>
<tr><td>Scope 1</td><td>${t("Direct combustion &amp; refrigerants", "เผาไหม้โดยตรง &amp; สารทำความเย็น")}</td><td class="num">${kpi.scope1}</td></tr>
<tr><td>Scope 2</td><td>${t("Purchased electricity &amp; steam", "ไฟฟ้า &amp; ไอน้ำที่ซื้อ")}</td><td class="num">${kpi.scope2}</td></tr>
<tr><td>Scope 3</td><td>${t("Value chain (up- &amp; downstream)", "ห่วงโซ่คุณค่า (ต้น-ปลายน้ำ)")}</td><td class="num">${kpi.scope3.toLocaleString()}</td></tr>
<tr><td colspan="2" style="font-weight:700">${t("Total", "รวม")}</td><td class="num good">${totalScope.toLocaleString()}</td></tr></tbody></table></div>
<div class="block"><h2 class="sec"><span class="n">02</span>${t("Emissions by source", "แหล่งปล่อย")}</h2>
<div class="sub">Scope 1·2 · ${L(reportPeriod)}</div>
<table><thead><tr><th>${t("Source", "แหล่ง")}</th><th></th><th style="text-align:right">tCO₂e</th></tr></thead><tbody>${srcRows}</tbody></table></div>
${foot(3)}</div></div>

<div class="page"><div class="pad">
<div class="block"><h2 class="sec"><span class="n">03</span>${t("Scope 2 · market vs location", "Scope 2 · market vs location")}</h2>
<div class="sub">${t("GHG Protocol dual reporting", "รายงานคู่ตาม GHG Protocol")}</div>
<div class="two"><div>
<table><tbody>
<tr><td>${t("Location-based", "อิงค่าเฉลี่ยกริด")}</td><td class="num">${scope2Dual.locationBased} tCO₂e</td></tr>
<tr><td>${t("Market-based", "หลังหักพลังงานสะอาด")}</td><td class="num good">${scope2Dual.marketBased} tCO₂e</td></tr>
<tr><td>${t("Renewable share", "สัดส่วนพลังงานสะอาด")}</td><td class="num good">${scope2Dual.renewablePct}%</td></tr></tbody></table>
<div style="margin-top:12px">${mixLegend}</div></div>
<div style="text-align:center">${mixSvg}<div style="font-size:10.5px;color:var(--mut);margin-top:4px">${t("Electricity mix", "สัดส่วนพลังงานไฟฟ้า")}</div></div></div></div>
<div class="block"><h2 class="sec"><span class="n">04</span>${t("Net-zero pathway · SBTi", "เส้นทางสู่ Net-Zero · SBTi")}</h2>
<div class="sub">${t("Science-based target: -" + target2030.reductionPct + "% by 2030", "เป้าตามหลักวิทยาศาสตร์: ลด " + target2030.reductionPct + "% ภายในปี 2030")}</div>
${glideSvg}
<div style="margin:6px 0 0"><span class="lg"><i style="background:#94a3b8"></i>${t("SBTi target", "เป้า SBTi")}</span><span class="lg"><i style="background:#0d9f6e"></i>${t("Actual", "จริง")}</span><span class="lg"><i style="background:#22b8cf"></i>${t("AI forecast", "AI คาดการณ์")}</span></div>
<div class="verdict" style="margin-top:12px"><b style="color:var(--g2)">✓ ${t("On track — ahead of target", "อยู่ในเส้นทาง — นำหน้าเป้า")}</b><br>${t("AI projects 2030 emissions below the SBTi trajectory once the reduction pipeline is delivered. Reduction to date: -" + reduction + "% vs the 2021 base year.", "AI คาดว่าปี 2030 จะปล่อยต่ำกว่าเป้า SBTi เมื่อทำโครงการครบ · ลดแล้ว -" + reduction + "% เทียบปีฐาน 2021")}</div></div>
${foot(4)}</div></div>

<div class="page"><div class="pad">
<div class="block"><h2 class="sec"><span class="n">05</span>${t("Decarbonization roadmap (MACC)", "แผนลดคาร์บอน (MACC)")}</h2>
<div class="sub">${t("Ranked by ฿ per tonne abated", "จัดอันดับตาม ฿ ต่อตันที่ลดได้")}</div>
<table><thead><tr><th>#</th><th>${t("Project", "โครงการ")}</th><th style="text-align:right">tCO₂e/y</th><th style="text-align:right">${t("Capex", "ลงทุน")}</th><th style="text-align:right">${t("Payback", "คืนทุน")}</th><th style="text-align:right">฿/t</th><th style="text-align:right">${t("Credits", "เครดิต")}</th></tr></thead><tbody>${maccRows}
<tr><td></td><td style="font-weight:700">${t("Total", "รวม")}</td><td class="num good">${mT.tco2e}</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num good">+${mT.credits}</td></tr></tbody></table>
<div class="verdict" style="margin-top:12px">🌿 ${t("Delivering this pipeline abates " + mT.tco2e + " tCO₂e/yr, saves " + baht(mT.saving) + "/yr, and unlocks +" + mT.credits + " T-VER credits (≈ " + baht(mT.credits * credits.bahtPerCredit) + ").", "ทำครบทั้งแผนลดได้ " + mT.tco2e + " tCO₂e/ปี ประหยัด " + baht(mT.saving) + "/ปี และได้เครดิต T-VER +" + mT.credits + " (≈ " + baht(mT.credits * credits.bahtPerCredit) + ")")}</div></div>
<div class="block"><h2 class="sec"><span class="n">06</span>${t("Product Carbon Footprint · CBAM", "คาร์บอนต่อสินค้า · CBAM")}</h2>
<div class="sub">${t("Per-unit embedded carbon · cradle-to-gate (ISO 14067)", "คาร์บอนฝังตัวต่อหน่วย · แหล่งกำเนิดถึงประตูโรงงาน (ISO 14067)")}</div>
<table><thead><tr><th>${t("Product", "สินค้า")}</th><th>SKU</th><th style="text-align:right">kgCO₂e/${t("unit", "หน่วย")}</th><th>${t("Market", "ตลาด")}</th></tr></thead><tbody>${prodRows}</tbody></table></div>
${foot(5)}</div></div>

<div class="page"><div class="pad">
<div class="block"><h2 class="sec"><span class="n">07</span>${t("Carbon credit register · T-VER", "ทะเบียนคาร์บอนเครดิต · T-VER")}</h2>
<table><tbody>
<tr><td>${t("Credits earned (YTD)", "เครดิตสะสม (ปีนี้)")}</td><td class="num">${credits.earnedYtd.toLocaleString()} tCO₂e</td></tr>
<tr><td>${t("Estimated value", "มูลค่าประมาณ")}</td><td class="num good">${creditValue}</td></tr>
<tr><td>${t("Uplift vs. baseline (with SpareX)", "เพิ่มขึ้นเทียบไม่ใช้ระบบ")}</td><td class="num good">+${credits.upliftPct}%</td></tr>
<tr><td>${t("Registry", "ทะเบียน")}</td><td class="num">${credits.registry}</td></tr></tbody></table></div>
<div class="block"><h2 class="sec"><span class="n">§</span>${t("Basis of reporting", "หลักเกณฑ์การจัดทำรายงาน")}</h2>
<table><tbody>
<tr><td>${t("Organizational boundary", "ขอบเขตองค์กร")}</td><td>${t("Operational control approach", "แนวทางการควบคุมการดำเนินงาน")}</td></tr>
<tr><td>${t("Operational boundary", "ขอบเขตการดำเนินงาน")}</td><td>${t("Scope 1, 2 &amp; 3 (screened)", "Scope 1, 2 และ 3 (คัดกรอง)")}</td></tr>
<tr><td>${t("Base year", "ปีฐาน")}</td><td>2021 · ${t("recalc on &gt;5% structural change", "คำนวณใหม่เมื่อโครงสร้างเปลี่ยน &gt;5%")}</td></tr>
<tr><td>${t("Global warming potentials", "ค่าศักยภาพโลกร้อน (GWP)")}</td><td>IPCC AR6 (100-yr)</td></tr>
<tr><td>${t("Emission factors", "ค่าการปล่อย (emission factor)")}</td><td>TGO 2024 · IEA grid · IPCC</td></tr>
<tr><td>${t("Data source &amp; quality", "แหล่งข้อมูล &amp; คุณภาพ")}</td><td>${t("Metered · 100% traceable · uncertainty &lt;5%", "จากมิเตอร์ · ตรวจสอบได้ 100% · ความไม่แน่นอน &lt;5%")}</td></tr></tbody></table></div>
${foot(6)}</div></div>

<div class="page"><div class="pad">
<div class="block"><h2 class="sec"><span class="n">§</span>${t("GRI 305 content index", "ดัชนีเนื้อหา GRI 305")}</h2>
<table><thead><tr><th>${t("Disclosure", "การเปิดเผย")}</th><th>${t("Description", "รายละเอียด")}</th><th style="text-align:right">${t("Value", "ค่า")}</th></tr></thead><tbody>${gri}</tbody></table></div>
<div class="block"><h2 class="sec"><span class="n">§</span>${t("Standards alignment", "มาต°านที่สอดคล้อง")}</h2>
<div style="margin-left:36px">${stds}</div></div>
<div class="block"><h2 class="sec"><span class="n">§</span>${t("Independent limited assurance", "การให้ความเชื่อมั่นอย่างจำกัดโดยอิสระ")}</h2>
<div class="assure">${t("Based on limited assurance procedures conducted in accordance with ISO 14064-3 and ISAE 3410, nothing has come to our attention that causes us to believe the Scope 1, 2 and 3 GHG figures in this report are not fairly stated, in all material respects. Data is generated from calibrated source meters via SpareX FactoryOS with a complete audit trail — no spreadsheets, no manual estimates.", "จากขั้นตอนการให้ความเชื่อมั่นอย่างจำกัดตาม ISO 14064-3 และ ISAE 3410 ไม่พบสิ่งใดที่ทำให้เชื่อว่าตัวเลข GHG Scope 1, 2 และ 3 ในรายงานนี้ไม่ถูกต้องในสาระสำคัญ ข้อมูลสร้างจากมิเตอร์ต้นทางที่สอบเทียบแล้วผ่าน SpareX FactoryOS พร้อมร่องรอยการตรวจสอบครบถ้วน — ไม่ใช้สเปรดชีต ไม่ใช้การประมาณด้วยมือ")}</div>
<div class="sign"><div>${t("Prepared by · SpareX FactoryOS", "จัดทำโดย · SpareX FactoryOS")}</div><div>${t("Approved by · Sustainability Lead", "อนุมัติโดย · ผู้จัดการความยั่งยืน")}</div><div>${t("Independent verifier · [Assurance provider]", "ผู้ตรวจอิสระ · [หน่วยให้ความเชื่อมั่น]")}</div></div></div>
${foot(7)}</div></div>

</body></html>`;
}

function triggerDownload(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openHtml(html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** print-to-PDF: render the report in a hidden iframe and open the print dialog
 *  ("Save as PDF") — a real, vector, A4-paginated PDF with selectable text. */
function printReport(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0", opacity: "0" });
  iframe.onload = () => {
    const cw = iframe.contentWindow;
    if (!cw) return;
    // let fonts & layout settle, then invoke the browser's print → Save as PDF
    setTimeout(() => {
      cw.focus();
      cw.print();
      setTimeout(() => iframe.remove(), 60_000); // keep alive while the dialog is open
    }, 350);
  };
  document.body.appendChild(iframe);
  iframe.srcdoc = html;
}
/* ─────────────────────────────────────── ISO 50001 EnMS report ── */

/** override the report palette to an energy-blue theme for ISO 50001 */
const ISO_THEME = `<style>:root{--g:#0284c7;--g2:#0369a1;--g3:#075985;--soft:#f0f7fc}
th{background:#eaf4fb}.chip{background:#f0f7fc;border-color:#bae0fc;color:#0369a1}.call,.verdict{background:#eff8ff;border-color:#bae0fc}.call .v,.call .l,.verdict b{color:#0369a1}
td.bar span{background:linear-gradient(90deg,#38bdf8,#0284c7)}.cover{background:linear-gradient(160deg,#0c4a6e,#0284c7 62%,#06b6d4)}.assure{border-color:#0284c7;background:#f0f7fc}</style>`;

function buildIso50001Html(locale: string): string {
  const th = locale === "th";
  const L = (o: CZ) => (th ? o.th : o.en);
  const t = (en: string, ths: string) => (th ? ths : en);
  const now = new Date().toLocaleDateString(th ? "th-TH" : "en-GB", { year: "numeric", month: "long", day: "numeric" });
  const totalMwh = energySources.reduce((s, e) => s + e.mwh, 0);
  const srcMax = Math.max(...energySources.map((e) => e.mwh));
  const savedMwh = actionPlans.reduce((s, a) => s + a.mwh, 0);
  const savedBaht = actionPlans.reduce((s, a) => s + a.saving, 0);

  const srcRows = energySources.map((e) => `<tr><td>${esc(L(e.name))}</td><td class="bar" style="width:30%"><span style="width:${((e.mwh / srcMax) * 100).toFixed(0)}%"></span></td><td class="num">${e.mwh.toLocaleString()}</td><td class="num">${((e.mwh / totalMwh) * 100).toFixed(0)}%</td></tr>`).join("");
  const seuRows = seus.map((s) => `<tr><td>${esc(L(s.name))}<div class="mono" style="font-family:inherit">${esc(L(s.note))}</div></td><td class="num">${s.share}%</td></tr>`).join("");
  const enpiRows = enpis.map((e) => {
    const improved = e.better === "lower" ? e.current <= e.target : e.current >= e.target;
    return `<tr><td>${esc(L(e.name))}</td><td class="num">${e.baseline}</td><td class="num good">${e.current}</td><td class="num">${e.target}</td><td>${e.unit}</td><td class="num ${improved ? "good" : ""}">${improved ? "✓" : "→"}</td></tr>`;
  }).join("");
  const apRows = actionPlans.map((a) => `<tr><td>${esc(L(a.action))}</td><td>${esc(L(a.seu))}</td><td class="num good">${a.mwh.toLocaleString()}</td><td class="num">${baht(a.saving)}</td><td>${esc(L(a.status))}</td></tr>`).join("");
  const mvRows = mv.map((m) => `<tr><td>${esc(L(m.project))}</td><td>${m.option}</td><td class="num">${m.planned}</td><td class="num good">${m.verified}</td><td class="num ${m.verified >= m.planned ? "good" : ""}">${((m.verified / m.planned - 1) * 100).toFixed(0)}%</td></tr>`).join("");
  const mrRows = managementReview.decisions.map((d) => `<li>${esc(L(d))}</li>`).join("");
  const stds = enmsStandards.map((s) => `<span class="chip">✓ ${esc(L(s))}</span>`).join("");
  const mixSvg = svgDonut(energySources.map((e) => ({ value: e.mwh, color: e.color })));
  const enpiSvg = svgLine(enpiTrend, [{ key: "baseline", color: "#94a3b8", dashed: true }, { key: "actual", color: "#0284c7" }]);
  const mixLegend = energySources.map((e) => `<span class="lg"><i style="background:${e.color}"></i>${esc(L(e.name))}</span>`).join("");
  const foot = (n: number) => `<div class="pfoot"><span>SpareX FactoryOS™ · ${t("ISO 50001 Energy Report", "รายงานพลังงาน ISO 50001")}</span><span>${t("Page", "หน้า")} ${n} / 6</span></div>`;

  return `<!doctype html><html lang="${th ? "th" : "en"}"><head><meta charset="utf-8"><title>SpareX ISO 50001 Energy Report</title><style>${REPORT_CSS}</style>${ISO_THEME}</head><body>

<div class="page cover"><div class="rings">${COVER_RINGS}</div>
<div class="brand"><b>SpareX</b> FactoryOS™</div>
<div style="margin-top:96px;position:relative">
<div class="eyebrow">${enms.standard} · ${t("Energy Management System", "ระบบการจัดการพลังงาน")}</div>
<h1>${t("Energy Performance<br>Report", "รายงานสมรรถนะ<br>พลังงาน")}</h1>
<div class="lead">${t("Energy review, baseline, EnPIs, objectives and verified savings — a conformity summary for the ISO 50001:2018 energy management system.", "การทบทวนพลังงาน เส้นฐาน EnPI วัตถุประสงค์ และผลประหยัดที่ตรวจวัดแล้ว — สรุปความสอดคล้องกับระบบจัดการพลังงาน ISO 50001:2018")}</div></div>
<div class="meta"><div>
<div class="k">${t("Facility", "โรงงาน")}</div><div class="v">${t("Bangkok Plant 1", "โรงงานกรุงเทพ 1")}</div>
<div class="k" style="margin-top:12px">${t("Baseline year (EnB)", "ปีฐาน (EnB)")}</div><div class="v">${enms.baselineYear}</div>
<div class="k" style="margin-top:12px">${t("Issued", "ออกเมื่อ")}</div><div class="v">${now}</div></div>
<div class="seal">${t("Energy", "พลังงาน")}<b>-${enms.improvementPct}%</b>${t("vs baseline", "เทียบฐาน")}</div></div></div>

<div class="page"><div class="pad">
<h2 class="sec"><span class="n">§</span>${t("Management summary", "สรุปผู้บริหาร")}</h2>
<p style="color:#334155;margin:2px 0 16px">${t("Energy performance improved " + enms.improvementPct + "% against the " + enms.baselineYear + " baseline — beating the " + enms.targetImprovementPct + "% objective. The action-plan pipeline delivers a further " + savedMwh.toLocaleString() + " MWh/yr of savings, with " + enms.renewablePct + "% renewable electricity.", "สมรรถนะพลังงานดีขึ้น " + enms.improvementPct + "% เทียบปีฐาน " + enms.baselineYear + " — เกินเป้า " + enms.targetImprovementPct + "% แผนปฏิบัติการช่วยประหยัดเพิ่มอีก " + savedMwh.toLocaleString() + " MWh/ปี พร้อมพลังงานหมุนเวียน " + enms.renewablePct + "%")}</p>
<div class="kpis">
<div class="kpi"><div class="v">${enms.currentMWh.toLocaleString()}<span class="u"> MWh</span></div><div class="l">${t("Total energy · yr", "พลังงานรวม · ปี")}</div></div>
<div class="kpi"><div class="v">-${enms.improvementPct}%</div><div class="l">${t("EnPI vs baseline", "EnPI เทียบฐาน")}</div></div>
<div class="kpi"><div class="v">${enms.renewablePct}%</div><div class="l">${t("Renewable", "พลังงานสะอาด")}</div></div>
<div class="kpi"><div class="v">${baht(enms.annualCost)}</div><div class="l">${t("Energy spend · yr", "ค่าพลังงาน · ปี")}</div></div></div>
<div class="calls">
<div class="call"><div class="v">-${enms.improvementPct}%</div><div class="l">${t("Energy performance improvement", "สมรรถนะพลังงานดีขึ้น")}</div></div>
<div class="call"><div class="v">${savedMwh.toLocaleString()}</div><div class="l">${t("MWh/yr pipeline savings", "MWh/ปี จากแผนปฏิบัติการ")}</div></div>
<div class="call"><div class="v">${baht(savedBaht)}</div><div class="l">${t("Annual cost saving", "ประหยัดต่อปี")}</div></div></div>
<div class="verdict" style="margin-top:16px"><b>§ 5.2 ${t("Energy policy", "นโยบายพลังงาน")}</b><br>${esc(L(energyPolicy))}</div>
${foot(2)}</div></div>

<div class="page"><div class="pad">
<div class="block"><h2 class="sec"><span class="n">6.3</span>${t("Energy review · sources", "การทบทวนพลังงาน · แหล่งพลังงาน")}</h2>
<div class="sub">${t("Annual energy by source · MWh-equivalent", "พลังงานรายปีตามแหล่ง · MWh เทียบเท่า")}</div>
<div class="two"><div>
<table><thead><tr><th>${t("Source", "แหล่งพลังงาน")}</th><th></th><th style="text-align:right">MWh</th><th style="text-align:right">%</th></tr></thead><tbody>${srcRows}
<tr><td style="font-weight:700">${t("Total", "รวม")}</td><td></td><td class="num good">${totalMwh.toLocaleString()}</td><td class="num">100%</td></tr></tbody></table>
<div style="margin-top:10px">${mixLegend}</div></div>
<div style="text-align:center">${mixSvg}<div style="font-size:10.5px;color:var(--mut);margin-top:4px">${t("Energy mix", "สัดส่วนพลังงาน")}</div></div></div></div>
<div class="block"><h2 class="sec"><span class="n">6.3</span>${t("Significant Energy Uses (SEU)", "การใช้พลังงานที่มีนัยสำคัญ (SEU)")}</h2>
<div class="sub">${t("Uses accounting for the majority of consumption & improvement opportunity", "รายการที่ใช้พลังงานส่วนใหญ่และมีโอกาสปรับปรุง")}</div>
<table><thead><tr><th>${t("Significant energy use", "การใช้พลังงานที่มีนัยสำคัญ")}</th><th style="text-align:right">${t("Share", "สัดส่วน")}</th></tr></thead><tbody>${seuRows}</tbody></table></div>
${foot(3)}</div></div>

<div class="page"><div class="pad">
<div class="block"><h2 class="sec"><span class="n">6.5</span>${t("Energy baseline (EnB) & EnPI trend", "เส้นฐานพลังงาน (EnB) & แนวโน้ม EnPI")}</h2>
<div class="sub">${t("Specific energy consumption · kWh per unit · baseline year " + enms.baselineYear, "การใช้พลังงานจำเพาะ · kWh ต่อหน่วย · ปีฐาน " + enms.baselineYear)}</div>
${enpiSvg}
<div style="margin:6px 0 0"><span class="lg"><i style="background:#94a3b8"></i>${t("Baseline (EnB)", "เส้นฐาน (EnB)")}</span><span class="lg"><i style="background:#0284c7"></i>${t("Actual", "จริง")}</span></div></div>
<div class="block"><h2 class="sec"><span class="n">6.4</span>${t("Energy Performance Indicators (EnPI)", "ตัวชี้วัดสมรรถนะพลังงาน (EnPI)")}</h2>
<table><thead><tr><th>EnPI</th><th style="text-align:right">${t("Baseline", "ฐาน")}</th><th style="text-align:right">${t("Current", "ปัจจุบัน")}</th><th style="text-align:right">${t("Target", "เป้า")}</th><th>${t("Unit", "หน่วย")}</th><th style="text-align:right">${t("Met", "บรรลุ")}</th></tr></thead><tbody>${enpiRows}</tbody></table></div>
${foot(4)}</div></div>

<div class="page"><div class="pad">
<div class="block"><h2 class="sec"><span class="n">6.2</span>${t("Objectives, targets & action plans", "วัตถุประสงค์ เป้าหมาย & แผนปฏิบัติการ")}</h2>
<table><thead><tr><th>${t("Action", "การดำเนินการ")}</th><th>SEU</th><th style="text-align:right">MWh/yr</th><th style="text-align:right">${t("Saving", "ประหยัด")}</th><th>${t("Status", "สถานะ")}</th></tr></thead><tbody>${apRows}
<tr><td style="font-weight:700">${t("Total", "รวม")}</td><td></td><td class="num good">${savedMwh.toLocaleString()}</td><td class="num good">${baht(savedBaht)}</td><td></td></tr></tbody></table></div>
<div class="block"><h2 class="sec"><span class="n">9.1</span>${t("Monitoring, measurement & analysis (M&amp;V)", "การเฝ้าติดตาม วัด และวิเคราะห์ (M&amp;V)")}</h2>
<div class="sub">${t("Verified savings per IPMVP / ISO 50015", "ผลประหยัดที่ตรวจวัดตาม IPMVP / ISO 50015")}</div>
<table><thead><tr><th>${t("Project", "โครงการ")}</th><th>${t("Method", "วิธี")}</th><th style="text-align:right">${t("Planned", "แผน")}</th><th style="text-align:right">${t("Verified", "ตรวจวัด")}</th><th style="text-align:right">Δ</th></tr></thead><tbody>${mvRows}</tbody></table>
<div class="mono" style="font-family:inherit;margin-top:6px;color:var(--mut)">${t("MWh/yr · Δ = verified vs planned", "MWh/ปี · Δ = ตรวจวัดเทียบแผน")}</div></div>
${foot(5)}</div></div>

<div class="page"><div class="pad">
<div class="block"><h2 class="sec"><span class="n">9.3</span>${t("Management review", "การทบทวนโดยฝ่ายบริหาร")}</h2>
<div class="sub">${t("Review date", "วันที่ทบทวน")} ${L(managementReview.date)}</div>
<ul style="margin:0;padding-left:18px;color:#334155;font-size:12px;line-height:2">${mrRows}</ul></div>
<div class="block"><h2 class="sec"><span class="n">§</span>${t("Conformity &amp; continual improvement", "ความสอดคล้อง &amp; การปรับปรุงต่อเนื่อง")}</h2>
<div style="margin-left:36px">${stds}</div>
<div class="assure" style="margin-top:14px">${t("This report summarizes the energy performance of the ISO 50001:2018 energy management system at SpareX Bangkok Plant 1. Energy data is collected continuously from calibrated sub-meters; the energy baseline and EnPIs follow ISO 50006, and savings are verified per IPMVP / ISO 50015. The Plan-Do-Check-Act cycle drives continual improvement of energy performance.", "รายงานนี้สรุปสมรรถนะพลังงานของระบบจัดการพลังงาน ISO 50001:2018 ที่โรงงาน SpareX กรุงเทพ 1 ข้อมูลพลังงานเก็บต่อเนื่องจากมิเตอร์ย่อยที่สอบเทียบแล้ว เส้นฐานและ EnPI เป็นไปตาม ISO 50006 และผลประหยัดตรวจวัดตาม IPMVP / ISO 50015 วงจร Plan-Do-Check-Act ขับเคลื่อนการปรับปรุงสมรรถนะพลังงานอย่างต่อเนื่อง")}</div>
<div class="sign"><div>${t("Energy Manager · SpareX FactoryOS", "ผู้จัดการพลังงาน · SpareX FactoryOS")}</div><div>${t("Top Management approval", "อนุมัติโดยผู้บริหารสูงสุด")}</div></div></div>
${foot(6)}</div></div>

</body></html>`;
}

function downloadCert(sku: string, name: string, kg: number, locale: string) {
  const th = locale === "th";
  const t = (en: string, ths: string) => (th ? ths : en);
  const now = new Date().toLocaleDateString(th ? "th-TH" : "en-GB", { year: "numeric", month: "long", day: "numeric" });
  const html = `<!doctype html><html lang="${th ? "th" : "en"}"><head><meta charset="utf-8"><title>PCF Certificate · ${esc(sku)}</title>
<style>body{font-family:'Segoe UI',system-ui,'Sarabun',sans-serif;background:#f6faf8;color:#0f172a;display:flex;justify-content:center;padding:40px}
.cert{max-width:640px;width:100%;background:#fff;border:2px solid #6ee7b7;border-radius:20px;padding:40px;text-align:center;box-shadow:0 10px 40px rgba(5,150,105,.1)}
.eyebrow{letter-spacing:.2em;text-transform:uppercase;color:#059669;font-size:12px;font-weight:700}
.big{font-size:56px;font-weight:800;color:#059669;margin:14px 0 2px}h2{margin:6px 0}.mut{color:#64748b;font-size:13px}
.row{display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding:10px 0;font-size:14px}.row:last-child{border-bottom:1px solid #e2e8f0}
.badge{display:inline-block;background:#ecfdf5;border:1px solid #6ee7b7;color:#059669;border-radius:20px;padding:6px 16px;font-size:12px;font-weight:600;margin-top:18px}</style></head>
<body><div class="cert"><div class="eyebrow">🌿 SpareX FactoryOS · ${t("Product Carbon Footprint", "คาร์บอนฟุตพรินต์สินค้า")}</div>
<div class="big">${kg.toFixed(2)}</div><div class="mut">kgCO₂e / ${t("unit", "หน่วย")}</div>
<h2>${esc(name)}</h2><div class="mut" style="font-family:monospace">${esc(sku)}</div>
<div style="margin-top:22px;text-align:left">
<div class="row"><span class="mut">${t("Methodology", "วิธีการ")}</span><span>GHG Protocol · ISO 14067</span></div>
<div class="row"><span class="mut">${t("Boundary", "ขอบเขต")}</span><span>${t("Cradle-to-gate (Scope 1·2·3)", "แหล่งกำเนิดถึงประตูโรงงาน (Scope 1·2·3)")}</span></div>
<div class="row"><span class="mut">${t("Data source", "แหล่งข้อมูล")}</span><span>${t("Metered · 100% traceable", "จากมิเตอร์ · ตรวจสอบได้ 100%")}</span></div>
<div class="row"><span class="mut">${t("Issued", "ออกเมื่อ")}</span><span>${now}</span></div></div>
<div class="badge">✓ ${t("CBAM-ready · audit-grade", "พร้อม CBAM · ระดับออดิต")}</div></div></body></html>`;
  triggerDownload(`SpareX-PCF-${sku}.html`, html);
}
