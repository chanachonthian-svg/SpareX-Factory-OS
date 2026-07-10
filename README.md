# SPAREX FACTORYOS™

### The Operating System for Intelligent Factories.

FactoryOS is not a monitoring dashboard — it is the **central nervous system** of the
factory. It senses, reasons, and acts across **energy, assets, production, and carbon** in
real time, with a fully interactive **3D Digital Twin** at its core and an **AI Factory
Copilot** as its natural-language surface.

A premium, dark, glassmorphic enterprise SaaS experience — benchmarked against Palantir
Foundry, Tesla Mission Control, Siemens Xcelerator, Schneider EcoStruxure, and the OpenAI
& Vercel platforms.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:3400
npm run build    # production build (type-checked)
npm start        # serve the production build
```

Zero-config: the **AI Copilot** works out of the box with grounded, scripted intelligence.
Add an `ANTHROPIC_API_KEY` (see `.env.example`) to switch it to live Claude responses.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | **Next.js 15** (App Router) · **React 19** · **TypeScript** |
| Styling | **TailwindCSS 3** · custom glassmorphic design system |
| Animation | **Framer Motion** |
| 3D engine | **Three.js** · **React Three Fiber** · **drei** |
| Visualization | **Recharts** + dependency-free SVG sparklines/bars |
| AI | **Anthropic Claude** (Copilot), graceful scripted fallback |
| Realtime *(designed)* | MQTT / WebSocket ingestion → see `docs/architecture.md` |
| Backend *(designed)* | Supabase / PostgreSQL + TimescaleDB → see `docs/architecture.md` |

## Routes

| Route | Module |
| --- | --- |
| `/` | Landing page (vision, platform, live twin showcase) |
| `/os` | **Command Center** — war room + 3D twin centerpiece |
| `/os/twin` | **3D Digital Twin** — full-screen interactive plant |
| `/os/energy` | **Energy Intelligence Core™** |
| `/os/peakshield` | **PeakShield AI™** |
| `/os/production` | **Production Intelligence™** |
| `/os/assets` | **Predictive Asset Intelligence™** |
| `/os/maintenance` | **Maintenance Intelligence™** |
| `/os/carbon` | **Carbon Intelligence Suite™** |
| `/api/copilot` | AI Factory Copilot endpoint |

## Project structure

```
sparex-factoryos/
├─ app/
│  ├─ page.tsx              # landing
│  ├─ os/                   # the OS: layout (sidebar) + module pages
│  └─ api/copilot/          # Copilot endpoint (Claude + fallback)
├─ components/
│  ├─ twin/DigitalTwin.tsx  # ⭐ the 3D digital twin (R3F)
│  ├─ os/                   # shell, copilot, charts, KPI cards
│  ├─ landing/              # marketing nav + sections
│  └─ ui/                   # icon registry, reveal, sparkline, wordmark
├─ lib/
│  ├─ factory.ts            # ⭐ one source of truth: buildings + assets + flow
│  ├─ telemetry.ts          # deterministic (hydration-safe) time series + KPIs
│  ├─ copilot.ts            # grounding, prompts, scripted intelligence
│  ├─ site.ts               # brand, modules, industries, personas
│  └─ utils.ts              # cn, formatters, seeded RNG, copilot event bus
└─ docs/                    # the strategy & architecture deliverables
```

## Deliverables map

This repo is the implementation of the 20 requested deliverables. Where each lives:

| # | Deliverable | Where |
| --- | --- | --- |
| 1 | Product Vision | [docs/product.md](docs/product.md) |
| 2 | Product Roadmap | [docs/product.md](docs/product.md#roadmap) |
| 3 | Information Architecture | [docs/architecture.md](docs/architecture.md#information-architecture) |
| 4 | User Journey | [docs/product.md](docs/product.md#user-journeys) |
| 5 | UX Flow | [docs/architecture.md](docs/architecture.md#ux-flows) |
| 6 | Website Sitemap | [docs/architecture.md](docs/architecture.md#sitemap) |
| 7 | Landing Page Design | `app/page.tsx` + `components/landing/` |
| 8 | Dashboard Design | `app/os/` (Command Center + modules) |
| 9 | 3D Digital Twin Design | `components/twin/DigitalTwin.tsx` |
| 10 | Mobile App Design | [docs/product.md](docs/product.md#mobile) (responsive web shipped; native designed) |
| 11 | Design System | [docs/design-system.md](docs/design-system.md) + `tailwind.config.ts` + `globals.css` |
| 12 | Wireframes | Realized directly as hi-fi UI (code) |
| 13 | High-Fidelity UI | The entire running app |
| 14 | React Component Architecture | [docs/architecture.md](docs/architecture.md#component-architecture) |
| 15 | Database Architecture | [docs/architecture.md](docs/architecture.md#database-architecture) |
| 16 | API Architecture | [docs/architecture.md](docs/architecture.md#api-architecture) |
| 17 | Production-ready Next.js code | This repository |
| 18 | TailwindCSS Design System | `tailwind.config.ts`, `app/globals.css` |
| 19 | Framer Motion Animations | `Reveal`, Copilot slide-over, page transitions |
| 20 | Three.js 3D Scene Architecture | [docs/architecture.md](docs/architecture.md#3d-scene-architecture) |

## Status & next steps

This is a **runnable, production-grade vertical slice** — the landing experience, the
Command Center, the 3D twin, all eight modules, and the Copilot are live on mock telemetry
that is wired through a single source of truth (`lib/factory.ts`). The realtime ingestion
(MQTT/WebSocket), the Supabase/Postgres+Timescale persistence, multi-tenant auth, and the
native mobile app are **architected in `docs/`** and ready to implement against the same
data contracts. See `docs/product.md` for the roadmap.
