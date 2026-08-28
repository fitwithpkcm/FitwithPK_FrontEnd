export type Difficulty = "easy" | "medium" | "hard" | "expert" | "impossible";

export interface DifficultyDef {
  id: Difficulty;
  label: string;
  accent: string;
  /**
   * Progressive reveal ladder: ms of audio unlocked at each try. Index 0 is the
   * opening snippet; a wrong guess or a skip moves you one step down. The last
   * entry is the full 30s preview, so every round is eventually winnable.
   */
  steps: number[];
}

const FULL_PREVIEW_MS = 30_000;

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: "easy",
    label: "Easy",
    accent: "#22c55e",
    steps: [3000, 7000, 12000, 18000, 25000, FULL_PREVIEW_MS],
  },
  {
    id: "medium",
    label: "Medium",
    accent: "#eab308",
    steps: [1000, 2500, 5000, 9000, 15000, FULL_PREVIEW_MS],
  },
  {
    id: "hard",
    label: "Hard",
    accent: "#f97316",
    steps: [100, 600, 1500, 3500, 7000, 13000, 20000, FULL_PREVIEW_MS],
  },
  {
    id: "expert",
    label: "Expert",
    accent: "#ef4444",
    steps: [50, 300, 900, 2200, 5000, 10000, 18000, FULL_PREVIEW_MS],
  },
  {
    id: "impossible",
    label: "Impossible",
    accent: "#a855f7",
    steps: [10, 110, 400, 1200, 3000, 7000, 15000, FULL_PREVIEW_MS],
  },
];

export const DEFAULT_DIFFICULTY: Difficulty = "medium";

/** Preview clips are already a curated excerpt - reveal from the start, Heardle-style. */
export const OFFSET_SEC = 0;

export function getDifficulty(id: Difficulty): DifficultyDef {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}

/** ms of audio available at a given try (clamped to the last rung). */
export function stepMs(def: DifficultyDef, tryIndex: number): number {
  return def.steps[Math.min(tryIndex, def.steps.length - 1)];
}

export function lastTryIndex(def: DifficultyDef): number {
  return def.steps.length - 1;
}

/** "3s", "0.5s", "0.01s", "30s". */
export function formatAudioLength(ms: number): string {
  return `${+(ms / 1000).toFixed(3)}s`;
}
