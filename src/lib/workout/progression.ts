// Automatic workout progression — suggests the next session's weight/reps
// from logged history, with a plain-English reason. Pure functions only:
// given the same exercise config and history, always the same suggestion,
// so a coach can audit "why this number" and there's no stored counter to
// drift out of sync with the actual logged sets.
import moment from "moment";
import { IExercise, ISetLog, ProgressionPolicy, WeightUnit } from "../../interface/IWorkout";

export interface ProgressionSuggestion {
  RepsCompleted: number;
  WeightUsed?: number;
  WeightUnit?: WeightUnit;
  Why: string;
}

export interface SessionOutcome {
  logDate: string;      // DD-MM-YYYY
  sets: ISetLog[];       // sorted by SetNumber asc
  hit: boolean;
}

const HEAVY_MUSCLE_GROUPS = new Set(["Back", "Quads", "Hamstrings", "Glutes", "Calves"]);

function getIncrementStep(exercise: IExercise): number {
  const unit = exercise.WeightUnit ?? "kg";
  const heavy = exercise.MuscleGroup ? HEAVY_MUSCLE_GROUPS.has(exercise.MuscleGroup) : false;
  if (unit === "lbs") return heavy ? 10 : 5;
  return heavy ? 5 : 2.5;
}

function applyDeload(currentWeight: number, step: number): number {
  const raw = currentWeight * 0.9;
  let snapped = Math.round(raw / step) * step;
  if (snapped >= currentWeight) snapped -= step; // guarantee an actual reduction
  return Math.max(step, snapped); // never below one increment step
}

// Groups a flat set-log history (already excluding today) into one outcome
// per calendar day, most-recent-first — judged against the exercise's
// CURRENT Sets/TargetReps, since no per-session target snapshot is stored.
// Exported for reuse by the "Last time" history display, not just progression.
export function groupSetsBySession(history: ISetLog[], exercise: IExercise): SessionOutcome[] {
  const byDate = new Map<string, ISetLog[]>();
  for (const log of history) {
    const arr = byDate.get(log.LogDate) ?? [];
    arr.push(log);
    byDate.set(log.LogDate, arr);
  }
  const sessions: SessionOutcome[] = Array.from(byDate.entries()).map(([logDate, sets]) => ({
    logDate,
    sets: [...sets].sort((a, b) => a.SetNumber - b.SetNumber),
    hit: sets.length >= exercise.Sets && sets.every(s => s.RepsCompleted >= exercise.TargetReps),
  }));
  sessions.sort((a, b) => moment(b.logDate, "DD-MM-YYYY").valueOf() - moment(a.logDate, "DD-MM-YYYY").valueOf());
  return sessions;
}

function countConsecutiveMisses(sessions: SessionOutcome[]): number {
  let n = 0;
  for (const s of sessions) {
    if (s.hit) break;
    n++;
  }
  return n;
}

function pickSessionWeight(session: SessionOutcome, exercise: IExercise): number | undefined {
  // WeightUsed comes back from the API as a string (MySQL DECIMAL column via
  // mysql2) — coerce once here so every downstream +/- stays real arithmetic
  // instead of accidentally string-concatenating (e.g. "75.00" + 2.5).
  const withWeight = session.sets.filter(s => s.WeightUsed != null);
  const raw = withWeight.length > 0 ? withWeight[withWeight.length - 1].WeightUsed : exercise.TargetWeight;
  return raw != null ? Number(raw) : undefined;
}

function formatDelta(step: number): string {
  return `+${step}`;
}

function linearSuggestion(
  exercise: IExercise, last: SessionOutcome, lastWeight: number | undefined,
  hasWeight: boolean, step: number, missStreak: number
): ProgressionSuggestion {
  const unit = exercise.WeightUnit ?? "kg";
  if (last.hit) {
    const WeightUsed = hasWeight ? lastWeight! + step : undefined;
    return {
      RepsCompleted: exercise.TargetReps, WeightUsed, WeightUnit: exercise.WeightUnit,
      Why: hasWeight ? `Every rep last time — ${formatDelta(step)}${unit} more` : `Every rep last time — try adding a rep or two`,
    };
  }
  if (missStreak >= 3 && hasWeight) {
    const WeightUsed = applyDeload(lastWeight!, step);
    return {
      RepsCompleted: exercise.TargetReps, WeightUsed, WeightUnit: exercise.WeightUnit,
      Why: `Missed reps ${missStreak} sessions running — dropping to ${WeightUsed}${unit} to reset`,
    };
  }
  return {
    RepsCompleted: exercise.TargetReps, WeightUsed: lastWeight, WeightUnit: exercise.WeightUnit,
    Why: missStreak > 1 ? `Missed reps ${missStreak} sessions running — same weight again` : `Missed reps last time — same weight again`,
  };
}

