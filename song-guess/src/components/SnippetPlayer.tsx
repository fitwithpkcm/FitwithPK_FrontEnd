import { useSnippetPlayer } from "@/hooks/useSnippetPlayer";
import { formatAudioLength, OFFSET_SEC, type DifficultyDef } from "@/game/difficulty";
import { WaveformBar } from "@/components/WaveformBar";

interface Props {
  previewUrl: string | null;
  difficulty: DifficultyDef;
  onPlay: () => void;
}

export function SnippetPlayer({ previewUrl, difficulty, onPlay }: Props) {
  const player = useSnippetPlayer(previewUrl, difficulty.ms, OFFSET_SEC);
  const isPlaying = player.status === "playing";
  const busy = player.status === "loading" || player.status === "idle";

  const handleClick = () => {
    if (isPlaying) {
      player.stop();
      return;
    }
    if (player.play()) onPlay();
  };

  return (
    <div className="player">
      <WaveformBar peaks={player.waveform} progress={player.progress} accent={difficulty.accent} />

      <div className="player-row">
        <button
          className="play-btn"
          style={{ "--accent": difficulty.accent } as React.CSSProperties}
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
        <span className="len-label" style={{ color: difficulty.accent }}>
          {player.status === "error" ? "audio unavailable" : formatAudioLength(difficulty.ms)}
        </span>
      </div>

      {player.usingFallback && (
        <p className="hint">Precise snippet unavailable here - playing a short clip instead.</p>
      )}
    </div>
  );
}
