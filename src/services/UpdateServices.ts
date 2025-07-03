
import { httpCall,httpUpload } from "./HttpService";
import { API_URL } from "../common/Urls";

export const getDailyUpdate = (params: unknown) => {
    return httpCall({
        url: API_URL.GET_DAILY_UPDATES,
        method: "post",
        data: params
    }).then((response: unknown) => {
        return response;
    });
};

export const getSingleDayUpdate = (params: unknown) => {
    return httpCall({
        url: API_URL.GET_SINGLE_DAY,
        method: "post",
        data: params
    }).then((response: unknown) => {
        return response;
    });
};

export const getDailyUpdateForAWeek = (params: unknown) => {
    return httpCall({
        url: API_URL.GET_DAILY_UPDATES_FORWEEK,
        method: "post",
        data: params
    }).then((response: unknown) => {
        return response;
    });
};

export const dailyUpdate = (params: unknown) => {
    return httpCall({
        url: API_URL.DAILY_UPADTE,
        method: "post",
        data: params
    }).then((response: unknown) => {
        return response;
    });
};

// Keep FormData if this is a file upload
export const weeklyUpdate = (params: FormData) => {
    return httpUpload({
        url: API_URL.WEEKLY_UPDATES,
        method: "post",
        data: params
    }).then((response: unknown) => {
        return response;
    });
};

export const getWeeklyUpdate = (params: unknown) => {
    return httpCall({
        url: API_URL.GET_WEEKLY_UPDATES,
        method: "post",
        data: params
    }).then((response: unknown) => {
        return response;
    });
};

export const getProgressGraph = (params: unknown) => {
    return httpCall({
        url: API_URL.GET_SIMPLE_GRAPH,
        method: "post",
        data: params
    }).then((response: unknown) => {
        return response;
    });
};

export const getProgressGallery = (params: unknown) => {
    return httpCall({
        url: API_URL.GET_WEEKLY_GALLERY,
        method: "post",
        data: params
    }).then((response: unknown) => {
        return response;
    });
};

export const getDietPlan = (params: unknown) => {
    return httpCall({
        url: API_URL.GET_DIET_PLAN,
        method: "post",
        data: params
    }).then((response: unknown) => {
        return response;
    });
};

