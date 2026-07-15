import { httpCall, httpUpload } from "./HttpService";
import { API_URL } from "../common/Urls";
import { IMealPlan, IMealLog } from "../interface/IMealPlan";

// ── Admin: meal plan CRUD ─────────────────────────────────────────

export const getMealPlansForClient = (params: { IdUser: number; AssignedDate?: string }) =>
  httpCall({ method: "post", url: API_URL.GET_MEAL_PLANS_FOR_CLIENT, data: params });

export const createMealPlan = (params: IMealPlan) =>
  httpCall({ method: "post", url: API_URL.CREATE_MEAL_PLAN, data: params });

export const updateMealPlan = (params: IMealPlan) =>
  httpCall({ method: "post", url: API_URL.UPDATE_MEAL_PLAN, data: params });

export const deleteMealPlan = (params: { IdMealPlan: number }) =>
  httpCall({ method: "post", url: API_URL.DELETE_MEAL_PLAN, data: params });

export const copyMealPlan = (params: { IdMealPlan: number; TargetDate: string; IdUser: number }) =>
  httpCall({ method: "post", url: API_URL.COPY_MEAL_PLAN, data: params });

// ── Client: meal plan + food log ──────────────────────────────────

export const getMyMealPlans = (params: { AssignedDate: string }) =>
  httpCall({ method: "post", url: API_URL.GET_MY_MEAL_PLANS, data: params });

export const logFoodConsumption = (params: IMealLog) =>
  httpCall({ method: "post", url: API_URL.LOG_FOOD_CONSUMPTION, data: params });

export const batchLogFoodConsumption = (params: { LogDate: string; Logs: IMealLog[] }) =>
  httpCall({ method: "post", url: API_URL.BATCH_LOG_FOOD_CONSUMPTION, data: params });

export const getMyMealLogs = (params: { LogDate: string }) =>
  httpCall({ method: "post", url: API_URL.GET_MY_MEAL_LOGS, data: params });

export const getMealLogsForClient = (params: { IdUser: number; LogDate: string }) =>
  httpCall({ method: "post", url: API_URL.GET_MEAL_LOGS_FOR_CLIENT, data: params });

// ── Extra food (client logs unplanned food, admin views it) ───────

export const logExtraFood = (formData: FormData) =>
  httpUpload({ url: API_URL.LOG_EXTRA_FOOD, data: formData });

export const updateExtraFoodLog = (formData: FormData) =>
  httpUpload({ url: API_URL.UPDATE_EXTRA_FOOD_LOG, data: formData });

export const deleteExtraFoodLog = (params: { IdExtraFoodLog: number }) =>
  httpCall({ method: "post", url: API_URL.DELETE_EXTRA_FOOD_LOG, data: params });

export const getMyExtraFoodLogs = (params: { LogDate: string }) =>
  httpCall({ method: "post", url: API_URL.GET_MY_EXTRA_FOOD_LOGS, data: params });

export const getExtraFoodLogsForClient = (params: { IdUser: number; LogDate: string }) =>
  httpCall({ method: "post", url: API_URL.GET_EXTRA_FOOD_LOGS_FOR_CLIENT, data: params });
