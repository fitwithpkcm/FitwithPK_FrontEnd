import { httpCall } from "./HttpService";
import { API_URL } from "../common/Urls";
import { IWorkout, IExerciseLog, IExerciseLibraryItem, ISetLog, IWorkoutTemplate, IMuscleTarget } from "../interface/IWorkout";

// ── Admin: workout CRUD ───────────────────────────────────────────

export const getWorkoutsForClient = (params: { IdUser: number; ScheduledDate?: string }) =>
  httpCall({ method: "post", url: API_URL.GET_WORKOUTS_FOR_CLIENT, data: params });

export const createWorkout = (params: IWorkout) =>
  httpCall({ method: "post", url: API_URL.CREATE_WORKOUT, data: params });

export const updateWorkout = (params: IWorkout) =>
  httpCall({ method: "post", url: API_URL.UPDATE_WORKOUT, data: params });

export const deleteWorkout = (params: { IdWorkout: number }) =>
  httpCall({ method: "post", url: API_URL.DELETE_WORKOUT, data: params });

export const rescheduleWorkout = (params: { IdWorkout: number; NewDate: string }) =>
  httpCall({ method: "post", url: API_URL.RESCHEDULE_WORKOUT, data: params }).then((response) => {
    if (!response.data?.success) throw new Error(response.data?.message || "Failed to reschedule workout");
    return response;
  });

export const bulkCreateWorkouts = (params: { Workouts: IWorkout[] }) =>
  httpCall({ method: "post", url: API_URL.BULK_CREATE_WORKOUTS, data: params });

export const getWorkoutLogsForClient = (params: { IdUser: number; LogDate: string }) =>
  httpCall({ method: "post", url: API_URL.GET_WORKOUT_LOGS_FOR_CLIENT, data: params });

export const getClientSetLogs = (params: { IdUser: number; LogDate: string }) =>
  httpCall({ method: "post", url: API_URL.GET_CLIENT_SET_LOGS, data: params });

// ── Progress ──────────────────────────────────────────────────────

export const getVolumeHistory = (params: { IdUser?: number; weeks?: number }) =>
  httpCall({ method: "post", url: API_URL.GET_VOLUME_HISTORY, data: params });

export const getMuscleGroupVolume = (params: { IdUser?: number; weeks?: number }) =>
  httpCall({ method: "post", url: API_URL.GET_MUSCLE_GROUP_VOLUME, data: params });

export const getMuscleTargets = (params: { IdUser: number }) =>
  httpCall({ method: "post", url: API_URL.GET_MUSCLE_TARGETS, data: params });

export const upsertMuscleTarget = (params: IMuscleTarget) =>
  httpCall({ method: "post", url: API_URL.UPSERT_MUSCLE_TARGET, data: params });

// ── Client: workout + exercise log ───────────────────────────────

export const getMyWorkouts = (params: { ScheduledDate: string }) =>
  httpCall({ method: "post", url: API_URL.GET_MY_WORKOUTS, data: params });

export const rescheduleMyWorkout = (params: { IdWorkout: number; NewDate: string }) =>
  httpCall({ method: "post", url: API_URL.RESCHEDULE_MY_WORKOUT, data: params }).then((response) => {
    if (!response.data?.success) throw new Error(response.data?.message || "Failed to reschedule workout");
    return response;
  });

export const logExercise = (params: IExerciseLog) =>
  httpCall({ method: "post", url: API_URL.LOG_EXERCISE, data: params });

export const batchLogExercises = (params: { LogDate: string; Logs: IExerciseLog[] }) =>
  httpCall({ method: "post", url: API_URL.BATCH_LOG_EXERCISES, data: params });

export const getMyWorkoutLogs = (params: { LogDate: string }) =>
  httpCall({ method: "post", url: API_URL.GET_MY_WORKOUT_LOGS, data: params });

export const getMyWorkoutHistory = (params: { StartDate?: string; EndDate?: string }) =>
  httpCall({ method: "post", url: API_URL.GET_MY_WORKOUT_HISTORY, data: params });

// ── Per-set logging ───────────────────────────────────────────────

export const logSet = (params: ISetLog) =>
  httpCall({ method: "post", url: API_URL.LOG_SET, data: params });

export const deleteSetLog = (params: { IdSetLog: number }) =>
  httpCall({ method: "post", url: API_URL.DELETE_SET_LOG, data: params });

export const getSetLogsForDate = (params: { LogDate: string }) =>
  httpCall({ method: "post", url: API_URL.GET_SET_LOGS_FOR_DATE, data: params });

export const getSetLogsForExercise = (params: { IdExercise: number }) =>
  httpCall({ method: "post", url: API_URL.GET_SET_LOGS_FOR_EXERCISE, data: params });

// ── Workout Templates ─────────────────────────────────────────────

export const getWorkoutTemplates = () =>
  httpCall({ method: "post", url: API_URL.GET_WORKOUT_TEMPLATES, data: {} });

export const createWorkoutTemplate = (params: IWorkoutTemplate) =>
  httpCall({ method: "post", url: API_URL.CREATE_WORKOUT_TEMPLATE, data: params });

export const updateWorkoutTemplate = (params: IWorkoutTemplate) =>
  httpCall({ method: "post", url: API_URL.UPDATE_WORKOUT_TEMPLATE, data: params });

export const deleteWorkoutTemplate = (params: { IdTemplate: number }) =>
  httpCall({ method: "post", url: API_URL.DELETE_WORKOUT_TEMPLATE, data: params });

// ── Exercise Library ──────────────────────────────────────────────

export const getExerciseLibrary = () =>
  httpCall({ method: "post", url: API_URL.GET_EXERCISE_LIBRARY, data: {} });

export const createLibraryItem = (params: IExerciseLibraryItem) =>
  httpCall({ method: "post", url: API_URL.CREATE_LIBRARY_ITEM, data: params }).then((response) => {
    if (!response.data?.success) throw new Error(response.data?.message || "Failed to create exercise");
    return response;
  });

export const updateLibraryItem = (params: IExerciseLibraryItem) =>
  httpCall({ method: "post", url: API_URL.UPDATE_LIBRARY_ITEM, data: params }).then((response) => {
    if (!response.data?.success) throw new Error(response.data?.message || "Failed to update exercise");
    return response;
  });

export const deleteLibraryItem = (params: { IdLibraryItem: number }) =>
  httpCall({ method: "post", url: API_URL.DELETE_LIBRARY_ITEM, data: params }).then((response) => {
    if (!response.data?.success) throw new Error(response.data?.message || "Failed to remove exercise");
    return response;
  });
