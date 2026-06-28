import { httpCall } from "./HttpService";
import { API_URL } from "../common/Urls";
import { ISupplement, ISupplementLog } from "../interface/ISupplement";

// ── Admin ─────────────────────────────────────────────────────────

export const getSupplementsForClient = (IdUser: number) =>
  httpCall({ method: "post", url: API_URL.GET_SUPPLEMENTS_FOR_CLIENT, data: { IdUser } });

export const createSupplement = (params: ISupplement) =>
  httpCall({ method: "post", url: API_URL.CREATE_SUPPLEMENT, data: params });

export const updateSupplement = (params: ISupplement) =>
  httpCall({ method: "post", url: API_URL.UPDATE_SUPPLEMENT, data: params });

export const deleteSupplement = (IdSupplement: number) =>
  httpCall({ method: "post", url: API_URL.DELETE_SUPPLEMENT, data: { IdSupplement } });

export const getSupplementClientLogs = (params: { IdUser: number; LogDate: string }) =>
  httpCall({ method: "post", url: API_URL.GET_SUPPLEMENT_CLIENT_LOGS, data: params });

export const getSupplementAdherence = (params: { IdUser: number; days?: number }) =>
  httpCall({ method: "post", url: API_URL.GET_SUPPLEMENT_ADHERENCE, data: params });

// ── Client ────────────────────────────────────────────────────────

export const getMySupplements = () =>
  httpCall({ method: "post", url: API_URL.GET_MY_SUPPLEMENTS, data: {} });

export const getMySupplementLogs = (LogDate: string) =>
  httpCall({ method: "post", url: API_URL.GET_MY_SUPPLEMENT_LOGS, data: { LogDate } });

export const logSupplement = (params: ISupplementLog) =>
  httpCall({ method: "post", url: API_URL.LOG_SUPPLEMENT, data: params });

export const updateSupplementReminderTime = (IdSupplement: number, ReminderTime: string) =>
  httpCall({ method: "post", url: API_URL.UPDATE_SUPPLEMENT_REMINDER_TIME, data: { IdSupplement, ReminderTime } });
