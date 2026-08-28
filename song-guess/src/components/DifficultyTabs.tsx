import { DIFFICULTIES, type Difficulty } from "@/game/difficulty";

interface Props {
  value: Difficulty;
  onChange: (value: Difficulty) => void;
  disabled?: boolean;
}

export function DifficultyTabs({ value, onChange, disabled }: Props) {
  return (
    <div className="diff-tabs" role="tablist" aria-label="Difficulty">
      {DIFFICULTIES.map((d) => {
        const active = d.id === value;
        return (
          <button
            key={d.id}
            role="tab"
            aria-selected={active}
            className="diff-pill"
            data-active={active || undefined}
            style={
              {
                "--accent": d.accent,
              } as React.CSSProperties
            }
            disabled={disabled}
            onClick={() => onChange(d.id)}
          >
            {d.label}
          </button>
        );
      })}
    </div>
  );
}