function greyskullSuggestion(
  exercise: IExercise, last: SessionOutcome, lastWeight: number | undefined,
  hasWeight: boolean, step: number
): ProgressionSuggestion {
  const unit = exercise.WeightUnit ?? "kg";
  if (last.hit) {
    const WeightUsed = hasWeight ? lastWeight! + step : undefined;
    return {
      RepsCompleted: exercise.TargetReps, WeightUsed, WeightUnit: exercise.WeightUnit,
      Why: hasWeight ? `Every rep last time — ${formatDelta(step)}${unit} more` : `Every rep last time — try adding a rep or two`,
    };
  }
  // Greyskull's defining trait vs linear: any single miss deloads immediately.
  const WeightUsed = hasWeight ? applyDeload(lastWeight!, step) : lastWeight;
  return {
    RepsCompleted: exercise.TargetReps, WeightUsed, WeightUnit: exercise.WeightUnit,
    Why: hasWeight ? `Missed reps last time — dropping to ${WeightUsed}${unit} to reset` : `Missed reps last time — same effort, focus on form`,
  };
}

function doubleSuggestion(
  exercise: IExercise, last: SessionOutcome, lastWeight: number | undefined,
  hasWeight: boolean, step: number, missStreak: number
): ProgressionSuggestion {
  const unit = exercise.WeightUnit ?? "kg";
  const repsMin = Math.max(1, exercise.TargetReps - 2);
  const repsAchieved = Math.min(...last.sets.map(s => s.RepsCompleted));

  if (repsAchieved >= exercise.TargetReps && last.hit) {
    const WeightUsed = hasWeight ? lastWeight! + step : lastWeight;
    return {
      RepsCompleted: repsMin, WeightUsed, WeightUnit: exercise.WeightUnit,
      Why: hasWeight
        ? `Hit ${exercise.TargetReps} reps across all sets — ${formatDelta(step)}${unit}, back to ${repsMin} reps`
        : `Hit the top of your rep range — nice work`,
    };
  }
  if (repsAchieved >= repsMin) {
    const nextReps = Math.min(exercise.TargetReps, repsAchieved + 1);
    return {
      RepsCompleted: nextReps, WeightUsed: lastWeight, WeightUnit: exercise.WeightUnit,
      Why: `Add a rep at the same weight — aim for ${nextReps} reps`,
    };
  }
  if (missStreak >= 3 && hasWeight) {
    const WeightUsed = applyDeload(lastWeight!, step);
    return {
      RepsCompleted: repsMin, WeightUsed, WeightUnit: exercise.WeightUnit,
      Why: `Missed reps ${missStreak} sessions running — dropping to ${WeightUsed}${unit}`,
    };
  }
  return {
    RepsCompleted: repsMin, WeightUsed: lastWeight, WeightUnit: exercise.WeightUnit,
    Why: `Fell short of the rep range — same weight, aim for ${repsMin} reps`,
  };
}

/**
 * The suggested next weight/reps for one exercise, or null when there's
 * nothing to suggest (policy off, or no prior-session history yet).
 * `history` must already exclude the currently-selected date.
 */
export function suggestNextLoad(exercise: IExercise, history: ISetLog[]): ProgressionSuggestion | null {
  const policy: ProgressionPolicy | undefined = exercise.ProgressionPolicy;
  if (!policy || policy === "off") return null;

  const sessions = groupSetsBySession(history, exercise);
  if (sessions.length === 0) return null;

  const last = sessions[0];
  const lastWeight = pickSessionWeight(last, exercise);
  const hasWeight = (exercise.WeightUnit ?? "kg") !== "bodyweight" && lastWeight != null;
  const step = getIncrementStep(exercise);
  const missStreak = countConsecutiveMisses(sessions);

  switch (policy) {
    case "linear": return linearSuggestion(exercise, last, lastWeight, hasWeight, step, missStreak);
    case "greyskull": return greyskullSuggestion(exercise, last, lastWeight, hasWeight, step);
    case "double": return doubleSuggestion(exercise, last, lastWeight, hasWeight, step, missStreak);
    default: return null;
  }
}

// Exported for direct testing / debugging.
export const _internal = { getIncrementStep, applyDeload, countConsecutiveMisses };
