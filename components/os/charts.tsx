"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

const AXIS = { stroke: "#3a4255", fontSize: 11 };
const GRID = "rgba(255,255,255,0.05)";

const tooltipStyle = {
  contentStyle: {
    background: "rgba(10,12,18,0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    fontSize: 12,
    color: "#e2e8f0",
  },
  labelStyle: { color: "#8b93a7", marginBottom: 4 },
  cursor: { stroke: "rgba(255,255,255,0.15)" },
};

export function AreaTrend({
  data,
  dataKey,
  color = "#22d3ee",
  height = 240,
  unit = "",
  baseline,
  baselineLabel,
}: {
  data: any[];
  dataKey: string;
  color?: string;
  height?: number;
  unit?: string;
  /** optional user-set threshold line (e.g. cost ceiling) */
  baseline?: number;
  baselineLabel?: string;
}) {
  const id = `area-${dataKey}-${color.replace("#", "")}`;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="t" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={42} unit={unit} />
          <Tooltip {...tooltipStyle} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${id})`}
          />
          {baseline != null ? (
            <ReferenceLine
              y={baseline}
              stroke="#f43f5e"
              strokeDasharray="5 4"
              ifOverflow="extendDomain"
              label={{ value: baselineLabel, position: "insideTopRight", fill: "#fda4af", fontSize: 10 }}
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MultiLine({
  data,
  lines,
  height = 240,
}: {
  data: any[];
  lines: { key: string; color: string; name?: string; dashed?: boolean }[];
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="t" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={42} />
          <Tooltip {...tooltipStyle} />
          {lines.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.name ?? l.key}
              stroke={l.color}
              strokeWidth={2}
              strokeDasharray={l.dashed ? "5 5" : undefined}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PowerComposed({
  data,
  height = 260,
  animate = true,
  ticks,
}: {
  data: any[];
  height?: number;
  animate?: boolean;
  /** explicit category ticks (e.g. round hours) — they slide with the data */
  ticks?: string[];
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="pwr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="onpeak" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="t" tick={AXIS} tickLine={false} axisLine={false} minTickGap={28} {...(ticks ? { ticks, interval: 0 as const } : {})} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} />
          <Tooltip {...tooltipStyle} />
          <Area type="step" dataKey="onPeak" stroke="none" fill="url(#onpeak)" isAnimationActive={animate} />
          <Area type="monotone" dataKey="power" stroke="#22d3ee" strokeWidth={2} fill="url(#pwr)" isAnimationActive={animate} />
          <ReferenceLine y={3000} stroke="#f43f5e" strokeDasharray="4 4" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PeakBars({
  data,
  height = 260,
}: {
  data: any[];
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="t" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} domain={[2600, 3300]} />
          <Tooltip {...tooltipStyle} />
          <Bar dataKey="actual" radius={[4, 4, 0, 0]} maxBarSize={26} fill="#22d3ee" />
          <Bar dataKey="forecast" radius={[4, 4, 0, 0]} maxBarSize={26} fill="#818cf8" />
          <ReferenceLine y={3000} stroke="#f43f5e" strokeDasharray="4 4" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StackedBars({
  data,
  bars,
  height = 260,
}: {
  data: any[];
  bars: { key: string; color: string; name?: string }[];
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="t" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={42} />
          <Tooltip {...tooltipStyle} />
          {bars.map((b) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              name={b.name ?? b.key}
              stackId="a"
              fill={b.color}
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBars({
  data,
  color = "#22d3ee",
  height = 220,
}: {
  data: { name: string; value: number }[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="space-y-2.5" style={{ minHeight: height }}>
      {data.map((d) => (
        <div key={d.name}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/70">{d.name}</span>
            <span className="tabular text-white/50">{d.value}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: `linear-gradient(90deg, ${color}, #6366f1)`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
