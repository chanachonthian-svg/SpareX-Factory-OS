"use client";

import { Construction, Wrench } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function UnderMaintenance({
  feature = "OEE Intelligence",
}: {
  feature?: string;
}) {
  const { locale } = useI18n();
  const th = locale === "th";

  return (
    <section className="panel grid min-h-[560px] place-items-center p-8 text-center">
      <div className="mx-auto max-w-xl">
        <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-2xl border border-amber-400/25 bg-amber-500/10 text-amber-300 shadow-[0_0_40px_rgba(245,158,11,0.16)]">
          <Construction size={34} />
          <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-amber-400" />
        </div>

        <h2 className="mt-8 text-xl font-semibold tracking-tight text-white">
          {feature} · Under Maintenance
        </h2>

        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/55">
          {th
            ? "โมดูลนี้ถูกล็อกไว้ชั่วคราวระหว่างการปรับปรุงระบบ ทีมงานกำลังตรวจสอบข้อมูล OEE และจะเปิดใช้งานอีกครั้งเมื่อพร้อม"
            : "This module is temporarily locked while the OEE workspace is being upgraded. It will return once the data and workflows are ready."}
        </p>

        <span className="mt-7 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300">
          <Wrench size={14} />
          {th ? "ปิดปรับปรุงชั่วคราว" : "Temporarily locked"}
        </span>
      </div>
    </section>
  );
}
