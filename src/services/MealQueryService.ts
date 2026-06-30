import { httpCall } from "./HttpService";
import { API_URL } from "../common/Urls";

export interface IMealQuery {
  IdQuery?: number;
  IdUser?: number;
  QueryDate: string;
  Question: string;
  Answer?: string;
  AnsweredAt?: string;
  CreatedAt?: string;
}

export interface IPendingMealQuery extends IMealQuery {
  FirstName?: string;
  LastName?: string;
}

export const askMealQuery = (params: { QueryDate: string; Question: string }) =>
  httpCall({ method: "post", url: API_URL.ASK_MEAL_QUERY, data: params });

export const getMyMealQueries = (params: { QueryDate?: string }) =>
  httpCall({ method: "post", url: API_URL.GET_MY_MEAL_QUERIES, data: params });

export const getMealQueriesForClient = (params: { IdUser: number; QueryDate?: string }) =>
  httpCall({ method: "post", url: API_URL.GET_MEAL_QUERIES_FOR_CLIENT, data: params });

export const replyMealQuery = (params: { IdQuery: number; Answer: string }) =>
  httpCall({ method: "post", url: API_URL.REPLY_MEAL_QUERY, data: params });

export const getPendingQueriesForCoach = () =>
  httpCall({ method: "post", url: API_URL.GET_PENDING_QUERIES_FOR_COACH, data: {} });

export const getAllMyQueries = () =>
  httpCall({ method: "post", url: API_URL.GET_ALL_MY_QUERIES, data: {} });

export const getAllQueriesForClient = (params: { IdUser: number }) =>
  httpCall({ method: "post", url: API_URL.GET_ALL_QUERIES_FOR_CLIENT, data: params });

export const coachSendMessage = (params: { IdUser: number; Message: string }) =>
  httpCall({ method: "post", url: API_URL.COACH_SEND_MESSAGE, data: params });

export const notifyCoachQuery = (params: { IdQuery: number }) =>
  httpCall({ method: "post", url: API_URL.NOTIFY_COACH_QUERY, data: params });
