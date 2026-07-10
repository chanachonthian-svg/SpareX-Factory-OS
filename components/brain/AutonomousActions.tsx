"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Check, Pause, Play, ShieldCheck } from "lucide-react";
import { autonomousActions, type ActionStatus } from "@/lib/brain";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<ActionStatus, { cls: string; dot: string }> = {
  active: { cls: "border-status-ok/30 bg-status-ok/10 text-emerald-300", dot: "bg-status-ok" },
  pending: { cls: "border-status-warn/30 bg-status-warn/10 text-amber-300", dot: "bg-status-warn" },
  suggested: { cls: "border-white/15 bg-white/5 text-white/60", dot: "bg-white/40" },
};

export function AutonomousActions() {
  const { t } = useI18n();
  const [actions, setActions] = useState(autonomousActions);

  function setStatus(id: string, status: ActionStatus) {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  const running = actions.filter((a) => a.status === "active").length;
  const pending = actions.filter((a) => a.status !== "active").length;

  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950">
          <Bot size={18} />
        </span>
        <div>
          <h3 className="font-semibold">{t("act.title")}</h3>
          <p className="text-xs text-white/45">{t("act.sub")}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="chip border-status-ok/30 bg-status-ok/10 text-emerald-300">{running} {t("act.running")}</span>
          <span className="chip">{pending} {t("act.awaiting")}</span>
        </div>
      </div>

      <ul className="mt-5 space-y-2.5">
        {actions.map((a) => {
          const meta = STATUS_STYLE[a.status];
          return (
            <li key={a.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{t(`act.${a.id}.name`)}</p>
                  <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium", meta.cls)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot, a.status === "active" && "animate-pulse")} />
                    {t(`act.status.${a.status}`)}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-white/55">{t(`act.${a.id}.desc`)}</p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-semibold tabular text-emerald-300">{a.impact}</span>
                {a.status === "active" ? (
                  <button
                    onClick={() => setStatus(a.id, "pending")}
                    className="btn border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                  >
                    <Pause size={13} /> {t("act.pause")}
                  </button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setStatus(a.id, "active")}
                    className="btn-glow px-3 py-1.5 text-xs"
                  >
                    {a.status === "pending" ? <Check size={13} /> : <Play size={13} />}
                    {a.status === "pending" ? t("act.approve") : t("act.enable")}
                  </motion.button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 flex items-center gap-2 text-[11px] text-white/40">
        <ShieldCheck size={13} /> {t("act.guardrail")}
      </p>
    </section>
  );
}
