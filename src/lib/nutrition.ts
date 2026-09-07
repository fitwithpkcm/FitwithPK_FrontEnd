// Shared calorie / macro maths for the coach's calorie target feature.
// One source of truth for the Targets screen editor, the meal-plan reference,
// and the client's meal-tracking view.

export interface ActivityLevel {
  label: string;
  multiplier: number;
}

// Same keys/multipliers used server-side in student_controller.ts
// (calculateTDEE / ACTIVITY_MULTIPLIERS) and in weekly-track-view.tsx.
export const ACTIVITY_LEVELS: Record<string, ActivityLevel> = {
  "sedentary":         { label: "Sedentary (desk job)",              multiplier: 1.2 },
  "lightly-active":    { label: "Light exercise (1-3 days/week)",    multiplier: 1.375 },
  "moderately-active": { label: "Moderate exercise (3-5 days/week)", multiplier: 1.55 },
  "very-active":       { label: "Active (6-7 days/week)",            multiplier: 1.725 },
  "super-active":      { label: "Very active (2x/day)",              multiplier: 1.9 },
};

export const DEFAULT_ACTIVITY_LEVEL = "sedentary";

// Goal adjustment presets applied on top of TDEE, as a percentage.
export const GOAL_ADJUST_PRESETS: { label: string; pct: number }[] = [
  { label: "Aggressive cut", pct: -30 },
  { label: "Cut",            pct: -20 },
  { label: "Slight cut",     pct: -10 },
  { label: "Maintain",       pct: 0 },
  { label: "Lean bulk",      pct: 10 },
  { label: "Bulk",           pct: 20 },
];

export interface MacroSplit {
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export const DEFAULT_MACRO_SPLIT: MacroSplit = { proteinPct: 30, carbsPct: 40, fatPct: 30 };

export const MACRO_PRESETS: { label: string; split: MacroSplit }[] = [
  { label: "Balanced",      split: { proteinPct: 30, carbsPct: 40, fatPct: 30 } },
  { label: "High protein",  split: { proteinPct: 40, carbsPct: 35, fatPct: 25 } },
  { label: "Low carb",      split: { proteinPct: 40, carbsPct: 20, fatPct: 40 } },
];

// Persisted inside the diet plan's Targets JSON (tbl_dietplan.Targets.nutrition).
export interface NutritionTarget {
  activityLevel: string;   // key into ACTIVITY_LEVELS
  goalAdjustPct: number;   // e.g. -20 for a cut
  calories: number;        // final coach-confirmed daily target
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  basisWeight?: number;    // weight of the weekly measurement it was based on
  basisDate?: string;      // that measurement's DateRange ("DD-MM-YYYY")
}

export const CALORIES_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

export function activityMultiplier(activityLevel: string | undefined): number {
  return ACTIVITY_LEVELS[activityLevel ?? DEFAULT_ACTIVITY_LEVEL]?.multiplier
    ?? ACTIVITY_LEVELS[DEFAULT_ACTIVITY_LEVEL].multiplier;
}

/** TDEE from a Mifflin-St Jeor BMR and an activity level. Null when BMR is missing. */
export function tdeeFromBmr(bmr: number | null | undefined, activityLevel: string | undefined): number | null {
  if (bmr == null || !(bmr > 0)) return null;
  return Math.round(bmr * activityMultiplier(activityLevel));
}

/** Apply a deficit/surplus percentage to a calorie figure. */
export function applyGoalAdjust(calories: number | null | undefined, goalAdjustPct: number): number | null {
  if (calories == null || !(calories > 0)) return null;
  return Math.round(calories * (1 + (goalAdjustPct || 0) / 100));
}

export interface MacroGrams {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** Gram targets for a calorie figure and a percentage split. */
export function macroGrams(calories: number | null | undefined, split: MacroSplit): MacroGrams {
  const c = calories != null && calories > 0 ? calories : 0;
  return {
    proteinG: Math.round((c * (split.proteinPct || 0) / 100) / CALORIES_PER_GRAM.protein),
    carbsG:   Math.round((c * (split.carbsPct   || 0) / 100) / CALORIES_PER_GRAM.carbs),
    fatG:     Math.round((c * (split.fatPct     || 0) / 100) / CALORIES_PER_GRAM.fat),
  };
}

export function macroSplitTotal(split: MacroSplit): number {
  return (split.proteinPct || 0) + (split.carbsPct || 0) + (split.fatPct || 0);
}

export function isMacroSplitValid(split: MacroSplit): boolean {
  return macroSplitTotal(split) === 100;
}

/**
 * How a running total compares to its target, as a status for colour-coding.
 * within ±5% → "on", within ±15% → "near", otherwise "off".
 */
export type TargetStatus = "on" | "near" | "off" | "none";

export function targetStatus(actual: number, target: number | null | undefined): TargetStatus {
  if (target == null || !(target > 0)) return "none";
  const ratio = actual / target;
  if (ratio >= 0.95 && ratio <= 1.05) return "on";
  if (ratio >= 0.85 && ratio <= 1.15) return "near";
  return "off";
}
