import { Nav } from "@/components/landing/Nav";
import { Estimator } from "@/components/estimate/Estimator";
import { Reveal } from "@/components/ui/Reveal";
import { brand } from "@/lib/site";

export const metadata = { title: "Estimate · FactoryOS" };

export default function EstimatePage() {
  return (
    <>
      <Nav />

      <section className="relative overflow-hidden pt-32 pb-10 sm:pt-36">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="grid-bg absolute inset-0 opacity-[0.15]" />
          <div className="absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[130px]" />
        </div>
        <div className="container-px">
          <Reveal>
            <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-brand-400" /> Project & Price Estimator</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-5 max-w-3xl text-balance text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              Scope your <span className="text-brand-gradient">FactoryOS</span> project — and see the price.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-white/60">
              Pick the modules, licenses and hardware you need — or just describe your plant and let SpareX AI
              scope it for you. You'll get a rough estimate in seconds; the SpareX team confirms the final price.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="container-px">
          <Reveal delay={0.12}>
            <Estimator />
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10">
        <div className="container-px flex flex-col items-center justify-between gap-4 text-sm text-white/45 sm:flex-row">
          <p>© {brand.name} {brand.productMark} · {brand.tagline}</p>
          <p className="text-white/30">{brand.domain}</p>
        </div>
      </footer>
    </>
  );
}
