import { useEffect, useRef, useState } from "react";
import { useGame } from "@/game/useGame";
import { getDifficulty } from "@/game/difficulty";
import { isCorrectGuess } from "@/lib/match";
import type { Track } from "@/lib/itunes";
import { DifficultyTabs } from "@/components/DifficultyTabs";
import { SnippetPlayer } from "@/components/SnippetPlayer";
import { SongSearch } from "@/components/SongSearch";
import { GuessBar } from "@/components/GuessBar";
import { RevealCard } from "@/components/RevealCard";
import { Confetti } from "@/components/Confetti";

export default function App() {
  const { state, loadNewTrack, setDifficulty, registerPlay, solve, skip, replaySame } = useGame();
  const [guessText, setGuessText] = useState("");
  const [picked, setPicked] = useState<Track | null>(null);
  const [wrong, setWrong] = useState(false);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    void loadNewTrack();
  }, [loadNewTrack]);

  const difficulty = getDifficulty(state.difficulty);
  const revealed = state.phase === "revealed";

  const resetGuess = () => {
    setGuessText("");
    setPicked(null);
    setWrong(false);
  };

  const handleGuess = () => {
    if (!state.track) return;
    const ok = isCorrectGuess(
      { trackId: picked?.trackId, text: guessText },
      { trackId: state.track.trackId, title: state.track.title },
    );
    if (ok) {
      solve();
    } else {
      setWrong(true);
      window.setTimeout(() => setWrong(false), 500);
    }
  };

  const handleRerollAll = () => {
    resetGuess();
    void loadNewTrack();
  };

  const handlePlayAgain = () => {
    resetGuess();
    replaySame();
  };

  return (
    <div className="app">
      <div className="panel">
        <header className="head">
          <span className="wordmark">🎧 snippet</span>
          <span className="tally">
            solved {state.solvedCount} · skipped {state.skippedCount}
          </span>
        </header>

        <DifficultyTabs value={state.difficulty} onChange={setDifficulty} disabled={revealed} />

        {state.phase === "error" ? (
          <div className="error-box">
            <p>{state.error}</p>
            <button className="btn btn-guess" onClick={() => void loadNewTrack()}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <SnippetPlayer
              previewUrl={state.track?.previewUrl ?? null}
              difficulty={difficulty}
              onPlay={registerPlay}
            />

            {revealed && state.track ? (
              <RevealCard
                track={state.track}
                solved={state.solved}
                audioMs={difficulty.ms}
                onRerollAll={handleRerollAll}
                onPlayAgain={handlePlayAgain}
              />
            ) : (
              <div className="guess-row">
                <SongSearch
                  value={guessText}
                  onChange={(text) => {
                    setGuessText(text);
                    if (picked && text !== picked.title) setPicked(null);
                    setWrong(false);
                  }}
                  onPick={setPicked}
                  disabled={state.phase !== "ready"}
                  shake={wrong}
                />
                <GuessBar
                  hasGuess={guessText.trim().length > 0}
                  onGuess={handleGuess}
                  onSkip={skip}
                  disabled={state.phase !== "ready"}
                />
              </div>
            )}

            {wrong && !revealed && <p className="wrong-note">Not that one - listen again.</p>}
          </>
        )}
      </div>

      <Confetti active={state.phase === "revealed" && state.solved} />
    </div>
  );
}
