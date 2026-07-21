"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/ui/Wordmark";
import { publicAsset } from "@/lib/paths";
import { ArrowRight, ArrowLeft, Mail, ShieldCheck, Loader2, Check } from "lucide-react";

/** Demo access flow — email (no password) → OTP verification → enter FactoryOS.
 *  The OTP is now REALLY emailed via /api/otp/send (SMTP configured on the
 *  server). When SMTP isn't configured (e.g. local dev) the API answers
 *  { demo: true } and this page falls back to the on-screen demo code.
 *  A lead-capture popup fires 5 s after entering the app. */
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"real" | "demo">("demo");
  const [otpToken, setOtpToken] = useState("");
  const [otpExp, setOtpExp] = useState(0);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [entering, setEntering] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // a visitor who already registered (submitted the lead form) is remembered —
  // they skip OTP and the lead popup never fires again. Safe on SSR: empty email
  // short-circuits before any localStorage access, so server & first client render match.
  const returning = (() => {
    const t = email.trim().toLowerCase();
    if (!t) return false;
    try {
      const r = JSON.parse(localStorage.getItem("factoryos:demo-registered") || "null");
      return !!(r?.email && String(r.email).toLowerCase() === t);
    } catch { return false; }
  })();

  const goDemo = () => {
    localStorage.setItem("factoryos:demo-login", JSON.stringify({ email: email.trim(), ts: Date.now() }));
    setEntering(true);
    setTimeout(() => router.push("/os"), 1000);
  };

  /** ask the server to email a real OTP; falls back to on-screen demo code
   *  when SMTP isn't configured or the API is unreachable */
  const requestOtp = async (): Promise<boolean> => {
    try {
      const res = await fetch(publicAsset("/api/otp/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) { setErr(`ส่งรหัสไปแล้ว — ขอใหม่ได้ในอีก ${data.retryInS ?? 60} วินาที`); return false; }
      if (res.ok && data.sent) { setMode("real"); setOtpToken(data.token); setOtpExp(data.exp); return true; }
    } catch { /* network/API down → demo fallback below */ }
    setMode("demo");
    setCode(String(Math.floor(100000 + Math.random() * 900000)));
    return true;
  };

  const onContinue = async () => {
    if (!validEmail) { setErr("กรุณากรอกอีเมลให้ถูกต้อง"); return; }
    setErr(""); setBusy(true);
    if (returning) { goDemo(); return; } // known visitor → straight in, no OTP
    const ok = await requestOtp();
    setBusy(false);
    if (ok) { setStep("otp"); setDigits(["", "", "", "", "", ""]); setTimeout(() => refs.current[0]?.focus(), 50); }
  };

  const resend = async () => {
    setErr("");
    const ok = await requestOtp();
    if (ok) { setDigits(["", "", "", "", "", ""]); refs.current[0]?.focus(); }
  };

  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "");
    if (!clean) { setDigits((p) => { const n = [...p]; n[i] = ""; return n; }); return; }
    setErr("");
    // support paste of the whole code
    if (clean.length > 1) {
      const arr = clean.slice(0, 6).split("");
      setDigits((p) => p.map((_, idx) => arr[idx] ?? ""));
      refs.current[Math.min(arr.length, 5)]?.focus();
      return;
    }
    setDigits((p) => { const n = [...p]; n[i] = clean; return n; });
    if (i < 5) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "Enter") verify();
  };

  const verify = async () => {
    const entered = digits.join("");
    if (entered.length < 6) { setErr("กรอกรหัสยืนยัน 6 หลัก"); return; }
    if (mode === "real") {
      setBusy(true);
      try {
        const res = await fetch(publicAsset("/api/otp/verify"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), code: entered, token: otpToken, exp: otpExp }),
        });
        setBusy(false);
        if (res.status === 410) { setErr("รหัสหมดอายุแล้ว — กด “ส่งอีกครั้ง” เพื่อรับรหัสใหม่"); return; }
        if (!res.ok) { setErr("รหัสไม่ถูกต้อง — ลองใหม่อีกครั้ง"); return; }
      } catch {
        setBusy(false);
        setErr("เชื่อมต่อไม่ได้ — ลองใหม่อีกครั้ง");
        return;
      }
    } else if (entered !== code) {
      setErr("รหัสไม่ถูกต้อง — ลองใหม่อีกครั้ง");
      return;
    }
    setErr(""); goDemo(); // new visitor verified → the lead popup will fire once inside /os
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-5 py-10">
      {/* ambient backdrop — echoes the landing hero */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-bg absolute inset-0 opacity-[0.15]" />
        <div className="absolute -left-40 top-0 h-[28rem] w-[28rem] rounded-full bg-brand-500/12 blur-[130px]" />
        <div className="absolute -right-32 bottom-0 h-[26rem] w-[26rem] rounded-full bg-accent-500/12 blur-[130px]" />
      </div>

      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/"><Wordmark /></Link>
          <Link href="/" className="inline-flex items-center gap-1 text-[12px] text-white/45 transition hover:text-white/80"><ArrowLeft size={13} /> กลับหน้าหลัก</Link>
        </div>

        <div className="panel p-7">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-400/25 bg-brand-400/[0.08] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-brand-200">
            <ShieldCheck size={12} /> เข้าดู Demo
          </span>

          {entering ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"><Check size={28} /></span>
              <p className="mt-4 text-[15px] font-semibold text-white">ยืนยันสำเร็จ</p>
              <p className="mt-1 flex items-center gap-1.5 text-[12px] text-white/50"><Loader2 size={13} className="animate-spin" /> กำลังเข้าสู่ FactoryOS…</p>
            </div>
          ) : step === "email" ? (
            <>
              <h1 className="mt-4 text-[22px] font-bold leading-tight text-white">เข้าสู่ระบบด้วยอีเมล</h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
                {returning ? "ยินดีต้อนรับกลับ — อีเมลนี้ลงทะเบียนไว้แล้ว เข้าใช้งานได้เลย" : "ไม่ต้องใช้รหัสผ่าน — เราจะส่งรหัสยืนยัน (OTP) ไปที่อีเมลของคุณ"}
              </p>

              <label className="mt-6 block text-[12px] font-medium text-white/55">อีเมลบริษัท</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 focus-within:border-brand-400/50 focus-within:ring-1 focus-within:ring-brand-400/30">
                <Mail size={16} className="shrink-0 text-white/35" />
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErr(""); }}
                  onKeyDown={(e) => e.key === "Enter" && onContinue()}
                  placeholder="you@company.com"
                  className="w-full bg-transparent text-[14px] text-white placeholder:text-white/30 focus:outline-none"
                />
              </div>
              {err ? <p className="mt-2 text-[11.5px] text-rose-300">{err}</p> : null}

              <button onClick={onContinue} disabled={busy} className="btn-glow mt-5 w-full justify-center py-2.5 text-[14px] disabled:opacity-60">
                {busy && !returning ? <><Loader2 size={15} className="animate-spin" /> กำลังส่งรหัส…</> : returning ? <>เข้าใช้งาน Demo <ArrowRight size={15} /></> : <>ส่งรหัสยืนยัน <ArrowRight size={15} /></>}
              </button>
              <p className="mt-4 text-center text-[11px] leading-relaxed text-white/35">การเข้าใช้งานถือว่ายอมรับเงื่อนไขการใช้ Demo ของ SpareX</p>
            </>
          ) : (
            <>
              <button onClick={() => { setStep("email"); setErr(""); }} className="mt-4 inline-flex items-center gap-1 text-[12px] text-white/45 transition hover:text-white/80"><ArrowLeft size={13} /> เปลี่ยนอีเมล</button>
              <h1 className="mt-2 text-[22px] font-bold leading-tight text-white">กรอกรหัสยืนยัน</h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">เราส่งรหัส 6 หลักไปที่ <span className="font-medium text-white/80">{email.trim()}</span></p>

              <div className="mt-6 flex justify-between gap-2">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { refs.current[i] = el; }}
                    inputMode="numeric"
                    maxLength={6}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onKey(i, e)}
                    className="h-13 w-full rounded-xl border border-white/12 bg-white/[0.03] py-3 text-center text-[20px] font-semibold tabular text-white transition focus:border-brand-400/50 focus:outline-none focus:ring-1 focus:ring-brand-400/30"
                  />
                ))}
              </div>
              {err ? <p className="mt-2 text-[11.5px] text-rose-300">{err}</p> : null}

              {/* demo hint — shown only when SMTP isn't configured (local dev);
                  in production the code arrives by email */}
              {mode === "demo" ? (
                <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] px-2.5 py-1.5 text-[11px] text-amber-200/90">
                  <ShieldCheck size={12} className="shrink-0" /> โหมดสาธิต — รหัสของคุณคือ <b className="tabular tracking-widest">{code}</b> (ปกติจะส่งไปที่อีเมล)
                </p>
              ) : (
                <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-2.5 py-1.5 text-[11px] text-emerald-200/85">
                  <Mail size={12} className="shrink-0" /> ส่งรหัสไปที่อีเมลแล้ว — เช็กกล่องจดหมาย (และโฟลเดอร์สแปม) รหัสหมดอายุใน 10 นาที
                </p>
              )}

              <button onClick={verify} disabled={busy} className="btn-glow mt-5 w-full justify-center py-2.5 text-[14px] disabled:opacity-60">
                {busy ? <><Loader2 size={15} className="animate-spin" /> กำลังตรวจรหัส…</> : <>ยืนยันและเข้าสู่ Demo <ArrowRight size={15} /></>}
              </button>
              <button onClick={resend} className="mt-3 w-full text-center text-[12px] text-white/45 transition hover:text-white/80">ไม่ได้รับรหัส? ส่งอีกครั้ง</button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
