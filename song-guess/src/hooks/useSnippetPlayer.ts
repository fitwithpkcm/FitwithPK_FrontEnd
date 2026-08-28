import { useCallback, useEffect, useRef, useState } from "react";
import { audioEngine } from "@/lib/audioEngine";

export type PlayerStatus = "idle" | "loading" | "ready" | "playing" | "error";

interface SnippetPlayer {
  status: PlayerStatus;
  progress: number;
  waveform: number[];
  usingFallback: boolean;
  /** returns true if playback actually started (used to count replays) */
  play: () => boolean;
  stop: () => void;
}

/**
 * Loads `url` once, then plays a `durationMs` slice starting `offsetSec` in.
 * Reloads only when `url` changes - switching difficulty is free.
 */
export function useSnippetPlayer(
  url: string | null,
  durationMs: number,
  offsetSec: number,
): SnippetPlayer {
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);

  const statusRef = useRef<PlayerStatus>("idle");
  statusRef.current = status;
  const durationRef = useRef(durationMs);
  const offsetRef = useRef(offsetSec);
  durationRef.current = durationMs;
  offsetRef.current = offsetSec;

  useEffect(() => {
    if (!url) {
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setProgress(0);
    audioEngine
      .load(url)
      .then(() => {
        if (cancelled) return;
        setWaveform(audioEngine.waveform(56));
        setUsingFallback(audioEngine.usingFallback);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      audioEngine.stop();
    };
  }, [url]);

  const play = useCallback(() => {
    if (statusRef.current !== "ready" && statusRef.current !== "playing") return false;
    setProgress(0);
    setStatus("playing");
    audioEngine.play(
      offsetRef.current,
      durationRef.current,
      (f) => setProgress(f),
      () => setStatus("ready"),
    );
    return true;
  }, []);

  const stop = useCallback(() => {
    audioEngine.stop();
    setStatus((s) => (s === "playing" ? "ready" : s));
    setProgress(0);
  }, []);

  return { status, progress, waveform, usingFallback, play, stop };
}
