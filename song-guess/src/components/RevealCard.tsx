import type { Track } from "@/lib/itunes";
import { formatAudioLength } from "@/game/difficulty";

interface Props {
  track: Track;
  solved: boolean;
  audioMs: number;
  onRerollAll: () => void;
  onPlayAgain: () => void;
}

export function RevealCard({ track, solved, audioMs, onRerollAll, onPlayAgain }: Props) {
  return (
    <div className="reveal">
      <div className="top-actions">
        <button className="chip" onClick={onRerollAll}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
            <path d="M12 6V3L8 7l4 4V8a4 4 0 1 1-4 4H6a6 6 0 1 0 6-6Z" />
          </svg>
          Reroll all
        </button>
        <button className="chip" onClick={onPlayAgain}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
            <path d="M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z" />
          </svg>
          Play again
        </button>
      </div>

      <div className={`reveal-art ${solved ? "glow-green" : "glow-neutral"}`}>
        {track.artworkUrl ? (
          <img src={track.artworkUrl} alt="" width={168} height={168} />
        ) : (
          <div className="reveal-art-fallback">🎵</div>
        )}
      </div>

      <div className="reveal-title">{track.title}</div>
      <div className="reveal-sub">
        {track.artist}
        {track.album ? ` · ${track.album}` : ""}
      </div>

      {solved ? (
        <div className="reveal-badge">GUESSED IN {formatAudioLength(audioMs).toUpperCase()}!</div>
      ) : (
        <div className="reveal-badge missed">GAVE UP</div>
      )}
    </div>
  );
}
