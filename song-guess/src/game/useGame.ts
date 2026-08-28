import { useCallback, useReducer } from "react";
import { SEED_SONGS } from "@/data/songs";
import { resolveSeed, type Track } from "@/lib/itunes";
import { DEFAULT_DIFFICULTY, getDifficulty, lastTryIndex, type Difficulty } from "@/game/difficulty";

export type Phase = "loading" | "ready" | "revealed" | "error";

export interface GameState {
  phase: Phase;
  difficulty: Difficulty;
  track: Track | null;
  error: string | null;
  /** which rung of the reveal ladder we're on (0 = opening snippet) */
  tryIndex: number;
  replays: number;
  firstPlayAt: number | null;
  solved: boolean;
  gaveUp: boolean;
  elapsedMs: number | null;
  solvedCount: number;
  gaveUpCount: number;
}

type Action =
  | { type: "setDifficulty"; value: Difficulty }
  | { type: "loadStart" }
  | { type: "loadOk"; track: Track }
  | { type: "loadErr"; message: string }
  | { type: "registerPlay" }
  | { type: "revealMore" }
  | { type: "solve" }
  | { type: "giveUp" }
  | { type: "replaySame" };

const initialState: GameState = {
  phase: "loading",
  difficulty: DEFAULT_DIFFICULTY,
  track: null,
  error: null,
  tryIndex: 0,
  replays: 0,
  firstPlayAt: null,
  solved: false,
  gaveUp: false,
  elapsedMs: null,
  solvedCount: 0,
  gaveUpCount: 0,
};

function resetRound(s: GameState): GameState {
  return {
    ...s,
    tryIndex: 0,
    replays: 0,
    firstPlayAt: null,
    solved: false,
    gaveUp: false,
    elapsedMs: null,
    error: null,
  };
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "setDifficulty":
      // new curve, fresh ladder
      return { ...state, difficulty: action.value, tryIndex: 0 };
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
    case "revealMore":
      return {
        ...state,
        tryIndex: Math.min(state.tryIndex + 1, lastTryIndex(getDifficulty(state.difficulty))),
      };
    case "solve":
      return {
        ...state,
        phase: "revealed",
        solved: true,
        elapsedMs: state.firstPlayAt ? Date.now() - state.firstPlayAt : 0,
        solvedCount: state.solvedCount + 1,
      };
    case "giveUp":
      return {
        ...state,
        phase: "revealed",
        gaveUp: true,
        gaveUpCount: state.gaveUpCount + 1,
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
  const revealMore = useCallback(() => dispatch({ type: "revealMore" }), []);
  const solve = useCallback(() => dispatch({ type: "solve" }), []);
  const giveUp = useCallback(() => dispatch({ type: "giveUp" }), []);
  const replaySame = useCallback(() => dispatch({ type: "replaySame" }), []);

  return { state, loadNewTrack, setDifficulty, registerPlay, revealMore, solve, giveUp, replaySame };
}
