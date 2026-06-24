/**
 * Meal Plan & Food Tracking service
 *
 * ── CURRENT MODE: localStorage (backend not yet implemented) ──────
 *
 * All data is persisted in browser localStorage under the keys:
 *   fitpk_meal_plans  →  IMealPlan[]
 *   fitpk_meal_logs   →  IMealLog[]
 *
 * Every function returns the same response envelope as the real API:
 *   { data: { success: true, data: T } }
 *
 * ── TO SWITCH TO REAL BACKEND ────────────────────────────────────
 * 1. Delete everything below the "localStorage store" section.
 * 2. Uncomment the httpCall imports.
 * 3. Replace each function body with the commented httpCall version
 *    that lives right above it.
 *
 * No changes needed in any page/component.
 */

// import { httpCall } from "./HttpService";
// import { API_URL } from "../common/Urls";
import moment from "moment";
import { IMealPlan, IMealLog } from "../interface/IMealPlan";

// ── localStorage keys ─────────────────────────────────────────────
const PLANS_KEY = "fitpk_meal_plans";
const LOGS_KEY  = "fitpk_meal_logs";

// ── store helpers ─────────────────────────────────────────────────

function readPlans(): IMealPlan[] {
  try { return JSON.parse(localStorage.getItem(PLANS_KEY) ?? "[]"); }
  catch { return []; }
}
function writePlans(plans: IMealPlan[]): void {
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}
function readLogs(): IMealLog[] {
  try { return JSON.parse(localStorage.getItem(LOGS_KEY) ?? "[]"); }
  catch { return []; }
}
function writeLogs(logs: IMealLog[]): void {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

/** Auto-increment IDs — safe even when store is empty */
function nextPlanId(): number {
  const plans = readPlans();
  return plans.length === 0 ? 1 : Math.max(...plans.map(p => p.IdMealPlan ?? 0)) + 1;
}
function nextMealId(plans: IMealPlan[]): number {
  let max = 0;
  plans.forEach(p => p.Meals.forEach(m => { if ((m.IdMeal ?? 0) > max) max = m.IdMeal!; }));
  return max + 1;
}
function nextFoodId(plans: IMealPlan[]): number {
  let max = 0;
  plans.forEach(p =>
    p.Meals.forEach(m =>
      m.FoodItems.forEach(f => { if ((f.IdFoodItem ?? 0) > max) max = f.IdFoodItem!; })
    )
  );
  return max + 1;
}
function nextLogId(): number {
  const logs = readLogs();
  return logs.length === 0 ? 1 : Math.max(...logs.map(l => l.IdMealLog ?? 0)) + 1;
}

/** Read the logged-in user's IdUser from the same localStorage key that HttpService uses */
function getCurrentUserId(): number | null {
  try {
    const raw = localStorage.getItem("userData");
    if (!raw) return null;
    return JSON.parse(raw)?.info?.IdUser ?? null;
  } catch { return null; }
}

/** Wrap a value in the standard API response envelope */
function ok<T>(data: T): { data: { success: true; data: T } } {
  return { data: { success: true, data } };
}

/** Tiny artificial delay so mutations feel like real network calls */
const sim = (ms = 100): Promise<void> => new Promise(r => setTimeout(r, ms));

// ── Admin: meal plan CRUD ─────────────────────────────────────────

/**
 * Admin: Get all meal plans for a client, optionally filtered to one date.
 * Real API: POST /mealplan/getForClient  { IdUser, AssignedDate? }
 */
export const getMealPlansForClient = async (
  params: { IdUser: number; AssignedDate?: string }
) => {
  await sim();
  const result = readPlans().filter(p => {
    if (p.IdUser !== params.IdUser) return false;
    if (params.AssignedDate && p.AssignedDate !== params.AssignedDate) return false;
    return true;
  });
  return ok(result);
};

/**
 * Admin: Create a new meal plan with nested meals + food items.
 * IDs for every nested object are assigned here.
 * Real API: POST /mealplan/create  { IMealPlan }
 */
export const createMealPlan = async (params: IMealPlan) => {
  await sim();
  const plans = readPlans();
  let mealCursor = nextMealId(plans);
  let foodCursor = nextFoodId(plans);

  const newPlan: IMealPlan = {
    ...params,
    IdMealPlan: nextPlanId(),
    CreatedAt: new Date().toISOString(),
    UpdatedAt: new Date().toISOString(),
    Meals: params.Meals.map(meal => ({
      ...meal,
      IdMeal: mealCursor++,
      FoodItems: meal.FoodItems.map(item => ({
        ...item,
        IdFoodItem: foodCursor++,
      })),
    })),
  };

  writePlans([...plans, newPlan]);
  return ok(newPlan);
};

/**
 * Admin: Update (overwrite) an existing plan in full.
 * Newly added food items without IdFoodItem get auto-assigned IDs.
 * Real API: POST /mealplan/update  { IMealPlan }
 */
export const updateMealPlan = async (params: IMealPlan) => {
  await sim();
  const plans = readPlans();
  const idx = plans.findIndex(p => p.IdMealPlan === params.IdMealPlan);
  if (idx === -1) throw new Error("Plan not found");

  // Use a high offset so new IDs never collide with existing ones
  let mealCursor = nextMealId(plans) + 1000;
  let foodCursor = nextFoodId(plans) + 1000;

  const updated: IMealPlan = {
    ...params,
    UpdatedAt: new Date().toISOString(),
    Meals: params.Meals.map(meal => ({
      ...meal,
      IdMeal: meal.IdMeal ?? mealCursor++,
      FoodItems: meal.FoodItems.map(item => ({
        ...item,
        IdFoodItem: item.IdFoodItem ?? foodCursor++,
      })),
    })),
  };

  plans[idx] = updated;
  writePlans(plans);
  return ok(updated);
};

/**
 * Admin: Soft-delete (remove) a meal plan and its associated logs.
 * Real API: POST /mealplan/delete  { IdMealPlan }
 */
export const deleteMealPlan = async (params: { IdMealPlan: number }) => {
  await sim();
  writePlans(readPlans().filter(p => p.IdMealPlan !== params.IdMealPlan));
  writeLogs(readLogs().filter(l => l.IdMealPlan !== params.IdMealPlan));
  return ok({ deleted: true });
};

/**
 * Admin: Deep-copy a plan to a new date (and optionally a different client).
 * All nested IDs are re-assigned so the copy is fully independent.
 * Real API: POST /mealplan/copy  { IdMealPlan, TargetDate, IdUser }
 */
export const copyMealPlan = async (params: {
  IdMealPlan: number;
  TargetDate: string;
  IdUser: number;
}) => {
  await sim();
  const plans = readPlans();
  const source = plans.find(p => p.IdMealPlan === params.IdMealPlan);
  if (!source) throw new Error("Source plan not found");

  let mealCursor = nextMealId(plans);
  let foodCursor = nextFoodId(plans);

  const copy: IMealPlan = {
    ...source,
    IdMealPlan: nextPlanId(),
    IdUser: params.IdUser,
    AssignedDate: params.TargetDate,
    EndDate: undefined,
    CreatedAt: new Date().toISOString(),
    UpdatedAt: new Date().toISOString(),
    Meals: source.Meals.map(meal => ({
      ...meal,
      IdMeal: mealCursor++,
      IdMealPlan: undefined,
      FoodItems: meal.FoodItems.map(item => ({
        ...item,
        IdFoodItem: foodCursor++,
        IdMeal: undefined,
      })),
    })),
  };

  writePlans([...plans, copy]);
  return ok(copy);
};

// ── Client: meal plan + food log ──────────────────────────────────

/**
 * Client: Get my assigned meal plan(s) for a given date.
 * Handles single-date and date-range (EndDate) plans.
 * Real API: POST /mealplan/getMyPlans  { AssignedDate }
 */
export const getMyMealPlans = async (params: { AssignedDate: string }) => {
  await sim();
  const userId = getCurrentUserId();
  const target = moment(params.AssignedDate, "DD-MM-YYYY");

  const result = readPlans().filter(p => {
    // filter by user
    if (userId != null && p.IdUser !== userId) return false;

    const start = moment(p.AssignedDate, "DD-MM-YYYY");

    if (p.EndDate) {
      // date-range plan — check if target falls within [start, end]
      const end = moment(p.EndDate, "DD-MM-YYYY");
      return target.isBetween(start, end, "day", "[]");
    }
    // single-day plan
    return p.AssignedDate === params.AssignedDate;
  });

  return ok(result);
};

/**
 * Client: Log (or update) consumption of a single food item.
 * Upserts by (IdFoodItem + LogDate).
 * Real API: POST /mealplan/logFood  { IMealLog }
 */
export const logFoodConsumption = async (params: IMealLog) => {
  await sim(60);
  const userId = getCurrentUserId();
  const logs = readLogs();
  const idx = logs.findIndex(
    l => l.IdFoodItem === params.IdFoodItem && l.LogDate === params.LogDate
  );

  const entry: IMealLog = {
    ...params,
    IdUser: userId ?? params.IdUser,
    LoggedAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    logs[idx] = { ...logs[idx], ...entry };
  } else {
    logs.push({ ...entry, IdMealLog: nextLogId() });
  }

  writeLogs(logs);
  return ok(entry);
};

/**
 * Client: Batch-save all food logs for a date in one call.
 * Real API: POST /mealplan/batchLogFood  { LogDate, Logs[] }
 */
export const batchLogFoodConsumption = async (params: {
  LogDate: string;
  Logs: IMealLog[];
}) => {
  await sim();
  const userId = getCurrentUserId();
  const logs = readLogs();

  params.Logs.forEach(newLog => {
    const idx = logs.findIndex(
      l => l.IdFoodItem === newLog.IdFoodItem && l.LogDate === newLog.LogDate
    );
    const entry: IMealLog = {
      ...newLog,
      IdUser: userId ?? newLog.IdUser,
      LoggedAt: new Date().toISOString(),
    };
    if (idx >= 0) {
      logs[idx] = { ...logs[idx], ...entry };
    } else {
      logs.push({ ...entry, IdMealLog: nextLogId() });
    }
  });

  writeLogs(logs);
  return ok({ saved: params.Logs.length });
};

/**
 * Client: Get all food logs for a given date.
 * Real API: POST /mealplan/getMyLogs  { LogDate }
 */
export const getMyMealLogs = async (params: { LogDate: string }) => {
  await sim(60);
  const userId = getCurrentUserId();
  const result = readLogs().filter(l => {
    if (l.LogDate !== params.LogDate) return false;
    if (userId != null && l.IdUser != null && l.IdUser !== userId) return false;
    return true;
  });
  return ok(result);
};

/**
 * Admin: Get food logs for a specific client on a given date.
 * Used to show the coach what the client has actually eaten.
 * Real API: POST /mealplan/getClientLogs  { IdUser, LogDate }
 */
export const getMealLogsForClient = async (params: { IdUser: number; LogDate: string }) => {
  await sim(60);
  const result = readLogs().filter(l =>
    l.LogDate === params.LogDate && l.IdUser === params.IdUser
  );
  return ok(result);
};
