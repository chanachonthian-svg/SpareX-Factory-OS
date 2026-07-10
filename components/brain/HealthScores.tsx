"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { healthScores } from "@/lib/brain";
import { useI18n } from "@/lib/i18n";

function scoreColor(s: number) {
  return s >= 90 ? "#34d399" : s >= 80 ? "#22d3ee" : s >= 70 ? "#f59e0b" : "#f43f5e";
}

function Ring({
  value,
  size = 132,
  stroke = 10,
  color,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

function TrendIcon({ trend, className }: { trend: "up" | "down" | "flat"; className?: string }) {
  if (trend === "up") return <TrendingUp size={13} className={className} />;
  if (trend === "down") return <TrendingDown size={13} className={className} />;
  return <Minus size={13} className={className} />;
}

export function HealthScores() {
  const { t } = useI18n();
  const { overall, delta, trend, subs } = healthScores;
  return (
    <section className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <div className="panel flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[11px] uppercase tracking-wider text-white/45">{t("health.overall")}</p>
        <div className="mt-3">
          <Ring value={overall} color={scoreColor(overall)}>
            <div>
              <p className="text-4xl font-semibold tabular">{overall}</p>
              <p className="text-xs text-white/40">/ 100</p>
            </div>
          </Ring>
        </div>
        <span className="mt-3 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-status-ok/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
          <TrendIcon trend={trend} /> {delta} {t("health.vsWeek")}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {subs.map((s) => {
          const good = s.trend === "up";
          return (
            <div key={s.key} className="panel p-4">
              <div className="flex items-center gap-3">
                <Ring value={s.score} size={56} stroke={6} color={s.accent}>
                  <span className="text-sm font-semibold tabular">{s.score}</span>
                </Ring>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t(`health.${s.key}`)}</p>
                  <span className={`mt-0.5 inline-flex items-center gap-1 text-xs ${good ? "text-emerald-300" : "text-rose-300"}`}>
                    <TrendIcon trend={s.trend} /> {s.delta}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/55">{t(`health.${s.key}.c`)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
