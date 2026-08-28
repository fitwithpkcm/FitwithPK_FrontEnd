export type Difficulty = "easy" | "medium" | "hard" | "expert" | "impossible";

export interface DifficultyDef {
  id: Difficulty;
  label: string;
  /** milliseconds of audio you get to hear */
  ms: number;
  accent: string;
}

// Tune freely - this is the whole difficulty curve. "Hard = 0.1s" matches the
// reference video.
export const DIFFICULTIES: DifficultyDef[] = [
  { id: "easy", label: "Easy", ms: 3000, accent: "#22c55e" },
  { id: "medium", label: "Medium", ms: 1000, accent: "#eab308" },
  { id: "hard", label: "Hard", ms: 100, accent: "#f97316" },
  { id: "expert", label: "Expert", ms: 50, accent: "#ef4444" },
  { id: "impossible", label: "Impossible", ms: 10, accent: "#a855f7" },
];

export const DEFAULT_DIFFICULTY: Difficulty = "hard";

/** Where in the 30s preview the snippet starts (usually lands near the hook). */
export const OFFSET_SEC = 7;

export function getDifficulty(id: Difficulty): DifficultyDef {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[2];
}

/** "3s", "0.1s", "0.01s" - matches the badge in the video. */
export function formatAudioLength(ms: number): string {
  return `${+(ms / 1000).toFixed(3)}s`;
}
