interface Props {
  peaks: number[];
  progress: number;
  accent: string;
}

export function WaveformBar({ peaks, progress, accent }: Props) {
  const bars = peaks.length ? peaks : Array.from({ length: 56 }, () => 0.35);
  return (
    <div className="wave" aria-hidden>
      {bars.map((h, i) => {
        const filled = i / bars.length <= progress;
        return (
          <span
            key={i}
            className="wave-bar"
            style={{
              height: `${Math.max(8, Math.round(h * 100))}%`,
              background: filled ? accent : "rgba(255,255,255,0.14)",
            }}
          />
        );
      })}
    </div>
  );
}
