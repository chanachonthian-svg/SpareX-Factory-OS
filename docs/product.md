# FactoryOS — Product Vision, Roadmap & Journeys

## Product Vision

**SPAREX FACTORYOS™ is the operating system for intelligent factories.**

Traditional factory software is a stack of disconnected dashboards — SCADA here, a CMMS
there, an energy meter portal, an ESG spreadsheet. Each one *shows* data. None of them
*reason* across it, and none of them *act*.

FactoryOS collapses that stack into a single operating system with one shared model of the
plant. Like an OS, it has:

- **A kernel** — one real-time model of every building, line, asset, and energy flow
  (`lib/factory.ts` is the prototype of this contract).
- **System services** — eight intelligence modules (energy, peak, production, assets,
  maintenance, carbon) that read and write that shared model.
- **A shell** — the Command Center and 3D Digital Twin: one pane of glass for every leader.
- **A natural-language interface** — the AI Factory Copilot, so anyone can query, predict,
  and command the plant in plain language.

> **Positioning:** FactoryOS is not a monitoring dashboard. It is the central nervous system
> of the factory — sensing, reasoning, and acting in real time.

### Mission

Transform traditional factories into **autonomous, AI-driven, energy-efficient, and
predictive** manufacturing environments.

### Design north star

Apple's simplicity · Tesla's innovation · Palantir's intelligence · Stripe's clean UX ·
OpenAI's sense of the future. A premium enterprise SaaS experience — **never** a SCADA HMI.

### Differentiators

1. **One model, not many dashboards.** Every module and the twin read the same source of truth.
2. **3D Digital Twin as the home screen**, not a buried feature.
3. **AI-first.** The Copilot is a first-class surface, not a chat bubble bolted on.
4. **From sensing to acting.** PeakShield and Maintenance Intelligence close the loop
   (auto load-shedding, auto work orders), not just alerting.
5. **Audit-grade ESG** generated from the same metered data that runs operations.

---

## Roadmap

A phased path from this slice to a billion-dollar platform.

### Phase 0 — Foundation *(this repository)*
- Next.js 15 app shell, design system, 3D twin, eight module surfaces, Copilot.
- Single shared factory model + deterministic telemetry simulation.

### Phase 1 — Live data spine (Q1)
- MQTT/OPC-UA edge gateway → WebSocket fan-out → Timescale/Postgres.
- Replace the simulation layer behind the existing data contracts (`lib/factory.ts`,
  `lib/telemetry.ts`) — UI unchanged.
- Tag mapping & asset onboarding wizard.

### Phase 2 — Intelligence at depth (Q2)
- Production-grade ML: vibration/thermal RUL models, peak forecasting, anomaly detection.
- Copilot tool-use: query the live warehouse, generate reports, draft work orders.
- Alerting & escalation rules engine.

### Phase 3 — Closed loop & multi-tenant (Q3)
- Write-back to PLC/BMS via gateway for automated load shedding (PeakShield) with guardrails.
- Multi-plant, multi-tenant RBAC; org → site → line → asset hierarchy.
- Native mobile app (see below).

### Phase 4 — Marketplace & autonomy (Q4+)
- Module marketplace + partner integrations (SAP, Maximo, historians).
- Autonomous optimization agents with human-in-the-loop approvals.
- Benchmarking network across the FactoryOS fleet.

---

## User Journeys

FactoryOS serves seven roles from one source of truth.

| Role | Entry point | Core job-to-be-done |
| --- | --- | --- |
| **CEO** | Command Center | Board-ready plant performance & ESG in one glance |
| **Plant Director** | Command Center → Twin | Cross-line situational awareness & risk triage |
| **Operations Manager** | Production Intelligence | Daily OEE & loss recovery |
| **Production Manager** | Production → Downtime | Schedule adherence, root-cause |
| **Maintenance Manager** | Maintenance Intelligence | Prescriptive work orders, parts readiness |
| **Reliability Engineer** | Predictive Assets | RUL, failure modes, asset health trends |
| **Energy Manager** | Energy Core + PeakShield | Cost-per-unit, demand peaks, anomalies |

### Example journey — Energy Manager avoids a demand-charge penalty
1. Opens **Command Center**; the Peak KPI shows "Watch" amber.
2. Clicks into **PeakShield AI** — predicted peak 3,120 kW vs. 3,000 kW limit.
3. Sees **Auto-Pilot ON**: AI is already delaying Chiller #3 + Air Comp #2 by 15 min.
4. Asks the **Copilot**: *"Predict next month's electricity bill."* → ฿1.25M (+8%), with
   ฿180K avoidable.
5. Confirms the shed schedule. Penalty avoided, logged to the carbon ledger automatically.

### Example journey — Reliability Engineer prevents a failure
1. **Predictive Risk Radar** on the Command Center flags **Chiller B** (critical).
2. Opens **Predictive Assets** → vibration trend crossing the 5.0 mm/s alarm; 85% failure
   probability in 3 days.
3. A **work order is already staged** in Maintenance Intelligence with parts confirmed.
4. Approves it; the twin's Chiller B node returns to green after service.

---

## Mobile

The shipped app is fully **responsive** (the Command Center, modules, and Copilot adapt to
tablet/phone widths). The **native mobile app** (Phase 3) is designed as a focused companion,
not a port:

- **Today** — the AI briefing + top 3 risks + one-tap Copilot.
- **Alerts** — push notifications for critical assets & peak events with acknowledge/escalate.
- **Twin Lite** — a touch-optimized asset browser (list + 3D on capable devices).
- **Approvals** — approve work orders and load-shed actions on the go.

Built on React Native (Expo) sharing the same `lib/` data contracts and design tokens.
