interface Props {
  hasGuess: boolean;
  /** label for the no-guess action, e.g. "Skip +0.5s" or "Give up" */
  revealLabel: string;
  giveUp: boolean;
  onGuess: () => void;
  onReveal: () => void;
  disabled?: boolean;
}

export function GuessBar({ hasGuess, revealLabel, giveUp, onGuess, onReveal, disabled }: Props) {
  if (hasGuess) {
    return (
      <button className="btn btn-guess" onClick={onGuess} disabled={disabled}>
        Guess
      </button>
    );
  }
  return (
    <button
      className={`btn ${giveUp ? "btn-giveup" : "btn-skip"}`}
      onClick={onReveal}
      disabled={disabled}
    >
      {!giveUp && (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
          <path d="M6 5l8 7-8 7V5zm10 0h2v14h-2z" />
        </svg>
      )}
      {revealLabel}
    </button>
  );
}
