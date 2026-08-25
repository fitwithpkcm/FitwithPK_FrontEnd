import React from "react";

// Minimal inline trend line for a single exercise's own history — no axes,
// no comparison to anything else, just "is this going up." Renders nothing
// for fewer than 2 points (a single dot can't show a trend).
export default function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;

  const width = 56;
  const height = 22;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const toXY = (v: number, i: number) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return [x, y];
  };
  const points = values.map((v, i) => toXY(v, i).map(n => n.toFixed(1)).join(",")).join(" ");
  const [lastX, lastY] = toXY(values[values.length - 1], values.length - 1);
  const trendingUp = values[values.length - 1] >= values[0];
  const color = trendingUp ? "#10b981" : "#ef4444";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={2} fill={color} />
    </svg>
  );
}
