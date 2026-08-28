import { useCallback, useReducer } from "react";
import { SEED_SONGS } from "@/data/songs";
import { resolveSeed, type Track } from "@/lib/itunes";
import { DEFAULT_DIFFICULTY, type Difficulty } from "@/game/difficulty";

export type Phase = "loading" | "ready" | "revealed" | "error";

export interface GameState {
  phase: Phase;
  difficulty: Difficulty;
  track: Track | null;
  error: string | null;
  replays: number;
  firstPlayAt: number | null;
  solved: boolean;
  skipped: boolean;
  elapsedMs: number | null;
  solvedCount: number;
  skippedCount: number;
}

type Action =
  | { type: "setDifficulty"; value: Difficulty }
  | { type: "loadStart" }
  | { type: "loadOk"; track: Track }
  | { type: "loadErr"; message: string }
  | { type: "registerPlay" }
  | { type: "solve" }
  | { type: "skip" }
  | { type: "replaySame" };

const initialState: GameState = {
  phase: "loading",
  difficulty: DEFAULT_DIFFICULTY,
  track: null,
  error: null,
  replays: 0,
  firstPlayAt: null,
  solved: false,
  skipped: false,
  elapsedMs: null,
  solvedCount: 0,
  skippedCount: 0,
};

function resetRound(s: GameState): GameState {
  return {
    ...s,
    replays: 0,
    firstPlayAt: null,
    solved: false,
    skipped: false,
    elapsedMs: null,
    error: null,
  };
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "setDifficulty":
      return { ...state, difficulty: action.value };
    case "loadStart":
      return { ...resetRound(state), phase: "loading", track: null };
    case "loadOk":
      return { ...state, phase: "ready", track: action.track };
    case "loadErr":
      return { ...state, phase: "error", error: action.message };
    case "registerPlay":
      return {
        ...state,
        replays: state.replays + 1,
        firstPlayAt: state.firstPlayAt ?? Date.now(),
      };
    case "solve":
      return {
        ...state,
        phase: "revealed",
        solved: true,
        elapsedMs: state.firstPlayAt ? Date.now() - state.firstPlayAt : 0,
        solvedCount: state.solvedCount + 1,
      };
    case "skip":
      return {
        ...state,
        phase: "revealed",
        skipped: true,
        skippedCount: state.skippedCount + 1,
      };
    case "replaySame":
      return { ...resetRound(state), phase: "ready" };
    default:
      return state;
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadNewTrack = useCallback(async () => {
    dispatch({ type: "loadStart" });
    const shuffled = [...SEED_SONGS].sort(() => Math.random() - 0.5);
    for (const seed of shuffled.slice(0, 6)) {
      try {
        const track = await resolveSeed(seed);
        if (track?.previewUrl) {
          dispatch({ type: "loadOk", track });
          return;
        }
      } catch {
        // try the next seed
      }
    }
    dispatch({
      type: "loadErr",
      message: "Could not reach the song catalog. Check your connection and retry.",
    });
  }, []);

  const setDifficulty = useCallback((value: Difficulty) => {
    dispatch({ type: "setDifficulty", value });
  }, []);
  const registerPlay = useCallback(() => dispatch({ type: "registerPlay" }), []);
  const solve = useCallback(() => dispatch({ type: "solve" }), []);
  const skip = useCallback(() => dispatch({ type: "skip" }), []);
  const replaySame = useCallback(() => dispatch({ type: "replaySame" }), []);

  return { state, loadNewTrack, setDifficulty, registerPlay, solve, skip, replaySame };
}
