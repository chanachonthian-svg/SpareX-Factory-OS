"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/ui/Wordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { openCopilot, cn } from "@/lib/utils";
import { ArrowRight, Sparkles } from "lucide-react";

const links = [
  { label: "Platform", href: "#platform" },
  { label: "Digital Twin", href: "#twin" },
  { label: "Industries", href: "#industries" },
  { label: "Teams", href: "#teams" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled ? "border-b border-white/10 bg-ink-950/70 backdrop-blur-xl" : "",
      )}
    >
      <div className="container-px flex h-16 items-center gap-6">
        <Link href="/">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-white/60 transition hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          <ThemeToggle />
          <button
            onClick={() => openCopilot()}
            className="hidden items-center gap-1.5 text-sm text-white/60 transition hover:text-white sm:flex"
          >
            <Sparkles size={15} /> Ask Copilot
          </button>
          <Link href="/os" className="btn-glow px-4 py-2 text-sm">
            Launch FactoryOS <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </header>
  );
}
