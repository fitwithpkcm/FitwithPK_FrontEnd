/**
 * Meal Plan & Food Tracking interfaces
 * author: fitwithpk
 */

export type MealType = 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner';

export const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

export const MEAL_META: Record<MealType, {
  emoji: string;
  label: string;
  borderColor: string;
  headerBg: string;
  badgeBg: string;
  badgeText: string;
  progressColor: string;
}> = {
  Breakfast: {
    emoji: '🌅',
    label: 'Breakfast',
    borderColor: 'border-amber-300 dark:border-amber-700',
    headerBg: 'bg-amber-50 dark:bg-amber-950/30',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
    badgeText: 'text-amber-700 dark:text-amber-300',
    progressColor: 'bg-amber-400',
  },
  Lunch: {
    emoji: '☀️',
    label: 'Lunch',
    borderColor: 'border-green-300 dark:border-green-700',
    headerBg: 'bg-green-50 dark:bg-green-950/30',
    badgeBg: 'bg-green-100 dark:bg-green-900/40',
    badgeText: 'text-green-700 dark:text-green-300',
    progressColor: 'bg-green-400',
  },
  Snack: {
    emoji: '🍎',
    label: 'Snack',
    borderColor: 'border-orange-300 dark:border-orange-700',
    headerBg: 'bg-orange-50 dark:bg-orange-950/30',
    badgeBg: 'bg-orange-100 dark:bg-orange-900/40',
    badgeText: 'text-orange-700 dark:text-orange-300',
    progressColor: 'bg-orange-400',
  },
  Dinner: {
    emoji: '🌙',
    label: 'Dinner',
    borderColor: 'border-indigo-300 dark:border-indigo-700',
    headerBg: 'bg-indigo-50 dark:bg-indigo-950/30',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-900/40',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    progressColor: 'bg-indigo-400',
  },
};

export const COMMON_UNITS = [
  'g', 'kg', 'ml', 'L',
  'cup', 'tbsp', 'tsp',
  'piece', 'slice', 'bowl',
  'plate', 'scoop', 'handful',
  'serving',
];

// ── Core food item ────────────────────────────────────────────────

export interface IMealFoodItem {
  IdFoodItem?: number;
  IdMeal?: number;
  FoodName: string;
  PlannedQty: number;
  Unit: string;
  Notes?: string;
  SortOrder: number;
  // Future extensibility
  CaloriesPer100g?: number;
  ProteinPer100g?: number;
  CarbsPer100g?: number;
  FatPer100g?: number;
  FiberPer100g?: number;
  Category?: string;        // e.g. "Protein", "Carbs", "Fat"
  RecipeId?: number;        // future: linked recipe
  ImageUrl?: string;        // future: food photo
}

// ── Meal (one of Breakfast/Lunch/Snack/Dinner) ───────────────────

export interface IMeal {
  IdMeal?: number;
  IdMealPlan?: number;
  MealType: MealType;
  FoodItems: IMealFoodItem[];
}

// ── Plan (assigned to a client for a date / date-range) ──────────

export interface IMealPlan {
  IdMealPlan?: number;
  PlanName: string;
  IdUser: number;
  AssignedDate: string;   // "DD-MM-YYYY"
  EndDate?: string;       // "DD-MM-YYYY" — for multi-day assignments
  Notes?: string;
  Status?: number;        // uses ACCESS_STATUS.NUMBER
  CreatedAt?: string;
  UpdatedAt?: string;
  Meals: IMeal[];
}

// ── Food consumption log (one row per food item per day) ─────────

export interface IMealLog {
  IdMealLog?: number;
  IdFoodItem: number;
  IdMealPlan: number;
  IdUser?: number;
  LogDate: string;        // "DD-MM-YYYY"
  ConsumedQty: number;
  IsConsumed: 0 | 1;
  Notes?: string;         // skip reason / substitution note
  LoggedAt?: string;
}

// ── Extra food log (unplanned food eaten outside the assigned diet) ──

export interface IExtraFoodLog {
  IdExtraFoodLog?: number;
  IdUser?: number;
  LogDate: string;        // "DD-MM-YYYY"
  FoodName: string;
  Quantity?: string;
  Notes?: string;
  ImageFileNames?: string; // comma-joined filenames as returned by the API
  LoggedAt?: string;
}

// ── Client-side computed / merged types ──────────────────────────

export interface IMealFoodItemWithLog extends IMealFoodItem {
  log?: IMealLog;
  isConsumed: boolean;
  consumedQty: number;
  logNotes: string;
}

export interface IMealWithLogs extends IMeal {
  foodItemsWithLogs: IMealFoodItemWithLog[];
  completedCount: number;
  totalCount: number;
  completionPercent: number;
}

export interface IMealPlanWithLogs extends IMealPlan {
  mealsWithLogs: IMealWithLogs[];
  overallAdherence: number; // 0-100
}

// ── Utility: merge plan + logs → IMealPlanWithLogs ────────────────

export function mergePlanWithLogs(plan: IMealPlan, logs: IMealLog[]): IMealPlanWithLogs {
  const logMap = new Map<number, IMealLog>(
    logs.map(l => [l.IdFoodItem, l])
  );

  let totalItems = 0;
  let totalConsumed = 0;

  const mealsWithLogs: IMealWithLogs[] = plan.Meals.map(meal => {
    const foodItemsWithLogs: IMealFoodItemWithLog[] = meal.FoodItems.map(item => {
      const log = item.IdFoodItem != null ? logMap.get(item.IdFoodItem) : undefined;
      const isConsumed = log?.IsConsumed === 1;
      totalItems++;
      if (isConsumed) totalConsumed++;
      return {
        ...item,
        log,
        isConsumed,
        consumedQty: log?.ConsumedQty ?? item.PlannedQty,
        logNotes: log?.Notes ?? '',
      };
    });

    const completedCount = foodItemsWithLogs.filter(i => i.isConsumed).length;
    const totalCount = foodItemsWithLogs.length;

    return {
      ...meal,
      foodItemsWithLogs,
      completedCount,
      totalCount,
      completionPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    };
  });

  return {
    ...plan,
    mealsWithLogs,
    overallAdherence: totalItems > 0 ? Math.round((totalConsumed / totalItems) * 100) : 0,
  };
}

// ── Factory: blank plan ───────────────────────────────────────────

export function createBlankPlan(userId: number, assignedDate: string): IMealPlan {
  return {
    PlanName: `Meal Plan`,
    IdUser: userId,
    AssignedDate: assignedDate,
    Meals: MEAL_TYPES.map(type => ({
      MealType: type,
      FoodItems: [],
    })),
  };
}
