interface Props {
  hasGuess: boolean;
  onGuess: () => void;
  onSkip: () => void;
  disabled?: boolean;
}

export function GuessBar({ hasGuess, onGuess, onSkip, disabled }: Props) {
  if (hasGuess) {
    return (
      <button className="btn btn-guess" onClick={onGuess} disabled={disabled}>
        Guess
      </button>
    );
  }
  return (
    <button className="btn btn-skip" onClick={onSkip} disabled={disabled}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
        <path d="M6 5l8 7-8 7V5zm10 0h2v14h-2z" />
      </svg>
      Skip
    </button>
  );
}
