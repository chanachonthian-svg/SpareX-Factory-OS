import { Sidebar } from "@/components/os/Sidebar";

export default function OsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-ink-950">
      {/* ambient backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="grid-bg absolute inset-0 opacity-[0.18]" />
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-brand-500/10 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-accent-500/10 blur-[120px]" />
      </div>
      <Sidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
