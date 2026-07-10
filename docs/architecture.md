# FactoryOS Architecture

- [Information Architecture](#information-architecture)
- [Sitemap](#sitemap)
- [UX Flows](#ux-flows)
- [Component Architecture](#component-architecture)
- [3D Scene Architecture](#3d-scene-architecture)
- [Data Model](#data-model)
- [Database Architecture](#database-architecture)
- [API Architecture](#api-architecture)
- [Realtime & AI](#realtime--ai)

---

## Information Architecture

FactoryOS is organized as an **OS**, not a site: a persistent shell wrapping interchangeable
intelligence modules, all bound to one plant model.

```
SPAREX FACTORYOS™
├─ Public site (/)                      marketing / vision / live twin demo
└─ The OS (/os)            ← persistent shell: Sidebar + Topbar + Copilot
   ├─ Command Center        war room: KPIs · 3D twin · AI briefing · risk radar
   ├─ Digital Twin          full-screen interactive plant (4 data layers)
   ├─ Energy Intelligence Core™
   ├─ PeakShield AI™
   ├─ Production Intelligence™
   ├─ Predictive Asset Intelligence™
   ├─ Maintenance Intelligence™
   ├─ Carbon Intelligence Suite™
   └─ AI Factory Copilot™   global overlay, reachable from anywhere (⌘K)
```

Hierarchy of entities (the mental model the UI reflects): **Org → Site/Plant → Building →
Line → Asset → Sensor/Tag**.

## Sitemap

```
/                         Landing (Nav, Hero, Platform, Twin, Industries, Teams, CTA)
/os                       Command Center
/os/twin                  3D Digital Twin (full)
/os/energy                Energy Intelligence Core™
/os/peakshield            PeakShield AI™
/os/production            Production Intelligence™
/os/assets                Predictive Asset Intelligence™
/os/maintenance           Maintenance Intelligence™
/os/carbon                Carbon Intelligence Suite™
/api/copilot              POST — Copilot (Claude or scripted fallback)
```

## UX Flows

**Copilot flow** (global): trigger (sidebar / topbar / `⌘K` / inline `AskCopilot`) →
`COPILOT_EVENT` on `window` → slide-over opens → optional preloaded prompt → `POST /api/copilot`
→ render `{title, body, bullets}` → on network error, local scripted fallback. Never dead-ends.

**Twin inspection flow:** select asset (3D click *or* accessible list) → shared selection state
→ inspector updates (health, OEE, power, vibration, RUL) → if a failure is predicted, a CTA
links to the staged work order.

**Layer flow:** Health → Predictive → Energy → Carbon re-encodes node color/animation and the
legend, without remounting the scene.

**Detail-on-demand** (Shneiderman): overview (Command Center KPIs) → zoom/filter (module pages,
twin layers) → details (asset inspector, registers, Copilot explanations).

## Component Architecture

React Server Components by default; client islands only where interactivity/WebGL is needed.

```
app/layout.tsx (RSC)            fonts, metadata, <MotionConfig>, mounts <Copilot/> globally
├─ app/page.tsx (RSC)           landing; composes <Nav/> + RSC sections + <DigitalTwin/>
└─ app/os/layout.tsx (RSC)      <Sidebar/> + ambient backdrop + {children}
   └─ app/os/*/page.tsx (RSC)   each page: <Topbar/> + <ModuleHeader/> + KPIs + charts

Client islands ("use client"):
  components/twin/DigitalTwin.tsx   R3F canvas + scene + layers + inspector
  components/os/Copilot.tsx         global slide-over, event + ⌘K listener
  components/os/Sidebar.tsx         active-route nav (usePathname)
  components/os/Topbar.tsx          live status + copilot triggers
  components/os/charts.tsx          Recharts wrappers (themed)
  components/os/AskCopilot.tsx      thin button → openCopilot(prompt)
  components/ui/Reveal.tsx          Framer Motion scroll reveal

Shared (server-safe):
  components/ui/{Icon,SectionHeading,Sparkline,Wordmark}.tsx
  components/os/{KpiCard,ModuleHeader}.tsx
```

**State strategy:** intentionally local. Selection/layer state lives in the twin; Copilot
state in the slide-over; cross-component actions use a decoupled `window` CustomEvent bus
(`COPILOT_EVENT`). No global store is needed at this scale; Phase 1 introduces a realtime
store (Zustand or React Query) fed by the WebSocket — components keep their current props.

**Data contracts:** all UI reads from `lib/` (`factory.ts`, `telemetry.ts`). Swapping the
mock layer for live data is a `lib/` change, not a component change — the seam is deliberate.

## 3D Scene Architecture

`components/twin/DigitalTwin.tsx` — React Three Fiber. Built to never break SSR and to stay
cheap when off-screen.

```
<DigitalTwin> (client)
  guards:  mounted flag (no SSR WebGL) · frameloop = reduced ? "demand"
           : inView ? "always" : "never"  (pauses when scrolled away)
  <Canvas shadows dpr=[1,2] camera={pos:[9,8,9] fov:36}>
    <Scene layer selectedId onSelect>
      lights: ambient + 2 directional (key + indigo rim) + <Environment "city">
      floor:  plane + gridHelper + <ContactShadows>
      <BuildingBlock> ×4      production / utility / warehouse / office (RoundedBox + Html label)
      <FlowPulses active>     Grid→MDB→buildings; spheres lerp'd along segments in useFrame
      <MachineNode> ×N        per asset: pulse ring + footprint + body + beacon/power-bar + Html
      <OrbitControls>         rotate + zoom; autoRotate; clamped polar angle & distance
```

**Layer system:** a single `layer` prop drives `nodeColor()` (health/predictive = status
color, energy = cyan, carbon = green→amber→red by CO₂) and per-node behavior (predictive
dims non-risk assets and accelerates risk-asset pulses; energy swaps the beacon for a
kW-scaled bar; energy flow pulses brighten).

**Performance:** geometry/material refs animated in `useFrame` (no React re-render per frame);
`frameloop` gating; `dpr` cap; `Html occlude={false}` only on selection/hover.

**Accessibility/fallback:** the inspector's asset list mirrors the scene's selection, so the
twin is fully usable without WebGL or a pointer.

## Data Model

The prototype kernel (`lib/factory.ts`) — the contract the backend must satisfy:

```ts
Building { id, name, kind: production|utility|warehouse|office, x,z,w,d,h, tint }
Asset    { id, name, type, buildingId, line, x, z,
           status: healthy|warning|critical, health 0..100, oee, powerKw,
           tempC, vibration, rulDays|null, co2KgH, detail }
FlowNode { id, label, tier 0..4, kw }   FlowLink { from, to }
TwinLayer = health | predictive | energy | carbon
```

`lib/telemetry.ts` derives KPIs and **deterministic** (seeded) time series so server and
client render identically — the rule that prevents R3F/Next hydration mismatches.

## Database Architecture

Time-series + relational, multi-tenant. **PostgreSQL** (relational + RLS) with the
**TimescaleDB** extension for sensor data; **Supabase** for auth, storage, and row-level
security.

```
-- Relational (Postgres)
orgs(id, name, plan)
sites(id, org_id→orgs, name, timezone, tariff_id)
buildings(id, site_id→sites, name, kind, geo jsonb)        -- 3D placement & footprint
lines(id, building_id→buildings, name)
assets(id, line_id→lines, name, type, model, install_date, geo jsonb)
sensors(id, asset_id→assets, tag, unit, kind)              -- vibration|thermal|current|power...
tariffs(id, on_peak_rate, off_peak_rate, demand_charge, contract_demand)
work_orders(id, asset_id→assets, status, priority, task, parts jsonb, due_at, created_by)
predictions(id, asset_id→assets, kind, probability, rul_days, model_version, created_at)
alerts(id, asset_id→assets, severity, message, ack_by, ack_at, created_at)
esg_reports(id, site_id→sites, period, scope1, scope2, payload jsonb, generated_at)
users(id, org_id→orgs, role, email)                        -- RBAC: CEO…energy_manager

-- Time-series (Timescale hypertables)
readings(time, sensor_id→sensors, value)                   -- hypertable, primary telemetry
kpi_rollups(time, asset_id, oee, availability, performance, quality, power_kw, co2_kg)
  -- continuous aggregates: 1m → 1h → 1d for fast trend queries & retention tiers
```

**Tenancy & security:** every row keyed to `org_id`; Postgres **RLS** enforces isolation;
roles map to module/action scopes. Retention: raw `readings` downsampled via continuous
aggregates; cold data tiered to object storage.

## API Architecture

A thin, typed API over the same contracts the UI already uses.

```
REST (Next.js Route Handlers / edge functions)
  GET  /api/sites/:id/overview          Command Center KPIs + counts
  GET  /api/assets?site=&status=         asset register (filter/sort)
  GET  /api/assets/:id                   asset detail + latest readings
  GET  /api/assets/:id/timeseries        sensor history (range, downsample)
  GET  /api/energy/:site/profile         24h TOU load profile
  GET  /api/peak/:site/forecast          history + AI peak forecast
  GET  /api/carbon/:site/report          ESG report (CDP/GRI-aligned)
  POST /api/work-orders                  create/update (auto from predictions)
  POST /api/copilot                      ← implemented (Claude + scripted fallback)

Realtime
  WS   /ws/telemetry?site=               live KPI/asset deltas (fan-out from MQTT)

Ingestion (edge gateway, not browser-facing)
  MQTT / OPC-UA  →  stream processor  →  Timescale + WS broadcast
```

Contracts mirror the TypeScript types in `lib/factory.ts`, so the front-end swaps mock →
live with no component changes. Auth via Supabase JWT; rate-limited; per-org scoping.

## Realtime & AI

**Realtime spine (Phase 1):** edge gateway subscribes to plant **MQTT/OPC-UA** topics →
normalizes to the `sensors`/`readings` schema → writes Timescale **and** broadcasts deltas
over **WebSocket**. The browser keeps a single WS subscription per site; a lightweight store
applies deltas; the twin and charts re-render from the same data they already consume.

**AI architecture:**
- **Copilot** (`app/api/copilot/route.ts`) — Anthropic Claude grounded by a system prompt of
  live plant context; **graceful scripted fallback** (`lib/copilot.ts`) means zero-config
  operation. Phase 2 adds **tool use** (query the warehouse, draft work orders, render reports)
  and provider routing (Claude / OpenAI / Gemini) behind one interface.
- **Predictive models** — RUL from vibration/thermal/current fusion; peak-demand forecasting;
  anomaly/hidden-load detection. Served behind `/api/predictions`, versioned, writing to the
  `predictions` table that feeds the Risk Radar and auto work orders.
- **Closed loop** — PeakShield/Maintenance write actions back through the gateway with
  guardrails and human-in-the-loop approval (mobile-approvable).
