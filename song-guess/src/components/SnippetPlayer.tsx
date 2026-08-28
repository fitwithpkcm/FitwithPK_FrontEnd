import { useEffect, useRef } from "react";
import { useSnippetPlayer } from "@/hooks/useSnippetPlayer";
import { formatAudioLength, OFFSET_SEC } from "@/game/difficulty";
import { WaveformBar } from "@/components/WaveformBar";

interface Props {
  previewUrl: string | null;
  snippetMs: number;
  accent: string;
  tryIndex: number;
  triesTotal: number;
  onPlay: () => void;
}

export function SnippetPlayer({
  previewUrl,
  snippetMs,
  accent,
  tryIndex,
  triesTotal,
  onPlay,
}: Props) {
  const player = useSnippetPlayer(previewUrl, snippetMs, OFFSET_SEC);
  const isPlaying = player.status === "playing";
  const busy = player.status === "loading" || player.status === "idle";

  // Auto-play the newly unlocked, longer snippet after a skip / wrong guess
  // (the user already gestured, so playback is allowed).
  const prevTry = useRef(tryIndex);
  useEffect(() => {
    const prev = prevTry.current;
    prevTry.current = tryIndex;
    if (tryIndex > prev && player.play()) onPlay();
  }, [tryIndex, player, onPlay]);

  const handleClick = () => {
    if (isPlaying) {
      player.stop();
      return;
    }
    if (player.play()) onPlay();
  };

  return (
    <div className="player">
      <WaveformBar peaks={player.waveform} progress={player.progress} accent={accent} />

      <div className="player-row">
        <button
          className="play-btn"
          style={{ "--accent": accent } as React.CSSProperties}
          onClick={handleClick}
          disabled={busy || player.status === "error"}
          aria-label={isPlaying ? "Stop" : "Play snippet"}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5Z" />
            </svg>
          )}
        </button>
        <div className="player-meta">
          <span className="len-label" style={{ color: accent }}>
            {player.status === "error" ? "audio unavailable" : formatAudioLength(snippetMs)}
          </span>
          <span className="try-label">
            try {Math.min(tryIndex + 1, triesTotal)} / {triesTotal}
          </span>
        </div>
      </div>

      {player.usingFallback && (
        <p className="hint">Precise snippet unavailable here - playing a short clip instead.</p>
      )}
    </div>
  );
}
