
import { httpCall,httpUpload } from "./HttpService";
import { API_URL } from "../common/Urls";


export const getDailyUpdate = params => {
    return httpCall({
        url: API_URL.GET_DAILY_UPDATES,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};

export const getSingleDayUpdate = params => {
    return httpCall({
        url: API_URL.GET_SINGLE_DAY,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};


export const getDailyUpdateForAWeek = params => {
    return httpCall({
        url: API_URL.GET_DAILY_UPDATES_FORWEEK,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};

export const dailyUpdate = params => {
    return httpCall({
        url: API_URL.DAILY_UPADTE,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};

export const weeklyUpdate = params => {
    return httpUpload({
        url: API_URL.WEEKLY_UPDATES,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};




export const getWeeklyUpdate = (params) => {
    return httpCall({
        url: API_URL.GET_WEEKLY_UPDATES,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};

export const getProgressGraph = params => {
    return httpCall({
        url: API_URL.GET_SIMPLE_GRAPH,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};

export const getProgressGallery = params => {
    return httpCall({
        url: API_URL.GET_WEEKLY_GALLERY,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};

export const getDietPlan = params => {
    return httpCall({
        url: API_URL.GET_DIET_PLAN,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};


