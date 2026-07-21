"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { User, Building2, Phone, ArrowRight, Check, Sparkles } from "lucide-react";
import { publicAsset } from "@/lib/paths";

/** After a fresh demo login (flag set by /login), waits 5 s then asks for the visitor's
 *  name / company / phone — a lead capture shown once the demo has hooked them.
 *  The lead is POSTed to /api/lead (instant email to the SpareX team + a permanent
 *  server-side log); localStorage only remembers that the popup was answered. */
export function DemoLeadGate() {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", phone: "" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    let due = false;
    try {
      // only for a logged-in visitor who has NOT registered before (registration is permanent)
      due = !!localStorage.getItem("factoryos:demo-login") && !localStorage.getItem("factoryos:demo-registered");
    } catch { /* SSR / private mode */ }
    if (!due) return;
    timer.current = setTimeout(() => setShow(true), 5000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const submit = () => {
    if (!form.name.trim() || !form.company.trim() || !form.phone.trim()) return;
    let email = "";
    try { email = JSON.parse(localStorage.getItem("factoryos:demo-login") || "{}").email || ""; } catch { /* ignore */ }
    // ship the lead to the SpareX team — email alert + server log; fire-and-forget
    // (keepalive lets it survive the popup closing) so the UX never waits on us
    try {
      fetch(publicAsset("/api/lead"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ ...form, email, source: "demo-gate" }),
      }).catch(() => {});
    } catch { /* ignore */ }
    // permanent registration — next login skips OTP and this popup never shows again
    try { localStorage.setItem("factoryos:demo-registered", JSON.stringify({ ...form, email, at: Date.now() })); } catch { /* ignore */ }
    setSent(true);
    setTimeout(() => setShow(false), 1400);
  };

  const valid = form.name.trim() && form.company.trim() && form.phone.trim();
  if (!mounted || !show) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-ink-950/75 backdrop-blur-md" />
      <div className="panel relative w-full max-w-[420px] overflow-hidden p-6" style={{ background: "linear-gradient(180deg, rgba(34,211,238,0.06), transparent 60%)" }}>
        {!sent ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-400/25 bg-brand-400/[0.08] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-brand-200"><Sparkles size={12} /> ปลดล็อก Demo เต็มรูปแบบ</span>
            <h2 className="mt-3 text-[19px] font-bold leading-tight text-white">อยากให้เราติดต่อกลับไหม?</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/50">กรอกข้อมูลสั้นๆ แล้วทีม SpareX จะช่วยจับคู่ FactoryOS กับโรงงานของคุณ</p>

            <div className="mt-5 space-y-2.5">
              {([
                { key: "name", icon: User, ph: "ชื่อ-นามสกุล", type: "text" },
                { key: "company", icon: Building2, ph: "บริษัท / โรงงาน", type: "text" },
                { key: "phone", icon: Phone, ph: "เบอร์โทร", type: "tel" },
              ] as const).map(({ key, icon: Icon, ph, type }) => (
                <div key={key} className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 focus-within:border-brand-400/50 focus-within:ring-1 focus-within:ring-brand-400/30">
                  <Icon size={16} className="shrink-0 text-white/35" />
                  <input
                    type={type}
                    value={form[key]}
                    autoFocus={key === "name"}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={ph}
                    className="w-full bg-transparent text-[14px] text-white placeholder:text-white/30 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <button onClick={submit} disabled={!valid} className="btn-glow mt-5 w-full justify-center py-2.5 text-[14px] disabled:cursor-not-allowed disabled:opacity-50">ส่งข้อมูล & เข้าใช้งาน Demo <ArrowRight size={15} /></button>
            <p className="mt-2.5 text-center text-[11px] text-white/35">กรอกข้อมูลให้ครบทุกช่องเพื่อเข้าใช้งาน Demo</p>
          </>
        ) : (
          <div className="flex flex-col items-center py-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"><Check size={28} /></span>
            <p className="mt-4 text-[15px] font-semibold text-white">ขอบคุณครับ 🙏</p>
            <p className="mt-1 text-[12.5px] text-white/50">ทีม SpareX จะติดต่อกลับเร็วๆ นี้ — ใช้งาน Demo ต่อได้เลย</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
