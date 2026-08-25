// Muscle Fatigue and Strength estimates — pure functions, no React/HTTP,
// same style as progression.ts: given the same raw set history, always the
// same output, hand-verifiable against known inputs. Both are heuristics,
// not measurements — see FitigueTab/StrengthTab captions for the framing.
import moment from "moment";
import { IMuscleSetHistoryRow, MUSCLE_GROUPS } from "../../interface/IWorkout";

// Sets within this many days of today count toward current fatigue, with
// linearly decaying weight (today = full weight, RECOVERY_WINDOW_DAYS ago = 0).
const RECOVERY_WINDOW_DAYS = 3;
// Decayed-weighted sets considered "fully fatigued" (100%). A rough MRV-ish
// heuristic, not a physiological constant — tune here if it reads wrong in practice.
const FATIGUE_SET_THRESHOLD = 9;

export interface FatigueResult {
  MuscleGroup: string;
  FatiguePct: number;
  DaysSinceLastTrained: number | null;
}

function daysAgo(logDate: string): number {
  return moment().startOf("day").diff(moment(logDate, "DD-MM-YYYY").startOf("day"), "days");
}

export function computeFatigue(rows: IMuscleSetHistoryRow[]): FatigueResult[] {
  return MUSCLE_GROUPS.map(mg => {
    const muscleRows = rows.filter(r => r.MuscleGroup === mg);
    if (muscleRows.length === 0) {
      return { MuscleGroup: mg, FatiguePct: 0, DaysSinceLastTrained: null };
    }
    let score = 0;
    let minDaysAgo = Infinity;
    for (const row of muscleRows) {
      const d = daysAgo(row.LogDate);
      minDaysAgo = Math.min(minDaysAgo, d);
      if (d <= RECOVERY_WINDOW_DAYS) score += Math.max(0, 1 - d / RECOVERY_WINDOW_DAYS);
    }
    return {
      MuscleGroup: mg,
      FatiguePct: Math.min(100, Math.round((score / FATIGUE_SET_THRESHOLD) * 100)),
      DaysSinceLastTrained: minDaysAgo,
    };
  });
}

export interface ExerciseStrengthResult {
  ExerciseName: string;
  MuscleGroup: string;
  Best1RM: number | null;      // null = bodyweight/zero-weight only
  PriorBest1RM: number | null;
  DeltaPct: number | null;
  LastTrainedDaysAgo: number;
}

// Epley formula. WeightUsed may arrive as a string (MySQL DECIMAL via
// mysql2) — coerce before arithmetic, same gotcha fixed in progression.ts.
function estimated1RM(row: IMuscleSetHistoryRow): number | null {
  if (row.WeightUnit === "bodyweight" || row.WeightUsed == null) return null;
  const weight = Number(row.WeightUsed);
  // A logged 0kg almost always means "no weight recorded" (e.g. bodyweight
  // core work logged under the wrong unit) rather than a real lift — treat
  // it the same as no weight rather than claiming a 0kg estimated max.
  if (weight === 0) return null;
  return weight * (1 + row.RepsCompleted / 30);
}

// Per-exercise, not per-muscle-group: ranking different exercises' raw
// weight against each other has the same apples-to-oranges problem as
// ranking muscle groups (a bench press will always dwarf a lateral raise),
// so what matters here is each exercise's trend against itself over time,
// not a comparison to other exercises. No fixed enum to iterate — only
// exercises actually logged in the current window appear at all.
export function computeExerciseStrength(rows: IMuscleSetHistoryRow[], rangeDays: number | null): ExerciseStrengthResult[] {
  const byExercise = new Map<string, IMuscleSetHistoryRow[]>();
  for (const row of rows) {
    const list = byExercise.get(row.ExerciseName) ?? [];
    list.push(row);
    byExercise.set(row.ExerciseName, list);
  }

  const results: ExerciseStrengthResult[] = [];
  for (const [exerciseName, exRows] of byExercise) {
    const current = rangeDays == null
      ? exRows
      : exRows.filter(r => daysAgo(r.LogDate) < rangeDays);
    if (current.length === 0) continue;

    const prior = rangeDays == null
      ? []
      : exRows.filter(r => { const d = daysAgo(r.LogDate); return d >= rangeDays && d < rangeDays * 2; });

    const currentEstimates = current.map(estimated1RM).filter((v): v is number => v != null);
    const priorEstimates = prior.map(estimated1RM).filter((v): v is number => v != null);

    const Best1RM = currentEstimates.length > 0 ? Math.max(...currentEstimates) : null;
    const PriorBest1RM = priorEstimates.length > 0 ? Math.max(...priorEstimates) : null;
    const DeltaPct = Best1RM != null && PriorBest1RM
      ? Math.round(((Best1RM - PriorBest1RM) / PriorBest1RM) * 100)
      : null;

    results.push({
      ExerciseName: exerciseName,
      MuscleGroup: current[0].MuscleGroup,
      Best1RM,
      PriorBest1RM,
      DeltaPct,
      LastTrainedDaysAgo: Math.min(...current.map(r => daysAgo(r.LogDate))),
    });
  }
  return results;
}
