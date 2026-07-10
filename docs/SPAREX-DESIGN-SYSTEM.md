# SpareX Design System

**v1.0 — the visual language of intelligent industry.**

A dark, glassmorphic, command-center design language for premium industrial AI software.
It powers **SpareX FactoryOS™** and is the standard for every SpareX product.

> Living reference: run the app and open **`/design`** for the interactive style guide.
> Tokens are codified in [`tailwind.config.ts`](../tailwind.config.ts) and component classes
> in [`app/globals.css`](../app/globals.css).

---

## 1 · Principles

1. **Calm surface, dense signal.** A near-black canvas so data and status colors carry meaning.
2. **Glass over grid.** Translucent panels float above a faint engineering grid for depth.
3. **Color = status, not decoration.** Cyan/indigo is the brand; green·amber·red are *only* for health.
4. **Motion clarifies.** Reveals, slide-overs and pulses guide attention — never decorate. Honor `prefers-reduced-motion`.

Benchmarks: Linear · Vercel · Palantir Foundry · Tesla Mission Control · Apple HIG · Stripe.

---

## 2 · Color tokens

### Brand — Cyan (primary)
`50 #ecfeff · 100 #cffafe · 200 #a5f3fc · 300 #67e8f9 · 400 #22d3ee · 500 #06b6d4 · 600 #0891b2 · 700 #0e7490`
Primary actions, links, focus, brand gradient. Default usage: **brand-400**.

### Accent — Indigo (AI / secondary)
`400 #818cf8 · 500 #6366f1 · 600 #4f46e5`
Reserved for AI surfaces (Copilot, gradients paired with cyan).

### Ink — Surfaces
`950 #05060a (canvas) · 900 #0a0c12 · 800 #11141d · 700 #1a1f2b · 600 #272d3d`

### Status — health only
`ok #34d399 · warn #f59e0b · crit #f43f5e`
Never use status colors for decoration. Always pair color with a label/dot (not color alone).

### Module accents (color-coding)
Energy `#22d3ee` · PeakShield `#f59e0b` · Production `#34d399` · Assets `#f472b6` ·
Maintenance `#60a5fa` · Carbon `#4ade80` · Copilot/AI `#818cf8` · Twin `#a78bfa`

### Lines & text
Hairline border `rgba(255,255,255,0.08–0.10)` · text primary `#e7ebf3` · muted `#8b93a7`.

### Data-viz categorical palette
`#22d3ee #818cf8 #34d399 #f59e0b #f43f5e #f472b6 #4ade80 #60a5fa #a78bfa`

---

## 3 · Typography

- **Sans — Anuphan** (`--font-sans`): UI & headings, native Thai + Latin support. Tight tracking on large sizes (`-0.02em`).
- **Mono — JetBrains Mono** (`--font-mono`): code, IDs, and `tabular-nums` figures.

| Role | Size / weight |
| --- | --- |
| Display | `text-5xl / 6xl` · 600 · tight |
| Heading | `text-3xl` · 600 |
| Subhead | `text-lg` · 600 |
| Body | `text-base / sm` · 400 |
| Caption | `text-xs` · 400–500 |
| Eyebrow | `text-xs` · 600 · uppercase · `tracking-[0.18em]` · brand-200 |

All metrics use `.tabular` (`tabular-nums`) so figures align.

---

## 4 · Spacing, radius & layout

- **Spacing**: Tailwind 4-pt scale. Card padding `p-4 → p-6`; section rhythm `space-y-6 → space-y-9`.
- **Radius**: controls `rounded-lg/xl` · cards `rounded-2xl` · hero/3D `rounded-3xl` · pills `rounded-full`.
- **Container**: `.container-px` → `max-w-7xl` + responsive padding.
- **Grid backdrop**: `.grid-bg` (56px) + soft "aurora" blur blobs behind content.
- **App layout**: left product sidebar (pin/unpin, 64↔256px) → contained section sub-rail card → content.

---

## 5 · Surfaces & elevation

| Class | Use |
| --- | --- |
| `.glass` / `.glass-strong` | Translucent blurred panels — nav, sidebar, copilot |
| `.panel` | Primary content card (gradient + inset highlight + soft shadow) |
| `.card` | Lighter content card |
| `.chip` / `.eyebrow` | Status pills & section kickers |
| `shadow-glow` / `shadow-glow-lg` | Cyan glow for primary actions & the 3D twin |

---

## 6 · Components

- **Buttons**: `.btn-glow` (primary, gradient+glow) · `.btn-primary` (white) · `.btn-ghost` (outlined glass). Focus-visible ring + active press-scale.
- **Chips / badges**: status pills (color + dot + label).
- **KPI card**: label (uppercase) + delta pill + big tabular value + sparkline; accent blur in corner.
- **Score ring**: SVG circular progress, color by score; soft drop-shadow.
- **Bars**: dependency-free HBars with cyan→indigo gradient fill.
- **Inputs**: glass field, `focus-within` brand border.
- **Module workspace**: contained "section navigator" card (title + icon + 5 items) — distinct from the product sidebar so the two never read as stacked navs.

---

## 7 · Motion

- **Reveal** — fade-up on scroll (`once`, eased `[0.22,1,0.36,1]`).
- **Slide-over** — spring (stiffness 320 / damping 34) + backdrop fade (Copilot).
- **Pulse / glow** — severity-scaled pulse rings; cyan glow on primary & AI surfaces.
- **Keyframes**: `marquee · float · pulse-ring · fade-up · shimmer · spin-slow`.
- Global `MotionConfig reducedMotion="user"` + a CSS reduced-motion guard.

---

## 8 · Iconography

Single semantic registry ([`components/ui/Icon.tsx`](../components/ui/Icon.tsx)) mapping meaning →
**lucide-react** (`energy`, `asset`, `carbon`…). Stroke **1.75**. Reference icons by meaning, not symbol.

---

## 9 · Accessibility

- WCAG-minded contrast on the dark palette; **status never by color alone** (label + dot).
- Full keyboard path: focus-visible rings, `⌘K`, `Esc`; semantic landmarks.
- 3D twin has a parallel accessible asset list (same selection state) — never depends solely on WebGL.

---

## 10 · Do & Don't

| ✅ Do | ❌ Don't |
| --- | --- |
| Keep the canvas near-black; let data glow | Tint large areas with brand color |
| Use status colors only for health | Use red/green as decoration |
| One accent per module for coding | Rainbow a single view |
| Pair color with a label or dot | Encode meaning by color alone |
| Motion that guides | Motion that loops for its own sake |
