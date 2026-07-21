import Link from "next/link";
import { Nav } from "@/components/landing/Nav";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { AskCopilot } from "@/components/os/AskCopilot";
import { DigitalTwin } from "@/components/twin/DigitalTwin";
import { brand, modules, benchmarks, industries, personas, stats } from "@/lib/site";
import { ArrowRight, Sparkles, Activity, Boxes, Cpu, Gauge } from "lucide-react";

export default function Landing() {
  return (
    <>
      <Nav />

      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="grid-bg absolute inset-0 opacity-[0.18]" />
          <div className="absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-brand-500/12 blur-[140px]" />
          <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-accent-500/12 blur-[120px]" />
        </div>

        <div className="container-px">
          <Reveal>
            <span className="eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              Industrial AI Operating System
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 max-w-4xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              The Operating System for{" "}
              <span className="text-brand-gradient">Intelligent Factories</span>.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-white/65">
              {brand.product} is not a monitoring dashboard. It is the{" "}
              <span className="text-white">central nervous system</span> of the
              factory — sensing, reasoning, and acting across energy, assets,
              production, and carbon in real time.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn-glow px-6 py-3 text-base">
                Launch FactoryOS <ArrowRight size={18} />
              </Link>
              <AskCopilot prompt="What can FactoryOS do for my plant?" className="btn-ghost px-6 py-3 text-base">
                <Sparkles size={17} /> Ask the Copilot
              </AskCopilot>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <dl className="mt-16 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {s.value}
                  </dt>
                  <dd className="mt-1 text-sm text-white/50">{s.label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------- benchmarks */}
      <section className="border-y border-white/10 bg-white/[0.015] py-8">
        <div className="container-px">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-white/35">
            Designed to outclass the platforms factory leaders already know
          </p>
          <div className="mask-fade-edges mt-6 overflow-hidden">
            <div className="flex w-max animate-marquee gap-12 pr-12">
              {[...benchmarks, ...benchmarks].map((b, i) => (
                <span key={i} className="whitespace-nowrap text-lg font-medium text-white/45">
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ platform */}
      <section id="platform" className="scroll-mt-20 py-24">
        <div className="container-px">
          <Reveal>
            <SectionHeading
              eyebrow="The Platform"
              title={
                <>
                  Eight intelligences,{" "}
                  <span className="text-brand-gradient">one operating system</span>
                </>
              }
              subtitle="Each module is world-class on its own. Together, they form a single autonomous nervous system for the plant."
            />
          </Reveal>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m, i) => {
              const href = m.slug === "os" ? "/os" : `/os/${m.slug}`;
              return (
                <Reveal key={m.id} delay={(i % 3) * 0.05}>
                  <Link
                    href={href}
                    className="group block h-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-6 transition hover:border-white/20 hover:from-white/[0.08]"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="grid h-11 w-11 place-items-center rounded-xl border"
                        style={{
                          color: m.accent,
                          borderColor: `${m.accent}44`,
                          backgroundColor: `${m.accent}14`,
                        }}
                      >
                        <Icon name={m.icon} size={20} />
                      </span>
                      <span className="text-xs tabular text-white/30">
                        {String(m.index).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold">{m.name}</h3>
                    <p className="mt-1 text-sm text-white/45">{m.tagline}</p>
                    <p className="mt-3 text-sm leading-relaxed text-white/60">
                      {m.description}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-sm font-medium" style={{ color: m.accent }}>
                      Explore
                      <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- twin */}
      <section id="twin" className="scroll-mt-20 border-y border-white/10 bg-white/[0.015] py-24">
        <div className="container-px">
          <Reveal>
            <SectionHeading
              eyebrow="The Core · 3D Digital Twin"
              title={
                <>
                  Your whole plant, <span className="text-brand-gradient">mirrored live</span>
                </>
              }
              subtitle="At the center of FactoryOS is a fully interactive 3D twin. Rotate the plant, click any asset, and switch layers — health, predictive risk, energy flow, carbon."
            />
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-14">
              <DigitalTwin height="h-[440px] sm:h-[560px]" />
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Boxes, t: "Interactive 3D model", d: "Buildings, lines, and machines you can rotate, zoom, and click." },
                { icon: Activity, t: "Live sensor overlay", d: "Real-time status, OEE, power, vibration on every asset." },
                { icon: Gauge, t: "AI risk indicators", d: "Machines likely to fail surfaced before they break." },
                { icon: Cpu, t: "Energy & carbon layers", d: "Watch power flow from grid to equipment, and CO₂ by zone." },
              ].map((f) => (
                <div key={f.t} className="panel p-5">
                  <f.icon size={18} className="text-brand-300" />
                  <p className="mt-3 font-semibold">{f.t}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/55">{f.d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ industries */}
      <section id="industries" className="scroll-mt-20 py-24">
        <div className="container-px">
          <Reveal>
            <SectionHeading
              eyebrow="Built for heavy industry"
              title="One OS, every kind of plant"
              subtitle="From discrete assembly to continuous process — FactoryOS adapts to your assets, tariffs, and ESG obligations."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industries.map((c, i) => (
              <Reveal key={c.industry} delay={(i % 3) * 0.05}>
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-brand-300">
                    <Icon name={c.icon} size={20} />
                  </span>
                  <div>
                    <p className="font-semibold">{c.industry}</p>
                    <p className="text-sm text-white/50">{c.blurb}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- teams */}
      <section id="teams" className="scroll-mt-20 border-t border-white/10 bg-white/[0.015] py-24">
        <div className="container-px grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <SectionHeading
                align="left"
                eyebrow="One pane of glass"
                title="Every leader, one source of truth"
                subtitle="From the CEO to the reliability engineer — FactoryOS speaks each leader's language, from the same live data."
              />
              <Link href="/login" className="btn-glow mt-8 px-5 py-2.5 text-sm">
                Open the Command Center <ArrowRight size={15} />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
              {personas.map((p) => (
                <div key={p.role} className="flex items-start gap-4 bg-white/[0.02] p-5">
                  <span className="mt-0.5 text-sm font-semibold text-brand-300">{p.role}</span>
                  <span className="text-sm leading-relaxed text-white/60">{p.value}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------- cta */}
      <section className="py-28">
        <div className="container-px">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-500/10 via-ink-900 to-accent-500/10 p-10 text-center sm:p-16">
            <div className="pointer-events-none absolute inset-0 -z-10 opacity-40">
              <div className="grid-bg absolute inset-0" />
            </div>
            <Reveal>
              <h2 className="mx-auto max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
                Run your factory <span className="text-brand-gradient">ten years ahead</span>.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-pretty text-white/60">
                {brand.mission}
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link href="/login" className="btn-glow px-6 py-3 text-base">
                  Launch FactoryOS <ArrowRight size={18} />
                </Link>
                <AskCopilot prompt="Book a plant assessment" className="btn-ghost px-6 py-3 text-base">
                  Book a plant assessment
                </AskCopilot>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- footer */}
      <footer className="border-t border-white/10 py-10">
        <div className="container-px flex flex-col items-center justify-between gap-4 text-sm text-white/45 sm:flex-row">
          <p>
            © {brand.name} {brand.productMark} · {brand.tagline}
          </p>
          <p className="text-white/30">{brand.domain}</p>
        </div>
      </footer>
    </>
  );
}
