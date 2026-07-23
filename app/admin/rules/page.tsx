"use client";

import { useState } from "react";
import { publicAsset } from "@/lib/paths";
import { EngineeringRulesSection } from "@/components/settings/EngineeringRulesSection";
import { Lock, Loader2, ShieldCheck, BookOpen } from "lucide-react";

/* SpareX-only: the full Engineering Rules engine (the backend IP). Not linked
 * anywhere in the product and noindex'd. Customers see the OUTCOMES (work orders,
 * alerts) + the standards a rule cites — never this editable catalog. */

export default function AdminRulesPage() {
  const [key, setKey] = useState("");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const unlock = async (k: string) => {
    setBusy(true); setErr("");
    try {
      const r = await fetch(publicAsset("/api/admin/verify"), {
        method: "POST", headers: { "x-admin-key": k },
      });
      if (r.ok) setOk(true);
      else setErr("รหัสผ่านไม่ถูกต้อง");
    } catch { setErr("ตรวจสอบไม่สำเร็จ"); }
    setBusy(false);
  };

  if (!ok) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink-950 px-5">
        <div className="w-full max-w-[360px]">
          <div className="panel p-7">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-brand-400/30 bg-brand-400/10 text-brand-300"><Lock size={20} /></span>
            <h1 className="mt-4 text-[19px] font-bold text-white">SpareX Admin · Rule Engine</h1>
            <p className="mt-1.5 text-[12.5px] text-white/50">กฎวิศวกรรมหลังบ้าน — สำหรับทีม SpareX เท่านั้น</p>
            <input type="password" value={key} autoFocus onChange={(e) => { setKey(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && key && unlock(key)} placeholder="Admin passphrase" className="mt-5 w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:border-brand-400/50 focus:outline-none" />
            {err ? <p className="mt-2 text-[11.5px] text-rose-300">{err}</p> : null}
            <button onClick={() => key && unlock(key)} disabled={busy || !key} className="btn-glow mt-4 w-full justify-center py-2.5 text-[14px] disabled:opacity-50">
              {busy ? <><Loader2 size={15} className="animate-spin" /> กำลังตรวจ…</> : <><ShieldCheck size={15} /> เข้าดูกฎ</>}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink-950 px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-[1000px]">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-brand-400/30 bg-brand-400/10 text-brand-300"><BookOpen size={17} /></span>
          <div>
            <h1 className="text-[22px] font-bold text-white">SpareX Engineering Rules</h1>
            <p className="text-[12.5px] text-white/45">เครื่องยนต์กฎหลังบ้าน · ประเมินสดกับข้อมูลปัจจุบัน · ลูกค้าเห็นเฉพาะผลลัพธ์</p>
          </div>
        </div>
        <EngineeringRulesSection />
        <p className="mt-6 text-center text-[11px] text-white/30">SpareX FactoryOS · Internal — rule definitions are SpareX IP</p>
      </div>
    </main>
  );
}
