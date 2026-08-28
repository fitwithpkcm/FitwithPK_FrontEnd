import { useEffect, useRef, useState } from "react";
import { useGame } from "@/game/useGame";
import { formatAudioLength, getDifficulty, lastTryIndex, stepMs } from "@/game/difficulty";
import { isCorrectGuess } from "@/lib/match";
import type { Track } from "@/lib/itunes";
import { DifficultyTabs } from "@/components/DifficultyTabs";
import { SnippetPlayer } from "@/components/SnippetPlayer";
import { SongSearch } from "@/components/SongSearch";
import { GuessBar } from "@/components/GuessBar";
import { RevealCard } from "@/components/RevealCard";
import { Confetti } from "@/components/Confetti";

export default function App() {
  const { state, loadNewTrack, setDifficulty, registerPlay, revealMore, solve, giveUp, replaySame } =
    useGame();
  const [guessText, setGuessText] = useState("");
  const [picked, setPicked] = useState<Track | null>(null);
  const [wrongMsg, setWrongMsg] = useState<string | null>(null);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    void loadNewTrack();
  }, [loadNewTrack]);

  const difficulty = getDifficulty(state.difficulty);
  const currentMs = stepMs(difficulty, state.tryIndex);
  const triesTotal = difficulty.steps.length;
  const isLastStep = state.tryIndex >= lastTryIndex(difficulty);
  const nextMs = isLastStep ? currentMs : difficulty.steps[state.tryIndex + 1];
  const revealed = state.phase === "revealed";

  const resetGuess = () => {
    setGuessText("");
    setPicked(null);
    setWrongMsg(null);
  };

  const flashWrong = (msg: string) => {
    setGuessText("");
    setPicked(null);
    setWrongMsg(msg);
    window.setTimeout(() => setWrongMsg(null), 2200);
  };

  const handleGuess = () => {
    if (!state.track) return;
    const ok = isCorrectGuess(
      { trackId: picked?.trackId, text: guessText },
      { trackId: state.track.trackId, title: state.track.title },
    );
    if (ok) {
      solve();
      return;
    }
    // a wrong guess costs you a rung of the ladder
    flashWrong(
      isLastStep
        ? "Not quite - try again or give up."
        : `Not quite - unlocked ${formatAudioLength(nextMs)}.`,
    );
    if (!isLastStep) revealMore();
  };

  const handleReveal = () => {
    if (isLastStep) giveUp();
    else revealMore();
  };

  const handleRerollAll = () => {
    resetGuess();
    void loadNewTrack();
  };

  const handlePlayAgain = () => {
    resetGuess();
    replaySame();
  };

  const revealLabel = isLastStep ? "Give up" : `Skip +${formatAudioLength(nextMs - currentMs)}`;

  return (
    <div className="app">
      <div className="panel">
        <header className="head">
          <span className="wordmark">🎧 snippet</span>
          <span className="tally">
            solved {state.solvedCount} · gave up {state.gaveUpCount}
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
              snippetMs={currentMs}
              accent={difficulty.accent}
              tryIndex={state.tryIndex}
              triesTotal={triesTotal}
              onPlay={registerPlay}
            />

            {revealed && state.track ? (
              <RevealCard
                track={state.track}
                solved={state.solved}
                audioMs={currentMs}
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
                    setWrongMsg(null);
                  }}
                  onPick={setPicked}
                  disabled={state.phase !== "ready"}
                  shake={!!wrongMsg}
                />
                <GuessBar
                  hasGuess={guessText.trim().length > 0}
                  revealLabel={revealLabel}
                  giveUp={isLastStep}
                  onGuess={handleGuess}
                  onReveal={handleReveal}
                  disabled={state.phase !== "ready"}
                />
              </div>
            )}

            {wrongMsg && !revealed && <p className="wrong-note">{wrongMsg}</p>}
          </>
        )}
      </div>

      <Confetti active={revealed && state.solved} />
    </div>
  );
}
