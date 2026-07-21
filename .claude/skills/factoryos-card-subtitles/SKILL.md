---
name: factoryos-card-subtitles
description: >-
  The house rule for the muted subtitle line under a card, panel, or section
  title in SpareX FactoryOS. Use this whenever you write, edit, or review the
  `sub`/subtitle on any Panel/Card/ModuleHeader — including new cards — and
  whenever a subtitle is just a time range, unit, or scope tag ("last 12 months",
  "MTD", "tCO₂e / month", "15-min window"). If you are adding a card to the
  Energy, Power Quality, RPM, Vision, Production, Sustainability, Twin, or any
  FactoryOS module and it has a title with a muted line under it, apply this.
---

# FactoryOS card subtitles

The title says **what the card is** ("Bill Trend"). The subtitle's job is to say,
in a glance, **what the card does for me** — the question it answers or the
decision it supports. A subtitle that only restates a time range, a unit, or a
scope tag wastes the one line the user actually reads to decide "do I care about
this card right now?"

`Bill Trend / last 12 months` tells the user nothing they can't already see from
the 12 bars on the x-axis. `Bill Trend / 12-month spend vs budget` tells them the
card exists to answer "are we drifting over budget?" — that's the line worth
printing.

## The rule

Write the subtitle as **the answer to "so what does this tell me?"** — the
insight, comparison, or decision the card enables. Lead with function. If a
time/scope qualifier genuinely adds context, keep it, but it rides *after* the
function, never *instead of* it.

Two quick tests before you ship a subtitle:

1. **The x-axis test** — if the subtitle only says something the chart's own
   axes/labels already show (the time span, the unit), it's dead weight. Rewrite.
2. **The scan test** — read `title` + `subtitle` out loud. Could a plant manager
   who's never seen the card say what it's *for*? If not, it's not doing its job.

## Do / Don't

Real FactoryOS cards. The pattern to move away from is on the left.

| Card | ❌ Restates scope/unit | ✅ Says what it tells you |
|---|---|---|
| Bill Trend | `last 12 months` | `12-month spend vs budget` |
| Live Load Profile | `Time-of-Use` | `Live draw vs the 3,000 kW contract` |
| Demand | `15-min window` | `The value your bill is charged on` |
| Top 5 Consumers | — (no sub) | `Who's drawing the most right now` |
| Bill Breakdown | `MTD` | `Where this month's ฿ actually go` |
| Night Baseload | `22:00–06:00` | `Power burned while the plant sleeps` |
| Power Factor | — | `PF vs the 0.85 penalty line` |
| Single Line Diagram | `MDB-1` | `Live power flow through every board` |
| Emissions by Source | `MTD · tCO₂e (Scope 1·2)` | `Which processes emit the most` |
| FMEA | `risk priority number = S × O × D` | `The failure modes most worth fixing` |

Notice the ✅ column reads like the start of a sentence the user was already
thinking. It names a comparison ("vs budget", "vs contract"), a subject
("who", "where", "which"), or a stake ("penalty line", "wasted"). That's the
tell that a subtitle is pulling its weight.

## When a qualifier really matters

Some qualifiers are load-bearing — a tariff rate, a standard, an as-of time. Keep
them, but attach them to the function so the line still leads with meaning:

- `Where this month's ฿ go · from the incomer meters` (traceability matters here)
- `PF vs the 0.85 penalty line · updated live`

Never let the qualifier be the *whole* line when the card's purpose is unstated.

## Length and tone

- **≤ ~7 words.** It's a whisper under the title, not a sentence. If it needs a
  clause, cut until it doesn't.
- Plain language a shift supervisor uses, not the feature name. "Who's drawing
  the most" beats "Consumer ranking by demand."
- Sentence case, no terminal period (it's a label, not prose). A middot `·`
  separates function from an optional trailing qualifier.

## Bilingual (EN / TH)

Every subtitle is an `L({ en, th })` (or a plain string only when identical in
both). Write the **TH first as natural spoken Thai**, then the EN — don't
translate word-for-word. The Thai should sound like something a Thai engineer
would actually say on the floor:

- `12-month spend vs budget` → `ค่าไฟ 12 เดือนเทียบงบ`
- `The value your bill is charged on` → `ค่าที่บิลเอาไปคิดเงิน`
- `Power burned while the plant sleeps` → `ไฟที่เผาทิ้งตอนโรงงานหลับ`

Keep engineering loanwords engineers say (OEE, PF, THD, MDB, Scope 1·2·3) in
their usual form; don't transliterate equipment or standard names. This matches
the project's existing Thai-copy convention.

## Where these live

Subtitles are the `sub` prop on the shared `Panel`/`Card` components (e.g.
`components/energy/EnergyWorkflow.tsx` `Panel`, `components/carbon/CarbonSuite.tsx`
`Card`) or the `subtitle` prop on `components/os/Topbar.tsx`. Edit the prop at the
call site; don't touch chart axis labels, KPI stat labels, chips, or table
headers — those are data, not the card's purpose line.
