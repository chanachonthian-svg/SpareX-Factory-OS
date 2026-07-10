# FactoryOS Design System

A premium, dark, glassmorphic system. Minimal luxury, motion-driven, AI-first. Defined in
`tailwind.config.ts` (tokens) and `app/globals.css` (component classes).

## Principles

1. **Calm surface, dense signal.** Near-black canvas so data and status colors carry meaning.
2. **Glass over grid.** Translucent panels float above a faint engineering grid.
3. **Color = status, not decoration.** Cyan/indigo brand; green/amber/red strictly for health.
4. **Motion clarifies.** Reveals, slide-overs, and pulses guide attention; never gratuitous,
   always honoring `prefers-reduced-motion`.

## Color tokens

```
ink     950 #05060a  900 #0a0c12  800 #11141d  700 #1a1f2b  600 #272d3d   // surfaces
brand   400 #22d3ee  500 #06b6d4  ...  (cyan — primary)
accent  400 #818cf8  500 #6366f1  600 #4f46e5   (indigo — AI / secondary)
status  ok #34d399   warn #f59e0b   crit #f43f5e
```

Each module also carries an **accent** (see `lib/site.ts`) used to color-code its icon,
hero glow, and KPI cards: Energy cyan, PeakShield amber, Production emerald, Predictive
Assets pink, Maintenance blue, Carbon green, Copilot indigo.

## Typography

- **Sans:** Inter (`--font-sans`) — UI and headings, tight tracking on large sizes.
- **Mono:** JetBrains Mono (`--font-mono`) — reserved for code/IDs.
- **Numerals:** `tabular-nums` (`.tabular`) for all metrics so figures align.

## Surfaces & elevation

| Class | Use |
| --- | --- |
| `.glass` / `.glass-strong` | Translucent blurred panels (nav, sidebar, copilot) |
| `.panel` | Primary content card (gradient + inset highlight + soft shadow) |
| `.card` | Lighter content card |
| `.chip` / `.eyebrow` | Status pills and section kickers |
| `shadow-glow` / `shadow-glow-lg` | Cyan glow for primary actions and the 3D twin |
| `.grid-bg` | The faint engineering grid backdrop |

## Buttons

`.btn-glow` (primary, gradient + glow) · `.btn-primary` (white) · `.btn-ghost` (outlined glass).
All share focus-visible rings and an active press-scale.

## Motion

- **Reveal** (`components/ui/Reveal.tsx`) — fade-up on scroll, `once`, eased `[0.22,1,0.36,1]`.
- **Copilot** — spring slide-over (stiffness 320 / damping 34) with backdrop fade.
- **Twin** — per-asset pulse rings whose speed scales with severity; animated energy-flow pulses.
- **Keyframes** (Tailwind): `marquee`, `float`, `pulse-ring`, `fade-up`, `shimmer`, `spin-slow`.
- Global `MotionConfig reducedMotion="user"` + a CSS reduced-motion guard.

## Iconography

Single registry (`components/ui/Icon.tsx`) mapping semantic `IconName`s → lucide-react, so
modules reference icons by meaning (`energy`, `asset`, `carbon`) not by library symbol.

## Data visualization

- **Recharts** for time-series (area/line/bar/composed) with a shared dark theme
  (`components/os/charts.tsx`): hairline grid, translucent tooltip, no axis lines.
- **Dependency-free SVG** for sparklines (`ui/Sparkline.tsx`) and horizontal bars (`HBars`)
  to keep KPI cards light and deterministic.

## Accessibility

- WCAG-minded contrast on the dark palette; status never encoded by color alone (labels + dots).
- Full keyboard path: Copilot `⌘K`/`Esc`, focus-visible rings, semantic landmarks.
- The 3D twin has a parallel **accessible asset list** (clickable, same selection state) so the
  experience never depends solely on WebGL or a pointer.

## Responsive

Mobile-first. The sidebar collapses below `lg`; KPI grids reflow 2→3→6; the twin and charts
scale fluidly. Touch (`pointer: coarse`) disables auto-rotate drag conflicts on the twin.
